'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TabContainer } from '@/components/layout/TabContainer';
import { TabIndicator } from '@/components/layout/TabIndicator';
import StudentConnectionTab from '@/components/home/StudentConnectionTab'; // Assuming this is correct
import TaskEventTab from '@/components/tasks/TaskEventTab';         // Using TaskEventTab as per old dashboard
import RemindersTab from '@/components/reminders/RemindersTab';     // Using RemindersTab as per old dashboard
import { FaUserFriends, FaCalendarAlt, FaBell } from 'react-icons/fa';

// Define the order of tabs and their corresponding icons
const TABS_CONFIG = [
  { key: 'connections', component: <StudentConnectionTab key="connections" />, icon: FaUserFriends },
  { key: 'tasks', component: <TaskEventTab key="tasks" />, icon: FaCalendarAlt },
  { key: 'reminders', component: <RemindersTab key="reminders" />, icon: FaBell },
];

const TABS = TABS_CONFIG.map(tab => tab.component);

export function DashboardSwipeTabs() {
  const [activeTabIndex, setActiveTabIndex] = useState(1); // Start on TaskTab (middle)
  const [isTinderModeActive, setIsTinderModeActive] = useState(false); // New state
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, TABS_CONFIG.length);
  }, []);

  // New handler for StudentConnectionTab view mode changes
  const handleStudentTabViewModeChange = (isTinder: boolean) => {
    // Only set tinder mode if the connections tab is currently active
    if (TABS_CONFIG[activeTabIndex]?.key === 'connections') {
      setIsTinderModeActive(isTinder);
    } else {
      // If connections tab is not active, tinder mode should not be active for the tabs
      setIsTinderModeActive(false);
    }
  };

  const handleTabChange = (index: number) => {
    const newActiveTabConfig = TABS_CONFIG[index];
    if (newActiveTabConfig?.key !== 'connections') {
      // If switching to a tab that is not connections, disable Tinder mode for swiping
      setIsTinderModeActive(false);
    }
    // If switching TO connections tab, the StudentConnectionTab's useEffect will call
    // handleStudentTabViewModeChange and set isTinderModeActive appropriately.
    // However, we also need to consider the initial state or direct calls to handleStudentTabViewModeChange.
    // The logic in handleStudentTabViewModeChange should be sufficient if called correctly.

    setActiveTabIndex(index);
  };

  // Re-define TABS_CONFIG and TABS to include the prop. 
  // This is a simplified way; ideally, TABS_CONFIG might be memoized or defined inside if props change.
  const currentTabsConfig = [
    { key: 'connections', component: <StudentConnectionTab key="connections" onViewModeChange={handleStudentTabViewModeChange} />, icon: FaUserFriends },
    { key: 'tasks', component: <TaskEventTab key="tasks" />, icon: FaCalendarAlt },
    { key: 'reminders', component: <RemindersTab key="reminders" />, icon: FaBell },
  ];
  const currentTabs = currentTabsConfig.map(tab => tab.component);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!tablistRef.current) return;
    const tabs = Array.from(tablistRef.current.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const currentIndex = tabs.findIndex(tab => tab === document.activeElement);

    let nextIndex = -1;

    if (event.key === 'ArrowRight') {
      nextIndex = currentIndex >= 0 ? (currentIndex + 1) % tabs.length : 0;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = currentIndex >= 0 ? (currentIndex - 1 + tabs.length) % tabs.length : 0;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== -1) {
      event.preventDefault();
      tabs[nextIndex].focus();
      // Since focus change triggers tab activation, we call handleTabChange
      // This assumes tabs auto-activate on focus, which is a common pattern.
      // If manual activation (Enter/Space) is desired, this would be different.
      handleTabChange(nextIndex);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Content Area - Pass activeTabIndex */}
      <TabContainer
        initialTab={activeTabIndex} // Keep initialTab for first load
        activeIndex={activeTabIndex} // Control the active tab
        onTabChange={handleTabChange} // Get updates from TabContainer swipes
        swipingEnabled={!isTinderModeActive} // Pass the new prop
        // Pass panel IDs to TabContainer so it can set them
        panelIds={currentTabsConfig.map((tab, index) => `dashboard-panel-${tab.key}-${index}`)}
        tabIds={currentTabsConfig.map((tab, index) => `dashboard-tab-${tab.key}-${index}`)}
      >
        {currentTabs}
      </TabContainer>

      {/* Icon Bar / Tab List */}
      <div
        ref={tablistRef}
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Dashboard Navigation"
        className="flex justify-around items-center p-2 border-t bg-background"
        onKeyDown={handleKeyDown}
      >
        {currentTabsConfig.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === activeTabIndex;
          const tabId = `dashboard-tab-${tab.key}-${index}`;
          const panelId = `dashboard-panel-${tab.key}-${index}`;

          return (
            <button
              key={tab.key}
              ref={el => { tabRefs.current[index] = el; }}
              id={tabId}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1} // Only active tab is in tab order initially
              onClick={() => handleTabChange(index)}
              className={`p-2 rounded-md transition-colors duration-200 ${isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'}`}
              aria-label={`Go to ${tab.key} tab`}
            >
              <Icon className="h-6 w-6" aria-hidden="true" /> {/* Icons are decorative due to aria-label on button */}
            </button>
          );
        })}
      </div>

      {/* Removed Tab Indicator Dots */}
      {/*
      <div className="flex-shrink-0 pb-2">
        <TabIndicator count={TABS.length} activeIndex={activeTabIndex} />
      </div>
      */}
    </div>
  );
}

export default DashboardSwipeTabs; 