"use client";

import type React from "react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  useFetchTimetableEntries,
  useDeleteTimetableEntry,
} from "@/hooks/useTimetableQueries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimetableEntry, DayOfWeek } from "@/types/taskTypes";

interface TimetableViewProps {
  className?: string;
  onEditEntry?: (entry: TimetableEntry) => void;
  onAddEntry?: () => void;
  startHour?: number;
  endHour?: number;
  daysToDisplay?: DayOfWeek[];
}

const DEFAULT_START_HOUR = 8; // 8 AM
const DEFAULT_END_HOUR = 18; // 6 PM
const DEFAULT_DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

// Helper to convert HH:mm to total minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Helper to format time
const formatTime = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = Number.parseInt(hours, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${period}`;
};

// Day display mapping
const dayDisplayNames: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

// Day full names for accessibility
const dayFullNames: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const TimetableView: React.FC<TimetableViewProps> = ({
  className,
  onEditEntry,
  onAddEntry,
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
  daysToDisplay = DEFAULT_DAYS,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(
    null,
  );

  // Fetch timetable data
  const {
    data: entries = [],
    isLoading,
    error,
    refetch,
  } = useFetchTimetableEntries();

  // Delete mutation
  const deleteEntryMutation = useDeleteTimetableEntry();

  // Calculate time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let i = startHour; i < endHour; i++) {
      slots.push(`${String(i).padStart(2, "0")}:00`);
    }
    return slots;
  }, [startHour, endHour]);

  // Handle entry click
  const handleEntryClick = (entry: TimetableEntry) => {
    setSelectedEntry(entry);
    onEditEntry?.(entry);
  };

  // Handle delete entry
  const handleDeleteEntry = async (entry: TimetableEntry) => {
    try {
      await deleteEntryMutation.mutateAsync(entry.id);
      toast.success("Class deleted successfully");
      setSelectedEntry(null);
    } catch (error) {
      toast.error("Failed to delete class");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn("space-y-6", className)}
        role="status"
        aria-label="Loading timetable"
      >
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-12" />
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-16 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("space-y-6", className)} role="alert">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <AlertTriangle
                className="h-12 w-12 text-destructive"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-lg font-semibold text-destructive">
                  Error Loading Timetable
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {error instanceof Error
                    ? error.message
                    : "Failed to load your class schedule"}
                </p>
              </div>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (!entries || entries.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="relative overflow-hidden border-dashed">
          <CardContent className="pt-6 relative">
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="relative"
              >
                <Calendar
                  className="h-24 w-24 text-muted-foreground/50"
                  aria-hidden="true"
                />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="absolute -top-2 -right-2"
                >
                  <Plus className="h-8 w-8 text-primary" aria-hidden="true" />
                </motion.div>
              </motion.div>

              <div className="space-y-3">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl font-bold text-muted-foreground"
                >
                  No Classes Scheduled
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-muted-foreground max-w-md"
                >
                  Start building your academic schedule by adding your first
                  class. Track lectures, labs, and seminars all in one place.
                </motion.p>
              </div>

              {onAddEntry && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    onClick={onAddEntry}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Plus className="h-5 w-5" aria-hidden="true" />
                    Add Your First Class
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Desktop timetable grid
  const renderDesktopGrid = () => (
    <div className="hidden lg:block">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-background opacity-50" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" aria-hidden="true" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div
            className="grid grid-cols-6 gap-1 min-h-[600px]"
            role="grid"
            aria-label="Weekly class schedule grid"
          >
            {/* Time column */}
            <div className="space-y-1" role="rowheader">
              <div
                className="h-12 flex items-center justify-center text-xs font-medium text-muted-foreground border-b"
                role="columnheader"
              >
                Time
              </div>
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="h-16 flex items-center justify-center text-xs text-muted-foreground border-b border-border/50"
                  role="rowheader"
                  aria-label={`Time slot ${formatTime(time)}`}
                >
                  {formatTime(time)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {daysToDisplay.map((day) => (
              <div key={day} className="relative space-y-1" role="gridcell">
                <div
                  className="h-12 flex items-center justify-center text-xs font-medium text-muted-foreground border-b"
                  role="columnheader"
                >
                  {dayDisplayNames[day]}
                </div>

                {/* Time slot backgrounds */}
                <div
                  className="relative"
                  aria-label={`${dayFullNames[day]} schedule`}
                >
                  {timeSlots.map((_, index) => (
                    <div
                      key={index}
                      className="h-16 border-b border-border/50 bg-muted/20"
                    />
                  ))}

                  {/* Entries for this day */}
                  <div className="absolute inset-0">
                    {entries
                      .filter((entry) => entry.days_of_week?.includes(day))
                      .map((entry) => {
                        const startMinutes = timeToMinutes(
                          entry.start_time || "09:00",
                        );
                        const endMinutes = timeToMinutes(
                          entry.end_time || "10:00",
                        );
                        const gridStartMinutes = startHour * 60;

                        const top =
                          ((startMinutes - gridStartMinutes) / 60) * 64; // 64px per hour (h-16)
                        const height = ((endMinutes - startMinutes) / 60) * 64;

                        return (
                          <motion.div
                            key={`${entry.id}-${day}`}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02, z: 10 }}
                            className={cn(
                              "absolute left-1 right-1 rounded-lg p-2 text-xs cursor-pointer",
                              "bg-gradient-to-br from-primary/80 to-primary/60 text-primary-foreground",
                              "shadow-lg border border-primary/20",
                              "hover:shadow-xl transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                            )}
                            style={{
                              top: `${Math.max(0, top)}px`,
                              height: `${Math.max(32, height - 4)}px`,
                              backgroundColor: entry.color || undefined,
                            }}
                            onClick={() => handleEntryClick(entry)}
                            role="button"
                            tabIndex={0}
                            aria-label={`${entry.course_name} class from ${formatTime(entry.start_time || "09:00")} to ${formatTime(entry.end_time || "10:00")} ${entry.location ? `at ${entry.location}` : ""}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleEntryClick(entry);
                              }
                            }}
                          >
                            <div className="flex flex-col h-full">
                              <p className="font-semibold truncate">
                                {entry.course_name}
                              </p>
                              {entry.course_code && (
                                <p className="text-xs opacity-90 truncate">
                                  {entry.course_code}
                                </p>
                              )}
                              {entry.location && (
                                <p className="text-xs opacity-80 truncate flex items-center gap-1 mt-auto">
                                  <MapPin
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                  />
                                  {entry.location}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Mobile card list
  const renderMobileList = () => (
    <div className="lg:hidden space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" aria-hidden="true" />
            Your Classes
          </CardTitle>
        </CardHeader>
      </Card>

      {daysToDisplay.map((day) => {
        const dayEntries = entries.filter((entry) =>
          entry.days_of_week?.includes(day),
        );

        if (dayEntries.length === 0) return null;

        return (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-medium text-muted-foreground capitalize px-1">
              {dayFullNames[day]}
            </h3>

            <div
              className="space-y-2"
              role="list"
              aria-label={`${dayFullNames[day]} classes`}
            >
              {dayEntries
                .sort(
                  (a, b) =>
                    timeToMinutes(a.start_time || "09:00") -
                    timeToMinutes(b.start_time || "09:00"),
                )
                .map((entry) => (
                  <motion.div
                    key={`${entry.id}-${day}`}
                    layout
                    whileTap={{ scale: 0.98 }}
                    role="listitem"
                  >
                    <Card
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md",
                        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                        selectedEntry?.id === entry.id && "ring-2 ring-primary",
                      )}
                      onClick={() => handleEntryClick(entry)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${entry.course_name} class from ${formatTime(entry.start_time || "09:00")} to ${formatTime(entry.end_time || "10:00")} ${entry.location ? `at ${entry.location}` : ""}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleEntryClick(entry);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-semibold truncate">
                                {entry.course_name}
                              </h4>
                              {entry.course_code && (
                                <Badge variant="secondary" className="text-xs">
                                  {entry.course_code}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                <span>
                                  {formatTime(entry.start_time || "09:00")} -{" "}
                                  {formatTime(entry.end_time || "10:00")}
                                </span>
                              </div>

                              {entry.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">
                                    {entry.location}
                                  </span>
                                </div>
                              )}

                              {entry.instructor && (
                                <div className="flex items-center gap-2">
                                  <User
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">
                                    {entry.instructor}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {entry.color && (
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                              style={{ backgroundColor: entry.color }}
                              aria-label={`Color indicator`}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <main
      className={cn("space-y-6", className)}
      role="main"
      aria-label="Timetable view"
    >
      <AnimatePresence mode="wait">
        {renderDesktopGrid()}
        {renderMobileList()}
      </AnimatePresence>
    </main>
  );
};
