// Achievement Badge SVG Components
import React from 'react';

export const FirstTaskBadge: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#firstTaskGradient)" stroke="#3B82F6" strokeWidth="3"/>
    <path d="M35 50l10 10 20-20" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="firstTaskGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60A5FA"/>
        <stop offset="100%" stopColor="#3B82F6"/>
      </linearGradient>
    </defs>
  </svg>
);

export const StreakMasterBadge: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#streakGradient)" stroke="#F97316" strokeWidth="3"/>
    <path d="M40 25 L50 40 L60 25 L55 40 L65 35 L50 55 L35 35 L45 40 Z" 
          fill="white" stroke="white" strokeWidth="1"/>
    <defs>
      <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FB923C"/>
        <stop offset="100%" stopColor="#F97316"/>
      </linearGradient>
    </defs>
  </svg>
);

export const SocialButterfly: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#socialGradient)" stroke="#8B5CF6" strokeWidth="3"/>
    <circle cx="40" cy="40" r="8" fill="white"/>
    <circle cx="60" cy="40" r="8" fill="white"/>
    <circle cx="50" cy="55" r="12" fill="white"/>
    <path d="M42 52 Q50 58 58 52" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="socialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A78BFA"/>
        <stop offset="100%" stopColor="#8B5CF6"/>
      </linearGradient>
    </defs>
  </svg>
);

export const WellnessMaster: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#wellnessGradient)" stroke="#10B981" strokeWidth="3"/>
    <path d="M50 25 C42 32, 30 42, 30 55 C30 68, 42 75, 50 75 C58 75, 70 68, 70 55 C70 42, 58 32, 50 25 Z" 
          fill="white"/>
    <defs>
      <linearGradient id="wellnessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34D399"/>
        <stop offset="100%" stopColor="#10B981"/>
      </linearGradient>
    </defs>
  </svg>
);

export const TutorialMaster: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#tutorialGradient)" stroke="#6366F1" strokeWidth="3"/>
    <path d="M35 35 L65 35 L65 65 L50 55 L35 65 Z" fill="white"/>
    <circle cx="50" cy="42" r="3" fill="#6366F1"/>
    <defs>
      <linearGradient id="tutorialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818CF8"/>
        <stop offset="100%" stopColor="#6366F1"/>
      </linearGradient>
    </defs>
  </svg>
);

export const PointsMaster: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#pointsGradient)" stroke="#F59E0B" strokeWidth="3"/>
    <polygon points="50,25 60,45 80,45 65,58 70,78 50,65 30,78 35,58 20,45 40,45" fill="white"/>
    <defs>
      <linearGradient id="pointsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FCD34D"/>
        <stop offset="100%" stopColor="#F59E0B"/>
      </linearGradient>
    </defs>
  </svg>
);

export const EarlyBird: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#earlyBirdGradient)" stroke="#06B6D4" strokeWidth="3"/>
    <ellipse cx="45" cy="45" rx="15" ry="20" fill="white"/>
    <circle cx="42" cy="40" r="3" fill="#06B6D4"/>
    <path d="M35 45 Q25 40 20 45" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <path d="M60 55 L70 50 L65 60 Z" fill="white"/>
    <defs>
      <linearGradient id="earlyBirdGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67E8F9"/>
        <stop offset="100%" stopColor="#06B6D4"/>
      </linearGradient>
    </defs>
  </svg>
);

export const StudyMachine: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#studyMachineGradient)" stroke="#DC2626" strokeWidth="3"/>
    <rect x="35" y="35" width="30" height="20" rx="2" fill="white"/>
    <rect x="37" y="37" width="26" height="3" fill="#DC2626"/>
    <rect x="37" y="42" width="20" height="2" fill="#DC2626"/>
    <rect x="37" y="46" width="22" height="2" fill="#DC2626"/>
    <rect x="37" y="50" width="18" height="2" fill="#DC2626"/>
    <rect x="40" y="60" width="20" height="8" rx="1" fill="white"/>
    <defs>
      <linearGradient id="studyMachineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F87171"/>
        <stop offset="100%" stopColor="#DC2626"/>
      </linearGradient>
    </defs>
  </svg>
);

// Achievement Badge SVG mapping
export const achievementBadges = {
  'first_task': FirstTaskBadge,
  'streak_master': StreakMasterBadge,
  'social_butterfly': SocialButterfly,
  'wellness_master': WellnessMaster,
  'tutorial_master': TutorialMaster,
  'points_master': PointsMaster,
  'early_bird': EarlyBird,
  'study_machine': StudyMachine,
} as const;

export type AchievementBadgeType = keyof typeof achievementBadges;

// Helper function to get achievement badge component
export const getAchievementBadge = (badgeType: string): React.FC<{ className?: string }> => {
  return achievementBadges[badgeType as AchievementBadgeType] || FirstTaskBadge;
}; 