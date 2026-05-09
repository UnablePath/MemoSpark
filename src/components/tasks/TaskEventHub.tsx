"use client";

import { useUser } from "@clerk/nextjs";
import { cva } from "class-variance-authority";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  GraduationCap,
  Grid3X3,
  Moon,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useSaveAISuggestionFeedback } from "@/hooks/useSaveAISuggestionFeedback";
import {
  useCreateTask,
  useDeleteTask,
  useFetchTasks,
  useToggleTaskCompletion,
} from "@/hooks/useTaskQueries";
import { useTieredAI } from "@/hooks/useTieredAI";
import { cn } from "@/lib/utils";
import type { AISuggestion } from "@/types/ai";
import type { Task } from "@/types/taskTypes";
import { CalendarViewEnhanced } from "./CalendarViewEnhanced";
import { NotificationCenter } from "./NotificationCenter";
import { TaskForm } from "./TaskForm";
import { TimetableEntryForm } from "./TimetableEntryForm";
import { TimetableView } from "./TimetableView";
import { TodayView } from "./TodayView";

type ViewType = "today" | "calendar" | "timetable";

interface ViewOption {
  id: ViewType;
  label: string;
  icon: React.ElementType;
  shortLabel: string;
}

const viewOptions: ViewOption[] = [
  { id: "today", label: "Today", shortLabel: "Today", icon: Sun },
  { id: "calendar", label: "Calendar", shortLabel: "Cal", icon: CalendarIcon },
  { id: "timetable", label: "Timetable", shortLabel: "Time", icon: Grid3X3 },
];

const viewTabVariants = cva(
  cn(
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium",
    "sm:flex-initial sm:px-3 sm:py-1.5",
    "transition-[color,background-color,transform] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "active:scale-[0.97] touch-manipulation",
  ),
  {
    variants: {
      state: {
        active: "bg-background text-foreground shadow-sm",
        inactive: "text-muted-foreground hover:text-foreground",
      },
    },
  },
);

type FallbackTemplate = Omit<
  AISuggestion,
  "id" | "createdAt" | "acceptanceStatus" | "title"
> & {
  slug: string;
  buildTitle: (firstName: string | undefined) => string;
  timeOfDay?: "morning" | "midday" | "afternoon" | "evening" | "night";
};

const FALLBACK_POOL: FallbackTemplate[] = [
  {
    slug: "morning-focus",
    timeOfDay: "morning",
    type: "task_suggestion",
    buildTitle: (name) =>
      name
        ? `${name}, block a focused hour for your hardest subject`
        : "Block a focused hour for your hardest subject",
    description:
      "Most people focus better in the morning. One solid block beats five half-starts.",
    priority: "high",
    confidence: 0.82,
    reasoning: "Energy tends to be higher earlier in the day.",
    duration: 60,
    metadata: {
      category: "productivity",
      tags: ["morning", "focus"],
      estimatedBenefit: 0.8,
      requiredAction: "immediate",
    },
  },
  {
    slug: "morning-one-task",
    timeOfDay: "morning",
    type: "task_suggestion",
    buildTitle: () => "Pick the one thing that would make today a win",
    description:
      "If you only finished one task today, what would it be? Start there while energy is high.",
    priority: "high",
    confidence: 0.8,
    reasoning: "One clear priority beats five open tabs and zero finishes.",
    duration: 45,
    metadata: {
      category: "productivity",
      tags: ["priority", "morning"],
      estimatedBenefit: 0.85,
      requiredAction: "immediate",
    },
  },
  {
    slug: "midday-reset",
    timeOfDay: "midday",
    type: "break_reminder",
    buildTitle: () => "Step away for a 10-minute reset",
    description:
      "Short breaks help afternoon focus. Stretch, hydrate, look out a window (skip the scroll).",
    priority: "medium",
    confidence: 0.76,
    reasoning: "Short breaks help you stay with the work longer.",
    duration: 10,
    metadata: {
      category: "wellbeing",
      tags: ["break", "midday"],
      estimatedBenefit: 0.65,
      requiredAction: "immediate",
    },
  },
  {
    slug: "afternoon-sprint",
    timeOfDay: "afternoon",
    type: "study_time",
    buildTitle: () => "Run a 25-minute focus sprint on something shallow",
    description:
      "Afternoon dip? Use it for lower-stakes work: flashcards, notes cleanup, or replies.",
    priority: "medium",
    confidence: 0.74,
    reasoning: "Lighter work fits a post-lunch dip better than heavy theory.",
    duration: 25,
    metadata: {
      category: "academic",
      tags: ["pomodoro", "afternoon"],
      estimatedBenefit: 0.7,
      requiredAction: "scheduled",
    },
  },
  {
    slug: "evening-review",
    timeOfDay: "evening",
    type: "study_time",
    buildTitle: () => "Review today in 20 minutes",
    description:
      "A short review while it is still fresh consolidates learning and surfaces gaps before tomorrow.",
    priority: "medium",
    confidence: 0.78,
    reasoning: "A quick recap the same day sticks better than cramming later.",
    duration: 20,
    metadata: {
      category: "academic",
      tags: ["review", "evening"],
      estimatedBenefit: 0.7,
      requiredAction: "scheduled",
    },
  },
  {
    slug: "evening-plan-tomorrow",
    timeOfDay: "evening",
    type: "schedule_optimization",
    buildTitle: () => "Sketch tomorrow in three lines",
    description:
      "Write your top three for tomorrow tonight. You will start with focus instead of friction.",
    priority: "medium",
    confidence: 0.77,
    reasoning: "Writing tomorrow’s top three tonight cuts morning thrash.",
    duration: 10,
    metadata: {
      category: "productivity",
      tags: ["planning", "evening"],
      estimatedBenefit: 0.75,
      requiredAction: "optional",
    },
  },
  {
    slug: "night-wind-down",
    timeOfDay: "night",
    type: "break_reminder",
    buildTitle: () => "Close the laptop when this task ends",
    description:
      "Protecting sleep is the cheapest study hack there is. Call it a day at a clean stopping point.",
    priority: "low",
    confidence: 0.72,
    reasoning: "Sleep beats one more hour of half-alert studying.",
    duration: 0,
    metadata: {
      category: "wellbeing",
      tags: ["sleep", "night"],
      estimatedBenefit: 0.8,
      requiredAction: "optional",
    },
  },
  {
    slug: "deep-work-block",
    type: "schedule_optimization",
    buildTitle: () => "Carve out a 90-minute deep-work block tomorrow",
    description:
      "Pick one slot on your calendar for the task you keep postponing. Protect it like a meeting.",
    priority: "medium",
    confidence: 0.7,
    reasoning: "One protected block usually beats scattered half-hours.",
    duration: 90,
    metadata: {
      category: "productivity",
      tags: ["deep-work"],
      estimatedBenefit: 0.85,
      requiredAction: "optional",
    },
  },
  {
    slug: "subject-sweep",
    type: "subject_focus",
    buildTitle: () => "Do a 15-minute sweep of your weakest subject",
    description:
      "Regular, tiny touches beat rare marathons. Fifteen minutes keeps the subject active in your head.",
    priority: "medium",
    confidence: 0.73,
    reasoning: "Small regular touches beat rare all-nighters for that subject.",
    duration: 15,
    metadata: {
      category: "academic",
      tags: ["weak-subject", "habit"],
      estimatedBenefit: 0.72,
      requiredAction: "scheduled",
    },
  },
  {
    slug: "break-hydrate",
    type: "break_reminder",
    buildTitle: () => "Get water and take 5 before the next task",
    description:
      "Hydration and a brief pause between tasks reduce context-switching fatigue.",
    priority: "low",
    confidence: 0.68,
    reasoning: "A pause between tasks keeps your brain from melting.",
    duration: 5,
    metadata: {
      category: "wellbeing",
      tags: ["hydration", "reset"],
      estimatedBenefit: 0.6,
      requiredAction: "immediate",
    },
  },
  {
    slug: "inbox-zero-mini",
    type: "task_suggestion",
    buildTitle: () => "Clear only the 3 oldest unread emails",
    description:
      "Cap it at three. You get momentum without falling into an inbox rabbit hole.",
    priority: "low",
    confidence: 0.66,
    reasoning: "A tiny cap keeps you from vanishing into email.",
    duration: 10,
    metadata: {
      category: "productivity",
      tags: ["inbox", "quick-win"],
      estimatedBenefit: 0.55,
      requiredAction: "optional",
    },
  },
  {
    slug: "note-consolidate",
    type: "task_suggestion",
    buildTitle: () => "Consolidate this week's notes into one doc",
    description:
      "Turn loose notes into a single searchable outline. Future-you will thank present-you before exams.",
    priority: "medium",
    confidence: 0.71,
    reasoning: "Rewriting notes shows what you actually remember.",
    duration: 30,
    metadata: {
      category: "academic",
      tags: ["notes", "consolidate"],
      estimatedBenefit: 0.78,
      requiredAction: "scheduled",
    },
  },
];

function pickTimeOfDay(
  hour: number,
): "morning" | "midday" | "afternoon" | "evening" | "night" {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

function shuffleWithSeed<T>(arr: readonly T[], seed: number): T[] {
  const copy = arr.slice();
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const rnd = s / 233280;
    const j = Math.floor(rnd * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Produce 2-3 varied fallback suggestions. Seeded so the same load is stable,
 * but each reload gets a different seed and therefore a different mix.
 */
function getFallbackSuggestions(
  userName?: string,
  seed?: number,
): AISuggestion[] {
  const firstName = userName?.split(" ")[0];
  const now = new Date();
  const hour = now.getHours();
  const todayBucket = pickTimeOfDay(hour);
  const mixSeed = seed ?? now.getTime();

  const timed = FALLBACK_POOL.filter((t) => t.timeOfDay === todayBucket);
  const agnostic = FALLBACK_POOL.filter((t) => !t.timeOfDay);

  const timedPick = shuffleWithSeed(timed, mixSeed).slice(
    0,
    Math.min(1, timed.length),
  );
  const agnosticPick = shuffleWithSeed(agnostic, mixSeed + 7).slice(0, 2);

  const combined = [...timedPick, ...agnosticPick].slice(0, 3);

  return combined.map((template, index) => {
    const { slug, buildTitle, timeOfDay: _tod, ...rest } = template;
    return {
      ...rest,
      id: `${slug}-${mixSeed}-${index}`,
      title: buildTitle(firstName),
      createdAt: new Date(now.getTime() - index * 120_000).toISOString(),
      acceptanceStatus: "pending",
    } as AISuggestion;
  });
}

// Maps the internal AI SuggestionType to the database-allowed values for
// ai_suggestion_feedback.suggestion_type (see CHECK constraint).
const ALLOWED_FEEDBACK_TYPES = new Set([
  "task_enhancement",
  "time_optimization",
  "priority_adjustment",
  "subject_focus",
  "schedule",
  "difficulty",
  "break",
] as const);

type AllowedFeedbackType =
  | "task_enhancement"
  | "time_optimization"
  | "priority_adjustment"
  | "subject_focus"
  | "schedule"
  | "difficulty"
  | "break";

function mapSuggestionTypeForFeedback(
  type: AISuggestion["type"],
): AllowedFeedbackType {
  if (ALLOWED_FEEDBACK_TYPES.has(type as AllowedFeedbackType)) {
    return type as AllowedFeedbackType;
  }
  switch (type) {
    case "task_suggestion":
    case "task_optimization":
    case "new_task_recommendation":
    case "task":
    case "resource_recommendation":
    case "study_habit_tip":
    case "goal_setting_prompt":
    case "positive_reinforcement":
    case "mascot_interaction":
    case "premium_analytics":
      return "task_enhancement";
    case "study_time":
    case "schedule_optimization":
      return "schedule";
    case "break_reminder":
      return "break";
    case "difficulty_adjustment":
      return "difficulty";
    default:
      return "task_enhancement";
  }
}

export const TaskEventHub: React.FC = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const reducedMotion = useReducedMotion();

  /** Re-check hourly so the Today tab icon matches time of day (same buckets as TodayView greeting). */
  const [todayHourSnapshot, setTodayHourSnapshot] = useState(() =>
    new Date().getHours(),
  );
  useEffect(() => {
    const sync = () => setTodayHourSnapshot(new Date().getHours());
    const id = window.setInterval(sync, 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const todayTabIcon = useMemo(() => {
    const h = todayHourSnapshot;
    if (h < 5) return Moon;
    if (h < 12) return Sunrise;
    if (h < 17) return Sun;
    if (h < 22) return Sunset;
    return Moon;
  }, [todayHourSnapshot]);

  const [currentView, setCurrentView] = useState<ViewType>("today");
  const [isTaskFormOpen, setTaskFormOpen] = useState(false);
  const [isTimetableFormOpen, setTimetableFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTimetableEntry, setSelectedTimetableEntry] =
    useState<unknown>(null);

  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: refetchTasks,
  } = useFetchTasks();
  const deleteTaskMutation = useDeleteTask();
  const createTaskMutation = useCreateTask();
  const toggleTaskCompletionMutation = useToggleTaskCompletion();
  const feedbackMutation = useSaveAISuggestionFeedback();

  useRealtimeTasks();

  const tieredAI = useTieredAI ? useTieredAI() : null;
  const {
    userTier = "free",
    usage = {
      requestsUsed: 0,
      requestsRemaining: 10,
      dailyLimit: 10,
      featureAvailable: true,
    },
    generateSuggestions = null,
    isFeatureAvailable = () => true,
    isAuthLoaded = false,
    isSignedIn = false,
  } = tieredAI || {};

  // Keep a stable ref to the latest tasks so refreshTierSuggestions does not
  // re-identify on every task invalidation (which was causing an effect loop
  // and unbounded AI usage increments).
  const tasksRef = useRef<Task[]>(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Suggestions start empty and stay empty until the user explicitly taps
  // the "New suggestion" button. This avoids consuming tier-aware AI quota
  // on mount and keeps the Today view quiet unless the user opts in.
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const refreshTierSuggestions = useCallback(async () => {
    if (!isAuthLoaded || !isSignedIn) return;
    if (!isFeatureAvailable("basic_suggestions") || !generateSuggestions)
      return;
    const currentTasks = tasksRef.current;
    setIsLoadingSuggestions(true);
    try {
      const response = await generateSuggestions(
        "basic_suggestions",
        currentTasks,
        {
          currentTime: new Date(),
          upcomingTasks: currentTasks,
          recentActivity: currentTasks.slice(-5),
          userPreferences: {
            enableSuggestions: true,
            suggestionFrequency: "moderate",
            difficultyPreference: "adaptive",
            preferredStudyTimes: [],
            preferredStudyDuration: 90,
            preferredBreakDuration: 15,
            maxDailyStudyHours: 8,
            cloudSyncEnabled: false,
            shareAnonymousData: false,
            personalizedStuInteraction: true,
            enableBreakReminders: true,
            enableStudyReminders: true,
            reminderAdvanceTime: 15,
            adaptiveDifficulty: true,
            focusOnWeakSubjects: true,
            balanceSubjects: true,
          },
          metadata: {},
        },
      );
      // The server returns `data` as either an array of suggestions or an
      // object shaped like `{ suggestions: AISuggestion[], context, ... }`
      // (see `generateBasicSuggestions` → `generatePostgresBackedSuggestions`).
      // Accept both shapes so suggestions actually render.
      const rawData: unknown = response?.data;
      const extracted: AISuggestion[] | null = Array.isArray(rawData)
        ? (rawData as AISuggestion[])
        : rawData &&
            typeof rawData === "object" &&
            Array.isArray((rawData as { suggestions?: unknown }).suggestions)
          ? (rawData as { suggestions: AISuggestion[] }).suggestions
          : null;
      // Normalize server-generated suggestions so they pass the
      // `acceptanceStatus === 'pending'` filter used by `pendingSuggestions`.
      // `generatePostgresBackedSuggestions` → `mapStudySuggestionToApi` doesn't
      // populate `acceptanceStatus` or `createdAt`, which silently filters
      // every suggestion out of the rendered list.
      const nowIso = new Date().toISOString();
      const normalized: AISuggestion[] = (extracted ?? []).map((s, idx) => ({
        ...s,
        id: s.id ?? `ai-suggestion-${Date.now()}-${idx}`,
        acceptanceStatus: s.acceptanceStatus ?? "pending",
        createdAt: s.createdAt ?? nowIso,
      }));
      if (response?.success && normalized.length > 0) {
        setSuggestions(normalized);
      }
    } catch (error) {
      console.warn("[tasks:suggestions] refresh failed", error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [isAuthLoaded, isSignedIn, isFeatureAvailable, generateSuggestions]);

  const openTaskForm = useCallback((task: Task | null = null) => {
    setSelectedTask(task);
    setTaskFormOpen(true);
  }, []);

  const closeTaskForm = useCallback(() => {
    setTaskFormOpen(false);
    setSelectedTask(null);
  }, []);

  const openTimetableForm = useCallback((entry: unknown = null) => {
    setSelectedTimetableEntry(entry);
    setTimetableFormOpen(true);
  }, []);

  const closeTimetableForm = useCallback(() => {
    setTimetableFormOpen(false);
    setSelectedTimetableEntry(null);
  }, []);

  const handleTaskFormSuccess = useCallback(() => {
    closeTaskForm();
    toast({
      title: selectedTask?.id ? "Task updated" : "Task added",
    });
  }, [closeTaskForm, selectedTask?.id, toast]);

  const handleTimetableFormSubmit = useCallback(() => {
    closeTimetableForm();
    toast({
      title: (selectedTimetableEntry as { id?: string } | null)?.id
        ? "Class updated"
        : "Class added",
    });
  }, [closeTimetableForm, selectedTimetableEntry, toast]);

  const handleDelete = useCallback(
    async (taskId: string) => {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
      } catch (error) {
        console.error("[tasks:delete]", error);
      }
    },
    [deleteTaskMutation],
  );

  const handleQuickCreate = useCallback(
    async (title: string) => {
      try {
        await createTaskMutation.mutateAsync({
          title,
          priority: "medium",
          type: "personal",
          completed: false,
          reminder_settings: {
            enabled: false,
            offset_minutes: 15,
            type: "notification",
          },
        });
        toast({ title: "Task added", description: title });
      } catch (error) {
        toast({
          title: "Could not save task",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    },
    [createTaskMutation, toast],
  );

  const handleToggleCompletion = useCallback(
    async (taskId: string) => {
      try {
        await toggleTaskCompletionMutation.mutateAsync(taskId);
      } catch (error) {
        console.error("[tasks:toggle-complete]", error);
      }
    },
    [toggleTaskCompletionMutation],
  );

  const handleAcceptSuggestion = useCallback(
    async (suggestion: AISuggestion) => {
      try {
        await createTaskMutation.mutateAsync({
          title: suggestion.title,
          description: suggestion.description,
          priority: suggestion.priority || "medium",
          type: "academic",
          subject: suggestion.subject,
          due_date: suggestion.suggestedTime
            ? new Date(suggestion.suggestedTime).toISOString()
            : undefined,
          completed: false,
          reminder_settings: {
            enabled: true,
            offset_minutes: 15,
            type: "notification",
          },
        });

        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestion.id
              ? {
                  ...s,
                  acceptanceStatus: "accepted",
                  respondedAt: new Date().toISOString(),
                }
              : s,
          ),
        );

        const mappedType = mapSuggestionTypeForFeedback(suggestion.type);
        feedbackMutation.mutate({
          suggestion_id: suggestion.id,
          suggestion_type: mappedType,
          suggestion_title: suggestion.title,
          feedback: "liked",
          suggestion_context: {
            source: "today-nudge",
            confidence: suggestion.confidence,
          },
        });

        toast({
          title: "Added to your tasks",
          description: `"${suggestion.title}" is now in your Today view.`,
        });
      } catch (error) {
        toast({
          title: "Could not add task",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    },
    [createTaskMutation, feedbackMutation, toast],
  );

  const handleDismissSuggestion = useCallback(
    (suggestion: AISuggestion) => {
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestion.id
            ? {
                ...s,
                acceptanceStatus: "rejected",
                respondedAt: new Date().toISOString(),
              }
            : s,
        ),
      );

      const mappedType = mapSuggestionTypeForFeedback(suggestion.type);
      feedbackMutation.mutate({
        suggestion_id: suggestion.id,
        suggestion_type: mappedType,
        suggestion_title: suggestion.title,
        feedback: "disliked",
        suggestion_context: { source: "today-nudge" },
      });
    },
    [feedbackMutation],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "n") {
        event.preventDefault();
        if (currentView === "timetable") openTimetableForm();
        else openTaskForm();
      }
      if (event.metaKey && event.key === "k") {
        event.preventDefault();
        const currentIndex = viewOptions.findIndex((v) => v.id === currentView);
        const nextIndex = (currentIndex + 1) % viewOptions.length;
        setCurrentView(viewOptions[nextIndex].id);
      }
      if (event.ctrlKey && event.key === "1") {
        event.preventDefault();
        setCurrentView("today");
      }
      if (event.ctrlKey && event.key === "2") {
        event.preventDefault();
        setCurrentView("calendar");
      }
      if (event.ctrlKey && event.key === "3") {
        event.preventDefault();
        setCurrentView("timetable");
      }
    };

    const handleSwitchToTimetable = () => {
      setCurrentView("timetable");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("switchToTimetable", handleSwitchToTimetable);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("switchToTimetable", handleSwitchToTimetable);
    };
  }, [currentView, openTaskForm, openTimetableForm]);

  const handleManualRefreshSuggestions = useCallback(async () => {
    if (!isAuthLoaded || !isSignedIn) {
      setSuggestions(
        getFallbackSuggestions(
          user?.fullName || user?.firstName || undefined,
          Date.now(),
        ),
      );
      return;
    }
    if (
      isFeatureAvailable("basic_suggestions") &&
      usage.requestsRemaining > 0
    ) {
      await refreshTierSuggestions();
    } else {
      // Out of AI quota or feature unavailable: rotate the local pool instead.
      setSuggestions(
        getFallbackSuggestions(
          user?.fullName || user?.firstName || undefined,
          Date.now(),
        ),
      );
      if (!isFeatureAvailable("basic_suggestions")) {
        toast({
          title: "AI suggestions unavailable on your tier",
          description: "Showing a fresh handpicked tip instead.",
        });
      } else {
        toast({
          title: "Daily AI limit reached",
          description:
            "Here's another offline tip. Your AI allowance resets tomorrow.",
        });
      }
    }
  }, [
    isAuthLoaded,
    isSignedIn,
    isFeatureAvailable,
    usage.requestsRemaining,
    refreshTierSuggestions,
    toast,
    user?.fullName,
    user?.firstName,
  ]);

  const pendingSuggestions = useMemo(
    () => suggestions.filter((s) => s.acceptanceStatus === "pending"),
    [suggestions],
  );

  const tierBadge = useMemo(
    () => ({
      tier: userTier,
      remaining: usage.requestsRemaining,
    }),
    [userTier, usage.requestsRemaining],
  );

  const renderAddButton = () => {
    if (currentView === "timetable") {
      return (
        <Button
          onClick={() => openTimetableForm()}
          size="sm"
          className="h-10 shrink-0 active:scale-[0.97] transition-transform sm:h-9"
          aria-label="Add new class (Ctrl+N)"
        >
          <GraduationCap className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden xs:inline ml-1.5">Add class</span>
        </Button>
      );
    }
    return (
      <Button
        onClick={() => openTaskForm()}
        size="sm"
        className="h-10 shrink-0 active:scale-[0.97] transition-transform sm:h-9"
        aria-label="Create new task (Ctrl+N)"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        <span className="hidden xs:inline ml-1.5">Add task</span>
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "task-hub-texture flex h-full min-h-0 flex-col rounded-2xl md:rounded-none",
        /** No shell bottom padding — inner scroller + thumb nav carry spacing. Inline padding matches start/end per breakpoint. */
        "pl-3 pr-3 pb-0 pt-3 sm:pl-4 sm:pr-4 md:pl-6 md:pr-6 md:pt-6 md:pb-0",
      )}
    >
      <header className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:gap-3">
        <div
          role="tablist"
          aria-label="Task hub views"
          className="flex w-full min-w-0 items-stretch gap-0.5 rounded-xl bg-muted/90 p-1 shadow-sm ring-1 ring-border/40 backdrop-blur-sm sm:inline-flex sm:w-auto"
        >
          {viewOptions.map((option) => {
            const TabIcon = option.id === "today" ? todayTabIcon : option.icon;
            return (
              <button
                key={option.id}
                role="tab"
                aria-selected={currentView === option.id}
                type="button"
                onClick={() => setCurrentView(option.id)}
                className={viewTabVariants({
                  state: currentView === option.id ? "active" : "inactive",
                })}
              >
                <TabIcon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="hidden sm:inline">{option.label}</span>
                <span className="sm:hidden">{option.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
          {currentView === "today" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefreshSuggestions}
              disabled={isLoadingSuggestions}
              className="h-10 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground sm:h-8"
              aria-label={
                isFeatureAvailable("basic_suggestions")
                  ? `Get a fresh AI suggestion (${usage.requestsRemaining} of ${usage.dailyLimit} left today)`
                  : "Get a fresh suggestion"
              }
              title={
                isFeatureAvailable("basic_suggestions")
                  ? `${usage.requestsRemaining} AI suggestions left today`
                  : "Handpicked suggestions"
              }
            >
              {isLoadingSuggestions ? (
                <RefreshCw
                  className="h-3.5 w-3.5 animate-spin"
                  strokeWidth={1.75}
                />
              ) : (
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              <span className="hidden min-[400px]:inline sm:inline">
                {isLoadingSuggestions ? "Thinking…" : "New suggestion"}
              </span>
              {isFeatureAvailable("basic_suggestions") && (
                <span className="ml-1 rounded bg-muted px-1 tabular-nums">
                  {usage.requestsRemaining}
                </span>
              )}
            </Button>
          )}
          <NotificationCenter />
          {renderAddButton()}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto [-webkit-overflow-scrolling:touch] scroll-pb-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentView}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "w-full",
              currentView === "today" ? "min-h-full" : "h-full min-h-0",
            )}
          >
            {currentView === "today" &&
              (tasksError ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card p-8 text-center">
                  <p className="text-base font-semibold text-destructive">
                    Could not load your tasks
                  </p>
                  <p className="mt-1 max-w-[40ch] text-sm text-muted-foreground">
                    {tasksError.message ||
                      "Check your connection and try again."}
                  </p>
                  <Button
                    onClick={() => refetchTasks()}
                    variant="outline"
                    size="sm"
                    className="mt-4 active:scale-[0.97] transition-transform"
                  >
                    Try again
                  </Button>
                </div>
              ) : (
                <TodayView
                  tasks={tasks}
                  suggestions={pendingSuggestions}
                  userFirstName={user?.firstName || undefined}
                  tierBadge={tierBadge}
                  isLoading={isLoadingTasks || isLoadingSuggestions}
                  onCreateTask={() => openTaskForm()}
                  onQuickCreate={handleQuickCreate}
                  onEditTask={(task) => openTaskForm(task)}
                  onDeleteTask={handleDelete}
                  onToggleCompletion={handleToggleCompletion}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onDismissSuggestion={handleDismissSuggestion}
                  onGoToCalendar={() => setCurrentView("calendar")}
                  onGoToTimetable={() => setCurrentView("timetable")}
                  onAddTimetableClass={() => {
                    setCurrentView("timetable");
                    openTimetableForm();
                  }}
                />
              ))}
            {currentView === "calendar" && (
              <CalendarViewEnhanced onEditTask={openTaskForm} />
            )}
            {currentView === "timetable" && (
              <TimetableView
                onEditEntry={openTimetableForm}
                onAddEntry={() => openTimetableForm()}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {isTaskFormOpen && (
        <TaskForm
          open={isTaskFormOpen}
          onOpenChange={(open) => {
            if (!open) closeTaskForm();
          }}
          taskId={selectedTask?.id}
          onSuccess={handleTaskFormSuccess}
          onCancel={closeTaskForm}
        />
      )}

      {isTimetableFormOpen && (
        <TimetableEntryForm
          entryId={(selectedTimetableEntry as { id?: string } | null)?.id}
          onSuccess={handleTimetableFormSubmit}
          onCancel={closeTimetableForm}
        />
      )}
    </div>
  );
};
