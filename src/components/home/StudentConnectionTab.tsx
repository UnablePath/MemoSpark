"use client";

import React, { useState, useMemo, useRef, useEffect, Suspense, lazy } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FaSearch, FaPlus, FaComment, FaTimes, FaUndo } from "react-icons/fa";
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityFeedPlaceholder } from './ActivityFeedPlaceholder';
import { StudyGroupHubPlaceholder } from './StudyGroupHubPlaceholder';
import type { Student, SwipeHistoryItem } from '@/types/student';
import { useStudentData, useLocalStorageState, useChatMessages } from '@/hooks/useStudentConnection';

// Lazy load heavy components for better performance
const StudentCard = lazy(() => import('./StudentCard'));
const ChatModal = lazy(() => import('./ChatModal'));

// Dynamic import for confetti to reduce bundle size
const loadConfetti = () => import('canvas-confetti');

interface StudentConnectionTabProps {
  onViewModeChange?: (isSwipeMode: boolean) => void;
}

// Loading component
const LoadingSpinner = React.memo(() => (
  <div className="flex items-center justify-center h-48">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <span className="ml-2 text-muted-foreground">Loading students...</span>
  </div>
));

// Error boundary component
const ErrorDisplay = React.memo(({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <Card className="p-6 text-center border-destructive">
    <CardContent>
      <p className="text-destructive mb-4">{error}</p>
      <Button onClick={onRetry} variant="outline">
        Try Again
      </Button>
    </CardContent>
  </Card>
));

export default function StudentConnectionTab({ onViewModeChange }: StudentConnectionTabProps) {
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'swipe'>('grid');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  // Local storage state using custom hooks
  const [swipedIds, setSwipedIds] = useLocalStorageState<string[]>('swipedIds', []);
  const [swipeHistory, setSwipeHistory] = useLocalStorageState<SwipeHistoryItem[]>('swipeHistory', []);

  // Chat functionality
  const { chatMessages, sendMessage, getMessagesForStudent } = useChatMessages();

  // Refs
  const swipeTimeout = useRef<NodeJS.Timeout | null>(null);
  const swipeCardFocusRef = useRef<HTMLDivElement>(null);
  const [tinderExitDirection, setSwipeExitDirection] = useState<number>(0);

  // Data loading with error handling
  const { students, loading, error, retryLoad } = useStudentData();

  // Notify parent about view mode changes
  useEffect(() => {
    onViewModeChange?.(viewMode === 'swipe');
  }, [viewMode, onViewModeChange]);

  // Optimized memoized computations for performance
  const filteredStudents = useMemo(() => {
    if (!students?.length) return [];
    
    if (!searchQuery.trim()) return students;
    
    const query = searchQuery.toLowerCase();
    return students.filter(student => {
      const nameMatch = student.name?.toLowerCase().includes(query);
      const subjectMatch = student.subjects?.some(subject => 
        subject?.toLowerCase().includes(query)
      );
      const interestMatch = student.interests?.some(interest => 
        interest?.toLowerCase().includes(query)
      );
      return nameMatch || subjectMatch || interestMatch;
    });
  }, [students, searchQuery]);

  const selectedStudent = useMemo(() => 
    students?.find(student => student.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const availableStudents = useMemo(() => 
    filteredStudents?.filter(s => !swipedIds.includes(s.id)) || [],
    [filteredStudents, swipedIds]
  );

  // Optimized confetti effect with dynamic import
  useEffect(() => {
    if (showConfetti) {
      loadConfetti().then((confetti) => {
      try {
          confetti.default({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      } catch (error) {
        console.warn('Confetti effect failed:', error);
      }
      }).catch(() => {
        console.warn('Failed to load confetti module');
      });
      
      const timer = setTimeout(() => setShowConfetti(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  // Status message timeout
  useEffect(() => {
    if (lastAction && !lastAction.startsWith("Rewound")) {
      setStatusMessage(lastAction);
      if (swipeTimeout.current) clearTimeout(swipeTimeout.current);
      swipeTimeout.current = setTimeout(() => {
        setLastAction(null);
      }, 2000);
    }
  }, [lastAction]);

  // Event handlers with proper error handling
  const handleSwipe = (direction: 'left' | 'right', student: Student) => {
    try {
      if (typeof navigator?.vibrate === 'function') {
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

    setTimeout(() => swipeCardFocusRef.current?.focus(), 100);
    } catch (error) {
      console.error('Error handling swipe:', error);
      setStatusMessage('An error occurred while processing the swipe.');
    }
  };

  const handleRewind = () => {
    try {
      if (typeof navigator?.vibrate === 'function') {
      navigator.vibrate([20, 30, 20]);
    }
      
    if (swipeHistory.length === 0) {
      const noHistoryMsg = "No actions to rewind.";
      setLastAction(noHistoryMsg);
      setStatusMessage(noHistoryMsg);
      if (swipeTimeout.current) clearTimeout(swipeTimeout.current);
        swipeTimeout.current = setTimeout(() => setLastAction(null), 2000);
      return;
    }
      
    const last = swipeHistory[swipeHistory.length - 1];
    setSwipedIds(ids => ids.filter(id => id !== last.id));
    setSwipeHistory(hist => hist.slice(0, -1));
      
      const studentName = students?.find(s => s.id === last.id)?.name || 'the student';
    const rewindMessage = `Rewound ${last.action === 'connect' ? 'connection with' : 'skip for'} ${studentName}.`;
    setLastAction(rewindMessage);
    setStatusMessage(rewindMessage);
      
      if (swipeTimeout.current) clearTimeout(swipeTimeout.current);
      swipeTimeout.current = setTimeout(() => setLastAction(null), 2000);
      setTimeout(() => swipeCardFocusRef.current?.focus(), 100);
    } catch (error) {
      console.error('Error handling rewind:', error);
      setStatusMessage('An error occurred while rewinding.');
    }
  };

  const openChat = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  const closeChat = () => {
    setSelectedStudentId(null);
  };

  const handleSendMessage = (message: string) => {
    if (selectedStudentId) {
      sendMessage(selectedStudentId, message);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full p-4 bg-background text-foreground rounded-lg overflow-hidden">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col h-full p-4 bg-background text-foreground rounded-lg overflow-hidden">
        <ErrorDisplay error={error} onRetry={retryLoad} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 bg-background text-foreground rounded-lg overflow-hidden">
      {/* Header and Controls */}
      <div className="flex-shrink-0 p-4 border-b border-border shadow-md bg-muted/50 rounded-lg mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                      <h2 className="text-xl md:text-2xl font-bold text-primary self-center">
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
                  className="pl-9 pr-3 py-2 text-sm bg-background border-border placeholder-muted-foreground text-foreground rounded-md focus:ring-primary focus:border-primary"
                  aria-label="Search students"
                />
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
              className="bg-background hover:bg-muted border-border text-foreground hover:text-primary transition-all duration-150"
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
        <Suspense fallback={<LoadingSpinner />}>
        {viewMode === 'grid' && !selectedStudentId && (
            <GridView 
              availableStudents={availableStudents}
              filteredStudents={filteredStudents}
              onOpenChat={openChat}
            />
          )}

          {viewMode === 'swipe' && !selectedStudentId && (
            <SwipeView
              availableStudents={availableStudents}
              swipeHistory={swipeHistory}
              onSwipe={handleSwipe}
              onRewind={handleRewind}
              onOpenChat={openChat}
              lastAction={lastAction}
              swipeCardFocusRef={swipeCardFocusRef}
              tinderExitDirection={tinderExitDirection}
            />
          )}

          {selectedStudentId && selectedStudent && (
            <ChatModal
              student={selectedStudent}
              messages={getMessagesForStudent(selectedStudentId)}
              onSendMessage={handleSendMessage}
              onClose={closeChat}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}

// Extracted components for better organization and performance
const GridView = React.memo(({ 
  availableStudents, 
  filteredStudents, 
  onOpenChat 
}: {
  availableStudents: Student[];
  filteredStudents: Student[];
  onOpenChat: (id: string) => void;
}) => (
  <div className="flex flex-col gap-6">
            <section aria-labelledby="student-discovery-heading">
      <h3 id="student-discovery-heading" className="text-xl font-semibold mb-4 text-primary">
        Discover Connections
      </h3>
              {availableStudents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {filteredStudents.map((student) => (
            <Suspense key={student.id} fallback={<div className="h-48 bg-muted animate-pulse rounded-lg" />}>
              <StudentCard 
                student={student} 
                isSwipeMode={false} 
                onOpenChat={() => onOpenChat(student.id)} 
              />
            </Suspense>
                  ))}
                </div>
              ) : (
        <p className="text-center text-muted-foreground py-8">
          No students match your current search or all students have been viewed.
        </p>
              )}
            </section>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50 mt-6">
              <section aria-labelledby="activity-feed-heading">
        <h3 id="activity-feed-heading" className="text-lg font-semibold mb-3 text-primary">
          Latest Activity
        </h3>
                 <ActivityFeedPlaceholder />
              </section>
              <section aria-labelledby="study-group-hub-heading">
        <h3 id="study-group-hub-heading" className="text-lg font-semibold mb-3 text-primary">
          Study Groups
        </h3>
                <StudyGroupHubPlaceholder />
              </section>
            </div>
          </div>
));

const SwipeView = React.memo(({
  availableStudents,
  swipeHistory,
  onSwipe,
  onRewind,
  onOpenChat,
  lastAction,
  swipeCardFocusRef,
  tinderExitDirection
}: {
  availableStudents: Student[];
  swipeHistory: SwipeHistoryItem[];
  onSwipe: (direction: 'left' | 'right', student: Student) => void;
  onRewind: () => void;
  onOpenChat: (id: string) => void;
  lastAction: string | null;
  swipeCardFocusRef: React.RefObject<HTMLDivElement | null>;
  tinderExitDirection: number;
}) => (
          <div ref={swipeCardFocusRef} tabIndex={-1} className="outline-none flex flex-col items-center justify-center h-full relative">
            <AnimatePresence initial={false} custom={tinderExitDirection}>
              {availableStudents.length > 0 ? (
        <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
                <StudentCard
                  key={availableStudents[0].id}
                  student={availableStudents[0]}
                  isSwipeMode={true}
            onSwipe={(direction) => onSwipe(direction, availableStudents[0])}
                  drag="x"
                  style={{
              position: 'absolute',
              width: 'calc(100% - 20px)',
              maxWidth: '380px',
              height: 'auto',
                  }}
                />
        </Suspense>
              ) : (
        <Card className="text-center p-6 md:p-10 bg-card border shadow-xl rounded-xl">
                  <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-bold text-primary">
              That's everyone for now!
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm md:text-base mt-2">
                      You've swiped through all available student profiles. Check back later for new connections or try adjusting your search filters in grid view.
                    </CardDescription>
                  </CardHeader>
                  {swipeHistory.length > 0 && (
            <Button onClick={onRewind} variant="outline" className="mt-4">
                        <FaUndo className="mr-2" /> Rewind Last Swipe
                     </Button>
                  )}
                </Card>
              )}
            </AnimatePresence>
    
            {availableStudents.length > 0 && (
              <div className="absolute bottom-5 md:bottom-8 flex items-center justify-center gap-3 md:gap-5 z-10 p-2 bg-black/30 backdrop-blur-sm rounded-full shadow-lg">
                <Button
          onClick={() => onSwipe('left', availableStudents[0])}
          variant="default"
                  size="lg"
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-3 md:p-4 shadow-md transform transition-transform hover:scale-110"
                  aria-label="Skip student"
                >
                  <FaTimes className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
                <Button
          onClick={() => onOpenChat(availableStudents[0].id)}
          variant="default"
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 md:p-4 shadow-md transform transition-transform hover:scale-110"
                  aria-label="Chat with student"
                >
                  <FaComment className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
                <Button
          onClick={() => onSwipe('right', availableStudents[0])}
          variant="default"
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full p-3 md:p-4 shadow-md transform transition-transform hover:scale-110"
                  aria-label="Connect with student"
                >
                  <FaPlus className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
                {swipeHistory.length > 0 && (
                   <Button 
            onClick={onRewind} 
                     variant="outline" 
                     size="icon" 
            className="bg-muted hover:bg-muted/80 rounded-full p-2 md:p-3 shadow-md transform transition-transform hover:scale-110"
                     aria-label="Rewind last swipe"
                   >
                     <FaUndo className="h-4 w-4 md:h-5 md:w-5" />
                   </Button>
                )}
              </div>
            )}
    
            {lastAction && (
      <p className="mt-4 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-md">
        {lastAction}
      </p>
            )}
          </div>
));

GridView.displayName = 'GridView';
SwipeView.displayName = 'SwipeView';
LoadingSpinner.displayName = 'LoadingSpinner';
ErrorDisplay.displayName = 'ErrorDisplay';
