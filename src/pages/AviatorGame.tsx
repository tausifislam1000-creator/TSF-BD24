import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plane, TrendingUp, History, Wallet, ShieldCheck, Zap, Info, Volume2, VolumeX, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { io, Socket } from 'socket.io-client';

export default function AviatorGame() {
  const { user, token, refreshUser } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [status, setStatus] = useState<'waiting' | 'running' | 'crashed'>('waiting');
  const [betAmount, setBetAmount] = useState('10');
  const [isBetting, setIsBetting] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(5);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [liveBets, setLiveBets] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Three.js Refs
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    plane: THREE.Group;
    trail: THREE.Points;
    trailPositions: Float32Array;
  } | null>(null);

  const requestRef = useRef<number>(0);
  const statusRef = useRef<'waiting' | 'running' | 'crashed'>('waiting');

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Plane Model
    const planeGroup = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.1, 1.5, 8);
    bodyGeo.rotateZ(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.8, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    planeGroup.add(body);

    const wingGeo = new THREE.BoxGeometry(0.5, 0.05, 2);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    planeGroup.add(wings);

    const tailGeo = new THREE.BoxGeometry(0.3, 0.3, 0.05);
    const tail = new THREE.Mesh(tailGeo, wingMat);
    tail.position.set(-0.6, 0.2, 0);
    planeGroup.add(tail);

    scene.add(planeGroup);
    camera.position.set(0, 0, 5);

    // Trail
    const trailCount = 100;
    const trailPositions = new Float32Array(trailCount * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({ color: 0xff4444, size: 0.05, transparent: true, opacity: 0.6 });
    const trail = new THREE.Points(trailGeo, trailMat);
    scene.add(trail);

    sceneRef.current = { scene, camera, renderer, plane: planeGroup, trail, trailPositions };

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      
      if (sceneRef.current && statusRef.current === 'running') {
        const plane = sceneRef.current.plane;
        const elapsed = (Date.now() % 10000) / 1000; // Just for some idle movement
        plane.position.x = -2 + Math.sin(elapsed) * 0.5;
        plane.position.y = -1 + Math.cos(elapsed * 0.5) * 0.3;
        plane.rotation.z = Math.sin(elapsed) * 0.1 + 0.2;

        // Update Trail
        const positions = sceneRef.current.trailPositions;
        for (let i = positions.length - 3; i >= 3; i -= 3) {
          positions[i] = positions[i - 3];
          positions[i + 1] = positions[i - 2];
          positions[i + 2] = positions[i - 1];
        }
        positions[0] = plane.position.x;
        positions[1] = plane.position.y;
        positions[2] = plane.position.z;
        sceneRef.current.trail.geometry.attributes.position.needsUpdate = true;
      } else if (sceneRef.current && statusRef.current === 'crashed') {
        const plane = sceneRef.current.plane;
        plane.position.x += 0.1;
        plane.position.y += 0.1;
        plane.rotation.z -= 0.1;
      } else if (sceneRef.current && statusRef.current === 'waiting') {
        const plane = sceneRef.current.plane;
        plane.position.set(-4, -2, 0);
        plane.rotation.set(0, 0, 0.5);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Socket Connection
    socketRef.current = io();
    
    socketRef.current.on('aviator:init', (state) => {
      setStatus(state.status);
      statusRef.current = state.status;
      setMultiplier(state.multiplier);
      setHistory(state.history);
      setLiveBets(state.currentBets || []);
    });

    socketRef.current.on('aviator:waiting', (data) => {
      setStatus('waiting');
      statusRef.current = 'waiting';
      setTimeLeft(data.timeLeft / 1000);
      setMultiplier(1.0);
      setIsBetting(false);
      setHasCashedOut(false);
      setLiveBets([]); // Clear bets for new round
    });

    socketRef.current.on('aviator:start', () => {
      setStatus('running');
      statusRef.current = 'running';
      setMessage(null);
    });

    socketRef.current.on('aviator:update', (data) => {
      setMultiplier(data.multiplier);
      if (data.status === 'crashed') {
        setStatus('crashed');
        statusRef.current = 'crashed';
        setHistory(data.history);
      }
    });

    socketRef.current.on('aviator:bet_update', (data) => {
      setLiveBets(data.bets);
    });

    return () => {
      cancelAnimationFrame(requestRef.current);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
      socketRef.current?.disconnect();
    };
  }, []);

  const handleBet = async () => {
    if (!token) return setMessage({ type: 'error', text: 'Please login to play' });
    if (status !== 'waiting' || isBetting) return;
    const amount = Number(betAmount);
    if (amount < 10) return setMessage({ type: 'error', text: 'Minimum bet is 10 TK' });
    if (amount > (user?.wallet_balance || 0)) return setMessage({ type: 'error', text: 'Insufficient balance' });

    try {
      const res = await fetch('/api/games/bet', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        setIsBetting(true);
        await refreshUser();
        setMessage({ type: 'success', text: 'Bet placed!' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to place bet' });
    }
  };

  const handleCashout = async () => {
    if (status !== 'running' || !isBetting || hasCashedOut) return;
    setHasCashedOut(true);
    const winAmount = Number(betAmount) * multiplier;
    
    try {
      await fetch('/api/games/win', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: winAmount })
      });
      await refreshUser();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setMessage({ type: 'success', text: `Cashed out at ${multiplier.toFixed(2)}x! Won ${winAmount.toFixed(2)} TK` });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-900/80 border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/20 rounded-2xl shadow-lg shadow-red-500/10">
            <Plane className="text-red-500 w-8 h-8 -rotate-45" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Aviator 3D</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Virtual TK Gaming</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all">
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-2xl border border-white/5 shadow-inner">
            <Wallet className="text-emerald-400" size={20} />
            <span className="text-2xl font-black text-white">{user?.wallet_balance.toFixed(2)} <span className="text-emerald-400 text-sm">TK</span></span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Bet Amount</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={betAmount} 
                    onChange={e => setBetAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-black text-xl focus:outline-none focus:border-red-500 transition-all"
                  />
                  <div className="absolute right-2 top-2 flex gap-1">
                    <button onClick={() => setBetAmount('10')} className="px-3 py-1 bg-zinc-800 text-[10px] font-bold rounded-lg hover:bg-zinc-700">MIN</button>
                    <button onClick={() => setBetAmount('100')} className="px-3 py-1 bg-zinc-800 text-[10px] font-bold rounded-lg hover:bg-zinc-700">100</button>
                  </div>
                </div>
              </div>

              {status === 'running' && isBetting && !hasCashedOut ? (
                <button 
                  onClick={handleCashout}
                  className="w-full py-6 bg-orange-500 hover:bg-orange-600 text-white font-black text-2xl rounded-2xl transition-all shadow-xl shadow-orange-500/20 uppercase italic tracking-tighter"
                >
                  CASHOUT
                  <p className="text-sm font-bold opacity-80">{(Number(betAmount) * multiplier).toFixed(2)} TK</p>
                </button>
              ) : (
                <button 
                  disabled={status !== 'waiting' || isBetting}
                  onClick={handleBet}
                  className="w-full py-6 bg-red-500 hover:bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-2xl rounded-2xl transition-all shadow-xl shadow-red-500/20 uppercase italic tracking-tighter"
                >
                  {isBetting ? 'BET PLACED' : 'PLACE BET'}
                </button>
              )}
            </div>

            {message && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`p-4 rounded-2xl border text-center text-sm font-bold ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {message.text}
              </motion.div>
            )}
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <ShieldCheck className="text-red-500" size={20} />
            <div className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
              Provably Fair System
              <p className="text-red-500/60">Verified SHA-256</p>
            </div>
          </div>
        </div>

        {/* Right: Game Display */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-zinc-900/80 border border-white/10 rounded-[2.5rem] h-[500px] relative overflow-hidden shadow-2xl">
            {/* 3D Container */}
            <div ref={containerRef} className="absolute inset-0 z-0" />
            
            {/* UI Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {status === 'waiting' ? (
                  <motion.div 
                    key="waiting"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    className="text-center"
                  >
                    <p className="text-zinc-500 font-black uppercase tracking-[0.4em] mb-4">Waiting for Takeoff</p>
                    <h2 className="text-9xl font-black text-white italic tracking-tighter tabular-nums">{timeLeft.toFixed(1)}s</h2>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="running"
                    className="text-center"
                  >
                    <h2 className={`text-[12rem] font-black italic leading-none tracking-tighter transition-all duration-300 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] ${status === 'crashed' ? 'text-red-500 scale-110' : 'text-white'}`}>
                      {multiplier.toFixed(2)}x
                    </h2>
                    {status === 'crashed' && (
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="mt-4"
                      >
                        <p className="text-4xl font-black text-red-500 uppercase italic tracking-widest">FLEW AWAY!</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* History Strip */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex flex-col gap-2 z-20">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <History className="text-zinc-500" size={14} />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Latest Results</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                <AnimatePresence initial={false}>
                  {history.map((h, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      className={`px-4 py-1.5 rounded-full text-xs font-black italic border transition-all flex-shrink-0 ${
                        h >= 10 ? 'bg-pink-500/20 text-pink-400 border-pink-500/40 shadow-[0_0_10px_rgba(236,72,153,0.2)]' : 
                        h >= 2 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 
                        'bg-red-500/20 text-red-400 border-red-500/40'
                      }`}
                    >
                      {h.toFixed(2)}x
                    </motion.div>
                  ))}
                </AnimatePresence>
                {history.length === 0 && <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-2">Waiting for results...</span>}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="text-zinc-400" size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Live Bets</h3>
              </div>
              <div className="space-y-2">
                {liveBets.map((bet, i) => (
                  <div key={bet.id || i} className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                    <span className="text-sm text-zinc-400 font-bold">{bet.user}</span>
                    <span className="text-sm font-black text-white">{bet.amount.toFixed(2)} TK</span>
                    <span className={`text-xs font-black italic ${bet.status === 'cashed' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {bet.status === 'cashed' ? `${bet.multiplier.toFixed(2)}x` : 'Waiting...'}
                    </span>
                  </div>
                ))}
                {liveBets.length === 0 && (
                  <p className="text-center py-8 text-zinc-700 italic text-sm font-medium">No live bets yet</p>
                )}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="text-zinc-400" size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest text-white italic">My History</h3>
              </div>
              <p className="text-center py-12 text-zinc-700 italic text-sm font-medium">No bets placed in this session</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

