'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, ArrowRight, User, Mail, GraduationCap, Sparkles, ChevronLeft, ChevronRight, Code, Palette, BookOpen, Music as MusicIcon, Brain, Briefcase, Dumbbell, MessageSquare, Globe, Atom, Film, Users as UsersIcon, Target, TrendingUp, HelpCircle, Settings, BookText, Zap } from "lucide-react";
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

const availableSubjects = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", 
  "Engineering", "English Literature", "History", "Psychology", "Philosophy",
  "Economics", "Business Administration", "Marketing", "Art", "Music",
  "Foreign Languages", "Sociology", "Political Science", "Law", "Medicine"
];

const learningStyles = [
  { value: "Visual", label: "Visual", description: "Learn best through charts, diagrams, and images" },
  { value: "Auditory", label: "Auditory", description: "Learn best through listening and verbal instruction" },
  { value: "Kinesthetic", label: "Kinesthetic", description: "Learn best through hands-on activities and movement" },
  { value: "Reading/Writing", label: "Reading/Writing", description: "Learn best through written materials and note-taking" },
        { value: "Unspecified", label: "I'm not sure", description: "Let MemoSpark help you discover your learning style" }
];

// Helper to get item from localStorage
const getFromLocalStorage = (key: string, defaultValue: any) => {
  if (typeof window !== 'undefined') {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      try {
        if (key === 'onboardingInterests' || key === 'onboardingSubjects') {
          const parsed = JSON.parse(storedValue);
          return Array.isArray(parsed) ? parsed : [];
        }
        return JSON.parse(storedValue);
      } catch (error) {
        console.error(`Error parsing localStorage item ${key}:`, error);
        return (key === 'onboardingInterests' || key === 'onboardingSubjects') ? [] : defaultValue;
      }
    }
  }
  return (key === 'onboardingInterests' || key === 'onboardingSubjects') ? [] : defaultValue;
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
  const [learningStyle, setLearningStyle] = useState<string>(() => getFromLocalStorage('onboardingLearningStyle', 'Unspecified'));
  const [subjects, setSubjects] = useState<string[]>(() => getFromLocalStorage('onboardingSubjects', []));
  const [aiPreferences, setAiPreferences] = useState({
    difficulty: getFromLocalStorage('onboardingAiDifficulty', 5),
    explanationStyle: getFromLocalStorage('onboardingAiExplanationStyle', 'balanced'),
    interactionFrequency: getFromLocalStorage('onboardingAiInteractionFrequency', 'moderate')
  });
  const [step, setStep] = useState(() => getFromLocalStorage('onboardingStep', 1));
  const totalSteps = 5;
  const [formError, setFormError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => setInLocalStorage('onboardingName', name), [name]);
  useEffect(() => setInLocalStorage('onboardingEmail', email), [email]);
  useEffect(() => setInLocalStorage('onboardingYearOfStudy', yearOfStudy), [yearOfStudy]);
  useEffect(() => setInLocalStorage('onboardingBirthDate', birthDateString), [birthDateString]);
  useEffect(() => setInLocalStorage('onboardingInterests', interests), [interests]);
  useEffect(() => setInLocalStorage('onboardingLearningStyle', learningStyle), [learningStyle]);
  useEffect(() => setInLocalStorage('onboardingSubjects', subjects), [subjects]);
  useEffect(() => setInLocalStorage('onboardingAiDifficulty', aiPreferences.difficulty), [aiPreferences.difficulty]);
  useEffect(() => setInLocalStorage('onboardingAiExplanationStyle', aiPreferences.explanationStyle), [aiPreferences.explanationStyle]);
  useEffect(() => setInLocalStorage('onboardingAiInteractionFrequency', aiPreferences.interactionFrequency), [aiPreferences.interactionFrequency]);
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
    setFieldErrors({});
    setIsSubmitting(true);

    // Client-side validation before submitting
    if (step === 1 && (!name || !email)) {
      setFormError("Please fill in your name and email to continue.");
      setIsSubmitting(false);
      return;
    }
    if (step === 2 && !birthDateString) {
      setFormError("Please select your date of birth to continue.");
      setIsSubmitting(false);
      return;
    }
    if (step === 4 && subjects.length === 0) {
      setFormError("Please select at least one subject to continue.");
      setIsSubmitting(false);
      return;
    }
    if (!name || !email || !birthDateString) {
      setFormError("Please ensure all required fields on previous steps are completed.");
      if (!name || !email) setStep(1);
      else if (!birthDateString) setStep(2);
      setIsSubmitting(false);
      return;
    }

    // Additional date validation
    try {
      const selectedDate = parseISO(birthDateString);
      if (selectedDate > MAX_DATE || selectedDate < MIN_DATE) {
        setFormError("Please enter a valid date of birth.");
        setStep(2);
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      setFormError("Invalid date format. Please select a valid date.");
      setStep(2);
      setIsSubmitting(false);
      return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('yearOfStudy', yearOfStudy);
    formData.append('birthDate', birthDateString);
    formData.append('interests', interests.join(','));
    formData.append('learningStyle', learningStyle);
    formData.append('subjects', subjects.join(','));
    formData.append('aiPreferences', JSON.stringify(aiPreferences));

    try {
      const res = await completeOnboarding(formData);
      
      if (res?.success && res?.message) {
        // Success case
        await user?.reload();
        
        // Clear localStorage
        if (typeof window !== 'undefined') {
          const keysToRemove = [
            'onboardingName', 'onboardingEmail', 'onboardingYearOfStudy', 
            'onboardingBirthDate', 'onboardingInterests', 'onboardingLearningStyle',
            'onboardingSubjects', 'onboardingAiDifficulty', 'onboardingAiExplanationStyle',
            'onboardingAiInteractionFrequency', 'onboardingStep'
          ];
          keysToRemove.forEach(key => localStorage.removeItem(key));
        }
        
        router.push('/questionnaire?from=onboarding');
      } else if (res?.error) {
        // Error case with possible field errors
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
          
          // Navigate to the first step with errors
          const fieldToStepMap: Record<string, number> = {
            name: 1,
            email: 1,
            yearOfStudy: 2,
            birthDate: 2,
            interests: 3,
            learningStyle: 3,
            subjects: 4,
            aiPreferences: 5
          };
          
          const errorFields = Object.keys(res.fieldErrors);
          if (errorFields.length > 0) {
            const firstErrorStep = Math.min(...errorFields.map(field => fieldToStepMap[field] || step));
            if (firstErrorStep !== step) {
              setStep(firstErrorStep);
            }
          }
        }
        setSubmissionError(res.error);
      } else {
        setSubmissionError('An unexpected error occurred. Please try again.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionError('A network error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
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
    if (step === 4 && subjects.length === 0) {
      setFormError("Please select at least one subject to continue.");
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

  const handleSubjectToggle = (subject: string) => {
    setSubjects(prevSubjects =>
      prevSubjects.includes(subject)
        ? prevSubjects.filter(s => s !== subject)
        : [...prevSubjects, subject]
    );
  };

  // Helper function to render field errors
  const renderFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName] && fieldErrors[fieldName].length > 0) {
      return (
        <div className="mt-1">
          {fieldErrors[fieldName].map((error, index) => (
            <p key={index} role="alert" className="text-xs text-red-600">
              {error}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!isLoaded) {
     return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <MemoSparkLogoSvg height={60} />
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
                      <div className="mx-auto mb-2 text-primary" role="img" aria-label="MemoSpark Logo">
            <MemoSparkLogoSvg height={60} />
          </div>
          <CardTitle className="text-2xl font-bold focus:outline-dashed focus:outline-2" role="heading" aria-level={1} tabIndex={0}>Welcome to MemoSpark!</CardTitle>
          <CardDescription className="text-base focus:outline-dashed focus:outline-2" tabIndex={0}>
            Let's personalize your learning experience in just a few steps.
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
                  className={cn(
                    "h-11 text-base focus:outline-dashed focus:outline-2 focus:outline-offset-2",
                    fieldErrors.name ? "border-red-500 focus:border-red-500" : ""
                  )}
                  required
                  aria-required="true"
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                />
                {renderFieldError('name')}
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
                  className={cn(
                    "h-11 text-base focus:outline-dashed focus:outline-2 focus:outline-offset-2",
                    fieldErrors.email ? "border-red-500 focus:border-red-500" : ""
                  )}
                  required 
                  aria-required="true"
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                />
                {renderFieldError('email')}
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
                  <SelectTrigger 
                    id="year" 
                    className={cn(
                      "h-11 text-base focus:outline-dashed focus:outline-2 focus:outline-offset-2",
                      fieldErrors.yearOfStudy ? "border-red-500" : ""
                    )}
                    aria-label="Select your year of study"
                    aria-describedby={fieldErrors.yearOfStudy ? "year-error" : undefined}
                  >
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Freshman">Freshman</SelectItem>
                    <SelectItem value="Sophomore">Sophomore</SelectItem>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                    <SelectItem value="Graduate">Graduate</SelectItem>
                    <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {renderFieldError('yearOfStudy')}
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
                  className={cn(
                    "w-full h-11 text-base bg-background text-foreground border-2 border-border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-dashed focus:outline-2 focus:outline-offset-2 focus:border-primary focus:ring-1 focus:ring-primary",
                    "dark:bg-card dark:text-card-foreground dark:border-border",
                    "[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert-0",
                    "dark:[&::-webkit-calendar-picker-indicator]:brightness-0 dark:[&::-webkit-calendar-picker-indicator]:invert",
                    fieldErrors.birthDate ? "border-red-500 focus:border-red-500" : ""
                  )}
                  min={MIN_DATE_STR}
                  max={MAX_DATE_STR}
                  aria-label="Pick your date of birth"
                  aria-describedby={fieldErrors.birthDate ? "birthdate-error" : undefined}
                  required
                />
                {renderFieldError('birthDate')}
              </div>
            </div>
          )}

          {/* Step 3: Learning Style */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base flex items-center gap-2">
                  <Brain size={16} className="text-primary" aria-hidden="true" />
                  How do you learn best?
                </Label>
                <p className="text-sm text-muted-foreground pb-2">
                  Understanding your learning style helps us personalize your study experience.
                </p>
                <div className="space-y-3">
                  {learningStyles.map((style) => (
                    <Button
                      key={style.value}
                      variant={learningStyle === style.value ? "default" : "outline"}
                      onClick={() => setLearningStyle(style.value)}
                      className={cn(
                        "w-full h-auto p-4 flex flex-col items-start justify-start text-left transition-all duration-150 ease-in-out",
                        learningStyle === style.value ? "ring-2 ring-primary ring-offset-2 shadow-lg" : "hover:shadow-md",
                        "focus:outline-dashed focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                      )}
                      aria-pressed={learningStyle === style.value}
                    >
                      <span className={cn("font-medium text-sm", learningStyle === style.value ? "text-primary-foreground" : "text-foreground")}>
                        {style.label}
                      </span>
                      <span className={cn("text-xs mt-1", learningStyle === style.value ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {style.description}
                      </span>
                    </Button>
                  ))}
                </div>
                {renderFieldError('learningStyle')}
              </div>
            </div>
          )}

          {/* Step 4: Subjects */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base flex items-center gap-2">
                  <BookText size={16} className="text-primary" aria-hidden="true" />
                  What subjects are you studying?
                </Label>
                <p className="text-sm text-muted-foreground pb-2">
                  Select the subjects you're currently enrolled in or interested in studying.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                  {availableSubjects.map((subject) => {
                    const isSelected = subjects.includes(subject);
                    return (
                      <Button
                        key={subject}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => handleSubjectToggle(subject)}
                        className={cn(
                          "h-auto py-3 px-4 text-left justify-start transition-all duration-150 ease-in-out",
                          isSelected ? "ring-2 ring-primary ring-offset-2 shadow-lg" : "hover:shadow-md",
                          "focus:outline-dashed focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                        )}
                        aria-pressed={isSelected}
                      >
                        <span className={cn("text-sm", isSelected ? "text-primary-foreground" : "text-foreground")}>
                          {subject}
                        </span>
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
                </p>
                {renderFieldError('subjects')}
              </div>
            </div>
          )}

          {/* Step 5: Interests and AI Preferences */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" aria-hidden="true" />
                    Your interests
                  </Label>
                  <p className="text-sm text-muted-foreground pb-2">
                    Select a few topics you&apos;re passionate about. This helps us connect you with like-minded peers.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {availableInterests.map((interest) => {
                      const IconComponent = interest.icon;
                      const isSelected = interests.includes(interest.id);
                      return (
                        <Button
                          key={interest.id}
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => handleInterestToggle(interest.id)}
                          className={cn(
                            "h-auto py-3 flex flex-col items-center justify-center gap-1 text-center transition-all duration-150 ease-in-out",
                            isSelected ? "ring-2 ring-primary ring-offset-2 shadow-lg" : "hover:shadow-md",
                            "focus:outline-dashed focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                          )}
                          aria-pressed={isSelected}
                          aria-label={interest.name}
                        >
                          <IconComponent size={20} className={isSelected ? "text-primary-foreground" : "text-primary"} />
                          <span className={cn("text-xs font-medium", isSelected ? "text-primary-foreground" : "text-foreground")}>
                            {interest.name}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base flex items-center gap-2">
                    <Zap size={16} className="text-primary" aria-hidden="true" />
                    AI Assistant Preferences
                  </Label>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty" className="text-sm">Content Difficulty (1-10)</Label>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-muted-foreground">Easy</span>
                        <input
                          id="difficulty"
                          type="range"
                          min="1"
                          max="10"
                          value={aiPreferences.difficulty}
                          onChange={(e) => setAiPreferences(prev => ({ ...prev, difficulty: Number.parseInt(e.target.value) }))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground">Hard</span>
                        <span className="text-sm font-medium min-w-[20px]">{aiPreferences.difficulty}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="explanation-style" className="text-sm">Explanation Style</Label>
                      <Select value={aiPreferences.explanationStyle} onValueChange={(value) => setAiPreferences(prev => ({ ...prev, explanationStyle: value }))}>
                        <SelectTrigger id="explanation-style" className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple & Direct</SelectItem>
                          <SelectItem value="balanced">Balanced Detail</SelectItem>
                          <SelectItem value="detailed">Detailed & Thorough</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interaction-frequency" className="text-sm">AI Interaction Frequency</Label>
                      <Select value={aiPreferences.interactionFrequency} onValueChange={(value) => setAiPreferences(prev => ({ ...prev, interactionFrequency: value }))}>
                        <SelectTrigger id="interaction-frequency" className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal - Only when asked</SelectItem>
                          <SelectItem value="moderate">Moderate - Regular suggestions</SelectItem>
                          <SelectItem value="frequent">Frequent - Proactive assistance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {renderFieldError('aiPreferences')}
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
              disabled={isSubmitting}
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
            disabled={isSubmitting}
          >
            {isSubmitting && step === totalSteps ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Completing...
              </>
            ) : step < totalSteps ? (
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