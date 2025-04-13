"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentConnectionTab from "@/components/home/StudentConnectionTab";
import TaskEventTab from "@/components/tasks/TaskEventTab";
import RemindersTab from "@/components/reminders/RemindersTab";
import ProfileTab from "@/components/profile/ProfileTab";
import { FaUserFriends, FaCalendarAlt, FaBell, FaUser } from "react-icons/fa";

export function DashboardTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("tasks");

  // Handle URL tab parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["connections", "tasks", "reminders", "profile"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    // Initialize with 'tasks' if no valid tab is found
    else if (!tabParam) {
      setActiveTab("tasks");
       // Optionally push the default tab to the URL if desired
       // router.push(`/dashboard?tab=tasks`, { scroll: false });
    }
  }, [searchParams, router]); // Added router to dependency array if used inside effect

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/dashboard?tab=${value}`, { scroll: false });
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="h-full flex flex-col"
    >
      <TabsList className="justify-around border-b px-4 py-2">
        <TabsTrigger value="connections" className="flex flex-col items-center gap-1">
          <FaUserFriends className="h-5 w-5" />
          <span className="text-xs">Connections</span>
        </TabsTrigger>
        <TabsTrigger value="tasks" className="flex flex-col items-center gap-1">
          <FaCalendarAlt className="h-5 w-5" />
          <span className="text-xs">Tasks</span>
        </TabsTrigger>
        <TabsTrigger value="reminders" className="flex flex-col items-center gap-1">
          <FaBell className="h-5 w-5" />
          <span className="text-xs">Reminders</span>
        </TabsTrigger>
        <TabsTrigger value="profile" className="flex flex-col items-center gap-1">
          <FaUser className="h-5 w-5" />
          <span className="text-xs">Profile</span>
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-y-auto p-4"> {/* Added padding and overflow-y-auto */}
        <TabsContent value="connections" className="h-full mt-0"> {/* Removed redundant h-full if parent has overflow */}
          <StudentConnectionTab />
        </TabsContent>
        <TabsContent value="tasks" className="h-full mt-0">
          <TaskEventTab />
        </TabsContent>
        <TabsContent value="reminders" className="h-full mt-0">
          <RemindersTab />
        </TabsContent>
        <TabsContent value="profile" className="h-full mt-0">
          <ProfileTab />
        </TabsContent>
      </div>
    </Tabs>
  );
}

// It's good practice to export the component as default if it's the main export
// export default DashboardTabs; // Or keep named export if preferred 