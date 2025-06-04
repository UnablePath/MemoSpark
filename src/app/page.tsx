"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { StudySparkLogoSvg } from "@/components/ui/StudySparkLogoSvg";
import Image from "next/image";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import { HomepageNavbar } from "@/components/layout/HomepageNavbar";
import { BubblePopGame } from "@/components/home/BubblePopGame";

export default function LandingPage() {
  const router = useRouter();
  const [animationComplete, setAnimationComplete] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

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
      <HomepageNavbar />
      {/* Skip to Content Link for Accessibility - ensure it targets content below navbar */}
      <a href="#splash-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-[60] bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-dashed focus:outline-2 focus:outline-offset-2">Skip to main content</a>
      
      {/* Splash Screen Section - Add padding-top for the fixed navbar */}
      <div
        id="splash-content" // Added ID for skip link target
        className="min-h-screen w-full flex flex-col items-center justify-center p-4 pt-20 md:pt-24 relative overflow-hidden" // Added pt-20 (80px) or md:pt-24
        style={gradientStyle}
      >
        {/* Floating bubbles for background effect - REINSTATED */}
        {!prefersReducedMotion && Array.from({ length: 10 }).map((_, i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 1.5 + i * 0.1, duration: 1, repeat: Number.POSITIVE_INFINITY, repeatType: "mirror", ease: "easeInOut" }}
                style={{
                    position: 'absolute',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: `${Math.random() * 50 + 20}px`,
                    height: `${Math.random() * 50 + 20}px`,
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    filter: 'blur(5px)',
                    zIndex: 0, // Ensure bubbles are in the background
                }}
                aria-hidden="true"
            />
        ))}

        <div className="flex flex-col items-center justify-center gap-8 z-10">
          {/* Logo Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="animate-floating text-white"
            aria-label="StudySpark Logo"
            role="img"
          >
            <StudySparkLogoSvg height={60} />
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="text-white text-xl text-center max-w-md drop-shadow focus:outline-dashed focus:outline-2"
            tabIndex={0}
          >
            Your gamified study companion for better engagement and time management
          </motion.p>

          {/* Action Buttons - SignInButton and SignUpButton are now in HomepageNavbar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: animationComplete ? 1 : 0, y: animationComplete ? 0 : 20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 items-center mt-6"
          >
            <Button
              onClick={handleGetStarted}
              className="bg-white text-primary hover:bg-secondary hover:text-foreground font-semibold px-8 py-4 text-xl rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-dashed focus:outline-2"
              aria-label="Learn more about StudySpark features"
            >
              Learn More
            </Button>

            {/* Removed SignedOut SignInButton - it's in the navbar */}
            {/* 
            <SignedOut>
              <SignInButton mode="modal">
                <Button
                  variant="outline"
                  className="bg-transparent text-white border-white hover:bg-white hover:text-primary font-semibold px-8 py-3 text-lg rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-dashed focus:outline-2"
                  aria-label="Sign in to StudySpark"
                >
                  Enter App
                </Button>
              </SignInButton>
            </SignedOut>
            */}
            <SignedIn>
              <Button
                onClick={() => router.push('/dashboard')}
                className="bg-white text-primary hover:bg-secondary hover:text-foreground font-semibold px-8 py-3 text-lg rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-dashed focus:outline-2"
                aria-label="Go to your StudySpark dashboard"
              >
                Go to Dashboard
              </Button>
            </SignedIn>
          </motion.div>
        </div>
      </div>

      {/* Bubble Pop Game Section - Added below the main splash content, before features */}
      <div className="w-full flex justify-center bg-background">
        <div className="max-w-4xl w-full px-4">
          <BubblePopGame />
        </div>
      </div>

      {/* Features Section */}
      <div ref={featuresRef} id="features" className="w-full bg-background py-16 px-4 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary focus:outline-dashed focus:outline-2" role="heading" aria-level={2} tabIndex={0}>
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
              className="bg-card p-6 rounded-lg shadow-md flex flex-col items-center text-center focus:outline-dashed focus:outline-2"
              tabIndex={0}
              aria-label={feature.title}
            >
              <div className="w-32 h-32 mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Image src={feature.image} alt={feature.title} width={80} height={80} className="text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground" role="heading" aria-level={3}>{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
         <div className="text-center mt-16">
            <SignedOut>
              {/* Wrap the Button with SignUpButton to make it a direct CTA */}
              <SignUpButton mode="modal">
                <Button 
                  // onClick={handleGetStarted} // SignUpButton will handle the click for modal
                  size="lg" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-10 py-6 text-xl rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-dashed focus:outline-2"
                  aria-label="Sign up for StudySpark"
                >
                  Discover Features & Sign Up
                </Button>
              </SignUpButton>
            </SignedOut>
         </div>
      </div>
      {/* ARIA live region for future status messages */}
      <div aria-live="polite" className="sr-only" id="status-message-region"></div>
    </>
  );
}
