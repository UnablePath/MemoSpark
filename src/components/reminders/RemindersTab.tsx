"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, isPast, isToday } from "date-fns";
import { FaCalendarAlt, FaCheckCircle, FaStar, FaInfoCircle, FaPlus } from "react-icons/fa";
import { toast } from "sonner";
import { KoalaMascot } from "@/components/ui/koala-mascot";
import { cn } from "@/lib/utils";
import { useReminders } from "@/hooks/useReminders";
import { useAchievements } from "@/hooks/useAchievements";
import { checkAchievementProgress } from "@/lib/supabase/client";
import { RemindersSkeleton } from "./RemindersSkeleton";
import type { Reminder } from "@/types/reminders";
import { useAuth } from "@clerk/nextjs";

// Stu's messages (can be externalized)
const stuMessages = {
    greeting: "Ready to crush some goals today?",
    noReminders: "No reminders yet. Let's add one!",
    reminderDue: "Don't forget, {title} is due today!",
    encouragement: "Awesome job! Keep that momentum going!",
    achievement: "Woohoo! New achievement unlocked!",
    tap: "Need a tip? Just ask!"
};

const RemindersTab = () => {
    const { userId, getToken } = useAuth();
    const { reminders, loading, error, editReminder, addReminder } = useReminders();
    const { userStats, reload: reloadAchievements } = useAchievements();

    const [stuMessage, setStuMessage] = useState("");
    const [stuAnimation, setStuAnimation] = useState<"idle" | "talking" | "excited">("idle");
    const [showAchievementsDialog, setShowAchievementsDialog] = useState(false);

    const showStuMessage = (message: string, animation: "talking" | "excited" = "talking", duration = 3000) => {
        setStuMessage(message);
        setStuAnimation(animation);
        setTimeout(() => setStuAnimation("idle"), duration);
    };

    useEffect(() => {
        if (!loading) {
            const upcoming = reminders.find(r => !r.completed && isToday(new Date(r.due_date)));
            if (upcoming) {
                showStuMessage(stuMessages.reminderDue.replace("{title}", upcoming.title));
            } else if (reminders.length === 0) {
                showStuMessage(stuMessages.noReminders);
            } else {
                showStuMessage(stuMessages.greeting);
            }
        }
    }, [loading, reminders]);
    
    const handleCompleteReminder = async (reminder: Reminder) => {
        if (!userId) return;
        await editReminder(reminder.id, { completed: true });
        toast.success(`Completed: "${reminder.title}"`, { description: `+${reminder.points || 0} points! Great work!` });
        try {
            const token = await getToken({ template: 'supabase-integration' });
            await checkAchievementProgress(userId, { type: 'reminder_completed', payload: { ...reminder } }, () => Promise.resolve(token));
            showStuMessage(stuMessages.achievement, "excited", 4000);
            reloadAchievements();
        } catch (e) {
            console.error("Failed to check achievement progress:", e);
            showStuMessage(stuMessages.encouragement, "excited");
        }
    };
    
    if (loading) return <RemindersSkeleton />;
    if (error) return <div className="flex items-center justify-center h-full text-red-500"><FaInfoCircle className="mr-4"/>Error: {error.message}</div>;

    return (
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
            {/* Left Column: Stu and Stats */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                <Card className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-muted/30">
                    <motion.div
                        animate={stuAnimation}
                        variants={{
                            idle: { y: [0, -5, 0], transition: { duration: 2, repeat: Infinity } },
                            talking: { y: [0, -8, 0], transition: { duration: 0.5, repeat: Infinity } },
                            excited: { scale: [1, 1.1, 1], rotate: [-5, 5, -5, 0], transition: { duration: 0.5 } }
                        }}
                        onClick={() => showStuMessage(stuMessages.tap, "excited")}
                    >
                        <KoalaMascot size="lg" />
                    </motion.div>
                    <AnimatePresence>
                        {stuMessage && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-4 font-semibold text-lg text-primary"
                            >
                                {stuMessage}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Your Stats</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between"><span>Total Points:</span> <span className="font-bold">{userStats?.total_points || 0}</span></div>
                        <div className="flex justify-between"><span>Current Streak:</span> <span className="font-bold">{userStats?.current_streak || 0} Days</span></div>
                        <Button className="w-full" onClick={() => setShowAchievementsDialog(true)}><FaStar className="mr-2"/>View Achievements</Button>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Reminders */}
            <div className="lg:col-span-2 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Your Reminders</h1>
                    <Button onClick={() => { /* Placeholder for add reminder dialog */ }}>
                        <FaPlus className="mr-2"/> Add Reminder
                    </Button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    {reminders.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-muted-foreground">You're all clear! Add a new reminder.</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {reminders.map(r => <ReminderCard key={r.id} reminder={r} onComplete={handleCompleteReminder} />)}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            <Dialog open={showAchievementsDialog} onOpenChange={setShowAchievementsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Your Achievements</DialogTitle>
                    </DialogHeader>
                    {/* Achievements content will go here */}
                    <p>Achievement display coming soon!</p>
                    <DialogFooter>
                        <Button onClick={() => setShowAchievementsDialog(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const ReminderCard = ({ reminder, onComplete }: { reminder: Reminder; onComplete: (r: Reminder) => void }) => {
    const isOverdue = !reminder.completed && isPast(new Date(reminder.due_date));
    return (
        <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}>
            <Card className={cn("mb-3 transition-all", reminder.completed && "bg-muted/50 opacity-50")}>
                <CardContent className="p-4 flex items-center gap-4">
                    <FaCheckCircle
                        className={cn("w-7 h-7 cursor-pointer transition-colors", reminder.completed ? "text-green-500" : "text-gray-300 hover:text-green-400")}
                        onClick={() => !reminder.completed && onComplete(reminder)}
                    />
                    <div className="flex-1">
                        <p className={cn("font-semibold text-lg", reminder.completed && "line-through")}>{reminder.title}</p>
                        <div className={cn("flex items-center gap-2 text-sm", isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                            <FaCalendarAlt />
                            <span>{format(new Date(reminder.due_date), "PPp")}</span>
                            {isOverdue && <span>(Overdue)</span>}
                        </div>
                    </div>
                    <div className="font-bold text-lg text-yellow-500">+{reminder.points || 0} pts</div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default RemindersTab;
