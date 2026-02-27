import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowDownCircle, CheckCircle2, XCircle, User, CreditCard, 
  Calendar, Mail, Users, TrendingUp, Wallet, Search, 
  Plus, Settings, LayoutDashboard, History, Phone, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'dashboard' | 'transactions' | 'users' | 'tournaments';

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  
  // Tournament form state
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [tForm, setTForm] = useState({ title: '', map: 'Bermuda', mode: 'Solo', prize_pool: '', entry_fee: '', total_slots: '', start_time: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [txRes, usersRes, statsRes, tourRes] = await Promise.all([
        fetch('/api/admin/transactions', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/stats', { headers }),
        fetch('/api/tournaments', { headers })
      ]);

      const [txData, usersData, statsData, tourData] = await Promise.all([
        txRes.json(),
        usersRes.json(),
        statsRes.json(),
        tourRes.json()
      ]);

      setTransactions(txData);
      setUsers(usersData);
      setStats(statsData);
      setTournaments(tourData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id, action })
      });
      if (res.ok) {
        fetchData(); // Refresh all data to update stats
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !balanceAmount) return;

    try {
      const res = await fetch('/api/admin/update-balance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          userId: editingUser.id, 
          amount: Number(balanceAmount),
          type: 'set'
        })
      });
      if (res.ok) {
        setEditingUser(null);
        setBalanceAmount('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-red-500/10 rounded-full">
          <ShieldCheck className="text-red-500 w-12 h-12" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Access Denied</h2>
        <p className="text-zinc-500">You do not have administrative privileges.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Settings className="text-emerald-500 w-5 h-5 animate-spin-slow" />
            </div>
            <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em]">Admin Control</span>
          </div>
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">Management Panel</h1>
          <p className="text-zinc-500 mt-2 font-medium">System oversight and user financial management</p>
        </div>

        <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
          {[
            { id: 'dashboard', label: 'Stats', icon: LayoutDashboard },
            { id: 'transactions', label: 'Requests', icon: History },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'tournaments', label: 'Tournaments', icon: Trophy },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <StatCard 
              label="Total Users" 
              value={stats?.totalUsers || 0} 
              icon={Users} 
              color="blue" 
            />
            <StatCard 
              label="System Balance" 
              value={`${(stats?.totalBalance || 0).toLocaleString()} TK`} 
              icon={Wallet} 
              color="emerald" 
            />
            <StatCard 
              label="Total Deposits" 
              value={`${(stats?.totalDeposits || 0).toLocaleString()} TK`} 
              icon={TrendingUp} 
              color="blue" 
            />
            <StatCard 
              label="Total Withdrawals" 
              value={`${(stats?.totalWithdrawals || 0).toLocaleString()} TK`} 
              icon={ArrowDownCircle} 
              color="orange" 
            />
            
            <div className="md:col-span-2 bg-zinc-900/50 border border-white/10 rounded-3xl p-8 flex flex-col justify-center">
              <h3 className="text-xl font-black text-white uppercase italic mb-2">Pending Actions</h3>
              <div className="flex gap-8">
                <div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Deposits</p>
                  <p className="text-4xl font-black text-blue-400">{stats?.pendingDeposits || 0}</p>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Withdrawals</p>
                  <p className="text-4xl font-black text-orange-400">{stats?.pendingWithdrawals || 0}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'transactions' && (
          <motion.div 
            key="transactions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {transactions.length === 0 ? (
              <div className="bg-zinc-900/30 border border-dashed border-white/10 rounded-[2.5rem] p-20 text-center">
                <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="text-zinc-600" size={40} />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic">Zero Pending Requests</h3>
                <p className="text-zinc-500 mt-2">All financial transactions are currently processed.</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <motion.div 
                  key={tx.id}
                  layout
                  className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start gap-5">
                    <div className={`p-4 rounded-2xl ${tx.type === 'deposit' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {tx.type === 'deposit' ? <CreditCard size={28} /> : <ArrowDownCircle size={28} />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${tx.type === 'deposit' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'}`}>
                          {tx.type}
                        </span>
                        <h3 className="text-2xl font-black text-white italic tracking-tighter">
                          {tx.amount.toLocaleString()} <span className="text-zinc-500 text-sm">TK</span>
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-400 font-medium">
                        <span className="flex items-center gap-2"><Mail size={14} className="text-zinc-600" /> {tx.user_email}</span>
                        <span className="flex items-center gap-2"><Wallet size={14} className="text-zinc-600" /> {tx.method}</span>
                        <span className="flex items-center gap-2"><Calendar size={14} className="text-zinc-600" /> {new Date(tx.created_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5 w-fit">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Reference:</span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">{tx.reference}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleAction(tx.id, 'reject')}
                      className="flex-1 md:flex-none px-8 py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black uppercase tracking-widest text-xs transition-all border border-red-500/20"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(tx.id, 'approve')}
                      className="flex-1 md:flex-none px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Approve
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div 
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="text"
                placeholder="Search by email, username or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white font-medium focus:outline-none focus:border-emerald-500 transition-all backdrop-blur-md"
              />
            </div>

            <div className="bg-zinc-900/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/40 border-b border-white/5">
                      <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">User Info</th>
                      <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Contact</th>
                      <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Balance</th>
                      <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Role</th>
                      <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-500 transition-all">
                              <User size={20} />
                            </div>
                            <div>
                              <p className="font-black text-white italic">{u.username || 'N/A'}</p>
                              <p className="text-xs text-zinc-500">{u.full_name || 'No Name'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-zinc-400 flex items-center gap-2"><Mail size={12} /> {u.email}</p>
                            <p className="text-xs font-medium text-zinc-400 flex items-center gap-2"><Phone size={12} /> {u.phone || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Wallet size={16} className="text-emerald-500" />
                            <span className="font-black text-white tabular-nums">{u.wallet_balance.toFixed(2)} TK</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button 
                            onClick={() => {
                              setEditingUser(u);
                              setBalanceAmount(u.wallet_balance.toString());
                            }}
                            className="p-2 bg-zinc-800 hover:bg-emerald-500 text-zinc-400 hover:text-black rounded-lg transition-all"
                          >
                            <Plus size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'tournaments' && (
          <motion.div 
            key="tournaments"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Tournaments</h2>
              <button 
                onClick={() => setShowTournamentForm(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-xl font-bold transition-all"
              >
                <Plus size={18} /> Create Tournament
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((t) => (
                <div key={t.id} className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{t.title}</h3>
                      <p className="text-xs text-zinc-500 font-bold">{t.game} • {t.mode}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                      t.status === 'live' ? 'bg-red-500 text-white' :
                      t.status === 'room_ready' ? 'bg-emerald-500 text-black' :
                      t.status === 'completed' ? 'bg-zinc-700 text-zinc-300' :
                      'bg-blue-500 text-white'
                    }`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase">Prize</p>
                      <p className="font-bold text-emerald-400">{t.prize_pool} TK</p>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase">Entry</p>
                      <p className="font-bold text-white">{t.entry_fee} TK</p>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase">Slots</p>
                      <p className="font-bold text-white">{t.registered}/{t.total_slots}</p>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase">Map</p>
                      <p className="font-bold text-white">{t.map}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex gap-2">
                    <button 
                      onClick={() => {
                        const roomId = prompt('Enter Room ID:', t.room_id || '');
                        const roomPass = prompt('Enter Room Password:', t.room_password || '');
                        if (roomId !== null && roomPass !== null) {
                          fetch(`/api/admin/tournaments/${t.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ status: 'room_ready', room_id: roomId, room_password: roomPass })
                          }).then(() => fetchData());
                        }
                      }}
                      className="flex-1 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-bold uppercase rounded-xl transition-all"
                    >
                      Set Room
                    </button>
                    <button 
                      onClick={() => {
                        const newStatus = prompt('Enter new status (upcoming, room_ready, live, completed):', t.status);
                        if (newStatus) {
                          fetch(`/api/admin/tournaments/${t.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ status: newStatus, room_id: t.room_id, room_password: t.room_password })
                          }).then(() => fetchData());
                        }
                      }}
                      className="flex-1 py-2 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-xs font-bold uppercase rounded-xl transition-all"
                    >
                      Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Tournament Modal */}
      <AnimatePresence>
        {showTournamentForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTournamentForm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-emerald-500/20 rounded-2xl">
                  <Trophy className="text-emerald-500" size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">New Tournament</h3>
                  <p className="text-zinc-500 font-medium">Create a new Free Fire match</p>
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await fetch('/api/admin/tournaments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(tForm)
                  });
                  setShowTournamentForm(false);
                  fetchData();
                } catch (err) {
                  console.error(err);
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Title</label>
                  <input type="text" value={tForm.title} onChange={e => setTForm({...tForm, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Map</label>
                    <select value={tForm.map} onChange={e => setTForm({...tForm, map: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all">
                      <option value="Bermuda">Bermuda</option>
                      <option value="Purgatory">Purgatory</option>
                      <option value="Kalahari">Kalahari</option>
                      <option value="Alpine">Alpine</option>
                      <option value="NeXTerra">NeXTerra</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Mode</label>
                    <select value={tForm.mode} onChange={e => setTForm({...tForm, mode: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all">
                      <option value="Solo">Solo</option>
                      <option value="Duo">Duo</option>
                      <option value="Squad">Squad</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Prize Pool (TK)</label>
                    <input type="number" value={tForm.prize_pool} onChange={e => setTForm({...tForm, prize_pool: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Entry Fee (TK)</label>
                    <input type="number" value={tForm.entry_fee} onChange={e => setTForm({...tForm, entry_fee: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Total Slots</label>
                    <input type="number" value={tForm.total_slots} onChange={e => setTForm({...tForm, total_slots: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Start Time</label>
                    <input type="datetime-local" value={tForm.start_time} onChange={e => setTForm({...tForm, start_time: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all" required />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowTournamentForm(false)} className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest rounded-2xl transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Balance Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-emerald-500/20 rounded-2xl">
                  <Wallet className="text-emerald-500" size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Edit Balance</h3>
                  <p className="text-zinc-500 text-sm font-medium">User: {editingUser.username}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateBalance} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">New Balance (TK)</label>
                  <input 
                    type="number"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-black text-2xl focus:outline-none focus:border-emerald-500 transition-all"
                    autoFocus
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-4 rounded-2xl bg-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-xs hover:bg-zinc-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Update
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colorClasses: any = {
    emerald: 'bg-emerald-500/20 text-emerald-500',
    blue: 'bg-blue-500/20 text-blue-500',
    orange: 'bg-orange-500/20 text-orange-500',
    purple: 'bg-purple-500/20 text-purple-500',
  };

  return (
    <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-8 space-y-4 hover:border-white/20 transition-all group">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 ${colorClasses[color]}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em]">{label}</p>
        <p className="text-3xl font-black text-white italic tracking-tighter mt-1">{value}</p>
      </div>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

