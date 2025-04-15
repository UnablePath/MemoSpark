"use client";

import { useRef } from "react";
import Logo from "@/components/ui/logo";
import ProfileHeader from "@/components/profile/ProfileHeader";
import DashboardSwipeTabs from './DashboardSwipeTabs';
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DraggableWidget } from "@/components/widgets/DraggableWidget";
import { WidgetContent } from "@/components/widgets/WidgetContent";

export default function DashboardPage() {
  const [isWidgetEnabled] = useLocalStorage('dashboard-widget-enabled', false);
  const constraintsRef = useRef(null);

  return (
    <div ref={constraintsRef} className="flex flex-col h-screen bg-background relative overflow-hidden">
      <header className="p-4 border-b flex items-center justify-between flex-shrink-0 z-10 bg-background">
        <div className="flex items-center">
          <Logo size="md" />
        </div>
        <ProfileHeader />
      </header>

      <div className="flex-1 overflow-hidden">
        <DashboardSwipeTabs />
      </div>

      {isWidgetEnabled && (
        <DraggableWidget
          widgetId="dashboard-widget"
          dragConstraintsRef={constraintsRef}
          initialPosition={{ x: 100, y: 200 }}
        >
          <WidgetContent type="tasks" />
        </DraggableWidget>
      )}
    </div>
  );
}
