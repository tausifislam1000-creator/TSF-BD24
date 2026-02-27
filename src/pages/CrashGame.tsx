import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, History, Users, ShieldCheck, Info } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CrashGame() {
  const { user, token, refreshUser } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [status, setStatus] = useState<'waiting' | 'running' | 'crashed'>('waiting');
  const [betAmount, setBetAmount] = useState('10');
  const [autoCashout, setAutoCashout] = useState('2.0');
  const [isBetting, setIsBetting] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const s = io();
    setSocket(s);

    s.on('crash:init', (state) => {
      setMultiplier(state.multiplier);
      setStatus(state.status);
      setHistory(state.history);
    });

    s.on('crash:update', (data) => {
      setMultiplier(data.multiplier);
      setStatus(data.status);
      if (data.history) {
        setHistory(data.history);
      }
      if (data.status === 'crashed') {
        setIsBetting(false);
        setHasCashedOut(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
    });

    s.on('crash:waiting', (data) => {
      setStatus('waiting');
      setTimeLeft(data.timeLeft / 1000);
    });

    return () => { 
      s.disconnect(); 
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleBet = async () => {
    if (!token) return;
    if (status !== 'waiting' || isBetting) return;
    const amount = Number(betAmount);
    if (amount > (user?.wallet_balance || 0)) return;

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
        setIsBetting(true);
        await refreshUser();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCashout = async () => {
    if (status !== 'running' || !isBetting || hasCashedOut) return;
    setHasCashedOut(true);
    const winAmount = Number(betAmount) * multiplier;
    
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
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 grid lg:grid-cols-4 gap-6">
      {/* Left Panel: Controls */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex gap-2 p-1 bg-black/40 rounded-xl">
            <button className="flex-1 py-2 text-xs font-bold uppercase tracking-widest bg-emerald-500 text-white rounded-lg">Manual</button>
            <button className="flex-1 py-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-all">Auto</button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                <span>Bet Amount</span>
                <span className="text-emerald-400">{user?.wallet_balance.toFixed(2)} TK</span>
              </div>
              <div className="relative">
                <input 
                  type="number" 
                  value={betAmount} 
                  onChange={e => setBetAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500"
                />
                <div className="absolute right-2 top-2 flex gap-1">
                  <button onClick={() => setBetAmount(prev => (Number(prev) / 2).toString())} className="px-2 py-1 bg-zinc-800 text-[10px] font-bold rounded hover:bg-zinc-700">1/2</button>
                  <button onClick={() => setBetAmount(prev => (Number(prev) * 2).toString())} className="px-2 py-1 bg-zinc-800 text-[10px] font-bold rounded hover:bg-zinc-700">x2</button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Auto Cashout</span>
              <input 
                type="number" 
                value={autoCashout} 
                onChange={e => setAutoCashout(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {status === 'running' && isBetting && !hasCashedOut ? (
              <button 
                onClick={handleCashout}
                className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-2xl rounded-2xl transition-all shadow-xl shadow-emerald-500/20 uppercase italic tracking-tighter"
              >
                CASHOUT
                <p className="text-sm font-bold opacity-80">{(Number(betAmount) * multiplier).toFixed(2)} TK</p>
              </button>
            ) : (
              <button 
                disabled={status !== 'waiting' || isBetting}
                onClick={handleBet}
                className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-2xl rounded-2xl transition-all shadow-xl shadow-emerald-500/20 uppercase italic tracking-tighter"
              >
                {isBetting ? 'BET PLACED' : 'PLACE BET'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
          <ShieldCheck className="text-emerald-400" size={20} />
          <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            Provably Fair System Active
            <p className="text-emerald-400/60">Verified by SHA-256</p>
          </div>
        </div>
      </div>

      {/* Center Panel: Game Display */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-zinc-900/80 border border-white/10 rounded-3xl h-[500px] relative overflow-hidden flex flex-col items-center justify-center">
          {/* Wallet Overlay */}
          <div className="absolute top-6 right-6 z-20">
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-emerald-400" size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Balance</p>
                <p className="text-sm font-black text-white">{user?.wallet_balance.toFixed(2)} TK</p>
              </div>
            </div>
          </div>

          {/* Grid Background */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
          
            <AnimatePresence mode="wait">
              {status === 'waiting' ? (
                <motion.div 
                  key="waiting"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="text-center z-10"
                >
                  <motion.p 
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-emerald-400 font-black uppercase tracking-[0.4em] mb-4 text-sm"
                  >
                    Preparing Next Round
                  </motion.p>
                  <h2 className="text-9xl font-black text-white italic tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                    {timeLeft.toFixed(1)}<span className="text-4xl ml-2">s</span>
                  </h2>
                  <div className="w-80 h-3 bg-white/5 rounded-full mt-10 overflow-hidden border border-white/10 p-0.5">
                    <motion.div 
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: timeLeft, ease: 'linear' }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="running"
                  className="text-center z-10"
                >
                  <motion.h2 
                    animate={status === 'running' ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className={`text-[12rem] font-black italic leading-none tracking-tighter transition-colors duration-300 ${status === 'crashed' ? 'text-red-500' : 'text-white'}`}
                  >
                    {multiplier.toFixed(2)}x
                  </motion.h2>
                  {status === 'crashed' && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="space-y-2 mt-4"
                    >
                      <p className="text-5xl font-black text-red-500 uppercase italic tracking-[0.2em]">
                        Crashed!
                      </p>
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Better luck next time</p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Cashout Button */}
            <AnimatePresence>
              {status === 'running' && isBetting && !hasCashedOut && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 w-full max-w-xs px-4"
                >
                  <button 
                    onClick={handleCashout}
                    className="w-full py-8 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-3xl rounded-[2rem] transition-all shadow-[0_0_40px_rgba(16,185,129,0.5)] uppercase italic tracking-tighter border-4 border-white/20 active:scale-95"
                  >
                    CASHOUT
                    <p className="text-lg font-bold opacity-90">{(Number(betAmount) * multiplier).toFixed(2)} TK</p>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          {/* History Strip */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-xl flex flex-col gap-3 border-t border-white/10">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Latest Crashed Results</span>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">2x+</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">Below 2x</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <AnimatePresence initial={false}>
                {history.map((h, i) => (
                  <motion.div 
                    key={`${h}-${i}`}
                    initial={{ opacity: 0, x: -20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-black italic border ${
                      h >= 2 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                    }`}
                  >
                    {h.toFixed(2)}x
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="text-zinc-400" size={20} />
                <h3 className="text-sm font-bold uppercase tracking-widest text-white">Live Bets</h3>
              </div>
              <span className="text-xs font-bold text-zinc-500">24 Players</span>
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                  <span className="text-sm text-zinc-400">User_{i}***</span>
                  <span className="text-sm font-bold text-white">100.00 TK</span>
                  <span className="text-xs font-black text-emerald-400">-</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="text-zinc-400" size={20} />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">My History</h3>
            </div>
            <p className="text-center py-8 text-zinc-600 text-sm italic">No bets placed yet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
