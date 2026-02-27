import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, Users, Calendar, Gamepad2, ChevronRight, Zap } from 'lucide-react';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await fetch('/api/tournaments');
        const data = await res.json();
        setTournaments(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 rounded-2xl">
            <Trophy className="text-emerald-500 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Tournaments</h1>
            <p className="text-zinc-500 font-medium">Compete in Free Fire and win big prizes</p>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 flex flex-col gap-6 hover:border-white/20 transition-all group"
          >
            <div className="relative h-40 bg-zinc-800 rounded-2xl overflow-hidden">
              <img src={`https://picsum.photos/seed/${t.id}/400/200`} alt={t.title} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div>
              <div className="absolute top-4 right-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                  t.status === 'live' ? 'bg-red-500 text-white animate-pulse' :
                  t.status === 'room_ready' ? 'bg-emerald-500 text-black' :
                  t.status === 'completed' ? 'bg-zinc-700 text-zinc-300' :
                  'bg-blue-500 text-white'
                }`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter truncate">{t.title}</h3>
                <p className="text-emerald-400 text-sm font-bold">{t.game} • {t.mode}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Prize Pool</p>
                <p className="text-lg font-black text-emerald-400">{t.prize_pool} TK</p>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Entry Fee</p>
                <p className="text-lg font-black text-white">{t.entry_fee} TK</p>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Map</p>
                <p className="text-sm font-bold text-white">{t.map}</p>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Slots</p>
                <p className="text-sm font-bold text-white">{t.registered}/{t.total_slots}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 bg-black/20 p-3 rounded-xl">
              <Calendar size={14} className="text-blue-400" />
              {new Date(t.start_time).toLocaleString()}
            </div>

            <Link 
              to={`/tournaments/${t.id}`}
              className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
            >
              View Details <ChevronRight size={18} />
            </Link>
          </motion.div>
        ))}

        {tournaments.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-500 font-bold uppercase tracking-widest">
            No tournaments available at the moment.
          </div>
        )}
      </div>
    </div>
  );
}
