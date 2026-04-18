"use client";

import ConnectionsErrorBoundary from "@/components/home/ConnectionsErrorBoundary";
import { TabContainer } from "@/components/layout/TabContainer";
import type React from "react";
import {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// Lazy load heavy components for better performance
const ConnectionInterface = lazy(() =>
  import("@/components/social/ConnectionInterface").then((module) => ({
    default: module.ConnectionInterface,
  })),
);
const ConnectionsDebug = lazy(() =>
  import("@/components/home/ConnectionsDebug").then((module) => ({
    default: module.ConnectionsDebug,
  })),
);
const TaskEventHub = lazy(() =>
  import("@/components/tasks/TaskEventHub").then((module) => ({
    default: module.TaskEventHub,
  })),
);
const RemindersTab = lazy(() => import("@/components/reminders/RemindersTab"));
const CrashoutTab = lazy(() => import("@/components/dashboard/CrashoutTab"));
const GamificationHub = lazy(
  () => import("@/components/gamification/GamificationHub"),
);
import { usePremiumPopup } from "@/components/providers/premium-popup-provider";
import { TabLoadingSpinner } from "@/components/ui/TabLoadingSpinner";
import { useDebouncedAchievementTrigger } from "@/hooks/useDebouncedAchievementTrigger";
import { useLocalStorageState } from "@/hooks/useStudentConnection";
import { useTieredAI } from "@/hooks/useTieredAI";
import { Bell, Calendar, Crown, Gamepad2, Leaf, Rocket, Users } from "lucide-react";

// Toggle this to test - set to true to show debug component instead of actual connections tab
const USE_DEBUG_COMPONENT = false;

// Launch mode - allows all users to experience premium features during launch period
const isLaunchMode =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENABLE_LAUNCH_MODE === "true";

// Define the order of tabs and their corresponding icons
const DASHBOARD_TAB_STORAGE_KEY = "dashboard_active_tab";

const TABS_CONFIG = [
  {
    key: "connections",
    component: USE_DEBUG_COMPONENT ? ConnectionsDebug : ConnectionInterface,
    icon: Users,
  },
  { key: "tasks", component: TaskEventHub, icon: Calendar },
  { key: "reminders", component: RemindersTab, icon: Bell },
  { key: "crashout", component: CrashoutTab, icon: Leaf },
  { key: "gamification", component: GamificationHub, icon: Gamepad2 },
];

function readStoredTabIndex(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(DASHBOARD_TAB_STORAGE_KEY);
    if (raw == null) return 0;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "number" &&
      Number.isFinite(parsed) &&
      parsed >= 0 &&
      parsed < TABS_CONFIG.length
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

export function DashboardSwipeTabs() {
  const [, setPersistentActiveTab] = useLocalStorageState<number>(
    DASHBOARD_TAB_STORAGE_KEY,
    0,
  );
  // SSR and the first client paint must match (no localStorage on server), so we
  // cannot render the real tab until after useLayoutEffect reads storage.
  const [tabsReady, setTabsReady] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isTinderModeActive, setIsTinderModeActive] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set());
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Tier-aware features with backwards compatibility
  const tieredAI = useTieredAI
    ? useTieredAI()
    : { userTier: "free", isFeatureAvailable: () => true };
  const { userTier } = tieredAI;

  // Achievement system
  const { triggerAchievement } = useDebouncedAchievementTrigger();

  // Premium popup system
  const { showFeatureGatePopup } = usePremiumPopup();

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, TABS_CONFIG.length);
  }, []);

  useLayoutEffect(() => {
    const idx = readStoredTabIndex();
    setActiveTabIndex(idx);
    setPersistentActiveTab(idx);
    setVisitedTabs(new Set([TABS_CONFIG[idx]?.key ?? "connections"]));
    setTabsReady(true);
    // Mount only: avoid re-running when useLocalStorageState setter identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for StudentConnectionTab view mode changes
  const handleStudentTabViewModeChange = (isTinder: boolean) => {
    if (TABS_CONFIG[activeTabIndex]?.key === "connections") {
      setIsTinderModeActive(isTinder);
    } else {
      setIsTinderModeActive(false);
    }
  };

  const handleTabChange = (index: number) => {
    if (index < 0 || index >= TABS_CONFIG.length) return;

    const newActiveTabConfig = TABS_CONFIG[index];
    const isPremiumFeature =
      newActiveTabConfig?.key === "gamification" ||
      newActiveTabConfig?.key === "crashout";
    const hasAccess = isPremiumFeature
      ? userTier !== "free" || isLaunchMode
      : true;

    if (isPremiumFeature && !hasAccess) {
      // Show premium upgrade popup for feature gate
      const featureName =
        newActiveTabConfig.key === "gamification"
          ? "Gamification Hub"
          : "Crashout Journal";
      showFeatureGatePopup(featureName);
      return;
    }

    if (newActiveTabConfig?.key !== "connections") {
      setIsTinderModeActive(false);
    }

    setActiveTabIndex(index);
    setPersistentActiveTab(index);

    // Track visited tabs and trigger achievements
    const tabKey = newActiveTabConfig?.key;
    if (tabKey) {
      setVisitedTabs((prev) => {
        const newVisited = new Set(prev);
        const wasNewTab = !newVisited.has(tabKey);
        newVisited.add(tabKey);

        // Trigger achievements for tab visits
        if (wasNewTab) {
          switch (tabKey) {
            case "gamification":
              triggerAchievement("gamification_opened");
              break;
            case "connections":
              triggerAchievement("connections_opened");
              break;
            case "tasks":
              triggerAchievement("tasks_opened");
              break;
            case "reminders":
              triggerAchievement("reminders_opened");
              break;
            case "crashout":
              triggerAchievement("crashout_opened");
              break;
          }
        }

        // Check if all tabs have been visited
        if (newVisited.size === TABS_CONFIG.length) {
          triggerAchievement("all_tabs_visited");
        }

        return newVisited;
      });
    }

  };

  // Listen for tutorial tab change events
  useEffect(() => {
    const handleTutorialTabChange = (event: CustomEvent) => {
      const { tabIndex } = event.detail;
      if (
        typeof tabIndex === "number" &&
        tabIndex >= 0 &&
        tabIndex < TABS_CONFIG.length
      ) {
        handleTabChange(tabIndex);
      }
    };

    window.addEventListener(
      "tutorialTabChange",
      handleTutorialTabChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "tutorialTabChange",
        handleTutorialTabChange as EventListener,
      );
    };
  }, [handleTabChange]);

  const dashboardVisitLoggedRef = useRef(false);

  // Trigger initial dashboard visit achievement (once; stable trigger fn avoids re-runs)
  useEffect(() => {
    if (dashboardVisitLoggedRef.current) return;
    dashboardVisitLoggedRef.current = true;
    triggerAchievement("dashboard_visited");
  }, [triggerAchievement]);

  // Render tab components dynamically to ensure proper updates
  const renderTabContent = (
    tabConfig: (typeof TABS_CONFIG)[0],
    index: number,
  ) => {
    const TabComponent = tabConfig.component;

    if (tabConfig.key === "connections") {
      return (
        <div key={`${tabConfig.key}-${index}`} className="h-full w-full">
          <ConnectionsErrorBoundary>
            <Suspense fallback={<TabLoadingSpinner />}>
              {USE_DEBUG_COMPONENT ? (
                <TabComponent />
              ) : (
                <TabComponent
                  onSwipeModeChange={handleStudentTabViewModeChange}
                />
              )}
            </Suspense>
          </ConnectionsErrorBoundary>
        </div>
      );
    }

    return (
      <div key={`${tabConfig.key}-${index}`} className="h-full w-full">
        <Suspense fallback={<TabLoadingSpinner />}>
          <TabComponent />
        </Suspense>
      </div>
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!tablistRef.current) return;
    const tabs = Array.from(
      tablistRef.current.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const currentIndex = tabs.findIndex(
      (tab) => tab === document.activeElement,
    );

    let nextIndex = -1;

    if (event.key === "ArrowRight") {
      nextIndex = currentIndex >= 0 ? (currentIndex + 1) % tabs.length : 0;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        currentIndex >= 0 ? (currentIndex - 1 + tabs.length) % tabs.length : 0;
    }

    if (nextIndex !== -1) {
      event.preventDefault();
      tabs[nextIndex].focus();
      handleTabChange(nextIndex);
    }
  };

  if (!tabsReady) {
    return (
      <div className="flex h-full min-h-[50vh] flex-1 flex-col">
        {isLaunchMode && (
          <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-2 text-center text-sm text-green-600 dark:text-green-400">
            <Rocket className="mr-2 inline h-4 w-4" />
            Launch Mode: Experience all premium features for free during our
            launch period!
          </div>
        )}
        <div className="flex flex-1 flex-col items-center justify-center">
          <TabLoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Launch Mode Indicator */}
      {isLaunchMode && (
        <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-2 text-center text-sm text-green-600 dark:text-green-400">
          <Rocket className="mr-2 inline h-4 w-4" />
          Launch Mode: Experience all premium features for free during our
          launch period!
        </div>
      )}

      {/* Tab Content Area */}
      <TabContainer
        initialTab={activeTabIndex}
        activeIndex={activeTabIndex}
        onTabChange={handleTabChange}
        swipingEnabled={!isTinderModeActive}
        panelIds={TABS_CONFIG.map(
          (tab, index) => `dashboard-panel-${tab.key}-${index}`,
        )}
        tabIds={TABS_CONFIG.map(
          (tab, index) => `dashboard-tab-${tab.key}-${index}`,
        )}
      >
        {TABS_CONFIG.map((tabConfig, index) =>
          renderTabContent(tabConfig, index),
        )}
      </TabContainer>

      {/* Icon Bar / Tab List */}
      <div
        ref={tablistRef}
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Dashboard Navigation"
        className="tab-navigation flex justify-around items-center px-1 py-1 sm:px-2 sm:py-1 lg:px-3 lg:py-2 border-t bg-background flex-shrink-0 pb-safe-bottom safe-scroll-area max-w-full overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {TABS_CONFIG.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === activeTabIndex;
          const isPremiumFeature =
            tab.key === "gamification" || tab.key === "crashout";
          const hasAccess = isPremiumFeature
            ? userTier !== "free" || isLaunchMode
            : true;
          const isVisited = visitedTabs.has(tab.key);

          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`dashboard-tab-${tab.key}-${index}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`dashboard-panel-${tab.key}-${index}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabChange(index)}
              className={`relative touch-target p-1 sm:p-1.5 lg:p-2 rounded-md transition-colors duration-200 flex-shrink-0 min-w-0 ${
                isActive
                  ? tab.key === "connections"
                    ? "text-primary bg-primary/10 ring-1 ring-primary/25 ring-offset-2 ring-offset-background"
                    : "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              } ${!hasAccess ? "opacity-50 cursor-not-allowed" : ""}`}
              aria-label={`Go to ${tab.key} tab${!hasAccess ? " (Premium required)" : ""}`}
              disabled={!hasAccess && isPremiumFeature}
            >
              <Icon
                className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mx-auto"
                aria-hidden="true"
              />

              {/* New tab indicator */}
              {!isVisited && hasAccess && (
                <div
                  className="absolute -top-0.5 -right-0.5 lg:-top-1 lg:-right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 bg-green-500 rounded-full animate-pulse"
                  title="New!"
                />
              )}

              {/* Premium indicator */}
              {isPremiumFeature && !hasAccess && (
                <Crown className="absolute -top-0.5 -right-0.5 lg:-top-1 lg:-right-1 h-2 w-2 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3 text-yellow-500" />
              )}
              {isLaunchMode && isPremiumFeature && (
                <div
                  className="absolute -top-0.5 -right-0.5 lg:-top-1 lg:-right-1 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-400 rounded-full"
                  title="Launch Mode Active"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DashboardSwipeTabs;
