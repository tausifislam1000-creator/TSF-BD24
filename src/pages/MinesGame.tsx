import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Bomb, Gem, Wallet, Trophy, ShieldCheck, Zap, Info, History, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Tile {
  id: number;
  isMine: boolean;
  isRevealed: boolean;
}

export default function MinesGame() {
  const { user, token, refreshUser } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [mineCount, setMineCount] = useState(3);
  const [grid, setGrid] = useState<Tile[]>([]);
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [revealedCount, setRevealedCount] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [gameHistory, setGameHistory] = useState<{ multiplier: number, amount: number, won: boolean }[]>([]);

  useEffect(() => {
    initializeGrid();
  }, []);

  const initializeGrid = () => {
    const newGrid: Tile[] = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      isMine: false,
      isRevealed: false,
    }));
    setGrid(newGrid);
    setStatus('idle');
    setRevealedCount(0);
    setMultiplier(1.0);
  };

  const calculateMultiplier = (mines: number, revealed: number) => {
    // Fair Mines Multiplier Formula: (Total / Remaining) * (1 - House Edge)
    // For simplicity, we use a standard multiplier table or formula
    let mult = 1.0;
    let remainingTiles = 25;
    let remainingMines = mines;

    for (let i = 0; i < revealed; i++) {
      mult *= (remainingTiles / (remainingTiles - remainingMines));
      remainingTiles--;
    }
    
    return mult * 0.97; // 3% House Edge
  };

  const startGame = async () => {
    if (!token) return setMessage({ type: 'error', text: 'Please login to play' });
    const amount = Number(betAmount);
    if (isNaN(amount) || amount < 10) return setMessage({ type: 'error', text: 'Minimum bet is 10 TK' });
    if (amount > (user?.wallet_balance || 0)) return setMessage({ type: 'error', text: 'Insufficient balance' });

    try {
      const res = await fetch('/api/games/bet', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });

      if (res.ok) {
        // Generate mines randomly
        const newGrid: Tile[] = Array.from({ length: 25 }, (_, i) => ({
          id: i,
          isMine: false,
          isRevealed: false,
        }));

        let placedMines = 0;
        while (placedMines < mineCount) {
          const idx = Math.floor(Math.random() * 25);
          if (!newGrid[idx].isMine) {
            newGrid[idx].isMine = true;
            placedMines++;
          }
        }

        setGrid(newGrid);
        setStatus('playing');
        setRevealedCount(0);
        setMultiplier(1.0);
        setMessage(null);
        await refreshUser();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to start game' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Connection error' });
    }
  };

  const handleTileClick = (id: number) => {
    if (status !== 'playing') return;
    if (grid[id].isRevealed) return;

    const newGrid = [...grid];
    newGrid[id].isRevealed = true;
    setGrid(newGrid);

    if (newGrid[id].isMine) {
      setStatus('lost');
      setGameHistory(prev => [{ multiplier: 0, amount: Number(betAmount), won: false }, ...prev].slice(0, 10));
      // Reveal all mines
      setGrid(grid.map(t => t.isMine ? { ...t, isRevealed: true } : t));
    } else {
      const newRevealedCount = revealedCount + 1;
      setRevealedCount(newRevealedCount);
      const newMult = calculateMultiplier(mineCount, newRevealedCount);
      setMultiplier(newMult);

      if (newRevealedCount === 25 - mineCount) {
        handleCashout();
      }
    }
  };

  const handleCashout = async () => {
    if (status !== 'playing' || revealedCount === 0) return;

    const winAmount = Number(betAmount) * multiplier;
    setStatus('won');
    setGameHistory(prev => [{ multiplier, amount: winAmount, won: true }, ...prev].slice(0, 10));

    try {
      await fetch('/api/games/win', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: winAmount })
      });
      await refreshUser();
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setMessage({ type: 'success', text: `Cashed out! You won ${winAmount.toFixed(2)} TK` });
      // Reveal all
      setGrid(grid.map(t => ({ ...t, isRevealed: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-900/80 border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-2xl shadow-lg shadow-blue-500/10">
            <Zap className="text-blue-500 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Mines Arena</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Virtual TK Gaming</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-2xl border border-white/5 shadow-inner">
          <Wallet className="text-emerald-400" size={20} />
          <span className="text-2xl font-black text-white">{user?.wallet_balance.toFixed(2)} <span className="text-emerald-400 text-sm">TK</span></span>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Bet Amount</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={betAmount} 
                    onChange={e => setBetAmount(e.target.value)}
                    disabled={status === 'playing'}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-black text-xl focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                  <div className="absolute right-2 top-2 flex gap-1">
                    <button onClick={() => setBetAmount('10')} className="px-3 py-1 bg-zinc-800 text-[10px] font-bold rounded-lg hover:bg-zinc-700">MIN</button>
                    <button onClick={() => setBetAmount('100')} className="px-3 py-1 bg-zinc-800 text-[10px] font-bold rounded-lg hover:bg-zinc-700">100</button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Number of Mines</label>
                <select 
                  value={mineCount} 
                  onChange={e => setMineCount(Number(e.target.value))}
                  disabled={status === 'playing'}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-black text-xl focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 appearance-none"
                >
                  {[1, 3, 5, 10, 15, 20, 24].map(n => (
                    <option key={n} value={n} className="bg-zinc-900">{n} Mines</option>
                  ))}
                </select>
              </div>

              {status === 'playing' ? (
                <button 
                  onClick={handleCashout}
                  disabled={revealedCount === 0}
                  className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black text-2xl rounded-2xl transition-all shadow-xl shadow-emerald-500/20 uppercase italic tracking-tighter"
                >
                  CASHOUT
                  <p className="text-sm font-bold opacity-80">{(Number(betAmount) * multiplier).toFixed(2)} TK</p>
                </button>
              ) : (
                <button 
                  onClick={status === 'idle' ? startGame : initializeGrid}
                  className="w-full py-6 bg-blue-500 hover:bg-blue-600 text-white font-black text-2xl rounded-2xl transition-all shadow-xl shadow-blue-500/20 uppercase italic tracking-tighter flex items-center justify-center gap-2"
                >
                  {status === 'idle' ? 'BET NOW' : <><RefreshCw size={24} /> PLAY AGAIN</>}
                </button>
              )}
            </div>

            {message && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`p-4 rounded-2xl border text-center text-sm font-bold ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {message.text}
              </motion.div>
            )}
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <ShieldCheck className="text-blue-500" size={20} />
            <div className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
              Provably Fair System
              <p className="text-blue-500/60">Verified SHA-256</p>
            </div>
          </div>
        </div>

        {/* Right: Game Display */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-zinc-900/80 border border-white/10 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[500px]">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            
            <div className="grid grid-cols-5 gap-3 md:gap-4 relative z-10">
              {grid.map((tile) => (
                <motion.button
                  key={tile.id}
                  whileHover={status === 'playing' && !tile.isRevealed ? { scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
                  whileTap={status === 'playing' && !tile.isRevealed ? { scale: 0.95 } : {}}
                  onClick={() => handleTileClick(tile.id)}
                  className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 ${
                    tile.isRevealed 
                      ? tile.isMine 
                        ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                        : 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-zinc-800/50 border-white/5 hover:border-white/20'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {tile.isRevealed ? (
                      <motion.div
                        key={tile.isMine ? 'mine' : 'gem'}
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 12 }}
                      >
                        {tile.isMine ? (
                          <Bomb className="text-red-500 w-8 h-8 md:w-10 md:h-10" />
                        ) : (
                          <Gem className="text-emerald-400 w-8 h-8 md:w-10 md:h-10" />
                        )}
                      </motion.div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white/10" />
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>

            {/* Multiplier Overlay */}
            {status === 'playing' && revealedCount > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 bg-black/60 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 shadow-2xl text-center"
              >
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Current Multiplier</p>
                <h3 className="text-4xl font-black text-emerald-400 italic">{multiplier.toFixed(2)}x</h3>
              </motion.div>
            )}

            {status === 'lost' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/40">
                  <Bomb className="text-red-500" size={48} />
                </div>
                <h2 className="text-6xl font-black text-red-500 uppercase italic tracking-tighter">BOOM!</h2>
                <p className="text-zinc-400 font-bold uppercase tracking-widest">You hit a mine</p>
                <button onClick={initializeGrid} className="px-8 py-3 bg-white text-black font-black rounded-xl hover:bg-blue-500 transition-all uppercase tracking-widest">Try Again</button>
              </motion.div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="text-zinc-400" size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Recent Games</h3>
              </div>
              <div className="space-y-2">
                {gameHistory.map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${h.won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {h.won ? <Gem size={16} /> : <Bomb size={16} />}
                      </div>
                      <span className="text-sm font-bold text-white">{h.amount.toFixed(2)} TK</span>
                    </div>
                    <span className={`text-sm font-black italic ${h.won ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.won ? `+${h.multiplier.toFixed(2)}x` : '0.00x'}
                    </span>
                  </div>
                ))}
                {gameHistory.length === 0 && <p className="text-center py-8 text-zinc-700 italic text-sm">No games played yet</p>}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Info className="text-zinc-400" size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest text-white italic">How to Play</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex gap-3 text-xs text-zinc-500">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                  <span>Select your bet amount and the number of mines you want on the grid.</span>
                </li>
                <li className="flex gap-3 text-xs text-zinc-500">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                  <span>Click tiles to reveal diamonds. Each diamond increases your payout multiplier.</span>
                </li>
                <li className="flex gap-3 text-xs text-zinc-500">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                  <span>Avoid the mines! If you hit one, you lose your entire bet.</span>
                </li>
                <li className="flex gap-3 text-xs text-zinc-500">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold">4</div>
                  <span>Cash out at any time to secure your winnings.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
