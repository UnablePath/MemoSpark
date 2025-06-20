"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudyGroupManager, StudyGroup, StudyGroupMember, StudyGroupResource } from '@/lib/social/StudyGroupManager';
import { MessagingService } from '@/lib/messaging/MessagingService';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  UserMinus
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
  const [membershipStatus, setMembershipStatus] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceContent, setNewResourceContent] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [newResourceType, setNewResourceType] = useState<string>("note");

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
      
      setGroupMembers(members);
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
        content: newResourceContent || null,
        url: newResourceUrl || null,
        file_path: null
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
    if (!selectedGroup?.conversation_id || !user || !newMessage.trim()) return;
    
    // Check if user is a member of the group
    if (!membershipStatus[selectedGroup.id]) {
      toast.error("You must be a member of this group to send messages");
      return;
    }
    
    try {
      await messagingService.sendMessage({
        userId: user.id,
        content: newMessage.trim(),
        conversationId: selectedGroup.conversation_id
      });
      setNewMessage("");
      
      // Reload messages
      const messages = await messagingService.getMessages(selectedGroup.conversation_id);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Study Group Hub
        </CardTitle>
        <CardDescription>
          Find, create, and join study groups to collaborate with your peers.
        </CardDescription>
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
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
              <Users className="h-4 w-4 mr-2" />
              Browse Groups
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[90vw] h-[70vh] sm:w-[85vw] sm:h-[65vh] md:w-[80vw] md:h-[75vh] lg:w-[900px] lg:h-[550px] xl:w-[1000px] xl:h-[600px] p-0 max-w-[calc(100vw-1rem)] max-h-[calc(100vh-6rem)] border shadow-2xl" 
            side="top" 
            align="center"
            sideOffset={5}
            avoidCollisions={true}
            collisionPadding={20}
            alignOffset={0}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <AnimatedGradientText>
                    <span className="inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent">
                      Study Groups Hub
                    </span>
                  </AnimatedGradientText>
                  <Button variant="ghost" size="sm" onClick={() => setIsPopoverOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className={cn(
                  "w-full sm:w-80 sm:border-r bg-muted/50 transition-all duration-300",
                  selectedGroup && "hidden sm:block"
                )}>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                    <TabsList className="grid w-full grid-cols-2 m-2 h-9">
                      <TabsTrigger value="browse" className="text-xs px-2">Browse</TabsTrigger>
                      <TabsTrigger value="my-groups" className="text-xs px-2">My Groups</TabsTrigger>
                    </TabsList>

                    <TabsContent value="browse" className="m-0 h-[calc(100%-60px)]">
                      <div className="p-4 space-y-4">
                        {/* Search */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search groups..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
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
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button onClick={handleCreateGroup}>Create Group</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Groups List */}
                        <ScrollArea className="h-[200px] sm:h-[250px] md:h-[300px] rounded-md border p-4">
                          <div className="space-y-2">
                            {filteredGroups.map((group) => (
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
                                    <div className="flex items-center gap-2">
                                      {membershipStatus[group.id] ? (
                                        <Badge variant="secondary" className="text-xs">Member</Badge>
                                      ) : (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={(e) => {
                                            e.stopPropagation();
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
                        </ScrollArea>
                      </div>
                    </TabsContent>

                    <TabsContent value="my-groups" className="m-0 h-[calc(100%-60px)]">
                      <ScrollArea className="h-full p-4">
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
                      </ScrollArea>
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
                                  <Button size="sm" onClick={() => handleJoinGroup(selectedGroup.id)}>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Join Group
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Group Content Tabs */}
                      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                        <TabsList className="mx-4 mt-4">
                          <TabsTrigger value="chat">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat
                          </TabsTrigger>
                          <TabsTrigger value="resources">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Resources
                          </TabsTrigger>
                          <TabsTrigger value="members">
                            <Users className="h-4 w-4 mr-2" />
                            Members
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="chat" className="flex-1 flex flex-col m-0">
                          <div className="flex-1 p-4">
                            <ScrollArea className="h-[200px] sm:h-[250px] md:h-[300px] rounded-md border p-4">
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
                            </ScrollArea>
                          </div>
                          
                          {membershipStatus[selectedGroup.id] && (
                            <div className="p-4 border-t">
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

                            <ScrollArea className="h-[200px] sm:h-[250px] md:h-[300px] rounded-md border p-4">
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
                            </ScrollArea>
                          </div>
                        </TabsContent>

                        <TabsContent value="members" className="flex-1 m-0 p-4">
                          <ScrollArea className="h-[200px] sm:h-[250px] md:h-[300px] rounded-md border p-4">
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
                          </ScrollArea>
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
          </PopoverContent>
        </Popover>
        
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