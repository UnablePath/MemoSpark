"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { FaCalendarAlt, FaCheckCircle, FaStar } from "react-icons/fa";
import { toast } from "sonner";
import KoalaMascot from "@/components/ui/koala-mascot";

// Mock data for streaks, reminders and achievements
const initialStreak = 3;
const initialCoins = 75;

interface Reminder {
  id: string;
  taskName: string;
  dueDate: string;
  completed: boolean;
  points: number;
}

const mockReminders: Reminder[] = [
  {
    id: "1",
    taskName: "Math Assignment",
    dueDate: format(new Date(new Date().setHours(14, 30)), "p, MMM d"),
    completed: false,
    points: 10,
  },
  {
    id: "2",
    taskName: "Study Group Meeting",
    dueDate: format(new Date(new Date().setHours(16, 0)), "p, MMM d"),
    completed: false,
    points: 5,
  },
  {
    id: "3",
    taskName: "Physics Lab Report",
    dueDate: "Tomorrow, 11:59 PM",
    completed: false,
    points: 15,
  },
];

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: number;
  total?: number;
}

const achievements: Achievement[] = [
  {
    id: "taskmaster",
    name: "Task Master",
    description: "Complete 10 tasks in a row",
    icon: <FaCheckCircle className="h-6 w-6 text-primary" />,
    unlocked: false,
    progress: 3,
    total: 10,
  },
  {
    id: "earlybird",
    name: "Early Bird",
    description: "Complete 5 tasks before their due date",
    icon: <FaCalendarAlt className="h-6 w-6 text-primary" />,
    unlocked: false,
    progress: 2,
    total: 5,
  },
  {
    id: "streaker",
    name: "Streaker",
    description: "Maintain a 7-day streak",
    icon: <FaStar className="h-6 w-6 text-primary" />,
    unlocked: false,
    progress: 3,
    total: 7,
  },
];

// Stu's messages for different scenarios
const stuMessages = {
  greeting: [
    "Hey there! Ready to tackle today's tasks?",
    "G'day mate! Let's get some work done today!",
    "Hi friend! Looking forward to helping you stay on track!",
  ],
  reminder: [
    "Don't forget about your {task}. It's due {time}!",
    "Just a friendly reminder about {task} due {time}.",
    "Hello! You've got {task} coming up {time}.",
  ],
  encouragement: [
    "You're doing great! Keep up the momentum!",
    "Wow! You're on a {streak}-day streak. Amazing work!",
    "Look at you go! You're making excellent progress.",
  ],
  achievement: [
    "Congratulations! You've unlocked the {achievement} badge!",
    "Achievement unlocked: {achievement}! Well done!",
    "You've earned the {achievement} badge! Keep it up!",
  ],
  tap: [
    "Hi there! Need any help?",
    "Hey! Click on a task to complete it!",
    "Remember to keep your streak going!",
  ],
};

const getRandomMessage = (category: keyof typeof stuMessages, replacements?: Record<string, string>) => {
  const messages = stuMessages[category];
  let message = messages[Math.floor(Math.random() * messages.length)];

  if (replacements) {
    for (const [key, value] of Object.entries(replacements)) {
      message = message.replace(`{${key}}`, value);
    }
  }

  return message;
};

const RemindersTab = () => {
  const [streak, setStreak] = useState(initialStreak);
  const [coins, setCoins] = useState(initialCoins);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showingStuMessage, setShowingStuMessage] = useState(false);
  const [stuMessage, setStuMessage] = useState("");
  const [stuMessageForSR, setStuMessageForSR] = useState<string>("");
  const [isStuTalking, setIsStuTalking] = useState(false);
  const [stuAnimation, setStuAnimation] = useState<"idle" | "talking" | "excited" | "sleeping">("idle");
  const [stuReady, setStuReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders);

  // Show Stu's greeting message when the component mounts
  useEffect(() => {
    // Delay to make Stu appear as loading/waking up
    const wakeupTimer = setTimeout(() => {
      setStuReady(true);

      const messageTimer = setTimeout(() => {
        const message = getRandomMessage("greeting");
        setStuMessage(message);
        setStuMessageForSR(message);
        setShowingStuMessage(true);
        setStuAnimation("talking");

        setTimeout(() => {
          setStuAnimation("idle");
        }, 2000);

        setTimeout(() => {
          setShowingStuMessage(false);
        }, 5000);
      }, 500);

      return () => clearTimeout(messageTimer);
    }, 1000);

    return () => clearTimeout(wakeupTimer);
  }, []);

  const handleStuClick = () => {
    if (showingStuMessage) return;

    const message = getRandomMessage("tap");
    setStuMessage(message);
    setStuMessageForSR(message);
    setShowingStuMessage(true);
    setStuAnimation("excited");

    setTimeout(() => {
      setStuAnimation("idle");
    }, 1500);

    setTimeout(() => {
      setShowingStuMessage(false);
    }, 3000);
  };

  const completeReminder = (id: string) => {
    setReminders(prev =>
      prev.map(reminder =>
        reminder.id === id
          ? { ...reminder, completed: true }
          : reminder
      )
    );

    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
      setCoins(prev => prev + reminder.points);

      const message = getRandomMessage("encouragement", { streak: streak.toString() });
      setStuMessage(message);
      setStuMessageForSR(message);
      setShowingStuMessage(true);
      setStuAnimation("excited");

      setTimeout(() => {
        setStuAnimation("idle");
      }, 2000);

      setTimeout(() => {
        setShowingStuMessage(false);
      }, 5000);

      toast(`+${reminder.points} coins earned!`, {
        description: "Keep completing tasks to earn more!",
      });
    }
  };

  // Animation variants for Stu
  const koalaVariants = {
    idle: {
      y: [0, -2, 0],
      transition: { duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" as "loop" }
    },
    talking: {
      y: [0, -5, 0, -3, 0],
      transition: { duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" as "loop" }
    },
    excited: {
      y: [0, -10, 0, -8, 0],
      rotate: [-5, 5, -5, 5, 0],
      transition: { duration: 0.5, repeat: 3, repeatType: "loop" as "loop" }
    },
    sleeping: {
      y: 0,
      rotate: [0, 2, 0],
      transition: { duration: 3, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" as "loop" }
    },
    loading: {
      opacity: [0.3, 1],
      scale: [0.9, 1],
      transition: { duration: 1, repeat: 0 }
    }
  };

  // Modify koalaVariants if prefersReducedMotion is true, e.g., by shortening durations or removing movement
  const getDynamicKoalaVariants = () => {
    if (prefersReducedMotion) {
      return {
        idle: { opacity: 1 }, // No movement
        talking: { opacity: 1 }, // No movement
        excited: { 
          scale: [1, 1.05, 1],
          transition: { duration: 0.3, repeat: 1 }
        }, // Minimal excitement
        sleeping: { opacity: 0.7 }, // No movement
        loading: { opacity: [0.3, 1], scale: [0.9, 1], transition: { duration: 0.5 } }
      };
    }
    return koalaVariants; // Original variants with full motion
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden p-4">
      {/* ARIA Live Region for Stu's messages and other status */}
      <div aria-live="polite" className="sr-only">
        {stuMessageForSR}
      </div>

      {/* Header with Title, streak and coins */}
      <div className="mb-4 pb-4 border-b flex-shrink-0">
        <h1 className="text-2xl font-bold mb-2 text-center sm:text-left">Reminders & Achievements</h1>
        <div className="flex flex-col sm:flex-row justify-around items-center gap-4 text-center p-2 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm text-muted-foreground">Current Streak</p>
            <p className="text-2xl font-bold text-primary" aria-live="polite" aria-atomic="true">{streak} days</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Study Coins</p>
            <p className="text-2xl font-bold text-yellow-500" aria-live="polite" aria-atomic="true">{coins} 🪙</p>
          </div>
          <Button onClick={() => setShowAchievements(true)} variant="outline">
             <FaStar className="mr-2 h-4 w-4" aria-hidden="true" /> View Achievements
          </Button>
        </div>
      </div>

      {/* Stu Mascot Section - Centered */}
      <div className="flex flex-col items-center justify-center relative py-4 md:py-6 flex-shrink-0">
        {/* Interactive Button for Stu */}
        <Button 
          variant="ghost" 
          className="p-0 w-32 h-32 sm:w-40 sm:h-40 block rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={handleStuClick} 
          aria-label="Interact with Stu, your study mascot"
        >
          <motion.div 
            variants={getDynamicKoalaVariants()} 
            animate={stuReady ? stuAnimation : "loading"} 
            className="w-full h-full flex items-center justify-center cursor-pointer"
          >
            <KoalaMascot size="100%" />
          </motion.div>
        </Button>
        {/* Stu's Message Bubble */}
        {showingStuMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 10 }} 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-auto max-w-xs sm:max-w-sm md:max-w-md p-3 bg-background border shadow-lg rounded-md text-sm text-center z-10 mb-[-20px] sm:mb-[-24px]" // Positioned below Stu, adjust mb as needed
          >
            {stuMessage}
          </motion.div>
        )}
        {!stuReady && <p className="text-sm text-muted-foreground mt-2">Stu is waking up...</p>}
      </div>

      {/* Reminders List Section - Takes remaining space */}
      <div className="flex-grow flex flex-col overflow-hidden mt-4">
        <h2 className="text-xl font-semibold mb-3 px-1 text-center sm:text-left flex-shrink-0">Your Reminders</h2>
        {reminders.length === 0 ? (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-muted-foreground text-center py-6">No reminders scheduled. Add some from your tasks!</p>
          </div>
        ) : (
          <ul className="space-y-3 overflow-y-auto pr-2 flex-grow">
            {reminders.map((reminder) => (
              <li key={reminder.id} className={`p-3 rounded-lg shadow transition-all flex items-center gap-3 ${reminder.completed ? 'bg-muted/50 opacity-70' : 'bg-card border'}`}>
                <div className="flex-grow">
                  <h3 className={`font-medium ${reminder.completed ? 'line-through' : ''}`}>{reminder.taskName}</h3>
                  <p className="text-xs text-muted-foreground">
                    Due: {reminder.dueDate} - {reminder.points} points
                  </p>
                </div>
                {!reminder.completed && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => completeReminder(reminder.id)}
                    aria-label={`Complete reminder: ${reminder.taskName}`}
                    className="whitespace-nowrap bg-green-500 hover:bg-green-600 text-white border-green-600"
                  >
                    <FaCheckCircle className="mr-2 h-4 w-4" aria-hidden="true"/> Mark as Done
                  </Button>
                )}
                {reminder.completed && (
                   <FaCheckCircle className="h-6 w-6 text-green-500" aria-label="Reminder completed" role="img" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Achievements Dialog */}
      {showAchievements && (
        <Dialog open={showAchievements} onOpenChange={setShowAchievements}>
          <DialogContent>
            <DialogHeader><DialogTitle>Your Achievements</DialogTitle></DialogHeader>
            <p>Achievements list will go here...</p>
            <DialogFooter><Button onClick={() => setShowAchievements(false)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default RemindersTab;
