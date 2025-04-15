'use client';

import React, { useState } from 'react';
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

  // This handler is now called by BOTH icon clicks AND TabContainer swipes
  const handleTabChange = (index: number) => {
    setActiveTabIndex(index);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Content Area - Pass activeTabIndex */}
      <TabContainer
        initialTab={activeTabIndex} // Keep initialTab for first load
        activeIndex={activeTabIndex} // Control the active tab
        onTabChange={handleTabChange} // Get updates from TabContainer swipes
      >
        {TABS}
      </TabContainer>

      {/* Icon Bar */}
      <div className="flex justify-around items-center p-2 border-t bg-background">
        {TABS_CONFIG.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === activeTabIndex;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(index)} // Allow clicking icons to change tabs too
              className={`p-2 rounded-md transition-colors duration-200 ${isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label={`Go to ${tab.key} tab`}
            >
              <Icon className="h-6 w-6" />
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