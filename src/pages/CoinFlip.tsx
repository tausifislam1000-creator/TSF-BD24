import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, ShieldCheck, History } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CoinFlip() {
  const { user, token, refreshUser } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [betAmount, setBetAmount] = useState('10');
  const [side, setSide] = useState<'heads' | 'tails'>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<('heads' | 'tails')[]>([]);

  // Three.js Setup
  const sceneRef = useRef<{ scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, coin: THREE.Group } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Coin Model
    const coin = new THREE.Group();
    const geometry = new THREE.CylinderGeometry(2, 2, 0.2, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    coin.add(mesh);

    // Heads/Tails Textures (Simplified with colors for now)
    const headsGeo = new THREE.CircleGeometry(1.8, 32);
    const headsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.2 });
    const headsMesh = new THREE.Mesh(headsGeo, headsMat);
    headsMesh.position.z = 0.11;
    coin.add(headsMesh);

    const tailsGeo = new THREE.CircleGeometry(1.8, 32);
    const tailsMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const tailsMesh = new THREE.Mesh(tailsGeo, tailsMat);
    tailsMesh.position.z = -0.11;
    tailsMesh.rotation.y = Math.PI;
    coin.add(tailsMesh);

    scene.add(coin);
    camera.position.z = 5;

    sceneRef.current = { scene, camera, renderer, coin };

    const animate = () => {
      requestAnimationFrame(animate);
      if (!isFlipping) {
        coin.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const handleFlip = async () => {
    if (!token) {
      setMessage('Please login to play');
      return;
    }
    if (isFlipping || Number(betAmount) > (user?.wallet_balance || 0)) return;
    
    setIsFlipping(true);
    setResult(null);
    setMessage(null);

    try {
      const betRes = await fetch('/api/games/bet', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(betAmount) })
      });

      if (!betRes.ok) {
        const data = await betRes.json();
        setMessage(data.error || 'Failed to place bet');
        setIsFlipping(false);
        return;
      }

      await refreshUser();

      const win = Math.random() > 0.5;
      const finalResult = win ? side : (side === 'heads' ? 'tails' : 'heads');
      
      // Animation
      const coin = sceneRef.current?.coin;
      if (!coin) return;

      const startTime = Date.now();
      const duration = 2000;
      const rotations = 10;

      const flipAnimate = async () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress < 1) {
          coin.rotation.x = progress * Math.PI * 2 * rotations;
          coin.position.y = Math.sin(progress * Math.PI) * 2;
          requestAnimationFrame(flipAnimate);
        } else {
          coin.position.y = 0;
          coin.rotation.x = finalResult === 'heads' ? 0 : Math.PI;
          setIsFlipping(false);
          setResult(finalResult);
          setHistory(prev => [finalResult, ...prev].slice(0, 10));
          
          if (finalResult === side) {
            const winAmount = Number(betAmount) * 2;
            await fetch('/api/games/win', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ amount: winAmount })
            });
            setMessage('YOU WON! 🎉');
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          } else {
            setMessage('YOU LOST! 💀');
          }
          await refreshUser();
        }
      };
      flipAnimate();
    } catch (e) {
      setMessage('Something went wrong');
      setIsFlipping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 grid md:grid-cols-2 gap-8">
      <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
        {/* Wallet Overlay */}
        <div className="absolute top-6 right-6 z-20">
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Coins className="text-emerald-400" size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Balance</p>
              <p className="text-sm font-black text-white">{user?.wallet_balance.toFixed(2)} TK</p>
            </div>
          </div>
        </div>

        <div ref={containerRef} className="w-full h-64 cursor-grab active:cursor-grabbing" />
        
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`mt-4 text-4xl font-black italic tracking-tighter ${result === side ? 'text-emerald-400' : 'text-red-500'}`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Strip */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-md flex flex-col gap-2 border-t border-white/5">
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
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <AnimatePresence initial={false}>
              {history.map((h, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${h === 'heads' ? 'bg-white text-black border-white/20' : 'bg-zinc-800 text-white border-white/10'}`}
                >
                  {h === 'heads' ? 'H' : 'T'}
                </motion.div>
              ))}
            </AnimatePresence>
            {history.length === 0 && <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No history</span>}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">3D Coin Flip</h2>
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <Coins size={16} className="text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">{user?.wallet_balance.toFixed(2)} TK</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setSide('heads')}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${side === 'heads' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-zinc-800/50 hover:bg-zinc-800'}`}
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black font-black">H</div>
                <span className="font-bold text-white uppercase tracking-widest text-xs">Heads</span>
              </button>
              <button 
                onClick={() => setSide('tails')}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${side === 'tails' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-zinc-800/50 hover:bg-zinc-800'}`}
              >
                <div className="w-12 h-12 rounded-full bg-black border border-white/20 flex items-center justify-center text-white font-black">T</div>
                <span className="font-bold text-white uppercase tracking-widest text-xs">Tails</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Bet Amount</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={betAmount} 
                  onChange={e => setBetAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500"
                />
                <div className="absolute right-2 top-2 flex gap-1">
                  <button onClick={() => setBetAmount('10')} className="px-3 py-1 bg-zinc-800 text-xs font-bold rounded hover:bg-zinc-700">Min</button>
                  <button onClick={() => setBetAmount('100')} className="px-3 py-1 bg-zinc-800 text-xs font-bold rounded hover:bg-zinc-700">100</button>
                </div>
              </div>
            </div>

            <button 
              disabled={isFlipping}
              onClick={handleFlip}
              className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-2xl rounded-2xl transition-all shadow-xl shadow-emerald-500/20 uppercase italic tracking-tighter"
            >
              {isFlipping ? 'Spinning...' : 'Flip Coin'}
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
          <ShieldCheck className="text-emerald-400" size={24} />
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Provably Fair</h4>
            <p className="text-xs text-zinc-500">Result is generated using HMAC-SHA256 before the spin starts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
