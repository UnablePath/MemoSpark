"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUserFriends, FaCalendarAlt, FaBell } from "react-icons/fa";
import { cn } from "@/lib/utils";
import StudentConnectionTab from "@/components/home/StudentConnectionTab";
import TaskEventTab from "@/components/tasks/TaskEventTab";
import RemindersTab from "@/components/reminders/RemindersTab";
import Widget from "@/components/ui/widget";

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
  const [activeTab, setActiveTab] = useState<string>("tasks");
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showWidget, setShowWidget] = useState(false);

  // Swipe threshold (minimum distance traveled to be considered swipe)
  const minSwipeDistance = 50;

  // Show widget after a short delay to demonstrate its functionality
  useEffect(() => {
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

        {/* Widget demonstration */}
        {showWidget && (
          <div className="absolute top-4 right-4 z-50">
            <Widget
              task={{
                title: "Math Assignment Due Soon",
                dueDate: new Date().toISOString(),
                priority: "high"
              }}
              className="cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setActiveTab("tasks")}
            />
          </div>
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
