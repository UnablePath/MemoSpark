import { format, parseISO, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { Task, TimetableEntry, DayOfWeek } from '@/types/taskTypes';

export interface ParsedICalEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  isRecurring: boolean;
  recurrenceRule?: string;
  allDay: boolean;
}

export interface ICalParseResult {
  success: boolean;
  events: ParsedICalEvent[];
  error?: string;
}

export interface ICalValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExportData {
  tasks: Task[];
  timetableEntries: TimetableEntry[];
}

const ICAL_BYDAY_MAP: Record<DayOfWeek, string> = {
  sunday: 'SU',
  monday: 'MO',
  tuesday: 'TU',
  wednesday: 'WE',
  thursday: 'TH',
  friday: 'FR',
  saturday: 'SA'
};

const BYDAY_TO_DAYOFWEEK: Record<string, DayOfWeek> = {
  'SU': 'sunday',
  'MO': 'monday',
  'TU': 'tuesday',
  'WE': 'wednesday',
  'TH': 'thursday',
  'FR': 'friday',
  'SA': 'saturday'
};

export function parseICalFile(icalContent: string): ICalParseResult {
  const lines = icalContent.split(/\r?\n/).map(line => line.trim()).filter(line => line);
  const events: ParsedICalEvent[] = [];
  let currentEvent: Partial<ParsedICalEvent> | null = null;
  let inEvent = false;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {
        uid: '',
        title: '',
        startTime: new Date(),
        endTime: new Date(),
        isRecurring: false,
        allDay: false
      };
      continue;
    }

    if (line === 'END:VEVENT' && inEvent && currentEvent) {
      if (currentEvent.uid && currentEvent.title && currentEvent.startTime && currentEvent.endTime) {
        events.push(currentEvent as ParsedICalEvent);
      }
      currentEvent = null;
      inEvent = false;
      continue;
    }

    if (!inEvent || !currentEvent) continue;

    const [property, ...valueParts] = line.split(':');
    const value = valueParts.join(':');

    if (!property || !value) continue;

    const [propName, ...paramParts] = property.split(';');
    const params = paramParts.join(';');

    switch (propName) {
      case 'UID':
        currentEvent.uid = value;
        break;
      case 'SUMMARY':
        currentEvent.title = value;
        break;
      case 'DESCRIPTION':
        currentEvent.description = value;
        break;
      case 'LOCATION':
        currentEvent.location = value;
        break;
      case 'DTSTART':
        const startDate = parseICalDate(value, params);
        if (startDate) {
          currentEvent.startTime = startDate;
          currentEvent.allDay = !value.includes('T');
        }
        break;
      case 'DTEND':
        const endDate = parseICalDate(value, params);
        if (endDate) {
          currentEvent.endTime = endDate;
        }
        break;
      case 'RRULE':
        currentEvent.isRecurring = true;
        currentEvent.recurrenceRule = value;
        break;
    }
  }

  return {
    success: true,
    events
  };
}

function parseICalDate(dateString: string, params?: string): Date | null {
  // Handle different iCal date formats
  let dateStr = dateString;
  
  // Remove VALUE=DATE parameter if present
  if (params && params.includes('VALUE=DATE')) {
    // Date only format (YYYYMMDD)
    if (/^\d{8}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      dateStr = `${year}-${month}-${day}T00:00:00`;
    }
  } else {
    // DateTime format (YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
    if (/^\d{8}T\d{6}Z?$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = dateStr.substring(9, 11);
      const minute = dateStr.substring(11, 13);
      const second = dateStr.substring(13, 15);
      dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      
      if (dateString.endsWith('Z')) {
        dateStr += 'Z';
      }
    }
  }

  const parsedDate = parseISO(dateStr);
  return isValid(parsedDate) ? parsedDate : null;
}

export function exportToICal(data: ExportData): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const now = new Date();
  const dtstamp = format(now, "yyyyMMdd'T'HHmmss'Z'");

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudySpark//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:StudySpark Calendar`,
    `X-WR-TIMEZONE:${timeZone}`
  ];

  // Export tasks
  for (const task of data.tasks) {
    if (!task.due_date) continue;

    const uid = `task-${task.id}@studyspark.app`;
    const startDate = parseISO(task.due_date);
    
    if (!isValid(startDate)) continue;

    const dtstart = format(startDate, "yyyyMMdd'T'HHmmss");
    const dtend = format(startDate, "yyyyMMdd'T'HHmmss"); // Tasks are point-in-time events

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=${timeZone}:${dtstart}`,
      `DTEND;TZID=${timeZone}:${dtend}`,
      `SUMMARY:${task.title}`,
      ...(task.description ? [`DESCRIPTION:${task.description}`] : []),
      `CATEGORIES:${task.type}`,
      `PRIORITY:${getPriorityNumber(task.priority)}`,
      `STATUS:${task.status.toUpperCase()}`,
      'END:VEVENT'
    );
  }

  // Export timetable entries
  for (const entry of data.timetableEntries) {
    if (!entry.semester_start_date || !entry.semester_end_date) continue;

    const uid = `timetable-${entry.id}@studyspark.app`;
    const semesterStart = parseISO(entry.semester_start_date);
    const semesterEnd = parseISO(entry.semester_end_date);

    if (!isValid(semesterStart) || !isValid(semesterEnd)) continue;

    // Find first occurrence date
    const firstOccurrence = findFirstOccurrence(semesterStart, entry.days_of_week);
    if (!firstOccurrence) continue;

    const [startHour, startMinute] = (entry.start_time || '09:00').split(':').map(Number);
    const [endHour, endMinute] = (entry.end_time || '10:00').split(':').map(Number);

    const dtstart = new Date(firstOccurrence);
    dtstart.setHours(startHour, startMinute, 0, 0);
    
    const dtend = new Date(firstOccurrence);
    dtend.setHours(endHour, endMinute, 0, 0);

    const dtstartStr = format(dtstart, "yyyyMMdd'T'HHmmss");
    const dtendStr = format(dtend, "yyyyMMdd'T'HHmmss");

    const bydayRule = entry.days_of_week
      .map((day: string) => ICAL_BYDAY_MAP[day as DayOfWeek])
      .filter(Boolean)
      .join(',');

    const untilStr = format(semesterEnd, "yyyyMMdd'T'235959'Z'");

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=${timeZone}:${dtstartStr}`,
      `DTEND;TZID=${timeZone}:${dtendStr}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${bydayRule};UNTIL=${untilStr}`,
      `SUMMARY:${entry.course_name}${entry.course_code ? ` (${entry.course_code})` : ''}`,
      ...(entry.location ? [`LOCATION:${entry.location}`] : []),
      ...(entry.instructor ? [`DESCRIPTION:Instructor: ${entry.instructor}`] : []),
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function findFirstOccurrence(startDate: Date, daysOfWeek: string[]): Date | null {
  const start = new Date(startDate);
  
  for (let i = 0; i < 7; i++) {
    const testDate = new Date(start);
    testDate.setDate(start.getDate() + i);
    
    const dayName = getDayName(testDate.getDay());
    if (daysOfWeek.includes(dayName)) {
      return testDate;
    }
  }
  
  return null;
}

function getDayName(dayIndex: number): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayIndex];
}

function getPriorityNumber(priority: string): number {
  switch (priority) {
    case 'high': return 1;
    case 'medium': return 5;
    case 'low': return 9;
    default: return 5;
  }
}

export function validateICalData(icalContent: string): ICalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = icalContent.split(/\r?\n/).map(line => line.trim()).filter(line => line);

  let hasCalendarStart = false;
  let hasCalendarEnd = false;
  let inEvent = false;
  let eventProperties: Set<string> = new Set();

  const requiredEventProperties = ['UID', 'DTSTART', 'SUMMARY'];

  for (const line of lines) {
    if (line === 'BEGIN:VCALENDAR') {
      hasCalendarStart = true;
      continue;
    }

    if (line === 'END:VCALENDAR') {
      hasCalendarEnd = true;
      continue;
    }

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      eventProperties = new Set();
      continue;
    }

    if (line === 'END:VEVENT') {
      if (inEvent) {
        // Check required properties
        for (const prop of requiredEventProperties) {
          if (!eventProperties.has(prop)) {
            errors.push(`Missing required property: ${prop}`);
          }
        }
      }
      inEvent = false;
      continue;
    }

    if (inEvent) {
      const [property] = line.split(':');
      const [propName] = property.split(';');
      eventProperties.add(propName);

      // Validate date formats
      if (propName === 'DTSTART' || propName === 'DTEND') {
        const [, ...valueParts] = line.split(':');
        const value = valueParts.join(':');
        
        if (value && !parseICalDate(value, property)) {
          errors.push(`Invalid date format in ${propName}`);
        }
      }
    }
  }

  if (!hasCalendarStart) {
    errors.push('Missing BEGIN:VCALENDAR');
  }

  if (!hasCalendarEnd) {
    errors.push('Missing END:VCALENDAR');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function convertICalEventsToTasks(events: ParsedICalEvent[]): Partial<Task>[] {
  return events.map(event => ({
    title: event.title,
    description: event.description || '',
    due_date: event.startTime.toISOString(),
    priority: 'medium' as const,
    status: 'pending' as const,
    type: 'task' as const
  }));
}

export function convertICalEventsToTimetableEntries(events: ParsedICalEvent[]): Partial<TimetableEntry>[] {
  return events
    .filter(event => event.isRecurring && event.recurrenceRule)
    .map(event => {
      const daysOfWeek = extractDaysFromRRule(event.recurrenceRule || '');
      
      return {
        course_name: event.title,
        instructor: extractInstructorFromDescription(event.description || ''),
        location: event.location || '',
        start_time: format(event.startTime, 'HH:mm'),
        end_time: format(event.endTime, 'HH:mm'),
        days_of_week: daysOfWeek,
        color: '#3b82f6'
      };
    });
}

function extractDaysFromRRule(rrule: string): string[] {
  const bydayMatch = rrule.match(/BYDAY=([^;]+)/);
  if (!bydayMatch) return [];

  return bydayMatch[1]
    .split(',')
    .map(day => BYDAY_TO_DAYOFWEEK[day.trim()])
    .filter(Boolean);
}

function extractInstructorFromDescription(description: string): string {
  const instructorMatch = description.match(/Instructor:\s*(.+)/i);
  return instructorMatch ? instructorMatch[1].trim() : '';
}



