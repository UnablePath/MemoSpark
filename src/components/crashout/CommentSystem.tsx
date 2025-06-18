'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Heart, Flag, Trash2, Clock } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { addComment, getCommentsForPost } from '@/lib/supabase/crashoutApi';

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  moderated_at?: string;
  moderated_by?: string;
  created_at: string;
  updated_at: string;
}

interface CommentSystemProps {
  postId: string;
  initialComments?: Comment[];
  onCommentAdd?: (comment: Comment) => void;
  onCommentDelete?: (commentId: string) => void;
  className?: string;
}

export const CommentSystem: React.FC<CommentSystemProps> = ({
  postId,
  initialComments = [],
  onCommentAdd,
  onCommentDelete,
  className = ''
}) => {
  const { userId } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);

  // Load comments on mount
  useEffect(() => {
    const loadComments = async () => {
      try {
        const loadedComments = await getCommentsForPost(postId);
        setComments(loadedComments as Comment[]);
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    };
    
    loadComments();
  }, [postId]);

  // Add comment using real API
  const handleAddComment = async () => {
    if (!newComment.trim() || !userId) return;

    setIsLoading(true);
    try {
      const newCommentData = await addComment(postId, newComment.trim(), userId);
      
      const comment: Comment = {
        ...newCommentData,
        is_deleted: false,
        moderated_at: undefined,
        moderated_by: undefined
      };

      setComments(prev => [...prev, comment]);
      setNewComment('');
      
      if (onCommentAdd) {
        onCommentAdd(comment);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock function to delete comment - replace with actual API call
  const handleDeleteComment = async (commentId: string) => {
    setDeletingComment(commentId);
    try {
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      if (onCommentDelete) {
        onCommentDelete(commentId);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setDeletingComment(null);
    }
  };

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

  // Check if comment is within deletion window (10 seconds)
  const canDeleteComment = (comment: Comment) => {
    if (comment.user_id !== userId) return false;
    const commentTime = new Date(comment.created_at).getTime();
    const now = Date.now();
    const timeSinceComment = (now - commentTime) / 1000;
    return timeSinceComment < 10;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Comment Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowComments(!showComments)}
        className="bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors w-full sm:w-auto"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        <span className="text-sm">
          {comments.length > 0 ? `${comments.length} Comments` : 'Add Comment'}
        </span>
      </Button>

      {/* Comments Section */}
      {showComments && (
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-3 sm:p-4 space-y-4">
            {/* Existing Comments */}
            {comments.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-white/5 rounded-lg p-3 border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-purple-500/80 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white">A</span>
                        </div>
                        <div>
                          <span className="text-xs text-white/80 font-medium">
                            Anonymous Crasher
                          </span>
                          <span className="text-xs text-white/50 ml-2">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Delete button for own comments within 10 seconds */}
                      {canDeleteComment(comment) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingComment === comment.id}
                          className="bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-red-200 border border-red-400/30 h-6 px-2"
                        >
                          {deletingComment === comment.id ? (
                            <div className="h-3 w-3 border border-red-300 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3 mr-1" />
                              <Clock className="h-3 w-3" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    
                    <p className="text-sm text-white/90 leading-relaxed break-words">
                      {comment.content}
                    </p>

                    {/* Comment Actions */}
                    <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-white/10">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-pink-300 transition-colors p-1 h-auto"
                      >
                        <Heart className="h-3 w-3 mr-1" />
                        <span className="text-xs">0</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-red-300 transition-colors p-1 h-auto"
                      >
                        <Flag className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Form */}
            {userId && (
              <div className="space-y-3 pt-3 border-t border-white/10">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="min-h-[80px] bg-white/5 border-white/20 text-white placeholder-white/50 focus:border-purple-400 resize-none text-sm"
                  disabled={isLoading}
                />
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/60">
                    Anonymous • 10s deletion window
                  </div>
                  
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isLoading}
                    size="sm"
                    className="bg-purple-600/80 hover:bg-purple-600 text-white border-purple-500/50"
                  >
                    {isLoading ? (
                      <div className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Send className="h-3 w-3 mr-2" />
                    )}
                    <span className="text-xs">Post</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Login prompt for non-authenticated users */}
            {!userId && (
              <div className="text-center py-4 border-t border-white/10">
                <p className="text-sm text-white/60 mb-2">
                  Sign in to join the conversation
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                >
                  Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 