"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Brain,
  MessageSquare,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

interface BentoFeature {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  title: string;
  body: string;
  accent: string;
  border: string;
  preview: React.ReactNode;
  colClass: string;
}

const features: BentoFeature[] = [
  {
    id: "connect",
    icon: <Users className="h-5 w-5 text-primary" />,
    iconBg: "bg-primary/15",
    label: "Student network",
    title: "Find your study people",
    body: "See students in your courses, connect, and message without leaving the app.",
    accent: "text-primary",
    border: "border-border/80",
    colClass: "md:col-span-7",
    preview: (
      <div className="flex items-center gap-2 pt-1">
        <div className="flex -space-x-2">
          {(["K", "A", "M", "E"] as const).map((letter, i) => (
            <div
              key={letter}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-xs font-bold ${
                i === 0
                  ? "bg-primary/35 text-primary-foreground"
                  : i === 1
                    ? "bg-muted text-foreground"
                    : i === 2
                      ? "bg-primary/25 text-foreground"
                      : "bg-secondary text-secondary-foreground"
              }`}
            >
              {letter}
            </div>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">3 shared courses</span>
      </div>
    ),
  },
  {
    id: "crashout",
    icon: <MessageSquare className="h-5 w-5 text-amber-400" />,
    iconBg: "bg-amber-400/10",
    label: "Emotional space",
    title: "The Crashout room",
    body: "For the harder days: post by mood, stay anonymous if you prefer, or keep it in your private journal.",
    accent: "text-amber-400",
    border: "border-amber-400/15",
    colClass: "md:col-span-5",
    preview: (
      <div className="flex flex-wrap gap-1.5 pt-1">
        {["stressed", "overwhelmed", "exhausted", "anxious"].map((m) => (
          <span
            key={m}
            className="rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-2.5 py-1 text-[11px] text-amber-200/80"
          >
            {m}
          </span>
        ))}
      </div>
    ),
  },
  {
    id: "gamification",
    icon: <Trophy className="h-5 w-5 text-primary" />,
    iconBg: "bg-primary/15",
    label: "Gamification",
    title: "Earn while you study",
    body: "Finish work, build streaks, unlock achievements, and use coins on themes or streak recovery.",
    accent: "text-primary",
    border: "border-border/80",
    colClass: "md:col-span-5",
    preview: (
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { val: "10", label: "per task", color: "text-primary" },
          { val: "+25", label: "streak bonus", color: "text-amber-400/90" },
          { val: "1K", label: "century club", color: "text-muted-foreground" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border/60 bg-muted/25 py-2 ps-3 pe-3 text-start"
          >
            <p className={`text-base font-bold ${item.color}`}>{item.val}</p>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "patterns",
    icon: <Brain className="h-5 w-5 text-primary" />,
    iconBg: "bg-primary/12",
    label: "Your rhythm",
    title: "Scheduling that fits how you work",
    body: "MemoSpark learns when you actually get things done and nudges heavy work into those windows.",
    accent: "text-primary",
    border: "border-border/80",
    colClass: "md:col-span-7",
    preview: (
      <div className="mt-1 flex items-start gap-3 rounded-xl border border-border/60 bg-muted/25 px-4 py-3 pt-1">
        <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Heavy sessions moved to 8–10 pm — your most focused hours this week.
        </p>
      </div>
    ),
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="w-full bg-background py-24">
      <div className="responsive-container">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            What you can do here
          </p>
          <h2 className="text-4xl font-black tracking-tighter text-foreground md:text-5xl">
            More than a planner
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
            Start with tasks and timetables. Use the rest when the week gets
            messy.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {features.slice(0, 2).map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              viewport={{ once: true, amount: 0.2 }}
              className={`col-span-1 ${f.colClass} flex flex-col rounded-2xl border bg-card p-7 ${f.border}`}
            >
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${f.iconBg}`}
              >
                {f.icon}
              </div>
              <p
                className={`mb-0.5 text-[10px] font-semibold uppercase tracking-widest ${f.accent} opacity-80`}
              >
                {f.label}
              </p>
              <h3 className="mb-2 text-xl font-bold text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
              {f.preview}
            </motion.div>
          ))}

          {features.slice(2, 4).map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 + i * 0.05 }}
              viewport={{ once: true, amount: 0.2 }}
              className={`col-span-1 ${f.colClass} flex flex-col rounded-2xl border bg-card p-7 ${f.border}`}
            >
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${f.iconBg}`}
              >
                {f.icon}
              </div>
              <p
                className={`mb-0.5 text-[10px] font-semibold uppercase tracking-widest ${f.accent} opacity-80`}
              >
                {f.label}
              </p>
              <h3 className="mb-2 text-xl font-bold text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
              {f.preview}
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            viewport={{ once: true, amount: 0.2 }}
            className="col-span-1 flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 md:col-span-12 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/40">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Full timetable + iCal sync
                </p>
                <p className="text-xs text-muted-foreground">
                  Courses, lecturers, rooms, and colour coding. Your week is
                  easier to read here than in your head.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Voice input</span>
              <span className="text-muted-foreground/35">·</span>
              <span>Timed reminders</span>
              <span className="text-muted-foreground/35">·</span>
              <span>Relaxation audio</span>
              <span className="text-muted-foreground/35">·</span>
              <span>Stress game</span>
              <span className="text-muted-foreground/35">·</span>
              <span>Push notifications</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
