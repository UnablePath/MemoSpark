'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Crown, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubscriptionTier } from '@/types/subscription';

const tierBadgeVariants = cva(
  "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border",
  {
    variants: {
      tier: {
        free: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
        premium: "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-300 dark:from-purple-900/30 dark:to-blue-900/30 dark:text-purple-300 dark:border-purple-600",
        enterprise: "bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 border-yellow-300 dark:from-yellow-900/30 dark:to-orange-900/30 dark:text-yellow-300 dark:border-yellow-600"
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs",
        default: "px-2 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm"
      }
    },
    defaultVariants: {
      tier: "free",
      size: "default"
    }
  }
);

interface TierBadgeProps extends VariantProps<typeof tierBadgeVariants> {
  tier: SubscriptionTier;
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
}

const tierConfig = {
  free: {
    label: 'Free',
    icon: Zap,
    description: 'Basic features'
  },
  premium: {
    label: 'Premium',
    icon: Star,
    description: 'Advanced AI features'
  },
  enterprise: {
    label: 'Enterprise',
    icon: Crown,
    description: 'Full feature access'
  }
} as const;

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  size,
  className,
  showIcon = true,
  showLabel = true,
  ...props
}) => {
  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <span
      className={cn(tierBadgeVariants({ tier, size }), className)}
      title={config.description}
      {...props}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {showLabel && config.label}
    </span>
  );
};

export default TierBadge; 