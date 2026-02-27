import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, ArrowUpCircle, ArrowDownCircle, History, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function WalletPage() {
  const { user, token, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [withdrawNumber, setWithdrawNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ method, senderNumber, transactionId, amount: Number(amount) })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Deposit request submitted! Waiting for admin approval.' });
        setAmount('');
        setSenderNumber('');
        setTransactionId('');
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ method, withdrawNumber, amount: Number(amount) })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Withdrawal request sent to admin.' });
        setAmount('');
        setWithdrawNumber('');
        refreshUser();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetBalance = async () => {
    if (!confirm('Are you sure you want to reset your balance to 1000 TK?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Balance reset to 1000 TK!' });
        await refreshUser();
      } else {
        setMessage({ type: 'error', text: 'Failed to reset balance' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 bg-emerald-500/20 rounded-2xl shadow-inner">
            <Wallet className="text-emerald-400 w-10 h-10" />
          </div>
          <div>
            <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em]">Available Balance</p>
            <h2 className="text-4xl font-black text-white italic tracking-tighter">{user?.wallet_balance.toFixed(2)} <span className="text-emerald-400 text-xl">TK</span></h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 relative z-10">
          <button onClick={() => setActiveTab('deposit')} className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg ${activeTab === 'deposit' ? 'bg-emerald-500 text-black shadow-emerald-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <ArrowUpCircle size={18} /> Deposit
          </button>
          <button onClick={() => setActiveTab('withdraw')} className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg ${activeTab === 'withdraw' ? 'bg-emerald-500 text-black shadow-emerald-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <ArrowDownCircle size={18} /> Withdraw
          </button>
          <button onClick={handleResetBalance} className="px-6 py-3 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-red-500 hover:text-white font-bold transition-all border border-white/5">
            Reset
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'deposit' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h3 className="text-xl font-bold text-white mb-4">Deposit TK Coins</h3>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                  <p className="text-emerald-400 text-sm font-medium">Send Money to: <span className="text-white text-lg">01331144063</span></p>
                  <p className="text-zinc-400 text-xs mt-1">Available on bKash & Nagad. No limits.</p>
                </div>
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setMethod('bKash')} className={`p-4 rounded-xl border transition-all ${method === 'bKash' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-zinc-800/50'}`}>
                      <img src="https://upload.wikimedia.org/wikipedia/commons/8/8c/BKash_Logo.svg" alt="bKash" className="h-8 mx-auto grayscale brightness-200" />
                    </button>
                    <button type="button" onClick={() => setMethod('Nagad')} className={`p-4 rounded-xl border transition-all ${method === 'Nagad' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-zinc-800/50'}`}>
                      <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Nagad_Logo.svg" alt="Nagad" className="h-8 mx-auto grayscale brightness-200" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Sender Number</label>
                    <input type="text" value={senderNumber} onChange={e => setSenderNumber(e.target.value)} placeholder="017XXXXXXXX" className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Transaction ID</label>
                    <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="TXN12345678" className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Amount (TK)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 text-2xl font-bold" required />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50">
                    {loading ? 'Processing...' : 'Complete Deposit ✅'}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'withdraw' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h3 className="text-xl font-bold text-white mb-4">Withdraw TK Coins</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5">
                    <p className="text-zinc-500 text-xs">Min Withdraw</p>
                    <p className="text-white font-bold">50৳</p>
                  </div>
                  <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5">
                    <p className="text-zinc-500 text-xs">Daily Limit</p>
                    <p className="text-white font-bold">5000৳</p>
                  </div>
                </div>
                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setMethod('bKash')} className={`p-4 rounded-xl border transition-all ${method === 'bKash' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-zinc-800/50'}`}>
                      <img src="https://upload.wikimedia.org/wikipedia/commons/8/8c/BKash_Logo.svg" alt="bKash" className="h-8 mx-auto grayscale brightness-200" />
                    </button>
                    <button type="button" onClick={() => setMethod('Nagad')} className={`p-4 rounded-xl border transition-all ${method === 'Nagad' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-zinc-800/50'}`}>
                      <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Nagad_Logo.svg" alt="Nagad" className="h-8 mx-auto grayscale brightness-200" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Withdrawal Number</label>
                    <input type="text" value={withdrawNumber} onChange={e => setWithdrawNumber(e.target.value)} placeholder="017XXXXXXXX" className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Amount (TK)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 text-2xl font-bold" required />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50">
                    {loading ? 'Processing...' : 'Complete Withdrawal 💸'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {message && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 p-4 rounded-xl border flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              <p className="text-sm font-medium">{message.text}</p>
            </motion.div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="text-zinc-400" size={20} />
            <h3 className="text-lg font-bold text-white">Recent Activity</h3>
          </div>
          <div className="space-y-4">
            <p className="text-zinc-500 text-sm text-center py-8">No recent transactions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
