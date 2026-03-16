'use client';

import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ABTestCTA } from '@/components/ui/ABTestCTA';
import { MemoSparkLogoSvg } from '@/components/ui/MemoSparkLogoSvg';
import { heroCopy } from '@/components/home/homepageContent';
import { useConversionTracking } from '@/lib/analytics/conversionTracking';

interface HeroSectionProps {
  onLearnMoreClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onLearnMoreClick }) => {
  const conversionTracker = useConversionTracking();

  const handlePricingIntent = () => {
    conversionTracker.trackEvent('pricing_cta_click', {
      conversion_stage: 'pricing_intent',
      placement: 'hero_secondary',
    });
  };

  return (
    <section className="relative isolate overflow-hidden border-b border-white/[0.06] bg-[#0c0e13] pt-28 pb-20 md:pt-40 md:pb-28">
      {/* Subtle dot grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 responsive-container"
      >
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          {/* Left: Content */}
          <div>
            <div className="mb-8">
              <MemoSparkLogoSvg height={46} darkBackground={true} />
            </div>

            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400/70">
              {heroCopy.eyebrow}
            </p>

            <h1 className="mb-6 max-w-2xl text-[2.6rem] font-black leading-[1.06] tracking-tighter text-white md:text-6xl lg:text-[3.25rem]">
              {heroCopy.title}
            </h1>

            <p className="mb-8 max-w-md text-base leading-relaxed text-white/50 md:text-lg">
              {heroCopy.subtitle}
            </p>

            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <SignedOut>
                <ABTestCTA />
              </SignedOut>
              <SignedIn>
                <Button asChild size="lg" className="bg-white font-semibold text-black hover:bg-white/90">
                  <Link href="/dashboard">
                    Go to Dashboard
                  </Link>
                </Button>
              </SignedIn>
              <SignedOut>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="border border-white/12 text-white/60 hover:border-white/25 hover:bg-white/[0.04] hover:text-white"
                >
                  <a href="#pricing" onClick={handlePricingIntent}>
                    {heroCopy.secondaryCtaLabel}
                  </a>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="border border-white/12 text-white/60 hover:border-white/25 hover:bg-white/[0.04] hover:text-white"
                >
                  <Link href="/settings/subscription" onClick={handlePricingIntent}>
                    {heroCopy.secondaryCtaLabel}
                  </Link>
                </Button>
              </SignedIn>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium uppercase tracking-widest text-white/25">
              <span>Tasks</span>
              <span className="text-white/10">·</span>
              <span>Connections</span>
              <span className="text-white/10">·</span>
              <span>Crashout</span>
              <span className="text-white/10">·</span>
              <span>Coins</span>
              <span className="text-white/10">·</span>
              <span>Stu</span>
            </div>

            <button
              type="button"
              onClick={onLearnMoreClick}
              className="mt-6 inline-flex items-center gap-2 text-sm text-white/30 transition-colors hover:text-white/60"
            >
              See how it works <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Right: Layered feature cards */}
          <motion.div
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.15 }}
            className="hidden lg:block"
          >
            {/* Stacked cards — each card overlaps the previous via negative bottom margin */}
            <div className="flex flex-col">

              {/* Back card: Crashout post */}
              <div
                className="relative z-10 -mb-12 rounded-2xl border border-amber-400/[0.1] bg-[#14100a] px-5 py-4 shadow-lg"
                style={{ transform: 'rotate(-1.5deg)' }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400/70" />
                  <span className="text-[11px] font-medium text-amber-300/55">
                    Crashout room · anonymous
                  </span>
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-white/50">
                  "I have three deadlines this week and my brain has checked out."
                </p>
                <div className="mt-2.5 flex gap-3 text-xs text-white/20">
                  <span>47 supports</span>
                  <span>12 replies</span>
                  <span className="ml-auto italic text-amber-400/40">stressed</span>
                </div>
              </div>

              {/* Middle card: Connection notification */}
              <div
                className="relative z-20 -mb-10 rounded-2xl border border-blue-400/[0.1] bg-[#0d1020] px-5 py-4 shadow-xl"
                style={{ transform: 'rotate(0.8deg)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">
                    K
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">Kofi wants to connect</p>
                    <p className="text-xs text-white/35">Business Admin · 3 shared classes</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300">
                    Accept
                  </span>
                </div>
              </div>

              {/* Front card: Planner (most prominent) */}
              <div
                className="relative z-30 rounded-2xl border border-white/[0.09] bg-[#111620] px-5 py-5 shadow-2xl"
              >
                <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-sm font-semibold text-white">This week</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    4 done · 2 left
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-400/50">
                      <div className="h-2 w-2 rounded-sm bg-emerald-400" />
                    </div>
                    <span className="flex-1 text-sm text-white/75">Quantitative Methods review</span>
                    <span className="text-xs text-white/25">Tonight</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 shrink-0 rounded border border-white/15" />
                    <span className="flex-1 text-sm text-white/40">Microeconomics assignment</span>
                    <span className="text-xs text-amber-400/60">Due Fri</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 shrink-0 rounded border border-white/15" />
                    <span className="flex-1 text-sm text-white/40">Biology test prep</span>
                    <span className="text-xs text-white/20">3 sessions</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300/55">
                  <Zap className="h-3 w-3" />
                  <span>12 day streak · 340 coins</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};
