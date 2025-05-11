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
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isProfileLoaded && profile.name) {
      router.replace('/dashboard');
    }
  }, [isProfileLoaded, profile, router]);

  const handleOnboardingSubmit = () => {
    if (!birthDate) {
      setFormError("Please select your date of birth to continue.");
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
    setFormError(null);
    if (step === 1 && (!name || !email)) {
      setFormError("Please fill in your name and email to continue.");
      return;
    }
    
    if (step === 2 && !birthDate) {
      setFormError("Please select your date of birth to continue.");
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
      <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-dashed focus:outline-2 focus:outline-offset-2">Skip to main content</a>
      <Card id="main-content" className="w-full max-w-lg shadow-xl border-border/40 overflow-hidden">
        <CardHeader className="text-center pb-6 pt-8 space-y-4">
          <div className="mx-auto mb-2 text-primary" role="img" aria-label="StudySpark Logo">
            <StudySparkLogoSvg height={60} />
          </div>
          <CardTitle className="text-2xl font-bold focus:outline-dashed focus:outline-2" role="heading" aria-level={1} tabIndex={0}>Welcome to StudySpark!</CardTitle>
          <CardDescription className="text-base focus:outline-dashed focus:outline-2" tabIndex={0}>
            Let's get your profile set up in just a few steps.
          </CardDescription>
          
          <div role="status" aria-live="polite" aria-label={`Step ${step} of ${totalSteps}`} className="flex justify-center space-x-2 pt-2">
            {[...Array(totalSteps)].map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index + 1 === step ? "w-8 bg-primary" : "w-4 bg-primary/20"
                )}
                aria-hidden="true"
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-6">
          {formError && (
            <p role="alert" className="text-sm text-red-600 mb-4 p-2 bg-red-50 border border-red-200 rounded-lg focus:outline-dashed focus:outline-2" tabIndex={0}>
                {formError}
            </p>
          )}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base flex items-center gap-2"> 
                  <User size={16} className="text-primary" aria-hidden="true" />
                  Full Name
                </Label>
                <Input 
                  id="name" 
                  placeholder="e.g., Alex Johnson" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="h-11 text-base focus:outline-dashed focus:outline-2 focus:outline-offset-2"
                  required
                  aria-required="true"
                  aria-describedby={formError && (name === '' || email === '') ? "form-error-message" : undefined}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base flex items-center gap-2">
                  <Mail size={16} className="text-primary" aria-hidden="true" />
                  Email Address
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="e.g., alex@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="h-11 text-base focus:outline-dashed focus:outline-2 focus:outline-offset-2"
                  required 
                  aria-required="true"
                  aria-describedby={formError && (name === '' || email === '') ? "form-error-message" : undefined}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="year" className="text-base flex items-center gap-2">
                  <GraduationCap size={16} className="text-primary" aria-hidden="true" />
                  Year of Study
                </Label>
                <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                  <SelectTrigger id="year" className="h-11 text-base focus:outline-dashed focus:outline-2 focus:outline-offset-2" aria-label="Select your year of study">
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
                  <CalendarIcon size={16} className="text-primary" aria-hidden="true" />
                  Date of Birth
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="birthdate"
                      variant="outline"
                      className={cn(
                        "w-full h-11 justify-start text-left font-normal text-base bg-gradient-to-r from-blue-50 via-white to-pink-50 border-2 border-primary/20 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-dashed focus:outline-2 focus:outline-offset-2",
                        !birthDate && "text-muted-foreground"
                      )}
                      aria-label={birthDate ? `Selected date: ${format(birthDate, "PPP")}, Change date of birth` : "Pick your date of birth"}
                      aria-describedby={formError && !birthDate ? "form-error-message" : undefined}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
                      {birthDate ? format(birthDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-2 border-primary/10 bg-gradient-to-br from-white via-blue-50 to-pink-50 max-w-xs sm:max-w-sm md:max-w-md" align="center" sideOffset={8} avoidCollisions>
                    <div className="p-4 pb-0 flex flex-col items-center">
                      <CalendarIcon className="h-8 w-8 text-primary mb-2 animate-bounce" aria-hidden="true" />
                      <h4 className="font-bold text-lg mb-1 text-primary focus:outline-dashed focus:outline-2" role="heading" aria-level={2} tabIndex={0}>Pick your birthday!</h4>
                    </div>
                    <div className="px-4 pb-4">
                      <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={setBirthDate}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromDate={MIN_DATE}
                        toDate={MAX_DATE}
                        defaultMonth={SIXTEEN_YEARS_AGO}
                        className="rounded-lg border bg-white shadow-sm"
                        aria-label="Calendar for selecting date of birth"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="interests" className="text-base flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" aria-hidden="true" />
                  Interests (comma-separated)
                </Label>
                <Textarea
                  id="interests"
                  placeholder="e.g., Programming, Hiking, Music"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  className="min-h-[120px] text-base resize-none focus:outline-dashed focus:outline-2 focus:outline-offset-2"
                  aria-label="Enter your interests, separated by commas"
                />
              </div>
              
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mt-4 focus:outline-dashed focus:outline-2" tabIndex={0} role="region" aria-label="Information about interests">
                <h3 className="font-medium text-sm mb-2 text-primary" role="heading" aria-level={3}>Almost there!</h3>
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
              className="h-11 focus:outline-dashed focus:outline-2 focus:outline-offset-2"
              aria-label="Go to previous step"
            >
              Back
            </Button>
          ) : (
            <div></div>
          )}
          
          <Button 
            onClick={handleNextStep} 
            className="h-11 px-6 group focus:outline-dashed focus:outline-2 focus:outline-offset-2"
            aria-label={step < totalSteps ? "Go to next step" : "Complete setup"}
          >
            {step < totalSteps ? (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <p className="text-xs text-muted-foreground mt-4 focus:outline-dashed focus:outline-2" tabIndex={0}>
        By completing setup, you agree to our Terms of Service and Privacy Policy.
      </p>
      <div aria-live="polite" className="sr-only" id="form-error-message">
        {formError && <p>{formError}</p>}
      </div>
    </div>
  );
}
