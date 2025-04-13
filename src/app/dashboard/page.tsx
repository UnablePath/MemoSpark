"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentConnectionTab from "@/components/home/StudentConnectionTab";
import TaskEventTab from "@/components/tasks/TaskEventTab";
import RemindersTab from "@/components/reminders/RemindersTab";
import { FaUserFriends, FaCalendarAlt, FaBell, FaCog } from "react-icons/fa";
import Logo from "@/components/ui/logo";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Logo size="sm" className="mr-2" />
          <h1 className="text-xl font-bold">StudySpark</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/settings')}
          className="rounded-full"
        >
          <FaCog className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-hidden">
        <Tabs defaultValue="tasks" className="h-full flex flex-col">
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
          </div>
        </Tabs>
      </main>
    </div>
  );
}