"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/lib/hooks/use-router";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Logo from "@/components/ui/logo";
import Image from "next/image";

export default function LandingPage() {
  const router = useRouter();
  const [animationComplete, setAnimationComplete] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);

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
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Placeholder feature data
  const features = [
    {
      title: "Gamified Learning",
      description: "Earn points, unlock achievements, and stay motivated.",
      image: "/placeholder-feature1.svg",
    },
    {
      title: "Smart Scheduling",
      description: "Plan your study sessions effectively with our smart tools.",
      image: "/placeholder-feature2.svg",
    },
    {
      title: "Progress Tracking",
      description: "Monitor your progress and identify areas for improvement.",
      image: "/placeholder-feature3.svg",
    },
  ];

  return (
    <>
      {/* Splash Screen Section */}
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden"
        style={gradientStyle}
      >
        {/* Floating bubbles for background effect */}
        {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 1.5 + i * 0.1, duration: 1, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                style={{
                    position: 'absolute',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: `${Math.random() * 50 + 20}px`,
                    height: `${Math.random() * 50 + 20}px`,
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    filter: 'blur(5px)',
                }}
            />
        ))}

        <div className="flex flex-col items-center justify-center gap-8 z-10">
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
            className="text-4xl md:text-5xl font-bold text-white text-center drop-shadow-md"
          >
            StudySpark
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="text-white text-xl text-center max-w-md drop-shadow"
          >
            Your gamified study companion for better engagement and time management
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: animationComplete ? 1 : 0, y: animationComplete ? 0 : 20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 items-center mt-6"
          >
            {/* Log In Button */}
            <Button
              onClick={() => router.push("/auth/login")}
              variant="outline"
              className="bg-transparent text-white border-white hover:bg-white hover:text-primary font-semibold px-8 py-3 text-lg rounded-full transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              Log In
            </Button>

            {/* Get Started Button -> Scrolls Down */}
            <Button
              onClick={handleGetStarted}
              className="bg-white text-primary hover:bg-secondary hover:text-foreground font-semibold px-8 py-4 text-xl rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              Learn More
            </Button>

            {/* Sign Up Button */}
            <Button
              onClick={() => router.push("/auth/signup")}
              variant="outline"
              className="bg-transparent text-white border-white hover:bg-white hover:text-primary font-semibold px-8 py-3 text-lg rounded-full transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              Sign Up
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div ref={featuresRef} id="features" className="w-full bg-background py-16 px-4 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
          How StudySpark Helps You Succeed
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="bg-card p-6 rounded-lg shadow-md flex flex-col items-center text-center"
            >
              <div className="w-32 h-32 mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Image src={feature.image} alt={feature.title} width={80} height={80} className="text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
         <div className="text-center mt-16">
             <Button
                onClick={() => router.push('/auth/signup')}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-10 py-6 text-xl rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105"
            >
                Get Started with StudySpark Now!
            </Button>
         </div>
      </div>
    </>
  );
}
