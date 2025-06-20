"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StudyGroupManager, StudyGroup } from '@/lib/social/StudyGroupManager';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
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

const StudyGroupInterface: React.FC = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [studyGroupManager, setStudyGroupManager] = useState<StudyGroupManager | null>(null);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  useEffect(() => {
    if (user) {
      setStudyGroupManager(new StudyGroupManager(getToken));
    }
  }, [user, getToken]);

  const loadGroups = useCallback(async () => {
    if (!studyGroupManager || !user) return;
    try {
      const userGroups = await studyGroupManager.getUserGroups(user.id);
      setGroups(userGroups);
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  }, [studyGroupManager, user]);

  useEffect(() => {
    if(studyGroupManager) {
      loadGroups();
    }
  }, [studyGroupManager, loadGroups]);

  const handleCreateGroup = async () => {
    if (!studyGroupManager || !user || !newGroupName.trim()) return;
    try {
      await studyGroupManager.createGroup(newGroupName, user.id, newGroupDescription);
      setNewGroupName('');
      setNewGroupDescription('');
      loadGroups();
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Study Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <ul>
            {groups.map(group => (
              <li key={group.id} className="p-2 hover:bg-gray-100 rounded">
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
  );
};

export default StudyGroupInterface; 