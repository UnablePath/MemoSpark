"use client";

import { Suspense } from "react";
import Logo from "@/components/ui/logo";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { DashboardTabs } from "./DashboardTabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
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
        <Suspense fallback={<DashboardLoadingSkeleton />}>
          <DashboardTabs />
        </Suspense>
      </main>
    </div>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-around border-b px-4 py-2">
        <Skeleton className="h-10 w-16" />
        <Skeleton className="h-10 w-16" />
        <Skeleton className="h-10 w-16" />
        <Skeleton className="h-10 w-16" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}
