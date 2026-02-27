import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, History, Wallet, Trophy, Info, ShieldCheck, Zap, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { io, Socket } from 'socket.io-client';

type BetType = 'big' | 'small' | 'red' | 'green' | 'violet' | number;

interface GameResult {
  id: number;
  period: string;
  number: number;
  color: string;
  size: string;
}

export default function WingoGame() {
  const { user, token, refreshUser } = useAuth();
  const [timeLeft, setTimeLeft] = useState(60);
  const [betAmount, setBetAmount] = useState('10');
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null);
  const [history, setHistory] = useState<GameResult[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [myBets, setMyBets] = useState<{ type: BetType, amount: number, period: string }[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [liveBets, setLiveBets] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on('wingo:init', (state) => {
      setTimeLeft(state.timeLeft);
      setHistory(state.history);
      setLiveBets(state.currentBets || []);
      if (state.history.length > 0) {
        setLastResult(state.history[0]);
      }
    });

    socketRef.current.on('wingo:update', (data) => {
      setTimeLeft(data.timeLeft);
      if (data.timeLeft === 59) {
        setIsSpinning(false);
      }
    });

    socketRef.current.on('wingo:result', (data) => {
      setIsSpinning(true);
      setLiveBets([]); // Clear bets for new round
      setTimeout(() => {
        setLastResult(data.result);
        setHistory(data.history);
        setIsSpinning(false);
        checkWinnings(data.result);
      }, 2000);
    });

    socketRef.current.on('wingo:bet_update', (data) => {
      setLiveBets(data.bets);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const checkWinnings = async (result: GameResult) => {
    const currentRoundBets = myBets.filter(b => b.period === result.period);
    let totalWin = 0;

    currentRoundBets.forEach(bet => {
      let won = false;
      let multiplier = 0;

      const resSize = result.size.toLowerCase();
      const resColor = result.color.toLowerCase();

      if (bet.type === 'big' && resSize === 'big') { won = true; multiplier = 2; }
      else if (bet.type === 'small' && resSize === 'small') { won = true; multiplier = 2; }
      else if (bet.type === 'red' && resColor.includes('red')) { won = true; multiplier = 2; }
      else if (bet.type === 'green' && resColor.includes('green')) { won = true; multiplier = 2; }
      else if (bet.type === 'violet' && resColor.includes('violet')) { won = true; multiplier = 4.5; }
      else if (typeof bet.type === 'number' && bet.type === result.number) { won = true; multiplier = 9; }

      if (won) {
        totalWin += bet.amount * multiplier;
      }
    });

    if (totalWin > 0) {
      try {
        await fetch('/api/games/win', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ amount: totalWin })
        });
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setMessage({ type: 'success', text: `Congratulations! You won ${totalWin.toFixed(2)} TK` });
        await refreshUser();
      } catch (e) {
        console.error('Failed to process win', e);
      }
    }
  };

  const placeBet = async () => {
    if (!token) return setMessage({ type: 'error', text: 'Please login to place bets' });
    if (!selectedBet) return setMessage({ type: 'error', text: 'Please select a bet option' });
    if (timeLeft <= 5) return setMessage({ type: 'error', text: 'Betting is closed for this round' });
    const amount = Number(betAmount);
    if (isNaN(amount) || amount < 1) return setMessage({ type: 'error', text: 'Minimum bet is 1 TK' });
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
        const period = new Date().getTime().toString().slice(-6);
        setMyBets(prev => [...prev, { type: selectedBet, amount, period }]);
        setMessage({ type: 'success', text: `Bet placed: ${selectedBet} for ${amount} TK` });
        await refreshUser();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to place bet' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to place bet' });
    }
  };

  const renderColorCircle = (color: string) => {
    const c = color.toLowerCase();
    if (c === 'violet-red') return <div className="flex w-full h-full"><div className="w-1/2 h-full bg-red-500"></div><div className="w-1/2 h-full bg-purple-500"></div></div>;
    if (c === 'violet-green') return <div className="flex w-full h-full"><div className="w-1/2 h-full bg-green-500"></div><div className="w-1/2 h-full bg-purple-500"></div></div>;
    if (c === 'red') return <div className="w-full h-full bg-red-500"></div>;
    if (c === 'green') return <div className="w-full h-full bg-green-500"></div>;
    return <div className="w-full h-full bg-purple-500"></div>;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header & Wallet */}
      <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-2xl">
            <Trophy className="text-emerald-400 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Wingo Color Trading</h1>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Virtual TK Coins Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
          <Wallet className="text-emerald-400" size={20} />
          <span className="text-2xl font-black text-white">{user?.wallet_balance.toFixed(2)} <span className="text-emerald-400 text-sm">TK</span></span>
        </div>
      </div>

      {/* Timer & Round Info */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-zinc-900/80 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="text-center">
              <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em] mb-2">Next Round In</p>
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="96" cy="96" r="88" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <motion.circle 
                    cx="96" cy="96" r="88" fill="transparent" stroke="#10b981" strokeWidth="8" 
                    strokeDasharray="553"
                    animate={{ strokeDashoffset: 553 - (553 * timeLeft) / 60 }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-6xl font-black italic tabular-nums ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft.toFixed(1)}s</span>
                  <Timer className="text-zinc-600 mt-2" size={24} />
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isSpinning ? (
                <motion.div 
                  key="spinning"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  className="flex gap-4"
                >
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ y: [0, -20, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40"
                    />
                  ))}
                </motion.div>
              ) : lastResult ? (
                <motion.div 
                  key={lastResult.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full border-4 border-white/10 overflow-hidden relative shadow-2xl shadow-white/5">
                      {renderColorCircle(lastResult.color)}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl font-black text-white drop-shadow-lg">{lastResult.number}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-white italic uppercase tracking-tighter">{lastResult.size}</p>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Period {lastResult.period}</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-24 flex items-center text-zinc-600 italic font-medium">Waiting for result...</div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* History */}
        <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <History className="text-zinc-400" size={20} />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Latest Results</h3>
            </div>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Live Feed</span>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 no-scrollbar">
            <AnimatePresence initial={false} mode="popLayout">
              {history.map((res) => (
                <motion.div 
                  key={res.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-2xl border border-white/5 group hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden relative">
                      {renderColorCircle(res.color)}
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{res.number}</div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500">#{res.period}</p>
                      <p className="text-xs font-black text-white uppercase italic">{res.size}</p>
                    </div>
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${res.color.includes('green') ? 'text-green-400' : 'text-red-400'}`}>
                    {res.color.replace('-', ' & ')}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {history.length === 0 && <p className="text-center py-12 text-zinc-700 italic text-sm">No history yet</p>}
          </div>
        </div>
      </div>

      {/* Bet Panel */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900/80 border border-white/10 rounded-3xl p-8 space-y-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => setSelectedBet('green')} className={`px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-lg ${selectedBet === 'green' ? 'bg-green-500 text-white scale-105 shadow-green-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'}`}>Green</button>
            <button onClick={() => setSelectedBet('violet')} className={`px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-lg ${selectedBet === 'violet' ? 'bg-purple-500 text-white scale-105 shadow-purple-500/20' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'}`}>Violet</button>
            <button onClick={() => setSelectedBet('red')} className={`px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-lg ${selectedBet === 'red' ? 'bg-red-500 text-white scale-105 shadow-red-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'}`}>Red</button>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => setSelectedBet('big')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-lg ${selectedBet === 'big' ? 'bg-zinc-100 text-black scale-105' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-white/5'}`}>Big</button>
            <button onClick={() => setSelectedBet('small')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-lg ${selectedBet === 'small' ? 'bg-zinc-100 text-black scale-105' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-white/5'}`}>Small</button>
          </div>

          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button 
                key={num} 
                onClick={() => setSelectedBet(num)}
                className={`aspect-square rounded-xl font-black text-lg transition-all border ${selectedBet === num ? 'bg-emerald-500 text-black border-emerald-400 scale-110' : 'bg-black/40 text-zinc-500 border-white/5 hover:border-white/20'}`}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Bet Amount (TK)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={betAmount} 
                  onChange={e => setBetAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-black text-xl focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="10"
                />
                <div className="absolute right-2 top-2 flex gap-1">
                  <button onClick={() => setBetAmount('10')} className="px-3 py-1 bg-zinc-800 text-[10px] font-bold rounded-lg hover:bg-zinc-700">10</button>
                  <button onClick={() => setBetAmount('100')} className="px-3 py-1 bg-zinc-800 text-[10px] font-bold rounded-lg hover:bg-zinc-700">100</button>
                  <button onClick={() => setBetAmount('1000')} className="px-3 py-1 bg-zinc-800 text-[10px] font-bold rounded-lg hover:bg-zinc-700">1K</button>
                </div>
              </div>
            </div>
            <button 
              onClick={placeBet}
              disabled={timeLeft <= 5}
              className="w-full md:w-auto px-12 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black uppercase italic tracking-tighter rounded-2xl transition-all shadow-xl shadow-emerald-500/20"
            >
              {timeLeft <= 5 ? 'Closed' : 'Confirm Bet'}
            </button>
          </div>

          {message && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-2xl border flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              <Info size={20} />
              <p className="text-sm font-bold">{message.text}</p>
            </motion.div>
          )}
        </div>

        {/* Live Bets Panel */}
        <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="text-zinc-400" size={20} />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Live Bets</h3>
            </div>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
            </div>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 no-scrollbar">
            {liveBets.map((bet, i) => (
              <div key={bet.id || i} className="flex justify-between items-center p-3 bg-black/20 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                    {bet.user.slice(-2)}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400">{bet.user}</p>
                    <p className="text-[10px] font-black text-emerald-400 uppercase italic">Bet: {bet.selection}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-white">{bet.amount.toFixed(2)} TK</p>
                  <p className="text-[8px] font-bold text-zinc-600 uppercase">{bet.time}</p>
                </div>
              </div>
            ))}
            {liveBets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-700">
                <Users size={32} className="mb-2 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Waiting for bets...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 space-y-2">
          <Zap className="text-emerald-400" size={24} />
          <h4 className="text-sm font-bold text-white uppercase tracking-widest">Instant Payouts</h4>
          <p className="text-xs text-zinc-500">Winnings are automatically added to your wallet after each round.</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 space-y-2">
          <ShieldCheck className="text-emerald-400" size={24} />
          <h4 className="text-sm font-bold text-white uppercase tracking-widest">Provably Fair</h4>
          <p className="text-xs text-zinc-500">All results are generated using cryptographically secure random numbers.</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 space-y-2">
          <Info className="text-emerald-400" size={24} />
          <h4 className="text-sm font-bold text-white uppercase tracking-widest">Game Rules</h4>
          <p className="text-xs text-zinc-500">Big (5-9), Small (0-4). Green (1,3,7,9), Red (2,4,6,8), Violet (0,5).</p>
        </div>
      </div>
    </div>
  );
}

