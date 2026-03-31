"use client";

import styles from "@/components/ai/AIQuestionnaire.module.css";
import { InteractiveStu } from "@/components/stu/InteractiveStu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import QuestionnaireManager, {
  type QuestionnaireTemplate,
  type QuestionnaireQuestion,
  type QuestionnaireResponse,
} from "@/lib/ai/QuestionnaireManager";
import {
  buildDraftFile,
  legacyAnswersToDraft,
  mergeDraftWithServerResponses,
  parseQuestionnaireDraft,
} from "@/lib/ai/questionnaireDraftStorage";
import { trackQuestionnaireEvent } from "@/lib/ai/questionnaireClientAnalytics";
import { useAuth, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";

interface AIQuestionnaireProps {
  onComplete?: (patterns: any) => void;
  className?: string;
}

const qDevLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") console.log(...args);
};

const categoryIcons = {
  onboarding: Sparkles,
  preferences: Brain,
  schedule: Clock,
  habits: CheckCircle,
  stress: Heart,
};

function questionnaireCategoryClass(category: string): string {
  switch (category) {
    case "onboarding":
      return styles.catOnboarding;
    case "preferences":
      return styles.catPreferences;
    case "schedule":
      return styles.catSchedule;
    case "habits":
      return styles.catHabits;
    case "stress":
      return styles.catStress;
    default:
      return styles.catDefault;
  }
}

export const AIQuestionnaire: React.FC<AIQuestionnaireProps> = ({
  onComplete,
  className = "",
}) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const getSupabaseJwt = useCallback(
    () => getToken({ template: "supabase-integration" }),
    [getToken],
  );
  const [questionnaireManager] = useState(
    () => new QuestionnaireManager(getSupabaseJwt),
  );

  // State management
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] =
    useState<QuestionnaireTemplate | null>(null);
  const [currentResponse, setCurrentResponse] =
    useState<QuestionnaireResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [stuMessage, setStuMessage] = useState("");
  const [stuState, setStuState] = useState<
    "idle" | "talking" | "excited" | "thinking" | "celebrating"
  >("idle");

  // Debounce timer
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Detect native time input support (iOS Safari lacks reliable support and may reset values)
  const supportsNativeTimeInput = React.useMemo(() => {
    if (typeof document === "undefined") return true;
    const input = document.createElement("input");
    input.setAttribute("type", "time");
    // If unsupported, browser falls back to text
    return input.type === "time";
  }, []);

  // Initialize questionnaire
  useEffect(() => {
    if (user?.id) {
      loadQuestionnaires();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !currentTemplate?.questions?.length) return;
    trackQuestionnaireEvent({
      templateId: currentTemplate.id,
      eventType: "step_view",
      payload: {
        questionIndex: currentQuestionIndex,
        questionId: currentTemplate.questions[currentQuestionIndex]?.id,
      },
    });
  }, [user?.id, currentTemplate, currentQuestionIndex]);

  // Local storage key per user to prevent transient resets between renders/navigation
  const localStorageKey = user?.id
    ? `questionnaire_answers_${user.id}`
    : undefined;

  const loadQuestionnaires = async () => {
    try {
      setLoading(true);
      qDevLog("Loading questionnaires for user:", user?.id);

      // Get next recommended questionnaire
      const nextTemplate =
        await questionnaireManager.getNextRecommendedQuestionnaire(user!.id);
      qDevLog("Next template found:", nextTemplate);

      if (nextTemplate) {
        setCurrentTemplate(nextTemplate);

        // Check if user has existing response
        const existingResponse = await questionnaireManager.getUserResponse(
          user!.id,
          nextTemplate.id,
        );
        qDevLog("Existing response:", existingResponse);

        if (existingResponse) {
          setCurrentResponse(existingResponse);
          const rawDraft =
            localStorageKey && typeof window !== "undefined"
              ? localStorage.getItem(localStorageKey)
              : null;
          const merged = mergeDraftWithServerResponses(
            existingResponse.responses || {},
            legacyAnswersToDraft(nextTemplate.id, rawDraft) ??
              parseQuestionnaireDraft(rawDraft),
            nextTemplate.id,
          );
          setAnswers(merged);

          // Find current question index based on responses - but don't go backwards
          const answeredQuestions = Object.keys(merged);
          const nextQuestionIndex = nextTemplate.questions.findIndex(
            (q) => !answeredQuestions.includes(q.id),
          );

          // Only update question index if we're loading fresh or moving forward
          if (
            currentQuestionIndex === 0 ||
            nextQuestionIndex > currentQuestionIndex
          ) {
            setCurrentQuestionIndex(Math.max(0, nextQuestionIndex));
          }
          // If nextQuestionIndex is -1 (all questions answered), stay at current position
          if (
            nextQuestionIndex === -1 &&
            currentQuestionIndex < nextTemplate.questions.length - 1
          ) {
            // Keep current position, don't jump to end
          }
        } else {
          // Start new questionnaire
          qDevLog("Starting new questionnaire...");
          const newResponse = await questionnaireManager.startQuestionnaire(
            user!.id,
            nextTemplate.id,
          );
          qDevLog("New response created:", newResponse);
          setCurrentResponse(newResponse);
          const rawDraft =
            localStorageKey && typeof window !== "undefined"
              ? localStorage.getItem(localStorageKey)
              : null;
          const merged = mergeDraftWithServerResponses(
            newResponse?.responses || {},
            legacyAnswersToDraft(nextTemplate.id, rawDraft) ??
              parseQuestionnaireDraft(rawDraft),
            nextTemplate.id,
          );
          setAnswers(merged);
          setCurrentQuestionIndex(0); // Always start at beginning for new questionnaire
        }

        // Set initial Stu message
        setStuMessage(
          `Hi, I’m Stu. I’ll ask a few questions about how you study — starting with “${nextTemplate.title}”.`,
        );
        setStuState("talking");
      } else {
        // Check if user has any completed questionnaires
        const userResponses = await questionnaireManager.getUserResponses(
          user!.id,
        );
        const hasCompletedQuestionnaires = userResponses.some(
          (r) => r.completion_status === "completed",
        );

        if (hasCompletedQuestionnaires) {
          // User has completed all available questionnaires
          setCompleted(true);
          setStuMessage(
            "Wow! You've completed all our questionnaires! I now understand your study patterns much better. Let me analyze this data to give you personalized suggestions!",
          );
          setStuState("celebrating");
        } else {
          // No questionnaires available (system issue)
          setStuMessage(
            "Hmm, I'm having trouble loading questionnaires right now. Let's try refreshing the page!",
          );
          setStuState("thinking");
        }
      }
    } catch (err: any) {
      console.error("Error loading questionnaires:", {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err,
      });
      setStuMessage(
        "Oops! I'm having trouble loading the questionnaire. Let's try again in a moment.",
      );
      setStuState("thinking");
    } finally {
      setLoading(false);
    }
  };

  // Debounced answer handler for continuous inputs like sliders/text
  const handleDebouncedAnswer = React.useCallback(
    (questionId: string, answer: any) => {
      if (!currentTemplate || !user?.id) return;

      const updatedAnswers = { ...answers, [questionId]: answer };
      setAnswers(updatedAnswers);

      // Persist immediately to localStorage to avoid any UI-driven resets
      try {
        if (localStorageKey && currentTemplate) {
          localStorage.setItem(
            localStorageKey,
            JSON.stringify(buildDraftFile(currentTemplate.id, updatedAnswers)),
          );
        }
      } catch {}

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(async () => {
        try {
          await questionnaireManager.updateResponse(
            user.id,
            currentTemplate.id,
            updatedAnswers,
          );
          setStuMessage(getRandomEncouragement());
          setStuState("thinking");
        } catch (err: any) {
          console.error("Error saving debounced answer:", {
            message: err.message,
            details: err.details,
            code: err.code,
            fullError: err,
          });
          setStuMessage("I couldn't save that... let's try moving it again.");
          setStuState("thinking");
        }
      }, 500); // 500ms debounce delay
    },
    [answers, currentTemplate, user?.id, questionnaireManager],
  );

  const handleAnswer = async (
    questionId: string,
    answer: any,
    autoAdvance = true,
  ) => {
    if (!currentTemplate || !user?.id) return;

    try {
      const updatedAnswers = { ...answers, [questionId]: answer };
      setAnswers(updatedAnswers);

      // Persist to local cache immediately
      try {
        if (localStorageKey && currentTemplate) {
          localStorage.setItem(
            localStorageKey,
            JSON.stringify(buildDraftFile(currentTemplate.id, updatedAnswers)),
          );
        }
      } catch {}

      // Update response in database
      await questionnaireManager.updateResponse(
        user.id,
        currentTemplate.id,
        updatedAnswers,
      );

      // Update Stu's reaction
      setStuState("thinking");
      setStuMessage(getRandomEncouragement());

      if (autoAdvance) {
        // Auto-advance to next question after a shorter delay
        setTimeout(() => {
          if (currentQuestionIndex < currentTemplate.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setStuState("excited");
          } else {
            handleQuestionnaireComplete();
          }
        }, 800); // Reduced from 1000ms to 800ms
      }
    } catch (err: any) {
      console.error("Error saving answer:", {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err,
      });
      setStuMessage("I couldn't save that answer. Let's try again!");
      setStuState("thinking");
    }
  };

  const handleQuestionnaireComplete = async () => {
    if (!user?.id) return;

    try {
      setSubmitting(true);
      setStuState("celebrating");
      setStuMessage(
        "Amazing! You've completed this questionnaire. Let me analyze your responses...",
      );

      // Persist final answers and let the server-side completion path run analysis once.
      // (QuestionnaireManager.updateResponse triggers analyze + metadata when 100% complete.)
      try {
        await questionnaireManager.updateResponse(
          user.id,
          currentTemplate!.id,
          answers,
        );
      } catch (firstErr) {
        qDevLog("updateResponse retry after:", firstErr);
        await new Promise((r) => setTimeout(r, 900));
        await questionnaireManager.updateResponse(user.id, currentTemplate!.id, answers);
      }

      const patterns = await questionnaireManager.getUserPatterns(user.id);

      trackQuestionnaireEvent({
        eventType: "patterns_analyzed",
        payload: { ok: true },
      });

      // Check for next questionnaire
      const nextTemplate =
        await questionnaireManager.getNextRecommendedQuestionnaire(user.id);

      if (nextTemplate) {
        // More questionnaires available
        setStuMessage(
          `Great job! I learned a lot about you. Ready for the next questionnaire: "${nextTemplate.title}"?`,
        );

        // Immediately create a response for the next questionnaire so answers persist
        try {
          const newResponse = await questionnaireManager.startQuestionnaire(
            user.id,
            nextTemplate.id,
          );
          setCurrentTemplate(nextTemplate);
          setCurrentResponse(newResponse);
          const rawDraft =
            localStorageKey && typeof window !== "undefined"
              ? localStorage.getItem(localStorageKey)
              : null;
          const mergedNext = mergeDraftWithServerResponses(
            newResponse?.responses || {},
            legacyAnswersToDraft(nextTemplate.id, rawDraft) ??
              parseQuestionnaireDraft(rawDraft),
            nextTemplate.id,
          );
          setAnswers(mergedNext);
          setCurrentQuestionIndex(0);
          setStuState("excited");
        } catch (e) {
          // If creating the response fails, keep the UI message and allow retry via reload
          console.error("Failed to start next questionnaire response", e);
        }
      } else {
        // All questionnaires completed
        setCompleted(true);
        setStuMessage(
          "Fantastic! I now have a complete picture of your study habits. This will help me give you much better suggestions!",
        );

        if (onComplete) {
          onComplete(patterns);
        }
      }
    } catch (err: any) {
      console.error("Error completing questionnaire:", {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err,
      });
      trackQuestionnaireEvent({
        eventType: "patterns_analyze_failed",
        payload: { message: String(err?.message ?? err) },
      });
      setStuMessage(
        "I couldn’t finish analyzing your answers. Your responses are saved — try again in a moment from the questionnaire page.",
      );
      setStuState("thinking");
    } finally {
      setSubmitting(false);
      // Clear any cached answers after completion to avoid stale state later
      try {
        if (localStorageKey) localStorage.removeItem(localStorageKey);
      } catch {}
    }
  };

  const resetQuestionnaires = async () => {
    if (!user?.id) return;

    try {
      qDevLog("Resetting questionnaires for user:", user.id);

      // Delete all user responses to reset questionnaires
      const supabaseClient = (questionnaireManager as any).supabase;
      const { error } = await supabaseClient
        .from("user_questionnaire_responses")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("Error resetting questionnaires:", error);
        return;
      }

      // Reset component state
      setCompleted(false);
      setCurrentTemplate(null);
      setCurrentResponse(null);
      setAnswers({});
      setCurrentQuestionIndex(0);

      // Reload questionnaires
      loadQuestionnaires();
    } catch (err: any) {
      console.error("Error resetting questionnaires:", {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err,
      });
    }
  };

  const getRandomEncouragement = (): string => {
    const encouragements = [
      "Great choice! That tells me a lot about your study style.",
      "Interesting! I'm learning so much about you.",
      "Perfect! This helps me understand your preferences.",
      "Awesome! Your study habits are becoming clearer to me.",
      "Excellent! This will help me give you better suggestions.",
      "Nice! I can see your learning patterns forming.",
      "Wonderful! This insight will be really valuable.",
      "Cool! I'm getting a better picture of your routine.",
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  };

  const renderQuestion = (question: QuestionnaireQuestion) => {
    const currentAnswer = answers[question.id];

    switch (question.type) {
      case "multiple_choice":
        return (
          <RadioGroup
            value={currentAnswer}
            onValueChange={(value) => handleAnswer(question.id, value)}
            className="space-y-3"
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label
                  htmlFor={`${question.id}-${index}`}
                  className="flex-1 cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "multiple_select":
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${index}`}
                  checked={
                    Array.isArray(currentAnswer) &&
                    currentAnswer.includes(option)
                  }
                  onCheckedChange={(checked) => {
                    const currentArray = Array.isArray(currentAnswer)
                      ? currentAnswer
                      : [];
                    if (checked) {
                      handleAnswer(question.id, [...currentArray, option]);
                    } else {
                      handleAnswer(
                        question.id,
                        currentArray.filter((item: string) => item !== option),
                      );
                    }
                  }}
                />
                <Label
                  htmlFor={`${question.id}-${index}`}
                  className="flex-1 cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case "slider":
        return (
          <div className="space-y-4">
            <Slider
              value={[currentAnswer || question.min || 0]}
              onValueChange={([value]) => {
                // Update local state immediately for visual feedback
                setAnswers((prev) => ({ ...prev, [question.id]: value }));
                // Debounce the database update and stu message
                handleDebouncedAnswer(question.id, value);
              }}
              min={question.min || 0}
              max={question.max || 100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {question.min} {question.unit}
              </span>
              <span className="font-medium">
                {currentAnswer || question.min || 0} {question.unit}
              </span>
              <span>
                {question.max} {question.unit}
              </span>
            </div>
          </div>
        );

      case "time":
        if (supportsNativeTimeInput) {
          return (
            <Input
              type="time"
              value={currentAnswer || ""}
              onChange={(e) =>
                handleDebouncedAnswer(question.id, e.target.value)
              }
              className="w-full"
            />
          );
        }
        // Fallback: stable hour/minute selectors to avoid input resets on unsupported browsers
        const raw = typeof currentAnswer === "string" ? currentAnswer : "";
        const [hStr, mStr] =
          raw && raw.includes(":") ? raw.split(":") : ["", ""];
        const hour = hStr !== "" ? Number.parseInt(hStr, 10) : undefined;
        const minute = mStr !== "" ? Number.parseInt(mStr, 10) : undefined;

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // step 5m for usability

        const updateTime = (
          newHour: number | undefined,
          newMinute: number | undefined,
        ) => {
          if (newHour === undefined || newMinute === undefined) {
            handleDebouncedAnswer(question.id, "");
            return;
          }
          const hh = String(newHour).padStart(2, "0");
          const mm = String(newMinute).padStart(2, "0");
          handleDebouncedAnswer(question.id, `${hh}:${mm}`);
        };

        return (
          <div className="flex gap-3">
            <div className="flex-1 min-w-[8rem]">
              <Label htmlFor={`${question.id}-hour`} className="mb-2 block">
                Hour
              </Label>
              <select
                id={`${question.id}-hour`}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={hour ?? ""}
                onChange={(e) =>
                  updateTime(
                    e.target.value === ""
                      ? undefined
                      : Number.parseInt(e.target.value, 10),
                    minute,
                  )
                }
              >
                <option value="">--</option>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[8rem]">
              <Label htmlFor={`${question.id}-minute`} className="mb-2 block">
                Minute
              </Label>
              <select
                id={`${question.id}-minute`}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={minute ?? ""}
                onChange={(e) =>
                  updateTime(
                    hour,
                    e.target.value === ""
                      ? undefined
                      : Number.parseInt(e.target.value, 10),
                  )
                }
              >
                <option value="">--</option>
                {minutes.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case "text":
        return (
          <Textarea
            value={currentAnswer || ""}
            onChange={(e) => handleDebouncedAnswer(question.id, e.target.value)}
            placeholder="Type your answer here..."
            className="w-full min-h-[100px]"
          />
        );

      case "rating":
        return (
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                variant={currentAnswer === rating ? "default" : "outline"}
                size="sm"
                onClick={() => handleAnswer(question.id, rating)}
                className="w-12 h-12"
              >
                {rating}
              </Button>
            ))}
          </div>
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  if (loading) {
    return (
      <div
        className={`${styles.shell} ${className}`}
        data-testid="ai-questionnaire-root"
        data-state="loading"
      >
        <div className={styles.loadingWrap}>
          <div className={styles.loadingInner}>
            <InteractiveStu size="lg" />
            <p className={styles.loadingText}>
              Loading your personalized questionnaire...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div
        className={`${styles.shell} max-w-2xl ${className}`}
        data-testid="ai-questionnaire-root"
        data-state="completed"
      >
        <div className={`${styles.panel} ${styles.panelPadLg}`}>
          <div className="text-center space-y-6">
            <InteractiveStu size="lg" />
            <div className="space-y-4">
              <h2 className={styles.completeTitle}>Questionnaires complete</h2>
              <p className={styles.completeBody}>
                I&apos;ve learned a lot about your study habits and preferences.
                This will help me give you better personalized suggestions.
              </p>
              {stuMessage && (
                <div className={styles.stuHighlight}>{stuMessage}</div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  className={`${styles.primaryBtn} w-full sm:w-auto`}
                  onClick={() => router.push("/dashboard")}
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </button>
              </div>

              {process.env.NODE_ENV === "development" && (
                <div className="pt-4 border-t border-white/10">
                  <button
                    type="button"
                    className={`${styles.outlineBtn} ${styles.outlineBtnSm}`}
                    onClick={resetQuestionnaires}
                  >
                    Reset questionnaires (dev only)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTemplate) {
    return (
      <div
        className={`${styles.shell} max-w-2xl ${className}`}
        data-testid="ai-questionnaire-root"
        data-state="idle"
      >
        <div className={`${styles.panel} ${styles.panelPadLg}`}>
          <div className="text-center space-y-6">
            <InteractiveStu size="lg" />
            <div className="space-y-4">
              <h2 className={styles.title}>Ready to start your assessment?</h2>
              <p className={styles.completeBody}>
                I&apos;ll learn your study patterns and preferences so
                recommendations fit you.
              </p>
              <button
                type="button"
                className={`${styles.primaryBtn} w-full sm:w-auto`}
                onClick={loadQuestionnaires}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" aria-hidden />
                    Start assessment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = currentTemplate.questions[currentQuestionIndex];
  const progress =
    ((currentQuestionIndex + 1) / currentTemplate.questions.length) * 100;
  const IconComponent =
    categoryIcons[currentTemplate.category as keyof typeof categoryIcons] ??
    Sparkles;

  return (
    <div
      className={`${styles.shell} ${className}`}
      data-testid="ai-questionnaire-root"
      data-state="in-progress"
    >
      <div className={`${styles.panel} ${styles.panelPad}`}>
        <div className={styles.headerRow}>
          <div
            className={`${styles.categoryIcon} ${questionnaireCategoryClass(currentTemplate.category)}`}
          >
            <IconComponent className="h-6 w-6" aria-hidden />
          </div>
          <div className={styles.titleBlock}>
            <div className={styles.title}>
              <span>{currentTemplate.title}</span>
              <span className={styles.badge}>
                {currentQuestionIndex + 1} of {currentTemplate.questions.length}
              </span>
            </div>
            <p className={styles.description}>{currentTemplate.description}</p>
          </div>
        </div>
        <div className={styles.progressTrack} aria-hidden>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {stuMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.stuMessage}
        >
          <InteractiveStu size="sm" />
          <div className="flex-1">
            <p>{stuMessage}</p>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          data-testid="ai-questionnaire-question"
        >
          <div
            className={`${styles.panel} ${styles.panelPad} ${styles.focusWithin}`}
          >
            <h2 className={styles.questionTitle}>
              {currentQuestion.question}
              {currentQuestion.required && (
                <span className="ml-1 text-red-400" aria-hidden>
                  *
                </span>
              )}
            </h2>
            <div className={styles.questionBody}>
              {renderQuestion(currentQuestion)}

              <div className={styles.navRow}>
                <button
                  type="button"
                  className={styles.outlineBtn}
                  onClick={() =>
                    setCurrentQuestionIndex(
                      Math.max(0, currentQuestionIndex - 1),
                    )
                  }
                  disabled={currentQuestionIndex === 0 || submitting}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Previous
                </button>

                <span className={styles.navHint}>
                  Question {currentQuestionIndex + 1} of{" "}
                  {currentTemplate.questions.length}
                </span>

                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => {
                    if (
                      currentQuestionIndex <
                      currentTemplate.questions.length - 1
                    ) {
                      setCurrentQuestionIndex(currentQuestionIndex + 1);
                    } else {
                      handleQuestionnaireComplete();
                    }
                  }}
                  disabled={
                    submitting ||
                    (currentQuestion.required && !answers[currentQuestion.id])
                  }
                >
                  {currentQuestionIndex === currentTemplate.questions.length - 1
                    ? submitting
                      ? "Analyzing..."
                      : "Complete"
                    : "Next"}
                  {currentQuestionIndex <
                    currentTemplate.questions.length - 1 && (
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AIQuestionnaire;
