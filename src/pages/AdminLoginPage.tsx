import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Lock, ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    const saved = localStorage.getItem('remembered_admin');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        if (rememberMe) {
          localStorage.setItem('remembered_admin', email);
        } else {
          localStorage.removeItem('remembered_admin');
        }
        login(data.token, data.user);
        navigate('/admin');
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900/80 border border-red-500/20 rounded-[2.5rem] p-8 md:p-10 space-y-8 shadow-2xl backdrop-blur-xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
        
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/30 shadow-2xl shadow-red-500/10">
            <ShieldAlert className="text-red-500" size={40} />
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Admin Access</h2>
          <p className="text-zinc-500 font-medium">Restricted Management Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold focus:outline-none focus:border-red-500 transition-all"
                placeholder="admin@tsf.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Secure Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold focus:outline-none focus:border-red-500 transition-all"
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
              id="remember-admin" 
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-white/10 bg-black/40 text-red-500 focus:ring-red-500"
            />
            <label htmlFor="remember-admin" className="text-xs font-bold text-zinc-500 cursor-pointer select-none">Remember admin session</label>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              {error}
            </motion.div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest py-5 rounded-2xl transition-all shadow-2xl shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Authorize Access'} <ArrowRight size={20} />
          </button>
        </form>

        <div className="pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
            Unauthorized access attempts are logged and monitored.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
