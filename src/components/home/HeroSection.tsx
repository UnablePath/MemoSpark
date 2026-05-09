"use client";

import { heroCopy } from "@/components/home/homepageContent";
import { ABTestCTA } from "@/components/ui/ABTestCTA";
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";
import { Button } from "@/components/ui/button";
import { useConversionTracking } from "@/lib/analytics/conversionTracking";
import { Show } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
  onLearnMoreClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onLearnMoreClick,
}) => {
  const conversionTracker = useConversionTracking();

  const handlePricingIntent = () => {
    conversionTracker.trackEvent("pricing_cta_click", {
      conversion_stage: "pricing_intent",
      placement: "hero_secondary",
    });
  };

  const ghostCtaClass =
    "border border-border text-muted-foreground hover:bg-muted hover:text-foreground dark:border-white/12 dark:text-foreground/70 dark:hover:border-white/22 dark:hover:bg-white/[0.06] dark:hover:text-foreground";

  const signedInCtaClass =
    "bg-primary font-semibold text-primary-foreground shadow-md hover:bg-primary/90 dark:bg-white dark:text-black dark:shadow-none dark:hover:bg-white/90";

  return (
    <section className="relative isolate overflow-hidden border-b border-border/50 bg-background pt-28 pb-20 md:pt-40 md:pb-28">
      {/* Light: soft brand wash */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-25%,hsl(var(--primary)/0.07),transparent_55%)] dark:hidden"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_100%_0%,hsl(173_42%_32%/0.06),transparent_50%)] dark:hidden"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_0%_100%,hsl(35_45%_45%/0.05),transparent_45%)] dark:hidden"
        aria-hidden
      />
      {/* Dark: richer studio washes */}
      <div
        className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_90%_60%_at_50%_-25%,hsl(var(--primary)/0.14),transparent_55%)] dark:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_55%_45%_at_100%_0%,hsl(173_42%_32%/0.12),transparent_50%)] dark:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_50%_40%_at_0%_100%,hsl(35_45%_45%/0.07),transparent_45%)] dark:block"
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.58, ease: "easeOut" }}
        className="relative z-10 responsive-container"
      >
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="mb-8">
              <MemoSparkLogoSvg height={46} />
            </div>

            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              {heroCopy.eyebrow}
            </p>

            <h1 className="mb-6 max-w-2xl text-[2.6rem] font-black leading-[1.06] tracking-tighter text-foreground md:text-6xl lg:text-[3.25rem]">
              {heroCopy.title}
            </h1>

            <p className="mb-8 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              {heroCopy.subtitle}
            </p>

            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Show when="signed-out">
                <ABTestCTA />
              </Show>
              <Show when="signed-in">
                <Button asChild size="lg" className={signedInCtaClass}>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </Show>
              <Show when="signed-out">
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className={ghostCtaClass}
                >
                  <Link href="#pricing" onClick={handlePricingIntent}>
                    {heroCopy.secondaryCtaLabel}
                  </Link>
                </Button>
              </Show>
              <Show when="signed-in">
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className={ghostCtaClass}
                >
                  <Link
                    href="/settings/subscription"
                    onClick={handlePricingIntent}
                  >
                    {heroCopy.secondaryCtaLabel}
                  </Link>
                </Button>
              </Show>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70 dark:text-foreground/28">
              <span>Tasks</span>
              <span className="text-muted-foreground/35 dark:text-foreground/12">
                ·
              </span>
              <span>Connections</span>
              <span className="text-muted-foreground/35 dark:text-foreground/12">
                ·
              </span>
              <span>Crashout</span>
              <span className="text-muted-foreground/35 dark:text-foreground/12">
                ·
              </span>
              <span>Coins</span>
              <span className="text-muted-foreground/35 dark:text-foreground/12">
                ·
              </span>
              <span>Insights</span>
            </div>

            <button
              type="button"
              onClick={onLearnMoreClick}
              className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground dark:text-foreground/35 dark:hover:text-foreground/75"
            >
              See how it works{" "}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.64, delay: 0.14, ease: "easeOut" }}
            className="hidden lg:block"
          >
            <div className="flex flex-col">
              <div
                className="relative z-10 -mb-12 rounded-2xl border border-amber-300/45 bg-amber-50/50 px-5 py-4 shadow-lg dark:border-amber-400/15 dark:bg-[#14100a]"
                style={{ transform: "rotate(-1.5deg)" }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500/80 dark:bg-amber-400/70" />
                  <span className="text-[11px] font-medium text-amber-900/75 dark:text-amber-300/65">
                    Crashout room · anonymous
                  </span>
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground dark:text-white/50">
                  &ldquo;I have three deadlines this week and my brain has
                  checked out.&rdquo;
                </p>
                <div className="mt-2.5 flex gap-3 text-xs text-muted-foreground/80 dark:text-white/25">
                  <span>47 supports</span>
                  <span>12 replies</span>
                  <span className="ml-auto italic text-amber-700/70 dark:text-amber-400/45">
                    stressed
                  </span>
                </div>
              </div>

              <div
                className="relative z-20 -mb-10 rounded-2xl border border-teal-300/45 bg-teal-50/45 px-5 py-4 shadow-xl dark:border-teal-400/15 dark:bg-[#0d1816]"
                style={{ transform: "rotate(0.8deg)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600/15 text-xs font-bold text-teal-900 dark:bg-teal-500/20 dark:text-teal-200">
                    K
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground dark:text-white">
                      Kofi wants to connect
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-white/35">
                      Business Admin · 3 shared classes
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-teal-600/15 px-3 py-1.5 text-xs font-medium text-teal-900 dark:bg-teal-500/20 dark:text-teal-200">
                    Accept
                  </span>
                </div>
              </div>

              <div className="relative z-30 rounded-2xl border border-border bg-card px-5 py-5 shadow-2xl dark:border-white/[0.09] dark:bg-[#111620]">
                <div className="mb-3 flex items-center justify-between border-b border-border pb-3 dark:border-white/[0.06]">
                  <span className="text-sm font-semibold text-foreground dark:text-white">
                    This week
                  </span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary dark:bg-emerald-500/15 dark:text-emerald-400">
                    4 done · 2 left
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary/50 dark:border-emerald-400/50">
                      <div className="h-2 w-2 rounded-sm bg-primary dark:bg-emerald-400" />
                    </div>
                    <span className="flex-1 text-sm text-foreground/90 dark:text-white/75">
                      Quantitative Methods review
                    </span>
                    <span className="text-xs text-muted-foreground dark:text-white/25">
                      Tonight
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 shrink-0 rounded border border-border dark:border-white/15" />
                    <span className="flex-1 text-sm text-muted-foreground dark:text-white/40">
                      Microeconomics assignment
                    </span>
                    <span className="text-xs text-amber-700/80 dark:text-amber-400/60">
                      Due Fri
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 shrink-0 rounded border border-border dark:border-white/15" />
                    <span className="flex-1 text-sm text-muted-foreground dark:text-white/40">
                      Biology test prep
                    </span>
                    <span className="text-xs text-muted-foreground/70 dark:text-white/20">
                      3 sessions
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-primary/90 dark:text-emerald-300/55">
                  <Zap className="h-3 w-3" aria-hidden />
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
