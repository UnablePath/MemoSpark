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
import { CelebrationOverlay } from "@/components/stu";

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
    const { userStats, userAchievements, reload: reloadAchievements } = useAchievements();

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
        <div className="h-full overflow-y-auto">
            {/* Celebration Overlay for Reminders */}
            <CelebrationOverlay 
                position="center"
                enableParticles={true}
                enableConfetti={true}
                enableSound={true}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 min-h-full">
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
                            className="cursor-pointer"
                        >
                            <KoalaMascot size="xl" className="drop-shadow-md filter contrast-125 brightness-110" />
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
                            <div className="flex justify-between"><span>Total Points:</span> <span className="font-bold text-primary">{userStats?.total_points || 0}</span></div>
                            <div className="flex justify-between"><span>Current Streak:</span> <span className="font-bold text-green-600">{userStats?.current_streak || 0} Days</span></div>
                            <div className="flex justify-between"><span>Level:</span> <span className="font-bold text-purple-600">{userStats?.level || 1}</span></div>
                            <Button className="w-full" onClick={() => setShowAchievementsDialog(true)}><FaStar className="mr-2"/>View Achievements</Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Reminders */}
                <div className="lg:col-span-2 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold">Your Reminders</h1>
                        <Button onClick={() => { /* Placeholder for add reminder dialog */ }}>
                            <FaPlus className="mr-2"/> Add Reminder
                        </Button>
                    </div>
                    <div className="space-y-3">
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
            </div>

            <Dialog open={showAchievementsDialog} onOpenChange={setShowAchievementsDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <FaStar className="mr-2 text-amber-500" />
                            Your Achievements
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* User Stats Summary */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary">{userStats?.total_points || 0}</div>
                                <div className="text-sm text-muted-foreground">Total Points</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{userStats?.current_streak || 0}</div>
                                <div className="text-sm text-muted-foreground">Day Streak</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{userAchievements?.length || 0}</div>
                                <div className="text-sm text-muted-foreground">Achievements</div>
                            </div>
                        </div>
                        
                        {/* Achievement Collection */}
                        {userAchievements && userAchievements.length > 0 ? (
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Unlocked Achievements</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {userAchievements.map((userAchievement, i) => (
                                        <div key={userAchievement.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                                <span className="text-lg">
                                                    {userAchievement.achievements?.icon || '🏆'}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium">
                                                    {userAchievement.achievements?.name || `Achievement #${i + 1}`}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    +{userAchievement.achievements?.points_reward || 0} points
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <FaStar className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-muted-foreground mb-2">No achievements yet</h3>
                                <p className="text-sm text-muted-foreground">
                                    Complete reminders and maintain streaks to unlock your first achievements!
                                </p>
                            </div>
                        )}
                        
                        {/* Quick Link to Full Gamification Hub */}
                        <div className="pt-4 border-t">
                            <Button 
                                variant="outline" 
                                className="w-full"
                                onClick={() => {
                                    setShowAchievementsDialog(false);
                                    // Note: This would need proper navigation implementation
                                    console.log('Navigate to Gamification Hub');
                                }}
                            >
                                <FaStar className="mr-2" />
                                View Full Gamification Hub
                            </Button>
                        </div>
                    </div>
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
