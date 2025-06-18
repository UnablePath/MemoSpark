'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Eye, Lock, Trash2, Clock, ThumbsUp } from 'lucide-react';
import { CrashoutPost, addReaction, getUserVote, addVote, removeVote, getUserReaction, removeReaction } from '@/lib/supabase/crashoutApi';
import { useAuth } from '@clerk/nextjs';
import { CommentSystem } from './CommentSystem';
import { BorderBeam } from '@/components/ui/border-beam';
import { supabase } from '@/lib/supabase/client';

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
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [userReaction, setUserReaction] = useState<'heart' | 'wow' | 'hug' | null>(null);
  const [reactionCounts, setReactionCounts] = useState(post.reaction_counts);
  const [isVoting, setIsVoting] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(null);
  const moodStyle = moodOptions[post.mood_type || ''] || moodOptions.stressed;
  
  // Fetch user profile if post is not anonymous
  useEffect(() => {
    if (post.is_anonymous === false && post.user_id) {
      const fetchUserProfile = async () => {
        if (!supabase) return;
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('clerk_user_id', post.user_id)
            .single();
          
          if (!error && data) {
            setUserProfile(data);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      };
      
      fetchUserProfile();
    }
  }, [post.is_anonymous, post.user_id]);

  // Load user vote and reaction on mount
  useEffect(() => {
    if (!userId) return;
    
    const loadUserInteractions = async () => {
      try {
        const [vote, reaction] = await Promise.all([
          getUserVote(post.id, userId),
          getUserReaction(post.id, userId)
        ]);
        setUserVote(vote);
        setUserReaction(reaction);
      } catch (error) {
        console.error('Error loading user interactions:', error);
      }
    };
    
    loadUserInteractions();
  }, [userId, post.id]);
  
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

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!userId || isVoting) return;
    
    setIsVoting(true);
    try {
      if (userVote === voteType) {
        // Remove vote if clicking same vote
        await removeVote(post.id, userId);
        setUserVote(null);
        // Update local reaction counts
        setReactionCounts(prev => ({
          ...prev,
          upvotes: voteType === 'up' ? Math.max(0, (prev.upvotes || 0) - 1) : (prev.upvotes || 0),
          downvotes: voteType === 'down' ? Math.max(0, (prev.downvotes || 0) - 1) : (prev.downvotes || 0)
        }));
      } else {
        // Add new vote or change vote
        await addVote(post.id, voteType, userId);
        const oldVote = userVote;
        setUserVote(voteType);
        // Update local reaction counts
        setReactionCounts(prev => ({
          ...prev,
          upvotes: voteType === 'up' 
            ? (prev.upvotes || 0) + 1 
            : oldVote === 'up' 
              ? Math.max(0, (prev.upvotes || 0) - 1) 
              : (prev.upvotes || 0),
          downvotes: voteType === 'down' 
            ? (prev.downvotes || 0) + 1 
            : oldVote === 'down' 
              ? Math.max(0, (prev.downvotes || 0) - 1) 
              : (prev.downvotes || 0)
        }));
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleReaction = async (reactionType: 'heart' | 'wow' | 'hug') => {
    if (!userId || isReacting) return;
    
    setIsReacting(true);
    try {
      if (userReaction === reactionType) {
        // Remove reaction if clicking the same one
        await removeReaction(post.id, userId);
        setUserReaction(null);
        // Update local reaction counts
        setReactionCounts(prev => ({
          ...prev,
          [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1)
        }));
      } else {
        // Add new reaction or switch reaction
        const oldReaction = userReaction;
        await addReaction(post.id, reactionType, userId);
        setUserReaction(reactionType);
        
        // Update local reaction counts
        setReactionCounts(prev => {
          const newCounts = { ...prev };
          
          // Remove old reaction count
          if (oldReaction) {
            newCounts[oldReaction] = Math.max(0, (newCounts[oldReaction] || 0) - 1);
          }
          
          // Add new reaction count
          newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
          
          return newCounts;
        });
      }
      
      // Call parent callback if provided
      if (onReaction) {
        onReaction(post.id, reactionType);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    } finally {
      setIsReacting(false);
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
    <div className={`relative backdrop-blur-md rounded-2xl p-6 shadow-xl border-l-8 ${moodStyle.border} ${moodStyle.bg}
                     transform hover:scale-[1.02] transition-all duration-200 overflow-hidden`}>
      <BorderBeam 
        size={120}
        duration={12}
        colorFrom="#A855F7"
        colorTo="#3B82F6"
        className="opacity-50"
        delay={Math.random() * 5}
      />
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 ${moodStyle.bg} rounded-full flex items-center justify-center text-2xl shadow-inner border-2 border-white/20`}>
            {post.mood_emoji || moodStyle.emoji}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white">
                {post.is_anonymous === false && userProfile?.full_name 
                  ? userProfile.full_name 
                  : 'Anonymous Crasher'
                }
              </span>
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
      
      {/* Reactions & Voting */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        {/* Voting Section */}
        <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
            onClick={() => handleVote('up')}
            disabled={isVoting}
            title="This helps me / Good advice"
            className={`bg-black/20 hover:bg-black/40 transition-colors flex-shrink-0 ${
              userVote === 'up' ? 'bg-green-500/30 text-green-300' : 'text-white/80 hover:text-green-300'
            }`}
        >
            <span className="mr-1 text-base">👍</span>
            <span className="text-sm">{reactionCounts.upvotes || 0}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
            onClick={() => handleVote('down')}
            disabled={isVoting}
            title="Not helpful / Bad advice"
            className={`bg-black/20 hover:bg-black/40 transition-colors flex-shrink-0 ${
              userVote === 'down' ? 'bg-red-500/30 text-red-300' : 'text-white/80 hover:text-red-300'
            }`}
          >
            <span className="mr-1 text-base">👎</span>
            <span className="text-sm">{reactionCounts.downvotes || 0}</span>
          </Button>
        </div>

        {/* Support Reactions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('heart')}
            disabled={isReacting}
            className={`bg-black/20 hover:bg-black/40 transition-colors flex-shrink-0 ${
              userReaction === 'heart' 
                ? 'bg-pink-500/30 text-pink-300 ring-2 ring-pink-400' 
                : 'text-white/80 hover:text-pink-300'
            }`}
            title="Send support"
        >
            <span className="mr-1 text-base">💜</span>
            <span className="text-sm">{reactionCounts.heart || 0}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
            onClick={() => handleReaction('hug')}
            disabled={isReacting}
            className={`bg-black/20 hover:bg-black/40 transition-colors flex-shrink-0 ${
              userReaction === 'hug' 
                ? 'bg-blue-500/30 text-blue-300 ring-2 ring-blue-400' 
                : 'text-white/80 hover:text-blue-300'
            }`}
            title="Send a virtual hug"
        >
            <span className="mr-1 text-base">🤗</span>
            <span className="text-sm">{reactionCounts.hug || 0}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
            onClick={() => handleReaction('wow')}
            disabled={isReacting}
            className={`bg-black/20 hover:bg-black/40 transition-colors flex-shrink-0 ${
              userReaction === 'wow' 
                ? 'bg-yellow-500/30 text-yellow-300 ring-2 ring-yellow-400' 
                : 'text-white/80 hover:text-yellow-300'
            }`}
            title="I feel you / Relatable"
        >
            <span className="mr-1 text-base">🫂</span>
            <span className="text-sm">{reactionCounts.wow || 0}</span>
        </Button>
        </div>
      </div>

      {/* Comment System */}
      <CommentSystem
        postId={post.id}
        className="mt-3"
      />
    </div>
  );
}; 