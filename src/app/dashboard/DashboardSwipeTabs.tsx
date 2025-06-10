'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TabContainer } from '@/components/layout/TabContainer';
import { TabIndicator } from '@/components/layout/TabIndicator';
import StudentConnectionTab from '@/components/home/StudentConnectionTab';
import { ConnectionsDebug } from '@/components/home/ConnectionsDebug';
import ConnectionsErrorBoundary from '@/components/home/ConnectionsErrorBoundary';
import { TaskEventHub } from '@/components/tasks/TaskEventHub';
import RemindersTab from '@/components/reminders/RemindersTab';
import CrashoutTab from '@/components/dashboard/CrashoutTab';
import GamificationHub from '@/components/gamification/GamificationHub';
import { FaUserFriends, FaCalendarAlt, FaBell, FaSpa, FaGamepad } from 'react-icons/fa';
import { useLocalStorageState } from '@/hooks/useStudentConnection';

// Toggle this to test - set to true to show debug component instead of actual connections tab
const USE_DEBUG_COMPONENT = false;

// Define the order of tabs and their corresponding icons
const TABS_CONFIG = [
  { 
    key: 'connections', 
    component: USE_DEBUG_COMPONENT ? ConnectionsDebug : StudentConnectionTab, 
    icon: FaUserFriends 
  },
  { key: 'tasks', component: TaskEventHub, icon: FaCalendarAlt },
  { key: 'reminders', component: RemindersTab, icon: FaBell },
  { key: 'crashout', component: CrashoutTab, icon: FaSpa },
  { key: 'gamification', component: GamificationHub, icon: FaGamepad },
];

export function DashboardSwipeTabs() {
  // Persistent tab state - remember the last active tab
  const [persistentActiveTab, setPersistentActiveTab] = useLocalStorageState<number>('dashboard_active_tab', 0);
  const [activeTabIndex, setActiveTabIndex] = useState(persistentActiveTab);
  const [isTinderModeActive, setIsTinderModeActive] = useState(false);
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, TABS_CONFIG.length);
  }, []);

  // Handler for StudentConnectionTab view mode changes
  const handleStudentTabViewModeChange = (isTinder: boolean) => {
    // Only set tinder mode if the connections tab is currently active
    if (TABS_CONFIG[activeTabIndex]?.key === 'connections') {
      setIsTinderModeActive(isTinder);
    } else {
      setIsTinderModeActive(false);
    }
  };

  const handleTabChange = (index: number) => {
    // Ensure index is valid
    if (index < 0 || index >= TABS_CONFIG.length) {
      console.warn(`Invalid tab index: ${index}`);
      return;
    }

    const newActiveTabConfig = TABS_CONFIG[index];
    
    // Handle tinder mode state based on tab
    if (newActiveTabConfig?.key !== 'connections') {
      setIsTinderModeActive(false);
    }
    
    setActiveTabIndex(index);
    setPersistentActiveTab(index); // Persist the tab selection
    
    // Debug logging for tab changes
    console.log(`Switching to tab: ${newActiveTabConfig?.key} (index: ${index})`);
  };

  // Memoize rendered components to prevent unnecessary re-renders and maintain state
  const memoizedTabComponents = useMemo(() => {
    return TABS_CONFIG.map((tabConfig, index) => {
      const TabComponent = tabConfig.component;
      
      if (tabConfig.key === 'connections') {
        return (
          <div key={`${tabConfig.key}-persistent`} className="h-full w-full">
            <ConnectionsErrorBoundary>
              {USE_DEBUG_COMPONENT ? (
                <TabComponent />
              ) : (
                <TabComponent onViewModeChange={handleStudentTabViewModeChange} />
              )}
            </ConnectionsErrorBoundary>
          </div>
        );
      }
      
      return (
        <div key={`${tabConfig.key}-persistent`} className="h-full w-full">
          <TabComponent />
        </div>
      );
    });
  }, []); // Empty dependency array - these should never change

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
      handleTabChange(nextIndex);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Content Area */}
      <TabContainer
        initialTab={activeTabIndex}
        activeIndex={activeTabIndex}
        onTabChange={handleTabChange}
        swipingEnabled={!isTinderModeActive}
        panelIds={TABS_CONFIG.map((tab, index) => `dashboard-panel-${tab.key}-${index}`)}
        tabIds={TABS_CONFIG.map((tab, index) => `dashboard-tab-${tab.key}-${index}`)}
      >
        {memoizedTabComponents}
      </TabContainer>

      {/* Icon Bar / Tab List */}
      <div
        ref={tablistRef}
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Dashboard Navigation"
        className="flex justify-around items-center p-2 border-t bg-background flex-shrink-0 pb-safe-bottom safe-scroll-area"
        onKeyDown={handleKeyDown}
      >
        {TABS_CONFIG.map((tab, index) => {
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
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabChange(index)}
              className={`touch-target p-2 rounded-md transition-colors duration-200 ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              }`}
              aria-label={`Go to ${tab.key} tab`}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DashboardSwipeTabs; 