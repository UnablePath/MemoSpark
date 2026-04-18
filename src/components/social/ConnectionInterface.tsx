"use client";

import { StudyGroupErrorBoundary } from "@/components/error-boundaries/StudyGroupErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  connectionHubKeys,
  usePrefetchConnectionHub,
} from "@/hooks/useConnectionHubQueries";
import { useDebouncedAchievementTrigger } from "@/hooks/useDebouncedAchievementTrigger";
import { studyGroupKeys } from "@/hooks/useStudyGroupQueries";
import { StudentDiscovery } from "@/lib/social/StudentDiscovery";
import { cn } from "@/lib/utils";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  CardsThree,
  ChatsCircle,
  MagnifyingGlass,
  UsersThree,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HubLaneBackdrop } from "./_shared/HubLaneBackdrop";
import { ActivityFeed } from "./ActivityFeed";
import { ConnectionManager } from "./ConnectionManager";
import { StudyGroupHub } from "./StudyGroupHub";
import { SwipeInterface } from "./SwipeInterface";

interface ConnectionInterfaceProps {
  onSwipeModeChange?: (isSwipeMode: boolean) => void;
}

type HubSection = "discover" | "connect" | "groups";

const HUB_SEGMENTS: {
  value: HubSection;
  label: string;
  Icon: typeof CardsThree;
}[] = [
  { value: "discover", label: "Discover", Icon: CardsThree },
  { value: "connect", label: "Connect", Icon: ChatsCircle },
  { value: "groups", label: "Groups", Icon: UsersThree },
];

function useHubCount(
  userId: string | undefined,
  section: HubSection,
): number | null {
  const qc = useQueryClient();
  if (!userId) return null;
  if (section === "connect") {
    const data = qc.getQueryData<unknown[]>(connectionHubKeys.incoming(userId));
    return Array.isArray(data) ? data.length : null;
  }
  if (section === "groups") {
    const data = qc.getQueryData<unknown[]>(studyGroupKeys.userGroups(userId));
    return Array.isArray(data) ? data.length : null;
  }
  return null;
}

export const ConnectionInterface: React.FC<ConnectionInterfaceProps> = ({
  onSwipeModeChange,
}) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { triggerAchievement } = useDebouncedAchievementTrigger();
  const reduceMotion = useReducedMotion();
  const connectionsOpenedRef = useRef(false);

  const studentDiscovery = useMemo(
    () => new StudentDiscovery(getToken),
    [getToken],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [hubSection, setHubSection] = useState<HubSection>("connect");

  usePrefetchConnectionHub(user?.id);

  useEffect(() => {
    onSwipeModeChange?.(hubSection === "discover");
  }, [hubSection, onSwipeModeChange]);

  useEffect(() => {
    if (connectionsOpenedRef.current) return;
    connectionsOpenedRef.current = true;
    void triggerAchievement("connections_opened");
  }, [triggerAchievement]);

  const handleSearch = async () => {
    if (!user || !searchTerm.trim()) return;
    await studentDiscovery.searchUsers(searchTerm, user.id);
  };

  const incomingCount = useHubCount(user?.id, "connect");
  const groupsCount = useHubCount(user?.id, "groups");
  const activeCount =
    hubSection === "connect"
      ? incomingCount
      : hubSection === "groups"
        ? groupsCount
        : null;

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 460, damping: 38, mass: 0.6 };

  return (
    <div
      data-connection-hub
      data-hub-lane={hubSection}
      className="relative isolate min-h-0 px-3 py-4 sm:px-6 sm:py-6"
    >
      <HubLaneBackdrop lane={hubSection} />
      <Tabs
        value={hubSection}
        onValueChange={(v) => setHubSection(v as HubSection)}
        className="w-full"
      >
        <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
          <span className="text-[0.62rem] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
            Connections
          </span>

          <TabsList
            className={cn(
              "h-auto gap-1 rounded-full border border-border/60 bg-card/70 p-1",
              "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] backdrop-blur-[2px] supports-[backdrop-filter]:bg-card/55",
            )}
            aria-label="Connection hub sections"
          >
            {HUB_SEGMENTS.map(({ value, label, Icon }) => {
              const isActive = hubSection === value;
              const count =
                value === "connect"
                  ? incomingCount
                  : value === "groups"
                    ? groupsCount
                    : null;
              const showBadge =
                isActive && typeof count === "number" && count > 0;

              return (
                <TabsTrigger
                  key={value}
                  value={value}
                  aria-label={label}
                  className={cn(
                    "group relative inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-2.5",
                    "text-xs font-medium outline-none transition-[color] duration-200",
                    "data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground",
                    "hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50",
                    "active:scale-[0.97]",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="hub-pill"
                      aria-hidden
                      className="absolute inset-0 -z-0 rounded-full bg-background ring-1 ring-primary/25 shadow-[0_8px_20px_-14px_hsl(var(--foreground)/0.35)]"
                      transition={spring}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "",
                      )}
                      weight={isActive ? "fill" : "regular"}
                      aria-hidden
                    />
                    <motion.span
                      initial={false}
                      animate={{
                        width: isActive ? "auto" : 0,
                        opacity: isActive ? 1 : 0,
                        marginLeft: isActive ? 0 : -4,
                      }}
                      transition={spring}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                    <AnimatePresence initial={false}>
                      {showBadge ? (
                        <motion.span
                          key="count"
                          initial={
                            reduceMotion
                              ? false
                              : { opacity: 0, scale: 0.6, width: 0 }
                          }
                          animate={{ opacity: 1, scale: 1, width: "auto" }}
                          exit={
                            reduceMotion
                              ? undefined
                              : { opacity: 0, scale: 0.6, width: 0 }
                          }
                          transition={spring}
                          className={cn(
                            "ml-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1",
                            "bg-primary/15 text-[0.6rem] font-semibold tabular-nums text-primary",
                          )}
                        >
                          {typeof count === "number" && count > 99
                            ? "99+"
                            : count}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={hubSection}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <TabsContent value="discover" className="mt-0 outline-none" forceMount={false}>
              <SwipeInterface onSwipeModeChange={onSwipeModeChange} />
            </TabsContent>

            <TabsContent
              value="connect"
              className="mt-0 space-y-5 outline-none"
              forceMount={false}
            >
              <div className="relative">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  weight="bold"
                  aria-hidden
                />
                <Input
                  placeholder="Find someone by name or subject"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSearch();
                  }}
                  className={cn(
                    "h-11 rounded-full border-border/70 bg-card/70 pl-9 pr-3",
                    "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)]",
                    "focus-visible:ring-primary/40",
                  )}
                  aria-label="Search people"
                />
              </div>

              <StudyGroupErrorBoundary>
                <ConnectionManager searchTerm={searchTerm} />
              </StudyGroupErrorBoundary>
              <StudyGroupErrorBoundary>
                <ActivityFeed />
              </StudyGroupErrorBoundary>
            </TabsContent>

            <TabsContent value="groups" className="mt-0 outline-none" forceMount={false}>
              <StudyGroupErrorBoundary>
                <StudyGroupHub />
              </StudyGroupErrorBoundary>
            </TabsContent>
          </motion.div>
        </AnimatePresence>

        {activeCount !== null ? (
          <p
            aria-live="polite"
            className="sr-only"
          >
            {activeCount} in {hubSection}
          </p>
        ) : null}
      </Tabs>
    </div>
  );
};
