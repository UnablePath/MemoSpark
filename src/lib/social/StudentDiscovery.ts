import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedClient } from '../supabase/client';
import { Database } from '@/types/database';

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
    const { data, error } = await this.supabase.rpc('search_users', { search_term: searchTerm });
    if (error) {
      console.error('Error searching for users:', error);
      return [];
    }
    return (data || []).filter(user => user.clerk_user_id !== currentUserId) as UserSearchResult[];
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