'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { useCrashoutPosts } from '@/hooks/useCrashoutPosts';
import { PostCard } from './PostCard';
import { Loader2 } from 'lucide-react';

interface PostFeedProps {
  filter: 'latest' | 'popular' | 'trending' | 'top';
  includePrivate?: boolean;
}

export const PostFeed: React.FC<PostFeedProps> = ({ 
  filter,
  includePrivate = false 
}) => {
  const {
    posts,
    loading,
    error,
    hasMore,
    loadMore,
    isLoadingMore
  } = useCrashoutPosts({
    filter,
    includePrivate,
    initialLimit: 5
  });

  // Intersection observer ref for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for infinite scroll
  const lastPostElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || isLoadingMore) return;
    
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px'
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, isLoadingMore, hasMore, loadMore]);

  // Cleanup observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Handle reaction on posts
  const handleReaction = (postId: string, emoji: string) => {
    // For now, just log the reaction
    // This can be enhanced to update the UI optimistically
    console.log(`Reaction ${emoji} added to post ${postId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading posts...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Failed to load posts</div>
        <div className="text-sm text-muted-foreground">{error}</div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-2xl mb-2">📝</div>
        <div className="text-lg font-medium mb-1">No posts yet</div>
        <div className="text-sm text-muted-foreground">
          {filter === 'latest' && !hasMore ? 
            "Be the first to share your thoughts!" :
            `No ${filter} posts found.`
          }
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Posts List */}
      {posts.map((post, index) => {
        const isLastPost = index === posts.length - 1;
        
        return (
          <div
            key={post.id}
            ref={isLastPost ? lastPostElementRef : undefined}
            className="relative"
          >
            <PostCard 
              post={post} 
              onReaction={handleReaction}
            />
          </div>
        );
      })}

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className="flex justify-center items-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">
            Loading more posts...
          </span>
        </div>
      )}

      {/* End of Posts Indicator */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8">
          <div className="text-sm text-muted-foreground">
            🎉 You've reached the end! 
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {filter === 'latest' ? 
              "That's all for now. Check back later for new posts!" :
              `No more ${filter} posts to load.`
            }
          </div>
        </div>
      )}

      {/* Fallback Load More Button (if intersection observer fails) */}
      {hasMore && !isLoadingMore && posts.length >= 5 && (
        <div className="text-center py-6">
          <button
            onClick={loadMore}
            className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 
                       rounded-lg transition-colors duration-200"
          >
            Load More Posts
          </button>
        </div>
      )}
    </div>
  );
}; 