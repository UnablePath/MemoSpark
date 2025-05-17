'use client';

import React from 'react';
import { ClassTimetableEntry, ALL_DAYS_OF_WEEK, DayOfWeek } from './TaskEventTab'; // Assuming types are exported from TaskEventTab or a shared types file
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Import Button for edit/delete
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa'; // Import icons

interface TimetableGridProps {
  entries: ClassTimetableEntry[];
  startHour?: number; // Hour to start the timetable (e.g., 7 for 7 AM)
  endHour?: number;   // Hour to end the timetable (e.g., 19 for 7 PM)
  daysToDisplay?: DayOfWeek[];
  onEditEntry?: (entry: ClassTimetableEntry) => void;
  onDeleteEntry?: (entry: ClassTimetableEntry) => void;
}

const DEFAULT_START_HOUR = 8; // 8 AM
const DEFAULT_END_HOUR = 18;  // 6 PM
const DEFAULT_DAYS: ("Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday")[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Helper to convert HH:mm to total minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
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
    hourSlots.push(`${String(i).padStart(2, '0')}:00`);
    // Optional: Add half-hour slots if needed, e.g., `${String(i).padStart(2, '0')}:30`
  }

  const totalHours = endHour - startHour;
  const slotHeight = 60; // Arbitrary height for a 1-hour slot in px, adjust as needed

  return (
    <div className="relative bg-background rounded-lg shadow-md overflow-hidden border border-border">
      {/* Header Row for Days */}
      <div className="grid sticky top-0 z-10 bg-muted/80 backdrop-blur-sm"
           style={{ gridTemplateColumns: `minmax(60px, auto) repeat(${daysToDisplay.length}, 1fr)` }}>
        <div className="p-2 border-r border-b border-border text-xs font-semibold text-muted-foreground text-center">Time</div>
        {daysToDisplay.map(day => (
          <div key={day} className="p-2 border-r border-b border-border text-xs font-semibold text-muted-foreground text-center last:border-r-0">
            {day.substring(0,3)}
          </div>
        ))}
      </div>

      {/* Timetable Body */}
      <div className="grid overflow-y-auto" 
           style={{ gridTemplateColumns: `minmax(60px, auto) repeat(${daysToDisplay.length}, 1fr)`, maxHeight: '70vh' }}>
        {/* Time Slot Column */}
        <div className="col-start-1 col-end-2 grid">
          {hourSlots.map(hour => (
            <div key={hour} 
                 className="p-2 border-r border-b border-border text-xs text-muted-foreground text-center whitespace-nowrap"
                 style={{ height: `${slotHeight}px` }}>
              {hour}
            </div>
          ))}
        </div>

        {/* Day Columns for Events */}
        {daysToDisplay.map((day, dayIndex) => (
          <div key={day} className="relative col-start-auto border-r border-border last:border-r-0"
               style={{ gridColumnStart: dayIndex + 2 }}>
            {/* Render hour lines for visual separation within each day column */}
            {hourSlots.map((_, hourIndex) => (
              <div key={`${day}-line-${hourIndex}`} 
                   className="border-b border-border/50"
                   style={{ height: `${slotHeight}px` }}>
              </div>
            ))}
            
            {/* Place events for this day */}
            {entries
              .filter(entry => entry.daysOfWeek.includes(day))
              .map(entry => {
                const entryStartMinutes = timeToMinutes(entry.startTime);
                const entryEndMinutes = timeToMinutes(entry.endTime);
                const timetableStartMinutes = startHour * 60;

                // Calculate top position and height
                const top = ((entryStartMinutes - timetableStartMinutes) / 60) * slotHeight;
                const height = ((entryEndMinutes - entryStartMinutes) / 60) * slotHeight;

                if (top < 0 || top + height > totalHours * slotHeight) {
                    // Entry is outside the visible time range for this day column view
                    // Could log this or handle it, for now, just don't render if fully outside.
                    // Partial overlaps could be clipped by overflow-hidden on parent or styled explicitly.
                    // console.warn("Event outside visible range", entry);
                    // return null; 
                }

                return (
                  <div
                    key={entry.id + '-' + day} // Unique key for each instance of event in a day
                    className={cn(
                      'absolute w-[calc(100%-4px)] ml-[2px] rounded-md p-2 text-xs shadow-lg overflow-hidden opacity-90 hover:opacity-100 transition-opacity',
                      entry.color || 'bg-primary text-primary-foreground',
                      'border', entry.color ? 'border-transparent' : 'border-primary/50' // Add border for contrast if color is generic
                    )}
                    style={{
                      top: `${Math.max(0, top)}px`, // Ensure top is not negative
                      height: `${Math.max(10, height - 2)}px`, // Min height, and slight reduction for padding/border
                    }}
                    title={`${entry.courseName} (${entry.courseCode || ''})\n${entry.startTime} - ${entry.endTime}\n${entry.location || ''}\n${entry.instructor || ''}`}
                  >
                    <div className="flex flex-col h-full">
                        <p className="font-semibold truncate">{entry.courseName}</p>
                        <p className="truncate">{entry.courseCode}</p>
                        <p className="truncate text-opacity-80">{entry.location}</p>
                        <div className="mt-auto flex items-center justify-end space-x-1 pt-1">
                            {onEditEntry && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 text-blue-100 hover:text-white hover:bg-black/20"
                                    onClick={(e) => { e.stopPropagation(); onEditEntry(entry); }}
                                    aria-label="Edit timetable entry"
                                >
                                    <FaPencilAlt className="h-3 w-3" />
                                </Button>
                            )}
                            {onDeleteEntry && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 text-red-200 hover:text-white hover:bg-black/20"
                                    onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry); }}
                                    aria-label="Delete timetable entry"
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