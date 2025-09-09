"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudyGroupManager, StudyGroup, StudyGroupMember, StudyGroupResource } from '@/lib/social/StudyGroupManager';
import { MessagingService } from '@/lib/messaging/MessagingService';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Link,
  Upload,
  Send,
  MoreVertical,
  X,
  Check,
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

interface StudyGroupsPopoverProps {
  trigger?: React.ReactNode;
}

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

export const StudyGroupsPopover: React.FC<StudyGroupsPopoverProps> = ({ trigger }) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const studyGroupManager = useMemo(() => new StudyGroupManager(getToken), [getToken]);
  const messagingService = useMemo(() => new MessagingService(getToken), [getToken]);

  // State management
  const [isOpen, setIsOpen] = useState(false);
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
    if (isOpen && user) {
      loadUserGroups();
      loadAllGroups();
    }
  }, [isOpen, user, loadUserGroups, loadAllGroups]);

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
            <Users className="h-4 w-4 mr-2" />
            Study Groups
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full h-full max-w-none max-h-none p-0 border-none shadow-2xl focus:outline-none sm:w-[96vw] sm:h-[90vh] sm:max-w-[1200px] sm:rounded-lg z-[10002] overflow-y-auto">
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center justify-between">
              <AnimatedGradientText>
                <span className="inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent">
                  Study Groups Hub
                </span>
              </AnimatedGradientText>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <div className={cn(
              "w-full sm:w-80 sm:border-r bg-muted/50 transition-all duration-300 flex flex-col min-h-0",
              selectedGroup && "hidden sm:block"
            )}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full min-h-0">
                <div className="flex-shrink-0 p-2 sticky top-[73px] bg-muted/50 z-10">
                  <TabsList className="grid w-full grid-cols-2 h-9">
                    <TabsTrigger value="browse" className="text-xs px-2">Browse</TabsTrigger>
                    <TabsTrigger value="my-groups" className="text-xs px-2">My Groups</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="browse" className="flex-1 flex flex-col min-h-0">
                  <div className="flex-shrink-0 p-4 space-y-3">
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
                  </div>

                  {/* Groups List */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full px-4 pb-4">
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
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">{group.name}</h4>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {group.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {membershipStatus[group.id] ? (
                                    <Badge variant="secondary" className="text-xs whitespace-nowrap">Member</Badge>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-8 w-8 p-0"
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

                <TabsContent value="my-groups" className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full px-4 pb-4">
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
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">{group.name}</h4>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {group.description}
                                  </p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Main Content */}
            <div className={cn(
              "flex-1 flex flex-col transition-all duration-300 min-h-0 overflow-y-auto",
              !selectedGroup && "hidden sm:flex"
            )}>
              {selectedGroup ? (
                <>
                  {/* Group Header */}
                  <div className="flex-shrink-0 p-4 border-b">
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
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{selectedGroup.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{selectedGroup.description}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="whitespace-nowrap">
                              {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}
                            </Badge>
                            {!membershipStatus[selectedGroup.id] && (
                              <Button size="sm" className="whitespace-nowrap" onClick={() => handleJoinGroup(selectedGroup.id)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Join Group</span>
                                <span className="sm:hidden">Join</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group Content Tabs */}
                  <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
                     <TabsList className="mx-4 mt-2 grid w-auto grid-cols-3 flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                      <TabsTrigger value="chat" className="flex items-center gap-1 sm:gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden sm:inline">Chat</span>
                      </TabsTrigger>
                      <TabsTrigger value="resources" className="flex items-center gap-1 sm:gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span className="hidden sm:inline">Resources</span>
                          <span className="ml-1 hidden sm:inline rounded-full bg-muted px-1.5 text-[10px] leading-5">
                            {groupResources.length}
                          </span>
                      </TabsTrigger>
                      <TabsTrigger value="members" className="flex items-center gap-1 sm:gap-2">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Members</span>
                          <span className="ml-1 hidden sm:inline rounded-full bg-muted px-1.5 text-[10px] leading-5">
                            {groupMembers.length}
                          </span>
                      </TabsTrigger>
                    </TabsList>

                     <TabsContent value="chat" className="flex-1 flex flex-col min-h-0">
                       {/* Messages Area - Scrollable */}
                       <div className="flex-1 p-4 overflow-y-auto">
                         <div className="space-y-3">
                           {groupMessages.length === 0 ? (
                             <div className="flex items-center justify-center h-full">
                               <div className="text-center text-muted-foreground">
                                 <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                                 <p>No messages yet. Start the conversation!</p>
                               </div>
                              </div>
                           ) : (
                             <AnimatedList>
                               {groupMessages.map((message) => (
                                 <AnimatedListItem key={message.id}>
                                   <div className="flex gap-3">
                                     <Avatar className="h-8 w-8 flex-shrink-0">
                                       <AvatarFallback>
                                         {(message.sender_name || message.sender?.full_name || 'Unknown User').charAt(0).toUpperCase()}
                                       </AvatarFallback>
                                     </Avatar>
                                     <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-2 mb-1">
                                         <span className="font-medium text-sm">
                                           {message.sender_name || message.sender?.full_name || 'Unknown User'}
                                         </span>
                                         <span className="text-xs text-muted-foreground">
                                           {new Date(message.created_at).toLocaleTimeString()}
                                         </span>
                                       </div>
                                       <p className="text-sm break-words">{message.content}</p>
                                     </div>
                                   </div>
                                 </AnimatedListItem>
                               ))}
                             </AnimatedList>
                           )}
                         </div>
                       </div>
                      
                       {/* Message Input - Fixed at bottom */}
                       {membershipStatus[selectedGroup.id] && (
                        <div className="flex-shrink-0 p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
                              className="flex-1"
                            />
                            <Button 
                              onClick={handleSendMessage}
                              disabled={!newMessage.trim() || !membershipStatus[selectedGroup.id]}
                              className="h-10 w-10 p-0 flex-shrink-0"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                       {!membershipStatus[selectedGroup.id] && (
                        <div className="flex-shrink-0 p-4 border-t bg-muted/30">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Join this group to participate in chat.</p>
                            <Button size="sm" onClick={() => handleJoinGroup(selectedGroup.id)}>
                              Join Group
                            </Button>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="resources" className="flex-1 flex flex-col min-h-0">
                      {/* Add Resource Form - Fixed at top */}
                      <div className="flex-shrink-0 p-4">
                        {membershipStatus[selectedGroup.id] && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Add Resource</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input
                                  placeholder="Resource title"
                                  value={newResourceTitle}
                                  onChange={(e) => setNewResourceTitle(e.target.value)}
                                  className="min-w-0"
                                />
                                <Select value={newResourceType} onValueChange={setNewResourceType}>
                                  <SelectTrigger className="min-w-0">
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
                      </div>

                      {/* Resources List - Scrollable */}
                      <div className="flex-1 px-4 pb-4 overflow-y-auto">
                        <div className="space-y-2">
                          {groupResources.map((resource) => (
                            <Card key={resource.id}>
                              <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0">
                                    {getResourceIcon(resource.resource_type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm">{resource.title}</h4>
                                    {resource.content && (
                                      <p className="text-xs text-muted-foreground mt-1 break-words">
                                        {resource.content}
                                      </p>
                                    )}
                                    {resource.url && (
                                      <a 
                                        href={resource.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-500 hover:underline mt-1 block break-all"
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
                    </TabsContent>

                    <TabsContent value="members" className="flex-1 flex flex-col min-h-0">
                      {/* Members List - Scrollable */}
                      <div className="flex-1 p-4 overflow-y-auto">
                        <div className="space-y-2">
                          {groupMembers.map((member) => (
                            <Card key={member.id}>
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="flex-shrink-0">
                                      <AvatarFallback>
                                        {member.user_name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{member.user_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Joined {new Date(member.joined_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
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
                <div className="flex-1 flex items-center justify-center text-center p-4">
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
  );
}; 