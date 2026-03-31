"use client";

import { Button } from "@/components/ui/button";
import { useDebouncedAchievementTrigger } from "@/hooks/useDebouncedAchievementTrigger";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface BubbleTheme {
  fill: string;
  border: string;
  shadow: string;
  glow: string;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  colorIndex: number;
  speed: number;
}

interface PopEffect {
  id: number;
  x: number;
  y: number;
  colorIndex: number;
}

const BUBBLE_THEMES: BubbleTheme[] = [
  {
    fill: "rgba(0, 221, 255, 0.12)",
    border: "1.5px solid rgba(0, 221, 255, 0.5)",
    shadow:
      "inset 0 2px 10px rgba(255,255,255,0.12), 0 0 16px rgba(0, 221, 255, 0.25)",
    glow: "rgba(0, 221, 255, 0.6)",
  },
  {
    fill: "rgba(173, 54, 255, 0.12)",
    border: "1.5px solid rgba(173, 54, 255, 0.5)",
    shadow:
      "inset 0 2px 10px rgba(255,255,255,0.1), 0 0 16px rgba(173, 54, 255, 0.25)",
    glow: "rgba(173, 54, 255, 0.6)",
  },
  {
    fill: "rgba(255, 60, 150, 0.12)",
    border: "1.5px solid rgba(255, 60, 150, 0.5)",
    shadow:
      "inset 0 2px 10px rgba(255,255,255,0.1), 0 0 16px rgba(255, 60, 150, 0.25)",
    glow: "rgba(255, 60, 150, 0.6)",
  },
  {
    fill: "rgba(50, 220, 100, 0.12)",
    border: "1.5px solid rgba(50, 220, 100, 0.5)",
    shadow:
      "inset 0 2px 10px rgba(255,255,255,0.12), 0 0 16px rgba(50, 220, 100, 0.25)",
    glow: "rgba(50, 220, 100, 0.6)",
  },
  {
    fill: "rgba(255, 170, 0, 0.12)",
    border: "1.5px solid rgba(255, 170, 0, 0.5)",
    shadow:
      "inset 0 2px 10px rgba(255,255,255,0.1), 0 0 16px rgba(255, 170, 0, 0.25)",
    glow: "rgba(255, 170, 0, 0.6)",
  },
  {
    fill: "rgba(0, 255, 160, 0.12)",
    border: "1.5px solid rgba(0, 255, 160, 0.5)",
    shadow:
      "inset 0 2px 10px rgba(255,255,255,0.12), 0 0 16px rgba(0, 255, 160, 0.25)",
    glow: "rgba(0, 255, 160, 0.6)",
  },
  {
    fill: "rgba(100, 140, 255, 0.12)",
    border: "1.5px solid rgba(100, 140, 255, 0.5)",
    shadow:
      "inset 0 2px 10px rgba(255,255,255,0.1), 0 0 16px rgba(100, 140, 255, 0.25)",
    glow: "rgba(100, 140, 255, 0.6)",
  },
  {
    fill: "rgba(255, 220, 60, 0.12)",
    border: "1.5px solid rgba(255, 220, 60, 0.5)",
    shadow:
      "inset 0 2px 10px rgba(255,255,255,0.12), 0 0 16px rgba(255, 220, 60, 0.25)",
    glow: "rgba(255, 220, 60, 0.6)",
  },
];

const INITIAL_SPAWN_INTERVAL = 1200;
const MIN_SPAWN_INTERVAL = 250;
const SPAWN_INTERVAL_DECREMENT = 75;

const INITIAL_BASE_SPEED = 0.7;
const MAX_BASE_SPEED = 2.8;
const SPEED_INCREMENT = 0.15;
const INITIAL_RANDOM_SPEED_ADD = 0.5;
const DIFFICULTY_RAMP_INTERVAL = 5000;
const SPIKED_BARRIER_HEIGHT = 22;
const SPIKE_SVG_WIDTH = 22;

const getRandomColorIndex = () =>
  Math.floor(Math.random() * BUBBLE_THEMES.length);

export function BubblePopGame() {
  const { user } = useUser();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popEffects, setPopEffects] = useState<PopEffect[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [numSpikes, setNumSpikes] = useState(0);
  const [isPausedByVisibility, setIsPausedByVisibility] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const tabHiddenTime = useRef<number | null>(null);
  const scoreRef = useRef(0);

  const { triggerBubbleGamePlayed, triggerBubbleScoreAchievement } =
    useDebouncedAchievementTrigger();

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const nextBubbleId = useRef(0);
  const nextPopEffectId = useRef(0);

  const gameTimeMs = useRef(0);
  const currentSpawnInterval = useRef(INITIAL_SPAWN_INTERVAL);
  const currentBaseSpeed = useRef(INITIAL_BASE_SPEED);
  const lastDifficultyRampTime = useRef(0);

  const animationFrameId = useRef<number | null>(null);
  const bubbleCreationTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const gameLogicIntervalId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedHighScore = localStorage.getItem("bubblePopHighScore");
      if (storedHighScore) {
        setHighScore(Number.parseInt(storedHighScore, 10));
      }
    }
    if (gameAreaRef.current) {
      setNumSpikes(
        Math.ceil(gameAreaRef.current.offsetWidth / SPIKE_SVG_WIDTH),
      );
    }
  }, []);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    const handleResize = () => {
      if (gameAreaRef.current) {
        setNumSpikes(
          Math.ceil(gameAreaRef.current.offsetWidth / SPIKE_SVG_WIDTH),
        );
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const updateHighScore = (currentScore: number) => {
    if (currentScore > highScore) {
      setHighScore(currentScore);
      if (typeof window !== "undefined") {
        localStorage.setItem("bubblePopHighScore", currentScore.toString());
      }
    }
  };

  const scheduleNextBubble = useCallback(() => {
    if (!gameActive || !gameAreaRef.current || isPausedByVisibility) return;
    if (bubbleCreationTimeoutId.current)
      clearTimeout(bubbleCreationTimeoutId.current);

    bubbleCreationTimeoutId.current = setTimeout(() => {
      const gameAreaWidth = gameAreaRef.current!.offsetWidth;
      const size = Math.round(Math.random() * 30 + 30);
      setBubbles((prevBubbles) => [
        ...prevBubbles,
        {
          id: nextBubbleId.current++,
          x: Math.random() * (gameAreaWidth - size),
          y: gameAreaRef.current!.offsetHeight,
          size,
          colorIndex: getRandomColorIndex(),
          speed:
            Math.random() * INITIAL_RANDOM_SPEED_ADD + currentBaseSpeed.current,
        },
      ]);
      scheduleNextBubble();
    }, currentSpawnInterval.current);
  }, [gameActive, isPausedByVisibility]);

  const popBubble = (
    id: number,
    x: number,
    y: number,
    size: number,
    colorIndex: number,
  ) => {
    if (!gameActive) return;
    setBubbles((prev) => prev.filter((b) => b.id !== id));
    setScore((s) => {
      const newScore = s + 10;
      if (s === 0 && !gameStarted) {
        setGameStarted(true);
        triggerBubbleGamePlayed();
      }
      if (newScore >= 1000 && s < 1000) triggerBubbleScoreAchievement(newScore);
      if (newScore >= 2500 && s < 2500) triggerBubbleScoreAchievement(newScore);
      if (newScore >= 5000 && s < 5000) triggerBubbleScoreAchievement(newScore);
      return newScore;
    });
    const newPopEffectId = nextPopEffectId.current++;
    setPopEffects((prev) => [
      ...prev,
      { id: newPopEffectId, x: x + size / 2, y: y + size / 2, colorIndex },
    ]);
    setTimeout(() => {
      setPopEffects((prev) => prev.filter((e) => e.id !== newPopEffectId));
    }, 350);
  };

  const handleGameAreaKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!gameActive) return;
    if (event.key !== " " && event.key !== "Enter") return;

    event.preventDefault();

    const targetBubble = [...bubbles].sort((a, b) => a.y - b.y)[0];
    if (!targetBubble) return;

    popBubble(
      targetBubble.id,
      targetBubble.x,
      targetBubble.y,
      targetBubble.size,
      targetBubble.colorIndex,
    );
  };

  useEffect(() => {
    if (!gameActive || isPausedByVisibility) {
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
      return;
    }

    const gameLoop = () => {
      setBubbles(
        (prevBubbles) =>
          prevBubbles
            .map((bubble) => {
              const newY = bubble.y - bubble.speed;
              if (newY < SPIKED_BARRIER_HEIGHT + bubble.size / 2) {
                setGameActive(false);
                setGameOver(true);
                updateHighScore(scoreRef.current);
                if (typeof navigator.vibrate === "function")
                  navigator.vibrate(200);
                return null;
              }
              return { ...bubble, y: newY };
            })
            .filter((bubble) => bubble !== null) as Bubble[],
      );
      if (gameActive && !isPausedByVisibility) {
        animationFrameId.current = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameId.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameActive, isPausedByVisibility]);

  useEffect(() => {
    if (gameActive && !isPausedByVisibility) {
      if (tabHiddenTime.current !== null) {
        const pauseDuration = Date.now() - tabHiddenTime.current;
        lastDifficultyRampTime.current += pauseDuration;
        tabHiddenTime.current = null;
      } else if (lastDifficultyRampTime.current === 0) {
        lastDifficultyRampTime.current = Date.now();
        gameTimeMs.current = 0;
      }
      scheduleNextBubble();
      gameLogicIntervalId.current = setInterval(() => {
        gameTimeMs.current += 100;
        setScore((s) => s + 1);
        const now = Date.now();
        if (now - lastDifficultyRampTime.current >= DIFFICULTY_RAMP_INTERVAL) {
          currentBaseSpeed.current = Math.min(
            MAX_BASE_SPEED,
            currentBaseSpeed.current + SPEED_INCREMENT,
          );
          currentSpawnInterval.current = Math.max(
            MIN_SPAWN_INTERVAL,
            currentSpawnInterval.current - SPAWN_INTERVAL_DECREMENT,
          );
          lastDifficultyRampTime.current = now;
        }
      }, 100);
    } else {
      if (gameLogicIntervalId.current)
        clearInterval(gameLogicIntervalId.current);
      if (bubbleCreationTimeoutId.current)
        clearTimeout(bubbleCreationTimeoutId.current);
    }
    return () => {
      if (gameLogicIntervalId.current)
        clearInterval(gameLogicIntervalId.current);
      if (bubbleCreationTimeoutId.current)
        clearTimeout(bubbleCreationTimeoutId.current);
    };
  }, [gameActive, scheduleNextBubble, isPausedByVisibility]);

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
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [gameActive, gameOver, isPausedByVisibility]);

  const startGame = () => {
    setBubbles([]);
    setPopEffects([]);
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    currentSpawnInterval.current = INITIAL_SPAWN_INTERVAL;
    currentBaseSpeed.current = INITIAL_BASE_SPEED;
    nextBubbleId.current = 0;
    nextPopEffectId.current = 0;
    if (gameAreaRef.current) {
      setNumSpikes(
        Math.ceil(gameAreaRef.current.offsetWidth / SPIKE_SVG_WIDTH),
      );
    }
    setGameActive(true);
    setTimeout(() => gameAreaRef.current?.focus(), 0);
  };

  return (
    <div
      className="relative my-6 w-full select-none overflow-hidden rounded-2xl border border-border bg-zinc-900 dark:bg-[#080b10] dark:border-white/10"
      style={{
        height: "420px",
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      {/* Spiked barrier */}
      <div
        style={{ height: `${SPIKED_BARRIER_HEIGHT}px` }}
        className="absolute left-0 right-0 top-0 z-20 flex flex-row overflow-hidden"
        aria-hidden="true"
      >
        {numSpikes > 0 &&
          Array.from({ length: numSpikes }).map((_, i) => (
            <svg
              key={i}
              width={SPIKE_SVG_WIDTH}
              height={SPIKED_BARRIER_HEIGHT}
              viewBox={`0 0 ${SPIKE_SVG_WIDTH} ${SPIKED_BARRIER_HEIGHT}`}
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0 }}
            >
              <defs>
                <linearGradient id={`spike-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(220,38,38,0.95)" />
                  <stop offset="100%" stopColor="rgba(127,17,17,0.7)" />
                </linearGradient>
              </defs>
              <polygon
                points={`0,0 ${SPIKE_SVG_WIDTH / 2},${SPIKED_BARRIER_HEIGHT} ${SPIKE_SVG_WIDTH},0`}
                fill={`url(#spike-${i})`}
              />
            </svg>
          ))}
      </div>
      {/* Red glow under spikes */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-8"
        style={{
          background:
            "linear-gradient(to bottom, rgba(220,38,38,0.18) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Game area */}
      <div
        ref={gameAreaRef}
        className="absolute inset-0 h-full w-full"
        style={{ paddingTop: `${SPIKED_BARRIER_HEIGHT}px` }}
        tabIndex={gameActive ? 0 : -1}
        onKeyDown={handleGameAreaKeyDown}
        aria-label="Bubble game area. Press Space or Enter to pop the bubble closest to the spikes."
      >
        <AnimatePresence>
          {bubbles.map((bubble) => {
            const theme = BUBBLE_THEMES[bubble.colorIndex];
            return (
              <motion.div
                key={bubble.id}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                style={{
                  position: "absolute",
                  left: bubble.x,
                  top: bubble.y,
                  width: `${bubble.size}px`,
                  height: `${bubble.size}px`,
                  minWidth: `${bubble.size}px`,
                  minHeight: `${bubble.size}px`,
                  boxSizing: "border-box",
                  background: theme.fill,
                  border: theme.border,
                  borderRadius: "50%",
                  cursor: "pointer",
                  boxShadow: theme.shadow,
                }}
                onClick={() =>
                  popBubble(
                    bubble.id,
                    bubble.x,
                    bubble.y,
                    bubble.size,
                    bubble.colorIndex,
                  )
                }
              >
                {/* Inner highlight — simulates glass refraction */}
                <div
                  className="absolute rounded-full"
                  style={{
                    top: "18%",
                    left: "20%",
                    width: "28%",
                    height: "22%",
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 70%)",
                    filter: "blur(1px)",
                  }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        <AnimatePresence>
          {popEffects.map((effect) => (
            <motion.div
              key={effect.id}
              initial={{ scale: 0.4, opacity: 0.9 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="pointer-events-none absolute"
              style={{ left: effect.x, top: effect.y, x: "-50%", y: "-50%" }}
            >
              <Sparkles
                size={18}
                style={{ color: BUBBLE_THEMES[effect.colorIndex].glow }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Game Over overlay */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm"
          >
            <div className="text-center">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-400/70">
                Game over
              </p>
              <p className="mb-1 text-7xl font-black tracking-tighter text-white">
                {score}
              </p>
              <p className="mb-6 text-sm text-white/40">
                High score: <span className="text-white/60">{highScore}</span>
              </p>
              <Button
                onClick={startGame}
                className="border border-white/15 bg-white/10 text-white hover:bg-white/20"
              >
                Play again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start screen */}
      {!gameActive && !gameOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
            Mini game
          </p>
          <h2 className="mb-2 text-4xl font-black tracking-tighter text-white md:text-5xl">
            Bubble Dodger
          </h2>
          <p className="mb-7 text-sm text-white/35">
            Quick reset. Pop them before they hit the spikes.
          </p>
          <p className="mb-4 text-xs text-white/25">
            Mouse, touch, or focus the game and press Space.
          </p>
          <Button
            onClick={startGame}
            className="border border-white/15 bg-white text-black font-semibold hover:bg-white/90 px-8"
          >
            Play
          </Button>
          {highScore > 0 && (
            <p className="mt-4 text-xs text-white/25">
              Best: <span className="text-white/45">{highScore}</span>
            </p>
          )}
        </div>
      )}

      {/* Score HUD during gameplay */}
      {gameActive && (
        <div className="absolute right-4 top-8 z-20 rounded-full border border-white/15 bg-black/45 px-4 py-1.5 font-mono text-sm font-semibold text-white backdrop-blur-sm dark:border-white/[0.08] dark:bg-black/50">
          {score}
        </div>
      )}
      {gameActive && (
        <p className="sr-only" aria-live="polite">
          Current score: {score}
        </p>
      )}

      {/* Hint text */}
      {!gameActive && !gameOver && (
        <p className="absolute bottom-3 left-4 z-10 text-xs text-white/18">
          {user
            ? "Your score can count toward achievements."
            : "Sign in to have game achievements recorded."}
        </p>
      )}
    </div>
  );
}
