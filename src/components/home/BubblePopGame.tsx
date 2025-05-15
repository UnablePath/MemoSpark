'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react'; // For a fun pop icon

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
}

const bubbleColors = [
  'rgba(139, 195, 74, 0.7)', // Light Green
  'rgba(102, 187, 106, 0.7)',
  'rgba(76, 175, 80, 0.7)',
  'rgba(67, 160, 71, 0.7)',
  'rgba(255, 235, 59, 0.7)', // Yellow
  'rgba(255, 213, 79, 0.7)',
  'rgba(255, 193, 7, 0.7)',
  'rgba(245, 245, 220, 0.6)' // Beige accent
];

const getRandomColor = () => bubbleColors[Math.floor(Math.random() * bubbleColors.length)];

export function BubblePopGame() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds game time
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const nextBubbleId = useRef(0);
  const animationFrameId = useRef<number>();
  const gameTimerId = useRef<NodeJS.Timeout>();
  const bubbleIntervalId = useRef<NodeJS.Timeout>();

  const createBubble = useCallback(() => {
    if (!gameAreaRef.current) return;
    const gameAreaWidth = gameAreaRef.current.offsetWidth;
    const size = Math.random() * 40 + 20; // Size between 20px and 60px
    setBubbles((prevBubbles) => [
      ...prevBubbles,
      {
        id: nextBubbleId.current++,
        x: Math.random() * (gameAreaWidth - size),
        y: gameAreaRef.current ? gameAreaRef.current.offsetHeight : 0, // Start from bottom
        size,
        color: getRandomColor(),
        speed: Math.random() * 1 + 0.5, // Speed between 0.5 and 1.5
      },
    ]);
  }, []);

  const popBubble = (id: number) => {
    setBubbles((prevBubbles) => prevBubbles.filter((bubble) => bubble.id !== id));
    setScore((s) => s + 10);
  };

  useEffect(() => {
    if (!gameActive) return;

    const moveBubbles = () => {
      setBubbles((prevBubbles) =>
        prevBubbles
          .map((bubble) => ({
            ...bubble,
            y: bubble.y - bubble.speed,
          }))
          .filter((bubble) => bubble.y + bubble.size > 0) // Remove if off-screen (top)
      );
      animationFrameId.current = requestAnimationFrame(moveBubbles);
    };

    animationFrameId.current = requestAnimationFrame(moveBubbles);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameActive]);

  useEffect(() => {
    if (gameActive) {
      bubbleIntervalId.current = setInterval(createBubble, 1000); // New bubble every second
      gameTimerId.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setGameActive(false);
            clearInterval(gameTimerId.current);
            clearInterval(bubbleIntervalId.current);
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (bubbleIntervalId.current) clearInterval(bubbleIntervalId.current);
      if (gameTimerId.current) clearInterval(gameTimerId.current);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      // Don't clear bubbles immediately, let them float off or be popped
    }
    return () => {
      if (bubbleIntervalId.current) clearInterval(bubbleIntervalId.current);
      if (gameTimerId.current) clearInterval(gameTimerId.current);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameActive, createBubble]);

  const startGame = () => {
    setBubbles([]);
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    nextBubbleId.current = 0;
  };

  return (
    <div className="relative w-full h-[400px] md:h-[500px] my-8 select-none overflow-hidden rounded-lg shadow-xl border border-primary/20 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div ref={gameAreaRef} className="absolute inset-0 w-full h-full">
        <AnimatePresence>
          {bubbles.map((bubble) => (
            <motion.div
              key={bubble.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                position: 'absolute',
                left: bubble.x,
                top: bubble.y,
                width: bubble.size,
                height: bubble.size,
                backgroundColor: bubble.color,
                borderRadius: '50%',
                cursor: 'pointer',
                boxShadow: 'inset 0 0 10px rgba(255,255,255,0.5), 0 0 5px rgba(0,0,0,0.2)',
              }}
              onClick={() => gameActive && popBubble(bubble.id)}
              onTouchStart={() => gameActive && popBubble(bubble.id)} // For touch devices
              aria-label="Pop bubble"
              role="button"
            >
              <Zap size={bubble.size * 0.4} className="text-white opacity-70 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Game UI Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        {!gameActive && timeLeft === 0 && (
            <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg">
                <h3 className="text-3xl font-bold text-primary mb-2">Game Over!</h3>
                <p className="text-xl text-gray-700 mb-4">Your Score: {score}</p>
                <Button onClick={startGame} size="lg" className="pointer-events-auto">
                    Play Again?
                </Button>
            </div>
        )}
        {!gameActive && timeLeft === 30 && (
            <Button onClick={startGame} size="lg" className="pointer-events-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl transform hover:scale-105 transition-transform duration-150 text-xl px-8 py-6">
                Pop Some Bubbles!
            </Button>
        )}
      </div>
      
      {gameActive && (
        <div className="absolute top-4 right-4 p-3 bg-white/70 backdrop-blur-sm rounded-lg shadow-md text-lg font-semibold text-primary">
          Time: {timeLeft}s | Score: {score}
        </div>
      )}
       <div className="absolute bottom-2 left-2 text-xs text-gray-500/70">
        Click or tap the bubbles to pop them!
      </div>
    </div>
  );
} 