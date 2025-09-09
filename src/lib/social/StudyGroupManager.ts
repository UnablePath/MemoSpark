import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedClient } from '../supabase/client';
import { ensureUserProfile } from '../supabase/tasksApi';
import { Database } from '@/types/database';
import { MessagingService } from '../messaging/MessagingService';

// Types for Study Groups - matching database schema
export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: any; // Json type from database
  conversation_id?: string | null;
  category_id?: string | null;
  privacy_level?: 'public' | 'private' | 'invite_only' | null;
  tags?: string[] | null;
  max_members?: number | null;
  session_count?: number | null;
  last_activity_at?: string | null;
  is_archived?: boolean | null;
}

export interface StudyGroupMember {
  id: string;
  group_id: string | null;
  user_id: string | null;
  role: string; // The database stores this as string, not enum
  joined_at: string;
  user_name?: string; // Added for enriched member data
}

export interface StudyGroupInvitation {
  id: string;
  group_id: string | null;
  inviter_id: string | null;
  invitee_id: string | null;
  status: string; // The database stores this as string, not enum
  created_at: string;
  updated_at: string;
}

export interface StudyGroupResource {
  id: string;
  group_id: string | null;
  user_id: string | null;
  resource_type: string; // The database stores this as string, not enum
  title: string;
  content: string | null;
  url: string | null;
  file_path: string | null;
  created_at: string;
}

export interface GroupCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
}

export class StudyGroupManager {
  private supabase: ReturnType<typeof createClient<Database>>;
  private messagingService: MessagingService;
  private getToken?: () => Promise<string | null>;

  constructor(getToken?: () => Promise<string | null>) {
    this.getToken = getToken;
    this.supabase = getAuthenticatedClient(getToken);
    this.messagingService = new MessagingService(getToken);
  }

  private logError(context: string, error: any, additionalInfo: Record<string, any> = {}) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(
      `Error in StudyGroupManager/${context}:`, 
      errorMessage,
      {
        errorObject: error,
        ...additionalInfo
      }
    );
  }

  // Group Management
  async createGroup(
    name: string,
    userId: string,
    description?: string,
    options?: { categoryId?: string | null; privacyLevel?: 'public' | 'private' | 'invite_only' }
  ): Promise<StudyGroup | null> {
    try {
      // 1. Create the group conversation first
      const conversationId = await this.messagingService.createGroupConversation(name, userId, description);

      // 2. Create the study group and link it to the conversation
      const { data: groupData, error: groupError } = await this.supabase
        .from('study_groups')
        .insert({
          name,
          description,
          created_by: userId,
          conversation_id: conversationId,
          category_id: options?.categoryId ?? null,
          privacy_level: options?.privacyLevel ?? 'public',
        })
        .select()
        .single();
      
      if (groupError) throw groupError;
      if (!groupData) throw new Error("Group creation returned no data.");

      // 3. Add the creator as the first member of the group
      await this.addMember(groupData.id, userId, 'owner');
      
      // 4. Trigger achievement for creating a group
      try {
        await fetch('/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'social_action',
            metadata: { socialAction: 'group_created' }
          }),
        });
      } catch (e) {
        console.error('Failed to trigger group_created achievement', e);
      }

      return groupData;
    } catch (error) {
      this.logError('createGroup', error, { name, userId });
      throw error; // Re-throw to be handled by the UI
    }
  }

  async getGroup(groupId: string): Promise<StudyGroup | null> {
    const { data, error } = await this.supabase
        .from('study_groups')
        .select('*')
        .eq('id', groupId)
        .single();
    
    if(error) {
      this.logError('getGroup', error, { groupId });
      throw error;
    }
    return data;
  }

  async attachConversationId(groupId: string, conversationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('study_groups')
        .update({ conversation_id: conversationId })
        .eq('id', groupId);
      if (error) throw error;
    } catch (error) {
      this.logError('attachConversationId', error, { groupId, conversationId });
      // Bubble up for caller to decide to ignore
      throw error;
    }
  }

  async updateGroup(groupId: string, updates: Partial<StudyGroup>): Promise<StudyGroup> {
    const { data, error } = await this.supabase
      .from('study_groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single();
    
    if (error) {
      this.logError('updateGroup', error, { groupId });
      throw error
    };
    return data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await this.supabase
        .from('study_groups')
        .delete()
        .eq('id', groupId);

    if(error) {
      this.logError('deleteGroup', error, { groupId });
      throw error
    };
  }
  
  // Member Management
  async addMember(groupId: string, userId: string, role: 'member' | 'admin' | 'owner' = 'member'): Promise<void> {
    try {
      const { data: groupData } = await this.supabase.from('study_groups').select('conversation_id').eq('id', groupId).single();
      if (!groupData?.conversation_id) {
          throw new Error("Could not find conversation for this group.");
      }
      
      // Add to both systems
      await this.messagingService.addConversationParticipant(groupData.conversation_id, userId);
      
      const { error: memberError } = await this.supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role,
        });

      if (memberError) throw memberError;
    } catch(error) {
      this.logError('addMember', error, { groupId, userId, role });
      throw error;
    }
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
        .from('study_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
    
    if (error) {
      this.logError('removeMember', error, { groupId, userId });
      throw error;
    }
  }

  async getGroupMembers(groupId: string, requestingUserId?: string): Promise<StudyGroupMember[]> {
    // If a requesting user is provided, check if they are a member first
    if (requestingUserId) {
      const isMember = await this.isUserMember(groupId, requestingUserId);
      if (!isMember) {
        throw new Error('Access denied: You must be a member to view group members');
      }
    }

    const { data, error } = await this.supabase
        .from('study_group_members')
        .select('*')
        .eq('group_id', groupId);
    
    if(error) {
      this.logError('getGroupMembers', error, { groupId });
      throw error;
    }
    return data || [];
  }

  async getUserGroups(userId: string): Promise<StudyGroup[]> {
    try {
        const { data, error } = await this.supabase.rpc('get_user_study_groups', {
          p_user_id: userId
        });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        this.logError('getUserGroups', error, { userId });
        throw error; // Re-throw
    }
  }

  async getAllGroups(limit = 20, offset = 0): Promise<StudyGroup[]> {
    try {
        const { data, error } = await this.supabase
          .from('study_groups')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        this.logError('getAllGroups', error, { limit, offset });
        throw error;
    }
  }

  // Discovery & Categories
  async getCategories(): Promise<GroupCategory[]> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('group_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.logError('getCategories', error, {});
      return [];
    }
  }

  async searchGroups(params: { query?: string; categoryId?: string | null; limit?: number; offset?: number }): Promise<StudyGroup[]> {
    const { query, categoryId, limit = 20, offset = 0 } = params;
    try {
      let builder = this.supabase
        .from('study_groups')
        .select('*')
        .order('last_activity_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (query && query.trim()) {
        builder = builder.or(`name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`);
      }
      if (categoryId) {
        builder = builder.eq('category_id', categoryId);
      }
      const { data, error } = await builder;
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.logError('searchGroups', error, { query, categoryId, limit, offset });
      return [];
    }
  }

  async getMemberCount(groupId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('study_group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId);
      if (error) throw error;
      return count ?? 0;
    } catch (error) {
      this.logError('getMemberCount', error, { groupId });
      return 0;
    }
  }

  async isUserMember(groupId: string, userId: string): Promise<boolean> {
    try {
        const { data, error } = await this.supabase
          .from('study_group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .single();
        
        return !!data && !error;
    } catch (error) {
        return false;
    }
  }

  async updateMemberRole(groupId: string, userId: string, role: 'member' | 'admin'): Promise<void> {
    const { error } = await this.supabase
      .from('study_group_members')
      .update({ role })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) {
      this.logError('updateMemberRole', error, { groupId, userId, role });
      throw error;
    }
  }

  // Invitation Management
  async sendInvitation(groupId: string, inviterId: string, inviteeId: string): Promise<StudyGroupInvitation> {
    const { data, error } = await this.supabase
      .from('study_group_invitations')
      .insert({ group_id: groupId, inviter_id: inviterId, invitee_id: inviteeId })
      .select()
      .single();

    if (error) {
      this.logError('sendInvitation', error, { groupId, inviterId, inviteeId });
      throw error;
    }
    return data;
  }

  async respondToInvitation(invitationId: string, status: 'accepted' | 'rejected'): Promise<void> {
    const { error } = await this.supabase
      .from('study_group_invitations')
      .update({ status })
      .eq('id', invitationId);

    if (error) {
      this.logError('respondToInvitation', error, { invitationId, status });
      throw error;
    }

    if (status === 'accepted') {
      // Get invitation details and add member to group
      const { data: invitation } = await this.supabase
        .from('study_group_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (invitation) {
        await this.addMember(invitation.group_id!, invitation.invitee_id!);
      }
    }
  }

  async getInvitations(userId: string): Promise<StudyGroupInvitation[]> {
    const { data, error } = await this.supabase
      .from('study_group_invitations')
      .select('*')
      .eq('invitee_id', userId)
      .eq('status', 'pending');

    if (error) {
      this.logError('getInvitations', error, { userId });
      throw error;
    }
    return data || [];
  }
  
  // Resource Management
  async addResource(groupId: string, userId: string, resource: Omit<StudyGroupResource, 'id' | 'group_id' | 'user_id' | 'created_at'>): Promise<StudyGroupResource> {
      // Ensure a profile exists for this user to satisfy FK to profiles.clerk_user_id
      try {
        await ensureUserProfile(this.getToken);
      } catch {}

      const { data, error } = await this.supabase
        .from('study_group_resources')
        .insert({ ...resource, group_id: groupId, user_id: userId })
        .select()
        .single();
    
      if (error) {
        this.logError('addResource', error, { groupId, userId });
        throw error;
      }
      return data;
  }

  async getResources(groupId: string, requestingUserId?: string): Promise<StudyGroupResource[]> {
      // If a requesting user is provided, check if they are a member first
      if (requestingUserId) {
        const isMember = await this.isUserMember(groupId, requestingUserId);
        if (!isMember) {
          throw new Error('Access denied: You must be a member to view group resources');
        }
      }

      const { data, error } = await this.supabase
        .from('study_group_resources')
        .select('*')
        .eq('group_id', groupId);

      if (error) {
        this.logError('getResources', error, { groupId });
        throw error;
      }
      return data || [];
  }

  // User utilities
  async getUserName(userId: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('full_name, email')
        .eq('clerk_user_id', userId)
        .single();

      if (error || !data) {
        // Fallback to user ID if profile not found
        return userId.slice(0, 8) + '...';
      }

      // Return full name if available, otherwise email username, otherwise truncated ID
      if (data.full_name) {
        return data.full_name;
      } else if (data.email) {
        return data.email.split('@')[0];
      } else {
        return userId.slice(0, 8) + '...';
      }
    } catch (error) {
      this.logError('getUserName', error, { userId });
      return userId.slice(0, 8) + '...';
    }
  }

  async getUserNames(userIds: string[]): Promise<Record<string, string>> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('clerk_user_id, full_name, email')
        .in('clerk_user_id', userIds);

      if (error) {
        this.logError('getUserNames', error, { userIds });
        // Return fallback names
        return userIds.reduce((acc, id) => {
          acc[id] = id.slice(0, 8) + '...';
          return acc;
        }, {} as Record<string, string>);
      }

      const names: Record<string, string> = {};
      
      // Process profiles that were found
      data?.forEach(profile => {
        if (profile.full_name) {
          names[profile.clerk_user_id] = profile.full_name;
        } else if (profile.email) {
          names[profile.clerk_user_id] = profile.email.split('@')[0];
        } else {
          names[profile.clerk_user_id] = profile.clerk_user_id.slice(0, 8) + '...';
        }
      });

      // Add fallback names for profiles not found
      userIds.forEach(id => {
        if (!names[id]) {
          names[id] = id.slice(0, 8) + '...';
        }
      });

      return names;
    } catch (error) {
      this.logError('getUserNames', error, { userIds });
      // Return fallback names for all users
      return userIds.reduce((acc, id) => {
        acc[id] = id.slice(0, 8) + '...';
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Enhanced methods that include user names
  async getGroupMembersWithNames(groupId: string, requestingUserId?: string): Promise<(StudyGroupMember & { user_name: string })[]> {
    try {
      const members = await this.getGroupMembers(groupId, requestingUserId);
      const userIds = members.map(m => m.user_id).filter(Boolean) as string[];
      const userNames = await this.getUserNames(userIds);
      
      return members.map(member => ({
        ...member,
        user_name: userNames[member.user_id || ''] || member.user_id || 'Unknown User'
      }));
    } catch (error) {
      this.logError('getGroupMembersWithNames', error, { groupId });
      throw error;
    }
  }
} 