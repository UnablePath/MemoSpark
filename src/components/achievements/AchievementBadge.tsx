'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaStar, FaFire, FaClock, FaUsers, FaHeart, FaGraduationCap, FaMedal } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import type { Achievement } from '@/types/achievements';

interface AchievementBadgeProps {
  achievement: Achievement & { 
    userProgress?: number; 
    unlocked?: boolean;
    earnedAt?: string;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'compact' | 'detailed' | 'notification';
  showProgress?: boolean;
  animated?: boolean;
  onClick?: () => void;
  className?: string;
}

const achievementIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'trophy': FaTrophy,
  'star': FaStar,
  'fire': FaFire,
  'clock': FaClock,
  'users': FaUsers,
  'heart': FaHeart,
  'graduation': FaGraduationCap,
  'medal': FaMedal,
};

const achievementColors = {
  'task_completion': {
    bg: 'bg-blue-500',
    border: 'border-blue-600',
    text: 'text-blue-700',
    icon: 'text-blue-600',
    glow: 'shadow-blue-500/20'
  },
  'streak': {
    bg: 'bg-orange-500',
    border: 'border-orange-600',
    text: 'text-orange-700',
    icon: 'text-orange-600',
    glow: 'shadow-orange-500/20'
  },
  'social': {
    bg: 'bg-purple-500',
    border: 'border-purple-600',
    text: 'text-purple-700',
    icon: 'text-purple-600',
    glow: 'shadow-purple-500/20'
  },
  'wellness': {
    bg: 'bg-green-500',
    border: 'border-green-600',
    text: 'text-green-700',
    icon: 'text-green-600',
    glow: 'shadow-green-500/20'
  },
  'tutorial': {
    bg: 'bg-indigo-500',
    border: 'border-indigo-600',
    text: 'text-indigo-700',
    icon: 'text-indigo-600',
    glow: 'shadow-indigo-500/20'
  },
  'points_earned': {
    bg: 'bg-yellow-500',
    border: 'border-yellow-600',
    text: 'text-yellow-700',
    icon: 'text-yellow-600',
    glow: 'shadow-yellow-500/20'
  }
};

const sizeClasses = {
  sm: {
    container: 'w-16 h-16',
    icon: 'w-6 h-6',
    text: 'text-xs',
    title: 'text-sm'
  },
  md: {
    container: 'w-20 h-20',
    icon: 'w-8 h-8',
    text: 'text-sm',
    title: 'text-base'
  },
  lg: {
    container: 'w-24 h-24',
    icon: 'w-10 h-10',
    text: 'text-base',
    title: 'text-lg'
  },
  xl: {
    container: 'w-32 h-32',
    icon: 'w-12 h-12',
    text: 'text-lg',
    title: 'text-xl'
  }
};

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  size = 'md',
  variant = 'default',
  showProgress = false,
  animated = true,
  onClick,
  className
}) => {
  const colors = achievementColors[achievement.type as keyof typeof achievementColors] || achievementColors.task_completion;
  const sizes = sizeClasses[size];
  const IconComponent = achievementIcons[achievement.icon || 'trophy'] || FaTrophy;

  const isUnlocked = achievement.unlocked;
  const progress = achievement.userProgress || 0;

  const baseClasses = cn(
    'relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-300',
    sizes.container,
    isUnlocked ? [
      colors.bg,
      colors.border,
      'shadow-lg',
      colors.glow,
      animated && 'hover:scale-105 hover:shadow-xl'
    ] : [
      'bg-gray-200 dark:bg-gray-700',
      'border-gray-300 dark:border-gray-600',
      'opacity-60'
    ],
    onClick && 'cursor-pointer',
    className
  );

  const iconClasses = cn(
    sizes.icon,
    isUnlocked ? 'text-white' : 'text-gray-400 dark:text-gray-500'
  );

  const renderBadgeContent = () => {
    switch (variant) {
      case 'compact':
        return (
          <div className={baseClasses}>
            <IconComponent className={iconClasses} />
            {showProgress && !isUnlocked && (
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-300">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  {Math.round(progress)}%
                </span>
              </div>
            )}
          </div>
        );

      case 'detailed':
        return (
          <div className={cn(
            'p-4 rounded-xl border-2 max-w-sm',
            isUnlocked ? [
              'bg-white dark:bg-gray-800',
              colors.border,
              'shadow-lg'
            ] : [
              'bg-gray-100 dark:bg-gray-700',
              'border-gray-300 dark:border-gray-600'
            ]
          )}>
            <div className="flex items-center space-x-3 mb-3">
              <div className={cn(
                'p-2 rounded-lg',
                isUnlocked ? colors.bg : 'bg-gray-300 dark:bg-gray-600'
              )}>
                <IconComponent className={cn('w-6 h-6', isUnlocked ? 'text-white' : 'text-gray-500')} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  'font-semibold truncate',
                  isUnlocked ? colors.text : 'text-gray-500 dark:text-gray-400'
                )}>
                  {achievement.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {achievement.description}
                </p>
              </div>
            </div>
            
            {showProgress && !isUnlocked && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className={cn('h-2 rounded-full transition-all duration-300', colors.bg)}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {isUnlocked && achievement.earnedAt && (
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Earned {new Date(achievement.earnedAt).toLocaleDateString()}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className={cn(
                'text-sm font-medium',
                isUnlocked ? colors.text : 'text-gray-500 dark:text-gray-400'
              )}>
                {achievement.points_reward} points
              </span>
              {isUnlocked && (
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                  Unlocked
                </span>
              )}
            </div>
          </div>
        );

      case 'notification':
        return (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className={cn(
              'bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 p-4 min-w-80',
              colors.border
            )}
          >
            <div className="flex items-start space-x-3">
              <div className={cn('p-2 rounded-lg', colors.bg)}>
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Achievement Unlocked!
                </h4>
                <p className={cn('font-medium', colors.text)}>
                  {achievement.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {achievement.description}
                </p>
                <div className="flex items-center mt-2 space-x-4">
                  <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    +{achievement.points_reward} points
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Just now
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return (
          <div className={baseClasses}>
            <IconComponent className={iconClasses} />
            {variant === 'default' && (
              <div className="mt-1 text-center">
                <div className={cn(
                  'font-semibold truncate max-w-full px-1',
                  sizes.text,
                  isUnlocked ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                )}>
                  {achievement.name}
                </div>
                {showProgress && !isUnlocked && (
                  <div className={cn('text-xs', sizes.text, 'text-gray-400 dark:text-gray-500')}>
                    {Math.round(progress)}%
                  </div>
                )}
              </div>
            )}
            
            {/* Unlock animation overlay */}
            {isUnlocked && animated && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-full h-full border-2 border-yellow-400 rounded-xl opacity-30"
                />
              </motion.div>
            )}
          </div>
        );
    }
  };

  return (
    <motion.div
      whileHover={animated ? { scale: 1.05 } : undefined}
      whileTap={animated ? { scale: 0.95 } : undefined}
      onClick={onClick}
    >
      {renderBadgeContent()}
    </motion.div>
  );
};

// Collection component for displaying multiple achievements
interface AchievementCollectionProps {
  achievements: (Achievement & { userProgress?: number; unlocked?: boolean; earnedAt?: string })[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'grid' | 'list' | 'carousel';
  showProgress?: boolean;
  onAchievementClick?: (achievement: Achievement) => void;
  className?: string;
}

export const AchievementCollection: React.FC<AchievementCollectionProps> = ({
  achievements,
  size = 'md',
  variant = 'grid',
  showProgress = true,
  onAchievementClick,
  className
}) => {
  const containerClasses = cn(
    {
      'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4': variant === 'grid',
      'space-y-4': variant === 'list',
      'flex space-x-4 overflow-x-auto pb-4': variant === 'carousel'
    },
    className
  );

  return (
    <div className={containerClasses}>
      {achievements.map((achievement) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          size={size}
          variant={variant === 'list' ? 'detailed' : 'default'}
          showProgress={showProgress}
          onClick={() => onAchievementClick?.(achievement)}
        />
      ))}
    </div>
  );
};

// Notification component for newly unlocked achievements
interface AchievementNotificationProps {
  achievements: Achievement[];
  onDismiss?: (achievementId: string) => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievements,
  onDismiss
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      <AnimatePresence>
        {achievements.map((achievement) => (
          <motion.div
            key={achievement.id}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
          >
            <AchievementBadge
              achievement={achievement}
              variant="notification"
              onClick={() => onDismiss?.(achievement.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};