import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedClient } from '../supabase/client';
import { Database } from '@/types/database';
import { parseSearchTerm } from '../utils';

export interface UserSearchResult {
  clerk_user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  year_of_study?: string | null;
  subjects?: string[] | null;
  interests?: string[] | null;
  similarity_score?: number;
}

// Add alias for compatibility with SwipeInterface
export type UserProfile = UserSearchResult;

export class StudentDiscovery {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(getToken?: () => Promise<string | null>) {
    this.supabase = getAuthenticatedClient(getToken);
  }

  async searchUsers(searchTerm: string, currentUserId: string): Promise<UserSearchResult[]> {
    const { isUsernameSearch, cleanTerm } = parseSearchTerm(searchTerm);
    
    if (isUsernameSearch) {
      // For @username search, search by display name (since we don't use fake usernames anymore)
      return this.searchByDisplayName(cleanTerm, currentUserId);
    } else {
      // Regular search using the existing RPC function
      const { data, error } = await this.supabase.rpc('search_users', { search_term: searchTerm });
      if (error) {
        console.error('Error searching for users:', error);
        return [];
      }
      return (data || []).filter(user => user.clerk_user_id !== currentUserId) as UserSearchResult[];
    }
  }

  private async searchByDisplayName(searchTerm: string, currentUserId: string): Promise<UserSearchResult[]> {
    // Search by display name (full_name) instead of generated usernames
    const { data, error } = await this.supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email, avatar_url, year_of_study, subjects, interests')
      .neq('clerk_user_id', currentUserId)
      .ilike('full_name', `%${searchTerm}%`)
      .limit(10); // Limit results

    if (error) {
      console.error('Error searching users by display name:', error);
      return [];
    }

    if (!data) return [];

    // Sort by relevance
    return data
      .map(user => ({
        ...user,
        similarity_score: this.calculateDisplayNameMatchScore(user.full_name, searchTerm)
      }))
      .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
  }

  private async searchByUsername(usernameTerm: string, currentUserId: string): Promise<UserSearchResult[]> {
    // This method is deprecated - redirect to display name search
    return this.searchByDisplayName(usernameTerm, currentUserId);
  }

  private calculateDisplayNameMatchScore(displayName: string | null, searchTerm: string): number {
    if (!displayName) return 0;
    
    const lowerDisplayName = displayName.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();
    
    // Exact match gets highest score
    if (lowerDisplayName === lowerTerm) return 1.0;
    
    // Starts with gets high score
    if (lowerDisplayName.startsWith(lowerTerm)) return 0.8;
    
    // Word boundary match gets good score
    const words = lowerDisplayName.split(' ');
    if (words.some(word => word.startsWith(lowerTerm))) return 0.7;
    
    // Contains gets medium score
    if (lowerDisplayName.includes(lowerTerm)) return 0.6;
    
    // Calculate similarity based on common characters
    const commonChars = lowerTerm.split('').filter(char => lowerDisplayName.includes(char)).length;
    return Math.min(0.5, commonChars / lowerTerm.length * 0.5);
  }

  /**
   * Create a connection request or accept a reverse pending request if it exists.
   * Returns the resulting status: 'pending' | 'accepted' | 'rejected' | 'blocked'
   */
  async sendConnectionRequest(requesterId: string, receiverId: string): Promise<'pending' | 'accepted' | 'rejected' | 'blocked'> {
    // Cast to any to allow calling newly added RPCs not present in generated types yet
    const { data, error } = await (this.supabase as any).rpc('create_or_accept_connection', {
      actor_id: requesterId,
      other_id: receiverId,
    });
    if (error) throw error;
    // data is expected to be a table with (id, status)
    const status = Array.isArray(data) && data.length > 0 ? (data[0].status as any) : 'pending';
    return status;
  }

  async acceptConnectionRequest(requesterId: string, receiverId: string): Promise<void> {
    const { error } = await this.supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('requester_id', requesterId)
      .eq('receiver_id', receiverId);
    if (error) throw error;

    // Trigger achievement for making the first connection
    try {
      await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'social_action',
          metadata: { socialAction: 'first_connection' }
        }),
      });
    } catch (e) {
      console.error('Failed to trigger first_connection achievement', e);
    }
  }

  async rejectConnectionRequest(requesterId: string, receiverId: string): Promise<void> {
    const { error } = await this.supabase
      .from('connections')
      .update({ status: 'rejected' })
      .eq('requester_id', requesterId)
      .eq('receiver_id', receiverId);
    if (error) throw error;
  }
  
  async getConnections(userId: string, opts?: { limit?: number; offset?: number }): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(
          clerk_user_id, 
          full_name, 
          avatar_url,
          year_of_study,
          streak_visibility
        ),
        receiver:profiles!connections_receiver_id_fkey(
          clerk_user_id, 
          full_name, 
          avatar_url,
          year_of_study,
          streak_visibility
        )
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false })
      .range(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 50) - 1);
      
    if (error) throw error;
    
    // Add streak data to connections with privacy controls
    const connectionsWithStreaks = await Promise.all(
      (data || []).map(async (connection) => {
        const isUserRequester = connection.requester_id === userId;
        const otherUser = isUserRequester ? connection.receiver : connection.requester;
                 const otherUserId = (otherUser as any)?.clerk_user_id;
        
                 // Only fetch streak data if the other user has made it visible
         let streakData = null;
         if (otherUser && otherUserId && (otherUser as any).streak_visibility === true) {
          try {
            const { data: statsData } = await this.supabase
              .from('user_stats')
              .select('current_streak, longest_streak, total_points')
              .eq('user_id', otherUserId)
              .single();
              
            if (statsData) {
              streakData = {
                current_streak: statsData.current_streak || 0,
                longest_streak: statsData.longest_streak || 0,
                total_points: statsData.total_points || 0
              };
            }
          } catch (error) {
            console.error('Error fetching streak data for connection:', error);
          }
        }
        
        return {
          ...connection,
          streak_data: streakData
        };
      })
    );
    
    return connectionsWithStreaks;
  }

  async getIncomingConnectionRequests(userId: string, opts?: { limit?: number; offset?: number }): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(clerk_user_id, full_name, avatar_url, year_of_study)
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 50) - 1);

    if (error) throw error;
    return data || [];
  }

  async getOutgoingConnectionRequests(userId: string, opts?: { limit?: number; offset?: number }): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('connections')
      .select(`
        *,
        receiver:profiles!connections_receiver_id_fkey(clerk_user_id, full_name, avatar_url, year_of_study)
      `)
      .eq('requester_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 50) - 1);

    if (error) throw error;
    return data || [];
  }

  async cancelConnectionRequest(requesterId: string, receiverId: string): Promise<boolean> {
    const { error, count } = await this.supabase
      .from('connections')
      .delete({ count: 'exact' })
      .eq('requester_id', requesterId)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending');
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async removeConnection(userId: string, otherUserId: string): Promise<boolean> {
    const { data, error } = await (this.supabase as any).rpc('remove_connection', {
      actor_id: userId,
      other_id: otherUserId,
    });
    if (error) throw error;
    return Boolean(data);
  }

  async blockUser(userId: string, otherUserId: string): Promise<'blocked'> {
    const { data, error } = await (this.supabase as any).rpc('block_user', {
      actor_id: userId,
      other_id: otherUserId,
    });
    if (error) throw error;
    const status = Array.isArray(data) && data.length > 0 ? (data[0].status as any) : 'blocked';
    return status;
  }

  async unblockUser(userId: string, otherUserId: string): Promise<boolean> {
    const { data, error } = await (this.supabase as any).rpc('unblock_user', {
      actor_id: userId,
      other_id: otherUserId,
    });
    if (error) throw error;
    return Boolean(data);
  }

  async getRecommendations(userId: string): Promise<UserSearchResult[]> {
    const { data, error } = await this.supabase.rpc('get_user_recommendations', { user_id_input: userId });
    if (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
    return data as UserSearchResult[] || [];
  }
} 