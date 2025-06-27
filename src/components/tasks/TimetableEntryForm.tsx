"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, User, BookOpen } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import {
  useCreateTimetableEntry,
  useUpdateTimetableEntry,
  useGetTimetableEntry,
} from "@/hooks/useTimetableQueries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { TimetableEntryFormData, DayOfWeek } from "@/types/taskTypes";
import { DAYS_OF_WEEK_OPTIONS } from "@/types/taskTypes";

// Color options for timetable entries
const COLOR_OPTIONS = [
  { value: "#ef4444", label: "Red", class: "bg-red-500" },
  { value: "#f97316", label: "Orange", class: "bg-orange-500" },
  { value: "#eab308", label: "Yellow", class: "bg-yellow-500" },
  { value: "#22c55e", label: "Green", class: "bg-green-500" },
  { value: "#06b6d4", label: "Cyan", class: "bg-cyan-500" },
  { value: "#3b82f6", label: "Blue", class: "bg-blue-500" },
  { value: "#8b5cf6", label: "Purple", class: "bg-purple-500" },
  { value: "#ec4899", label: "Pink", class: "bg-pink-500" },
];

// Validation schema for timetable entry form
const timetableEntryFormSchema = z
  .object({
    course_name: z
      .string()
      .min(1, "Course name is required")
      .max(200, "Course name too long"),
    course_code: z.string().optional(),
    instructor: z.string().optional(),
    location: z.string().optional(),
    start_time: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
      .optional(),
    end_time: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
      .optional(),
    days_of_week: z
      .array(z.string())
      .min(1, "At least one day must be selected"),
    semester_start_date: z.date().optional(),
    semester_end_date: z.date().optional(),
    color: z.string().optional(),
  })
  .refine(
    (data) => {
      // If both start and end times are provided, start should be before end
      if (data.start_time && data.end_time) {
        const start = new Date(`2000-01-01T${data.start_time}:00`);
        const end = new Date(`2000-01-01T${data.end_time}:00`);
        return start < end;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["end_time"],
    },
  )
  .refine(
    (data) => {
      // If both semester dates are provided, start should be before end
      if (data.semester_start_date && data.semester_end_date) {
        return data.semester_start_date < data.semester_end_date;
      }
      return true;
    },
    {
      message: "Semester end date must be after start date",
      path: ["semester_end_date"],
    },
  );

type TimetableEntryFormValues = z.infer<typeof timetableEntryFormSchema>;

interface TimetableEntryFormProps {
  entryId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const TimetableEntryForm: React.FC<TimetableEntryFormProps> = ({
  entryId,
  onSuccess,
  onCancel,
}) => {
  const { getToken } = useAuth();
  
  // Hooks for timetable entry operations
  const createTimetableEntryMutation = useCreateTimetableEntry(getToken);
  const updateTimetableEntryMutation = useUpdateTimetableEntry(getToken);
  const { data: existingEntry, isLoading: isLoadingEntry } =
    useGetTimetableEntry(entryId || "", Boolean(entryId), getToken);

  // Form setup
  const form = useForm<TimetableEntryFormValues>({
    resolver: zodResolver(timetableEntryFormSchema),
    defaultValues: {
      course_name: "",
      course_code: "",
      instructor: "",
      location: "",
      start_time: "",
      end_time: "",
      days_of_week: [],
      color: COLOR_OPTIONS[0].value,
    },
  });

  // Load existing entry data for editing
  useEffect(() => {
    if (existingEntry && entryId) {
      form.reset({
        course_name: existingEntry.course_name,
        course_code: existingEntry.course_code || "",
        instructor: existingEntry.instructor || "",
        location: existingEntry.location || "",
        start_time: existingEntry.start_time || "",
        end_time: existingEntry.end_time || "",
        days_of_week: existingEntry.days_of_week,
        semester_start_date: existingEntry.semester_start_date
          ? new Date(existingEntry.semester_start_date)
          : undefined,
        semester_end_date: existingEntry.semester_end_date
          ? new Date(existingEntry.semester_end_date)
          : undefined,
        color: existingEntry.color || COLOR_OPTIONS[0].value,
      });
    }
  }, [existingEntry, entryId, form]);

  // Handle form submission
  const onSubmit = async (values: TimetableEntryFormValues) => {
    try {
      const entryData = {
        course_name: values.course_name,
        course_code: values.course_code || undefined,
        instructor: values.instructor || undefined,
        location: values.location || undefined,
        start_time: values.start_time || undefined,
        end_time: values.end_time || undefined,
        days_of_week: values.days_of_week,
        semester_start_date: values.semester_start_date
          ?.toISOString()
          .split("T")[0],
        semester_end_date: values.semester_end_date
          ?.toISOString()
          .split("T")[0],
        color: values.color || undefined,
      };

      if (entryId && existingEntry) {
        // Update existing entry
        await updateTimetableEntryMutation.mutateAsync({
          id: entryId,
          updates: entryData,
        });
      } else {
        // Create new entry
        await createTimetableEntryMutation.mutateAsync(entryData);
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving timetable entry:", error);
      // Error handling is done by the mutation hooks with toast notifications
    }
  };

  // Handle day of week selection
  const handleDayToggle = (day: string) => {
    const currentDays = form.getValues("days_of_week");
    if (currentDays.includes(day)) {
      form.setValue(
        "days_of_week",
        currentDays.filter((d) => d !== day),
      );
    } else {
      form.setValue("days_of_week", [...currentDays, day]);
    }
  };

  // Calculate loading state
  const isLoading =
    createTimetableEntryMutation.isPending ||
    updateTimetableEntryMutation.isPending ||
    isLoadingEntry;

  // Watch form values for reactive updates
  const selectedDays = form.watch("days_of_week");
  const selectedColor = form.watch("color");

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
          aria-label={
            entryId ? "Edit timetable entry" : "Create new timetable entry"
          }
        >
          {/* Course Name Field */}
          <FormField
            control={form.control}
            name="course_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course Name *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <BookOpen
                      className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      placeholder="Enter course name..."
                      className="pl-10"
                      {...field}
                      disabled={isLoading}
                      aria-describedby="course-name-desc"
                    />
                  </div>
                </FormControl>
                <FormDescription id="course-name-desc">
                  The name of your class or course
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Course Code and Instructor Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="course_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., CS101"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructor</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        placeholder="Professor name..."
                        className="pl-10"
                        {...field}
                        disabled={isLoading}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Location Field */}
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin
                      className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      placeholder="Building and room number..."
                      className="pl-10"
                      {...field}
                      disabled={isLoading}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock
                        className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        type="time"
                        className="pl-10"
                        {...field}
                        disabled={isLoading}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock
                        className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        type="time"
                        className="pl-10"
                        {...field}
                        disabled={isLoading}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Days of Week Selection */}
          <FormField
            control={form.control}
            name="days_of_week"
            render={() => (
              <FormItem>
                <FormLabel>Days of Week *</FormLabel>
                <FormDescription>
                  Select the days when this class occurs.
                </FormDescription>
                <div
                  className="grid grid-cols-2 md:grid-cols-4 gap-2"
                  role="group"
                  aria-labelledby="days-label"
                >
                  {DAYS_OF_WEEK_OPTIONS.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={selectedDays.includes(day)}
                        onCheckedChange={() => handleDayToggle(day)}
                        disabled={isLoading}
                        aria-describedby={`${day}-desc`}
                      />
                      <Label
                        htmlFor={day}
                        className="text-sm font-normal cursor-pointer"
                        id={`${day}-desc`}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Semester Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="semester_start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Semester Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                          disabled={isLoading}
                          aria-haspopup="dialog"
                          aria-expanded="false"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick start date</span>
                          )}
                          <CalendarIcon
                            className="ml-auto h-4 w-4 opacity-50"
                            aria-hidden="true"
                          />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="semester_end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Semester End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                          disabled={isLoading}
                          aria-haspopup="dialog"
                          aria-expanded="false"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick end date</span>
                          )}
                          <CalendarIcon
                            className="ml-auto h-4 w-4 opacity-50"
                            aria-hidden="true"
                          />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Color Selection */}
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormDescription>
                  Choose a color to represent this class in your timetable.
                </FormDescription>
                <div
                  className="grid grid-cols-4 md:grid-cols-8 gap-2"
                  role="group"
                  aria-labelledby="color-label"
                >
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => field.onChange(color.value)}
                      disabled={isLoading}
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selectedColor === color.value
                          ? "border-primary scale-110"
                          : "border-transparent hover:scale-105",
                        color.class,
                      )}
                      title={color.label}
                      aria-label={`Select ${color.label} color`}
                    >
                      <span className="sr-only">{color.label}</span>
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preview of selected days */}
          {selectedDays.length > 0 && (
            <div
              className="rounded-lg border p-3 bg-muted/50"
              role="region"
              aria-label="Schedule preview"
            >
              <p className="text-sm font-medium mb-2">
                Class Schedule Preview:
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedDays.map((day) => (
                  <Badge key={day} variant="secondary" className="text-xs">
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
              aria-describedby="submit-button-desc"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden="true"
                  />
                  <span aria-live="polite">
                    {entryId ? "Updating..." : "Creating..."}
                  </span>
                </div>
              ) : entryId ? (
                "Update Class"
              ) : (
                "Add Class"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
