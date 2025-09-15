"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudyGroupManager, StudyGroup, StudyGroupMember } from '@/lib/social/StudyGroupManager';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Calendar, MessageSquare } from 'lucide-react';
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

export const StudyGroupInterface: React.FC = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [studyGroupManager, setStudyGroupManager] = useState<StudyGroupManager | null>(null);

  const [userGroups, setUserGroups] = useState<StudyGroup[]>([]);
  const [allGroups, setAllGroups] = useState<StudyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<StudyGroupMember[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [membershipStatus, setMembershipStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      const manager = new StudyGroupManager(getToken);
      setStudyGroupManager(manager);
    }
  }, [user, getToken]);

  const loadUserGroups = useCallback(async () => {
    if (!studyGroupManager || !user) return;
    try {
        const groups = await studyGroupManager.getUserGroups(user.id);
        setUserGroups(groups);
    } catch(error) {
        console.error("Failed to load user groups:", error);
    }
  }, [studyGroupManager, user]);

  const loadAllGroups = useCallback(async () => {
    if (!studyGroupManager || !user) return;
    try {
        const groups = await studyGroupManager.getAllGroups();
        setAllGroups(groups);
        
        // Check membership status for each group
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
    } catch(error) {
        console.error("Failed to load all groups:", error);
    }
  }, [studyGroupManager, user]);

  useEffect(() => {
    if (studyGroupManager) {
      loadUserGroups();
      loadAllGroups();
    }
  }, [studyGroupManager, loadUserGroups, loadAllGroups]);

  const handleCreateGroup = async () => {
    if (!studyGroupManager || !user || !newGroupName.trim()) return;
    try {
      await studyGroupManager.createGroup(newGroupName, user.id, newGroupDescription);
      setNewGroupName('');
      setNewGroupDescription('');
      loadUserGroups(); // Refresh the list of user groups
      loadAllGroups(); // Refresh all groups
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!studyGroupManager || !user) return;
    try {
      await studyGroupManager.addMember(groupId, user.id, 'member');
      // Update membership status
      setMembershipStatus(prev => ({ ...prev, [groupId]: true }));
      loadUserGroups(); // Refresh user groups
    } catch (error) {
      console.error("Failed to join group:", error);
    }
  };

  const handleSelectGroup = async (group: StudyGroup) => {
    if(!studyGroupManager) return;
    setSelectedGroup(group);
    const members = await studyGroupManager.getGroupMembersWithNames(group.id);
    setGroupMembers(members);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Study Groups</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Your Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <ul>
                {userGroups.map(group => (
                  <li key={group.id} onClick={() => handleSelectGroup(group)} className="cursor-pointer p-2 hover:bg-gray-100 rounded">
                    {group.name}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>Create New Group</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create a new study group</DialogTitle>
                            <DialogDescription>
                                Fill in the details below to create your new study group. You'll be able to chat with members and share resources.
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
                            <Button onClick={handleCreateGroup}>Create Group</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardFooter>
          </Card>
        </div>
        <div className="col-span-2">
          {selectedGroup ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedGroup.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{selectedGroup.description}</p>
                <h3 className="font-bold mt-4">Members:</h3>
                <ul>
                  {groupMembers.map(member => (
                    <li key={member.id}>{member.user_id}</li> // Ideally, fetch and show user names
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <p>Select a group to see details.</p>
          )}
        </div>
      </div>
    </div>
  );
}; 