"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StudentDiscovery, type UserSearchResult } from "@/lib/social/StudentDiscovery";
import type { UserProfile } from "@/lib/social/StudentDiscovery";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  ArrowClockwise,
  GraduationCap,
  Heart,
  UserCircle,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type React from "react";
import { createRef, useCallback, useEffect, useMemo, useState } from "react";
import TinderCard from "react-tinder-card";
import { toast } from "sonner";

interface SwipeInterfaceProps {
  onMatch?: (matchedUser: UserProfile) => void;
  onSwipeModeChange?: (isSwipeMode: boolean) => void;
}

export const SwipeInterface: React.FC<SwipeInterfaceProps> = ({
  onMatch,
  onSwipeModeChange,
}) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const reduceMotion = useReducedMotion();

  const [studentDiscovery, setStudentDiscovery] =
    useState<StudentDiscovery | null>(null);
  const [recommendations, setRecommendations] = useState<UserSearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swipedUsers, setSwipedUsers] = useState<string[]>([]);

  const studentDiscoveryMemo = useMemo(
    () => new StudentDiscovery(getToken),
    [getToken],
  );

  useEffect(() => {
    if (user && studentDiscoveryMemo) setStudentDiscovery(studentDiscoveryMemo);
  }, [user, studentDiscoveryMemo]);

  const loadRecommendations = useCallback(async () => {
    if (!studentDiscovery || !user) return;
    setLoading(true);
    setError(null);
    try {
      const recs = await studentDiscovery.getRecommendations(user.id);
      setRecommendations(
        recs.filter((rec) => !swipedUsers.includes(rec.clerk_user_id)),
      );
      setCurrentIndex(0);
    } catch (err) {
      console.error("[social:swipe:load-recommendations]", err);
      setError("Couldn't load people right now. Try again.");
    } finally {
      setLoading(false);
    }
  }, [studentDiscovery, user, swipedUsers]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  useEffect(() => {
    onSwipeModeChange?.(true);
    return () => onSwipeModeChange?.(false);
  }, [onSwipeModeChange]);

  const childRefs = useMemo(
    () =>
      Array(recommendations.length)
        .fill(0)
        .map(() => createRef<any>()),
    [recommendations.length],
  );

  const onSwipe = async (direction: string, userSwiped: UserSearchResult) => {
    setSwipedUsers((prev) => [...prev, userSwiped.clerk_user_id]);

    if (direction === "right") {
      try {
        const status = await studentDiscovery?.sendConnectionRequest(
          user?.id!,
          userSwiped.clerk_user_id,
        );
        if (status === "accepted") {
          toast.success("It's a match.");
          onMatch?.(userSwiped as UserProfile);
          try {
            await fetch("/api/notifications/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: userSwiped.clerk_user_id,
                notification: {
                  app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
                  headings: { en: "New connection" },
                  contents: {
                    en: `${user?.firstName ?? "Someone"} just matched with you!`,
                  },
                  data: { type: "connection_accept" },
                },
              }),
            });
          } catch {}
        } else {
          toast.success("Request sent");
          try {
            await fetch("/api/notifications/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: userSwiped.clerk_user_id,
                notification: {
                  app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
                  headings: { en: "New connection request" },
                  contents: {
                    en: `${user?.firstName ?? "Someone"} wants to connect with you`,
                  },
                  data: { type: "connection_request" },
                },
              }),
            });
          } catch {}
        }
      } catch (error) {
        console.error("[social:swipe:send-request]", error);
        toast.error("Couldn't send request");
      }
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const onCardLeftScreen = () => {};

  const swipe = async (dir: "left" | "right") => {
    if (currentIndex < recommendations.length) {
      await childRefs[currentIndex].current?.swipe(dir);
    }
  };

  const resetSwipes = () => {
    setSwipedUsers([]);
    setCurrentIndex(0);
    loadRecommendations();
  };

  if (loading) {
    return (
      <div className="flex min-h-[520px] w-full flex-col items-center justify-center gap-6">
        <div className="grid h-[360px] w-full max-w-[22rem] place-items-center">
          <div className="relative h-full w-full">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                aria-hidden
                className={cn(
                  "absolute inset-0 overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/80",
                  "shadow-[0_20px_40px_-24px_hsl(var(--foreground)/0.18)]",
                )}
                style={{
                  transform: `translateY(${i * 8}px) scale(${1 - i * 0.04})`,
                  zIndex: 3 - i,
                  opacity: 1 - i * 0.25,
                }}
              >
                <div className="h-[62%] w-full animate-pulse bg-muted/60" />
                <div className="space-y-2 p-5">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted/60" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted/50" />
                  <div className="flex gap-1.5 pt-1">
                    <div className="h-5 w-14 animate-pulse rounded-full bg-muted/50" />
                    <div className="h-5 w-10 animate-pulse rounded-full bg-muted/50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
          Finding people
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[520px] w-full flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <X className="h-6 w-6" weight="bold" aria-hidden />
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">{error}</p>
        <Button
          onClick={loadRecommendations}
          variant="outline"
          size="sm"
          className="rounded-full"
        >
          <ArrowClockwise className="mr-1.5 h-4 w-4" weight="bold" aria-hidden />
          Retry
        </Button>
      </div>
    );
  }

  const availableCards = recommendations.slice(currentIndex);

  if (availableCards.length === 0) {
    return (
      <div className="flex min-h-[520px] w-full flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <UsersThree className="h-7 w-7" weight="duotone" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold text-foreground">
            You're caught up
          </h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            New students will show up as they join. Reset to see profiles again.
          </p>
        </div>
        <Button
          onClick={resetSwipes}
          variant="outline"
          size="sm"
          className="rounded-full"
        >
          <ArrowClockwise className="mr-1.5 h-4 w-4" weight="bold" aria-hidden />
          Reset deck
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="relative w-full max-w-[22rem]">
        <div className="pointer-events-none absolute -top-3 right-1 z-40 flex items-center gap-1.5 rounded-full bg-background/80 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground shadow-[0_2px_6px_-3px_hsl(var(--foreground)/0.2)]">
          <span className="tabular-nums text-foreground">
            {availableCards.length}
          </span>
          <span>left</span>
        </div>

        <div className="relative h-[520px] w-full">
          {availableCards.slice(0, 3).map((rec, index) => {
            const cardIndex = currentIndex + index;
            const isTopCard = index === 0;
            const chips = [
              ...(rec.subjects ?? []).slice(0, 3).map((s) => ({
                label: s,
                kind: "subject" as const,
              })),
              ...(rec.interests ?? []).slice(0, 2).map((s) => ({
                label: s,
                kind: "interest" as const,
              })),
            ].slice(0, 4);
            const overflow =
              (rec.subjects?.length ?? 0) +
              (rec.interests?.length ?? 0) -
              chips.length;

            return (
              <TinderCard
                ref={childRefs[cardIndex]}
                key={rec.clerk_user_id}
                onSwipe={(dir) => onSwipe(dir, rec)}
                onCardLeftScreen={onCardLeftScreen}
                preventSwipe={["up", "down"]}
                className="absolute inset-0"
                swipeRequirementType="position"
                swipeThreshold={80}
              >
                <motion.article
                  aria-label={`${rec.full_name ?? "Student profile"} card`}
                  animate={
                    isTopCard && !reduceMotion
                      ? { y: [0, -3, 0] }
                      : { y: 0 }
                  }
                  transition={
                    isTopCard && !reduceMotion
                      ? {
                          duration: 6,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                        }
                      : { duration: 0 }
                  }
                  style={{
                    transform: !isTopCard
                      ? `scale(${1 - index * 0.035}) translateY(${index * 10}px)`
                      : undefined,
                    zIndex: 30 - index,
                  }}
                  className={cn(
                    "relative h-full w-full overflow-hidden rounded-[1.75rem] bg-card",
                    "border border-border/50",
                    "shadow-[0_24px_48px_-24px_hsl(var(--foreground)/0.28)]",
                    !isTopCard && "pointer-events-none",
                  )}
                >
                  <div className="relative h-[62%] w-full overflow-hidden bg-muted">
                    <Avatar className="h-full w-full rounded-none">
                      <AvatarImage
                        src={rec.avatar_url || ""}
                        className="h-full w-full object-cover"
                        alt={rec.full_name || "Student avatar"}
                      />
                      <AvatarFallback className="grid h-full w-full place-items-center rounded-none bg-muted text-5xl font-medium text-muted-foreground">
                        {rec.full_name?.charAt(0)?.toUpperCase() || (
                          <UserCircle
                            className="h-14 w-14 text-muted-foreground/70"
                            weight="duotone"
                            aria-hidden
                          />
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(to_top,hsl(var(--card))_5%,transparent_100%)]"
                    />

                    <span
                      aria-hidden
                      className="absolute left-3 top-3 rounded-full bg-background/85 px-2 py-0.5 font-mono text-[0.62rem] tabular-nums text-muted-foreground"
                    >
                      {String(cardIndex + 1).padStart(2, "0")}
                      <span className="mx-0.5 text-muted-foreground/40">/</span>
                      {String(recommendations.length).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex h-[38%] flex-col justify-between px-5 pb-5 pt-2">
                    <div className="space-y-1">
                      <h2 className="line-clamp-1 text-[1.35rem] font-semibold leading-tight tracking-tight text-foreground">
                        {rec.full_name || "Anonymous student"}
                      </h2>
                      {rec.year_of_study ? (
                        <p className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
                          <GraduationCap
                            className="h-3.5 w-3.5"
                            weight="duotone"
                            aria-hidden
                          />
                          <span className="truncate">{rec.year_of_study}</span>
                        </p>
                      ) : null}
                    </div>

                    {chips.length > 0 ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {chips.map((chip, i) => (
                          <li
                            key={`${chip.kind}-${i}`}
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[0.68rem] font-medium",
                              chip.kind === "subject"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {chip.label}
                          </li>
                        ))}
                        {overflow > 0 ? (
                          <li className="rounded-full bg-muted px-2.5 py-0.5 text-[0.68rem] font-medium text-muted-foreground tabular-nums">
                            +{overflow}
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>
                </motion.article>
              </TinderCard>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => swipe("left")}
          disabled={availableCards.length === 0}
          aria-label="Pass"
          className={cn(
            "h-12 w-12 rounded-full border-border/70 bg-card/80",
            "text-muted-foreground transition-all duration-200",
            "hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive",
            "active:scale-[0.94]",
          )}
        >
          <X className="h-5 w-5" weight="bold" aria-hidden />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => swipe("right")}
          disabled={availableCards.length === 0}
          aria-label="Connect"
          className={cn(
            "h-14 w-14 rounded-full border-primary/30 bg-primary text-primary-foreground",
            "shadow-[0_12px_24px_-12px_hsl(var(--primary)/0.5)]",
            "transition-all duration-200",
            "hover:brightness-105",
            "active:scale-[0.94]",
          )}
        >
          <Heart className="h-6 w-6" weight="fill" aria-hidden />
        </Button>
      </div>
    </div>
  );
};
