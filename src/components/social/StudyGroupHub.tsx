"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudyGroupManager, StudyGroup, StudyGroupMember, StudyGroupResource } from '@/lib/social/StudyGroupManager';
import { MessagingService } from '@/lib/messaging/MessagingService';
import { useStudySessions, useCreateSession, useSessionParticipants, useJoinSession, useLeaveSession, useGroupCategories, useDiscoverGroups } from '@/hooks/useStudyGroupQueries';
import { StudySessionManager } from '@/lib/social/StudySessionManager';
import { useQueryClient } from '@tanstack/react-query';
import type { StudySession } from '@/lib/social/StudySessionManager';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  PlusCircle, 
  UserPlus, 
  MessageSquare, 
  BookOpen, 
  Settings, 
  Search,
  Plus,
  Crown,
  Shield,
  User,
  FileText,
  Link,
  Upload,
  Send,
  MoreVertical,
  X,
  UserMinus,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Import Magic UI components
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AnimatedList, AnimatedListItem } from "@/components/magicui/animated-list";
import GroupManagementPanel from './GroupManagementPanel';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  created_at: string;
  sender?: {
    full_name?: string;
  };
}

export const StudyGroupHub: React.FC = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const studyGroupManager = useMemo(() => new StudyGroupManager(getToken), [getToken]);
  const messagingService = useMemo(() => new MessagingService(getToken), [getToken]);

  // State management
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<(StudyGroupMember & { user_name: string })[]>([]);
  const [groupResources, setGroupResources] = useState<StudyGroupResource[]>([]);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [userGroups, setUserGroups] = useState<StudyGroup[]>([]);
  const [allGroups, setAllGroups] = useState<StudyGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState<string | null>(null);
  const [newGroupPrivacy, setNewGroupPrivacy] = useState<'public' | 'private' | 'invite_only'>('public');
  const [newMessage, setNewMessage] = useState("");
  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceContent, setNewResourceContent] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [newResourceType, setNewResourceType] = useState<string>("note");
  // Discovery data
  const categoriesQuery = useGroupCategories(getToken);
  const discoveryQuery = useDiscoverGroups(getToken, { q: searchQuery, categoryId: selectedCategory });

  // Sessions UI state
  const [newSession, setNewSession] = useState<{
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    max_participants?: number | null;
  }>({ title: '', description: '', start_time: '', end_time: '', max_participants: null });

  const sessionsQuery = useStudySessions(getToken, selectedGroup?.id || '');
  const createSession = useCreateSession(getToken, selectedGroup?.id || '');
  const [sessionDetailsId, setSessionDetailsId] = useState<string | null>(null);
  const participantsQuery = useSessionParticipants(getToken, sessionDetailsId || '');
  const joinSession = useJoinSession(getToken, selectedGroup?.id || '');
  const leaveSession = useLeaveSession(getToken, selectedGroup?.id || '');
  const queryClient = useQueryClient();

  // Resolve participant names
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const loadNames = async () => {
      if (!participantsQuery.data || participantsQuery.data.length === 0) {
        setParticipantNames({});
        return;
      }
      try {
        const uniqueIds = Array.from(new Set(participantsQuery.data.map(p => p.user_id)));
        // Get user names from profiles - this method needs to be implemented
        const names: Record<string, string> = {};
        setParticipantNames(names);
      } catch (e) {
        // Fail-soft: keep IDs
        setParticipantNames({});
      }
    };
    loadNames();
  }, [participantsQuery.data, studyGroupManager]);

  // Realtime subscription for session details dialog
  useEffect(() => {
    if (!sessionDetailsId) return;
    const mgr = new StudySessionManager(getToken);
    const unsubscribe = mgr.subscribeToSession(sessionDetailsId, {
      onSessionUpdate: () => {
        if (selectedGroup?.id) {
          queryClient.invalidateQueries({ queryKey: ['studyGroups', 'sessions', selectedGroup.id] });
        }
      },
      onParticipantChange: () => {
        queryClient.invalidateQueries({ queryKey: ['studyGroups', 'participants', sessionDetailsId] });
      }
    });
    return unsubscribe;
  }, [sessionDetailsId, getToken, queryClient, selectedGroup?.id]);

  // Load user groups
  const loadUserGroups = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const groups = await studyGroupManager.getUserGroups(user.id);
      setUserGroups(groups);
    } catch (error) {
      console.error("Failed to load user groups:", error);
      toast.error("Failed to load your groups");
    } finally {
      setIsLoading(false);
    }
  }, [studyGroupManager, user]);

  // Load all groups for browsing
  const loadAllGroups = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const groups = await studyGroupManager.getAllGroups();
      setAllGroups(groups);
      
      // Check membership status
      const statusPromises = groups.map(async (group) => ({
        id: group.id,
        isMember: await studyGroupManager.isUserMember(group.id, user.id)
      }));
      
      const statuses = await Promise.all(statusPromises);
      const statusMap = statuses.reduce((acc, { id, isMember }) => {
        acc[id] = isMember;
        return acc;
      }, {} as Record<string, boolean>);
      
      setMembershipStatus(statusMap);
    } catch (error) {
      console.error("Failed to load all groups:", error);
      toast.error("Failed to load groups");
    } finally {
      setIsLoading(false);
    }
  }, [studyGroupManager, user]);

  // Load group details
  const loadGroupDetails = useCallback(async (group: StudyGroup) => {
    try {
      setSelectedGroup(group);
      
      // Load members, resources, and messages concurrently
      const [members, resources] = await Promise.all([
        studyGroupManager.getGroupMembersWithNames(group.id),
        studyGroupManager.getResources(group.id)
      ]);
      
      // Map members to include user_name property
      const membersWithUserName = members.map(member => ({
        ...member,
        user_name: member.name || 'Unknown'
      }));
      setGroupMembers(membersWithUserName);
      setGroupResources(resources);
      
      // Load messages if conversation exists
      if (group.conversation_id) {
        try {
          const messages = await messagingService.getMessages(group.conversation_id);
          setGroupMessages(messages);
        } catch (error) {
          console.error("Failed to load messages:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load group details:", error);
      toast.error("Failed to load group details");
    }
  }, [studyGroupManager, messagingService]);

  // Effects
  useEffect(() => {
    if (isPopoverOpen && user) {
      loadUserGroups();
      loadAllGroups();
    }
  }, [isPopoverOpen, user, loadUserGroups, loadAllGroups]);

  // Load initial data for the card
  useEffect(() => {
    if (user) {
      loadUserGroups();
    }
  }, [user, loadUserGroups]);

  // Group creation
  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    
    try {
      await studyGroupManager.createGroup(newGroupName, user.id, newGroupDescription);
      setNewGroupName("");
      setNewGroupDescription("");
      loadUserGroups();
      loadAllGroups();
      toast.success("Group created successfully!");
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error("Failed to create group");
    }
  };

  // Join/leave group
  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      // Check if user is already a member
      const isAlreadyMember = await studyGroupManager.isUserMember(groupId, user.id);
      if (isAlreadyMember) {
        toast.error("You are already a member of this group");
        return;
      }

      await studyGroupManager.addMember(groupId, user.id, 'member');
      setMembershipStatus(prev => ({ ...prev, [groupId]: true }));
      loadUserGroups();
      loadAllGroups(); // Refresh to update membership status
      toast.success("Joined group successfully!");
    } catch (error) {
      console.error("Failed to join group:", error);
      toast.error("Failed to join group");
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      // Check if user is the owner - owners can't leave their own groups
      const group = await studyGroupManager.getGroup(groupId);
      if (group?.created_by === user.id) {
        toast.error("Group owners cannot leave their own groups. Transfer ownership or delete the group instead.");
        return;
      }

      await studyGroupManager.removeMember(groupId, user.id);
      setMembershipStatus(prev => ({ ...prev, [groupId]: false }));
      loadUserGroups();
      loadAllGroups(); // Refresh to update membership status
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
      toast.success("Left group successfully!");
    } catch (error) {
      console.error("Failed to leave group:", error);
      toast.error("Failed to leave group");
    }
  };

  // Resource management
  const handleAddResource = async () => {
    if (!selectedGroup || !user || !newResourceTitle.trim()) return;
    
    try {
      await studyGroupManager.addResource(selectedGroup.id, user.id, {
        resource_type: newResourceType,
        title: newResourceTitle,
        description: newResourceContent || undefined,
        url: newResourceUrl || undefined,
        file_path: undefined
      });
      
      setNewResourceTitle("");
      setNewResourceContent("");
      setNewResourceUrl("");
      setNewResourceType("note");
      
      // Reload resources
      const resources = await studyGroupManager.getResources(selectedGroup.id);
      setGroupResources(resources);
      toast.success("Resource added successfully!");
    } catch (error) {
      console.error("Failed to add resource:", error);
      toast.error("Failed to add resource");
    }
  };

  // Message sending
  const handleSendMessage = async () => {
    if (!selectedGroup || !user || !newMessage.trim()) return;
    // Fallback: ensure conversation exists and user is a participant
    let conversationId = selectedGroup.conversation_id;
    try {
      if (!conversationId) {
        conversationId = await messagingService.createGroupConversation(
          selectedGroup.name,
          user.id,
          selectedGroup.description || undefined
        );
        // Persist on group (best-effort; ignore UI failure)
        try {
          // TODO: Implement attachConversationId method
          console.log('Would attach conversation ID:', conversationId, 'to group:', selectedGroup.id);
          setSelectedGroup({ ...selectedGroup, conversation_id: conversationId });
        } catch {}
      }
      // Ensure current user is participant
      try { await messagingService.addConversationParticipant(conversationId!, user.id); } catch {}
    } catch {}
    
    // Check if user is a member of the group
    if (!membershipStatus[selectedGroup.id]) {
      toast.error("You must be a member of this group to send messages");
      return;
    }
    
    try {
      await messagingService.sendMessage({
        userId: user.id,
        recipientId: user.id, // satisfy NOT NULL recipient_id for group messages
        content: newMessage.trim(),
        conversationId: conversationId!
      });
      setNewMessage("");
      
      // Reload messages
      const messages = await messagingService.getMessages(conversationId!);
      setGroupMessages(messages);
      toast.success("Message sent!");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return allGroups;
    return allGroups.filter(group => 
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allGroups, searchQuery]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'link': return <Link className="h-4 w-4" />;
      case 'file': return <Upload className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const [groupTab, setGroupTab] = useState('overview');
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [newSessionStart, setNewSessionStart] = useState('');
  const [newSessionEnd, setNewSessionEnd] = useState('');
  const [newSessionMaxParticipants, setNewSessionMaxParticipants] = useState<number | ''>('');

  const handleCreateSession = async () => {
    if (!selectedGroup || !user) return;
    if (!newSessionTitle || !newSessionStart || !newSessionEnd) {
      toast.error('Please fill title, start and end times');
      return;
    }
    
    // Validate end time is after start time
    if (new Date(newSessionEnd) <= new Date(newSessionStart)) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      await createSession.mutateAsync({
        // createSession expects payload matching StudySession fields with creatorId
        creatorId: user.id,
        title: newSessionTitle,
        description: newSessionDescription,
        start_time: newSessionStart,
        end_time: newSessionEnd,
        max_participants: newSessionMaxParticipants ? Number(newSessionMaxParticipants) : null,
        session_type: 'general',
        status: 'scheduled',
        metadata: {}
      } as any);
      
      setNewSessionTitle('');
      setNewSessionDescription('');
      setNewSessionStart('');
      setNewSessionEnd('');
      setNewSessionMaxParticipants('');
      toast.success('Session created successfully');
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create session');
    }
  };

  const sessions = sessionsQuery.data;
  const sessionsLoading = sessionsQuery.isLoading;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
          <Users className="h-6 w-6 text-primary" />
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Study Groups Hub</span>
        </CardTitle>
        <CardDescription className="text-sm">Find, create, and join study groups to collaborate with your peers.</CardDescription>
      </CardHeader>
      <CardContent>
        {userGroups.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Your Groups:</p>
            <div className="space-y-1">
              {userGroups.slice(0, 3).map((group) => (
                <div key={group.id} className="flex items-center gap-2 text-sm">
                  <Users className="h-3 w-3" />
                  <span className="truncate">{group.name}</span>
                </div>
              ))}
              {userGroups.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{userGroups.length - 3} more groups
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You haven't joined any study groups yet.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4">
        <Dialog open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto h-10 px-5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow">
              <Users className="h-4 w-4 mr-2" />
              Browse Groups
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[1100px] w-[95vw] h-[80vh] p-0 flex flex-col overflow-hidden border-none shadow-2xl">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 p-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between">
                <AnimatedGradientText>
                  <span className="inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent">
                    Study Groups Hub
                  </span>
                </AnimatedGradientText>
                {/* Single close control is provided by the dialog chrome; remove duplicate */}
              </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex min-h-full">
                {/* Sidebar */}
                <div className={cn(
                  "w-full sm:w-80 sm:border-r bg-muted/40 transition-all duration-300 flex flex-col",
                  selectedGroup && "hidden sm:block"
                )}>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 m-2 h-10 rounded-xl sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                      <TabsTrigger value="browse" className="text-xs px-3 rounded-lg">Browse</TabsTrigger>
                      <TabsTrigger value="my-groups" className="text-xs px-3 rounded-lg">My Groups</TabsTrigger>
                    </TabsList>

                    <TabsContent value="browse" className="m-0">
                      <div className="p-4 space-y-4">
                        {/* Search & Categories */}
                        <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search groups..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {categoriesQuery.data?.map(cat => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(prev => prev === cat.id ? null : cat.id)}
                                className={cn(
                                  'px-3 py-1.5 rounded-full border text-xs transition',
                                  selectedCategory === cat.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                                )}
                                style={{ borderColor: '#ccc' }}
                              >
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Create Group Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Create New Group
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Study Group</DialogTitle>
                              <DialogDescription>
                                Create a collaborative space for studying together.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="groupName">Group Name</Label>
                                <Input
                                  id="groupName"
                                  placeholder="Enter group name"
                                  value={newGroupName}
                                  onChange={(e) => setNewGroupName(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="groupDescription">Description</Label>
                                <Textarea
                                  id="groupDescription"
                                  placeholder="Describe your group's purpose"
                                  value={newGroupDescription}
                                  onChange={(e) => setNewGroupDescription(e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <Label>Category</Label>
                                  <Select onValueChange={(v) => setNewGroupCategory(v)}>
                                    <SelectTrigger className="w-full mt-1">
                                      <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {categoriesQuery.data?.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Privacy</Label>
                                  <Select value={newGroupPrivacy} onValueChange={(v: any) => setNewGroupPrivacy(v)}>
                                    <SelectTrigger className="w-full mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="public">Public</SelectItem>
                                      <SelectItem value="private">Private</SelectItem>
                                      <SelectItem value="invite_only">Invite only</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button onClick={async () => {
                                  await studyGroupManager.createGroup(
                                    newGroupName,
                                    newGroupDescription
                                  );
                                  setNewGroupName('');
                                  setNewGroupDescription('');
                                  setNewGroupCategory(null);
                                  setNewGroupPrivacy('public');
                                  loadUserGroups();
                                  loadAllGroups();
                                }}>Create Group</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Groups List (discovery) */}
                        <div className="rounded-md border p-4">
                          <div className="space-y-2">
                            {(discoveryQuery.data ?? filteredGroups).map((group) => (
                              <Card 
                                key={group.id} 
                                className={cn(
                                  "cursor-pointer transition-colors hover:bg-accent/50",
                                  selectedGroup?.id === group.id && "bg-accent"
                                )}
                                onClick={() => loadGroupDetails(group)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm">{group.name}</h4>
                                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                        {group.description}
                                      </p>
                                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span>Last active {group.updated_at ? new Date(group.updated_at).toLocaleDateString() : '—'}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {membershipStatus[group.id] ? (
                                        <Badge variant="secondary" className="text-xs">Member</Badge>
                                      ) : (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                             // Enforce privacy: only public or invite_only via invitation; private requires invitation
                                             // TODO: Implement privacy level check
                                             if (false) {
                                               toast.error('This group is private. You need an invitation to join.');
                                               return;
                                             }
                                            handleJoinGroup(group.id);
                                          }}
                                        >
                                          <UserPlus className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="my-groups" className="m-0">
                      <div className="p-4">
                        <div className="space-y-2">
                          {userGroups.map((group) => (
                            <Card 
                              key={group.id} 
                              className={cn(
                                "cursor-pointer transition-colors hover:bg-accent/50",
                                selectedGroup?.id === group.id && "bg-accent"
                              )}
                              onClick={() => loadGroupDetails(group)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm">{group.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {group.description}
                                    </p>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => loadGroupDetails(group)}>
                                        <Settings className="h-4 w-4 mr-2" />
                                        Manage
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => handleLeaveGroup(group.id)}
                                      >
                                        <UserMinus className="h-4 w-4 mr-2" />
                                        Leave Group
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Main Content */}
                <div className={cn(
                  "flex-1 flex flex-col transition-all duration-300",
                  !selectedGroup && "hidden sm:flex"
                )}>
                  {selectedGroup ? (
                    <>
                      {/* Group Header */}
                      <div className="p-4 border-b">
                        <div className="flex items-center gap-3">
                          {/* Mobile Back Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="sm:hidden"
                            onClick={() => setSelectedGroup(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">{selectedGroup.name}</h3>
                                <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}
                                </Badge>
                                {!membershipStatus[selectedGroup.id] && (
                                  false ? (
                                    <Button size="sm" variant="outline" disabled title="Invite-only group">
                                      Request Invite
                                    </Button>
                                  ) : false ? (
                                    <Button size="sm" variant="outline" disabled title="Private group">
                                      Private
                                    </Button>
                                  ) : (
                                  <Button size="sm" onClick={() => handleJoinGroup(selectedGroup.id)}>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Join Group
                                  </Button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Group Content Tabs */}
                      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                          <TabsList className="mx-4 mt-0 sticky top-0 z-10 bg-background/80 backdrop-blur">
                          <TabsTrigger value="chat">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat
                          </TabsTrigger>
                          <TabsTrigger value="resources">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Resources
                            <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] leading-5">
                              {groupResources.length}
                            </span>
                          </TabsTrigger>
                          <TabsTrigger value="members">
                            <Users className="h-4 w-4 mr-2" />
                            Members
                            <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] leading-5">
                              {groupMembers.length}
                            </span>
                          </TabsTrigger>
                          <TabsTrigger value="sessions">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Sessions
                            <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] leading-5">
                              {sessionsQuery.data?.length ?? 0}
                            </span>
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="chat" className="flex-1 m-0">
                           <div className="p-4">
                             <div className="rounded-md border p-4">
                              <div className="space-y-4">
                                {groupMessages.length === 0 ? (
                                  <div className="text-center text-muted-foreground py-8">
                                    <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                                    <p>No messages yet. Start the conversation!</p>
                                  </div>
                                ) : (
                                  <AnimatedList>
                                    {groupMessages.map((message) => (
                                      <AnimatedListItem key={message.id}>
                                        <div className="flex gap-3">
                                                                                      <Avatar className="h-8 w-8">
                                              <AvatarFallback>
                                                {(message.sender_name || message.sender?.full_name || 'Unknown User').charAt(0).toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-sm">
                                                  {message.sender_name || message.sender?.full_name || 'Unknown User'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                  {new Date(message.created_at).toLocaleTimeString()}
                                                </span>
                                              </div>
                                            <p className="text-sm">{message.content}</p>
                                          </div>
                                        </div>
                                      </AnimatedListItem>
                                    ))}
                                  </AnimatedList>
                                )}
                              </div>
                             </div>
                          </div>
                          
                          {membershipStatus[selectedGroup.id] && (
                            <div className="p-4 border-t sticky bottom-0 bg-background/80 backdrop-blur z-10">
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Type a message..."
                                  value={newMessage}
                                  onChange={(e) => setNewMessage(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendMessage();
                                    }
                                  }}
                                  disabled={!membershipStatus[selectedGroup.id]}
                                />
                                <Button 
                                  onClick={handleSendMessage}
                                  disabled={!newMessage.trim() || !membershipStatus[selectedGroup.id]}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                          {!membershipStatus[selectedGroup.id] && (
                            <div className="p-4 border-t bg-muted/30">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Join this group to participate in chat.</p>
                                <Button size="sm" onClick={() => handleJoinGroup(selectedGroup.id)}>
                                  Join Group
                                </Button>
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        {/* Sessions Tab */}
                        <TabsContent value="sessions" className="flex-1 m-0">
                          <div className="p-4 space-y-4">
                              <Card>
                              <CardHeader>
                                <CardTitle>Create Session</CardTitle>
                                <CardDescription>Schedule a new study session for this group</CardDescription>
                              </CardHeader>
                              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                  placeholder="Title"
                                  value={newSession.title}
                                  onChange={(e) => setNewSession(s => ({ ...s, title: e.target.value }))}
                                />
                                <Input
                                  type="datetime-local"
                                  placeholder="Start time (YYYY-MM-DD HH:mm)"
                                  value={newSession.start_time}
                                  onChange={(e) => setNewSession(s => ({ ...s, start_time: e.target.value }))}
                                />
                                <Textarea
                                  placeholder="Description"
                                  value={newSession.description}
                                  onChange={(e) => setNewSession(s => ({ ...s, description: e.target.value }))}
                                />
                                <Input
                                  type="datetime-local"
                                  placeholder="End time (YYYY-MM-DD HH:mm)"
                                  value={newSession.end_time}
                                  onChange={(e) => setNewSession(s => ({ ...s, end_time: e.target.value }))}
                                />
                                <Input
                                  placeholder="Max participants (optional)"
                                  type="number"
                                  min={1}
                                  value={newSession.max_participants ?? ''}
                                  onChange={(e) => setNewSession(s => ({ ...s, max_participants: e.target.value ? Number(e.target.value) : null }))}
                                />
                              </CardContent>
                              <CardFooter>
                                <Button
                                  disabled={!selectedGroup || !user || createSession.isPending}
                                  onClick={() => {
                                    if (!selectedGroup || !user) return;
                                    if (!newSession.title || !newSession.start_time || !newSession.end_time) {
                                      toast.error('Please fill title, start and end times');
                                      return;
                                    }
                                    createSession.mutate({
                                      creatorId: user.id,
                                      title: newSession.title,
                                      description: newSession.description,
                                      start_time: newSession.start_time,
                                      end_time: newSession.end_time,
                                      session_type: 'general',
                                      max_participants: newSession.max_participants ?? null,
                                      status: 'scheduled',
                                      metadata: {},
                                    } as any, {
                                      onSuccess: () => {
                                        toast.success('Session created');
                                        setNewSession({ title: '', description: '', start_time: '', end_time: '', max_participants: null });
                                      },
                                      onError: () => toast.error('Failed to create session'),
                                    } as any);
                                  }}
                                >
                                  {createSession.isPending ? 'Creating...' : 'Create Session'}
                                </Button>
                              </CardFooter>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle>Sessions</CardTitle>
                                <CardDescription>Active and upcoming sessions for this group</CardDescription>
                              </CardHeader>
                              <CardContent>
                                {sessionsQuery.isLoading ? (
                                  <p className="text-sm text-muted-foreground">Loading sessions...</p>
                                ) : (sessionsQuery.data?.length ? (
                                  <div className="space-y-3">
                                    {/* Active */}
                                    {sessionsQuery.data.filter(s => s.status === 'active').length > 0 && (
                                      <div>
                                        <div className="text-xs uppercase text-muted-foreground mb-2">Active</div>
                                        <div className="space-y-2">
                                          {sessionsQuery.data.filter(s => s.status === 'active').map(s => (
                                            <button key={s.id} type="button" className="w-full text-left rounded-md border p-3 bg-green-50/5 hover:bg-green-100/5 transition" onClick={() => setSessionDetailsId(s.id)}>
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <div className="font-medium">{s.title}</div>
                                                  <div className="text-xs text-muted-foreground">{new Date(s.start_time).toLocaleTimeString()} • In progress</div>
                                                </div>
                                                <div className="text-sm text-muted-foreground">{s.current_participants}/{s.max_participants ?? '∞'}</div>
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {/* Upcoming */}
                                    {sessionsQuery.data.filter(s => s.status !== 'active').length > 0 && (
                                      <div>
                                        <div className="text-xs uppercase text-muted-foreground mb-2">Upcoming</div>
                                        <div className="space-y-2">
                                          {sessionsQuery.data.filter(s => s.status !== 'active').map(s => (
                                      <button
                                        type="button"
                                        key={s.id}
                                        className="w-full text-left rounded-md border p-3 hover:bg-muted/50 transition"
                                        onClick={() => setSessionDetailsId(s.id)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <div className="font-medium">{s.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {new Date(s.start_time).toLocaleString()} → {new Date(s.end_time).toLocaleString()} • {s.status}
                                            </div>
                                          </div>
                                          <div className="text-sm text-muted-foreground">{s.current_participants}/{s.max_participants ?? '∞'}</div>
                                        </div>
                                      </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No upcoming sessions yet.</p>
                                ))}
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>

                        <Dialog open={Boolean(sessionDetailsId)} onOpenChange={(open) => !open && setSessionDetailsId(null)}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Session Details</DialogTitle>
                              <DialogDescription>View participants and join or leave the session</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {participantsQuery.isLoading ? (
                                <p className="text-sm text-muted-foreground">Loading participants...</p>
                              ) : (
                                <div>
                                  <div className="font-medium mb-2">Participants</div>
                                  <div className="space-y-2 max-h-60 overflow-auto pr-2">
                                    {(participantsQuery.data ?? []).map(p => (
                                      <div key={p.id} className="flex items-center justify-between text-sm">
                                        <span className="truncate">{participantNames[p.user_id] || p.user_id}</span>
                                        <span className="text-muted-foreground">{p.status}</span>
                                      </div>
                                    ))}
                                    {participantsQuery.data?.length === 0 && (
                                      <p className="text-sm text-muted-foreground">No participants yet.</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <div className="flex w-full justify-between">
                                <Button
                                  variant="secondary"
                                  onClick={() => setSessionDetailsId(null)}
                                >
                                  Close
                                </Button>
                                {user && sessionDetailsId && (
                                  <div className="space-x-2">
                                    {/* Conditional Join/Leave based on participation */}
                                    {participantsQuery.data?.some(p => p.user_id === user.id) ? (
                                      <Button
                                        variant="ghost"
                                        onClick={() => {
                                          if (!user || !sessionDetailsId) return;
                                          leaveSession.mutate({ sessionId: sessionDetailsId, userId: user.id }, {
                                            onSuccess: () => toast.success('Left session'),
                                            onError: () => toast.error('Failed to leave session'),
                                          });
                                        }}
                                      >
                                        Leave Session
                                      </Button>
                                    ) : (
                                      <Button
                                        onClick={() => {
                                          if (!user || !sessionDetailsId) return;
                                          joinSession.mutate({ sessionId: sessionDetailsId, userId: user.id }, {
                                            onSuccess: () => toast.success('Joined session'),
                                            onError: () => toast.error('Failed to join session'),
                                          });
                                        }}
                                      >
                                        Join Session
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <TabsContent value="resources" className="flex-1 m-0 p-4">
                          <div className="space-y-4">
                            {membershipStatus[selectedGroup.id] && (
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-sm">Add Resource</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <Input
                                      placeholder="Resource title"
                                      value={newResourceTitle}
                                      onChange={(e) => setNewResourceTitle(e.target.value)}
                                    />
                                    <Select value={newResourceType} onValueChange={setNewResourceType}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="note">Note</SelectItem>
                                        <SelectItem value="link">Link</SelectItem>
                                        <SelectItem value="file">File</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {newResourceType === 'link' ? (
                                    <Input
                                      placeholder="URL"
                                      value={newResourceUrl}
                                      onChange={(e) => setNewResourceUrl(e.target.value)}
                                    />
                                  ) : (
                                    <Textarea
                                      placeholder="Content"
                                      value={newResourceContent}
                                      onChange={(e) => setNewResourceContent(e.target.value)}
                                    />
                                  )}
                                  <Button onClick={handleAddResource} className="w-full">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Resource
                                  </Button>
                                </CardContent>
                              </Card>
                            )}

                            <div className="rounded-md border p-4">
                              <div className="space-y-2">
                                {groupResources.map((resource) => (
                                  <Card key={resource.id}>
                                    <CardContent className="p-3">
                                      <div className="flex items-start gap-3">
                                        {getResourceIcon(resource.resource_type)}
                                        <div className="flex-1">
                                          <h4 className="font-medium text-sm">{resource.title}</h4>
                                          {resource.content && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {resource.content}
                                            </p>
                                          )}
                                          {resource.url && (
                                            <a 
                                              href={resource.url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-500 hover:underline mt-1 block"
                                            >
                                              {resource.url}
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="members" className="flex-1 m-0 p-4">
                          <div className="rounded-md border p-4">
                            <div className="space-y-2">
                              {groupMembers.map((member) => (
                                <Card key={member.id}>
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                                                              <div className="flex items-center gap-3">
                                          <Avatar>
                                            <AvatarFallback>
                                              {member.user_name.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <p className="font-medium text-sm">{member.user_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                              Joined {new Date(member.joined_at).toLocaleDateString()}
                                            </p>
                                          </div>
                                        </div>
                                      <div className="flex items-center gap-2">
                                        {getRoleIcon(member.role)}
                                        <Badge variant="outline" className="text-xs">
                                          {member.role}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center">
                      <div>
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-semibold mb-2">Select a Study Group</h3>
                        <p className="text-sm text-muted-foreground">
                          Choose a group from the sidebar to view details, chat with members, and access resources.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto"><PlusCircle className="h-4 w-4 mr-2"/>Create New Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new study group</DialogTitle>
              <DialogDescription>
                Create a collaborative space where you can chat with members and share study resources.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="Group Name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Textarea
                placeholder="Group Description"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handleCreateGroup}>Create Group</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}; 