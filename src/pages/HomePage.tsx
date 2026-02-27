import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { TrendingUp, Coins, LayoutGrid, Zap, Trophy, ShieldCheck } from 'lucide-react';

const GAMES = [
  { id: 'wingo', name: 'Wingo', icon: Zap, color: 'text-pink-400', bg: 'bg-pink-500/10', path: '/games/wingo', desc: 'Color trading game. Predict the number and color!' },
  { id: 'crash', name: 'Crash', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', path: '/games/crash', desc: 'Multiplier keeps rising. Cash out before it crashes!' },
  { id: 'coinflip', name: '3D Coin Flip', icon: Coins, color: 'text-yellow-400', bg: 'bg-yellow-500/10', path: '/games/coinflip', desc: 'Heads or Tails? 3D physics-based coin flip.' },
  { id: 'mines', name: 'Mines', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10', path: '/games/mines', desc: 'Find the diamonds, avoid the mines.' },
];

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 space-y-12">
      <header className="text-center space-y-6 py-12">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest"
        >
          <ShieldCheck size={14} /> Provably Fair Gaming Platform
        </motion.div>
        <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-none">
          Win Big with <span className="text-emerald-500">TK Coins</span>
        </h1>
        <p className="text-zinc-500 max-w-2xl mx-auto text-lg">
          The ultimate real money gaming platform for Bangladesh. 
          <span className="block mt-2 text-white font-bold bg-emerald-500/10 border border-emerald-500/20 py-2 px-4 rounded-xl inline-block">
            Fast deposits, instant withdrawals, and 100% fair games.
          </span>
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link to="/signup" className="bg-emerald-500 hover:bg-emerald-600 text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20">Start Winning</Link>
          <Link to="/wallet" className="bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all border border-white/10">Deposit TK</Link>
        </div>
      </header>

      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Active Tournaments</h2>
          <div className="h-px flex-1 mx-8 bg-white/5 hidden md:block"></div>
          <Link to="/tournaments" className="text-sm font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-all">View All</Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center group hover:bg-zinc-900 transition-all">
            <div className="w-full md:w-48 h-48 bg-emerald-500/10 rounded-2xl overflow-hidden relative">
              <img src="https://picsum.photos/seed/ff1/400/400" alt="Free Fire" className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:scale-110 transition-all" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-4 left-4">
                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-black px-2 py-1 rounded">Live</span>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">FF Solo Battle #402</h3>
                <p className="text-zinc-500 text-sm">Bermuda Map • Solo • Classic</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Prize Pool</p>
                  <p className="text-lg font-black text-emerald-400">500 TK</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Entry Fee</p>
                  <p className="text-lg font-black text-white">20 TK</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Slots</p>
                  <p className="text-lg font-black text-white">12/48</p>
                </div>
              </div>
              <Link to="/tournaments" className="block text-center w-full py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-all">Join Tournament</Link>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center group hover:bg-zinc-900 transition-all">
            <div className="w-full md:w-48 h-48 bg-emerald-500/10 rounded-2xl overflow-hidden relative">
              <img src="https://picsum.photos/seed/ff2/400/400" alt="Free Fire" className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:scale-110 transition-all" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-4 left-4">
                <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 px-2 py-1 rounded">Starts in 2h</span>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">FF Duo Clash #109</h3>
                <p className="text-zinc-500 text-sm">Purgatory Map • Duo • Classic</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Prize Pool</p>
                  <p className="text-lg font-black text-emerald-400">1200 TK</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Entry Fee</p>
                  <p className="text-lg font-black text-white">50 TK</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Slots</p>
                  <p className="text-lg font-black text-white">4/24</p>
                </div>
              </div>
              <Link to="/tournaments" className="block text-center w-full py-3 bg-zinc-800 text-white font-black uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-all">View Details</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Popular Games</h2>
          <div className="h-px flex-1 mx-8 bg-white/5 hidden md:block"></div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
            <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link 
                to={game.path}
                className="group relative block p-8 rounded-3xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-900 transition-all overflow-hidden"
              >
                <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${game.bg}`}></div>
                
                <div className="relative z-10 space-y-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 ${game.bg} ${game.color}`}>
                    <game.icon size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{game.name}</h3>
                    </div>
                    <p className="text-zinc-500 text-sm mt-1">{game.desc}</p>
                  </div>
                </div>
                
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Zap className="text-emerald-500" size={20} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="py-12 border-t border-white/5 text-center space-y-4">
        <p className="text-zinc-600 text-xs uppercase font-bold tracking-[0.3em]">
          This website is real money gambling is involved. So, Be careful and use your money on your own way .
        </p>
        <div className="flex justify-center gap-8 text-zinc-500 text-xs font-bold uppercase tracking-widest">
          <a href="#" className="hover:text-white">Terms of Service</a>
          <a href="#" className="hover:text-white">Privacy Policy</a>
          <a href="#" className="hover:text-white">Fairness</a>
          <Link to="/support" className="hover:text-white">Support</Link>
        </div>
      </footer>
    </div>
  );
}
