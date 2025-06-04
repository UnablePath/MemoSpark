"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TimetableEntry } from "@/types/taskTypes";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Eye,
  List,
  Plus,
  Settings,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarViewEnhanced } from "./CalendarViewEnhanced";
import { ListView } from "./ListView";
import { TaskForm } from "./TaskForm";
import { TimetableEntryForm } from "./TimetableEntryForm";
import { TimetableView } from "./TimetableView";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
// Magic UI imports
import { BlurFade } from "@/components/ui/blur-fade";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";

// CVA for component variants
import { type VariantProps, cva } from "class-variance-authority";

// CVA variants for view tabs
const viewTabVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(142,60%,40%)] focus-visible:ring-offset-2",
  {
    variants: {
      state: {
        active: "bg-[hsl(142,60%,40%)] text-white shadow-sm",
        inactive:
          "text-[hsl(0,0%,45%)] hover:text-[hsl(0,0%,10%)] hover:bg-[hsl(142,60%,40%)]/10",
      },
    },
    defaultVariants: {
      state: "inactive",
    },
  },
);

// CVA variants for action buttons
const actionButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(142,60%,40%)] focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-[hsl(142,60%,40%)] text-white hover:bg-[hsl(142,60%,35%)] shadow-sm hover:shadow-md",
        secondary:
          "bg-[hsl(0,0%,98%)] text-[hsl(0,0%,10%)] hover:bg-[hsl(40,30%,85%)] border border-[hsl(40,30%,80%)]",
        shimmer: "bg-[hsl(142,60%,40%)] text-white hover:bg-[hsl(142,60%,35%)]",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        default: "h-9 px-4 py-2",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

// View types for the hub
type ViewType = "list" | "calendar" | "timetable";

// Form types for dialogs
type FormType = "task" | "timetable" | null;

// Enhanced interface definitions
interface TaskEventHubProps {
  className?: string;
  initialView?: ViewType;
  onViewChange?: (view: ViewType) => void;
  disabledViews?: ViewType[];
}

interface ViewConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  shortcut: string;
  ariaLabel: string;
}

// Enhanced state management interfaces
interface HubState {
  activeView: ViewType;
  openForm: FormType;
  editingTaskId: string | null;
  editingTimetableId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Enhanced view configuration with better accessibility
const VIEW_CONFIG: Record<ViewType, ViewConfig> = {
  list: {
    icon: List,
    label: "List View",
    description:
      "View tasks in a detailed list format with filtering and sorting options",
    shortcut: "L",
    ariaLabel: "Switch to list view showing tasks in a detailed list format",
  },
  calendar: {
    icon: Calendar,
    label: "Calendar View",
    description: "View tasks in a calendar layout with date-based navigation",
    shortcut: "C",
    ariaLabel: "Switch to calendar view showing tasks by date",
  },
  timetable: {
    icon: Clock,
    label: "Timetable View",
    description: "View your class schedule with weekly time slots",
    shortcut: "T",
    ariaLabel: "Switch to timetable view showing your class schedule",
  },
} as const;

export const TaskEventHub: React.FC<TaskEventHubProps> = ({
  className,
  initialView = "list",
  onViewChange,
  disabledViews = [],
}) => {
  // Enhanced state management with error handling
  const [state, setState] = useState<HubState>({
    activeView: initialView,
    openForm: null,
    editingTaskId: null,
    editingTimetableId: null,
    isLoading: false,
    error: null,
  });

  // Memoized view options for performance
  const availableViews = useMemo(() => {
    return (Object.entries(VIEW_CONFIG) as [ViewType, ViewConfig][]).filter(
      ([view]) => !disabledViews.includes(view),
    );
  }, [disabledViews]);

  // Enhanced view switching with error handling and external callback
  const handleViewChange = useCallback(
    (view: ViewType) => {
      if (disabledViews.includes(view)) {
        console.warn(`View ${view} is disabled`);
        return;
      }

      setState((prev) => ({ ...prev, activeView: view, error: null }));
      onViewChange?.(view);

      // Announce view change for screen readers
      const announcement = `Switched to ${VIEW_CONFIG[view].label}`;
      const liveRegion = document.querySelector('[aria-live="polite"]');
      if (liveRegion) {
        liveRegion.textContent = announcement;
      }
    },
    [disabledViews, onViewChange],
  );

  // Enhanced keyboard navigation with better accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if no input is focused and modifiers are pressed
      if (
        (event.target as HTMLElement)?.tagName === "INPUT" ||
        (event.target as HTMLElement)?.tagName === "TEXTAREA" ||
        (event.target as HTMLElement)?.contentEditable === "true"
      ) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        let handled = false;

        switch (event.key.toLowerCase()) {
          case "l":
            if (!disabledViews.includes("list")) {
              handleViewChange("list");
              handled = true;
            }
            break;
          case "c":
            if (!disabledViews.includes("calendar")) {
              handleViewChange("calendar");
              handled = true;
            }
            break;
          case "t":
            if (!disabledViews.includes("timetable")) {
              handleViewChange("timetable");
              handled = true;
            }
            break;
          case "n":
            openTaskForm();
            handled = true;
            break;
        }

        if (handled) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleViewChange, disabledViews]);

  // Enhanced form dialog handlers with error handling
  const openTaskForm = useCallback((taskId?: string) => {
    setState((prev) => ({
      ...prev,
      editingTaskId: taskId || null,
      openForm: "task",
      error: null,
    }));
  }, []);

  const openTimetableForm = useCallback(
    (timetableId?: string | TimetableEntry) => {
      try {
        const id =
          typeof timetableId === "string" ? timetableId : timetableId?.id;
        setState((prev) => ({
          ...prev,
          editingTimetableId: id || null,
          openForm: "timetable",
          error: null,
        }));
      } catch (error) {
        console.error("Error opening timetable form:", error);
        setState((prev) => ({
          ...prev,
          error: "Failed to open timetable form",
        }));
      }
    },
    [],
  );

  const closeForm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      openForm: null,
      editingTaskId: null,
      editingTimetableId: null,
      error: null,
    }));
  }, []);

  // Enhanced form success handlers
  const handleTaskFormSuccess = useCallback(() => {
    closeForm();

    // Announce success for screen readers
    const announcement = state.editingTaskId
      ? "Task updated successfully"
      : "Task created successfully";
    const liveRegion = document.querySelector('[aria-live="polite"]');
    if (liveRegion) {
      liveRegion.textContent = announcement;
    }
  }, [closeForm, state.editingTaskId]);

  const handleTimetableFormSuccess = useCallback(() => {
    closeForm();

    // Announce success for screen readers
    const announcement = state.editingTimetableId
      ? "Class updated successfully"
      : "Class added successfully";
    const liveRegion = document.querySelector('[aria-live="polite"]');
    if (liveRegion) {
      liveRegion.textContent = announcement;
    }
  }, [closeForm, state.editingTimetableId]);

  // Enhanced error handling for view content
  const renderViewContent = useCallback(() => {
    if (state.isLoading) {
      return (
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-3/4" />
        </div>
      );
    }

    if (state.error) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{state.error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setState((prev) => ({ ...prev, error: null }))}
                className="ml-2"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    try {
      switch (state.activeView) {
        case "list":
          return (
            <BlurFade delay={0.1}>
              <ListView
                onEditTask={openTaskForm}
              />
            </BlurFade>
          );

        case "calendar":
          return (
            <BlurFade delay={0.1}>
              <CalendarViewEnhanced
                onEditTask={openTaskForm}
              />
            </BlurFade>
          );

        case "timetable":
          return (
            <BlurFade delay={0.1}>
              <TimetableView
                onEditEntry={openTimetableForm}
                onAddEntry={() => openTimetableForm()}
              />
            </BlurFade>
          );

        default:
          return (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Eye className="h-8 w-8 text-[hsl(0,0%,45%)] mx-auto" />
                <p className="text-[hsl(0,0%,45%)] text-sm">
                  Select a view to get started
                </p>
                <p className="text-xs text-[hsl(0,0%,60%)]">
                  Use the tabs above or keyboard shortcuts
                </p>
              </div>
            </div>
          );
      }
    } catch (error) {
      console.error("Error rendering view content:", error);
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <div className="text-center space-y-2">
            <p className="text-red-600 text-sm font-medium">
              Error loading {VIEW_CONFIG[state.activeView].label.toLowerCase()}
            </p>
            <p className="text-[hsl(0,0%,45%)] text-xs max-w-md">
              There was an issue loading this view. Please try refreshing the
              page or selecting a different view.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }
  }, [state, openTaskForm, openTimetableForm]);

  return (
    <>
      {/* ARIA Live Region for announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />

      <BlurFade delay={0.05} className={cn("space-y-6", className)}>
        {/* Enhanced header with improved responsive design */}
        <Card className="relative overflow-hidden">
          <AnimatedGridPattern
            width={30}
            height={30}
            className="absolute inset-0 opacity-20"
            numSquares={20}
            maxOpacity={0.1}
          />

          <CardHeader className="relative">
            <div className="flex flex-col sm:flex-row lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <CardTitle className="text-xl font-semibold text-[hsl(0,0%,10%)] truncate">
                  Tasks & Events
                </CardTitle>
                <p className="text-sm text-[hsl(0,0%,45%)] line-clamp-2">
                  Manage your tasks and schedule in one place
                </p>
              </div>

              {/* Enhanced responsive action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <ShimmerButton
                  onClick={() => openTaskForm()}
                  className={cn(
                    actionButtonVariants({
                      variant: "shimmer",
                      size: "default",
                    }),
                    "w-full sm:w-auto min-w-[120px]",
                  )}
                  shimmerColor="#ffffff"
                  background="hsl(142, 60%, 40%)"
                  shimmerDuration="2s"
                  aria-label="Create new task (Ctrl+N)"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </ShimmerButton>

                <Button
                  onClick={() => openTimetableForm()}
                  className={cn(
                    actionButtonVariants({ variant: "secondary" }),
                    "w-full sm:w-auto min-w-[120px]",
                  )}
                  aria-label="Add new class to timetable"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Class</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Enhanced view switching with improved mobile experience */}
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-wrap gap-1 p-1 bg-[hsl(0,0%,98%)] rounded-lg border border-[hsl(40,30%,80%)] flex-1">
                {availableViews.map(([view, config]) => {
                  const Icon = config.icon;
                  const isActive = state.activeView === view;

                  return (
                    <button
                      key={view}
                      onClick={() => handleViewChange(view)}
                      className={cn(
                        viewTabVariants({
                          state: isActive ? "active" : "inactive",
                        }),
                        "flex-1 sm:flex-none min-w-0",
                      )}
                      aria-pressed={isActive}
                      aria-label={config.ariaLabel}
                      title={`${config.label} - ${config.description}`}
                    >
                      <Icon
                        className="h-4 w-4 flex-shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{config.label}</span>

                      {/* Enhanced keyboard shortcut indicator */}
                      <kbd className="hidden lg:inline-flex items-center rounded border border-[hsl(40,30%,80%)] bg-white px-1.5 py-0.5 text-xs text-[hsl(0,0%,45%)] ml-2">
                        <span className="text-xs">⌘</span>
                        {config.shortcut}
                      </kbd>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Enhanced view description with better responsive behavior */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs text-[hsl(0,0%,45%)] line-clamp-2">
                {VIEW_CONFIG[state.activeView].description}
              </p>

              {/* Keyboard shortcuts hint for desktop */}
              <p className="hidden lg:block text-xs text-[hsl(0,0%,60%)] whitespace-nowrap">
                Use Ctrl+L/C/T to switch views, Ctrl+N for new task
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced main content with better loading and error states */}
        <Card className="min-h-[600px] relative">
          <CardContent className="p-0">
            <div
              className="w-full h-full"
              role="tabpanel"
              aria-labelledby={`tab-${state.activeView}`}
              aria-label={`${VIEW_CONFIG[state.activeView].label} content`}
            >
              {renderViewContent()}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced dialogs with better accessibility and responsive design */}
        <Dialog
          open={state.openForm === "task"}
          onOpenChange={() => closeForm()}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-xl font-semibold">
                {state.editingTaskId ? "Edit Task" : "Create New Task"}
              </DialogTitle>
              <DialogDescription>
                {state.editingTaskId
                  ? "Update your task details below. All changes will be saved automatically."
                  : "Fill in the details to create a new task. Required fields are marked with an asterisk."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1">
              <TaskForm
                taskId={state.editingTaskId}
                onSuccess={handleTaskFormSuccess}
                onCancel={closeForm}
              />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={state.openForm === "timetable"}
          onOpenChange={() => closeForm()}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-xl font-semibold">
                {state.editingTimetableId ? "Edit Class" : "Add New Class"}
              </DialogTitle>
              <DialogDescription>
                {state.editingTimetableId
                  ? "Update your class details below. Changes will be reflected in your timetable immediately."
                  : "Fill in the details to add a new class to your timetable. All fields are optional except course name."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1">
              <TimetableEntryForm
                entryId={state.editingTimetableId}
                onSuccess={handleTimetableFormSuccess}
                onCancel={closeForm}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced keyboard shortcuts documentation for screen readers */}
        <div className="sr-only" role="region" aria-label="Keyboard shortcuts">
          <h3>Available Keyboard Shortcuts</h3>
          <dl>
            <div>
              <dt>Ctrl+L or Cmd+L</dt>
              <dd>Switch to List View</dd>
            </div>
            <div>
              <dt>Ctrl+C or Cmd+C</dt>
              <dd>Switch to Calendar View</dd>
            </div>
            <div>
              <dt>Ctrl+T or Cmd+T</dt>
              <dd>Switch to Timetable View</dd>
            </div>
            <div>
              <dt>Ctrl+N or Cmd+N</dt>
              <dd>Create New Task</dd>
            </div>
          </dl>
        </div>
      </BlurFade>
    </>
  );
};
