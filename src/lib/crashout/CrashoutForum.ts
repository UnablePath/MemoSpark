import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase/client';
import { CrashoutPost, CrashoutPostInput } from '@/lib/supabase/crashoutApi';

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CommunityGuideline {
  id: string;
  title: string;
  content: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModerationReport {
  id: string;
  content_type: 'post' | 'comment';
  content_id: string;
  reported_by: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'off_topic' | 'misinformation' | 'other';
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface UserReputation {
  id: string;
  user_id: string;
  reputation_score: number;
  helpful_votes: number;
  posts_count: number;
  comments_count: number;
  reports_received: number;
  violations_count: number;
  is_moderator: boolean;
  is_banned: boolean;
  ban_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PostVote {
  id: string;
  post_id: string;
  user_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface ForumSearchResult {
  id: string;
  title?: string;
  content: string;
  mood_type?: string;
  tags?: string[];
  upvotes: number;
  created_at: string;
}

export class CrashoutForum {
  private client;

  constructor(getToken?: () => Promise<string | null>) {
    this.client = getToken ? createAuthenticatedSupabaseClient(getToken) : supabase;
  }

  // Category Management
  async getForumCategories(): Promise<ForumCategory[]> {
    const { data, error } = await this.client
      .from('forum_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw error;
    return data as ForumCategory[];
  }

  // Community Guidelines
  async getCommunityGuidelines(): Promise<CommunityGuideline[]> {
    const { data, error } = await this.client
      .from('community_guidelines')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw error;
    return data as CommunityGuideline[];
  }

  // Enhanced Post Retrieval with Forum Features
  async getForumPosts(
    filter: 'latest' | 'popular' | 'top' | 'trending' = 'latest',
    category?: string,
    limit: number = 20
  ): Promise<CrashoutPost[]> {
    let query = this.client
      .from('crashout_posts')
      .select(`
        *,
        reaction_counts:get_reaction_counts(id)
      `)
      .eq('is_private', false)
      .eq('is_flagged', false);

    // Apply category filter if provided
    if (category) {
      query = query.contains('tags', [category]);
    }

    // Apply sorting based on filter
    switch (filter) {
      case 'popular':
        query = query.order('upvotes', { ascending: false });
        break;
      case 'top':
        query = query
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('upvotes', { ascending: false });
        break;
      case 'trending':
        // Posts with high upvote-to-time ratio
        query = query
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('upvotes', { ascending: false });
        break;
      default: // 'latest'
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query.limit(limit);
    
    if (error) throw error;
    return data as CrashoutPost[];
  }

  // Post Voting System
  async voteOnPost(postId: string, voteType: 'up' | 'down', userId: string): Promise<void> {
    const { error } = await this.client.rpc('vote_on_post', {
      post_id_param: postId,
      user_id_param: userId,
      vote_type_param: voteType
    });

    if (error) throw error;
  }

  async removeVoteFromPost(postId: string, userId: string): Promise<void> {
    const { error } = await this.client.rpc('remove_vote_from_post', {
      post_id_param: postId,
      user_id_param: userId
    });

    if (error) throw error;
  }

  async getUserVote(postId: string, userId: string): Promise<PostVote | null> {
    const { data, error } = await this.client
      .from('crashout_post_votes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as PostVote | null;
  }

  // Content Moderation
  async reportContent(
    contentType: 'post' | 'comment',
    contentId: string,
    reason: 'spam' | 'harassment' | 'inappropriate' | 'off_topic' | 'misinformation' | 'other',
    description: string,
    reportedBy: string
  ): Promise<ModerationReport> {
    const { data, error } = await this.client
      .from('content_moderation')
      .insert([{
        content_type: contentType,
        content_id: contentId,
        reported_by: reportedBy,
        reason,
        description
      }])
      .select()
      .single();

    if (error) throw error;
    return data as ModerationReport;
  }

  async getModerationReports(status?: 'pending' | 'approved' | 'rejected' | 'escalated'): Promise<ModerationReport[]> {
    let query = this.client
      .from('content_moderation')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ModerationReport[];
  }

  async moderateContent(
    contentType: 'post' | 'comment',
    contentId: string,
    action: 'approve' | 'reject' | 'delete',
    moderatorId: string,
    reason?: string
  ): Promise<void> {
    const { error } = await this.client.rpc('moderate_content', {
      content_type_param: contentType,
      content_id_param: contentId,
      action_param: action,
      moderator_id_param: moderatorId,
      reason_param: reason
    });

    if (error) throw error;
  }

  // Search Functionality
  async searchPosts(query: string, limit: number = 20): Promise<ForumSearchResult[]> {
    const { data, error } = await this.client.rpc('search_forum_posts', {
      search_query: query,
      limit_param: limit
    });

    if (error) throw error;
    return data as ForumSearchResult[];
  }

  // User Reputation System
  async getUserReputation(userId: string): Promise<UserReputation | null> {
    const { data, error } = await this.client
      .from('user_reputation')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as UserReputation | null;
  }

  async initializeUserReputation(userId: string): Promise<UserReputation> {
    const { data, error } = await this.client
      .from('user_reputation')
      .upsert([{ user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return data as UserReputation;
  }

  async updateUserReputation(
    userId: string,
    updates: Partial<Pick<UserReputation, 'reputation_score' | 'helpful_votes' | 'posts_count' | 'comments_count'>>
  ): Promise<void> {
    const { error } = await this.client
      .from('user_reputation')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Forum Statistics
  async getForumStats(): Promise<{
    total_posts: number;
    posts_today: number;
    total_users: number;
    active_users_today: number;
    popular_categories: { category: string; count: number }[];
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Get total posts
    const { count: totalPosts, error: totalPostsError } = await this.client
      .from('crashout_posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_private', false)
      .eq('is_flagged', false);

    if (totalPostsError) throw totalPostsError;

    // Get posts today
    const { count: postsToday, error: postsTodayError } = await this.client
      .from('crashout_posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_private', false)
      .eq('is_flagged', false)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (postsTodayError) throw postsTodayError;

    // Get unique users count
    const { data: uniqueUsers, error: uniqueUsersError } = await this.client
      .from('crashout_posts')
      .select('user_id')
      .eq('is_private', false)
      .eq('is_flagged', false);

    if (uniqueUsersError) throw uniqueUsersError;

    const totalUsers = new Set(uniqueUsers?.map((u: { user_id: string }) => u.user_id) || []).size;

    // Get active users today
    const { data: activeUsersToday, error: activeUsersTodayError } = await this.client
      .from('crashout_posts')
      .select('user_id')
      .eq('is_private', false)
      .eq('is_flagged', false)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (activeUsersTodayError) throw activeUsersTodayError;

    const activeUsers = new Set(activeUsersToday?.map((u: { user_id: string }) => u.user_id) || []).size;

    // Get popular categories (based on tags)
    const { data: postsWithTags, error: tagsError } = await this.client
      .from('crashout_posts')
      .select('tags')
      .eq('is_private', false)
      .eq('is_flagged', false)
      .not('tags', 'is', null);

    if (tagsError) throw tagsError;

    const tagCounts: Record<string, number> = {};
    postsWithTags?.forEach((post: { tags?: string[] }) => {
      post.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const popularCategories = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    return {
      total_posts: totalPosts || 0,
      posts_today: postsToday || 0,
      total_users: totalUsers,
      active_users_today: activeUsers,
      popular_categories: popularCategories
    };
  }

  // Content Filtering
  async getFilteredPosts(filters: {
    mood_types?: string[];
    tags?: string[];
    date_range?: { start: string; end: string };
    min_upvotes?: number;
    exclude_flagged?: boolean;
  }): Promise<CrashoutPost[]> {
    let query = this.client
      .from('crashout_posts')
      .select(`
        *,
        reaction_counts:get_reaction_counts(id)
      `)
      .eq('is_private', false);

    if (filters.exclude_flagged !== false) {
      query = query.eq('is_flagged', false);
    }

    if (filters.mood_types && filters.mood_types.length > 0) {
      query = query.in('mood_type', filters.mood_types);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.date_range) {
      query = query
        .gte('created_at', filters.date_range.start)
        .lte('created_at', filters.date_range.end);
    }

    if (filters.min_upvotes !== undefined) {
      query = query.gte('upvotes', filters.min_upvotes);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data as CrashoutPost[];
  }

  // Increment view count for a post
  async incrementViewCount(postId: string): Promise<void> {
    const { error } = await this.client
      .from('crashout_posts')
      .update({ 
        view_count: this.client.rpc('COALESCE', { value: this.client.rpc('view_count') + 1, default_value: 1 })
      })
      .eq('id', postId);

    if (error) throw error;
  }

  // Get trending topics based on recent activity
  async getTrendingTopics(limit: number = 10): Promise<{ tag: string; count: number; growth: number }[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Get tags from recent posts
    const { data: recentPosts, error: recentError } = await this.client
      .from('crashout_posts')
      .select('tags')
      .eq('is_private', false)
      .eq('is_flagged', false)
      .gte('created_at', oneDayAgo)
      .not('tags', 'is', null);

    if (recentError) throw recentError;

    // Get tags from older posts for comparison
    const { data: olderPosts, error: olderError } = await this.client
      .from('crashout_posts')
      .select('tags')
      .eq('is_private', false)
      .eq('is_flagged', false)
      .gte('created_at', threeDaysAgo)
      .lt('created_at', oneDayAgo)
      .not('tags', 'is', null);

    if (olderError) throw olderError;

    // Count recent tags
    const recentTagCounts: Record<string, number> = {};
    recentPosts?.forEach((post: { tags?: string[] }) => {
      post.tags?.forEach((tag: string) => {
        recentTagCounts[tag] = (recentTagCounts[tag] || 0) + 1;
      });
    });

    // Count older tags
    const olderTagCounts: Record<string, number> = {};
    olderPosts?.forEach((post: { tags?: string[] }) => {
      post.tags?.forEach((tag: string) => {
        olderTagCounts[tag] = (olderTagCounts[tag] || 0) + 1;
      });
    });

    // Calculate growth and trending
    const trending = Object.entries(recentTagCounts)
      .map(([tag, recentCount]) => {
        const olderCount = olderTagCounts[tag] || 0;
        const growth = olderCount > 0 ? ((recentCount - olderCount) / olderCount) * 100 : 100;
        return { tag, count: recentCount, growth };
      })
      .filter(item => item.count >= 2) // Minimum threshold
      .sort((a, b) => b.growth - a.growth)
      .slice(0, limit);

    return trending;
  }
} 