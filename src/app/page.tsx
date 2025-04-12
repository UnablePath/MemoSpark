"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/lib/hooks/use-router";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Logo from "@/components/ui/logo";

export default function SplashScreen() {
  const router = useRouter();
  const [animationComplete, setAnimationComplete] = useState(false);

  // Gradient colors for the background (green to beige)
  const gradientStyle = {
    background: "linear-gradient(135deg, hsl(142, 60%, 45%), hsl(40, 38%, 83%))",
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    router.push("/onboarding");
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4"
      style={gradientStyle}
    >
      <div className="flex flex-col items-center justify-center gap-8">
        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
          className="animate-floating"
        >
          <Logo size="lg" showText={false} />
        </motion.div>

        {/* App Name */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-4xl md:text-5xl font-bold text-white text-center"
        >
          StudySpark
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="text-white text-xl text-center max-w-md"
        >
          Your gamified study companion for better engagement and time management
        </motion.p>

        {/* Get Started Button (appears after the animation is complete) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: animationComplete ? 1 : 0, y: animationComplete ? 0 : 20 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            onClick={handleGetStarted}
            className="bg-white text-primary hover:bg-secondary hover:text-foreground font-semibold px-8 py-6 text-lg rounded-full"
          >
            Get Started
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
