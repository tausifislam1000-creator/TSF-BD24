import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, Calendar, Gamepad2, ShieldCheck, Zap, Lock, Eye, EyeOff, Copy, UserPlus, Medal } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export default function TournamentDetailsPage() {
  const { id } = useParams();
  const { token, user, refreshUser } = useAuth();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [players, setPlayers] = useState([{ name: '', id: '' }]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchTournament();
    
    // Setup socket for live room updates
    socketRef.current = io();
    socketRef.current.on('tournament:update', (data) => {
      if (data.id === id) {
        setTournament((prev: any) => ({
          ...prev,
          status: data.status,
          roomDetails: prev.isRegistered ? {
            room_id: data.room_id,
            room_password: data.room_password
          } : null
        }));
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [id, token]);

  useEffect(() => {
    if (tournament) {
      const count = tournament.mode === 'Solo' ? 1 : tournament.mode === 'Duo' ? 2 : 4;
      if (players.length !== count) {
        setPlayers(Array(count).fill({ name: '', id: '' }));
      }
    }
  }, [tournament?.mode]);

  const fetchTournament = async () => {
    try {
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      
      const res = await fetch(`/api/tournaments/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTournament(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return setMessage({ type: 'error', text: 'Please login to register' });
    
    // Validate all players
    if (players.some(p => !p.name || !p.id)) {
      return setMessage({ type: 'error', text: 'Please fill all player details' });
    }

    setRegistering(true);
    setMessage(null);

    try {
      const in_game_name = players.map(p => p.name).join(', ');
      const in_game_id = players.map(p => p.id).join(', ');

      const res = await fetch(`/api/tournaments/${id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ in_game_name, in_game_id })
      });

      // Mirror to Formspree
      try {
        fetch('https://formspree.io/f/xaqdknje', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            form_type: 'Tournament Registration',
            tournament_id: id,
            tournament_title: tournament?.title,
            user_email: user?.email,
            in_game_name,
            in_game_id,
            players: players,
            timestamp: new Date().toISOString()
          })
        });
      } catch (fsErr) {
        console.error('Formspree mirror failed', fsErr);
      }

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Registered successfully!' });
        await refreshUser();
        fetchTournament();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Registration failed' });
    } finally {
      setRegistering(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: show a small toast
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!tournament) {
    return <div className="text-center py-20 text-red-500 font-bold">Tournament not found</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-8">
      {/* Header Banner */}
      <div className="relative h-64 md:h-80 bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
        <img src={`https://picsum.photos/seed/${tournament.id}/1200/400`} alt={tournament.title} className="w-full h-full object-cover opacity-40" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        
        <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                tournament.status === 'live' ? 'bg-red-500 text-white animate-pulse' :
                tournament.status === 'room_ready' ? 'bg-emerald-500 text-black' :
                tournament.status === 'completed' ? 'bg-zinc-700 text-zinc-300' :
                'bg-blue-500 text-white'
              }`}>
                {tournament.status.replace('_', ' ')}
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                {tournament.game}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-none">{tournament.title}</h1>
          </div>
          
          <div className="flex items-center gap-4 bg-black/60 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Prize Pool</p>
              <p className="text-3xl font-black text-emerald-400">{tournament.prize_pool} TK</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column: Details & Room Info */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Room Details (Only if registered and ready/live) */}
          <AnimatePresence>
            {tournament.roomDetails && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden"
              >
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-3 bg-emerald-500/20 rounded-2xl">
                    <Lock className="text-emerald-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Room Details</h3>
                    <p className="text-emerald-400 text-sm font-bold">Join the custom room now!</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 relative z-10">
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Room ID</p>
                      <p className="text-xl font-black text-white font-mono">{tournament.roomDetails.room_id}</p>
                    </div>
                    <button onClick={() => copyToClipboard(tournament.roomDetails.room_id)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-all">
                      <Copy size={18} />
                    </button>
                  </div>
                  
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Password</p>
                      <p className="text-xl font-black text-white font-mono">
                        {showPassword ? tournament.roomDetails.room_password : '••••••••'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowPassword(!showPassword)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-all">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button onClick={() => copyToClipboard(tournament.roomDetails.room_password)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-all">
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tournament Info */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
              <Gamepad2 className="text-emerald-500" /> Match Information
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Map</p>
                <p className="text-lg font-black text-white">{tournament.map}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mode</p>
                <p className="text-lg font-black text-white">{tournament.mode}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Entry Fee</p>
                <p className="text-lg font-black text-white">{tournament.entry_fee} TK</p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Slots</p>
                <p className="text-lg font-black text-white">{tournament.participants.length}/{tournament.total_slots}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
              <Calendar className="text-blue-400" size={24} />
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Schedule</p>
                <p className="text-sm font-black text-white">{new Date(tournament.start_time).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Participants / Rankings */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                <Users className="text-emerald-500" /> {tournament.status === 'completed' ? 'Final Rankings' : 'Participants'}
              </h3>
              <span className="text-xs font-bold text-zinc-500 bg-black/40 px-3 py-1 rounded-lg">
                {tournament.participants.length} Registered
              </span>
            </div>

            <div className="space-y-3">
              {tournament.participants.length === 0 ? (
                <p className="text-center py-8 text-zinc-500 font-bold uppercase tracking-widest">No participants yet</p>
              ) : (
                tournament.participants
                  .sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999))
                  .map((p: any, i: number) => (
                  <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    p.rank === 1 ? 'bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.05)]' :
                    p.rank === 2 ? 'bg-zinc-300/10 border-zinc-300/20' :
                    p.rank === 3 ? 'bg-amber-600/10 border-amber-600/20' :
                    'bg-black/40 border-white/5'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm relative ${
                        tournament.status === 'completed' 
                          ? p.rank === 1 ? 'bg-yellow-500 text-black' 
                          : p.rank === 2 ? 'bg-zinc-300 text-black'
                          : p.rank === 3 ? 'bg-amber-600 text-white'
                          : 'bg-zinc-800 text-zinc-500'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {tournament.status === 'completed' && p.rank <= 3 && (
                          <Medal size={12} className="absolute -top-1 -right-1" />
                        )}
                        {tournament.status === 'completed' ? p.rank || '-' : i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{p.in_game_name}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">UID: {p.in_game_id}</p>
                      </div>
                    </div>
                    {tournament.status === 'completed' && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end text-zinc-400 mb-1">
                          <Zap size={12} className="text-emerald-500" />
                          <span className="text-xs font-bold">{p.kills} Kills</span>
                        </div>
                        {p.prize_won > 0 && (
                          <div className="bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            <p className="text-[10px] font-black text-emerald-400">+{p.prize_won} TK</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Registration */}
        <div className="space-y-6">
          <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 md:p-8 sticky top-24 shadow-2xl">
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-6">Registration</h3>
            
            {tournament.status !== 'upcoming' ? (
              <div className="bg-black/40 p-6 rounded-2xl border border-white/5 text-center space-y-2">
                <ShieldCheck className="text-zinc-500 w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-black text-white uppercase tracking-widest">Registration Closed</p>
                <p className="text-xs text-zinc-500">This tournament is no longer accepting new participants.</p>
              </div>
            ) : tournament.isRegistered ? (
              <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 text-center space-y-2">
                <ShieldCheck className="text-emerald-500 w-12 h-12 mx-auto mb-4" />
                <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">You are registered!</p>
                <p className="text-xs text-emerald-500/70">Wait for the room details to be revealed before the match starts.</p>
              </div>
            ) : tournament.participants.length >= tournament.total_slots ? (
              <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 text-center space-y-2">
                <Users className="text-red-500 w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-black text-red-400 uppercase tracking-widest">Tournament Full</p>
                <p className="text-xs text-red-500/70">All slots have been filled.</p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-4">
                  {players.map((player, idx) => (
                    <div key={idx} className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <UserPlus size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Player {idx + 1}</span>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">In-Game Name</label>
                        <input 
                          type="text" 
                          value={player.name}
                          onChange={e => {
                            const newPlayers = [...players];
                            newPlayers[idx] = { ...newPlayers[idx], name: e.target.value };
                            setPlayers(newPlayers);
                          }}
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all"
                          placeholder="e.g. TSF_GAMER"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">In-Game UID</label>
                        <input 
                          type="text" 
                          value={player.id}
                          onChange={e => {
                            const newPlayers = [...players];
                            newPlayers[idx] = { ...newPlayers[idx], id: e.target.value };
                            setPlayers(newPlayers);
                          }}
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all"
                          placeholder="e.g. 123456789"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {message && (
                  <div className={`p-3 rounded-xl text-xs font-bold text-center border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {message.text}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={registering}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {registering ? 'Processing...' : `Pay ${tournament.entry_fee} TK & Join`}
                </button>
                <p className="text-[10px] text-center text-zinc-500 font-bold uppercase tracking-widest">
                  Entry fee will be deducted from your wallet
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
