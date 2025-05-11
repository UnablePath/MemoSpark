'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

const MAX_DATE = new Date();
const MIN_DATE = new Date(MAX_DATE.getFullYear() - 100, MAX_DATE.getMonth(), MAX_DATE.getDate());
const SIXTEEN_YEARS_AGO = new Date(MAX_DATE.getFullYear() - 16, MAX_DATE.getMonth(), MAX_DATE.getDate());

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isProfileLoaded, updateProfile, saveProfile } = useUser();
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [interests, setInterests] = useState('');
  const [bio, setBio] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isProfileLoaded) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setYearOfStudy(profile.yearOfStudy || 'Freshman');
      setBirthDate(profile.birthDate ? parseISO(profile.birthDate) : undefined);
      setInterests((profile.interests || []).join(', '));
      setBio(profile.bio || '');
    }
  }, [isProfileLoaded, profile]);

  const getInitials = (nameStr: string) => {
    if (!nameStr) return "U";
    return nameStr.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
        setName(profile.name || '');
        setEmail(profile.email || '');
        setYearOfStudy(profile.yearOfStudy || 'Freshman');
        setBirthDate(profile.birthDate ? parseISO(profile.birthDate) : undefined);
        setInterests((profile.interests || []).join(', '));
        setBio(profile.bio || '');
    }
  };

  const handleSave = () => {
    setFormError(null);
    setIsSaving(true);
    if (!birthDate) {
        setFormError("Please select your date of birth.");
        setIsSaving(false);
        return;
    }
    if (!name.trim()) {
        setFormError("Please enter your name.");
        setIsSaving(false);
        return;
    }

    const profileUpdateData = {
        name,
        email,
        yearOfStudy,
        birthDate: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
        interests: interests.split(/\s*,\s*/).filter(Boolean),
        bio,
    };
    updateProfile(profileUpdateData);
    try {
      saveProfile();
      setIsEditing(false);
      setFormError("Profile saved successfully!");
      setTimeout(() => setFormError(null), 3000);
    } catch (error) {
      console.error("Failed to save profile:", error);
      setFormError("Failed to save profile. Please try again.");
    }
    setIsSaving(false);
  };

  if (!isProfileLoaded) {
      return (
          <div className="container mx-auto max-w-2xl py-8 px-4">
             <a href="#main-profile-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-dashed focus:outline-2 focus:outline-offset-2">Skip to main content</a>
             <Skeleton className="h-10 w-40 mb-6" />
             <Skeleton className="h-64 w-full" />
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
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg" aria-label={`Avatar for ${profile.name || 'User'}`}>
                  {getInitials(profile.name || 'U')}
                </AvatarFallback>
              </Avatar>
             {isEditing ? (
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="text-2xl font-bold h-auto p-0 border-0 shadow-none focus-visible:ring-0 focus:outline-dashed focus:outline-2" aria-label="Edit your name" required aria-required="true" />
             ) : (
                <span className="text-2xl font-bold focus:outline-dashed focus:outline-2" tabIndex={0}>{profile.name || "(No Name)"}</span>
             )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
             <Label htmlFor="bio" className="text-lg font-semibold mb-2 block">Bio</Label>
             {isEditing ? (
                 <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a little about yourself..." className="focus:outline-dashed focus:outline-2 focus:outline-offset-2" aria-label="Edit your bio" />
             ) : (
                <p className="text-muted-foreground whitespace-pre-wrap focus:outline-dashed focus:outline-2" tabIndex={0}>{profile.bio || "(No bio yet)"}</p>
             )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 focus:outline-dashed focus:outline-2" role="heading" aria-level={2} tabIndex={0}>Details</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="email-detail" className="text-right">Email</Label>
                    {isEditing ? (
                        <Input id="email-detail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-2 focus:outline-dashed focus:outline-2 focus:outline-offset-2" aria-label="Edit your email" required aria-required="true" />
                    ) : (
                        <p className="col-span-2 text-muted-foreground focus:outline-dashed focus:outline-2" tabIndex={0}>{profile.email || "(Not set)"}</p>
                    )}
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="year-detail" className="text-right">Year</Label>
                    {isEditing ? (
                        <Select value={yearOfStudy} onValueChange={setYearOfStudy} >
                            <SelectTrigger id="year-detail" className="col-span-2 focus:outline-dashed focus:outline-2 focus:outline-offset-2" aria-label="Select your year of study">
                                <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Freshman">Freshman</SelectItem>
                                <SelectItem value="Sophomore">Sophomore</SelectItem>
                                <SelectItem value="Junior">Junior</SelectItem>
                                <SelectItem value="Senior">Senior</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <p className="col-span-2 text-muted-foreground focus:outline-dashed focus:outline-2" tabIndex={0}>{profile.yearOfStudy || "(Not set)"}</p>
                    )}
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                   <Label htmlFor="birthdate-detail" className="text-right">Birthday</Label>
                    {isEditing ? (
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button id="birthdate-detail" variant={"outline"} className={cn("col-span-2 justify-start text-left font-normal focus:outline-dashed focus:outline-2 focus:outline-offset-2", !birthDate && "text-muted-foreground")} aria-label={birthDate ? `Selected date: ${format(birthDate, "PPP")}, Change date of birth` : "Pick your date of birth"} aria-describedby={formError && !birthDate ? "form-error-message" : undefined} >
                                <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                                {birthDate ? format(birthDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={birthDate} onSelect={setBirthDate} initialFocus captionLayout="dropdown-buttons" fromDate={MIN_DATE} toDate={MAX_DATE} defaultMonth={birthDate || SIXTEEN_YEARS_AGO} aria-label="Calendar for selecting date of birth" />
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <p className="col-span-2 text-muted-foreground focus:outline-dashed focus:outline-2" tabIndex={0}>{profile.birthDate ? format(parseISO(profile.birthDate), "PPP") : "(Not set)"}</p>
                    )}
                </div>
                <div className="grid grid-cols-3 items-start gap-4">
                    <Label htmlFor="interests-detail" className="text-right pt-2">Interests</Label>
                    {isEditing ? (
                        <Textarea id="interests-detail" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Comma-separated" className="col-span-2 min-h-[60px] focus:outline-dashed focus:outline-2 focus:outline-offset-2" aria-label="Edit your interests, separated by commas" />
                    ) : (
                        <div className="col-span-2 flex flex-wrap gap-1 focus:outline-dashed focus:outline-2" tabIndex={0} aria-label="Your interests">
                            {(profile.interests || []).length > 0 ? (
                                profile.interests.map(interest => <span key={interest} className="bg-muted px-2 py-0.5 rounded text-sm">{interest}</span>)
                            ) : (
                                <p className="text-muted-foreground italic">(No interests listed)</p>
                            )}
                        </div>
                    )}
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
       {/* ARIA live region for status messages */}
      <div aria-live="polite" className="sr-only" id="form-status-message">
        {formError && <p>{formError}</p>}
      </div>
    </div>
  );
} 