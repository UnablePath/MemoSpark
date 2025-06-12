"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Edit, Save, X, Mail, GraduationCap, Heart, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

interface ProfileModalProps {
  children: React.ReactNode;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ children }) => {
  const { user, isLoaded } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Profile form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [interests, setInterests] = useState('');
  const [subjects, setSubjects] = useState('');

  // Load user data when modal opens
  useEffect(() => {
    if (isLoaded && user && isOpen) {
      setName(user.fullName || '');
      setBio(user.unsafeMetadata?.bio as string || '');
      setYearOfStudy(user.unsafeMetadata?.yearOfStudy as string || 'Freshman');
      setInterests((user.unsafeMetadata?.interests as string[])?.join(', ') || '');
      setSubjects((user.unsafeMetadata?.subjects as string[])?.join(', ') || '');
    }
  }, [user, isLoaded, isOpen]);

  const getInitials = (nameStr: string) => {
    if (!nameStr) return "U";
    return nameStr.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      // Update user metadata
      await user.update({
        firstName: name.split(' ')[0] || '',
        lastName: name.split(' ').slice(1).join(' ') || '',
      });

      // Update unsafe metadata
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          bio,
          yearOfStudy,
          interests: interests.split(',').map(i => i.trim()).filter(Boolean),
          subjects: subjects.split(',').map(s => s.trim()).filter(Boolean),
        }
      });

      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (user) {
      setName(user.fullName || '');
      setBio(user.unsafeMetadata?.bio as string || '');
      setYearOfStudy(user.unsafeMetadata?.yearOfStudy as string || 'Freshman');
      setInterests((user.unsafeMetadata?.interests as string[])?.join(', ') || '');
      setSubjects((user.unsafeMetadata?.subjects as string[])?.join(', ') || '');
    }
    setIsEditing(false);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            My Profile
          </DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.imageUrl} alt={user.fullName || 'User'} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {getInitials(user.fullName || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="text-xl font-bold"
                      />
                    ) : (
                      <CardTitle className="text-xl">{user.fullName || 'Unnamed User'}</CardTitle>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">{user.primaryEmailAddress?.emailAddress}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={handleSave}>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Bio Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Bio
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-muted-foreground">
                    {bio || 'No bio added yet. Click edit to add one!'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Academic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Academic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Year of Study</Label>
                  {isEditing ? (
                    <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Freshman">Freshman</SelectItem>
                        <SelectItem value="Sophomore">Sophomore</SelectItem>
                        <SelectItem value="Junior">Junior</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                        <SelectItem value="Graduate">Graduate</SelectItem>
                        <SelectItem value="PhD">PhD</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-muted-foreground">
                      {yearOfStudy || 'Not specified'}
                    </p>
                  )}
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    Subjects
                  </Label>
                  {isEditing ? (
                    <Input
                      value={subjects}
                      onChange={(e) => setSubjects(e.target.value)}
                      placeholder="Math, Science, History (comma-separated)"
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(user.unsafeMetadata?.subjects as string[])?.length > 0 ? (
                        (user.unsafeMetadata.subjects as string[]).map((subject, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm">No subjects added yet</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Interests */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Interests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Input
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="Reading, Gaming, Sports (comma-separated)"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(user.unsafeMetadata?.interests as string[])?.length > 0 ? (
                      (user.unsafeMetadata.interests as string[]).map((interest, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">No interests added yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member since:</span>
                  <span>{user.createdAt ? format(new Date(user.createdAt), 'PPP') : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last updated:</span>
                  <span>{user.updatedAt ? format(new Date(user.updatedAt), 'PPP') : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono text-xs">{user.id.slice(0, 8)}...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 