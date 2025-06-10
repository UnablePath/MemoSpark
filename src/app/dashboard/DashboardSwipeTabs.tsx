'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { useTieredAI } from '@/hooks/useTieredAI';
import { Crown } from 'lucide-react';

// Toggle this to test - set to true to show debug component instead of actual connections tab
const USE_DEBUG_COMPONENT = false;

// Define the order of tabs and their corresponding icons
const TABS_CONFIG = [
  { key: 'connections', component: <StudentConnectionTab key="connections" />, icon: FaUserFriends },
  { key: 'tasks', component: <TaskEventHub key="tasks" />, icon: FaCalendarAlt },
  { key: 'reminders', component: <RemindersTab key="reminders" />, icon: FaBell },
  { key: 'crashout', component: <CrashoutTab key="crashout" />, icon: FaSpa },
  { key: 'gamification', component: <GamificationHub key="gamification" />, icon: FaGamepad },
];

const TABS = TABS_CONFIG.map(tab => tab.component);

export function DashboardSwipeTabs() {
  const [activeTabIndex, setActiveTabIndex] = useState(1); // Start on TaskTab (middle)
  const [isTinderModeActive, setIsTinderModeActive] = useState(false);
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // Tier-aware features with backwards compatibility
  const tieredAI = useTieredAI ? useTieredAI() : { userTier: 'free', isFeatureAvailable: () => true };
  const { userTier, isFeatureAvailable } = tieredAI;

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, TABS_CONFIG.length);
  }, []);

  // Handler for StudentConnectionTab view mode changes
  const handleStudentTabViewModeChange = (isTinder: boolean) => {
    if (TABS_CONFIG[activeTabIndex]?.key === 'connections') {
      setIsTinderModeActive(isTinder);
    } else {
      setIsTinderModeActive(false);
    }
  };

  const handleTabChange = (index: number) => {
    const newActiveTabConfig = TABS_CONFIG[index];
    
    // Check if this is a premium feature and user has access
    const isPremiumFeature = newActiveTabConfig?.key === 'gamification' || newActiveTabConfig?.key === 'crashout';
    const hasAccess = isPremiumFeature ? userTier !== 'free' : true;
    
    if (isPremiumFeature && !hasAccess) {
      // Show upgrade prompt instead of switching tabs
      return;
    }
    
    if (newActiveTabConfig?.key !== 'connections') {
      setIsTinderModeActive(false);
    }

    setActiveTabIndex(index);
  };

  // Re-define TABS_CONFIG with props for connections tab
  const currentTabsConfig = TABS_CONFIG.map(tabConfig => {
    if (tabConfig.key === 'connections') {
      if (React.isValidElement(tabConfig.component)) {
        return {
          ...tabConfig,
          component: React.cloneElement(tabConfig.component as React.ReactElement<any>, { 
            onViewModeChange: handleStudentTabViewModeChange 
          }),
        };
      }
    }
    return tabConfig;
  });

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
        panelIds={currentTabsConfig.map((tab, index) => `dashboard-panel-${tab.key}-${index}`)}
        tabIds={currentTabsConfig.map((tab, index) => `dashboard-tab-${tab.key}-${index}`)}
      >
        {currentTabsConfig.map(tab => tab.component)}
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
        {currentTabsConfig.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === activeTabIndex;
          const tabId = `dashboard-tab-${tab.key}-${index}`;
          const panelId = `dashboard-panel-${tab.key}-${index}`;

          // Check if this tab requires premium access
          const isPremiumFeature = tab.key === 'gamification' || tab.key === 'crashout';
          const hasAccess = isPremiumFeature ? userTier !== 'free' : true;
          
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
              className={`relative touch-target p-2 rounded-md transition-colors duration-200 ${
                isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              } ${!hasAccess ? 'opacity-50' : ''}`}
              aria-label={`Go to ${tab.key} tab${!hasAccess ? ' (Premium required)' : ''}`}
              disabled={!hasAccess}
            >
              <div className="relative">
                <Icon className="h-6 w-6" aria-hidden="true" />
                {isPremiumFeature && !hasAccess && (
                  <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Indicator */}
      <TabIndicator 
        activeIndex={activeTabIndex} 
        totalTabs={currentTabsConfig.length} 
        className="absolute bottom-16 left-1/2 transform -translate-x-1/2"
      />
    </div>
  );
}

export default DashboardSwipeTabs; 