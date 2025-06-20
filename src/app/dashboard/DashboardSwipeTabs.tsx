'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TabContainer } from '@/components/layout/TabContainer';
import { ConnectionInterface } from '@/components/social/ConnectionInterface';
import { ConnectionsDebug } from '@/components/home/ConnectionsDebug';
import ConnectionsErrorBoundary from '@/components/home/ConnectionsErrorBoundary';
import { TaskEventHub } from '@/components/tasks/TaskEventHub';
import RemindersTab from '@/components/reminders/RemindersTab';
import CrashoutTab from '@/components/dashboard/CrashoutTab';
import GamificationHub from '@/components/gamification/GamificationHub';
import { FaUserFriends, FaCalendarAlt, FaBell, FaSpa, FaGamepad } from 'react-icons/fa';
import { useLocalStorageState } from '@/hooks/useStudentConnection';
import { useTieredAI } from '@/hooks/useTieredAI';
import { useAchievementTrigger } from '@/hooks/useAchievementTrigger';
import { Crown } from 'lucide-react';

// Toggle this to test - set to true to show debug component instead of actual connections tab
const USE_DEBUG_COMPONENT = false;

// Launch mode - allows all users to experience premium features during launch period
const isLaunchMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_LAUNCH_MODE === 'true';

// Define the order of tabs and their corresponding icons
const TABS_CONFIG = [
  { 
    key: 'connections', 
    component: USE_DEBUG_COMPONENT ? ConnectionsDebug : ConnectionInterface, 
    icon: FaUserFriends 
  },
  { key: 'tasks', component: TaskEventHub, icon: FaCalendarAlt },
  { key: 'reminders', component: RemindersTab, icon: FaBell },
  { key: 'crashout', component: CrashoutTab, icon: FaSpa },
  { key: 'gamification', component: GamificationHub, icon: FaGamepad },
];

export function DashboardSwipeTabs() {
  const [persistentActiveTab, setPersistentActiveTab] = useLocalStorageState<number>('dashboard_active_tab', 0);
  const [activeTabIndex, setActiveTabIndex] = useState(persistentActiveTab);
  const [isTinderModeActive, setIsTinderModeActive] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['connections'])); // Start with connections as visited
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // Tier-aware features with backwards compatibility
  const tieredAI = useTieredAI ? useTieredAI() : { userTier: 'free', isFeatureAvailable: () => true };
  const { userTier } = tieredAI;

  // Achievement system
  const { triggerAchievement } = useAchievementTrigger();

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
    if (index < 0 || index >= TABS_CONFIG.length) return;

    const newActiveTabConfig = TABS_CONFIG[index];
    const isPremiumFeature = newActiveTabConfig?.key === 'gamification' || newActiveTabConfig?.key === 'crashout';
    const hasAccess = isPremiumFeature ? (userTier !== 'free' || isLaunchMode) : true;
    
    if (isPremiumFeature && !hasAccess) {
      // Maybe show an upgrade modal in the future
      console.log("Upgrade required to access this feature.");
      return;
    }
    
    if (newActiveTabConfig?.key !== 'connections') {
      setIsTinderModeActive(false);
    }
    
    setActiveTabIndex(index);
    setPersistentActiveTab(index);
    
    // Track visited tabs and trigger achievements
    const tabKey = newActiveTabConfig?.key;
    if (tabKey) {
      setVisitedTabs(prev => {
        const newVisited = new Set(prev);
        const wasNewTab = !newVisited.has(tabKey);
        newVisited.add(tabKey);
        
        // Trigger achievements for tab visits
        if (wasNewTab) {
          switch (tabKey) {
            case 'gamification':
              triggerAchievement('gamification_opened');
              break;
            case 'connections':
              triggerAchievement('connections_opened');
              break;
            case 'tasks':
              triggerAchievement('tasks_opened');
              break;
            case 'reminders':
              triggerAchievement('reminders_opened');
              break;
            case 'crashout':
              triggerAchievement('crashout_opened');
              break;
          }
        }
        
        // Check if all tabs have been visited
        if (newVisited.size === TABS_CONFIG.length) {
          triggerAchievement('all_tabs_visited');
        }
        
        return newVisited;
      });
    }
    
    console.log(`Switching to tab: ${newActiveTabConfig?.key} (index: ${index})`);
  };

  // Listen for tutorial tab change events
  useEffect(() => {
    const handleTutorialTabChange = (event: CustomEvent) => {
      const { tabIndex } = event.detail;
      if (typeof tabIndex === 'number' && tabIndex >= 0 && tabIndex < TABS_CONFIG.length) {
        console.log(`Tutorial requesting tab change to index: ${tabIndex}`);
        handleTabChange(tabIndex);
      }
    };

    window.addEventListener('tutorialTabChange', handleTutorialTabChange as EventListener);
    
    return () => {
      window.removeEventListener('tutorialTabChange', handleTutorialTabChange as EventListener);
    };
  }, [handleTabChange]);

  // Trigger initial dashboard visit achievement
  useEffect(() => {
    // Trigger on first load
    triggerAchievement('dashboard_visited');
  }, [triggerAchievement]);

  // Memoize rendered components to prevent unnecessary re-renders and maintain state
  const memoizedTabComponents = useMemo(() => {
    return TABS_CONFIG.map((tabConfig) => {
      const TabComponent = tabConfig.component;
      
      if (tabConfig.key === 'connections') {
        return (
          <div key={`${tabConfig.key}-persistent`} className="h-full w-full">
            <ConnectionsErrorBoundary>
              {USE_DEBUG_COMPONENT ? (
                <TabComponent />
              ) : (
                <TabComponent onSwipeModeChange={handleStudentTabViewModeChange} />
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
  }, [handleStudentTabViewModeChange]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!tablistRef.current) return;
    const tabs = Array.from(tablistRef.current.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const currentIndex = tabs.findIndex(tab => tab === document.activeElement);

    let nextIndex = -1;

    if (event.key === 'ArrowRight') {
      nextIndex = currentIndex >= 0 ? (currentIndex + 1) % tabs.length : 0;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = currentIndex >= 0 ? (currentIndex - 1 + tabs.length) % tabs.length : 0;
    }

    if (nextIndex !== -1) {
      event.preventDefault();
      tabs[nextIndex].focus();
      handleTabChange(nextIndex);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Launch Mode Indicator */}
      {isLaunchMode && (
        <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-2 text-center text-sm text-green-600 dark:text-green-400">
          🚀 Launch Mode: Experience all premium features for free during our launch period!
        </div>
      )}

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
        className="tab-navigation flex justify-around items-center p-2 border-t bg-background flex-shrink-0 pb-safe-bottom safe-scroll-area"
        onKeyDown={handleKeyDown}
      >
        {TABS_CONFIG.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === activeTabIndex;
          const isPremiumFeature = tab.key === 'gamification' || tab.key === 'crashout';
          const hasAccess = isPremiumFeature ? (userTier !== 'free' || isLaunchMode) : true;
          const isVisited = visitedTabs.has(tab.key);
          
          return (
            <button
              key={tab.key}
              ref={el => { tabRefs.current[index] = el; }}
              id={`dashboard-tab-${tab.key}-${index}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`dashboard-panel-${tab.key}-${index}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabChange(index)}
              className={`relative touch-target p-2 rounded-md transition-colors duration-200 ${
                isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              } ${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={`Go to ${tab.key} tab${!hasAccess ? ' (Premium required)' : ''}`}
              disabled={!hasAccess && isPremiumFeature}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              
              {/* New tab indicator */}
              {!isVisited && hasAccess && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" title="New!" />
              )}
              
              {isPremiumFeature && !hasAccess && (
                <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
              )}
              {isLaunchMode && isPremiumFeature && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" title="Launch Mode Active" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DashboardSwipeTabs; 