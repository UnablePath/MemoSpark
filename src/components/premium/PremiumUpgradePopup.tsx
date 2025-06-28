'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Crown, Sparkles, Star, Zap, Gift } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumUpgradePopupProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'launch' | 'feature_gate' | 'general';
  feature?: string;
}

// 5 different message variants for variety
const POPUP_MESSAGES = {
  launch: [
    {
      icon: Gift,
      title: "🚀 Launch Special - Limited Time!",
      description: "Support us during our launch week! Get premium features at launch pricing. These exclusive features won't be available next week!",
      ctaText: "Claim Launch Offer",
      gradient: "from-orange-500 to-pink-500"
    },
    {
      icon: Sparkles,
      title: "✨ Be Part of Our Launch Journey!",
      description: "Help us celebrate our launch by upgrading to premium! Enjoy full access to all features before they're locked behind premium next week.",
      ctaText: "Join the Launch",
      gradient: "from-blue-500 to-purple-500"
    },
    {
      icon: Star,
      title: "⭐ Launch Week Exclusive Access",
      description: "You're experiencing our premium features for free during launch! Secure your access now - these features become premium-only next week.",
      ctaText: "Secure Premium Access",
      gradient: "from-green-500 to-blue-500"
    },
    {
      icon: Zap,
      title: "⚡ Last Chance: Launch Pricing",
      description: "Support MemoSpark's launch with special pricing! Get lifetime access to features that will be premium-only after our launch period.",
      ctaText: "Support Our Launch",
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      icon: Crown,
      title: "👑 Launch Founder's Premium",
      description: "Become a founding premium member! Show your support during our launch week and keep access to all features beyond the free trial period.",
      ctaText: "Become a Founder",
      gradient: "from-purple-500 to-pink-500"
    }
  ],
  general: [
    {
      icon: Crown,
      title: "Unlock Premium Features",
      description: "Upgrade to premium and unlock advanced AI suggestions, unlimited tasks, and priority support. Transform your study experience!",
      ctaText: "Upgrade to Premium",
      gradient: "from-green-500 to-blue-500"
    },
    {
      icon: Sparkles,
      title: "Supercharge Your Studies",
      description: "Ready to take your learning to the next level? Premium gives you AI-powered study planning and advanced analytics.",
      ctaText: "Get Premium Now",
      gradient: "from-blue-500 to-purple-500"
    },
    {
      icon: Zap,
      title: "Study Smarter, Not Harder",
      description: "Premium users get 10x more AI requests, smart scheduling, and advanced features. Make every study session count!",
      ctaText: "Upgrade Today",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Star,
      title: "Join Premium Students",
      description: "Thousands of students are already using premium features to boost their productivity. Don't get left behind!",
      ctaText: "Join Premium",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: Gift,
      title: "Premium Perks Await",
      description: "Unlock voice notes, premium AI features, priority support, and unlimited access. Your studies deserve the premium treatment!",
      ctaText: "Claim Premium",
      gradient: "from-cyan-500 to-blue-500"
    }
  ],
  feature_gate: [
    {
      icon: Crown,
      title: "Premium Feature Required",
      description: "This feature is available to premium users only. Upgrade now to unlock this and many other advanced features!",
      ctaText: "Upgrade to Access",
      gradient: "from-green-500 to-blue-500"
    },
    {
      icon: Sparkles,
      title: "Unlock Advanced Features",
      description: "You've discovered a premium feature! Upgrade your account to access this and unlock your full potential.",
      ctaText: "Get Premium Access",
      gradient: "from-blue-500 to-purple-500"
    },
    {
      icon: Zap,
      title: "Premium Only",
      description: "This powerful feature is designed for our premium users. Upgrade now and unlock this plus many more advanced tools!",
      ctaText: "Upgrade Now",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Star,
      title: "Enhanced Experience Awaits",
      description: "Premium users get access to this feature and 10x more possibilities. Transform your study experience today!",
      ctaText: "Go Premium",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: Gift,
      title: "Premium Benefit",
      description: "Congratulations! You've found a premium feature. Upgrade your account to use this and unlock your complete toolkit.",
      ctaText: "Unlock Premium",
      gradient: "from-cyan-500 to-blue-500"
    }
  ]
};

export const PremiumUpgradePopup: React.FC<PremiumUpgradePopupProps> = ({
  isOpen,
  onClose,
  mode,
  feature
}) => {
  const router = useRouter();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Randomly select a message variant when the popup opens
  useEffect(() => {
    if (isOpen) {
      const messages = POPUP_MESSAGES[mode];
      const randomIndex = Math.floor(Math.random() * messages.length);
      setCurrentMessageIndex(randomIndex);
    }
  }, [isOpen, mode]);

  const handleUpgrade = () => {
    onClose();
    router.push('/settings/subscription');
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  const messages = POPUP_MESSAGES[mode];
  const currentMessage = messages[currentMessageIndex];
  const IconComponent = currentMessage.icon;

  return (
    <AnimatePresence>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md mx-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Card className="border-0 shadow-none">
              <div className="relative overflow-hidden rounded-lg">
                {/* Gradient background */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${currentMessage.gradient} opacity-10`}
                />
                
                {/* DialogContent already provides a close button, no need for manual one */}

                <div className="relative p-6">
                  <DialogHeader className="text-center space-y-4">
                    {/* Animated icon */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                      className="mx-auto"
                    >
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${currentMessage.gradient} flex items-center justify-center`}>
                        <IconComponent className="h-8 w-8 text-white" />
                      </div>
                    </motion.div>

                    <DialogTitle className="text-xl font-bold text-center">
                      {currentMessage.title}
                    </DialogTitle>
                    
                    <DialogDescription className="text-center text-muted-foreground leading-relaxed">
                      {feature && mode === 'feature_gate' 
                        ? `${currentMessage.description} Feature: ${feature}`
                        : currentMessage.description
                      }
                    </DialogDescription>
                  </DialogHeader>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-3 mt-6">
                    <Button
                      onClick={handleUpgrade}
                      className={`w-full bg-gradient-to-r ${currentMessage.gradient} hover:opacity-90 text-white font-semibold`}
                      size="lg"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      {currentMessage.ctaText}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={handleClose}
                      className="w-full text-muted-foreground hover:text-foreground"
                    >
                      Maybe later
                    </Button>
                  </div>

                  {/* Additional info for launch mode */}
                  {mode === 'launch' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                    >
                      <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
                        🎉 Launch special pricing available for a limited time only!
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}; 