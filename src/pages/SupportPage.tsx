import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, MessageSquare, Send, CheckCircle2, XCircle } from 'lucide-react';

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const response = await fetch('https://formspree.io/f/xaqdknje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">Support Center</h1>
        <p className="text-zinc-500 max-w-xl mx-auto">Have questions or need help? Send us a message and our team will get back to you as soon as possible.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Mail className="text-emerald-400" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold">Email Us</h3>
              <p className="text-zinc-500 text-sm">support@tsfbd24.com</p>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <MessageSquare className="text-emerald-400" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold">Live Chat</h3>
              <p className="text-zinc-500 text-sm">Available 24/7 for VIPs</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Your Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Subject</label>
              <input 
                type="text" 
                required
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                placeholder="How can we help?"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Message</label>
              <textarea 
                required
                rows={5}
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all resize-none"
                placeholder="Describe your issue in detail..."
              />
            </div>

            {status === 'success' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 text-emerald-400">
                <CheckCircle2 size={20} />
                <p className="text-sm font-bold">Message sent successfully! We'll get back to you soon.</p>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400">
                <XCircle size={20} />
                <p className="text-sm font-bold">Failed to send message. Please try again later.</p>
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest py-5 rounded-2xl transition-all shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === 'loading' ? 'Sending...' : 'Send Message'} <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
