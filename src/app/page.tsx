"use client";

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { MemoSparkLogoSvg } from '@/components/ui/MemoSparkLogoSvg';
import Image from 'next/image';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { ABTestCTA } from '@/components/ui/ABTestCTA';
import { HomepageNavbar } from '@/components/layout/HomepageNavbar';
import { ArrowRight, BrainCircuit, CalendarCheck, Gem } from 'lucide-react';
import RetroGrid from "@/components/ui/retro-grid";
import AnimatedShinyText from "@/components/ui/animated-shiny-text";
import { BubblePopGame } from "@/components/home/BubblePopGame";
import { SocialProof } from "@/components/home/SocialProof";
import { PageSeo } from '@/components/seo/PageSeo';
import { pageSeoConfigs } from '@/lib/seo/seoConfig';
import { AIStructuredData } from '@/components/seo/AIOptimizedMeta';
import { generatePageStructuredData } from '@/lib/seo/structuredData';
import { useConversionTracking } from '@/lib/analytics/conversionTracking';

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    viewport={{ once: true, amount: 0.3 }}
    className={`relative flex flex-col items-center p-8 rounded-2xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm ${className}`}
  >
    <div className="mb-6 bg-gradient-to-br from-green-400/20 to-emerald-600/20 p-4 rounded-full border border-white/10">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
    <p className="text-muted-foreground text-center">{description}</p>
  </motion.div>
);

export default function LandingPage() {
  const featuresRef = useRef<HTMLDivElement>(null);
  const conversionTracker = useConversionTracking();

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Generate structured data for homepage
  const structuredDataSchemas = generatePageStructuredData('home');

  // Track landing page view
  useEffect(() => {
    conversionTracker.trackLandingPageView();
  }, [conversionTracker]);

  return (
    <>
      <PageSeo
        title={pageSeoConfigs.home.title}
        description={pageSeoConfigs.home.description}
        canonical={pageSeoConfigs.home.canonical}
      />
      <AIStructuredData schemas={structuredDataSchemas} />
      <div className="app-container min-h-screen w-full bg-[#111] text-white">
        <HomepageNavbar />
        
        {/* Hero Section */}
        <div className="relative isolate flex flex-col items-center justify-center pt-32 pb-24 md:pt-48 md:pb-40 text-center">
          <RetroGrid className="absolute inset-0 w-full h-full" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="z-10 responsive-container"
          >
            <div className="flex justify-center items-center mx-auto mb-6" role="img">
              <MemoSparkLogoSvg height={60} darkBackground={true} />
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 leading-tight text-constrain">
              Amplify Your Learning,<br />
              Master Your Time.
            </h1>

            <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 text-constrain">
              MemoSpark is the AI-powered companion that turns your study habits into achievements. Get smart, stay motivated, and never miss a deadline.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <SignedOut>
                <ABTestCTA />
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard" passHref>
                   <div
                      className="z-10 flex items-center justify-center"
                    >
                      <AnimatedShinyText className="inline-flex items-center justify-center rounded-lg border border-border bg-primary text-primary-foreground px-6 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
                        <span>🚀 Go to Dashboard</span>
                      </AnimatedShinyText>
                    </div>
                </Link>
              </SignedIn>
              <Button variant="ghost" onClick={scrollToFeatures} className="text-neutral-400 hover:bg-transparent hover:text-white transition-colors">
                Learn More <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Bubble Pop Game Section */}
        <div className="w-full py-16 bg-black/10 border-y border-white/5">
          <div className="responsive-container">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">Take a Study Break</h2>
              <p className="text-muted-foreground">Pop some bubbles to relax your mind!</p>
            </div>
            <div className="max-w-4xl mx-auto">
              <BubblePopGame />
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div ref={featuresRef} id="features" className="w-full bg-black/20 py-24 backdrop-blur-md border-y border-white/10">
          <div className="responsive-container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white text-constrain">How MemoSpark Helps You Succeed</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-constrain">
                From AI-driven planning to gamified motivation, we've built the tools you need to excel academically and reduce stress.
              </p>
            </div>
            <div className="responsive-grid max-w-6xl mx-auto">
              <FeatureCard
                icon={<Gem size={32} className="text-green-300" />}
                title="Gamified Learning"
                description="Earn points, unlock achievements, and stay motivated on your study journey."
              />
              <FeatureCard
                icon={<CalendarCheck size={32} className="text-green-300" />}
                title="Smart Scheduling"
                description="Plan your study sessions effectively with our intelligent, AI-powered tools."
              />
              <FeatureCard
                icon={<BrainCircuit size={32} className="text-green-300" />}
                title="AI-Powered Insights"
                description="Monitor your progress and get AI-driven insights to identify areas for improvement."
              />
            </div>
          </div>
        </div>

        {/* Social Proof Section */}
        <SocialProof />
        
        {/* Footer */}
        <footer className="responsive-container text-center py-8 text-muted-foreground text-sm">
            <p className="text-constrain">&copy; {new Date().getFullYear()} MemoSpark by PromptU. All Rights Reserved.</p>
        </footer>
      </div>
    </>
  );
}
