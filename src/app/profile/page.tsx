'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TextAnimate } from '@/components/ui/text-animate';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { toast } from 'sonner';
import { format } from "date-fns";
import { ProfileSync } from '@/components/profile/ProfileSync';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { profile, isLoading: profileLoading, error: profileError, refetch, updateProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);

  // Form state from Supabase profile data
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [interests, setInterests] = useState('');
  const [subjects, setSubjects] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync form with profile data when it loads
  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      setBio(profile.bio || '');
      setYearOfStudy(profile.year_of_study || 'Freshman');
      setInterests(profile.interests?.join(', ') || '');
      setSubjects(profile.subjects?.join(', ') || '');
    }
  }, [profile]);

  const getInitials = (nameStr: string) => {
    if (!nameStr) return "U";
    return nameStr.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Reset to original values if canceling edit
      if (profile) {
        setName(profile.full_name || '');
        setBio(profile.bio || '');
        setYearOfStudy(profile.year_of_study || 'Freshman');
        setInterests(profile.interests?.join(', ') || '');
        setSubjects(profile.subjects?.join(', ') || '');
      }
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;

    setFormError(null);
    setIsSaving(true);

    if (!name.trim()) {
      setFormError("Please enter your name.");
      setIsSaving(false);
      return;
    }

    try {
      // Update Supabase profile
      const success = await updateProfile({
        full_name: name.trim(),
        bio: bio.trim(),
        year_of_study: yearOfStudy,
        interests: interests.split(',').map(i => i.trim()).filter(Boolean),
        subjects: subjects.split(',').map(s => s.trim()).filter(Boolean),
      });

      if (success) {
        setIsEditing(false);
        setFormError("Profile saved successfully!");
        setTimeout(() => setFormError(null), 3000);
        toast.success('Profile updated successfully!');
        
        // Also update Clerk for consistency
        await user.update({
          firstName: name.split(' ')[0] || '',
          lastName: name.split(' ').slice(1).join(' ') || '',
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      setFormError("Failed to save profile. Please try again.");
      toast.error('Failed to update profile');
    }
    setIsSaving(false);
  };

  if (!isLoaded || profileLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <a href="#main-profile-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-dashed focus:outline-2 focus:outline-offset-2">Skip to main content</a>
        <Skeleton className="h-10 w-40 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user || !profile) {
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
              <AvatarImage src={profile.avatar_url || user.imageUrl} alt={profile.full_name || 'User'} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl" aria-label={`Avatar for ${profile.full_name || 'User'}`}>
                {getInitials(profile.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            {isEditing ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="text-2xl font-bold h-auto p-0 border-0 shadow-none focus-visible:ring-0 focus:outline-dashed focus:outline-2" aria-label="Edit your name" required aria-required="true" />
            ) : (
              <div>
                <span className="text-2xl font-bold focus:outline-dashed focus:outline-2" tabIndex={0}>{profile.full_name || "(No Name)"}</span>
                <p className="text-muted-foreground text-sm mt-1">{profile.email}</p>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Bio Section with Magic UI */}
          <div>
            <Label htmlFor="bio" className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Bio
            </Label>
            {isEditing ? (
              <Textarea 
                id="bio" 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                placeholder="Tell us a little about yourself..." 
                className="focus:outline-dashed focus:outline-2 focus:outline-offset-2 min-h-[120px]" 
                aria-label="Edit your bio" 
              />
            ) : (
              <div className="min-h-[80px] p-4 rounded-lg border bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10">
                {bio ? (
                  <TextAnimate 
                    animation="fadeIn" 
                    by="word" 
                    className="text-muted-foreground whitespace-pre-wrap leading-relaxed"
                    once
                  >
                    {bio}
                  </TextAnimate>
                ) : (
                  <div className="text-center py-6">
                    <AnimatedGradientText className="text-lg font-medium">
                      (No bio yet)
                    </AnimatedGradientText>
                    <p className="text-sm text-muted-foreground mt-2">Share something about yourself to make your profile more engaging!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4 focus:outline-dashed focus:outline-2" role="heading" aria-level={2} tabIndex={0}>Academic Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="email-detail" className="text-right">Email</Label>
                <p className="col-span-2 text-muted-foreground focus:outline-dashed focus:outline-2" tabIndex={0}>{profile.email}</p>
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
                  <p className="col-span-2 text-muted-foreground focus:outline-dashed focus:outline-2" tabIndex={0}>{profile.year_of_study || "(Not set)"}</p>
                )}
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <Label htmlFor="subjects-detail" className="text-right pt-2">Subjects</Label>
                {isEditing ? (
                  <Textarea id="subjects-detail" value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Math, Science, History (comma-separated)" className="col-span-2 min-h-[60px] focus:outline-dashed focus:outline-2 focus:outline-offset-2" aria-label="Edit your subjects, separated by commas" />
                ) : (
                  <div className="col-span-2 flex flex-wrap gap-1 focus:outline-dashed focus:outline-2" tabIndex={0} aria-label="Your subjects">
                    {profile.subjects && profile.subjects.length > 0 ? (
                      profile.subjects.map(subject => <Badge key={subject} variant="secondary" className="text-sm">{subject}</Badge>)
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
                    {profile.interests && profile.interests.length > 0 ? (
                      profile.interests.map(interest => <Badge key={interest} variant="outline" className="text-sm">{interest}</Badge>)
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
            {profile.onboarding_completed ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-semibold text-green-800 dark:text-green-200">✅ Profile Complete</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-300 mb-3">
                  Your AI learning profile is active. You can retake the assessment at any time to recalibrate your suggestions.
                </p>
                <Button 
                  onClick={() => router.push('/questionnaire')} 
                  variant="outline"
                  size="sm"
                  className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-900/30"
                >
                  Retake AI Assessment
                </Button>
              </div>
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
                <span>{profile.created_at ? format(new Date(profile.created_at), 'PPP') : 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last updated:</span>
                <span>{profile.updated_at ? format(new Date(profile.updated_at), 'PPP') : 'Unknown'}</span>
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