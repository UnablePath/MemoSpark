"use client";

import { pricingStrip } from "@/components/home/homepageContent";
import { Button } from "@/components/ui/button";
import { useConversionTracking } from "@/lib/analytics/conversionTracking";
import { Show } from "@clerk/nextjs";
import { Check } from "lucide-react";
import Link from "next/link";

const premiumFeatures = [
  "Student connections",
  "Crashout room",
  "Voice input + deeper insights",
  "Full gamification",
  "Analytics",
  "Study groups",
];

export const PricingStripSection: React.FC = () => {
  const conversionTracker = useConversionTracking();

  const trackPricingStripClick = (audience: "signed_in" | "signed_out") => {
    conversionTracker.trackEvent("pricing_strip_click", {
      conversion_stage: "pricing_intent",
      placement: "mid_page_pricing_strip",
      audience,
    });
  };

  return (
    <section
      id="pricing"
      className="w-full border-y border-border/60 bg-background py-16"
    >
      <div className="responsive-container">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border/80 bg-card p-8 md:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                {pricingStrip.eyebrow}
              </p>
              <h3 className="mb-3 text-2xl font-black tracking-tighter text-foreground md:text-3xl">
                {pricingStrip.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                {pricingStrip.subtitle}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                {premiumFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                    <span className="text-xs text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
              <div className="text-right">
                <p className="text-3xl font-black tracking-tighter text-foreground">
                  20 GHS
                </p>
                <p className="text-xs text-muted-foreground">
                  per month or 212 GHS a year
                </p>
              </div>
              <Show when="signed-out">
                <Button
                  asChild
                  className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Link
                    href="/sign-up"
                    onClick={() => trackPricingStripClick("signed_out")}
                  >
                    {pricingStrip.signedOutCta}
                  </Link>
                </Button>
              </Show>
              <Show when="signed-in">
                <Button
                  asChild
                  className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Link
                    href="/settings/subscription"
                    onClick={() => trackPricingStripClick("signed_in")}
                  >
                    {pricingStrip.signedInCta}
                  </Link>
                </Button>
              </Show>
              <p className="text-xs text-muted-foreground/70">
                You can stay on the free plan as long as you want.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
