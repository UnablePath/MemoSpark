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
    if (!birthDate || birthDate > SIXTEEN_YEARS_AGO) {
        alert("You must be at least 16 years old.");
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
    if (saveProfile()) {
        setIsEditing(false);
    }
  };

  if (!isProfileLoaded) {
      return (
          <div className="container mx-auto max-w-2xl py-8 px-4">
             <Skeleton className="h-10 w-40 mb-6" />
             <Skeleton className="h-64 w-full" />
          </div>
      );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Your Profile</h1>
        </div>
        <Button variant="outline" size="icon" onClick={isEditing ? handleSave : handleEditToggle}>
            {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            <span className="sr-only">{isEditing ? 'Save Profile' : 'Edit Profile'}</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getInitials(profile.name || 'U')}
                </AvatarFallback>
              </Avatar>
             {isEditing ? (
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="text-2xl font-bold h-auto p-0 border-0 shadow-none focus-visible:ring-0" />
             ) : (
                <span className="text-2xl font-bold">{profile.name || "(No Name)"}</span>
             )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
             <Label htmlFor="bio" className="text-lg font-semibold mb-2 block">Bio</Label>
             {isEditing ? (
                 <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a little about yourself..." />
             ) : (
                <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio || "(No bio yet)"}</p>
             )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Details</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="email-detail" className="text-right">Email</Label>
                    {isEditing ? (
                        <Input id="email-detail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-2" />
                    ) : (
                        <p className="col-span-2 text-muted-foreground">{profile.email || "(Not set)"}</p>
                    )}
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="year-detail" className="text-right">Year</Label>
                    {isEditing ? (
                        <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                            <SelectTrigger id="year-detail" className="col-span-2">
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
                        <p className="col-span-2 text-muted-foreground">{profile.yearOfStudy || "(Not set)"}</p>
                    )}
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                   <Label htmlFor="birthdate-detail" className="text-right">Birthday</Label>
                    {isEditing ? (
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button id="birthdate-detail" variant={"outline"} className={cn("col-span-2 justify-start text-left font-normal", !birthDate && "text-muted-foreground")} >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {birthDate ? format(birthDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={birthDate} onSelect={setBirthDate} initialFocus captionLayout="dropdown-buttons" fromDate={MIN_DATE} toDate={MAX_DATE} defaultMonth={birthDate || SIXTEEN_YEARS_AGO} />
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <p className="col-span-2 text-muted-foreground">{profile.birthDate ? format(parseISO(profile.birthDate), "PPP") : "(Not set)"}</p>
                    )}
                </div>
                <div className="grid grid-cols-3 items-start gap-4">
                    <Label htmlFor="interests-detail" className="text-right pt-2">Interests</Label>
                    {isEditing ? (
                        <Textarea id="interests-detail" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Comma-separated" className="col-span-2 min-h-[60px]" />
                    ) : (
                        <div className="col-span-2 flex flex-wrap gap-1">
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
                  <Button onClick={handleSave}>Save Changes</Button>
              </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
} 