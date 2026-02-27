import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("database.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    password TEXT,
    wallet_balance REAL DEFAULT 1000,
    role TEXT DEFAULT 'user',
    login_attempts INTEGER DEFAULT 0,
    lock_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add missing columns if they don't exist
const columns = [
  { name: 'username', type: 'TEXT UNIQUE' },
  { name: 'full_name', type: 'TEXT' },
  { name: 'phone', type: 'TEXT' },
  { name: 'login_attempts', type: 'INTEGER DEFAULT 0' },
  { name: 'lock_until', type: 'DATETIME' }
];

for (const col of columns) {
  try {
    db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.name === 'username' ? 'TEXT' : col.type}`);
    if (col.name === 'username') {
      // SQLite doesn't support adding UNIQUE constraint via ALTER TABLE directly in some versions
      // but we can at least add the column. 
      // For simplicity in this environment, we just ensure the column exists.
    }
  } catch (e) {
    // Column likely already exists
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'deposit', 'withdraw', 'bet', 'win', 'entry_fee', 'prize'
    amount REAL,
    method TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
    reference TEXT, -- sender number or txid
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_type TEXT,
    user_id INTEGER,
    bet_amount REAL,
    multiplier REAL,
    payout REAL,
    result TEXT,
    server_seed TEXT,
    client_seed TEXT,
    nonce INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    game TEXT DEFAULT 'Free Fire',
    map TEXT,
    mode TEXT,
    prize_pool REAL,
    entry_fee REAL,
    total_slots INTEGER,
    status TEXT DEFAULT 'upcoming', -- 'upcoming', 'room_ready', 'live', 'completed'
    room_id TEXT,
    room_password TEXT,
    start_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tournament_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,
    user_id INTEGER,
    in_game_name TEXT,
    in_game_id TEXT,
    kills INTEGER DEFAULT 0,
    rank INTEGER,
    prize_won REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "tsf-bd24-secret-key-2024";

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- Auth Routes ---
const ADMIN_EMAIL = "admin@tsf.com";
const ADMIN_PASS_HASH = bcrypt.hashSync("Tsf123@#", 10);

app.post("/api/auth/signup", async (req, res) => {
  const { email, username, full_name, phone, password } = req.body;
  
  // Basic validation
  if (!email || !username || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const info = db.prepare("INSERT INTO users (email, username, full_name, phone, password) VALUES (?, ?, ?, ?, ?)").run(email, username, full_name, phone, hashedPassword);
    const token = jwt.sign({ id: info.lastInsertRowid, email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: info.lastInsertRowid, email, username, full_name, wallet_balance: 1000, role: 'user' } });
  } catch (e: any) {
    if (e.message.includes("users.email")) return res.status(400).json({ error: "Email already exists" });
    if (e.message.includes("users.username")) return res.status(400).json({ error: "Username already exists" });
    res.status(400).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { identifier, password } = req.body; // identifier can be email or username
  const user: any = db.prepare("SELECT * FROM users WHERE email = ? OR username = ?").get(identifier, identifier);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Check lock
  if (user.lock_until && new Date(user.lock_until) > new Date()) {
    return res.status(403).json({ error: "Account temporarily locked. Try again later." });
  }

  if (!(await bcrypt.compare(password, user.password))) {
    const attempts = (user.login_attempts || 0) + 1;
    if (attempts >= 10) {
      const lockUntil = new Date(Date.now() + 30 * 60000).toISOString(); // 30 mins lock
      db.prepare("UPDATE users SET login_attempts = ?, lock_until = ? WHERE id = ?").run(attempts, lockUntil, user.id);
      return res.status(403).json({ error: "Too many failed attempts. Account locked for 30 mins." });
    }
    db.prepare("UPDATE users SET login_attempts = ? WHERE id = ?").run(attempts, user.id);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Reset attempts on success
  db.prepare("UPDATE users SET login_attempts = 0, lock_until = NULL WHERE id = ?").run(user.id);

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, email: user.email, username: user.username, full_name: user.full_name, wallet_balance: user.wallet_balance, role: user.role } });
});

app.post("/api/auth/admin-login", async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`Admin login attempt from IP: ${ip} for email: ${email}`);

  if (email !== ADMIN_EMAIL || !(await bcrypt.compare(password, ADMIN_PASS_HASH))) {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  // Find or create admin user in DB for token consistency
  let adminUser: any = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'admin'").get(ADMIN_EMAIL);
  if (!adminUser) {
    const info = db.prepare("INSERT INTO users (email, username, full_name, password, role, wallet_balance) VALUES (?, 'admin', 'System Admin', ?, 'admin', 999999)").run(ADMIN_EMAIL, ADMIN_PASS_HASH);
    adminUser = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  }

  const token = jwt.sign({ id: adminUser.id, email: ADMIN_EMAIL, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: adminUser.id, email: ADMIN_EMAIL, username: 'admin', role: 'admin', wallet_balance: adminUser.wallet_balance } });
});

app.get("/api/user/me", authenticate, (req: any, res) => {
  const user: any = db.prepare("SELECT id, email, username, wallet_balance, role FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

app.post("/api/user/update", authenticate, (req: any, res) => {
  const { email, username } = req.body;
  try {
    db.prepare("UPDATE users SET email = ?, username = ? WHERE id = ?").run(email, username, req.user.id);
    res.json({ message: "Profile updated successfully" });
  } catch (e) {
    res.status(400).json({ error: "Email already exists or invalid data" });
  }
});

app.get("/api/user/transactions", authenticate, (req: any, res) => {
  const transactions = db.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(transactions);
});

// --- Wallet Routes ---
app.post("/api/wallet/deposit", authenticate, (req: any, res) => {
  const { method, senderNumber, transactionId, amount } = req.body;
  db.prepare("INSERT INTO transactions (user_id, type, amount, method, reference, status) VALUES (?, 'deposit', ?, ?, ?, 'pending')")
    .run(req.user.id, amount, method, `${senderNumber}|${transactionId}`);
  res.json({ message: "Deposit request submitted" });
});

app.post("/api/wallet/withdraw", authenticate, (req: any, res) => {
  const { method, withdrawNumber, amount } = req.body;
  const user: any = db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(req.user.id);

  if (amount < 50) return res.status(400).json({ error: "Minimum withdrawal is 50৳." });
  if (amount > user.wallet_balance) return res.status(400).json({ error: "Insufficient Balance." });

  // Daily limit check
  const today = new Date().toISOString().split('T')[0];
  const dailyTotal: any = db.prepare(`
    SELECT SUM(amount) as total FROM transactions 
    WHERE user_id = ? AND type = 'withdraw' AND status != 'rejected' AND date(created_at) = date(?)
  `).get(req.user.id, today);

  if ((dailyTotal.total || 0) + amount > 5000) {
    return res.status(400).json({ error: "Daily withdrawal limit is 5000৳." });
  }

  db.prepare("INSERT INTO transactions (user_id, type, amount, method, reference, status) VALUES (?, 'withdraw', ?, ?, ?, 'pending')")
    .run(req.user.id, amount, method, withdrawNumber);
  
  res.json({ message: "Withdrawal request sent to admin." });
});

app.post("/api/wallet/reset", authenticate, (req: any, res) => {
  db.prepare("UPDATE users SET wallet_balance = 1000 WHERE id = ?").run(req.user.id);
  res.json({ message: "Balance reset to 1000 TK" });
});

app.post("/api/games/bet", authenticate, (req: any, res) => {
  const { amount } = req.body;
  const user: any = db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(req.user.id);
  if (user.wallet_balance < amount) return res.status(400).json({ error: "Insufficient balance" });
  
  db.prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?").run(amount, req.user.id);
  db.prepare("INSERT INTO transactions (user_id, type, amount, status) VALUES (?, 'bet', ?, 'completed')")
    .run(req.user.id, amount);
  
  res.json({ balance: user.wallet_balance - amount });
});

app.post("/api/games/win", authenticate, (req: any, res) => {
  const { amount } = req.body;
  db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(amount, req.user.id);
  db.prepare("INSERT INTO transactions (user_id, type, amount, status) VALUES (?, 'win', ?, 'completed')")
    .run(req.user.id, amount);
  
  const user: any = db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(req.user.id);
  res.json({ balance: user.wallet_balance });
});

// --- Admin Routes ---
app.get("/api/admin/transactions", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const transactions = db.prepare(`
    SELECT t.*, u.email as user_email 
    FROM transactions t 
    JOIN users u ON t.user_id = u.id 
    WHERE t.status = 'pending'
    ORDER BY t.created_at DESC
  `).all();
  res.json(transactions);
});

app.post("/api/admin/approve", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { id, action } = req.body; // action: 'approve' or 'reject'
  
  const tx: any = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
  if (!tx || tx.status !== 'pending') return res.status(400).json({ error: "Invalid transaction" });

  if (action === 'approve') {
    if (tx.type === 'deposit') {
      db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(tx.amount, tx.user_id);
    } else if (tx.type === 'withdraw') {
      db.prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?").run(tx.amount, tx.user_id);
    }
    db.prepare("UPDATE transactions SET status = 'completed', processed_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  } else {
    db.prepare("UPDATE transactions SET status = 'rejected', processed_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  }
  
  res.json({ message: `Transaction ${action}ed` });
});

app.get("/api/admin/users", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const users = db.prepare("SELECT id, email, username, full_name, phone, wallet_balance, role, created_at FROM users ORDER BY created_at DESC").all();
  res.json(users);
});

app.post("/api/admin/update-balance", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { userId, amount, type } = req.body; // type: 'add' or 'set'
  
  if (type === 'add') {
    db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(amount, userId);
  } else {
    db.prepare("UPDATE users SET wallet_balance = ? WHERE id = ?").run(amount, userId);
  }
  
  res.json({ message: "Balance updated successfully" });
});

app.get("/api/admin/stats", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  
  const stats = {
    totalUsers: db.prepare("SELECT COUNT(*) as count FROM users").get().count,
    totalBalance: db.prepare("SELECT SUM(wallet_balance) as total FROM users").get().total || 0,
    pendingDeposits: db.prepare("SELECT COUNT(*) as count FROM transactions WHERE type = 'deposit' AND status = 'pending'").get().count,
    pendingWithdrawals: db.prepare("SELECT COUNT(*) as count FROM transactions WHERE type = 'withdraw' AND status = 'pending'").get().count,
    totalDeposits: db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'deposit' AND status = 'completed'").get().total || 0,
    totalWithdrawals: db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'withdraw' AND status = 'completed'").get().total || 0,
  };
  
  res.json(stats);
});

// --- Tournament Routes ---
app.get("/api/tournaments", (req, res) => {
  const tournaments = db.prepare("SELECT id, title, game, map, mode, prize_pool, entry_fee, total_slots, status, start_time FROM tournaments ORDER BY start_time ASC").all();
  // Get participant counts
  const withCounts = tournaments.map((t: any) => {
    const count = db.prepare("SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?").get(t.id) as { count: number };
    return { ...t, registered: count.count };
  });
  res.json(withCounts);
});

app.get("/api/tournaments/:id", authenticate, (req: any, res) => {
  const tournament: any = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(req.params.id);
  if (!tournament) return res.status(404).json({ error: "Tournament not found" });
  
  const participants = db.prepare("SELECT tp.*, u.username FROM tournament_participants tp JOIN users u ON tp.user_id = u.id WHERE tp.tournament_id = ?").all(tournament.id);
  
  // Check if current user is registered
  const isRegistered = participants.some((p: any) => p.user_id === req.user.id);
  
  // Only send room details if registered and status is room_ready or live
  let roomDetails = null;
  if (isRegistered && (tournament.status === 'room_ready' || tournament.status === 'live')) {
    roomDetails = {
      room_id: tournament.room_id,
      room_password: tournament.room_password
    };
  }

  // Hide room details from main object
  delete tournament.room_id;
  delete tournament.room_password;

  res.json({ ...tournament, participants, isRegistered, roomDetails });
});

app.post("/api/tournaments/:id/register", authenticate, (req: any, res) => {
  const { in_game_name, in_game_id } = req.body;
  const tournamentId = req.params.id;

  if (!in_game_name || !in_game_id) return res.status(400).json({ error: "In-game name and ID required" });

  const tournament: any = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId);
  if (!tournament) return res.status(404).json({ error: "Tournament not found" });
  if (tournament.status !== 'upcoming') return res.status(400).json({ error: "Registration closed" });

  const count = db.prepare("SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?").get(tournamentId) as { count: number };
  if (count.count >= tournament.total_slots) return res.status(400).json({ error: "Tournament is full" });

  const existing = db.prepare("SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?").get(tournamentId, req.user.id);
  if (existing) return res.status(400).json({ error: "Already registered" });

  const user: any = db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(req.user.id);
  if (user.wallet_balance < tournament.entry_fee) return res.status(400).json({ error: "Insufficient balance" });

  try {
    db.prepare("BEGIN TRANSACTION").run();
    db.prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?").run(tournament.entry_fee, req.user.id);
    db.prepare("INSERT INTO transactions (user_id, type, amount, status) VALUES (?, 'entry_fee', ?, 'completed')").run(req.user.id, tournament.entry_fee);
    db.prepare("INSERT INTO tournament_participants (tournament_id, user_id, in_game_name, in_game_id) VALUES (?, ?, ?, ?)").run(tournamentId, req.user.id, in_game_name, in_game_id);
    db.prepare("COMMIT").run();
    res.json({ message: "Registered successfully" });
  } catch (e) {
    db.prepare("ROLLBACK").run();
    res.status(500).json({ error: "Registration failed" });
  }
});

// Admin Tournament Routes
app.post("/api/admin/tournaments", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { title, map, mode, prize_pool, entry_fee, total_slots, start_time } = req.body;
  
  db.prepare(`
    INSERT INTO tournaments (title, map, mode, prize_pool, entry_fee, total_slots, start_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, map, mode, prize_pool, entry_fee, total_slots, start_time);
  
  res.json({ message: "Tournament created" });
});

app.put("/api/admin/tournaments/:id", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { status, room_id, room_password } = req.body;
  
  db.prepare("UPDATE tournaments SET status = ?, room_id = ?, room_password = ? WHERE id = ?").run(status, room_id, room_password, req.params.id);
  
  // Broadcast update to all users
  io.emit('tournament:update', { 
    id: req.params.id, 
    status, 
    room_id, 
    room_password 
  });
  
  res.json({ message: "Tournament updated" });
});

app.post("/api/admin/tournaments/:id/results", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  const { results } = req.body; // Array of { user_id, rank, kills, prize_won }
  const tournamentId = req.params.id;

  try {
    db.prepare("BEGIN TRANSACTION").run();
    for (const r of results) {
      db.prepare("UPDATE tournament_participants SET rank = ?, kills = ?, prize_won = ? WHERE tournament_id = ? AND user_id = ?").run(r.rank, r.kills, r.prize_won, tournamentId, r.user_id);
      if (r.prize_won > 0) {
        db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(r.prize_won, r.user_id);
        db.prepare("INSERT INTO transactions (user_id, type, amount, status) VALUES (?, 'prize', ?, 'completed')").run(r.user_id, r.prize_won);
      }
    }
    db.prepare("UPDATE tournaments SET status = 'completed' WHERE id = ?").run(tournamentId);
    db.prepare("COMMIT").run();
    res.json({ message: "Results published" });
  } catch (e) {
    db.prepare("ROLLBACK").run();
    res.status(500).json({ error: "Failed to publish results" });
  }
});

// --- Game Logic (Crash) ---
let crashState = {
  multiplier: 1.0,
  status: 'waiting', // 'waiting', 'running', 'crashed'
  startTime: 0,
  history: [] as any[],
  currentBets: [] as any[],
  nextCrashPoint: 1.0
};

// --- Game Logic (Aviator) ---
// Removed

// --- Game Logic (Wingo) ---
let wingoState = {
  timeLeft: 60,
  history: [] as any[],
  currentBets: [] as any[]
};

function generateCrashPoint() {
  const e = 2 ** 32;
  const h = Math.random() * e;
  if (h % 33 === 0) return 1.0;
  return Math.floor((100 * e - h) / (e - h)) / 100;
}

function startCrashRound() {
  crashState.status = 'waiting';
  crashState.multiplier = 1.0;
  crashState.currentBets = [];
  crashState.nextCrashPoint = generateCrashPoint();
  
  let waitTime = 5000;
  const waitInterval = setInterval(() => {
    waitTime -= 100;
    io.emit('crash:waiting', { timeLeft: waitTime });
    if (waitTime <= 0) {
      clearInterval(waitInterval);
      startRunning();
    }
  }, 100);
  
  function startRunning() {
    crashState.status = 'running';
    crashState.startTime = Date.now();
    io.emit('crash:start');
    
    const tick = setInterval(() => {
      const elapsed = (Date.now() - crashState.startTime) / 1000;
      crashState.multiplier = Math.pow(Math.E, 0.06 * elapsed);
      
      if (crashState.multiplier >= crashState.nextCrashPoint) {
        crashState.multiplier = crashState.nextCrashPoint;
        crashState.status = 'crashed';
        crashState.history.unshift(crashState.multiplier);
        if (crashState.history.length > 20) crashState.history.pop();
        io.emit('crash:update', { 
          multiplier: crashState.multiplier, 
          status: 'crashed',
          history: crashState.history 
        });
        clearInterval(tick);
        setTimeout(startCrashRound, 3000);
      } else {
        io.emit('crash:update', { multiplier: crashState.multiplier, status: 'running' });
      }
    }, 100);
  }
}

function startWingoTimer() {
  const tick = setInterval(() => {
    wingoState.timeLeft = Number((wingoState.timeLeft - 0.1).toFixed(1));
    
    if (wingoState.timeLeft <= 0) {
      const number = Math.floor(Math.random() * 10);
      const result = {
        id: Date.now(),
        period: new Date().getTime().toString().slice(-6),
        number,
        color: number === 0 ? 'violet-red' : number === 5 ? 'violet-green' : number % 2 === 0 ? 'red' : 'green',
        size: number >= 5 ? 'Big' : 'Small'
      };
      
      wingoState.history.unshift(result);
      if (wingoState.history.length > 20) wingoState.history.pop();
      
      io.emit('wingo:result', { result, history: wingoState.history });
      wingoState.timeLeft = 60.0;
    }
    
    // Only emit every 1s to reduce traffic, or every 100ms for smooth UI?
    // Let's do every 100ms for smooth UI as requested "improve time countdown"
    io.emit('wingo:update', { timeLeft: wingoState.timeLeft });
  }, 100);
}

startCrashRound();
startWingoTimer();

io.on('connection', (socket) => {
  socket.emit('crash:init', crashState);
  socket.emit('wingo:init', wingoState);
  
  socket.on('crash:bet', (data) => {
    const bet = {
      id: Date.now(),
      user: `User_***${socket.id.slice(0, 3)}`,
      amount: data.amount,
      multiplier: data.multiplier || 0,
      status: 'waiting',
      time: 'Just now'
    };
    crashState.currentBets.unshift(bet);
    if (crashState.currentBets.length > 20) crashState.currentBets.pop();
    io.emit('crash:bet_update', { bets: crashState.currentBets });
  });

  socket.on('wingo:bet', (data) => {
    const bet = {
      id: Date.now(),
      user: `User_***${socket.id.slice(0, 3)}`,
      amount: data.amount,
      selection: data.selection,
      time: 'Just now'
    };
    wingoState.currentBets.unshift(bet);
    if (wingoState.currentBets.length > 20) wingoState.currentBets.pop();
    io.emit('wingo:bet_update', { bets: wingoState.currentBets });
  });
});

// Vite Middleware
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
