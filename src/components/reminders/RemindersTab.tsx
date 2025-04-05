"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { FaCalendarAlt, FaCheckCircle, FaStar } from "react-icons/fa";
import { toast } from "sonner";

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
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showingStuMessage, setShowingStuMessage] = useState(false);
  const [stuMessage, setStuMessage] = useState("");
  const [isStuTalking, setIsStuTalking] = useState(false);

  // Show Stu's greeting message when the component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      const message = getRandomMessage("greeting");
      setStuMessage(message);
      setShowingStuMessage(true);
      setIsStuTalking(true);

      setTimeout(() => {
        setIsStuTalking(false);
      }, 2000);

      setTimeout(() => {
        setShowingStuMessage(false);
      }, 5000);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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

      // Show Stu's reaction
      const message = getRandomMessage("encouragement", { streak: streak.toString() });
      setStuMessage(message);
      setShowingStuMessage(true);
      setIsStuTalking(true);

      setTimeout(() => {
        setIsStuTalking(false);
      }, 2000);

      setTimeout(() => {
        setShowingStuMessage(false);
      }, 5000);

      toast(`+${reminder.points} coins earned!`, {
        description: "Keep completing tasks to earn more!",
      });
    }
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Header with streak and coins */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="bg-primary/10 rounded-full p-2">
              <FaStar className="text-primary h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="font-semibold">{streak} days</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowAchievements(true)}
              className="text-sm"
            >
              Achievements
            </Button>
            <div className="bg-secondary rounded-full px-3 py-1 flex items-center">
              <span className="font-bold mr-1">{coins}</span>
              <span className="text-xs">coins</span>
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold">Reminders with Stu</h1>
      </div>

      {/* Reminders content */}
      <div className="flex-1 overflow-auto p-4 relative">
        <div className="space-y-4">
          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <Card key={reminder.id} className={`shadow-sm ${reminder.completed ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className={`font-medium ${reminder.completed ? 'line-through' : ''}`}>
                          {reminder.taskName}
                        </h3>
                        <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                          +{reminder.points} coins
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Due: {reminder.dueDate}</p>
                    </div>

                    {!reminder.completed && (
                      <Button
                        onClick={() => completeReminder(reminder.id)}
                        size="sm"
                      >
                        Complete
                      </Button>
                    )}

                    {reminder.completed && (
                      <FaCheckCircle className="text-primary h-5 w-5" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No reminders set. Add tasks with reminders from the Tasks tab.
            </div>
          )}
        </div>
      </div>

      {/* Stu the koala - fixed at the bottom */}
      <div className="relative h-40 border-t bg-secondary/10">
        <AnimatePresence>
          {showingStuMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg max-w-xs z-10"
            >
              <div className="relative">
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                  <div className="w-4 h-4 bg-white dark:bg-gray-800 rotate-45" />
                </div>
                <p>{stuMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          <motion.div
            animate={isStuTalking ? {
              y: [0, -5, 0, -3, 0],
              transition: { duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" }
            } : {}}
            className="relative"
          >
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
              <span className="text-4xl">🐨</span>
            </div>
            <div className="text-center mt-1 font-semibold">Stu</div>
          </motion.div>
        </div>
      </div>

      {/* Achievements Dialog */}
      <Dialog open={showAchievements} onOpenChange={setShowAchievements}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Achievements</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`flex items-center p-3 rounded-lg ${
                  achievement.unlocked
                    ? 'bg-primary/10'
                    : 'bg-muted'
                }`}
              >
                <div className="mr-4">{achievement.icon}</div>
                <div className="flex-1">
                  <h3 className="font-medium">{achievement.name}</h3>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  {achievement.progress !== undefined && achievement.total !== undefined && (
                    <div className="mt-2">
                      <div className="h-2 w-full bg-secondary/30 rounded-full">
                        <div
                          className="h-2 bg-primary rounded-full"
                          style={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {achievement.progress} / {achievement.total}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAchievements(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RemindersTab;
