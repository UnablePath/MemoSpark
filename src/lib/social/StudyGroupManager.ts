/**
 * StudyGroupManager - Social features for collaborative studying
 */

import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database';

// Types from database
export type StudyGroup = Database['public']['Tables']['study_groups']['Row'];
export type StudyGroupMember = Database['public']['Tables']['study_group_members']['Row'];
export type StudyGroupResource = Database['public']['Tables']['study_group_resources']['Row'];
export type StudyGroupInvitation = Database['public']['Tables']['study_group_invitations']['Row'];

// Extended types with additional data
export interface StudyGroupWithMembers extends StudyGroup {
  members?: StudyGroupMemberWithName[];
  member_count?: number;
}

export interface StudyGroupMemberWithName extends StudyGroupMember {
  name?: string;
  email?: string;
}

export interface StudyGroupResourceWithUser extends StudyGroupResource {
  user_name?: string;
}

export interface GroupCategory {
  id: string;
  name: string;
  description?: string;
}

export class StudyGroupManager {
  private getToken: (() => string | null) | (() => Promise<string | null>);

  constructor(getToken: (() => string | null) | (() => Promise<string | null>)) {
    this.getToken = getToken;
  }

  private async getAuthToken(): Promise<string | null> {
    const token = this.getToken();
    if (token instanceof Promise) {
      return await token;
    }
    return token;
  }
  /**
   * Create a new study group
   */
  static async createGroup(name: string, description?: string, privacy_level: string = 'public'): Promise<StudyGroup> {
    try {
      const response = await fetch('/api/study-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          privacy_level
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create group');
      }

      const { group } = await response.json();
      return group;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  /**
   * Join an existing study group
   */
  static async joinGroup(groupId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/study-groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join group');
      }

      return true;
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  }

  /**
   * Leave a study group
   */
  static async leaveGroup(groupId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/study-groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to leave group');
      }

      return true;
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  /**
   * Get user's study groups (static method)
   */
  static async getUserGroups(): Promise<StudyGroupWithMembers[]> {
    try {
      const response = await fetch('/api/study-groups?type=my-groups');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user groups');
      }

      const { groups } = await response.json();
      return groups;
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
  }

  /**
   * Search for study groups
   */
  static async searchGroups(params: {
    query?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
  }): Promise<StudyGroupWithMembers[]> {
    try {
      const searchParams = new URLSearchParams({
        type: 'discover',
        limit: String(params.limit || 30),
        offset: String(params.offset || 0)
      });

      if (params.query) searchParams.append('q', params.query);
      if (params.categoryId) searchParams.append('categoryId', params.categoryId);

      const response = await fetch(`/api/study-groups?${searchParams.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search groups');
      }

      const { groups } = await response.json();
      return groups;
    } catch (error) {
      console.error('Error searching groups:', error);
      throw error;
    }
  }

  /**
   * Send invitation to join a group
   */
  static async inviteToGroup(groupId: string, inviteeEmail: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/study-groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitee_email: inviteeEmail
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invitation');
      }

      return true;
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }
  }

  /**
   * Get user's pending invitations
   */
  static async getPendingInvitations(): Promise<any[]> {
    try {
      const response = await fetch('/api/study-groups/invitations');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch invitations');
      }

      const { invitations } = await response.json();
      return invitations;
    } catch (error) {
      console.error('Error fetching invitations:', error);
      throw error;
    }
  }

  /**
   * Respond to an invitation
   */
  static async respondToInvitation(invitationId: string, action: 'accept' | 'decline'): Promise<boolean> {
    try {
      const response = await fetch(`/api/study-groups/invitations/${invitationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} invitation`);
      }

      return true;
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      throw error;
    }
  }

  /**
   * TODO: Start a study session (placeholder for future implementation)
   */
  static async startSession(groupId: string, title: string): Promise<any> {
    // TODO: Implement study sessions when needed
    throw new Error('Study sessions not yet implemented');
  }

  /**
   * TODO: Get active sessions for a group (placeholder for future implementation)
   */
  static async getActiveSessions(groupId: string): Promise<any[]> {
    // TODO: Implement study sessions when needed
    return [];
  }

  /**
   * Get user's study groups (instance method)
   */
  async getUserGroups(userId: string): Promise<StudyGroupWithMembers[]> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return [];
      }

      const { data, error } = await supabase
        .rpc('get_user_study_groups', { p_user_id: userId });

      if (error) {
        console.error('Error fetching user groups:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserGroups:', error);
      return [];
    }
  }

  /**
   * Get all available study groups
   */
  async getAllGroups(): Promise<StudyGroupWithMembers[]> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return [];
      }

      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          study_group_members(count)
        `);

      if (error) {
        console.error('Error fetching all groups:', error);
        return [];
      }

      return data?.map(group => ({
        ...group,
        member_count: group.study_group_members?.[0]?.count || 0
      })) || [];
    } catch (error) {
      console.error('Error in getAllGroups:', error);
      return [];
    }
  }

  /**
   * Get a specific group by ID
   */
  async getGroup(groupId: string): Promise<StudyGroupWithMembers | null> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return null;
      }

      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          study_group_members(
            *,
            profiles(name, email)
          )
        `)
        .eq('id', groupId)
        .single();

      if (error) {
        console.error('Error fetching group:', error);
        return null;
      }

      return {
        ...data,
        members: data.study_group_members?.map((member: any) => ({
          ...member,
          name: member.profiles?.name,
          email: member.profiles?.email
        })) || []
      };
    } catch (error) {
      console.error('Error in getGroup:', error);
      return null;
    }
  }

  /**
   * Get group members with their names
   */
  async getGroupMembersWithNames(groupId: string): Promise<StudyGroupMemberWithName[]> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return [];
      }

      const { data, error } = await supabase
        .from('study_group_members')
        .select(`
          *,
          profiles(name, email)
        `)
        .eq('group_id', groupId);

      if (error) {
        console.error('Error fetching group members:', error);
        return [];
      }

      return data?.map((member: any) => ({
        ...member,
        name: member.profiles?.name,
        email: member.profiles?.email
      })) || [];
    } catch (error) {
      console.error('Error in getGroupMembersWithNames:', error);
      return [];
    }
  }

  /**
   * Get group resources
   */
  async getResources(groupId: string): Promise<StudyGroupResourceWithUser[]> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return [];
      }

      const { data, error } = await supabase
        .from('study_group_resources')
        .select(`
          *,
          profiles(name)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching group resources:', error);
        return [];
      }

      return data?.map((resource: any) => ({
        ...resource,
        user_name: resource.profiles?.name
      })) || [];
    } catch (error) {
      console.error('Error in getResources:', error);
      return [];
    }
  }

  /**
   * Add a resource to a group
   */
  async addResource(groupId: string, userId: string, resource: {
    title: string;
    description?: string;
    url?: string;
    file_path?: string;
    resource_type: string;
  }): Promise<StudyGroupResource | null> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return null;
      }

      const { data, error } = await supabase
        .from('study_group_resources')
        .insert({
          group_id: groupId,
          user_id: userId,
          ...resource
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding resource:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in addResource:', error);
      return null;
    }
  }

  /**
   * Remove a member from a group
   */
  async removeMember(groupId: string, userId: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return false;
      }

      const { error } = await supabase
        .from('study_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing member:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeMember:', error);
      return false;
    }
  }

  /**
   * Check if user is a member of a group
   */
  async isUserMember(groupId: string, userId: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return false;
      }

      const { data, error } = await supabase
        .from('study_group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (error) {
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking membership:', error);
      return false;
    }
  }

  /**
   * Create a new study group (instance method) - Use static method instead
   */
  async createGroup(name: string, userId: string, description?: string): Promise<StudyGroup> {
    // Delegate to static method for consistency
    return StudyGroupManager.createGroup(name, description);
  }

  /**
   * Add a member to a group
   */
  async addMember(groupId: string, userId: string, role: string = 'member'): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return false;
      }

      const { error } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: role
        });

      if (error) {
        console.error('Error adding member:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addMember:', error);
      return false;
    }
  }

  /**
   * Get available group categories
   */
  async getCategories(): Promise<GroupCategory[]> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return [];
      }

      const { data, error } = await supabase
        .from('group_categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCategories:', error);
      return [];
    }
  }

  /**
   * Search for study groups (instance method) - Use static method instead
   */
  async searchGroups(params: {
    query?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
  }): Promise<StudyGroup[]> {
    // Delegate to static method for consistency
    return StudyGroupManager.searchGroups(params);
  }
}

export default StudyGroupManager;