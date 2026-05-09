"use client";

import { BubblePopGame } from "@/components/home/BubblePopGame";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { PricingStripSection } from "@/components/home/PricingStripSection";
import { SocialProof } from "@/components/home/SocialProof";
import { marketing } from "@/components/home/marketingTokens";
import { HomepageNavbar } from "@/components/layout/HomepageNavbar";
import { useConversionTracking } from "@/lib/analytics/conversionTracking";
import { Show } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export function HomePageClient() {
  const learnMoreRef = useRef<HTMLDivElement>(null);
  const conversionTracker = useConversionTracking();

  const scrollToLearnMore = () => {
    learnMoreRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    conversionTracker.trackLandingPageView();
  }, [conversionTracker]);

  return (
    <div
      className={`app-container min-h-screen w-full ${marketing.page}`}
      data-marketing-home
    >
      <HomepageNavbar />
      <main>
        <HeroSection onLearnMoreClick={scrollToLearnMore} />
        <div ref={learnMoreRef} id="learn-more" />
        <HowItWorksSection />
        <section className={`w-full py-20 ${marketing.section}`}>
          <div className="responsive-container">
            <div
              className={`mb-10 flex items-end justify-between border-b pb-6 ${marketing.borderSoft}`}
            >
              <div>
                <p
                  className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${marketing.eyebrow}`}
                >
                  Take five
                </p>
                <h2
                  className={`text-3xl font-black tracking-tighter md:text-4xl ${marketing.heading}`}
                >
                  Pop some bubbles.
                </h2>
              </div>
              <Show when="signed-in">
                <p className={`hidden text-sm md:block ${marketing.eyebrow}`}>
                  Your score can count toward achievements
                </p>
              </Show>
              <Show when="signed-out">
                <p className={`hidden text-sm md:block ${marketing.eyebrow}`}>
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

      <footer className={`py-8 ${marketing.footer}`}>
        <div className="responsive-container text-left">
          <p className={`text-xs ${marketing.eyebrow}`}>
            &copy; {new Date().getFullYear()} MemoSpark by PromptU. All Rights
            Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
