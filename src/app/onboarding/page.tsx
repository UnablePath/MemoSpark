'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { StudySparkLogoSvg } from "@/components/ui/StudySparkLogoSvg";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ArrowRight, User, Mail, GraduationCap, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  const [step, setStep] = useState(1);
  const totalSteps = 3;

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

  const handleNextStep = () => {
    if (step === 1 && (!name || !email)) {
      alert("Please fill in your name and email to continue.");
      return;
    }
    
    if (step === 2 && !birthDate) {
      alert("Please select your date of birth to continue.");
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleOnboardingSubmit();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (!isProfileLoaded || (isProfileLoaded && profile.name)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <StudySparkLogoSvg height={60} />
          <p className="text-muted-foreground animate-pulse">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-background p-4">
      <Card className="w-full max-w-lg shadow-xl border-border/40 overflow-hidden">
        <CardHeader className="text-center pb-6 pt-8 space-y-4">
          <div className="mx-auto mb-2 text-primary">
            <StudySparkLogoSvg height={60} />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to StudySpark!</CardTitle>
          <CardDescription className="text-base">
            Let's get your profile set up in just a few steps.
          </CardDescription>
          
          <div className="flex justify-center space-x-2 pt-2">
            {[...Array(totalSteps)].map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index + 1 === step ? "w-8 bg-primary" : "w-4 bg-primary/20"
                )}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base flex items-center gap-2">
                  <User size={16} className="text-primary" />
                  Full Name
                </Label>
                <Input 
                  id="name" 
                  placeholder="e.g., Alex Johnson" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="h-11 text-base"
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base flex items-center gap-2">
                  <Mail size={16} className="text-primary" />
                  Email Address
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="e.g., alex@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="h-11 text-base"
                  required 
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="year" className="text-base flex items-center gap-2">
                  <GraduationCap size={16} className="text-primary" />
                  Year of Study
                </Label>
                <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                  <SelectTrigger id="year" className="h-11 text-base">
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
                <Label htmlFor="birthdate" className="text-base flex items-center gap-2">
                  <CalendarIcon size={16} className="text-primary" />
                  Date of Birth (16+)
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="birthdate"
                      variant="outline"
                      className={cn(
                        "w-full h-11 justify-start text-left font-normal text-base",
                        !birthDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {birthDate ? format(birthDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={birthDate}
                      onSelect={setBirthDate}
                      initialFocus
                      captionLayout="dropdown-buttons"
                      fromDate={MIN_DATE}
                      toDate={MAX_DATE}
                      defaultMonth={SIXTEEN_YEARS_AGO}
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="interests" className="text-base flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  Interests (comma-separated)
                </Label>
                <Textarea
                  id="interests"
                  placeholder="e.g., Programming, Hiking, Music"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  className="min-h-[120px] text-base resize-none"
                />
              </div>
              
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mt-4">
                <h3 className="font-medium text-sm mb-2 text-primary">Almost there!</h3>
                <p className="text-sm text-muted-foreground">
                  Your interests help us personalize your study experience and connect you with like-minded peers.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between px-8 pb-8 pt-2">
          {step > 1 ? (
            <Button 
              variant="outline" 
              onClick={handlePrevStep}
              className="h-11"
            >
              Back
            </Button>
          ) : (
            <div></div>
          )}
          
          <Button 
            onClick={handleNextStep} 
            className="h-11 px-6 group"
          >
            {step < totalSteps ? (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <p className="text-xs text-muted-foreground mt-4">
        By completing setup, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
