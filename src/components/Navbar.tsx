import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, User, LogOut, Shield, Gamepad2, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-emerald-500/20">
            <Gamepad2 className="text-black" size={24} />
          </div>
          <span className="text-2xl font-black italic tracking-tighter uppercase">TSF BD24</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all">Games</Link>
          <Link to="/tournaments" className="text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all">Tournaments</Link>
          <Link to="/wallet" className="text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all">Wallet</Link>
          <Link to="/profile" className="text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all">Profile</Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="text-sm font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-all flex items-center gap-1">
              <Shield size={16} /> Admin
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/wallet" className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-4 py-2 rounded-xl hover:bg-zinc-800 transition-all">
                <Wallet size={18} className="text-emerald-400" />
                <span className="font-bold">{user.wallet_balance.toFixed(2)} <span className="text-zinc-500 text-xs">TK</span></span>
              </Link>
              <Link to="/profile" className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-4 py-2 rounded-xl hover:bg-zinc-800 transition-all">
                <User size={18} className="text-emerald-400" />
                <span className="font-bold text-sm">{user.username || 'Profile'}</span>
              </Link>
              <button onClick={logout} className="p-2 text-zinc-400 hover:text-red-400 transition-all">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white">Login</Link>
              <Link to="/signup" className="bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20">Sign Up</Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-zinc-900 border-b border-white/5 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <Link to="/" onClick={() => setIsOpen(false)} className="block text-lg font-bold">Games</Link>
              <Link to="/tournaments" onClick={() => setIsOpen(false)} className="block text-lg font-bold">Tournaments</Link>
              <Link to="/wallet" onClick={() => setIsOpen(false)} className="block text-lg font-bold">Wallet</Link>
              <Link to="/profile" onClick={() => setIsOpen(false)} className="block text-lg font-bold">Profile</Link>
              {user?.role === 'admin' && <Link to="/admin" onClick={() => setIsOpen(false)} className="block text-lg font-bold text-emerald-400">Admin</Link>}
              <div className="pt-4 border-t border-white/5">
                {user ? (
                  <button onClick={() => { logout(); setIsOpen(false); }} className="text-red-400 font-bold">Logout</button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link to="/login" onClick={() => setIsOpen(false)} className="text-center py-3 bg-zinc-800 rounded-xl font-bold">Login</Link>
                    <Link to="/signup" onClick={() => setIsOpen(false)} className="text-center py-3 bg-emerald-500 text-black rounded-xl font-bold">Sign Up</Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
