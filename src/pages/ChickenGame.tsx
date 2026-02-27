import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Clock, Users, Zap, AlertCircle } from 'lucide-react';

export default function ChickenGame() {
  const { token, user, refreshUser } = useAuth();
  const [status, setStatus] = useState<'waiting' | 'running' | 'finished'>('waiting');
  const [timeLeft, setTimeLeft] = useState(15);
  const [history, setHistory] = useState<any[]>([]);
  const [liveBets, setLiveBets] = useState<any[]>([]);
  const [betAmount, setBetAmount] = useState('100');
  const [selectedChicken, setSelectedChicken] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [winner, setWinner] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const requestRef = useRef<number>();
  const socketRef = useRef<Socket | null>(null);
  const gameDataRef = useRef({
    status: 'waiting',
    startTime: 0,
    duration: 10,
    winner: null as number | null,
    chickenSpeeds: [] as number[],
    chickenOffsets: [] as number[]
  });

  const CHICKENS = [
    { id: 1, name: 'Red Rooster', color: 0xff4444, odds: 2.5 },
    { id: 2, name: 'Blue Bird', color: 0x4444ff, odds: 3.0 },
    { id: 3, name: 'Green Clucker', color: 0x44ff44, odds: 4.0 },
    { id: 4, name: 'Yellow Pecker', color: 0xffff44, odds: 5.0 },
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    // Three.js Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

    const camera = new THREE.PerspectiveCamera(60, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Ground / Road
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4ade80 }); // Grass
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    const roadGeo = new THREE.PlaneGeometry(120, 12);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.49;
    road.receiveShadow = true;
    scene.add(road);

    // Finish Line
    const finishGeo = new THREE.PlaneGeometry(2, 12);
    const finishMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const finishLine = new THREE.Mesh(finishGeo, finishMat);
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(50, -0.48, 0);
    scene.add(finishLine);

    // Lane markers
    for (let i = 1; i < 4; i++) {
      const lineGeo = new THREE.PlaneGeometry(120, 0.1);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, -0.48, -6 + i * 3);
      scene.add(line);
    }

    // Create Chickens
    const chickenMeshes: THREE.Group[] = [];
    const createChicken = (colorHex: number, zPos: number) => {
      const group = new THREE.Group();
      
      // Body
      const bodyGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.8 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.6;
      body.castShadow = true;
      group.add(body);

      // Beak
      const beakGeo = new THREE.ConeGeometry(0.2, 0.5, 8);
      const beakMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
      const beak = new THREE.Mesh(beakGeo, beakMat);
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(0.6, 0.7, 0);
      beak.castShadow = true;
      group.add(beak);

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(0.4, 0.9, 0.25);
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(0.4, 0.9, -0.25);
      group.add(eyeR);
      group.add(eyeL);

      group.position.set(-50, 0, zPos);
      scene.add(group);
      return group;
    };

    CHICKENS.forEach((c, i) => {
      chickenMeshes.push(createChicken(c.color, -4.5 + i * 3));
    });

    camera.position.set(-60, 5, 15);
    camera.lookAt(-50, 0, 0);

    sceneRef.current = { scene, camera, renderer, chickens: chickenMeshes };

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      
      const { status, startTime, duration, winner, chickenSpeeds, chickenOffsets } = gameDataRef.current;
      
      if (status === 'running' && startTime > 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        let leadX = -50;

        chickenMeshes.forEach((mesh, i) => {
          const isWinner = winner === i + 1;
          // Calculate individual progress
          let p = progress;
          if (!isWinner) {
            // Losers lag behind slightly, using their assigned speed factor
            p = progress * chickenSpeeds[i];
          }
          
          // Add some wobble/bounce
          const bounce = Math.abs(Math.sin(elapsed * 10 + chickenOffsets[i])) * 0.5;
          const wobble = Math.sin(elapsed * 5 + chickenOffsets[i]) * 0.1;
          
          mesh.position.x = -50 + (100 * p);
          mesh.position.y = bounce;
          mesh.rotation.z = wobble;
          mesh.rotation.y = wobble * 0.5;

          if (mesh.position.x > leadX) leadX = mesh.position.x;
        });

        // Camera follows the leader
        camera.position.x = leadX - 10;
        camera.lookAt(leadX + 10, 0, 0);
      } else if (status === 'waiting') {
        // Reset positions
        chickenMeshes.forEach((mesh, i) => {
          mesh.position.x = -50;
          mesh.position.y = 0;
          mesh.rotation.set(0,0,0);
        });
        camera.position.set(-60, 5, 15);
        camera.lookAt(-50, 0, 0);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Socket Connection
    socketRef.current = io();
    
    socketRef.current.on('chicken:init', (state) => {
      setStatus(state.status);
      setTimeLeft(state.timeLeft);
      setHistory(state.history);
      setLiveBets(state.currentBets || []);
      gameDataRef.current.status = state.status;
    });

    socketRef.current.on('chicken:waiting', (data) => {
      setStatus('waiting');
      setTimeLeft(data.timeLeft);
      setWinner(null);
      setLiveBets([]);
      gameDataRef.current.status = 'waiting';
      gameDataRef.current.startTime = 0;
    });

    socketRef.current.on('chicken:update', (data) => {
      if (data.status === 'waiting') {
        setTimeLeft(data.timeLeft);
      }
    });

    socketRef.current.on('chicken:start', (data) => {
      setStatus('running');
      setMessage(null);
      
      // Setup race parameters
      gameDataRef.current.status = 'running';
      gameDataRef.current.startTime = Date.now();
      gameDataRef.current.duration = data.duration;
      gameDataRef.current.winner = data.winner;
      
      // Generate random speeds for losers (0.7 to 0.95 of winner speed)
      gameDataRef.current.chickenSpeeds = CHICKENS.map(() => 0.7 + Math.random() * 0.25);
      gameDataRef.current.chickenOffsets = CHICKENS.map(() => Math.random() * Math.PI * 2);
    });

    socketRef.current.on('chicken:result', (data) => {
      setStatus('finished');
      setWinner(data.result.winner);
      setHistory(data.history);
      gameDataRef.current.status = 'finished';
      
      // Check if user won
      if (selectedChicken === data.result.winner) {
        const chicken = CHICKENS.find(c => c.id === selectedChicken);
        if (chicken) {
          const winAmount = Number(betAmount) * chicken.odds;
          setMessage({ type: 'success', text: `You won ${winAmount.toFixed(2)} TK!` });
          refreshUser();
        }
      }
      setSelectedChicken(null);
    });

    socketRef.current.on('chicken:bet_update', (data) => {
      setLiveBets(data.bets);
    });

    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current!);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
      socketRef.current?.disconnect();
    };
  }, []);

  const handleBet = async () => {
    if (!token) return setMessage({ type: 'error', text: 'Please login to play' });
    if (status !== 'waiting') return setMessage({ type: 'error', text: 'Wait for next round' });
    if (!selectedChicken) return setMessage({ type: 'error', text: 'Select a chicken first' });
    
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
        setMessage({ type: 'success', text: 'Bet placed successfully!' });
        socketRef.current?.emit('chicken:bet', { amount, chickenId: selectedChicken });
        await refreshUser();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Bet failed' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Zap className="text-yellow-500 w-5 h-5" />
            </div>
            <span className="text-xs font-black text-yellow-500 uppercase tracking-[0.3em]">Live Racing</span>
          </div>
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">Chicken Road</h1>
          <p className="text-zinc-500 mt-2 font-medium">Bet on your favorite chicken and win big!</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {/* Status Overlay */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl">
                {status === 'waiting' && (
                  <div className="flex items-center gap-2">
                    <Clock className="text-yellow-500 animate-pulse" size={18} />
                    <span className="font-black text-white uppercase tracking-widest">Next Race: {timeLeft}s</span>
                  </div>
                )}
                {status === 'running' && (
                  <div className="flex items-center gap-2">
                    <Zap className="text-red-500 animate-pulse" size={18} />
                    <span className="font-black text-white uppercase tracking-widest text-red-400">Race in Progress!</span>
                  </div>
                )}
                {status === 'finished' && winner && (
                  <div className="flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={18} />
                    <span className="font-black text-white uppercase tracking-widest text-yellow-400">
                      {CHICKENS.find(c => c.id === winner)?.name} Wins!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 3D Canvas Container */}
            <div ref={containerRef} className="w-full h-[400px] md:h-[500px]" />
          </div>

          {/* Betting Controls */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CHICKENS.map((chicken) => (
                <button
                  key={chicken.id}
                  onClick={() => status === 'waiting' && setSelectedChicken(chicken.id)}
                  disabled={status !== 'waiting'}
                  className={`relative p-4 rounded-2xl border-2 transition-all overflow-hidden group ${
                    selectedChicken === chicken.id 
                      ? 'border-emerald-500 bg-emerald-500/10' 
                      : 'border-white/5 bg-black/40 hover:border-white/20'
                  } ${status !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-20" style={{ backgroundColor: `#${chicken.color.toString(16).padStart(6, '0')}` }}></div>
                  <p className="text-sm font-black text-white uppercase tracking-widest relative z-10">{chicken.name}</p>
                  <p className="text-2xl font-black text-emerald-400 mt-2 relative z-10">{chicken.odds.toFixed(1)}x</p>
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-2 flex items-center">
                <span className="pl-4 text-zinc-500 font-bold">TK</span>
                <input 
                  type="number" 
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-transparent text-white font-black text-xl px-4 focus:outline-none"
                  disabled={status !== 'waiting'}
                />
                <div className="flex gap-2 pr-2">
                  {[100, 500, 1000].map(amt => (
                    <button 
                      key={amt}
                      onClick={() => setBetAmount(amt.toString())}
                      disabled={status !== 'waiting'}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold text-zinc-300 transition-all"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleBet}
                disabled={status !== 'waiting' || !selectedChicken}
                className="md:w-48 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
              >
                Place Bet
              </button>
            </div>

            {message && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl flex items-center gap-3 font-bold ${
                  message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                <AlertCircle size={18} /> {message.text}
              </motion.div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* History */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Trophy className="text-yellow-500" size={16} /> Recent Winners
            </h3>
            <div className="space-y-2">
              <AnimatePresence>
                {history.map((h, i) => {
                  const chicken = CHICKENS.find(c => c.id === h.winner);
                  return (
                    <motion.div 
                      key={h.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `#${chicken?.color.toString(16).padStart(6, '0')}40` }}>
                          <Trophy size={14} style={{ color: `#${chicken?.color.toString(16).padStart(6, '0')}` }} />
                        </div>
                        <span className="text-sm font-bold text-white">{chicken?.name}</span>
                      </div>
                      <span className="text-xs font-black text-emerald-400">{chicken?.odds.toFixed(1)}x</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {history.length === 0 && <p className="text-center text-zinc-500 text-sm py-4">No races yet</p>}
            </div>
          </div>

          {/* Live Bets */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="text-blue-500" size={16} /> Live Bets
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {liveBets.map((bet, i) => {
                  const chicken = CHICKENS.find(c => c.id === bet.chickenId);
                  return (
                    <motion.div 
                      key={bet.id + i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{bet.user}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">{chicken?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-400">{bet.amount} TK</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {liveBets.length === 0 && <p className="text-center text-zinc-500 text-sm py-4">No bets placed yet</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
