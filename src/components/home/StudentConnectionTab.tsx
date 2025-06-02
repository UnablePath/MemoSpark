"use client";

import type React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaSearch, FaPlus, FaComment, FaTimes, FaPaperPlane, FaUsers, FaUndo, FaTrophy } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StreakTracker } from '@/components/gamification/StreakTracker';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityFeedPlaceholder } from './ActivityFeedPlaceholder';
import { StudyGroupHubPlaceholder } from './StudyGroupHubPlaceholder';
// @ts-ignore
import confetti from 'canvas-confetti';
import { cn } from "@/lib/utils";

// Mock data for student profiles
type Achievement = {
  id: string;
  name: string;
  icon: string; // Could be a component or an emoji or a classname for an icon
  description: string;
  dateEarned: string;
};

type Student = {
  id: string;
  name: string;
  year: string;
  subjects: string[];
  interests: string[];
  avatar: string | null;
  achievements: Achievement[]; // Added achievements
};

interface StudentConnectionTabProps {
  onViewModeChange?: (isSwipeMode: boolean) => void;
}

const mockStudents: Student[] = [
  {
    id: "1",
    name: "Alex Johnson",
    year: "Sophomore",
    subjects: ["Mathematics", "Physics"],
    interests: ["Chess", "Hiking"],
    avatar: null,
    achievements: [
      { id: "a1", name: "Math Whiz", icon: "🏆", description: "Top score in Calculus quiz", dateEarned: "2023-10-15" },
      { id: "a2", name: "Debate Champion", icon: "🗣️", description: "Won the inter-college debate", dateEarned: "2023-11-05" },
    ],
  },
  {
    id: "2",
    name: "Morgan Lee",
    year: "Junior",
    subjects: ["Computer Science", "Data Science"],
    interests: ["Gaming", "Programming"],
    avatar: null,
    achievements: [
      { id: "a3", name: "Code Ninja", icon: "💻", description: "Completed 100 coding challenges", dateEarned: "2023-09-20" },
    ],
  },
  {
    id: "3",
    name: "Taylor Kim",
    year: "Freshman",
    subjects: ["Biology", "Chemistry"],
    interests: ["Music", "Swimming"],
    avatar: null,
    achievements: [
      { id: "a4", name: "Lab Assistant", icon: "🔬", description: "Assisted in 3 research projects", dateEarned: "2023-12-01" },
      { id: "a5", name: "Melody Maker", icon: "🎵", description: "Composed an original song", dateEarned: "2023-11-22" },
      { id: "a6", name: "Aqua Star", icon: "🏊", description: "Gold in 100m freestyle", dateEarned: "2023-10-30" },
    ],
  },
  {
    id: "4",
    name: "Jordan Smith",
    year: "Senior",
    subjects: ["Psychology", "Sociology"],
    interests: ["Reading", "Yoga"],
    avatar: null,
    achievements: [
      { id: "a7", name: "Bookworm", icon: "📚", description: "Read 50 books this year", dateEarned: "2023-12-10" },
    ],
  },
];

export default function StudentConnectionTab({ onViewModeChange }: StudentConnectionTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<{[key: string]: {text: string, sent: boolean}[]}>({});
  const [viewMode, setViewMode] = useState<'grid' | 'swipe'>('grid');
  const [swipedIds, setSwipedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('swipedIds') || '[]');
    }
    return [];
  });
  const [swipeHistory, setSwipeHistory] = useState<{id: string, action: 'connect' | 'skip'}[]>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('swipeHistory') || '[]');
    }
    return [];
  });
  const [lastAction, setLastAction] = useState<string | null>(null); // For feedback
  const [showConfetti, setShowConfetti] = useState(false);
  const swipeTimeout = useRef<NodeJS.Timeout | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null); // For ARIA live region
  const swipeCardFocusRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const chatModalRef = useRef<HTMLDivElement>(null); // Ref for the chat modal main div
  const [tinderExitDirection, setSwipeExitDirection] = useState<number>(0);

  // Call onViewModeChange when viewMode changes
  useEffect(() => {
    onViewModeChange?.(viewMode === 'swipe');
  }, [viewMode, onViewModeChange]);

  const cardVariants = {
    initial: {
      scale: 0.95,
      opacity: 0.8,
      // x: 0, // ensure initial x is set if not transitioning from a specific direction
    },
    animate: {
      scale: 1,
      opacity: 1,
      x: 0,
      transition: {
        // type: "spring", // Optional: add spring physics if desired
        // stiffness: 300,
        // damping: 30,
      }
    },
    exit: (customDirection: number) => ({
      x: customDirection === -1 ? -300 : (customDirection === 1 ? 300 : 0),
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.3 }
    })
  };

  // Persist swipedIds and swipeHistory
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('swipedIds', JSON.stringify(swipedIds));
      localStorage.setItem('swipeHistory', JSON.stringify(swipeHistory));
    }
  }, [swipedIds, swipeHistory]);

  const filteredStudents: Student[] = useMemo(() => mockStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.subjects.some((subject) =>
        subject.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      student.interests.some((interest) =>
        interest.toLowerCase().includes(searchQuery.toLowerCase())
      )
  ), [searchQuery]);

  const selectedStudent = useMemo(() => {
    return mockStudents.find(student => student.id === selectedStudentId) || null;
  }, [selectedStudentId]);

  // Only show students not yet swiped
  const availableStudents = filteredStudents.filter(s => !swipedIds.includes(s.id));

  // Confetti effect for match
  useEffect(() => {
    if (showConfetti) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      // Announce match via status message for screen readers
      // Assuming lastAction is set to something like "Connected with [Name]!"
      // If not, we might need a separate state for match announcement.
      // For now, let's rely on lastAction being descriptive enough.
      const t = setTimeout(() => setShowConfetti(false), 1200);
      return () => clearTimeout(t);
    }
  }, [showConfetti]);

  const handleSendMessage = (studentId: string) => {
    if (!chatMessage.trim()) return;

    setChatMessages((prev) => ({
      ...prev,
      [studentId]: [
        ...(prev[studentId] || []),
        { text: chatMessage, sent: true },
      ],
    }));

    setChatMessage("");

    // Simulate response after 1 second
    setTimeout(() => {
      setChatMessages((prev) => ({
        ...prev,
        [studentId]: [
          ...(prev[studentId] || []),
          { text: "Thanks for your message! I'll get back to you soon.", sent: false },
        ],
      }));
    }, 1000);
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleSimulateGroupChat = () => {
    // In a real app, this would navigate to a group chat or open a modal
    alert("Group Chat Simulation: Imagine a bustling chat room here!");
    console.log("Simulating group chat action...");
  };

  // Placeholder: assign a random streak for each student
  const getStreak = (studentId: string) => {
    return Number.parseInt(studentId) % 2 === 0 ? 3 + Number.parseInt(studentId) : 0;
  };

  const handleSwipe = (direction: 'left' | 'right', student: Student) => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(50);
    }
    setSwipeExitDirection(direction === 'left' ? -1 : 1); 
    setSwipedIds(ids => [...ids, student.id]);
    const action = direction === 'right' ? 'connect' : 'skip';
    setSwipeHistory(hist => [...hist, { id: student.id, action }]);

    const feedbackMessage = `${action === 'connect' ? 'Connected with' : 'Skipped'} ${student.name}.`;
    setLastAction(feedbackMessage);
    setStatusMessage(feedbackMessage);

    if (action === 'connect') {
      setShowConfetti(true);
    }

    // Set focus back to the card area or a control after a swipe
    setTimeout(() => swipeCardFocusRef.current?.focus(), 100);
  };

  const handleRewind = () => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate([20, 30, 20]);
    }
    if (swipeHistory.length === 0) {
      const noHistoryMsg = "No actions to rewind.";
      setLastAction(noHistoryMsg);
      setStatusMessage(noHistoryMsg);
      if (swipeTimeout.current) clearTimeout(swipeTimeout.current);
      swipeTimeout.current = setTimeout(() => { setLastAction(null); /* setStatusMessage(null); */ }, 2000);
      return;
    }
    const last = swipeHistory[swipeHistory.length - 1];
    setSwipedIds(ids => ids.filter(id => id !== last.id));
    setSwipeHistory(hist => hist.slice(0, -1));
    const studentName = mockStudents.find(s => s.id === last.id)?.name || 'the student';
    const rewindMessage = `Rewound ${last.action === 'connect' ? 'connection with' : 'skip for'} ${studentName}.`;
    setLastAction(rewindMessage);
    setStatusMessage(rewindMessage);
    if (swipeTimeout.current) clearTimeout(swipeTimeout.current);
    swipeTimeout.current = setTimeout(() => {
      setLastAction(null);
    }, 2000);
    setTimeout(() => swipeCardFocusRef.current?.focus(), 100);
  };

  // Effect to update status message when lastAction changes (for non-rewind actions)
  useEffect(() => {
    if (lastAction && !lastAction.startsWith("Rewound")) { // Avoid double announcement for rewind
      setStatusMessage(lastAction);
      if (swipeTimeout.current) clearTimeout(swipeTimeout.current);
      swipeTimeout.current = setTimeout(() => {
        setLastAction(null);
        // setStatusMessage(null); // Optionally clear
      }, 2000); // Adjust timeout as needed
    }
  }, [lastAction]);

  const openChat = (studentId: string) => {
    if (document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }
    setSelectedStudentId(studentId);
    // Focus input field when chat opens
    setTimeout(() => chatInputRef.current?.focus(), 100);
  };

  const closeChat = () => {
    setSelectedStudentId(null);
    // Return focus to the element that opened the chat
    setTimeout(() => lastFocusedElementRef.current?.focus(), 0);
  };

  // Effect for focus trapping in chat modal
  useEffect(() => {
    if (!selectedStudent || !chatModalRef.current) {
      return;
    }

    const focusableElements = Array.from(
      chatModalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => el.offsetParent !== null); // Ensure elements are visible

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) { // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else { // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Initial focus set in openChat function
    // chatInputRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedStudent]); // Rerun when chat opens/closes

  // Reusable Student Card Component
  // Note: `onSwipe` and `drag` props are only relevant for Swipe mode
  const StudentCard = ({ 
    student, 
    isSwipeMode,
    onSwipe, // Callback for swipe action in Swipe mode
    drag, // drag controls for Swipe mode
    style // For motion.div style
  }: { 
    student: Student, 
    isSwipeMode: boolean,
    onSwipe?: (direction: 'left' | 'right') => void,
    drag?: boolean | "x" | "y",
    style?: React.CSSProperties
  }) => {
    
    const handleAction = (actionType: 'skip' | 'connect') => {
      if (onSwipe) {
        onSwipe(actionType === 'skip' ? 'left' : 'right');
      }
    };

    return (
      <motion.div
        drag={drag}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        onDragEnd={(event, info) => {
          if (drag && onSwipe) { // only if swiping is enabled
            if (info.offset.x > 100) onSwipe('right');
            else if (info.offset.x < -100) onSwipe('left');
          }
        }}
        className={cn(
          "bg-card border rounded-xl shadow-lg overflow-hidden",
          "flex flex-col", // Make card a flex container
          isSwipeMode ? "absolute w-full h-full cursor-grab active:cursor-grabbing" : "hover:shadow-xl transition-shadow duration-200"
        )}
        style={style} // Apply motion style for positioning in Swipe mode stack
        layout // Enable layout animation for grid changes
      >
        <CardHeader className="flex flex-row items-start gap-3 p-4">
          <Avatar className="h-16 w-16 border-2 border-primary/50">
            <AvatarImage src={student.avatar || undefined} alt={student.name} />
            <AvatarFallback className="text-xl bg-muted text-muted-foreground">
              {getInitials(student.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-xl font-bold tracking-tight">{student.name}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{student.year}</CardDescription>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {student.subjects.slice(0, 2).map((subject, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">{subject}</Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 pt-0 flex-grow"> {/* flex-grow to push footer down */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Interests</h4>
            <div className="flex flex-wrap gap-1.5">
              {student.interests.slice(0, 3).map((interest, index) => (
                <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">{interest}</Badge>
              ))}
              {student.interests.length > 3 && <Badge variant="outline" className="text-xs px-1.5 py-0.5">+{student.interests.length - 3} more</Badge>}
            </div>
          </div>

          {student.achievements && student.achievements.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 flex items-center">
                <FaTrophy className="mr-1.5 h-3 w-3 text-amber-500" /> Achievements
              </h4>
              <div className="flex flex-wrap gap-2 items-center">
                {student.achievements.slice(0, 3).map((ach, index) => (
                  <Badge 
                    key={ach.id} 
                    variant="default" 
                    className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 text-xs px-2 py-1 flex items-center gap-1 group"
                    title={`${ach.name} - ${ach.description} (Earned: ${new Date(ach.dateEarned).toLocaleDateString()})`}
                  >
                    <span className="text-base leading-none">{ach.icon}</span>
                    <span className="truncate group-hover:whitespace-normal group-hover:overflow-visible">{ach.name}</span>
                  </Badge>
                ))}
                {student.achievements.length > 3 && (
                   <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-dashed border-muted-foreground/50">
                     +{student.achievements.length - 3} more
                   </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {!isSwipeMode && (
          <CardFooter className="p-4 pt-2 border-t bg-muted/50">
            <Button className="w-full" onClick={() => openChat(student.id)} variant="default">
              <FaComment className="mr-2 h-4 w-4" /> View Profile / Chat
            </Button>
          </CardFooter>
        )}
        
        {/* Swipe mode controls are outside this component, rendered in the main swipe view */}
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full p-1 md:p-2 bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-slate-100 rounded-lg shadow-2xl overflow-hidden">
      {/* Header and Controls */}
      <div className="flex-shrink-0 p-3 md:p-4 border-b border-slate-700 shadow-md bg-slate-800/50 rounded-t-lg">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-400 self-center">
            Connect & Collaborate
          </h2>
          <div className="flex items-center gap-2 md:gap-3">
            {viewMode === 'grid' && (
              <div className="relative flex-grow max-w-xs">
                <Input
                  type="search"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm bg-slate-700 border-slate-600 placeholder-slate-400 text-slate-100 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                  aria-label="Search students"
                />
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            )}
            <Button
              onClick={() => {
                const newMode = viewMode === 'grid' ? 'swipe' : 'grid';
                setViewMode(newMode);
                setStatusMessage(newMode === 'swipe' ? "Swipe mode activated. Use arrow keys or swipe gestures." : "Grid view activated.");
              }}
              variant="outline"
              size="sm"
              className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-300 hover:text-sky-300 transition-all duration-150"
              aria-label={viewMode === 'grid' ? "Switch to Swipe Mode" : "Switch to Grid View"}
            >
              {viewMode === 'grid' ? "✨ Swipe Mode" : "📊 Grid View"}
            </Button>
          </div>
        </div>
      </div>

      {/* ARIA Live Region for announcements */}
      {statusMessage && (
        <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
          {statusMessage}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-grow overflow-y-auto relative p-2 md:p-4 space-y-4">
        {viewMode === 'grid' && !selectedStudentId && (
          <div className="flex flex-col gap-6"> {/* New: Main container for grid sections */}
            {/* Student Discovery Section */}
            <section aria-labelledby="student-discovery-heading">
              <h3 id="student-discovery-heading" className="text-xl font-semibold mb-4 text-sky-300">Discover Connections</h3>
              {availableStudents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {filteredStudents.map((student) => (
                    <StudentCard key={student.id} student={student} isSwipeMode={false} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8">No students match your current search or all students have been viewed.</p>
              )}
            </section>

            {/* Activity Feed and Study Group Hub Section - Rendered as a new row/area below discovery */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700/50 mt-6">
              <section aria-labelledby="activity-feed-heading">
                <h3 id="activity-feed-heading" className="text-lg font-semibold mb-3 text-sky-400">Latest Activity</h3>
                 <ActivityFeedPlaceholder />
              </section>
              <section aria-labelledby="study-group-hub-heading">
                <h3 id="study-group-hub-heading" className="text-lg font-semibold mb-3 text-teal-400">Study Groups</h3>
                <StudyGroupHubPlaceholder />
              </section>
            </div>
          </div>
        )}

        {viewMode === 'swipe' && !selectedStudentId && (
          <div ref={swipeCardFocusRef} tabIndex={-1} className="outline-none flex flex-col items-center justify-center h-full relative">
            <AnimatePresence initial={false} custom={tinderExitDirection}>
              {availableStudents.length > 0 ? (
                <StudentCard
                  key={availableStudents[0].id}
                  student={availableStudents[0]}
                  isSwipeMode={true}
                  onSwipe={(direction) => handleSwipe(direction, availableStudents[0])}
                  drag="x"
                  style={{
                    position: 'absolute', // Needed for stacking and AnimatePresence
                    width: 'calc(100% - 20px)', // Responsive width
                    maxWidth: '380px', // Max card width
                    height: 'auto', // Auto height based on content
                  }}
                />
              ) : (
                <Card className="text-center p-6 md:p-10 bg-slate-800 border-slate-700 shadow-xl rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl font-bold text-sky-400">That's everyone for now!</CardTitle>
                    <CardDescription className="text-slate-400 text-sm md:text-base mt-2">
                      You've swiped through all available student profiles. Check back later for new connections or try adjusting your search filters in grid view.
                    </CardDescription>
                  </CardHeader>
                  {swipeHistory.length > 0 && (
                     <Button onClick={handleRewind} variant="outline" className="mt-4 bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-300">
                        <FaUndo className="mr-2" /> Rewind Last Swipe
                     </Button>
                  )}
                </Card>
              )}
            </AnimatePresence>
            {availableStudents.length > 0 && (
              <div className="absolute bottom-5 md:bottom-8 flex items-center justify-center gap-3 md:gap-5 z-10 p-2 bg-black/30 backdrop-blur-sm rounded-full shadow-lg">
                <Button
                  onClick={() => handleSwipe('left', availableStudents[0])}
                  variant="default" // Changed from 'gooeyLeft'
                  size="lg"
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-3 md:p-4 shadow-md transform transition-transform hover:scale-110"
                  aria-label="Skip student"
                >
                  <FaTimes className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
                <Button
                  onClick={() => openChat(availableStudents[0].id)}
                  variant="default" // Explicitly add Chat button
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 md:p-4 shadow-md transform transition-transform hover:scale-110"
                  aria-label="Chat with student"
                >
                  <FaComment className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
                <Button
                  onClick={() => handleSwipe('right', availableStudents[0])}
                  variant="default" // Changed from 'gooeyRight'
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full p-3 md:p-4 shadow-md transform transition-transform hover:scale-110"
                  aria-label="Connect with student"
                >
                  <FaPlus className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
                {swipeHistory.length > 0 && (
                   <Button 
                     onClick={handleRewind} 
                     variant="outline" 
                     size="icon" 
                     className="bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-full p-2 md:p-3 shadow-md transform transition-transform hover:scale-110"
                     aria-label="Rewind last swipe"
                   >
                     <FaUndo className="h-4 w-4 md:h-5 md:w-5" />
                   </Button>
                )}
              </div>
            )}
            {lastAction && (
              <p className="mt-4 text-sm text-slate-400 bg-slate-700/50 px-3 py-1 rounded-md">{lastAction}</p>
            )}
          </div>
        )}

        {/* Chat Modal - Overlay */}
        <AnimatePresence>
          {selectedStudentId && selectedStudent && (
            <motion.div
              ref={chatModalRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="fixed inset-0 md:inset-auto md:bottom-0 md:right-0 md:m-4 md:max-w-md w-full h-full md:h-[70vh] md:max-h-[500px] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl flex flex-col z-50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="chat-modal-title"
            >
              <Card className="w-full max-w-lg h-[70vh] flex flex-col shadow-xl bg-card">
                  <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
                      <div className="flex items-center gap-3">
                          <Avatar>
                              <AvatarImage src={selectedStudent.avatar || undefined} alt={`${selectedStudent.name}'s avatar`} />
                              <AvatarFallback>{getInitials(selectedStudent.name)}</AvatarFallback>
                          </Avatar>
                          <CardTitle id={`chat-with-${selectedStudent.id}-title`}>Chat with {selectedStudent.name}</CardTitle>
                      </div>
                      <Button variant="ghost" size="icon" onClick={closeChat} aria-label={`Close chat with ${selectedStudent.name}`}>
                          <FaTimes aria-hidden="true" />
                      </Button>
                  </CardHeader>
                  <ScrollArea className="flex-grow p-4">
                      <ul className="space-y-3" aria-live="polite"> {/* Added ul and aria-live for new messages */}
                          {(chatMessages[selectedStudent.id] || []).map((msg, index) => (
                              <li key={index} className={`flex ${msg.sent ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`p-2 rounded-lg max-w-[70%] ${msg.sent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                      {msg.text}
                                  </div>
                              </li>
                          ))}
                      </ul>
                  </ScrollArea>
                  <CardFooter className="p-4 border-t">
                      <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); handleSendMessage(selectedStudent.id); }}>
                          <Input 
                              ref={chatInputRef} // Assign ref for focus
                              type="text" 
                              placeholder="Type a message..." 
                              value={chatMessage} 
                              onChange={(e) => setChatMessage(e.target.value)} 
                              aria-label={`Message to ${selectedStudent.name}`}
                              className="flex-grow"
                          />
                          <Button type="submit" size="icon" aria-label="Send message">
                              <FaPaperPlane aria-hidden="true" />
                          </Button>
                      </form>
                  </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
