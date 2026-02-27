import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Gamepad2, User, Phone, Check, X, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const [validation, setValidation] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
    match: false
  });

  useEffect(() => {
    const { password, confirmPassword } = formData;
    setValidation({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[@$!%*?&]/.test(password),
      match: password === confirmPassword && password !== ''
    });
  }, [formData.password, formData.confirmPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Object.values(validation).every(v => v)) {
      return setError('Please meet all security requirements');
    }
    
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          full_name: formData.fullName,
          phone: formData.phone,
          password: formData.password
        })
      });
      const data = await res.json();
      if (res.ok) {
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

  const ValidationItem = ({ met, text }: { met: boolean, text: string }) => (
    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${met ? 'text-emerald-400' : 'text-zinc-600'}`}>
      {met ? <Check size={12} /> : <X size={12} />}
      {text}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/80 border border-white/10 rounded-[2.5rem] p-8 md:p-12 space-y-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/20 rotate-3">
            <Gamepad2 className="text-black" size={40} />
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Join the Arena</h2>
          <p className="text-zinc-500 font-medium">Create your TSF BD24 account today</p>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName} 
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="text" 
                  name="username"
                  value={formData.username} 
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="johndoe24"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="email" 
                  name="email"
                  value={formData.email} 
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Phone (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone} 
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="+8801..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  value={formData.password} 
                  onChange={handleChange}
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

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={formData.confirmPassword} 
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Security Checklist</p>
              <div className="grid grid-cols-2 gap-2">
                <ValidationItem met={validation.length} text="8+ Characters" />
                <ValidationItem met={validation.upper} text="Uppercase" />
                <ValidationItem met={validation.lower} text="Lowercase" />
                <ValidationItem met={validation.number} text="Number" />
                <ValidationItem met={validation.special} text="Special Char" />
                <ValidationItem met={validation.match} text="Match" />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest py-5 rounded-2xl transition-all shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {loading ? 'Creating Account...' : 'Sign Up Now'} <ArrowRight size={20} />
            </button>
          </div>
        </form>

        <p className="text-center text-zinc-500 text-sm font-medium">
          Already have an account? <Link to="/login" className="text-emerald-400 font-bold hover:underline">Login</Link>
        </p>
      </motion.div>
    </div>
  );
}


