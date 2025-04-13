"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentConnectionTab from "@/components/home/StudentConnectionTab";
import TaskEventTab from "@/components/tasks/TaskEventTab";
import RemindersTab from "@/components/reminders/RemindersTab";
import { FaUserFriends, FaCalendarAlt, FaBell, FaUser } from "react-icons/fa";
import Logo from "@/components/ui/logo";
import ProfileTab from "@/components/profile/ProfileTab";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/lib/user-context";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useUser();
  const [activeTab, setActiveTab] = useState("tasks");

  // Handle URL tab parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["connections", "tasks", "reminders", "profile"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/dashboard?tab=${value}`, { scroll: false });
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Logo size="sm" className="mr-2" />
          <h1 className="text-xl font-bold">StudySpark</h1>
        </div>
        <ProfileHeader />
      </header>

      <main className="flex-1 overflow-hidden">
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

          <div className="flex-1 overflow-hidden">
            <TabsContent value="connections" className="h-full">
              <StudentConnectionTab />
            </TabsContent>
            <TabsContent value="tasks" className="h-full">
              <TaskEventTab />
            </TabsContent>
            <TabsContent value="reminders" className="h-full">
              <RemindersTab />
            </TabsContent>
            <TabsContent value="profile" className="h-full">
              <ProfileTab />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
