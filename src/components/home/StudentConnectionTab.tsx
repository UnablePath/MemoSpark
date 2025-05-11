"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaSearch, FaPlus, FaComment, FaTimes, FaPaperPlane, FaUsers } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StreakTracker } from '@/components/gamification/StreakTracker';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import confetti from 'canvas-confetti';

// Mock data for student profiles
type Student = {
  id: string;
  name: string;
  year: string;
  subjects: string[];
  interests: string[];
  avatar: string | null;
};

const mockStudents: Student[] = [
  {
    id: "1",
    name: "Alex Johnson",
    year: "Sophomore",
    subjects: ["Mathematics", "Physics"],
    interests: ["Chess", "Hiking"],
    avatar: null,
  },
  {
    id: "2",
    name: "Morgan Lee",
    year: "Junior",
    subjects: ["Computer Science", "Data Science"],
    interests: ["Gaming", "Programming"],
    avatar: null,
  },
  {
    id: "3",
    name: "Taylor Kim",
    year: "Freshman",
    subjects: ["Biology", "Chemistry"],
    interests: ["Music", "Swimming"],
    avatar: null,
  },
  {
    id: "4",
    name: "Jordan Smith",
    year: "Senior",
    subjects: ["Psychology", "Sociology"],
    interests: ["Reading", "Yoga"],
    avatar: null,
  },
];

export default function StudentConnectionTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<{[key: string]: {text: string, sent: boolean}[]}>({});
  const [viewMode, setViewMode] = useState<'grid' | 'tinder'>('grid');
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
  const tinderCardFocusRef = useRef<HTMLDivElement>(null); // For focusing the card area
  const chatInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const chatModalRef = useRef<HTMLDivElement>(null); // Ref for the chat modal main div
  const [tinderExitDirection, setTinderExitDirection] = useState<number>(0);

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
    return parseInt(studentId) % 2 === 0 ? 3 + parseInt(studentId) : 0;
  };

  const handleSwipe = (direction: 'left' | 'right', student: Student) => {
    setTinderExitDirection(direction === 'left' ? -1 : 1); 
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
    setTimeout(() => tinderCardFocusRef.current?.focus(), 100); // Allow animation to start
  };

  const handleRewind = () => {
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
    setTimeout(() => tinderCardFocusRef.current?.focus(), 100);
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

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* ARIA Live Region for status messages */}
      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('grid')}
          aria-pressed={viewMode === 'grid'}
        >
          Grid/List
        </Button>
        <Button
          variant={viewMode === 'tinder' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('tinder')}
          aria-pressed={viewMode === 'tinder'}
        >
          Tinder Mode
        </Button>
      </div>
      {/* Search and Group Chat Button */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-grow">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search students by name, subject, interest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSimulateGroupChat} variant="outline" size="icon" aria-label="Simulate Group Chat">
          <FaUsers className="h-5 w-5" aria-hidden="true" /> {/* Icon hidden as button has aria-label */}
        </Button>
      </div>

      {/* Student List / Chat View */}
      {viewMode === 'grid' && !selectedStudent && (
        <ScrollArea className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <Card
                  key={student.id}
                  className="hover:shadow-md transition-shadow flex flex-col"
                  role="article"
                  aria-labelledby={`student-name-${student.id}`}
                  tabIndex={-1}
                >
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className="relative">
                      <Avatar className={getStreak(student.id) ? 'ring-2 ring-orange-400 ring-offset-2' : ''}>
                        <AvatarImage src={student.avatar || undefined} alt={`${student.name}'s avatar`} />
                        <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                      </Avatar>
                      {getStreak(student.id) > 0 && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2" aria-label={`Current streak: ${getStreak(student.id)} days`}>
                          <StreakTracker currentStreak={getStreak(student.id)} />
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle id={`student-name-${student.id}`}>{student.name}</CardTitle>
                      <CardDescription>{student.year}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2 flex-grow">
                    <div className="mb-2">
                      <h4 className="text-sm font-medium mb-1">Subjects:</h4>
                      <div className="flex flex-wrap gap-1">
                        {student.subjects.map((subj) => <Badge key={subj} variant="secondary">{subj}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Interests:</h4>
                      <div className="flex flex-wrap gap-1">
                        {student.interests.map((interest) => <Badge key={interest} variant="outline">{interest}</Badge>)}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => alert(`Connect with ${student.name} (not implemented)`)} aria-label={`Connect with ${student.name}`}>
                      <FaPlus className="mr-2 h-4 w-4" aria-hidden="true" /> Connect
                    </Button>
                    <Button variant="default" size="sm" onClick={() => openChat(student.id)} aria-label={`Message ${student.name}`}>
                      <FaComment className="mr-2 h-4 w-4" aria-hidden="true" /> Message
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground col-span-full text-center py-10">No students found matching your search.</p>
            )}
          </div>
        </ScrollArea>
      )}
      {viewMode === 'tinder' && !selectedStudent && (
        <div className="flex flex-col items-center justify-center flex-grow relative w-full h-full">
          <div className="absolute top-0 right-0 m-2">
            <Button onClick={handleRewind} disabled={swipeHistory.length === 0} variant="outline" aria-label="Rewind last swipe">
              Undo Last Swipe
            </Button>
          </div>

          {lastAction && (
            <div className={`absolute top-10 p-2 rounded-md shadow-lg text-sm font-semibold 
              ${lastAction.includes('Connected') ? 'bg-green-100 text-green-700' : 
                lastAction.includes('Skipped') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}
              animate-fade-in-out`}
            >
              {lastAction}
            </div>
          )}

          <div 
            ref={tinderCardFocusRef} 
            tabIndex={-1} 
            className="relative w-full max-w-xs h-[450px] flex items-center justify-center outline-none mt-8" 
            aria-label={availableStudents.length > 0 && availableStudents[0] ? `Current student profile: ${availableStudents[0].name}` : "No more students to connect with"}
            role="region" 
            aria-live="off" 
          >
            <AnimatePresence initial={false} custom={tinderExitDirection} mode="wait">
              {availableStudents.length > 0 && availableStudents[0] ? (
                availableStudents.slice(0, 1).map((student) => ( 
                  <motion.div
                    key={student.id} 
                    className="absolute w-full h-full cursor-grab"
                    variants={cardVariants} // Use the variants object
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    custom={tinderExitDirection} // Pass custom prop to variants
                    drag="x"
                    dragConstraints={{ left: -200, right: 200, top: 0, bottom: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, { offset, velocity }) => {
                      const swipeVelocity = Math.abs(offset.x) * velocity.x;
                      if (swipeVelocity < -10000) { 
                        handleSwipe('left', student);
                      } else if (swipeVelocity > 10000) { 
                        handleSwipe('right', student);
                      }
                    }}
                    role="article"
                    aria-labelledby={`tinder-student-name-${student.id}`}
                  >
                    <Card className="w-full h-full flex flex-col shadow-xl border border-border">
                      <CardHeader className="flex-shrink-0">
                        <div className="flex items-center gap-3">
                           <Avatar className={`w-16 h-16 ${getStreak(student.id) ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}>
                            <AvatarImage src={student.avatar || undefined} alt={`${student.name}'s avatar`} />
                            <AvatarFallback className="text-2xl">{getInitials(student.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle id={`tinder-student-name-${student.id}`}>{student.name}</CardTitle>
                            <CardDescription>{student.year}</CardDescription>
                          </div>
                        </div>
                         {getStreak(student.id) > 0 && (
                          <div className="mt-2 flex justify-center" aria-label={`Current streak: ${getStreak(student.id)} days`}>
                            <StreakTracker currentStreak={getStreak(student.id)} />
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="flex-grow overflow-y-auto p-4 space-y-3">
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Subjects:</h4>
                          <div className="flex flex-wrap gap-1">
                            {student.subjects.map(subj => <Badge key={subj} variant="secondary">{subj}</Badge>)}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Interests:</h4>
                          <div className="flex flex-wrap gap-1">
                            {student.interests.map(interest => <Badge key={interest} variant="outline">{interest}</Badge>)}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex-shrink-0 p-2 border-t">
                        <div className="flex justify-around w-full">
                          <Button variant="destructive" size="lg" onClick={() => handleSwipe('left', student)} aria-label={`Skip ${student.name}`}>
                            Skip <FaTimes className="ml-2 h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button className="bg-green-600 hover:bg-green-700 text-white" size="lg" onClick={() => handleSwipe('right', student)} aria-label={`Connect with ${student.name}`}>
                            Connect <FaPlus className="ml-2 h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <FaUsers className="mx-auto h-12 w-12 mb-2" aria-hidden="true" />
                  <p>No more students to connect with right now. Check back later!</p>
                  {swipeHistory.length > 0 && (
                     <p className="mt-2 text-sm">You can still rewind your last action.</p>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Chat View (visible when a student is selected) */}
      {selectedStudent && (
        <div 
          ref={chatModalRef} // Add ref to the modal container
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`chat-with-${selectedStudent.id}-title`}
          // aria-describedby={`chat-with-${selectedStudent.id}-description`} // Optional description
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
        </div>
      )}
    </div>
  );
}
