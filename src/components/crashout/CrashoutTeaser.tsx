'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Crown, 
  Lock, 
  ThumbsUp,
  Eye,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserTier } from '@/hooks/useUserTier';
import { usePremiumPopup } from '@/components/providers/premium-popup-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CrashoutPost {
  id: string;
  author: {
    name: string;
    avatar?: string;
    tier: 'free' | 'premium';
  };
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  isHot?: boolean;
  category: 'study-fail' | 'exam-stress' | 'group-project' | 'deadline' | 'motivation';
}

const SAMPLE_POSTS: CrashoutPost[] = [
  {
    id: '1',
    author: { name: 'Alex K.', tier: 'premium' },
    content: 'Studied for 12 hours straight for my organic chemistry exam... only to realize I was studying the wrong chapter the entire time! 😭 Anyone else had this happen?',
    timestamp: '2 hours ago',
    likes: 42,
    comments: 18,
    shares: 5,
    isHot: true,
    category: 'study-fail'
  },
  {
    id: '2',
    author: { name: 'Sarah M.', tier: 'free' },
    content: 'That moment when your group project partners disappear 2 days before the deadline and you have to do everything yourself... 🔥🔥🔥',
    timestamp: '4 hours ago',
    likes: 67,
    comments: 23,
    shares: 12,
    isHot: true,
    category: 'group-project'
  },
  {
    id: '3',
    author: { name: 'Mike R.', tier: 'premium' },
    content: 'Coffee machine broke at 3 AM during finals week. This is not a drill. I repeat, this is NOT A DRILL! ☕💀',
    timestamp: '6 hours ago',
    likes: 89,
    comments: 31,
    shares: 8,
    category: 'exam-stress'
  },
  {
    id: '4',
    author: { name: 'Lisa T.', tier: 'free' },
    content: 'Professor: "This exam will be easy" Also Professor: *Creates 50-question nightmare that covers material from parallel universe* 🤡',
    timestamp: '8 hours ago',
    likes: 156,
    comments: 42,
    shares: 28,
    isHot: true,
    category: 'exam-stress'
  },
  {
    id: '5',
    author: { name: 'David L.', tier: 'premium' },
    content: 'Successfully pulled an all-nighter, submitted assignment at 11:59 PM... then realized it was due at 11:59 AM. F in the chat boys 📚💥',
    timestamp: '12 hours ago',
    likes: 201,
    comments: 67,
    shares: 45,
    category: 'deadline'
  }
];

const getCategoryEmoji = (category: CrashoutPost['category']) => {
  switch (category) {
    case 'study-fail': return '📚💥';
    case 'exam-stress': return '😰📝';
    case 'group-project': return '👥🔥';
    case 'deadline': return '⏰💀';
    case 'motivation': return '💪✨';
    default: return '🔥';
  }
};

const getCategoryLabel = (category: CrashoutPost['category']) => {
  switch (category) {
    case 'study-fail': return 'Study Fail';
    case 'exam-stress': return 'Exam Stress';
    case 'group-project': return 'Group Drama';
    case 'deadline': return 'Deadline Panic';
    case 'motivation': return 'Motivation';
    default: return 'General';
  }
};

interface CrashoutTeaserProps {
  className?: string;
}

export const CrashoutTeaser: React.FC<CrashoutTeaserProps> = ({ className }) => {
  const { tier } = useUserTier();
  const { showFeatureGatePopup } = usePremiumPopup();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  
  const isPremium = tier === 'premium';

  const handleReaction = (postId: string, action: 'like' | 'comment' | 'share') => {
    if (!isPremium) {
      // Show different messages based on action
      const messages = {
        like: 'Like and React to Posts',
        comment: 'Comment on Posts',
        share: 'Share Posts'
      };
      
      showFeatureGatePopup(messages[action]);
      
      // Show teaser toast
      toast.info("🔥 Premium users can fully interact with crashout posts!", {
        description: "Upgrade to like, comment, and share your study struggles!"
      });
      return;
    }

    // Premium users can interact
    if (action === 'like') {
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
    }
    
    toast.success(`Post ${action}d!`);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with teaser for free users */}
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-dashed border-orange-300 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-2xl">🔥</span>
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                      Crashout Room Preview
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      See what's trending, but upgrade to fully participate!
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => showFeatureGatePopup('Full Crashout Access')}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Unlock Full Access
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {SAMPLE_POSTS.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn(
              "relative overflow-hidden transition-all duration-200 hover:shadow-md",
              !isPremium && "cursor-default"
            )}>
              {/* Hot Post Indicator */}
              {post.isHot && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse">
                    🔥 Hot
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.author.avatar} />
                      <AvatarFallback>
                        {post.author.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{post.author.name}</span>
                        {post.author.tier === 'premium' && (
                          <Crown className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {post.timestamp}
                        <Badge variant="outline" className="text-xs">
                          {getCategoryEmoji(post.category)} {getCategoryLabel(post.category)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed mb-4">
                  {post.content}
                </p>

                {/* Interaction Stats */}
                <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{post.likes + post.comments + post.shares} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{post.likes} likes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    <span>{post.comments} comments</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Share2 className="h-3 w-3" />
                    <span>{post.shares} shares</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={likedPosts.has(post.id) ? "default" : "outline"}
                    className={cn(
                      "flex-1 gap-1 transition-all",
                      !isPremium && "opacity-60",
                      likedPosts.has(post.id) && "bg-red-500 hover:bg-red-600 text-white"
                    )}
                    onClick={() => handleReaction(post.id, 'like')}
                  >
                    <Heart className={cn(
                      "h-3 w-3", 
                      likedPosts.has(post.id) && "fill-current"
                    )} />
                    {isPremium ? 'Like' : 'Like'}
                    {!isPremium && <Lock className="h-3 w-3" />}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className={cn("flex-1 gap-1", !isPremium && "opacity-60")}
                    onClick={() => handleReaction(post.id, 'comment')}
                  >
                    <MessageCircle className="h-3 w-3" />
                    {isPremium ? 'Comment' : 'Comment'}
                    {!isPremium && <Lock className="h-3 w-3" />}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className={cn("flex-1 gap-1", !isPremium && "opacity-60")}
                    onClick={() => handleReaction(post.id, 'share')}
                  >
                    <Share2 className="h-3 w-3" />
                    {isPremium ? 'Share' : 'Share'}
                    {!isPremium && <Lock className="h-3 w-3" />}
                  </Button>
                </div>

                {/* Free User Overlay Hint */}
                {!isPremium && (
                  <div className="mt-3 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground hover:text-primary"
                      onClick={() => showFeatureGatePopup('Full Crashout Access')}
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Upgrade to fully participate in crashout discussions
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Load More Teaser */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center py-6"
      >
        {isPremium ? (
          <Button className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Load More Crashouts
          </Button>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-3">
                <div className="text-4xl">🔥</div>
                <h3 className="font-semibold">More Epic Crashouts Await!</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Premium users can see unlimited crashout posts, create their own, and fully engage with the community.
                </p>
                <Button
                  onClick={() => showFeatureGatePopup('Unlimited Crashout Posts')}
                  className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  <Crown className="h-4 w-4" />
                  Unlock Full Crashout Experience
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}; 