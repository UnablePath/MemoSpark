'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from "date-fns";
import { ProfileSync } from '@/components/profile/ProfileSync';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [interests, setInterests] = useState('');
  const [subjects, setSubjects] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      setName(user.fullName || '');
      setBio(user.unsafeMetadata?.bio as string || '');
      setYearOfStudy(user.unsafeMetadata?.yearOfStudy as string || 'Freshman');
      setInterests((user.unsafeMetadata?.interests as string[])?.join(', ') || '');
      setSubjects((user.unsafeMetadata?.subjects as string[])?.join(', ') || '');
    }
  }, [isLoaded, user]);

  const getInitials = (nameStr: string) => {
    if (!nameStr) return "U";
    return nameStr.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
             // Reset to original values if canceling edit
       if (user) {
         setName(user.fullName || '');
         setBio(user.unsafeMetadata?.bio as string || '');
         setYearOfStudy(user.unsafeMetadata?.yearOfStudy as string || 'Freshman');
         setInterests((user.unsafeMetadata?.interests as string[])?.join(', ') || '');
         setSubjects((user.unsafeMetadata?.subjects as string[])?.join(', ') || '');
       }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setFormError(null);
    setIsSaving(true);

    if (!name.trim()) {
      setFormError("Please enter your name.");
      setIsSaving(false);
      return;
    }

    try {
      // Update user name
      await user.update({
        firstName: name.split(' ')[0] || '',
        lastName: name.split(' ').slice(1).join(' ') || '',
      });

      // Update public metadata
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
      setFormError("Profile saved successfully!");
      setTimeout(() => setFormError(null), 3000);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error("Failed to save profile:", error);
      setFormError("Failed to save profile. Please try again.");
      toast.error('Failed to update profile');
    }
    setIsSaving(false);
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <a href="#main-profile-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-dashed focus:outline-2 focus:outline-offset-2">Skip to main content</a>
        <Skeleton className="h-10 w-40 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <div className="text-center">
          <p>Please sign in to view your profile.</p>
          <Button onClick={() => router.push('/sign-in')} className="mt-4">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <a href="#main-profile-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-dashed focus:outline-2 focus:outline-offset-2">Skip to main content</a>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2 focus:outline-dashed focus:outline-2 focus:outline-offset-2" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <h1 id="main-profile-content" className="text-2xl font-bold focus:outline-dashed focus:outline-2" role="heading" aria-level={1} tabIndex={-1}>Your Profile</h1>
        </div>
        <Button variant="outline" size="icon" onClick={isEditing ? handleSave : handleEditToggle} className="focus:outline-dashed focus:outline-2 focus:outline-offset-2" disabled={isSaving}>
          {isEditing ? (isSaving ? <Save className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />) : <Edit className="h-4 w-4" />}
          <span className="sr-only">{isEditing ? (isSaving ? 'Saving Profile...' : 'Save Profile') : 'Edit Profile'}</span>
        </Button>
      </div>

      {formError && (
        <div role="alert" className={`mb-4 p-3 rounded-lg border text-center focus:outline-dashed focus:outline-2 ${formError.includes('success') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`} tabIndex={-1}>
          {formError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.imageUrl} alt={user.fullName || 'User'} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl" aria-label={`Avatar for ${user.fullName || 'User'}`}>
                {getInitials(user.fullName || 'U')}
              </AvatarFallback>
            </Avatar>
            {isEditing ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="text-2xl font-bold h-auto p-0 border-0 shadow-none focus-visible:ring-0 focus:outline-dashed focus:outline-2" aria-label="Edit your name" required aria-required="true" />
            ) : (
              <div>
                <span className="text-2xl font-bold focus:outline-dashed focus:outline-2" tabIndex={0}>{user.fullName || "(No Name)"}</span>
                <p className="text-muted-foreground text-sm mt-1">{user.primaryEmailAddress?.emailAddress}</p>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="bio" className="text-lg font-semibold mb-2 block">Bio</Label>
            {isEditing ? (
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a little about yourself..." className="focus:outline-dashed focus:outline-2 focus:outline-offset-2" aria-label="Edit your bio" />
            ) : (
              <p className="text-muted-foreground whitespace-pre-wrap focus:outline-dashed focus:outline-2" tabIndex={0}>{bio || "(No bio yet)"}</p>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4 focus:outline-dashed focus:outline-2" role="heading" aria-level={2} tabIndex={0}>Academic Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="email-detail" className="text-right">Email</Label>
                <p className="col-span-2 text-muted-foreground focus:outline-dashed focus:outline-2" tabIndex={0}>{user.primaryEmailAddress?.emailAddress}</p>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="year-detail" className="text-right">Year</Label>
                {isEditing ? (
                  <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                    <SelectTrigger id="year-detail" className="col-span-2 focus:outline-dashed focus:outline-2 focus:outline-offset-2" aria-label="Select your year of study">
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
                  <p className="col-span-2 text-muted-foreground focus:outline-dashed focus:outline-2" tabIndex={0}>{yearOfStudy || "(Not set)"}</p>
                )}
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <Label htmlFor="subjects-detail" className="text-right pt-2">Subjects</Label>
                {isEditing ? (
                  <Textarea id="subjects-detail" value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Math, Science, History (comma-separated)" className="col-span-2 min-h-[60px] focus:outline-dashed focus:outline-2 focus:outline-offset-2" aria-label="Edit your subjects, separated by commas" />
                ) : (
                  <div className="col-span-2 flex flex-wrap gap-1 focus:outline-dashed focus:outline-2" tabIndex={0} aria-label="Your subjects">
                    {(user.unsafeMetadata?.subjects as string[])?.length > 0 ? (
                      (user.unsafeMetadata.subjects as string[]).map(subject => <Badge key={subject} variant="secondary" className="text-sm">{subject}</Badge>)
                    ) : (
                      <p className="text-muted-foreground italic">(No subjects listed)</p>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <Label htmlFor="interests-detail" className="text-right pt-2">Interests</Label>
                {isEditing ? (
                  <Textarea id="interests-detail" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Reading, Gaming, Sports (comma-separated)" className="col-span-2 min-h-[60px] focus:outline-dashed focus:outline-2 focus:outline-offset-2" aria-label="Edit your interests, separated by commas" />
                ) : (
                  <div className="col-span-2 flex flex-wrap gap-1 focus:outline-dashed focus:outline-2" tabIndex={0} aria-label="Your interests">
                    {(user.unsafeMetadata?.interests as string[])?.length > 0 ? (
                      (user.unsafeMetadata.interests as string[]).map(interest => <Badge key={interest} variant="outline" className="text-sm">{interest}</Badge>)
                    ) : (
                      <p className="text-muted-foreground italic">(No interests listed)</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4">AI Personalization</h3>
            {(user.publicMetadata?.questionnaireCompleted as boolean) ? (
              <p className="text-sm text-muted-foreground">
                Your AI learning profile is active. You can retake the assessment at any time to recalibrate your suggestions.
              </p>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">Unlock Personalized Insights</h4>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1 mb-3">
                  Complete our quick assessment to help Stu understand your unique learning style.
                </p>
                <Button onClick={() => router.push('/questionnaire')} size="sm">
                  Start AI Assessment
                </Button>
              </div>
            )}
          </div>
          
          <Separator />

          {/* Account Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member since:</span>
                <span>{user.createdAt ? format(new Date(user.createdAt), 'PPP') : 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last updated:</span>
                <span>{user.updatedAt ? format(new Date(user.updatedAt), 'PPP') : 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account ID:</span>
                <span className="font-mono text-xs">{user.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} className="focus:outline-dashed focus:outline-2 focus:outline-offset-2">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Sync Component for manual database synchronization */}
      <ProfileSync className="mt-6" />

      {/* ARIA live region for status messages */}
      <div aria-live="polite" className="sr-only" id="form-status-message">
        {formError && <p>{formError}</p>}
      </div>
    </div>
  );
} 