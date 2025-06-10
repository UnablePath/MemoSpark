'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';

interface UpgradeButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

export const UpgradeButton: React.FC<UpgradeButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
  variant = 'default',
  size = 'default'
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`${className}`}
      variant={variant}
      size={size}
    >
      <Crown className="h-4 w-4 mr-2" />
      Upgrade to Premium
    </Button>
  );
}; 