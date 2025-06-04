"use client";

import type React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FaPencilAlt, FaTrashAlt } from "react-icons/fa";
import type { TimetableEntry, DayOfWeek } from "@/types/taskTypes";

interface TimetableGridProps {
  entries: TimetableEntry[];
  startHour?: number; // Hour to start the timetable (e.g., 7 for 7 AM)
  endHour?: number; // Hour to end the timetable (e.g., 19 for 7 PM)
  daysToDisplay?: DayOfWeek[];
  onEditEntry?: (entry: TimetableEntry) => void;
  onDeleteEntry?: (entry: TimetableEntry) => void;
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

// Helper to convert HH:mm to total minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  entries,
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
  daysToDisplay = DEFAULT_DAYS,
  onEditEntry,
  onDeleteEntry,
}) => {
  const hourSlots: string[] = [];
  for (let i = startHour; i < endHour; i++) {
    hourSlots.push(`${String(i).padStart(2, "0")}:00`);
  }

  const totalHours = endHour - startHour;
  const slotHeight = 60; // Height for a 1-hour slot in px

  return (
    <div
      className="relative bg-background rounded-lg shadow-md overflow-hidden border border-border"
      role="grid"
      aria-label="Weekly timetable"
    >
      {/* Header Row for Days */}
      <div
        className="grid sticky top-0 z-10 bg-muted/80 backdrop-blur-sm"
        style={{
          gridTemplateColumns: `minmax(60px, auto) repeat(${daysToDisplay.length}, 1fr)`,
        }}
        role="row"
      >
        <div
          className="p-2 border-r border-b border-border text-xs font-semibold text-muted-foreground text-center"
          role="columnheader"
        >
          Time
        </div>
        {daysToDisplay.map((day) => (
          <div
            key={day}
            className="p-2 border-r border-b border-border text-xs font-semibold text-muted-foreground text-center last:border-r-0"
            role="columnheader"
          >
            {dayDisplayNames[day]}
          </div>
        ))}
      </div>

      {/* Timetable Body */}
      <div
        className="grid overflow-y-auto"
        style={{
          gridTemplateColumns: `minmax(60px, auto) repeat(${daysToDisplay.length}, 1fr)`,
          maxHeight: "70vh",
        }}
        role="rowgroup"
      >
        {/* Time Slot Column */}
        <div className="col-start-1 col-end-2 grid">
          {hourSlots.map((hour) => (
            <div
              key={hour}
              className="p-2 border-r border-b border-border text-xs text-muted-foreground text-center whitespace-nowrap"
              style={{ height: `${slotHeight}px` }}
              role="rowheader"
            >
              {hour}
            </div>
          ))}
        </div>

        {/* Day Columns for Events */}
        {daysToDisplay.map((day, dayIndex) => (
          <div
            key={day}
            className="relative col-start-auto border-r border-border last:border-r-0"
            style={{ gridColumnStart: dayIndex + 2 }}
            role="gridcell"
            aria-label={`${dayDisplayNames[day]} schedule`}
          >
            {/* Render hour lines for visual separation within each day column */}
            {hourSlots.map((_, hourIndex) => (
              <div
                key={`${day}-line-${hourIndex}`}
                className="border-b border-border/50"
                style={{ height: `${slotHeight}px` }}
              />
            ))}

            {/* Place events for this day */}
            {entries
              .filter((entry) => entry.days_of_week.includes(day))
              .map((entry) => {
                const entryStartMinutes = timeToMinutes(
                  entry.start_time || "09:00",
                );
                const entryEndMinutes = timeToMinutes(
                  entry.end_time || "10:00",
                );
                const timetableStartMinutes = startHour * 60;

                // Calculate top position and height
                const top =
                  ((entryStartMinutes - timetableStartMinutes) / 60) *
                  slotHeight;
                const height =
                  ((entryEndMinutes - entryStartMinutes) / 60) * slotHeight;

                // Skip entries outside visible time range
                if (top < 0 || top + height > totalHours * slotHeight) {
                  return null;
                }

                return (
                  <div
                    key={`${entry.id}-${day}`}
                    className={cn(
                      "absolute w-[calc(100%-4px)] ml-[2px] rounded-md p-2 text-xs shadow-lg overflow-hidden",
                      "opacity-90 hover:opacity-100 transition-opacity focus-within:opacity-100",
                      "bg-primary text-primary-foreground border border-primary/20",
                      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                    )}
                    style={{
                      top: `${Math.max(0, top)}px`,
                      height: `${Math.max(10, height - 2)}px`,
                      backgroundColor: entry.color || undefined,
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${entry.course_name} (${entry.course_code || ""}), ${entry.start_time} - ${entry.end_time}, ${entry.location || ""}`}
                    title={`${entry.course_name} (${entry.course_code || ""})\n${entry.start_time} - ${entry.end_time}\n${entry.location || ""}\n${entry.instructor || ""}`}
                  >
                    <div className="flex flex-col h-full">
                      <p className="font-semibold truncate">
                        {entry.course_name}
                      </p>
                      {entry.course_code && (
                        <p className="truncate">{entry.course_code}</p>
                      )}
                      {entry.location && (
                        <p className="truncate text-primary-foreground/80">
                          {entry.location}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-end space-x-1 pt-1">
                        {onEditEntry && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-primary-foreground/80 hover:text-primary-foreground hover:bg-black/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditEntry(entry);
                            }}
                            aria-label={`Edit ${entry.course_name}`}
                          >
                            <FaPencilAlt className="h-3 w-3" />
                          </Button>
                        )}
                        {onDeleteEntry && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive/80 hover:text-destructive hover:bg-black/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteEntry(entry);
                            }}
                            aria-label={`Delete ${entry.course_name}`}
                          >
                            <FaTrashAlt className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
};
