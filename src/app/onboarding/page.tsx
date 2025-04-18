'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { StudySparkLogoSvg } from "@/components/ui/StudySparkLogoSvg";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

const MAX_DATE = new Date();
const MIN_DATE = new Date(MAX_DATE.getFullYear() - 100, MAX_DATE.getMonth(), MAX_DATE.getDate());
const SIXTEEN_YEARS_AGO = new Date(MAX_DATE.getFullYear() - 16, MAX_DATE.getMonth(), MAX_DATE.getDate());

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, updateProfile, saveProfile, isProfileLoaded } = useUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<string>('Freshman');
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [interests, setInterests] = useState('');

  useEffect(() => {
    if (isProfileLoaded && profile.name) {
      router.replace('/dashboard');
    }
  }, [isProfileLoaded, profile, router]);

  const handleOnboardingSubmit = () => {
    if (!birthDate || birthDate > SIXTEEN_YEARS_AGO) {
        alert("You must be at least 16 years old to use StudySpark.");
        return;
    }

    const profileUpdateData = {
        name,
        email,
        yearOfStudy,
        birthDate: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
        interests: interests.split(/\s*,\s*/).filter(Boolean),
    };

    updateProfile(profileUpdateData);
    if (Boolean(saveProfile())) {
      router.push('/dashboard');
    }
  };

  if (!isProfileLoaded || (isProfileLoaded && profile.name)) {
      return (
          <div className="flex items-center justify-center h-screen bg-background">
              <p>Loading...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4 text-primary">
                <StudySparkLogoSvg height={60} />
            </div>
          <CardTitle className="text-2xl">Welcome to StudySpark!</CardTitle>
          <CardDescription>Let's get your profile set up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="e.g., Alex Johnson" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="e.g., alex@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="year">Year of Study</Label>
                <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Freshman">Freshman</SelectItem>
                    <SelectItem value="Sophomore">Sophomore</SelectItem>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthdate">Date of Birth (16+)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="birthdate"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !birthDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {birthDate ? format(birthDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={setBirthDate}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromDate={MIN_DATE}
                    toDate={MAX_DATE}
                    defaultMonth={SIXTEEN_YEARS_AGO}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interests">Interests (comma-separated)</Label>
            <Textarea
              id="interests"
              placeholder="e.g., Programming, Hiking, Music"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
            />
          </div>

          <Button onClick={handleOnboardingSubmit} className="w-full">Complete Setup</Button>
        </CardContent>
      </Card>
    </div>
  );
} 