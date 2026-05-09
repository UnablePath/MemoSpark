"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { StudyGroup } from "@/lib/social/StudyGroupManager";
import { formatStudyGroupActivityLabel } from "@/lib/social/groupDisplay";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  Compass,
  Lock,
  Plus,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* ─────────────── types ─────────────── */

export type CreateGroupBentoPayload = {
  name: string;
  description: string;
  categoryId: string | null;
  privacy: "public" | "private" | "invite_only";
};

interface GroupsBentoProps {
  groups: StudyGroup[];
  /** Optional map of `groupId -> member count` when available on the caller. */
  memberCounts?: Record<string, number>;
  /** Categories for “new group” (same options as Discover tab). */
  categories?: { id: string; name: string }[];
  onOpenGroup: (group: StudyGroup) => void;
  onCreateGroup: (payload: CreateGroupBentoPayload) => Promise<void> | void;
  onDiscover: () => void;
}

function readCount(
  counts: Record<string, number> | undefined,
  id: string,
): number | null {
  if (!counts) return null;
  const v = counts[id];
  return typeof v === "number" ? v : null;
}

/* ─────────────── motion presets ─────────────── */

const SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.7,
};

/** Outer double-shell for the groups stage — keeps the lane visually anchored. */
function GroupsBentoShell({
  eyebrow,
  title,
  trailing,
  children,
}: {
  eyebrow: string;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-border/55 bg-card/45 p-1.5",
        "shadow-[0_28px_64px_-36px_hsl(var(--foreground)/0.38)]",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[2rem]",
          "bg-[radial-gradient(ellipse_88%_56%_at_18%_-8%,hsl(var(--primary)/0.14),transparent_55%)]",
          "opacity-90",
        )}
      />
      <div
        className={cn(
          "relative rounded-[calc(2rem-0.375rem)] border border-border/40 bg-background/75",
          "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.045)]",
        )}
      >
        <header
          className={cn(
            "flex flex-col gap-3 border-b border-border/35 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-5",
          )}
        >
          <div className="min-w-0 space-y-1.5">
            <p
              className={cn(
                "text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground",
              )}
            >
              {eyebrow}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h2>
          </div>
          {trailing ? (
            <div className="flex shrink-0 items-center gap-2">{trailing}</div>
          ) : null}
        </header>
        <div className="p-4 sm:p-5 lg:p-6">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────── shared tile chrome ─────────────── */

/**
 * Double-bezel tile with a cursor-tracking spotlight border on pointer devices.
 * Uses transform/opacity only, no layout-triggering animations.
 */
function useSpotlight() {
  const reduceMotion = useReducedMotion();
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const sx = useSpring(mx, { stiffness: 200, damping: 25 });
  const sy = useSpring(my, { stiffness: 200, damping: 25 });

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (reduceMotion || e.pointerType === "touch") return;
      const rect = e.currentTarget.getBoundingClientRect();
      mx.set(((e.clientX - rect.left) / rect.width) * 100);
      my.set(((e.clientY - rect.top) / rect.height) * 100);
    },
    [mx, my, reduceMotion],
  );

  return { sx, sy, onPointerMove, reduceMotion };
}

/* ─────────────── atoms ─────────────── */

const PrivacyBadge: React.FC<{ level?: string | null }> = ({ level }) => {
  const isLocked = level === "private" || level === "invite_only";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "text-[0.58rem] font-medium uppercase tracking-[0.16em]",
        isLocked
          ? "border-border/60 bg-muted/40 text-muted-foreground"
          : "border-primary/25 bg-primary/10 text-primary",
      )}
    >
      {isLocked ? (
        <Lock className="h-2.5 w-2.5" weight="fill" />
      ) : (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {level === "invite_only"
        ? "Invite"
        : level === "private"
          ? "Private"
          : "Open"}
    </span>
  );
};

/* ─────────────── group tile ─────────────── */

const GroupTile: React.FC<{
  group: StudyGroup;
  hero?: boolean;
  /** Secondary row: denser card, less vertical drama. */
  compact?: boolean;
  index: number;
  memberCount?: number | null;
  onClick: () => void;
}> = ({ group, hero = false, compact = false, index, memberCount, onClick }) => {
  const { sx, sy, onPointerMove, reduceMotion } = useSpotlight();

  return (
    <motion.button
      type="button"
      layoutId={`group-card-${group.id}`}
      onClick={onClick}
      onPointerMove={onPointerMove}
      initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { ...SPRING, delay: 0.04 * index }
      }
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      className={cn(
        "group relative isolate h-full overflow-hidden rounded-[1.5rem] text-left",
        "border border-border/60 bg-card/80 p-1.5",
        "shadow-[0_24px_48px_-32px_hsl(var(--foreground)/0.3)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        compact ? "min-h-[132px] sm:min-h-[140px]" : "min-h-[168px]",
        hero && "min-h-[200px] sm:min-h-[240px]",
      )}
    >
      {/* cursor spotlight */}
      {!reduceMotion ? (
        <motion.span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-px rounded-[1.5rem] opacity-0",
            "transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-100",
          )}
          style={{
            background: `radial-gradient(
              240px circle at ${sx.get()}% ${sy.get()}%,
              hsl(var(--primary) / 0.22),
              transparent 60%
            )`,
          }}
        />
      ) : null}

      {/* inner core */}
      <div
        className={cn(
          "relative flex h-full min-h-0 flex-col rounded-[calc(1.5rem-0.375rem)]",
          "border border-border/40 bg-background/80 p-4 sm:p-5",
          "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
          compact && "p-3.5 sm:p-4",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <motion.div
            layoutId={`group-name-${group.id}`}
            className="min-w-0 flex-1"
          >
            <h3
              className={cn(
                "truncate text-foreground",
                compact && "text-sm font-semibold tracking-tight sm:text-base",
                !compact &&
                  (hero
                    ? "text-xl font-semibold tracking-tight sm:text-2xl"
                    : "text-base font-semibold tracking-tight"),
              )}
            >
              {group.name}
            </h3>
            {group.description ? (
              <p
                className={cn(
                  "mt-1.5 text-muted-foreground",
                  compact && "line-clamp-1 text-xs",
                  !compact &&
                    (hero
                      ? "line-clamp-3 text-sm"
                      : "line-clamp-2 text-xs"),
                )}
              >
                {group.description}
              </p>
            ) : null}
          </motion.div>
          <PrivacyBadge level={group.privacy_level as string | null} />
        </div>

        <div
          className={cn(
            "mt-auto flex items-end justify-between gap-3",
            compact ? "pt-3" : "pt-4",
          )}
        >
          <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
            <UsersThree className="h-3.5 w-3.5" weight="bold" />
            <span className="tabular-nums">
              {typeof memberCount === "number" ? memberCount : "-"}
            </span>
            <span aria-hidden className="opacity-40">
              ·
            </span>
            <span>{formatStudyGroupActivityLabel(group)}</span>
          </div>

          <span
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full",
              "border border-border/60 bg-muted/40 text-foreground/70",
              "duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              "transition-[transform,border-color,background-color,color] group-hover:border-primary/60",
              "group-hover:bg-primary/10 group-hover:text-primary",
              "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
            )}
          >
            <ArrowUpRight className="h-3.5 w-3.5" weight="bold" />
          </span>
        </div>
      </div>
    </motion.button>
  );
};

/* ─────────────── create-group morphing tile ─────────────── */

const CreateGroupMorph: React.FC<{
  onCreate: GroupsBentoProps["onCreateGroup"];
  categories?: { id: string; name: string }[];
}> = ({ onCreate, categories = [] }) => {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<
    "public" | "private" | "invite_only"
  >("public");
  const [submitting, setSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        categoryId,
        privacy,
      });
      setName("");
      setDescription("");
      setCategoryId(null);
      setPrivacy("public");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        layoutId="create-group-morph"
        onClick={() => setOpen(true)}
        whileHover={reduceMotion ? undefined : { y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      className={cn(
        "group relative flex h-full min-h-[168px] w-full flex-col items-start justify-between overflow-hidden",
        "rounded-[1.5rem] border border-dashed border-border/60 bg-card/30 p-5 text-left",
        "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)]",
        "duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "transition-[border-color,background-color,transform]",
        "hover:border-primary/60 hover:bg-primary/5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "lg:min-h-[200px]",
      )}
      >
        <p className="mt-auto text-lg font-semibold tracking-tight text-foreground">
          New group
        </p>
        <span
          className={cn(
            "absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full",
            "border border-border/60 bg-background/80 text-foreground/70",
            "duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "transition-[transform,border-color,background-color,color]",
            "group-hover:border-primary/60 group-hover:bg-primary group-hover:text-primary-foreground",
            "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
          )}
        >
          <Plus className="h-4 w-4" weight="bold" />
        </span>
      </motion.button>

      {isMounted
        ? createPortal(
      <AnimatePresence>
        {open ? (
          <motion.div
            key="create-overlay"
            className="fixed inset-0 z-[14400] flex items-center justify-center p-4 sm:p-6"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute inset-0 z-0 bg-background/94 backdrop-blur-md"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
            />
            <motion.div
              layoutId="create-group-morph"
              className={cn(
                "relative z-10 w-full max-w-lg overflow-hidden rounded-[1.75rem]",
                "border border-border/60 bg-card shadow-[0_40px_90px_-24px_hsl(var(--foreground)/0.45)]",
              )}
            >
              <div
                className={cn(
                  "rounded-[calc(1.75rem-0.375rem)] border border-border/40 bg-background p-6",
                  "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
                      New group
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      "border border-border/60 bg-background text-muted-foreground",
                      "transition hover:text-foreground",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    )}
                    aria-label="Cancel"
                  >
                    <X className="h-4 w-4" weight="bold" />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="group-name" className="text-xs">
                      Name
                    </Label>
                    <Input
                      id="group-name"
                      placeholder="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 rounded-xl"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="group-desc" className="text-xs font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="group-desc"
                      placeholder="Optional"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={categoryId ?? "__none__"}
                        onValueChange={(v) =>
                          setCategoryId(v === "__none__" ? null : v)
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No category</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Privacy</Label>
                      <Select
                        value={privacy}
                        onValueChange={(v) =>
                          setPrivacy(
                            v as "public" | "private" | "invite_only",
                          )
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="invite_only">Invite only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-full px-4",
                      "text-sm font-medium text-muted-foreground transition hover:text-foreground",
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!name.trim() || submitting}
                    className={cn(
                      "group inline-flex h-11 items-center gap-2 rounded-full pl-5 pr-1.5",
                      "bg-primary text-primary-foreground text-sm font-medium",
                      "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    )}
                  >
                    {submitting ? "Creating…" : "Create group"}
                    <span
                      className={cn(
                        "ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full",
                        "bg-primary-foreground/15 transition-all duration-300",
                        "group-hover:translate-x-0.5 group-hover:-translate-y-[1px]",
                      )}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" weight="bold" />
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      , document.body)
        : null}
    </>
  );
};

/* ─────────────── discover tile ─────────────── */

const DiscoverTile: React.FC<{ onClick: () => void; count?: number }> = ({
  onClick,
  count,
}) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      className={cn(
        "group relative flex h-full min-h-[168px] w-full flex-col items-start justify-between overflow-hidden",
        "rounded-[1.5rem] border border-border/60 p-5 text-left",
        "bg-gradient-to-br from-primary/10 via-card/60 to-card/60",
        "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
        "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
      )}
    >
      <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-primary">
        <Compass className="h-3.5 w-3.5" weight="bold" />
        Explore
      </div>
      <div className="mt-auto space-y-1">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          Browse
        </p>
        {typeof count === "number" ? (
          <p className="text-xs tabular-nums text-muted-foreground">
            {count} open
          </p>
        ) : null}
      </div>
      <span
        className={cn(
          "absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full",
          "border border-primary/30 bg-primary/15 text-primary",
          "duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "transition-[transform,border-color,background-color,color]",
          "group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-primary group-hover:text-primary-foreground",
        )}
      >
        <ArrowUpRight className="h-4 w-4" weight="bold" />
      </span>
    </motion.button>
  );
};

/* ─────────────── empty state ─────────────── */

const EmptyBentoState: React.FC<{
  onCreate: GroupsBentoProps["onCreateGroup"];
  onDiscover: () => void;
  categories?: { id: string; name: string }[];
}> = ({ onCreate, onDiscover, categories }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
    >
      <GroupsBentoShell
        eyebrow="Connections"
        title="No groups yet"
        trailing={
          <span
            className={cn(
              "inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1",
              "text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-primary",
            )}
          >
            Start here
          </span>
        }
      >
        <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
          Create a crew for your course, or browse open groups and jump in.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <CreateGroupMorph onCreate={onCreate} categories={categories} />
          <DiscoverTile onClick={onDiscover} />
        </div>
      </GroupsBentoShell>
    </motion.div>
  );
};

/* ─────────────── group detail popover (shared-element morph) ─────────────── */

const GroupDetailPanel: React.FC<{
  group: StudyGroup;
  memberCount?: number | null;
  onClose: () => void;
  onOpenFull: (group: StudyGroup) => void;
}> = ({ group, memberCount, onClose, onOpenFull }) => {
  const reduceMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;
  return createPortal(
    <motion.div
      key="detail-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 z-0 bg-background/94 backdrop-blur-md"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0 }}
      />
      <motion.div
        layoutId={`group-card-${group.id}`}
        className={cn(
          "relative z-10 w-full max-w-lg overflow-hidden rounded-[1.75rem]",
          "border border-border/60 bg-card p-1.5",
          "shadow-[0_40px_90px_-24px_hsl(var(--foreground)/0.45)]",
        )}
      >
        <div
          className={cn(
            "rounded-[calc(1.75rem-0.375rem)] border border-border/40 bg-background p-6",
            "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <motion.div layoutId={`group-name-${group.id}`} className="min-w-0">
              <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
                {group.name}
              </h2>
              {group.description ? (
                <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
                  {group.description}
                </p>
              ) : null}
            </motion.div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                "border border-border/60 bg-background text-muted-foreground transition hover:text-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              )}
              aria-label="Close"
            >
              <X className="h-4 w-4" weight="bold" />
            </button>
          </div>

          <dl
            className="mt-6 divide-y divide-border/45 border-y border-border/45"
            aria-label="Group statistics"
          >
            {[
              {
                label: "Members",
                value:
                  typeof memberCount === "number" ? memberCount : "-",
              },
              { label: "Last active", value: formatStudyGroupActivityLabel(group) },
              {
                label: "Privacy",
                value: (group.privacy_level as string) ?? "public",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-baseline justify-between gap-4 py-3 first:pt-2 last:pb-2"
              >
                <dt className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="truncate text-sm font-semibold capitalize text-foreground tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-full px-4",
                "text-sm font-medium text-muted-foreground transition hover:text-foreground",
              )}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenFull(group);
                onClose();
              }}
              className={cn(
                "group inline-flex h-11 items-center gap-2 rounded-full pl-5 pr-1.5",
                "bg-primary text-primary-foreground text-sm font-medium",
                "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                "active:scale-[0.98]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              )}
            >
              Open
              <span
                className={cn(
                  "ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full",
                  "bg-primary-foreground/15 transition-all duration-300",
                  "group-hover:translate-x-0.5 group-hover:-translate-y-[1px]",
                )}
              >
                <ArrowUpRight className="h-3.5 w-3.5" weight="bold" />
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  , document.body);
};

/* ─────────────── main bento ─────────────── */

export const GroupsBento: React.FC<GroupsBentoProps> = ({
  groups,
  memberCounts,
  categories = [],
  onOpenGroup,
  onCreateGroup,
  onDiscover,
}) => {
  const [selected, setSelected] = useState<StudyGroup | null>(null);
  const [selectedMemberCount, setSelectedMemberCount] = useState<number | null>(null);

  useEffect(() => {
    const loadSelectedCount = async () => {
      if (!selected?.id) {
        setSelectedMemberCount(null);
        return;
      }
      try {
        const response = await fetch(`/api/study-groups/${selected.id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return;
        const members = Array.isArray(payload?.group?.members) ? payload.group.members : [];
        setSelectedMemberCount(members.length);
      } catch {
        setSelectedMemberCount(null);
      }
    };
    void loadSelectedCount();
  }, [selected?.id]);

  if (groups.length === 0) {
    return (
      <LayoutGroup>
        <EmptyBentoState
          onCreate={onCreateGroup}
          onDiscover={onDiscover}
          categories={categories}
        />
      </LayoutGroup>
    );
  }

  const [featured, ...others] = groups;

  return (
    <LayoutGroup>
      <GroupsBentoShell
        eyebrow="Connections"
        title="Your groups"
        trailing={
          <span
            className={cn(
              "inline-flex items-center rounded-full border border-border/55 bg-muted/40 px-3 py-1",
              "text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground tabular-nums",
            )}
          >
            {groups.length} joined
          </span>
        }
      >
        {/*
          Mobile: featured → actions → other groups (thumb-friendly CTAs).
          lg+: explicit 2-column grid — primary column (featured + stack), action rail row-spans 2.
        */}
        <div
          className={cn(
            "flex flex-col gap-5",
            "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,21rem)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-6",
          )}
        >
          <div className="order-1 lg:col-start-1 lg:row-start-1">
            <GroupTile
              group={featured}
              hero
              index={0}
              memberCount={readCount(memberCounts, featured.id)}
              onClick={() => setSelected(featured)}
            />
          </div>

          <div
            className={cn(
              "order-2 flex flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-3 lg:self-start",
            )}
          >
            <CreateGroupMorph
              onCreate={onCreateGroup}
              categories={categories}
            />
            <DiscoverTile onClick={onDiscover} />
          </div>

          {others.length > 0 ? (
            <div
              className={cn(
                "order-3 flex flex-col gap-3 lg:col-start-1 lg:row-start-2",
              )}
            >
              <p
                className={cn(
                  "text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
                )}
              >
                More crews
              </p>
              <div
                className={cn(
                  "flex gap-3 overflow-x-auto overscroll-x-contain pb-0.5",
                  "snap-x snap-mandatory [-webkit-overflow-scrolling:touch]",
                  "sm:grid sm:snap-none sm:overflow-visible sm:pb-0",
                  others.length === 1 ? "sm:grid-cols-1" : "sm:grid-cols-2",
                  "xl:grid-cols-2",
                )}
              >
                {others.map((group, i) => (
                  <div
                    key={group.id}
                    className={cn(
                      "min-w-[min(100%,17rem)] shrink-0 snap-start sm:min-w-0",
                    )}
                  >
                    <GroupTile
                      group={group}
                      compact
                      index={i + 1}
                      memberCount={readCount(memberCounts, group.id)}
                      onClick={() => setSelected(group)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </GroupsBentoShell>

      <AnimatePresence>
        {selected ? (
          <GroupDetailPanel
            key={selected.id}
            group={selected}
            memberCount={
              typeof selectedMemberCount === "number"
                ? selectedMemberCount
                : readCount(memberCounts, selected.id)
            }
            onClose={() => setSelected(null)}
            onOpenFull={onOpenGroup}
          />
        ) : null}
      </AnimatePresence>
    </LayoutGroup>
  );
};
