'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Eye, Lock, Trash2, Clock } from 'lucide-react';
import { CrashoutPost } from '@/lib/supabase/crashoutApi';
import { useAuth } from '@clerk/nextjs';

const moodOptions: Record<string, { bg: string; border: string; emoji: string; label: string }> = {
  stressed: { bg: 'bg-red-500/80', border: 'border-red-400', emoji: '😤', label: 'STRESSED AF' },
  overwhelmed: { bg: 'bg-purple-500/80', border: 'border-purple-400', emoji: '😵‍💫', label: 'OVERWHELMED' },
  frustrated: { bg: 'bg-orange-500/80', border: 'border-orange-400', emoji: '🤬', label: 'FRUSTRATED' },
  anxious: { bg: 'bg-yellow-500/80', border: 'border-yellow-400', emoji: '😬', label: 'ANXIOUS' },
  sad: { bg: 'bg-blue-500/80', border: 'border-blue-400', emoji: '😢', label: 'SAD' },
  angry: { bg: 'bg-red-600/80', border: 'border-red-500', emoji: '😡', label: 'ANGRY' },
  exhausted: { bg: 'bg-gray-500/80', border: 'border-gray-400', emoji: '😴', label: 'EXHAUSTED' },
  excited: { bg: 'bg-green-500/80', border: 'border-green-400', emoji: '🤩', label: 'EXCITED' },
  calm: { bg: 'bg-blue-300/80', border: 'border-blue-300', emoji: '😌', label: 'CALM' },
};

interface PostCardProps {
  post: CrashoutPost;
  moodStyles?: Record<string, { bg: string; border: string; emoji: string; label: string }>; // Keep for compatibility but use new moodOptions
  onReaction: (postId: string, emoji: string) => void;
  onDelete?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onReaction, onDelete }) => {
  const { userId } = useAuth();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const moodStyle = moodOptions[post.mood_type || ''] || moodOptions.stressed;
  
  // Calculate if post is within 10-second deletion window
  useEffect(() => {
    if (!userId || post.user_id !== userId || post.is_private) return;
    
    const postTime = new Date(post.created_at).getTime();
    const now = Date.now();
    const timeSincePost = (now - postTime) / 1000; // seconds
    
    if (timeSincePost < 10) {
      const remaining = Math.ceil(10 - timeSincePost);
      setTimeLeft(remaining);
      
      const timer = setInterval(() => {
        const newTimeSincePost = (Date.now() - postTime) / 1000;
        const newRemaining = Math.ceil(10 - newTimeSincePost);
        
        if (newRemaining <= 0) {
          setTimeLeft(null);
          clearInterval(timer);
        } else {
          setTimeLeft(newRemaining);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [userId, post.user_id, post.created_at, post.is_private]);
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete(post.id);
      setShowDeleteConfirm(false);
    }
  };
  
  const canDelete = userId && post.user_id === userId && !post.is_private && timeLeft !== null;
  
  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const posted = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className={`backdrop-blur-md rounded-2xl p-6 shadow-xl border-l-8 ${moodStyle.border} ${moodStyle.bg}
                     transform hover:scale-[1.02] transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 ${moodStyle.bg} rounded-full flex items-center justify-center text-2xl shadow-inner border-2 border-white/20`}>
            {post.mood_emoji || moodStyle.emoji}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white">Anonymous Crasher</span>
              {post.is_private && <Lock className="h-4 w-4 text-purple-300" />}
            </div>
            <span className="text-xs text-white/60">{formatTimeAgo(post.created_at)}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className="bg-black/20 text-white/80 border-white/20">
            {moodStyle.label}
          </Badge>
          
          {/* Delete button for public posts within 10 seconds */}
          {canDelete && (
            <div className="flex items-center space-x-1">
              {!showDeleteConfirm ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-red-200 border border-red-400/30 h-8 px-2"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  <Clock className="h-3 w-3 mr-1" />
                  {timeLeft}s
                </Button>
              ) : (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="bg-red-500/40 hover:bg-red-500/60 text-red-200 hover:text-white border border-red-400 h-8 px-2"
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="bg-gray-500/40 hover:bg-gray-500/60 text-gray-200 hover:text-white border border-gray-400 h-8 px-2"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title (if exists) */}
      {post.title && (
        <h3 className="text-xl font-bold text-white mb-2">{post.title}</h3>
      )}
      
      {/* Content */}
      <p className="text-lg text-white/90 leading-relaxed mb-4 whitespace-pre-wrap">
        {post.content}
      </p>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="bg-white/10 text-white/80 border-white/20 text-xs"
            >
              #{tag}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Reactions */}
      <div className="flex items-center space-x-2 pt-2 border-t border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReaction(post.id, 'heart')}
          className="bg-black/20 hover:bg-black/40 text-white/80 hover:text-pink-300 transition-colors"
        >
          <Heart className="h-4 w-4 mr-1" />
          {post.reaction_counts.heart}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReaction(post.id, 'wow')}
          className="bg-black/20 hover:bg-black/40 text-white/80 hover:text-yellow-300 transition-colors"
        >
          <Eye className="h-4 w-4 mr-1" />
          {post.reaction_counts.wow}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReaction(post.id, 'hug')}
          className="bg-black/20 hover:bg-black/40 text-white/80 hover:text-blue-300 transition-colors"
        >
          🫂 {post.reaction_counts.hug}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="bg-black/20 hover:bg-black/40 text-white/80 hover:text-green-300 transition-colors ml-auto"
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          {post.reaction_counts.comment}
        </Button>
      </div>
    </div>
  );
}; 