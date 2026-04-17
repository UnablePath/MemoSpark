"use client";

import { completeOnboarding } from "@/app/onboarding/_actions";
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";
import { useConversionTracking } from "@/lib/analytics/conversionTracking";
import { useOnboardingAnalytics } from "@/lib/analytics/onboardingAnalytics";
import { useUser } from "@clerk/nextjs";
import { clsx } from "clsx";
import { format, parseISO } from "date-fns";
import {
  ArrowRight,
  Atom,
  BookOpen,
  BookText,
  Brain,
  Briefcase,
  Calendar as CalendarIcon,
  Code,
  Dumbbell,
  Film,
  Globe,
  GraduationCap,
  HelpCircle,
  Mail,
  MessageSquare,
  Music as MusicIcon,
  Palette,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users as UsersIcon,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";

import styles from "@/components/onboarding/OnboardingFlow.module.css";
import {
  ONBOARDING_DRAFT_STORAGE_VERSION,
  type OnboardingDraftV2,
  clearOnboardingDraftStorage,
  readOnboardingDraft,
  writeOnboardingDraft,
} from "@/lib/onboarding/onboardingDraftStorage";

const MAX_DATE = new Date();
const MIN_DATE = new Date(
  MAX_DATE.getFullYear() - 100,
  MAX_DATE.getMonth(),
  MAX_DATE.getDate(),
);

const MIN_DATE_STR = format(MIN_DATE, "yyyy-MM-dd");
const MAX_DATE_STR = format(MAX_DATE, "yyyy-MM-dd");

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
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Engineering",
  "English Literature",
  "History",
  "Psychology",
  "Philosophy",
  "Economics",
  "Business Administration",
  "Marketing",
  "Art",
  "Music",
  "Foreign Languages",
  "Sociology",
  "Political Science",
  "Law",
  "Medicine",
];

const learningStyles = [
  {
    value: "Visual",
    label: "Visual",
    description: "Learn best through charts, diagrams, and images",
  },
  {
    value: "Auditory",
    label: "Auditory",
    description: "Learn best through listening and verbal instruction",
  },
  {
    value: "Kinesthetic",
    label: "Kinesthetic",
    description: "Learn best through hands-on activities and movement",
  },
  {
    value: "Reading/Writing",
    label: "Reading/Writing",
    description: "Learn best through written materials and note-taking",
  },
  {
    value: "Unspecified",
    label: "I'm not sure",
    description: "Let MemoSpark help you discover your learning style",
  },
];

const YEAR_OPTIONS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate",
  "Postgraduate",
  "Other",
] as const;

const EXPLANATION_OPTIONS = [
  { value: "simple", label: "Simple & Direct" },
  { value: "balanced", label: "Balanced Detail" },
  { value: "detailed", label: "Detailed & Thorough" },
] as const;

const INTERACTION_OPTIONS = [
  { value: "minimal", label: "Minimal (only when asked)" },
  { value: "moderate", label: "Moderate (regular suggestions)" },
  { value: "frequent", label: "Frequent (more proactive)" },
] as const;

function initialBirthDateFromDraft(draft: OnboardingDraftV2): string {
  const storedDate = draft.birthDate;
  if (!storedDate) return "";
  try {
    if (
      typeof storedDate === "string" &&
      storedDate.match(/^\d{4}-\d{2}-\d{2}$/)
    ) {
      return storedDate;
    }
    return format(parseISO(storedDate as string), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function OnboardingWizard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const analytics = useOnboardingAnalytics();
  const conversion = useConversionTracking();
  const onboardingStartedLogged = useRef(false);
  const initialDraftRef = useRef<OnboardingDraftV2 | null>(null);
  if (initialDraftRef.current === null) {
    initialDraftRef.current = readOnboardingDraft();
  }
  const initial = initialDraftRef.current;

  const [name, setName] = useState(() => initial.name);
  const [email, setEmail] = useState(() => initial.email);
  const [yearOfStudy, setYearOfStudy] = useState<string>(
    () => initial.yearOfStudy,
  );
  const [birthDateString, setBirthDateString] = useState<string>(() =>
    initialBirthDateFromDraft(initial),
  );
  const [interests, setInterests] = useState<string[]>(() => initial.interests);
  const [learningStyle, setLearningStyle] = useState<string>(
    () => initial.learningStyle,
  );
  const [subjects, setSubjects] = useState<string[]>(() => initial.subjects);
  const [aiPreferences, setAiPreferences] = useState(() => ({
    ...initial.aiPreferences,
  }));
  const [step, setStep] = useState(() => initial.step);
  const totalSteps = 5;
  const [formError, setFormError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const draft: OnboardingDraftV2 = {
      version: ONBOARDING_DRAFT_STORAGE_VERSION,
      name,
      email,
      yearOfStudy,
      birthDate: birthDateString || null,
      interests,
      learningStyle,
      subjects,
      aiPreferences,
      step,
    };
    writeOnboardingDraft(draft);
  }, [
    name,
    email,
    yearOfStudy,
    birthDateString,
    interests,
    learningStyle,
    subjects,
    aiPreferences,
    step,
  ]);

  useEffect(() => {
    if (!isLoaded || !user?.id || onboardingStartedLogged.current) return;
    onboardingStartedLogged.current = true;
    conversion.trackOnboardingStarted(user.id);
  }, [isLoaded, user?.id, conversion]);

  useEffect(() => {
    if (isLoaded && user?.id) {
      const stepNames = [
        "Profile",
        "Details",
        "Learning",
        "Subjects",
        "Interests",
      ];
      const currentStepName = stepNames[step - 1];
      analytics.trackStepEntered(step, currentStepName, user.id);
    }
  }, [step, isLoaded, user?.id, analytics]);

  useEffect(() => {
    if (user) {
      if (!name && user.fullName) setName(user.fullName);
      if (!email && user.primaryEmailAddress?.emailAddress)
        setEmail(user.primaryEmailAddress.emailAddress);
    }
  }, [user, name, email]);

  const handleFinalSubmit = async () => {
    setFormError(null);
    setSubmissionError("");
    setFieldErrors({});
    setIsSubmitting(true);

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
      setFormError(
        "Please ensure all required fields on previous steps are completed.",
      );
      if (!name || !email) setStep(1);
      else if (!birthDateString) setStep(2);
      setIsSubmitting(false);
      return;
    }

    try {
      const selectedDate = parseISO(birthDateString);
      if (selectedDate > MAX_DATE || selectedDate < MIN_DATE) {
        setFormError("Please enter a valid date of birth.");
        setStep(2);
        setIsSubmitting(false);
        return;
      }
    } catch {
      setFormError("Invalid date format. Please select a valid date.");
      setStep(2);
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("yearOfStudy", yearOfStudy);
    formData.append("birthDate", birthDateString);
    formData.append("interests", interests.join(","));
    formData.append("learningStyle", learningStyle);
    formData.append("subjects", subjects.join(","));
    formData.append("aiPreferences", JSON.stringify(aiPreferences));

    try {
      const res = await completeOnboarding(formData);

      if (res?.success && res?.message) {
        await user?.reload();

        if (typeof window !== "undefined") {
          clearOnboardingDraftStorage();
        }

        analytics.trackOnboardingCompleted(user?.id || "", {
          name,
          email,
          yearOfStudy,
          birthDate: birthDateString,
          interests,
          learningStyle,
          subjects,
          aiPreferences,
        });
        if (user?.id) {
          conversion.trackOnboardingCompleted(user.id, {
            yearOfStudy,
            learningStyle,
            subjectsCount: subjects.length,
            interestsCount: interests.length,
          });
        }

        router.push("/questionnaire?from=onboarding");
      } else if (res?.error) {
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
          const fieldToStepMap: Record<string, number> = {
            name: 1,
            email: 1,
            yearOfStudy: 2,
            birthDate: 2,
            interests: 3,
            learningStyle: 3,
            subjects: 4,
            aiPreferences: 5,
          };
          const errorFields = Object.keys(res.fieldErrors);
          if (errorFields.length > 0) {
            const firstErrorStep = Math.min(
              ...errorFields.map((field) => fieldToStepMap[field] || step),
            );
            if (firstErrorStep !== step) {
              setStep(firstErrorStep);
            }
          }
        }
        setSubmissionError(res.error);
      } else {
        setSubmissionError("An unexpected error occurred. Please try again.");
      }
    } catch {
      setSubmissionError(
        "A network error occurred. Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    setFormError(null);

    const stepNames = [
      "Profile",
      "Details",
      "Learning",
      "Subjects",
      "Interests",
    ];
    const currentStepName = stepNames[step - 1];

    if (step === 1 && (!name || !email)) {
      setFormError("Please fill in your name and email to continue.");
      analytics.trackValidationError(
        step,
        currentStepName,
        {
          name: name ? [] : ["Name is required"],
          email: email ? [] : ["Email is required"],
        },
        user?.id,
      );
      return;
    }
    if (step === 2 && !birthDateString) {
      setFormError("Please select your date of birth to continue.");
      analytics.trackValidationError(
        step,
        currentStepName,
        { birthDate: ["Birth date is required"] },
        user?.id,
      );
      return;
    }
    if (step === 4 && subjects.length === 0) {
      setFormError("Please select at least one subject to continue.");
      analytics.trackValidationError(
        step,
        currentStepName,
        { subjects: ["At least one subject is required"] },
        user?.id,
      );
      return;
    }

    const stepData = {
      name: step === 1 ? name : undefined,
      email: step === 1 ? email : undefined,
      yearOfStudy: step === 2 ? yearOfStudy : undefined,
      birthDate: step === 2 ? birthDateString : undefined,
      learningStyle: step === 3 ? learningStyle : undefined,
      subjects: step === 4 ? subjects : undefined,
      interests: step === 5 ? interests : undefined,
      aiPreferences: step === 5 ? aiPreferences : undefined,
    };

    analytics.trackStepCompleted(step, currentStepName, user?.id, stepData);

    if (step < totalSteps) {
      const nextStep = step + 1;
      const nextStepName = stepNames[nextStep - 1];
      setStep(nextStep);
      analytics.trackStepEntered(nextStep, nextStepName, user?.id);
    } else {
      void handleFinalSubmit();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleInterestToggle = (interestId: string) => {
    setInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((i) => i !== interestId)
        : [...prev, interestId],
    );
  };

  const handleSubjectToggle = (subject: string) => {
    setSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject],
    );
  };

  const renderFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]?.length) {
      return (
        <ul className={styles.fieldErrorList} id={`${fieldName}-error`}>
          {fieldErrors[fieldName].map((error) => (
            <li key={error} className={styles.fieldErrorText}>
              {error}
            </li>
          ))}
        </ul>
      );
    }
    return null;
  };

  if (!isLoaded) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingInner}>
          <MemoSparkLogoSvg height={60} />
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  const pct = Math.round((step / totalSteps) * 100);

  return (
    <div className={styles.shell} data-testid="onboarding-wizard">
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      <article id="main-content" className={styles.card}>
        <header className={styles.cardHeader}>
          <div
            className={styles.labelRow}
            style={{ justifyContent: "center", marginBottom: "0.5rem" }}
          >
            <span role="img" aria-label="MemoSpark Logo">
              <MemoSparkLogoSvg height={60} />
            </span>
          </div>
          <h1 className={styles.cardTitle}>Welcome to MemoSpark!</h1>
          <p className={styles.cardDescription}>
            Let&apos;s personalize your learning experience in just a few steps.
          </p>

          <div className={styles.progressWrap}>
            <div className={styles.progressRow}>
              <span>
                Step {step} of {totalSteps}
              </span>
              <span>{pct}% Complete</span>
            </div>
            <div className={styles.progressBar} role="presentation">
              <div
                className={styles.progressFill}
                style={{ width: `${pct}%` }}
              />
            </div>
            <ol
              className={styles.stepRow}
              aria-label={`Onboarding progress: step ${step} of ${totalSteps}`}
            >
              {[...Array(totalSteps)].map((_, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < step;
                const isCurrent = stepNumber === step;
                const isOptional = stepNumber === 3 || stepNumber === 5;
                return (
                  <li key={stepNumber} className={styles.stepCol}>
                    <div
                      className={clsx(
                        styles.stepDot,
                        isCompleted && styles.stepDotDone,
                        isCurrent && styles.stepDotCurrent,
                      )}
                    >
                      {isCompleted ? "✓" : stepNumber}
                    </div>
                    <div
                      className={clsx(
                        styles.stepName,
                        isCurrent && styles.stepNameCurrent,
                      )}
                    >
                      {stepNumber === 1 && "Profile"}
                      {stepNumber === 2 && "Details"}
                      {stepNumber === 3 && "Learning"}
                      {stepNumber === 4 && "Subjects"}
                      {stepNumber === 5 && "Interests"}
                    </div>
                    {isOptional ? (
                      <span className={styles.optionalTag}>Optional</span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        </header>

        <div className={styles.cardBody}>
          {formError ? (
            <p role="alert" className={styles.errorBanner} tabIndex={0}>
              {formError}
            </p>
          ) : null}
          {submissionError ? (
            <p role="alert" className={styles.errorBanner} tabIndex={0}>
              Error: {submissionError}
            </p>
          ) : null}

          {step === 1 && (
            <div className={styles.stackGap}>
              <div className={styles.fieldBlock}>
                <label htmlFor="name" className={styles.labelRow}>
                  <User
                    size={16}
                    className={styles.iconAccent}
                    aria-hidden="true"
                  />
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g., Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={clsx(
                    styles.input,
                    fieldErrors.name && styles.inputInvalid,
                  )}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.name?.length)}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                />
                {renderFieldError("name")}
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor="email" className={styles.labelRow}>
                  <Mail
                    size={16}
                    className={styles.iconAccent}
                    aria-hidden="true"
                  />
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g., alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={clsx(
                    styles.input,
                    fieldErrors.email && styles.inputInvalid,
                  )}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.email?.length)}
                  aria-describedby={
                    fieldErrors.email ? "email-error" : undefined
                  }
                />
                {renderFieldError("email")}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.stackGap}>
              <div className={styles.fieldBlock}>
                <label htmlFor="year" className={styles.labelRow}>
                  <GraduationCap
                    size={16}
                    className={styles.iconAccent}
                    aria-hidden="true"
                  />
                  Year of Study
                </label>
                <select
                  id="year"
                  name="yearOfStudy"
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className={clsx(
                    styles.select,
                    fieldErrors.yearOfStudy && styles.selectInvalid,
                  )}
                  aria-label="Select your year of study"
                  aria-invalid={Boolean(fieldErrors.yearOfStudy?.length)}
                  aria-describedby={
                    fieldErrors.yearOfStudy ? "yearOfStudy-error" : undefined
                  }
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                {renderFieldError("yearOfStudy")}
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor="birthdate" className={styles.labelRow}>
                  <CalendarIcon
                    size={16}
                    className={styles.iconAccent}
                    aria-hidden="true"
                  />
                  Date of Birth
                </label>
                <input
                  id="birthdate"
                  name="birthDate"
                  type="date"
                  value={birthDateString}
                  onChange={(e) => {
                    setBirthDateString(e.target.value);
                    setFormError(null);
                  }}
                  className={clsx(
                    styles.input,
                    fieldErrors.birthDate && styles.inputInvalid,
                  )}
                  min={MIN_DATE_STR}
                  max={MAX_DATE_STR}
                  aria-label="Pick your date of birth"
                  aria-invalid={Boolean(fieldErrors.birthDate?.length)}
                  aria-describedby={
                    fieldErrors.birthDate ? "birthDate-error" : undefined
                  }
                  required
                />
                {renderFieldError("birthDate")}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.stackGap}>
              <div className={styles.fieldBlock}>
                <div className={styles.labelRow}>
                  <Brain
                    size={16}
                    className={styles.iconAccent}
                    aria-hidden="true"
                  />
                  <span>How do you learn best?</span>
                  <span className={styles.optionalPill}>Optional</span>
                </div>
                <p className={styles.helper}>
                  Understanding your learning style helps us personalize your
                  study experience. You can skip this and set it later.
                </p>
                <fieldset
                  className={clsx(styles.learningList, styles.fieldsetReset)}
                >
                  <legend className={styles.legendHidden}>
                    Learning style options
                  </legend>
                  {learningStyles.map((style) => (
                    <button
                      key={style.value}
                      type="button"
                      className={clsx(
                        styles.learningOption,
                        learningStyle === style.value &&
                          styles.learningOptionSelected,
                      )}
                      onClick={() => setLearningStyle(style.value)}
                      aria-pressed={learningStyle === style.value}
                    >
                      <span className={styles.learningTitle}>
                        {style.label}
                      </span>
                      <span className={styles.learningDesc}>
                        {style.description}
                      </span>
                    </button>
                  ))}
                </fieldset>
                {renderFieldError("learningStyle")}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className={styles.stackGap}>
              <div className={styles.fieldBlock}>
                <div className={styles.labelRow}>
                  <BookText
                    size={16}
                    className={styles.iconAccent}
                    aria-hidden="true"
                  />
                  <span>What subjects are you studying?</span>
                </div>
                <p className={styles.helper}>
                  Select the subjects you&apos;re currently enrolled in or
                  interested in studying.
                </p>
                <div className={styles.chipScroll}>
                  <fieldset
                    className={clsx(styles.chipGrid, styles.fieldsetReset)}
                  >
                    <legend className={styles.legendHidden}>Subjects</legend>
                    {availableSubjects.map((subject) => {
                      const isSelected = subjects.includes(subject);
                      return (
                        <button
                          key={subject}
                          type="button"
                          className={clsx(
                            styles.chipBtn,
                            isSelected && styles.chipBtnSelected,
                          )}
                          onClick={() => handleSubjectToggle(subject)}
                          aria-pressed={isSelected}
                        >
                          <span className={styles.chipLabel}>{subject}</span>
                        </button>
                      );
                    })}
                  </fieldset>
                </div>
                <p className={styles.metaLine}>
                  Selected: {subjects.length} subject
                  {subjects.length !== 1 ? "s" : ""}
                </p>
                {renderFieldError("subjects")}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className={styles.stackGap}>
              <div className={styles.fieldBlock}>
                <div className={styles.labelRow}>
                  <Sparkles
                    size={16}
                    className={styles.iconAccent}
                    aria-hidden="true"
                  />
                  <span>Your interests</span>
                  <span className={styles.optionalPillBlue}>Optional</span>
                </div>
                <p className={styles.helper}>
                  Select a few topics you&apos;re passionate about. This helps
                  us connect you with like-minded peers. You can add these later
                  in your profile.
                </p>
                <div className={styles.interestScroll}>
                  <fieldset
                    className={clsx(styles.interestGrid, styles.fieldsetReset)}
                  >
                    <legend className={styles.legendHidden}>Interests</legend>
                    {availableInterests.map((interest) => {
                      const IconComponent = interest.icon;
                      const isSelected = interests.includes(interest.id);
                      return (
                        <button
                          key={interest.id}
                          type="button"
                          className={clsx(
                            styles.interestBtn,
                            isSelected && styles.interestBtnSelected,
                          )}
                          onClick={() => handleInterestToggle(interest.id)}
                          aria-pressed={isSelected}
                          aria-label={interest.name}
                        >
                          <IconComponent
                            size={20}
                            className={styles.interestIcon}
                            aria-hidden="true"
                          />
                          <span className={styles.interestName}>
                            {interest.name}
                          </span>
                        </button>
                      );
                    })}
                  </fieldset>
                </div>
              </div>

              <div className={styles.sectionDivider}>
                <div className={styles.labelRow}>
                  <Zap
                    size={16}
                    className={styles.iconAccent}
                    aria-hidden="true"
                  />
                  <span>AI Assistant Preferences</span>
                </div>

                <div className={styles.rangeBlock}>
                  <label htmlFor="difficulty" className={styles.rangeLabel}>
                    Content Difficulty (1 to 10)
                  </label>
                  <div className={styles.rangeRow}>
                    <span className={styles.rangeHint}>Easy</span>
                    <input
                      id="difficulty"
                      type="range"
                      min={1}
                      max={10}
                      value={aiPreferences.difficulty}
                      onChange={(e) =>
                        setAiPreferences((prev) => ({
                          ...prev,
                          difficulty: Number.parseInt(e.target.value, 10),
                        }))
                      }
                      className={styles.rangeTrack}
                    />
                    <span className={styles.rangeHint}>Hard</span>
                    <span className={styles.rangeValue}>
                      {aiPreferences.difficulty}
                    </span>
                  </div>
                </div>

                <div className={styles.fieldBlock}>
                  <label
                    htmlFor="explanation-style"
                    className={styles.rangeLabel}
                  >
                    Explanation Style
                  </label>
                  <select
                    id="explanation-style"
                    value={aiPreferences.explanationStyle}
                    onChange={(e) =>
                      setAiPreferences((prev) => ({
                        ...prev,
                        explanationStyle: e.target.value,
                      }))
                    }
                    className={styles.select}
                  >
                    {EXPLANATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldBlock}>
                  <label
                    htmlFor="interaction-frequency"
                    className={styles.rangeLabel}
                  >
                    AI Interaction Frequency
                  </label>
                  <select
                    id="interaction-frequency"
                    value={aiPreferences.interactionFrequency}
                    onChange={(e) =>
                      setAiPreferences((prev) => ({
                        ...prev,
                        interactionFrequency: e.target.value,
                      }))
                    }
                    className={styles.select}
                  >
                    {INTERACTION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {renderFieldError("aiPreferences")}
              </div>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          {step > 1 ? (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handlePrevStep}
              aria-label="Go to previous step"
              disabled={isSubmitting}
            >
              Back
            </button>
          ) : (
            <div className={styles.footerSpacer} />
          )}

          <div className={styles.footerActions}>
            {(step === 3 || step === 5) && (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => {
                  const stepNames = [
                    "Profile",
                    "Details",
                    "Learning",
                    "Subjects",
                    "Interests",
                  ];
                  const currentStepName = stepNames[step - 1];
                  analytics.trackStepSkipped(step, currentStepName, user?.id);
                  handleNextStep();
                }}
                aria-label="Skip this step"
                disabled={isSubmitting}
              >
                Skip
              </button>
            )}

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => void handleNextStep()}
              aria-label={
                step < totalSteps ? "Go to next step" : "Complete setup"
              }
              disabled={isSubmitting}
            >
              {isSubmitting && step === totalSteps ? (
                <>
                  <span className={styles.btnSpinner} aria-hidden="true" />
                  Completing...
                </>
              ) : step < totalSteps ? (
                <>
                  {step === 3 || step === 5 ? "Continue" : "Next"}
                  <ArrowRight
                    className={styles.iconInline}
                    size={18}
                    aria-hidden="true"
                  />
                </>
              ) : (
                "Complete Setup"
              )}
            </button>
          </div>
        </footer>
      </article>

      <p className={styles.legal} tabIndex={0}>
        By completing setup, you agree to our{" "}
        <Link href="/terms" className={styles.legalLink}>
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className={styles.legalLink}>
          Privacy Policy
        </Link>
        .
      </p>

      <div aria-live="polite" className={styles.srOnly} id="form-error-message">
        {formError ? <p>{formError}</p> : null}
      </div>
    </div>
  );
}
