'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTwitter, FaFacebook, FaLinkedin, FaWhatsapp, FaCopy, FaDownload, FaShare } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AchievementBadge } from './AchievementBadge';
import type { Achievement } from '@/types/achievements';

interface AchievementSharingProps {
  achievement: Achievement & { earnedAt?: string };
  userStats?: {
    totalPoints: number;
    level: number;
    currentStreak: number;
  };
  children?: React.ReactNode;
}

export const AchievementSharing: React.FC<AchievementSharingProps> = ({
  achievement,
  userStats,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const { toast } = useToast();

  const shareData = {
    title: `Achievement Unlocked: ${achievement.name}`,
    description: achievement.description,
    url: window.location.origin,
    hashtags: ['MemoSpark', 'Achievement', 'Learning', 'Productivity']
  };

  const generateShareText = (platform: string = 'generic') => {
    const baseText = `🎉 Just unlocked "${achievement.name}" on MemoSpark! ${achievement.description}`;
    const statsText = userStats ? `\n\n📊 My Stats:\n🏆 Level ${userStats.level}\n⭐ ${userStats.totalPoints} points\n🔥 ${userStats.currentStreak} day streak` : '';
    const urlText = `\n\n🚀 Join me on MemoSpark: ${shareData.url}`;
    const hashtagText = platform === 'twitter' ? `\n\n${shareData.hashtags.map(tag => `#${tag}`).join(' ')}` : '';
    
    return customMessage || `${baseText}${statsText}${urlText}${hashtagText}`;
  };

  const shareToTwitter = () => {
    const text = generateShareText('twitter');
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}&quote=${encodeURIComponent(generateShareText('facebook'))}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}&title=${encodeURIComponent(shareData.title)}&summary=${encodeURIComponent(generateShareText('linkedin'))}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToWhatsApp = () => {
    const text = generateShareText('whatsapp');
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      toast({
        title: "Copied to clipboard!",
        description: "Achievement share text has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadAchievementImage = () => {
    // Create a canvas to generate achievement image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Achievement card background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.roundRect(50, 50, canvas.width - 100, canvas.height - 100, 20);
    ctx.fill();

    // Title
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Achievement Unlocked!', canvas.width / 2, 150);

    // Achievement name
    ctx.fillStyle = '#3730a3';
    ctx.font = 'bold 48px Arial';
    ctx.fillText(achievement.name, canvas.width / 2, 220);

    // Description
    ctx.fillStyle = '#6b7280';
    ctx.font = '24px Arial';
    ctx.fillText(achievement.description, canvas.width / 2, 270);

    // Points
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`+${achievement.points_reward} Points`, canvas.width / 2, 350);

    // MemoSpark branding
    ctx.fillStyle = '#9ca3af';
    ctx.font = '20px Arial';
    ctx.fillText('MemoSpark - Your Study Companion', canvas.width / 2, 500);

    // Download the image
    const link = document.createElement('a');
    link.download = `achievement-${achievement.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL();
    link.click();

    toast({
      title: "Downloaded!",
      description: "Achievement image has been downloaded.",
    });
  };

  const shareViaWebAPI = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: generateShareText(),
          url: shareData.url,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
          toast({
            title: "Sharing failed",
            description: "Could not share via system dialog. Try copying the link instead.",
            variant: "destructive",
          });
        }
      }
    } else {
      // Fallback to copy to clipboard
      copyToClipboard();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <FaShare className="w-4 h-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Achievement</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Achievement Preview */}
          <div className="flex flex-col items-center space-y-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
            <AchievementBadge
              achievement={{ ...achievement, unlocked: true }}
              size="lg"
              variant="default"
              animated={false}
            />
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {achievement.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {achievement.description}
              </p>
              <div className="flex items-center justify-center space-x-4 mt-3 text-sm">
                <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                  +{achievement.points_reward} points
                </span>
                {achievement.earnedAt && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {new Date(achievement.earnedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <label htmlFor="custom-message" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Custom Message (Optional)
            </label>
            <Textarea
              id="custom-message"
              placeholder="Add a personal message to your share..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Sharing Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Share Options</h4>
            
            {/* Social Media Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={shareToTwitter}
                className="flex items-center justify-center space-x-2"
              >
                <FaTwitter className="w-4 h-4 text-blue-400" />
                <span>Twitter</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={shareToFacebook}
                className="flex items-center justify-center space-x-2"
              >
                <FaFacebook className="w-4 h-4 text-blue-600" />
                <span>Facebook</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={shareToLinkedIn}
                className="flex items-center justify-center space-x-2"
              >
                <FaLinkedin className="w-4 h-4 text-blue-700" />
                <span>LinkedIn</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={shareToWhatsApp}
                className="flex items-center justify-center space-x-2"
              >
                <FaWhatsapp className="w-4 h-4 text-green-500" />
                <span>WhatsApp</span>
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={copyToClipboard}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <FaCopy className="w-4 h-4" />
                <span>Copy Link</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={downloadAchievementImage}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <FaDownload className="w-4 h-4" />
                <span>Download</span>
              </Button>
            </div>

            {/* Web Share API Button */}
            {navigator.share != null && (
              <Button
                onClick={shareViaWebAPI}
                className="w-full flex items-center justify-center space-x-2"
              >
                <FaShare className="w-4 h-4" />
                <span>Share via System</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Quick share button component
interface QuickShareButtonProps {
  achievement: Achievement & { earnedAt?: string };
  variant?: 'icon' | 'text' | 'full';
  size?: 'sm' | 'md' | 'lg';
}

export const QuickShareButton: React.FC<QuickShareButtonProps> = ({
  achievement,
  variant = 'icon',
  size = 'md'
}) => {
  const buttonSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (variant === 'icon') {
    return (
      <AchievementSharing achievement={achievement}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`${buttonSizes[size]} bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors`}
        >
          <FaShare className={iconSizes[size]} />
        </motion.button>
      </AchievementSharing>
    );
  }

  if (variant === 'text') {
    return (
      <AchievementSharing achievement={achievement}>
        <Button variant="ghost" size={size === 'md' ? 'default' : size as 'sm' | 'lg'} className="text-blue-600 hover:text-blue-700">
          Share Achievement
        </Button>
      </AchievementSharing>
    );
  }

  return (
    <AchievementSharing achievement={achievement}>
      <Button variant="outline" size={size === 'md' ? 'default' : size as 'sm' | 'lg'} className="flex items-center space-x-2">
        <FaShare className={iconSizes[size]} />
        <span>Share</span>
      </Button>
    </AchievementSharing>
  );
};