'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles, AlertTriangle } from 'lucide-react';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
}

interface PopEffect {
  id: number;
  x: number;
  y: number;
}

// Updated bubble colors for better contrast on dark theme
const bubbleColors = [
  'rgba(0, 221, 255, 0.75)',   // Bright Cyan
  'rgba(173, 54, 255, 0.75)',  // Bright Purple
  'rgba(255, 20, 147, 0.75)',  // DeepPink
  'rgba(50, 205, 50, 0.75)',   // LimeGreen
  'rgba(255, 105, 180, 0.75)', // HotPink
  'rgba(0, 255, 127, 0.75)',   // SpringGreen
  'rgba(255, 165, 0, 0.75)',   // Orange
  'rgba(220, 220, 220, 0.7)'   // Light Grey/Whiteish for pop
];

// --- Game Mechanics Constants ---
const INITIAL_SPAWN_INTERVAL = 1200; 
const MIN_SPAWN_INTERVAL = 250;    
const SPAWN_INTERVAL_DECREMENT = 75; 

const INITIAL_BASE_SPEED = 0.7;
const MAX_BASE_SPEED = 2.8;
const SPEED_INCREMENT = 0.15;

const INITIAL_RANDOM_SPEED_ADD = 0.5; 

const DIFFICULTY_RAMP_INTERVAL = 5000; 
const SPIKED_BARRIER_HEIGHT = 20; 
const SPIKE_SVG_WIDTH = 25; // Width of a single spike SVG

const getRandomColor = () => bubbleColors[Math.floor(Math.random() * bubbleColors.length)];

export function BubblePopGame() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popEffects, setPopEffects] = useState<PopEffect[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [numSpikes, setNumSpikes] = useState(0);
  const [isPausedByVisibility, setIsPausedByVisibility] = useState(false);
  const tabHiddenTime = useRef<number | null>(null);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const nextBubbleId = useRef(0);
  const nextPopEffectId = useRef(0);

  const gameTimeMs = useRef(0);
  const currentSpawnInterval = useRef(INITIAL_SPAWN_INTERVAL);
  const currentBaseSpeed = useRef(INITIAL_BASE_SPEED);
  const lastDifficultyRampTime = useRef(0);

  const animationFrameId = useRef<number>();
  const bubbleCreationTimeoutId = useRef<NodeJS.Timeout>();
  const gameLogicIntervalId = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedHighScore = localStorage.getItem('bubblePopHighScore');
        if (storedHighScore) {
            setHighScore(Number.parseInt(storedHighScore, 10));
        }
    }
    // Calculate numSpikes on mount and when gameAreaRef is available
    if (gameAreaRef.current) {
        setNumSpikes(Math.ceil(gameAreaRef.current.offsetWidth / SPIKE_SVG_WIDTH));
    }
  }, []);

  // Update numSpikes if window resizes (optional, for responsiveness)
  useEffect(() => {
    const handleResize = () => {
      if (gameAreaRef.current) {
        setNumSpikes(Math.ceil(gameAreaRef.current.offsetWidth / SPIKE_SVG_WIDTH));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateHighScore = (currentScore: number) => {
    if (currentScore > highScore) {
        setHighScore(currentScore);
        if (typeof window !== 'undefined') {
            localStorage.setItem('bubblePopHighScore', currentScore.toString());
        }
    }
  };

  const scheduleNextBubble = useCallback(() => {
    if (!gameActive || !gameAreaRef.current || isPausedByVisibility) return;
    if (bubbleCreationTimeoutId.current) clearTimeout(bubbleCreationTimeoutId.current);
    
    bubbleCreationTimeoutId.current = setTimeout(() => {
      const gameAreaWidth = gameAreaRef.current!.offsetWidth;
      // Increased bubble size: 25px to 55px
      const size = Math.random() * 30 + 30; 
      setBubbles((prevBubbles) => [
        ...prevBubbles,
        {
          id: nextBubbleId.current++,
          x: Math.random() * (gameAreaWidth - size),
          y: gameAreaRef.current!.offsetHeight, 
          size,
          color: getRandomColor(),
          speed: (Math.random() * INITIAL_RANDOM_SPEED_ADD) + currentBaseSpeed.current,
        },
      ]);
      scheduleNextBubble(); 
    }, currentSpawnInterval.current);
  }, [gameActive, isPausedByVisibility]);

  const popBubble = (id: number, x: number, y: number, size: number) => {
    if (!gameActive) return;
    setBubbles((prevBubbles) => prevBubbles.filter((bubble) => bubble.id !== id));
    setScore((s) => s + 10);
    const newPopEffectId = nextPopEffectId.current++;
    setPopEffects(prev => [...prev, { id: newPopEffectId, x: x + size / 2, y: y + size / 2}]);
    setTimeout(() => {
        setPopEffects(prev => prev.filter(effect => effect.id !== newPopEffectId));
    }, 300);
  };

  useEffect(() => {
    if (!gameActive || isPausedByVisibility) {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        return;
    }

    const gameLoop = () => {
      setBubbles((prevBubbles) =>
        prevBubbles
          .map((bubble) => {
            const newY = bubble.y - bubble.speed;
            if (newY < SPIKED_BARRIER_HEIGHT + bubble.size / 2) { 
              setGameActive(false);
              setGameOver(true);
              updateHighScore(score);
              if (typeof navigator.vibrate === 'function') navigator.vibrate(200);
              return null; 
            }
            return { ...bubble, y: newY };
          })
          .filter(bubble => bubble !== null) as Bubble[]
      );
      if (gameActive && !isPausedByVisibility) {
        animationFrameId.current = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameId.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameActive, score, isPausedByVisibility]);

  useEffect(() => {
    if (gameActive && !isPausedByVisibility) {
      if (tabHiddenTime.current !== null) {
        const pauseDuration = Date.now() - tabHiddenTime.current;
        lastDifficultyRampTime.current += pauseDuration;
        tabHiddenTime.current = null;
      }
      
      if (!isPausedByVisibility || lastDifficultyRampTime.current === 0) {
        lastDifficultyRampTime.current = Date.now();
        gameTimeMs.current = 0;
      }
      scheduleNextBubble();

      gameLogicIntervalId.current = setInterval(() => {
        gameTimeMs.current += 100; 
        setScore(s => s + 1); 

        const now = Date.now();
        if (now - lastDifficultyRampTime.current >= DIFFICULTY_RAMP_INTERVAL) {
          currentBaseSpeed.current = Math.min(MAX_BASE_SPEED, currentBaseSpeed.current + SPEED_INCREMENT);
          currentSpawnInterval.current = Math.max(MIN_SPAWN_INTERVAL, currentSpawnInterval.current - SPAWN_INTERVAL_DECREMENT);
          lastDifficultyRampTime.current = now;
        }
      }, 100);
    } else {
      if (gameLogicIntervalId.current) clearInterval(gameLogicIntervalId.current);
      if (bubbleCreationTimeoutId.current) clearTimeout(bubbleCreationTimeoutId.current);
    }
    return () => {
      if (gameLogicIntervalId.current) clearInterval(gameLogicIntervalId.current);
      if (bubbleCreationTimeoutId.current) clearTimeout(bubbleCreationTimeoutId.current);
    };
  }, [gameActive, scheduleNextBubble, isPausedByVisibility]);

  // Effect for Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (gameActive && !gameOver) {
          setIsPausedByVisibility(true);
          tabHiddenTime.current = Date.now();
        }
      } else {
        if (isPausedByVisibility) {
          setIsPausedByVisibility(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameActive, gameOver, isPausedByVisibility]);

  const startGame = () => {
    setBubbles([]); 
    setPopEffects([]);
    setScore(0);
    setGameOver(false);
    currentSpawnInterval.current = INITIAL_SPAWN_INTERVAL;
    currentBaseSpeed.current = INITIAL_BASE_SPEED;
    nextBubbleId.current = 0;
    nextPopEffectId.current = 0;
    // Ensure numSpikes is updated before game starts if gameAreaRef is available
    if (gameAreaRef.current) {
        setNumSpikes(Math.ceil(gameAreaRef.current.offsetWidth / SPIKE_SVG_WIDTH));
    }
    setGameActive(true);
  };

  return (
    <div className="relative w-full h-[400px] md:h-[500px] my-8 select-none overflow-hidden rounded-lg shadow-xl border border-primary/30 bg-gradient-to-br from-slate-800 via-gray-900 to-black text-slate-100">
      {/* Spiked Barrier - React-based rendering */}
      <div
        style={{ height: `${SPIKED_BARRIER_HEIGHT}px` }}
        className="absolute top-0 left-0 right-0 z-20 flex flex-row overflow-hidden"
        aria-hidden="true"
      >
        {numSpikes > 0 && Array.from({ length: numSpikes }).map((_, i) => (
          <svg 
            key={i} 
            width={SPIKE_SVG_WIDTH} 
            height={SPIKED_BARRIER_HEIGHT} 
            viewBox={`0 0 ${SPIKE_SVG_WIDTH} ${SPIKED_BARRIER_HEIGHT}`} 
            xmlns="http://www.w3.org/2000/svg" 
            style={{ fill: '#ef4444', flexShrink: 0 }}
          >
            <polygon points={`0,0 ${SPIKE_SVG_WIDTH/2},${SPIKED_BARRIER_HEIGHT} ${SPIKE_SVG_WIDTH},0`} />
          </svg>
        ))}
      </div>

      {/* Corrected gameAreaRef padding application */}
      <div 
        ref={gameAreaRef} 
        className="absolute inset-0 w-full h-full" 
        style={{ paddingTop: `${SPIKED_BARRIER_HEIGHT}px` }}
      >
        <AnimatePresence>
          {bubbles.map((bubble) => (
            <motion.div
              key={bubble.id}
              initial={{ opacity: 0, scale: 0.3, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0, y: -10, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{
                position: 'absolute',
                left: bubble.x,
                top: bubble.y,
                width: bubble.size,
                height: bubble.size,
                backgroundColor: bubble.color,
                borderRadius: '50%',
                cursor: 'pointer',
                boxShadow: 'inset 0 0 8px rgba(255,255,255,0.4), 0 0 3px rgba(0,0,0,0.3)',
              }}
              onClick={() => popBubble(bubble.id, bubble.x, bubble.y, bubble.size)}
              onTouchStart={() => popBubble(bubble.id, bubble.x, bubble.y, bubble.size)}
              aria-label="Pop bubble"
              role="button"
            >
              <Zap size={bubble.size * 0.5} className="text-white opacity-60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </motion.div>
          ))}
        </AnimatePresence>
        <AnimatePresence>
            {popEffects.map(effect => (
                <motion.div
                    key={effect.id}
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 1.2, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute pointer-events-none"
                    style={{ left: effect.x, top: effect.y, x: '-50%', y: '-50%' }}
                >
                    <Sparkles size={20 + Math.random()*15} className="text-yellow-300 opacity-80" />
                </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Game UI Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none p-4">
        {gameOver && (
            <div className="text-center p-6 bg-black/70 backdrop-blur-sm rounded-lg shadow-2xl border border-red-500/50">
                <AlertTriangle className="text-red-500 h-16 w-16 mx-auto mb-3" />
                <h3 className="text-4xl font-bold text-red-400 mb-2">Game Over!</h3>
                <p className="text-2xl text-slate-200 mb-1">Your Score: {score}</p>
                <p className="text-md text-slate-300 mb-4">High Score: {highScore}</p>
                <Button onClick={startGame} size="lg" className="pointer-events-auto bg-red-500 hover:bg-red-600 text-white shadow-lg text-xl px-8 py-3">
                    Play Again?
                </Button>
            </div>
        )}
        {!gameActive && !gameOver && (
            <div className="text-center">
                <h2 className="text-5xl font-extrabold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500">Bubble Dodger!</h2>
                <p className="text-slate-300 mb-6 text-lg">Pop bubbles, dodge the spikes!</p>
                <Button 
                    onClick={startGame} 
                    size="lg" 
                    className="pointer-events-auto bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-2xl transform hover:scale-105 transition-transform duration-150 text-2xl px-10 py-7"
                >
                    Start Game
                </Button>
                {highScore > 0 && <p className="mt-4 text-slate-400 text-sm">High Score: {highScore}</p>}
            </div>
        )}
      </div>
      
      {gameActive && (
        <div className="absolute top-4 right-4 p-3 bg-black/50 backdrop-blur-sm rounded-lg shadow-md text-lg font-semibold text-slate-100">
          Score: {score}
        </div>
      )}
       <div className="absolute bottom-2 left-2 text-xs text-slate-300">
        Pop the bubbles before they hit the spikes!
      </div>
    </div>
  );
} 