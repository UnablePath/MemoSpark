"use client";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUserFriends, FaCalendarAlt, FaBell, FaCog } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { useRouter } from "@/lib/hooks/use-router";
import { Button } from "@/components/ui/button";
import StudentConnectionTab from "@/components/home/StudentConnectionTab";
import TaskEventTab from "@/components/tasks/TaskEventTab";
import RemindersTab from "@/components/reminders/RemindersTab";
import DraggableWidget from "@/components/ui/draggable-widget";
import Logo from "@/components/ui/logo";

const tabs = [
  {
    id: "connections",
    label: "Connections",
    icon: <FaUserFriends className="h-6 w-6" />,
    color: "bg-primary",
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: <FaCalendarAlt className="h-6 w-6" />,
    color: "bg-secondary",
  },
  {
    id: "reminders",
    label: "Reminders",
    icon: <FaBell className="h-6 w-6" />,
    color: "bg-accent",
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("tasks");
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showWidget, setShowWidget] = useState(false);
  const [initialWidgetPosition, setInitialWidgetPosition] = useState({ x: 0, y: 0 });

  // Swipe threshold (minimum distance traveled to be considered swipe)
  const minSwipeDistance = 50;

  // Set initial widget position and show after delay
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInitialWidgetPosition({
        x: window.innerWidth - 100,
        y: 100
      });
    }

    const timer = setTimeout(() => {
      setShowWidget(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // Reset on touch start
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      let newIndex: number;

      if (isLeftSwipe) {
        // Moving to the right tab (left swipe)
        newIndex = Math.min(currentIndex + 1, tabs.length - 1);
      } else {
        // Moving to the left tab (right swipe)
        newIndex = Math.max(currentIndex - 1, 0);
      }

      setActiveTab(tabs[newIndex].id);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Logo size="sm" className="mr-2" />
          <h1 className="text-xl font-bold">StudySpark</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            // Use window.location.href as a backup if router.push isn't working
            window.location.href = '/settings';
          }}
          className="rounded-full"
        >
          <FaCog className="h-5 w-5" />
        </Button>
      </header>

      {/* Main content area with tabs */}
      <div
        className="flex-1 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === "connections" ? -300 : activeTab === "reminders" ? 300 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === "connections" ? 300 : activeTab === "reminders" ? -300 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {activeTab === "connections" && <StudentConnectionTab />}
            {activeTab === "tasks" && <TaskEventTab />}
            {activeTab === "reminders" && <RemindersTab />}
          </motion.div>
        </AnimatePresence>

        {/* Draggable Widget */}
        {showWidget && (
          <DraggableWidget
            task={{
              title: "Math Assignment Due Soon",
              dueDate: new Date().toISOString(),
              priority: "high"
            }}
            defaultPosition={initialWidgetPosition}
            onClick={() => setActiveTab("tasks")}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 w-full bg-background border-t py-2">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-full w-16 h-16 transition-colors",
                activeTab === tab.id
                  ? `text-white ${tab.color}`
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
