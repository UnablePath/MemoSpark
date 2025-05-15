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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ArrowRight, User, Mail, GraduationCap, Sparkles, Pencil as PencilIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { CaptionProps, useDayPicker, useNavigation } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { completeOnboarding } from './_actions';

const MAX_DATE = new Date();
const MIN_DATE = new Date(MAX_DATE.getFullYear() - 100, MAX_DATE.getMonth(), MAX_DATE.getDate());
const SIXTEEN_YEARS_AGO = new Date(MAX_DATE.getFullYear() - 16, MAX_DATE.getMonth(), MAX_DATE.getDate());

// Helper to get item from localStorage
const getFromLocalStorage = (key: string, defaultValue: any) => {
  if (typeof window !== 'undefined') {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      try {
        return JSON.parse(storedValue);
      } catch (error) {
        console.error(`Error parsing localStorage item ${key}:`, error);
        return defaultValue;
      }
    }
  }
  return defaultValue;
};

// Helper to set item in localStorage
const setInLocalStorage = (key: string, value: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};


// Custom Caption Component for the Calendar (copied from original onboarding)
function CustomCalendarCaption(props: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  const { fromDate, toDate } = useDayPicker();
  const { displayMonth } = props;

  const years: number[] = [];
  const refYear = displayMonth.getFullYear();
  const fromYear = fromDate ? fromDate.getFullYear() : refYear - 100;
  const toYear = toDate ? toDate.getFullYear() : refYear;
  for (let i = fromYear; i <= toYear; i++) {
    years.push(i);
  }

  const handleYearChange = (yearValue: string) => {
    const newYear = parseInt(yearValue, 10);
    const newMonthDate = new Date(newYear, displayMonth.getMonth());
    if (fromDate && newMonthDate < fromDate) {
      goToMonth(fromDate);
    } else if (toDate && newMonthDate > toDate) {
      goToMonth(toDate);
    } else {
      goToMonth(newMonthDate);
    }
  };

  const handleMonthChange = (monthValue: string) => {
    const newMonth = parseInt(monthValue, 10);
    const newMonthDate = new Date(displayMonth.getFullYear(), newMonth);
    if (fromDate && newMonthDate < fromDate) {
      goToMonth(fromDate);
    } else if (toDate && newMonthDate > toDate) {
      goToMonth(toDate);
    } else {
      goToMonth(newMonthDate);
    }
  };

  return (
    <div className="flex items-center justify-between pt-2 pb-1.5 px-1.5 sm:px-2 space-x-1 sm:space-x-1.5 border-b border-border">
      <div className="flex items-center space-x-1 sm:space-x-1.5">
        <Select
          value={displayMonth.getFullYear().toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger
            aria-label="Select year"
            className="h-8 text-sm font-semibold focus:ring-0 focus:outline-none bg-transparent hover:bg-accent w-[auto] min-w-[65px] sm:min-w-[70px] border-0 shadow-none px-1.5 py-0 data-[state=open]:bg-accent"
          >
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px]">
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()} className="focus:bg-accent">{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={displayMonth.getMonth().toString()}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger
            aria-label="Select month"
            className="h-8 text-sm font-semibold focus:ring-0 focus:outline-none bg-transparent hover:bg-accent w-[auto] min-w-[90px] sm:min-w-[100px] border-0 shadow-none px-1.5 py-0 data-[state=open]:bg-accent"
          >
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px]">
            {Array.from({ length: 12 }).map((_, i) => (
              <SelectItem key={i} value={i.toString()} className="focus:bg-accent">{format(new Date(displayMonth.getFullYear(), i), "MMMM")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 border-0 hover:bg-accent rounded-full"
          onClick={() => previousMonth && goToMonth(previousMonth)}
          disabled={!previousMonth}
          aria-label="Go to previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 border-0 hover:bg-accent rounded-full"
          onClick={() => nextMonth && goToMonth(nextMonth)}
          disabled={!nextMonth}
          aria-label="Go to next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


export default function ClerkOnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  
  const [name, setName] = useState(() => getFromLocalStorage('onboardingName', ''));
  const [email, setEmail] = useState(() => getFromLocalStorage('onboardingEmail', ''));
  const [yearOfStudy, setYearOfStudy] = useState<string>(() => getFromLocalStorage('onboardingYearOfStudy', 'Freshman'));
  const [birthDate, setBirthDate] = useState<Date | undefined>(() => {
    const storedDate = getFromLocalStorage('onboardingBirthDate', null);
    return storedDate ? new Date(storedDate) : undefined;
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [interests, setInterests] = useState(() => getFromLocalStorage('onboardingInterests', ''));
  const [step, setStep] = useState(() => getFromLocalStorage('onboardingStep', 1));
  const totalSteps = 3;
  const [formError, setFormError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState('');

  // Persist to localStorage
  useEffect(() => setInLocalStorage('onboardingName', name), [name]);
  useEffect(() => setInLocalStorage('onboardingEmail', email), [email]);
  useEffect(() => setInLocalStorage('onboardingYearOfStudy', yearOfStudy), [yearOfStudy]);
  useEffect(() => setInLocalStorage('onboardingBirthDate', birthDate), [birthDate]);
  useEffect(() => setInLocalStorage('onboardingInterests', interests), [interests]);
  useEffect(() => setInLocalStorage('onboardingStep', step), [step]);

  // Pre-fill from Clerk user data if available
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
    if (step === 2 && !birthDate) {
      setFormError("Please select your date of birth to continue.");
      return;
    }
     // Final validation before submission (optional, but good practice)
    if (!name || !email || !birthDate) {
      setFormError("Please ensure all required fields are completed.");
      // Optionally, navigate to the first step with missing data
      if (!name || !email) setStep(1);
      else if (!birthDate) setStep(2);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email); // Clerk might use its own email, but we pass it for completeness
    formData.append('yearOfStudy', yearOfStudy);
    if (birthDate) {
      formData.append('birthDate', format(birthDate, 'yyyy-MM-dd'));
    }
    formData.append('interests', interests); // Comma-separated string

    const res = await completeOnboarding(formData);
    if (res?.message) {
      await user?.reload(); // Reload Clerk user data to get updated metadata
      // Clear localStorage after successful submission
      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboardingName');
        localStorage.removeItem('onboardingEmail');
        localStorage.removeItem('onboardingYearOfStudy');
        localStorage.removeItem('onboardingBirthDate');
        localStorage.removeItem('onboardingInterests');
        localStorage.removeItem('onboardingStep');
      }
      router.push('/'); // Redirect to dashboard or home
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
    if (step === 2 && !birthDate) {
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
  
  // The middleware should handle redirecting if onboarding is already complete.
  // We can add an additional check here if needed, but it might be redundant.
  // if (user && user.publicMetadata?.onboardingComplete === true) {
  //   router.replace('/');
  //   return <p>Loading...</p>; // Or a loading spinner
  // }


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
                  // Consider making this readOnly if prefilled from Clerk and verified
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
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                  <PopoverContent 
                    className="w-[calc(100vw-2rem)] sm:w-full max-w-lg p-0 rounded-lg shadow-xl border border-border"
                    align="center" 
                    sideOffset={8}
                    aria-labelledby="calendar-dialog-title"
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="bg-primary text-primary-foreground p-2.5 rounded-t-lg">
                      <div className="text-[0.7rem] uppercase tracking-wider mb-0.5">
                        Select Date
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold" id="calendar-dialog-title">
                          {birthDate ? format(birthDate, "EEE, MMM d") : "Pick a date"}
                        </span>
                        <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                    </div>

                    <div className="p-1.5 bg-background">
                      <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={(date) => {
                          setBirthDate(date);
                          setIsCalendarOpen(false);
                          setFormError(null); // Clear error when a date is selected
                        }}
                        defaultMonth={birthDate || SIXTEEN_YEARS_AGO}
                        month={undefined} // Use defaultMonth or selected for controlled month
                        fromDate={MIN_DATE}
                        toDate={MAX_DATE}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        components={{ Caption: CustomCalendarCaption }}
                        className="p-3 sm:p-4"
                        classNames={{
                          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                          month: "space-y-3",
                          caption_label: "text-sm font-medium hidden", // Hidden because CustomCalendarCaption provides it
                          nav: "space-x-1 flex items-center", // Hidden because CustomCalendarCaption provides it
                          nav_button: cn(
                            buttonVariants({ variant: "outline" }),
                            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-0 focus:ring-0 hidden" // Hidden because CustomCalendarCaption provides it
                          ),
                          nav_button_previous: "absolute left-1 hidden",
                          nav_button_next: "absolute right-1 hidden",
                          table: "w-full border-collapse space-y-1",
                          head_row: "flex mb-1.5",
                          head_cell:
                            "text-muted-foreground rounded-md w-9 sm:w-10 font-normal text-[0.8rem] sm:text-sm",
                          row: "flex w-full mt-1.5",
                          cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                          day: cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-10 w-10 sm:h-12 sm:w-12 text-base sm:text-lg p-0 font-normal aria-selected:opacity-100 border-0 focus:ring-0 focus:bg-accent focus:text-accent-foreground"
                          ),
                          day_selected:
                            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                          day_today: "bg-accent text-accent-foreground",
                          day_outside: "text-muted-foreground opacity-50",
                          day_disabled: "text-muted-foreground opacity-50",
                          day_range_middle:
                            "aria-selected:bg-accent aria-selected:text-accent-foreground",
                          day_hidden: "invisible",
                        }}
                      />
                    </div>

                    <div className="flex justify-end gap-2 p-2 border-t border-border rounded-b-lg">
                      <Button variant="ghost" onClick={() => setIsCalendarOpen(false)} className="h-8 text-sm">Cancel</Button>
                      <Button onClick={() => setIsCalendarOpen(false)} className="h-8 text-sm">OK</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Step 3: Interests */}
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