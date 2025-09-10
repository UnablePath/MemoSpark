'use client';

import React, { useState, useEffect } from 'react';
import { SignUpButton } from '@clerk/nextjs';
import AnimatedShinyText from "@/components/ui/animated-shiny-text";
import { useConversionTracking } from '@/lib/analytics/conversionTracking';

interface CTAVariant {
  id: string;
  text: string;
  icon?: string;
  className?: string;
}

const CTA_VARIANTS: CTAVariant[] = [
  {
    id: 'sign-up-free',
    text: '✨ Sign Up Free',
    className: 'bg-primary text-primary-foreground',
  },
  {
    id: 'start-learning',
    text: '🚀 Start Learning Now',
    className: 'bg-green-600 text-white hover:bg-green-700',
  },
  {
    id: 'join-memospark',
    text: '🎯 Join MemoSpark',
    className: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  {
    id: 'get-started',
    text: '⚡ Get Started Today',
    className: 'bg-purple-600 text-white hover:bg-purple-700',
  },
];

interface ABTestCTAProps {
  className?: string;
  onVariantSelected?: (variantId: string) => void;
}

export const ABTestCTA: React.FC<ABTestCTAProps> = ({ 
  className,
  onVariantSelected 
}) => {
  const [selectedVariant, setSelectedVariant] = useState<CTAVariant | null>(null);
  const conversionTracker = useConversionTracking();

  useEffect(() => {
    // Get or set variant from localStorage for consistent experience
    const storedVariantId = localStorage.getItem('cta_variant');
    
    let variant: CTAVariant;
    
    if (storedVariantId) {
      // Use stored variant if it exists
      variant = CTA_VARIANTS.find(v => v.id === storedVariantId) || CTA_VARIANTS[0];
    } else {
      // Randomly select a variant for new users
      const randomIndex = Math.floor(Math.random() * CTA_VARIANTS.length);
      variant = CTA_VARIANTS[randomIndex];
      
      // Store the selected variant
      localStorage.setItem('cta_variant', variant.id);
      
      // Track the variant selection for analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'ab_test_variant_assigned', {
          variant_id: variant.id,
          variant_text: variant.text,
          test_name: 'landing_page_cta',
        });
      }
    }
    
    setSelectedVariant(variant);
    onVariantSelected?.(variant.id);
  }, [onVariantSelected]);

  const handleClick = () => {
    if (selectedVariant) {
      // Track sign-up started
      conversionTracker.trackSignUpStarted();
      
      // Track CTA click with variant info
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'cta_click', {
          variant_id: selectedVariant.id,
          variant_text: selectedVariant.text,
          test_name: 'landing_page_cta',
        });
      }
      
      // Track conversion event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cta_clicked', {
          detail: {
            variantId: selectedVariant.id,
            variantText: selectedVariant.text,
          }
        }));
      }
    }
  };

  if (!selectedVariant) {
    // Fallback while loading
    return (
      <SignUpButton mode="modal">
        <div className={`z-10 flex items-center justify-center ${className}`}>
          <AnimatedShinyText className="inline-flex items-center justify-center rounded-lg border border-border bg-primary text-primary-foreground px-6 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
            <span>✨ Sign Up Free</span>
          </AnimatedShinyText>
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
        <AnimatedShinyText 
          className={`inline-flex items-center justify-center rounded-lg border border-border px-6 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${selectedVariant.className || 'bg-primary text-primary-foreground'}`}
        >
          <span>{selectedVariant.text}</span>
        </AnimatedShinyText>
      </div>
    </SignUpButton>
  );
};

// Hook to get current variant info
export const useABTestVariant = () => {
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    const storedVariant = localStorage.getItem('cta_variant');
    setVariant(storedVariant);
  }, []);

  return variant;
};
