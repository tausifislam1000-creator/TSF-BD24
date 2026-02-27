import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Mail, History, Save, AlertCircle, CheckCircle, ArrowRightLeft, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  method: string;
  status: string;
  reference: string;
  created_at: string;
}

export default function ProfilePage() {
  const { user, token, refreshUser } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [username, setUsername] = useState(user?.username || '');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setUsername(user.username || '');
    }
    fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/user/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (e) {
      console.error('Failed to fetch transactions', e);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, username })
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error('Server returned an invalid response. Please try again.');
      }

      if (res.ok) {
        // Mirror to Formspree (decoupled)
        setTimeout(() => {
          fetch('https://formspree.io/f/xaqdknje', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              form_type: 'Profile Update',
              old_email: user?.email,
              new_email: email,
              old_username: user?.username,
              new_username: username,
              timestamp: new Date().toISOString()
            })
          }).catch(err => console.error('Formspree mirror failed', err));
        }, 0);

        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        await refreshUser();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Something went wrong. Please check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <User size={120} />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/10">
                  <User size={48} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                    {user?.username || 'Gamer'}
                  </h2>
                  <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em]">
                    {user?.role === 'admin' ? 'Administrator' : 'Verified Player'}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <Wallet size={18} className="text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Balance</span>
                  </div>
                  <span className="text-lg font-black text-white italic">{user?.wallet_balance.toFixed(2)} TK</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 shadow-2xl"
          >
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">
              <Save size={16} /> Edit Profile
            </h3>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="Enter email"
                  />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-500/20"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </motion.div>
        </div>

        {/* Right Column: Transaction History */}
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 shadow-2xl h-full"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black uppercase tracking-tighter text-white italic flex items-center gap-3">
                <History className="text-emerald-400" /> Transaction History
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-full border border-emerald-500/20">REAL-TIME</span>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {transactions.length === 0 ? (
                <div className="text-center py-20 text-zinc-600 italic">
                  <ArrowRightLeft size={48} className="mx-auto mb-4 opacity-20" />
                  No transactions found yet.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="group bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        tx.type === 'win' || tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {tx.type === 'win' || tx.type === 'deposit' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight text-white italic">
                          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        </p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-lg font-black italic ${
                        tx.type === 'win' || tx.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {tx.type === 'win' || tx.type === 'deposit' ? '+' : '-'}{tx.amount.toFixed(2)} TK
                      </p>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        tx.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 
                        tx.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : 
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
