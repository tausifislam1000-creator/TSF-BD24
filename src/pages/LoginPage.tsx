import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Gamepad2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('remembered_user');
    if (saved) {
      setIdentifier(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (res.ok) {
        if (rememberMe) {
          localStorage.setItem('remembered_user', identifier);
        } else {
          localStorage.removeItem('remembered_user');
        }
        login(data.token, data.user);
        navigate('/');
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/80 border border-white/10 rounded-[2.5rem] p-8 md:p-10 space-y-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/20 rotate-3">
            <Gamepad2 className="text-black" size={40} />
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Welcome Back</h2>
          <p className="text-zinc-500 font-medium">Login to your TSF BD24 account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Email or Username</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                value={identifier} 
                onChange={e => setIdentifier(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                placeholder="name@example.com or username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Password</label>
              <Link to="#" className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                placeholder="••••••••"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-all"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <input 
              type="checkbox" 
              id="remember" 
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-white/10 bg-black/40 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="remember" className="text-xs font-bold text-zinc-500 cursor-pointer select-none">Remember me</label>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              {error}
            </motion.div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest py-5 rounded-2xl transition-all shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Login to Account'} <ArrowRight size={20} />
          </button>
        </form>

        <div className="pt-6 border-t border-white/5 space-y-4">
          <p className="text-center text-zinc-500 text-sm font-medium">
            Don't have an account? <Link to="/signup" className="text-emerald-400 font-bold hover:underline">Sign Up</Link>
          </p>
          <div className="flex justify-center">
            <Link to="/admin-login" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-emerald-500 transition-all">
              <ShieldCheck size={14} /> Admin Access
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

