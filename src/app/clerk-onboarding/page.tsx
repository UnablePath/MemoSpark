'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { StudySparkLogoSvg } from "@/components/ui/StudySparkLogoSvg";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, ArrowRight, User, Mail, GraduationCap, Sparkles, ChevronLeft, ChevronRight, Code, Palette, BookOpen, Music as MusicIcon, Brain, Briefcase, Dumbbell, MessageSquare, Globe, Atom, Film, Users as UsersIcon, Target, TrendingUp, HelpCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { completeOnboarding } from './_actions';

const MAX_DATE = new Date();
const MIN_DATE = new Date(MAX_DATE.getFullYear() - 100, MAX_DATE.getMonth(), MAX_DATE.getDate());
const SIXTEEN_YEARS_AGO = new Date(MAX_DATE.getFullYear() - 16, MAX_DATE.getMonth(), MAX_DATE.getDate());

const MIN_DATE_STR = format(MIN_DATE, 'yyyy-MM-dd');
const MAX_DATE_STR = format(MAX_DATE, 'yyyy-MM-dd');
const SIXTEEN_YEARS_AGO_STR = format(SIXTEEN_YEARS_AGO, 'yyyy-MM-dd');

const availableInterests = [
  { id: "programming", name: "Programming", icon: Code },
  { id: "design", name: "Design", icon: Palette },
  { id: "literature", name: "Literature", icon: BookOpen },
  { id: "music", name: "Music", icon: MusicIcon },
  { id: "psychology", name: "Psychology", icon: Brain },
  { id: "business", name: "Business", icon: Briefcase },
  { id: "fitness", name: "Fitness", icon: Dumbbell },
  { id: "debate", name: "Debate", icon: MessageSquare },
  { id: "languages", name: "Languages", icon: Globe },
  { id: "science", name: "Science", icon: Atom },
  { id: "cinema", name: "Cinema", icon: Film },
  { id: "social-clubs", name: "Social Clubs", icon: UsersIcon },
  { id: "goal-setting", name: "Goal Setting", icon: Target },
  { id: "productivity", name: "Productivity", icon: TrendingUp },
  { id: "self-help", name: "Self-Help", icon: HelpCircle },
];

// Helper to get item from localStorage
const getFromLocalStorage = (key: string, defaultValue: any) => {
  if (typeof window !== 'undefined') {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      try {
        if (key === 'onboardingInterests') {
          const parsed = JSON.parse(storedValue);
          return Array.isArray(parsed) ? parsed : [];
        }
        return JSON.parse(storedValue);
      } catch (error) {
        console.error(`Error parsing localStorage item ${key}:`, error);
        return key === 'onboardingInterests' ? [] : defaultValue;
      }
    }
  }
  return key === 'onboardingInterests' ? [] : defaultValue;
};

// Helper to set item in localStorage
const setInLocalStorage = (key: string, value: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export default function ClerkOnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  
  const [name, setName] = useState(() => getFromLocalStorage('onboardingName', ''));
  const [email, setEmail] = useState(() => getFromLocalStorage('onboardingEmail', ''));
  const [yearOfStudy, setYearOfStudy] = useState<string>(() => getFromLocalStorage('onboardingYearOfStudy', 'Freshman'));
  const [birthDateString, setBirthDateString] = useState<string>(() => {
    const storedDate = getFromLocalStorage('onboardingBirthDate', null);
    if (storedDate) {
      try {
        if (typeof storedDate === 'string' && storedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return storedDate;
        }
        return format(new Date(storedDate), 'yyyy-MM-dd');
      } catch (e) {
        return '';
      }
    }
    return '';
  });
  const [interests, setInterests] = useState<string[]>(() => getFromLocalStorage('onboardingInterests', []));
  const [step, setStep] = useState(() => getFromLocalStorage('onboardingStep', 1));
  const totalSteps = 3;
  const [formError, setFormError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState('');

  useEffect(() => setInLocalStorage('onboardingName', name), [name]);
  useEffect(() => setInLocalStorage('onboardingEmail', email), [email]);
  useEffect(() => setInLocalStorage('onboardingYearOfStudy', yearOfStudy), [yearOfStudy]);
  useEffect(() => setInLocalStorage('onboardingBirthDate', birthDateString), [birthDateString]);
  useEffect(() => setInLocalStorage('onboardingInterests', interests), [interests]);
  useEffect(() => setInLocalStorage('onboardingStep', step), [step]);

  useEffect(() => {
    if (user) {
      if (!name && user.fullName) setName(user.fullName);
      if (!email && user.primaryEmailAddress?.emailAddress) setEmail(user.primaryEmailAddress.emailAddress);
    }
  }, [user, name, email]);

  const handleFinalSubmit = async () => {
    setFormError(null);
    setSubmissionError('');

    if (step === 1 && (!name || !email)) {
      setFormError("Please fill in your name and email to continue.");
      return;
    }
    if (step === 2 && !birthDateString) {
      setFormError("Please select your date of birth to continue.");
      return;
    }
    if (!name || !email || !birthDateString) {
      setFormError("Please ensure all required fields on previous steps are completed.");
      if (!name || !email) setStep(1);
      else if (!birthDateString) setStep(2);
      return;
    }

    try {
      const selectedDate = parseISO(birthDateString);
      if (selectedDate > MAX_DATE || selectedDate < MIN_DATE) {
        setFormError("Please enter a valid date of birth.");
        setStep(2);
        return;
      }
    } catch (error) {
      setFormError("Invalid date format. Please select a valid date.");
      setStep(2);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('yearOfStudy', yearOfStudy);
    formData.append('birthDate', birthDateString);
    formData.append('interests', interests.join(','));

    const res = await completeOnboarding(formData);
    if (res?.message) {
      await user?.reload();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboardingName');
        localStorage.removeItem('onboardingEmail');
        localStorage.removeItem('onboardingYearOfStudy');
        localStorage.removeItem('onboardingBirthDate');
        localStorage.removeItem('onboardingInterests');
        localStorage.removeItem('onboardingStep');
      }
      router.push('/');
    }
    if (res?.error) {
      setSubmissionError(res.error);
    }
  };

  const handleNextStep = () => {
    setFormError(null);
    if (step === 1 && (!name || !email)) {
      setFormError("Please fill in your name and email to continue.");
      return;
    }
    if (step === 2 && !birthDateString) {
      setFormError("Please select your date of birth to continue.");
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleFinalSubmit();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleInterestToggle = (interestId: string) => {
    setInterests(prevInterests =>
      prevInterests.includes(interestId)
        ? prevInterests.filter(i => i !== interestId)
        : [...prevInterests, interestId]
    );
  };

  if (!isLoaded) {
     return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <StudySparkLogoSvg height={60} />
          <p className="text-muted-foreground animate-pulse">Loading...</p>
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
          {submissionError && (
            <p role="alert" className="text-sm text-red-600 mb-4 p-2 bg-red-50 border border-red-200 rounded-lg focus:outline-dashed focus:outline-2" tabIndex={0}>
                Error: {submissionError}
            </p>
          )}
          {/* Step 1: Name and Email */}
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

          {/* Step 2: Year of Study and Date of Birth */}
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
                    <SelectItem value="Graduate">Graduate</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="birthdate" className="text-base flex items-center gap-2">
                  <CalendarIcon size={16} className="text-primary" aria-hidden="true" />
                  Date of Birth
                </Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={birthDateString}
                  onChange={(e) => {
                    setBirthDateString(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full h-11 text-base bg-gradient-to-r from-blue-50 via-white to-pink-50 border-2 border-primary/20 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-dashed focus:outline-2 focus:outline-offset-2 appearance-none"
                  min={MIN_DATE_STR}
                  max={MAX_DATE_STR}
                  aria-label="Pick your date of birth"
                  aria-describedby={formError && !birthDateString ? "form-error-message" : undefined}
                  required
                  aria-required="true"
                />
              </div>
            </div>
          )}

          {/* Step 3: Interests */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" aria-hidden="true" />
                  Tell us about your interests
                </Label>
                <p className="text-sm text-muted-foreground pb-2">
                  Select a few topics you&apos;re passionate about. This will help us connect you with like-minded peers.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-fr">
                  {availableInterests.map((interest) => {
                    const IconComponent = interest.icon;
                    const isSelected = interests.includes(interest.id);
                    return (
                      <Button
                        key={interest.id}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => handleInterestToggle(interest.id)}
                        className={cn(
                          "h-auto py-4 flex flex-col items-center justify-center gap-2 text-center transition-all duration-150 ease-in-out",
                          isSelected ? "ring-2 ring-primary ring-offset-2 shadow-lg" : "hover:shadow-md",
                          "focus:outline-dashed focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                        )}
                        aria-pressed={isSelected}
                        aria-label={interest.name}
                      >
                        <IconComponent size={28} className={isSelected ? "text-primary-foreground" : "text-primary"} />
                        <span className={cn("text-xs font-medium", isSelected ? "text-primary-foreground" : "text-foreground")}>
                          {interest.name}
                        </span>
                      </Button>
                    );
                  })}
                </div>
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
            <div></div> /* Placeholder to keep Next button to the right */
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