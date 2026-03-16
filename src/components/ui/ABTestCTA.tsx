'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { SignUpButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { useConversionTracking } from '@/lib/analytics/conversionTracking';
import { useExperiment } from '@/lib/analytics/useExperiment';

interface CTAVariant {
  id: string;
  text: string;
  className?: string;
}

const DEFAULT_VARIANT: CTAVariant = {
  id: 'control',
  text: 'Create free account',
  className: 'bg-primary text-primary-foreground hover:bg-primary/90',
};

const HOMEPAGE_EXPERIMENT_KEY = 'homepage_pricing_cta_v1';

const VARIANT_CLASS_MAP: Record<string, string> = {
  control: 'bg-primary text-primary-foreground hover:bg-primary/90',
  speed: 'bg-[#1b222d] text-white border border-white/15 hover:bg-[#232b38]',
  value: 'bg-[#121920] text-white border border-emerald-300/40 hover:bg-[#18212b]',
  urgency: 'bg-[#1f1820] text-white border border-white/15 hover:bg-[#2a2030]',
};

interface ABTestCTAProps {
  className?: string;
  onVariantSelected?: (variantId: string) => void;
}

export const ABTestCTA: React.FC<ABTestCTAProps> = ({ 
  className,
  onVariantSelected 
}) => {
  const [selectedVariant, setSelectedVariant] = useState<CTAVariant>(DEFAULT_VARIANT);
  const conversionTracker = useConversionTracking();
  const { ready, variant, config, trackExposure, trackConversion } = useExperiment(HOMEPAGE_EXPERIMENT_KEY);

  useEffect(() => {
    if (!ready) return;

    if (variant) {
      const resolvedVariant: CTAVariant = {
        id: variant.key,
        text:
          (typeof config.ctaText === 'string' && config.ctaText.trim().length > 0
            ? config.ctaText
            : variant.name) || DEFAULT_VARIANT.text,
        className:
          VARIANT_CLASS_MAP[variant.key] ||
          (typeof config.ctaClass === 'string' && config.ctaClass.trim().length > 0
            ? config.ctaClass
            : DEFAULT_VARIANT.className),
      };
      setSelectedVariant(resolvedVariant);
      onVariantSelected?.(resolvedVariant.id);

      trackExposure(window.location.pathname, {
        placement: 'homepage_hero_primary_cta',
      });
    } else {
      setSelectedVariant(DEFAULT_VARIANT);
      onVariantSelected?.(DEFAULT_VARIANT.id);
    }
  }, [ready, variant, config, onVariantSelected, trackExposure]);

  const handleClick = () => {
    conversionTracker.trackSignUpStarted();
    conversionTracker.trackEvent('cta_click', {
      conversion_stage: 'interest',
      test_name: HOMEPAGE_EXPERIMENT_KEY,
      variant_id: selectedVariant.id,
      variant_text: selectedVariant.text,
    });

    trackConversion('sign_up_started', {
      metadata: {
        placement: 'homepage_hero_primary_cta',
        variant_id: selectedVariant.id,
      },
    });
  };

  if (!ready) {
    return (
      <SignUpButton mode="modal">
        <div className={`z-10 flex items-center justify-center ${className}`}>
          <Button size="lg" className={DEFAULT_VARIANT.className}>
            {DEFAULT_VARIANT.text}
          </Button>
        </div>
      </SignUpButton>
    );
  }

  return (
    <SignUpButton mode="modal">
      <div 
        className={`z-10 flex items-center justify-center ${className}`}
        onClick={handleClick}
      >
        <Button size="lg" className={selectedVariant.className || DEFAULT_VARIANT.className}>
          {selectedVariant.text}
        </Button>
      </div>
    </SignUpButton>
  );
};

// Hook to get current variant info
export const useABTestVariant = () => {
  const { variant } = useExperiment(HOMEPAGE_EXPERIMENT_KEY);
  return variant?.key || DEFAULT_VARIANT.id;
};
