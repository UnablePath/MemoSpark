'use client';

import { useEffect, useRef } from 'react';
import { Show } from '@clerk/nextjs';
import { HomepageNavbar } from '@/components/layout/HomepageNavbar';
import { BubblePopGame } from '@/components/home/BubblePopGame';
import { SocialProof } from '@/components/home/SocialProof';
import { HeroSection } from '@/components/home/HeroSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { PricingStripSection } from '@/components/home/PricingStripSection';
import { useConversionTracking } from '@/lib/analytics/conversionTracking';

export function HomePageClient() {
  const learnMoreRef = useRef<HTMLDivElement>(null);
  const conversionTracker = useConversionTracking();

  const scrollToLearnMore = () => {
    learnMoreRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    conversionTracker.trackLandingPageView();
  }, [conversionTracker]);

  return (
    <div
      className="app-container min-h-screen w-full bg-[#0c0e13] text-white"
      data-marketing-home
    >
      <HomepageNavbar />
      <main>
        <HeroSection onLearnMoreClick={scrollToLearnMore} />
        <div ref={learnMoreRef} id="learn-more" />
        <HowItWorksSection />
        <section className="w-full bg-[#0c0e13] py-20">
          <div className="responsive-container">
            <div className="mb-10 flex items-end justify-between border-b border-white/[0.06] pb-6">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/25">
                  Take five
                </p>
                <h2 className="text-3xl font-black tracking-tighter text-white md:text-4xl">
                  Pop some bubbles.
                </h2>
              </div>
              <Show when="signed-in">
                <p className="hidden text-sm text-white/25 md:block">
                  Your score can count toward achievements
                </p>
              </Show>
              <Show when="signed-out">
                <p className="hidden text-sm text-white/25 md:block">
                  Sign in if you want the achievement to count
                </p>
              </Show>
            </div>
            <div className="mx-auto max-w-4xl">
              <BubblePopGame />
            </div>
          </div>
        </section>
        <PricingStripSection />
        <SocialProof />
      </main>

      <footer className="border-t border-white/[0.05] bg-[#0a0c10] py-8">
        <div className="responsive-container text-left">
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} MemoSpark by PromptU. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
