"use client";

import type React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudyGroupManager, type StudyGroup, type StudyGroupMember, type StudyGroupResource } from '@/lib/social/StudyGroupManager';
import { MessagingService } from '@/lib/messaging/MessagingService';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/client';
import { wrapClerkTokenForSupabase } from '@/lib/clerk/clerkSupabaseToken';
import {
  useGroupCategories,
  useDiscoverGroups,
  useStudyGroupHubRealtime,
  useStudyGroupMembersDetailed,
  useStudyGroupResources,
  useUserStudyGroups,
  studyGroupKeys,
} from '@/hooks/useStudyGroupQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
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
  Flag,
  Link,
  MoreVertical,
  Trash2,
  X,
  UserMinus,
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

import GroupManagementPanel from './GroupManagementPanel';
import { StudyGroupChatTab } from '@/components/social/study-group/StudyGroupChatTab';
import { GroupsBento } from './group/GroupsBento';
import { submitSocialReport } from '@/lib/social/submitSocialReport';

/** Matches Groups lane bento: diffused scrim, not flat `bg-black/80`. */
const GROUPS_HUB_OVERLAY = cn(
  "bg-[hsl(var(--foreground)/0.12)] backdrop-blur-2xl",
  "supports-[backdrop-filter]:bg-[hsl(var(--foreground)/0.05)]",
  "before:pointer-events-none before:absolute before:inset-0",
  "before:bg-[radial-gradient(ellipse_80%_52%_at_50%_0%,hsl(var(--primary)/0.14),transparent_58%)]",
);

/** Double-shell panel: full-bleed on small phones, floating on `sm+`. */
const GROUPS_HUB_SHELL = cn(
  "gap-0 border-0 p-0 shadow-none flex flex-col overflow-hidden",
  "w-full max-w-none rounded-none bg-transparent",
  "h-[100dvh] max-h-[100dvh] min-h-0 sm:h-[min(82vh,880px)] sm:max-h-[85vh] sm:max-w-[1100px] sm:w-[min(1100px,calc(100vw-1.25rem))]",
  "sm:rounded-[1.75rem] sm:border sm:border-border/55 sm:bg-card/96 sm:shadow-[0_40px_96px_-48px_hsl(var(--foreground)/0.42)] sm:ring-1 sm:ring-border/35",
);

const MEMBER_COUNT_CACHE_KEY = 'study-group-known-member-counts';

export const StudyGroupHub: React.FC = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const studyGroupManager = useMemo(() => new StudyGroupManager(getToken), [getToken]);
  const messagingService = useMemo(() => new MessagingService(getToken), [getToken]);

  const userGroupsQuery = useUserStudyGroups(getToken, user?.id);
  const userGroups = userGroupsQuery.data ?? [];

  // State management
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [allGroups, setAllGroups] = useState<StudyGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<Record<string, boolean>>({});
  const [knownMemberCounts, setKnownMemberCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState<string | null>(null);
  const [newGroupPrivacy, setNewGroupPrivacy] = useState<'public' | 'private' | 'invite_only'>('public');
  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceContent, setNewResourceContent] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [newResourceFile, setNewResourceFile] = useState<File | null>(null);
  const [newResourceType, setNewResourceType] = useState<string>("note");
  // Discovery data
  const categoriesQuery = useGroupCategories(getToken);
  const discoveryQuery = useDiscoverGroups(getToken, { q: searchQuery, categoryId: selectedCategory });

  const queryClient = useQueryClient();

  const selectedGroupId = selectedGroup?.id ?? '';
  useStudyGroupHubRealtime(selectedGroupId);

  const membersQuery = useStudyGroupMembersDetailed(getToken, selectedGroupId);
  const resourcesQuery = useStudyGroupResources(getToken, selectedGroupId);
  const groupMembers = membersQuery.data ?? [];
  const groupResources = resourcesQuery.data ?? [];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(MEMBER_COUNT_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number>;
      if (!parsed || typeof parsed !== 'object') return;
      setKnownMemberCounts((prev) => ({ ...parsed, ...prev }));
    } catch {
      // Ignore cache read errors.
    }
  }, []);

  useEffect(() => {
    if (!selectedGroupId || !Array.isArray(membersQuery.data)) return;
    setKnownMemberCounts((prev) => ({
      ...prev,
      [selectedGroupId]: membersQuery.data.length,
    }));
  }, [selectedGroupId, membersQuery.data]);

  useEffect(() => {
    if (userGroups.length === 0) return;
    setKnownMemberCounts((prev) => {
      const next = { ...prev };
      for (const group of userGroups) {
        const explicitCount = Number((group as any).member_count);
        if (Number.isFinite(explicitCount) && explicitCount >= 0) {
          next[group.id] = explicitCount;
        }
      }
      return next;
    });
  }, [userGroups]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        MEMBER_COUNT_CACHE_KEY,
        JSON.stringify(knownMemberCounts),
      );
    } catch {
      // Ignore cache write errors.
    }
  }, [knownMemberCounts]);

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

  const loadGroupDetails = useCallback((group: StudyGroup) => {
    setSelectedGroup(group);
  }, []);

  // Effects
  useEffect(() => {
    if (!isPopoverOpen || !user?.id) return;
    void queryClient.invalidateQueries({ queryKey: studyGroupKeys.userGroups(user.id) });
    void loadAllGroups();
  }, [isPopoverOpen, user?.id, loadAllGroups, queryClient]);

  // useUserStudyGroups already fetches when userId is set, do not depend on the
  // useQuery result object (new reference every fetch) or refetch loops forever.

  // Group creation
  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    
    try {
      await studyGroupManager.createGroup(newGroupName, user.id, newGroupDescription, {
        privacy_level: newGroupPrivacy,
        category_id: newGroupCategory,
      });
      setNewGroupName("");
      setNewGroupDescription("");
      void queryClient.invalidateQueries({ queryKey: studyGroupKeys.userGroups(user.id) });
      loadAllGroups();
      toast.success("Group created successfully!");
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error("Failed to create group");
    }
  };

  // Bento morph create path: take explicit values so the surface owns its form state.
  const handleCreateGroupFromBento = async ({
    name,
    description,
  }: { name: string; description: string }) => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give the group a name");
      return;
    }
    try {
      await studyGroupManager.createGroup(trimmed, user.id, description);
      void queryClient.invalidateQueries({
        queryKey: studyGroupKeys.userGroups(user.id),
      });
      loadAllGroups();
      toast.success("Group created");
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error("Failed to create group");
      throw error;
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

      await StudyGroupManager.joinGroup(groupId);
      setMembershipStatus(prev => ({ ...prev, [groupId]: true }));
      void queryClient.invalidateQueries({ queryKey: studyGroupKeys.userGroups(user.id) });
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

      await StudyGroupManager.leaveGroup(groupId);
      setMembershipStatus(prev => ({ ...prev, [groupId]: false }));
      void queryClient.invalidateQueries({ queryKey: studyGroupKeys.userGroups(user.id) });
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

  const handleArchiveGroup = async (groupId: string) => {
    if (!user) return;
    const shouldArchive = window.confirm(
      "Archive this group? It will disappear from group lists, but its chat and resources will stay preserved for admin review.",
    );
    if (!shouldArchive) return;

    try {
      await studyGroupManager.archiveGroup(groupId);
      setMembershipStatus((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setAllGroups((prev) => prev.filter((group) => group.id !== groupId));
      setSelectedGroup(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studyGroupKeys.userGroups(user.id) }),
        queryClient.invalidateQueries({ queryKey: studyGroupKeys.discovery({ q: searchQuery, categoryId: selectedCategory }) }),
      ]);
      toast.success("Group archived. Its chat and resources are preserved.");
    } catch (error) {
      console.error("[social:archiveGroup]", error);
      toast.error("Couldn't archive this group right now. Try again.");
    }
  };

  const handleReportGroup = async (group: StudyGroup) => {
    const reason = window.prompt(
      `Report ${group.name}? Tell us what needs review.`,
    );
    if (!reason?.trim()) return;

    try {
      await submitSocialReport({
        targetType: 'group',
        targetId: group.id,
        reason: reason.trim(),
        context: { source: 'study_group_hub', group_name: group.name },
      });
      toast.success('Report sent. Thanks for keeping MemoSpark safe.');
    } catch (error) {
      console.error('[social:reportGroup]', error);
      toast.error("Couldn't send the report right now. Try again.");
    }
  };

  const handleReportResource = async (resource: StudyGroupResource) => {
    const reason = window.prompt(
      `Report "${resource.title}"? Tell us what needs review.`,
    );
    if (!reason?.trim()) return;

    try {
      await submitSocialReport({
        targetType: 'resource',
        targetId: resource.id,
        reason: reason.trim(),
        context: {
          source: 'study_group_resource',
          group_id: resource.group_id,
          resource_type: resource.resource_type,
        },
      });
      toast.success('Resource report sent.');
    } catch (error) {
      console.error('[social:reportResource]', error);
      toast.error("Couldn't report this resource right now. Try again.");
    }
  };

  const handleDeleteResource = async (resource: StudyGroupResource) => {
    if (!selectedGroup) return;
    const shouldDelete = window.confirm(`Delete "${resource.title}" from this group?`);
    if (!shouldDelete) return;

    try {
      const response = await fetch(
        `/api/study-groups/${selectedGroup.id}/resources?resourceId=${resource.id}`,
        { method: 'DELETE' },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete resource');
      }
      await queryClient.invalidateQueries({
        queryKey: studyGroupKeys.groupResources(selectedGroup.id),
      });
      toast.success('Resource removed.');
    } catch (error) {
      console.error('[social:deleteResource]', error);
      toast.error("Couldn't remove this resource right now. Try again.");
    }
  };

  // Resource management
  const handleAddResource = async () => {
    if (!selectedGroup || !user || !newResourceTitle.trim()) return;
    
    try {
      let uploadedFilePath: string | undefined;

      if (newResourceType === 'file') {
        if (!newResourceFile) {
          toast.error('Choose a file before adding this resource.');
          return;
        }

        const uploadResponse = await fetch(
          `/api/study-groups/${selectedGroup.id}/resources/upload`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: newResourceFile.name,
              contentType: newResourceFile.type,
              fileSize: newResourceFile.size,
            }),
          },
        );
        const uploadPayload = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload.error ?? 'Failed to prepare file upload');
        }

        const client = createAuthenticatedSupabaseClient(
          wrapClerkTokenForSupabase(getToken),
        );
        if (!client) {
          throw new Error('Storage client unavailable');
        }

        const { error: uploadError } = await client.storage
          .from(uploadPayload.bucket)
          .uploadToSignedUrl(
            uploadPayload.path,
            uploadPayload.token,
            newResourceFile,
          );

        if (uploadError) {
          throw uploadError;
        }
        uploadedFilePath = uploadPayload.path;
      }

      const savedResource = await studyGroupManager.addResource(selectedGroup.id, user.id, {
        resource_type: newResourceType,
        title: newResourceTitle,
        description: newResourceContent || undefined,
        url: newResourceType === 'link' ? newResourceUrl || undefined : undefined,
        file_path: uploadedFilePath
      });
      if (!savedResource) {
        throw new Error('Resource did not save');
      }
      
      setNewResourceTitle("");
      setNewResourceContent("");
      setNewResourceUrl("");
      setNewResourceFile(null);
      setNewResourceType("note");
      void queryClient.invalidateQueries({ queryKey: studyGroupKeys.groupResources(selectedGroup.id) });
      toast.success("Resource added successfully!");
    } catch (error) {
      console.error("Failed to add resource:", error);
      toast.error("Failed to add resource");
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

  const groupMemberCounts = useMemo(() => {
    return userGroups.reduce((acc, group) => {
      const knownCount = knownMemberCounts[group.id];
      if (typeof knownCount === 'number' && knownCount >= 0) {
        acc[group.id] = knownCount;
      } else {
        const explicitCount = Number((group as any).member_count);
        if (Number.isFinite(explicitCount) && explicitCount >= 0) {
          acc[group.id] = explicitCount;
        }
      }
      return acc;
    }, {} as Record<string, number>);
  }, [userGroups, knownMemberCounts]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'link': return <Link className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const [groupTab, setGroupTab] = useState('chat');

  return (
    <div className="relative space-y-6">
      <GroupsBento
        groups={userGroups}
        memberCounts={groupMemberCounts}
        onOpenGroup={(g) => {
          setSelectedGroup(g);
          setIsPopoverOpen(true);
        }}
        onCreateGroup={handleCreateGroupFromBento}
        onDiscover={() => {
          setSelectedGroup(null);
          setIsPopoverOpen(true);
        }}
      />

      <Dialog open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <DialogContent
          overlayClassName={GROUPS_HUB_OVERLAY}
          className={cn(
            GROUPS_HUB_SHELL,
            "duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-card/98 sm:bg-transparent">
            {/* Header */}
            <div
              className={cn(
                "flex-shrink-0 border-b border-border/50 bg-background/90 px-4 py-3 sm:px-5 sm:py-4",
                "safe-area-top",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 max-w-[65ch] text-left">
                  <DialogTitle className="text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
                    Groups
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Search, join, and manage your groups.
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="flex min-h-full flex-col sm:flex-row">
                {/* Sidebar */}
                <div className={cn(
                  "flex w-full flex-col border-border/40 transition-all duration-300 sm:w-[min(100%,20rem)] sm:border-r sm:bg-muted/25",
                  selectedGroup && "hidden sm:flex"
                )}>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
                    <TabsList
                      className={cn(
                        "sticky top-0 z-20 mx-3 mt-3 grid h-11 grid-cols-2 gap-1 rounded-2xl p-1",
                        "border border-border/50 bg-background/90 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
                        "sm:mx-4 sm:mt-4",
                      )}
                    >
                      <TabsTrigger
                        value="browse"
                        className="rounded-[0.85rem] text-xs font-medium data-[state=active]:bg-primary/12 data-[state=active]:text-foreground"
                      >
                        Discover
                      </TabsTrigger>
                      <TabsTrigger
                        value="my-groups"
                        className="rounded-[0.85rem] text-xs font-medium data-[state=active]:bg-primary/12 data-[state=active]:text-foreground"
                      >
                        Yours
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="browse" className="m-0 flex-1">
                      <div className="space-y-4 p-4 sm:p-5">
                        {/* Search & Categories */}
                        <div className="space-y-3">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 rounded-2xl border-border/60 bg-background/80 pl-10 text-base leading-normal sm:text-sm"
                          />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {categoriesQuery.data?.map(cat => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(prev => prev === cat.id ? null : cat.id)}
                                className={cn(
                                  "min-h-9 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium transition-colors",
                                  selectedCategory === cat.id
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "bg-background/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                                )}
                              >
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Create Group Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              className="h-11 w-full rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_32px_-16px_hsl(var(--primary)/0.65)]"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Start a group
                            </Button>
                          </DialogTrigger>
                          <DialogContent
                            overlayClassName={GROUPS_HUB_OVERLAY}
                            className={cn(
                              "max-w-md rounded-[1.35rem] border-border/55 bg-card/98 p-6 shadow-[0_32px_64px_-40px_hsl(var(--foreground)/0.45)] ring-1 ring-border/35",
                            )}
                          >
                            <DialogHeader>
                              <DialogTitle>New group</DialogTitle>
                              <DialogDescription className="sr-only">
                                Name, description, category, and privacy.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="groupName">Name</Label>
                                <Input
                                  id="groupName"
                                  placeholder="e.g. Chem 201, exam block"
                                  value={newGroupName}
                                  onChange={(e) => setNewGroupName(e.target.value)}
                                  className="mt-1.5 rounded-xl border-border/60"
                                />
                              </div>
                              <div>
                                <Label htmlFor="groupDescription">Description</Label>
                                <Textarea
                                  id="groupDescription"
                                  placeholder="Optional"
                                  value={newGroupDescription}
                                  onChange={(e) => setNewGroupDescription(e.target.value)}
                                  className="mt-1.5 min-h-[88px] rounded-xl border-border/60"
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
                                  <Select
                                    value={newGroupPrivacy}
                                    onValueChange={(v) =>
                                      setNewGroupPrivacy(
                                        v as "public" | "private" | "invite_only",
                                      )
                                    }
                                  >
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
                            <DialogFooter className="gap-2 sm:gap-0">
                              <DialogClose asChild>
                                <Button type="button" variant="outline" className="rounded-xl">
                                  Cancel
                                </Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button
                                  type="button"
                                  className="rounded-xl"
                                  onClick={async () => {
                                    if (!user?.id) return;
                                    const name = newGroupName.trim();
                                    if (!name) {
                                      toast.error("Add a name first");
                                      return;
                                    }
                                    try {
                                      await studyGroupManager.createGroup(
                                        name,
                                        user.id,
                                        newGroupDescription,
                                        {
                                          privacy_level: newGroupPrivacy,
                                          category_id: newGroupCategory,
                                        },
                                      );
                                      setNewGroupName("");
                                      setNewGroupDescription("");
                                      setNewGroupCategory(null);
                                      setNewGroupPrivacy("public");
                                      void queryClient.invalidateQueries({
                                        queryKey: studyGroupKeys.userGroups(user.id),
                                      });
                                      loadAllGroups();
                                      toast.success("Group created");
                                    } catch {
                                      toast.error("Could not create group");
                                    }
                                  }}
                                >
                                  Create
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Groups List (discovery) */}
                        <div className="rounded-[1.25rem] border border-border/50 bg-background/40 p-1 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]">
                          <div className="space-y-1.5 p-2 sm:p-3">
                            {(discoveryQuery.data ?? filteredGroups).map((group) => (
                              <div
                                key={group.id}
                                role="button"
                                tabIndex={0}
                                className={cn(
                                  "w-full rounded-2xl border border-transparent bg-card/80 p-3 text-left transition-colors",
                                  "hover:border-border/60 hover:bg-muted/40",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                  selectedGroup?.id === group.id &&
                                    "border-primary/35 bg-primary/8",
                                )}
                                onClick={() => loadGroupDetails(group)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    loadGroupDetails(group);
                                  }
                                }}
                              >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="truncate text-sm font-semibold tracking-tight">
                                        {group.name}
                                      </h4>
                                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                        {group.description}
                                      </p>
                                      <div className="mt-2 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                        Updated{" "}
                                        {group.updated_at
                                          ? new Date(group.updated_at).toLocaleDateString()
                                          : "unknown"}
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      {membershipStatus[group.id] ? (
                                        <Badge variant="secondary" className="text-[0.65rem]">
                                          In
                                        </Badge>
                                      ) : (
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="outline"
                                          className="h-10 w-10 shrink-0 rounded-full border-border/60"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleJoinGroup(group.id);
                                          }}
                                        >
                                          <UserPlus className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="my-groups" className="m-0 flex-1">
                      <div className="p-4 sm:p-5">
                        <div className="space-y-1.5">
                          {userGroups.map((group) => (
                            <div
                              key={group.id}
                              role="button"
                              tabIndex={0}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-2xl border border-border/45 bg-card/85 p-3 text-left transition-colors",
                                "hover:border-border/70 hover:bg-muted/35",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                selectedGroup?.id === group.id && "border-primary/35 bg-primary/8",
                              )}
                              onClick={() => loadGroupDetails(group)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  loadGroupDetails(group);
                                }
                              }}
                            >
                                  <div className="min-w-0 flex-1">
                                    <h4 className="truncate text-sm font-semibold tracking-tight">
                                      {group.name}
                                    </h4>
                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                      {group.description}
                                    </p>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 shrink-0 rounded-full"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                      <DropdownMenuItem onClick={() => loadGroupDetails(group)}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        Open
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => handleLeaveGroup(group.id)}
                                      >
                                        <UserMinus className="mr-2 h-4 w-4" />
                                        Leave
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                            </div>
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
                      <div className="border-b border-border/50 bg-background/60 px-4 py-3 sm:px-5">
                        <div className="flex items-start gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-0.5 h-11 w-11 shrink-0 rounded-xl sm:hidden"
                            onClick={() => setSelectedGroup(null)}
                            aria-label="Back to list"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                                  {selectedGroup.name}
                                </h3>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                  {selectedGroup.description}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="rounded-full text-xs">
                                  {groupMembers.length}{" "}
                                  {groupMembers.length !== 1 ? "people" : "person"}
                                </Badge>
                                {!membershipStatus[selectedGroup.id] && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-10 rounded-full px-4"
                                    onClick={() => handleJoinGroup(selectedGroup.id)}
                                  >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Join
                                  </Button>
                                )}
                                {user?.id === selectedGroup.created_by && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="h-10 rounded-full px-4"
                                    onClick={() => handleArchiveGroup(selectedGroup.id)}
                                  >
                                    Archive
                                  </Button>
                                )}
                                {user?.id !== selectedGroup.created_by && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-10 rounded-full px-4"
                                    onClick={() => handleReportGroup(selectedGroup)}
                                  >
                                    <Flag className="mr-2 h-4 w-4" />
                                    Report
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Group Content Tabs */}
                      <Tabs
                        value={groupTab}
                        onValueChange={(value) => {
                          setGroupTab(value);
                        }}
                        className="flex min-h-0 flex-1 flex-col"
                      >
                          <TabsList
                            className={cn(
                              "sticky top-0 z-10 mx-3 mt-2 flex h-auto min-h-11 flex-wrap gap-1 rounded-2xl border border-border/50 bg-background/90 p-1 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] sm:mx-4",
                              "supports-[backdrop-filter]:bg-background/80",
                            )}
                          >
                          <TabsTrigger
                            value="chat"
                            className="rounded-xl data-[state=active]:bg-primary/12"
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Chat
                          </TabsTrigger>
                          <TabsTrigger
                            value="resources"
                            className="rounded-xl data-[state=active]:bg-primary/12"
                          >
                            <BookOpen className="mr-2 h-4 w-4" />
                            Resources
                            <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] leading-5">
                              {groupResources.length}
                            </span>
                          </TabsTrigger>
                          <TabsTrigger
                            value="members"
                            className="rounded-xl data-[state=active]:bg-primary/12"
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Members
                            <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] leading-5">
                              {groupMembers.length}
                            </span>
                          </TabsTrigger>
                          {user?.id === selectedGroup.created_by && (
                            <TabsTrigger
                              value="manage"
                              className="rounded-xl data-[state=active]:bg-primary/12"
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Manage
                            </TabsTrigger>
                          )}
                        </TabsList>

                        <TabsContent value="chat" className="flex-1 m-0 flex min-h-0 flex-col">
                          <div className="flex min-h-0 flex-1 flex-col p-2 sm:p-4">
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
                              {user ? (
                                <StudyGroupChatTab
                                  selectedGroup={selectedGroup}
                                  userId={user.id}
                                  isMember={!!membershipStatus[selectedGroup.id]}
                                  isAdmin={user.id === selectedGroup.created_by}
                                  messagingService={messagingService}
                                  studyGroupManager={studyGroupManager}
                                  onConversationLinked={(conversationId) => {
                                    setSelectedGroup((g) =>
                                      g ? { ...g, conversation_id: conversationId } : null,
                                    );
                                  }}
                                />
                              ) : null}
                            </div>
                          </div>
                        </TabsContent>

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
                                  ) : newResourceType === 'file' ? (
                                    <div className="space-y-2">
                                      <Input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
                                        onChange={(event) =>
                                          setNewResourceFile(event.target.files?.[0] ?? null)
                                        }
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        PDF, image, text, and Word files up to 10MB.
                                      </p>
                                      <Textarea
                                        placeholder="Optional note for classmates"
                                        value={newResourceContent}
                                        onChange={(e) => setNewResourceContent(e.target.value)}
                                      />
                                    </div>
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
                                          {resource.resource_type === 'file' && (
                                            <a
                                              href={(resource as StudyGroupResource & { signed_url?: string | null }).signed_url ?? '#'}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-500 hover:underline mt-1 block"
                                              aria-disabled={!(resource as StudyGroupResource & { signed_url?: string | null }).signed_url}
                                            >
                                              {(resource as StudyGroupResource & { signed_url?: string | null }).signed_url
                                                ? 'Open file'
                                                : 'File link is preparing'}
                                            </a>
                                          )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs"
                                            onClick={() => handleReportResource(resource)}
                                          >
                                            <Flag className="mr-1 h-3.5 w-3.5" />
                                            Report
                                          </Button>
                                          {(resource.user_id === user?.id ||
                                            user?.id === selectedGroup.created_by) && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 px-2 text-xs text-destructive"
                                              onClick={() => handleDeleteResource(resource)}
                                            >
                                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                                              Delete
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

                        <TabsContent value="members" className="flex-1 m-0 p-4">
                          <div className="rounded-md border p-4">
                            <div className="space-y-2">
                              {groupMembers.map((member: StudyGroupMember & { user_name: string }) => (
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

                        {user?.id === selectedGroup.created_by && (
                          <TabsContent value="manage" className="flex-1 m-0 overflow-y-auto p-4">
                            <GroupManagementPanel
                              groupId={selectedGroup.id}
                              groupName={selectedGroup.name}
                              isOwner
                            />
                          </TabsContent>
                        )}
                      </Tabs>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center px-6 py-12 text-center sm:py-16">
                      <div className="max-w-xs">
                        <Users
                          className="mx-auto mb-3 h-10 w-10 text-muted-foreground/70"
                          aria-hidden
                        />
                        <p className="text-base font-semibold leading-snug tracking-tight text-foreground">
                          Select a group
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 