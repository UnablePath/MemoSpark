import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedClient } from '../supabase/client';
import { Database } from '@/types/database';
import { parseSearchTerm, generateUsername } from '../utils';

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
      // For username search, we need to search based on generated usernames
      return this.searchByUsername(cleanTerm, currentUserId);
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

  private async searchByUsername(usernameTerm: string, currentUserId: string): Promise<UserSearchResult[]> {
    // Get all users and filter by generated username
    const { data, error } = await this.supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email, avatar_url, year_of_study, subjects, interests')
      .neq('clerk_user_id', currentUserId)
      .limit(50); // Limit for performance

    if (error) {
      console.error('Error searching users by username:', error);
      return [];
    }

    if (!data) return [];

    // Filter by generated username match
    return data
      .filter(user => {
        const generatedUsername = generateUsername(user.full_name, user.clerk_user_id);
        return generatedUsername.toLowerCase().includes(usernameTerm.toLowerCase());
      })
      .slice(0, 10) // Limit results
      .map(user => ({
        ...user,
        similarity_score: this.calculateUsernameMatchScore(
          generateUsername(user.full_name, user.clerk_user_id),
          usernameTerm
        )
      }))
      .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0)); // Sort by relevance
  }

  private calculateUsernameMatchScore(username: string, searchTerm: string): number {
    const lowerUsername = username.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();
    
    // Exact match gets highest score
    if (lowerUsername === lowerTerm) return 1.0;
    
    // Starts with gets high score
    if (lowerUsername.startsWith(lowerTerm)) return 0.8;
    
    // Contains gets medium score
    if (lowerUsername.includes(lowerTerm)) return 0.6;
    
    // Calculate similarity based on common characters
    const commonChars = lowerTerm.split('').filter(char => lowerUsername.includes(char)).length;
    return Math.min(0.5, commonChars / lowerTerm.length * 0.5);
  }

  async sendConnectionRequest(requesterId: string, receiverId: string): Promise<void> {
    const { error } = await this.supabase.from('connections').insert({
      requester_id: requesterId,
      receiver_id: receiverId,
    });
    if (error) throw error;
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
  
  async getConnections(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(clerk_user_id, full_name, avatar_url),
        receiver:profiles!connections_receiver_id_fkey(clerk_user_id, full_name, avatar_url)
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');
      
    if (error) throw error;
    return data || [];
  }

  async getIncomingConnectionRequests(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(clerk_user_id, full_name, avatar_url)
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    return data || [];
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