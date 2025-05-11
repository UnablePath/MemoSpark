"use client";

import { useRef } from "react";
// import Logo from "@/components/ui/logo";
import { StudySparkLogoSvg } from "@/components/ui/StudySparkLogoSvg";
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
      <a href="#main-dashboard-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-dashed focus:outline-2 focus:outline-offset-2">Skip to main content</a>
      <header className="p-4 border-b flex items-center justify-between flex-shrink-0 z-10 bg-background">
        <div className="flex items-center text-primary" role="banner">
          <StudySparkLogoSvg height={40} aria-label="StudySpark Logo" />
        </div>
        <ProfileHeader />
      </header>

      <main id="main-dashboard-content" className="flex-1 overflow-hidden">
        <h1 className="sr-only">User Dashboard</h1>
        <DashboardSwipeTabs />
      </main>

      {isWidgetEnabled && (
        <div role="region" aria-label="Draggable Mascot Widget">
          <DraggableWidget
            widgetId="dashboard-widget"
            dragConstraintsRef={constraintsRef}
            initialPosition={{ x: 100, y: 200 }}
          >
            <WidgetContent type="tasks" />
          </DraggableWidget>
        </div>
      )}
      {/* ARIA live region for status messages */}
      <div aria-live="polite" className="sr-only" id="dashboard-status-message"></div>
    </div>
  );
}
