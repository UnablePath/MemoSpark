"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type React from "react";

interface StatProps {
  value: string;
  label: string;
  sub: string;
  accent: string;
  highlight?: boolean;
}

const Stat: React.FC<StatProps> = ({
  value,
  label,
  sub,
  accent,
  highlight,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    viewport={{ once: true }}
    className={cn("flex flex-col", highlight ? "p-6 md:p-7" : "p-5")}
  >
    <p
      className={cn(
        "mb-1 font-black tracking-tighter",
        highlight ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl",
        accent,
      )}
    >
      {value}
    </p>
    <p className="text-sm font-semibold text-foreground">{label}</p>
    <p className="mt-1 text-left text-xs leading-relaxed text-muted-foreground">
      {sub}
    </p>
  </motion.div>
);

interface FeaturedQuoteProps {
  quote: string;
  name: string;
  role: string;
}

const FeaturedQuote: React.FC<FeaturedQuoteProps> = ({ quote, name, role }) => (
  <motion.figure
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    viewport={{ once: true }}
    className="border-l-4 border-primary/50 pl-6 md:pl-10"
  >
    <blockquote className="text-left text-2xl font-semibold leading-snug tracking-tight text-foreground/95 md:text-3xl md:leading-tight">
      &ldquo;{quote}&rdquo;
    </blockquote>
    <figcaption className="mt-8 text-left">
      <span className="block text-sm font-semibold text-foreground">
        {name}
      </span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{role}</span>
    </figcaption>
  </motion.figure>
);

interface SupportingQuoteProps {
  quote: string;
  name: string;
  role: string;
}

const SupportingQuote: React.FC<SupportingQuoteProps> = ({
  quote,
  name,
  role,
}) => (
  <motion.figure
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    viewport={{ once: true }}
    className="flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-card p-6"
  >
    <blockquote className="text-left text-base font-medium leading-relaxed text-muted-foreground md:text-lg">
      &ldquo;{quote}&rdquo;
    </blockquote>
    <figcaption className="mt-6 border-t border-border/60 pt-5 text-left">
      <span className="block text-sm font-semibold text-foreground">
        {name}
      </span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{role}</span>
    </figcaption>
  </motion.figure>
);

export const SocialProof: React.FC = () => {
  const stats: StatProps[] = [
    {
      value: "100+",
      label: "Students using MemoSpark",
      sub: "Active on the platform",
      accent: "text-primary",
      highlight: true,
    },
    {
      value: "1,000+",
      label: "Tasks finished",
      sub: "Completed by students",
      accent: "text-foreground",
    },
    {
      value: "87%",
      label: "Report better follow-through",
      sub: "Say they stay on track more",
      accent: "text-primary/90",
    },
    {
      value: "92%",
      label: "Would recommend",
      sub: "From recent student feedback",
      accent: "text-amber-600 dark:text-amber-400/90",
    },
  ];

  const featured = {
    quote:
      "I stopped missing deadlines. The weekly plan tells me what to do next, so I don't waste time figuring out where to start.",
    name: "Michael S.",
    role: "Computer Science student",
  };

  const supporting = [
    {
      quote:
        "The streaks sound simple, but they work. On the days I'm tired, that small nudge is enough to keep me moving.",
      name: "Kofi M.",
      role: "Business Admin student",
    },
    {
      quote:
        "My schedule used to feel all over the place. Now I can see the week clearly, and I don't panic before tests the way I used to.",
      name: "Ama O.",
      role: "Senior High student",
    },
  ];

  return (
    <div className="w-full">
      <div className="border-y border-border/60 bg-background py-16">
        <div className="responsive-container">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
            className="mb-12 max-w-2xl text-left"
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              By the numbers
            </p>
            <h2 className="text-3xl font-black tracking-tighter text-foreground md:text-4xl">
              Students are getting more done
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "rounded-2xl",
                  stat.highlight
                    ? "col-span-2 border border-border/80 bg-gradient-to-b from-primary/10 to-card md:col-span-1 dark:from-primary/15"
                    : "border border-border/60 bg-card",
                )}
              >
                <Stat {...stat} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-background py-16">
        <div className="responsive-container">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
            className="mb-12 border-b border-border/60 pb-6 text-left"
          >
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              From students
            </p>
            <h2 className="text-3xl font-black tracking-tighter text-foreground md:text-4xl">
              What students say
            </h2>
          </motion.div>

          <div className="flex flex-col gap-12 md:gap-14">
            <FeaturedQuote {...featured} />
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              {supporting.map((t) => (
                <SupportingQuote key={t.name} {...t} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/15 py-6">
        <div className="responsive-container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-start gap-6 md:gap-10"
          >
            {[
              { dot: "bg-primary", text: "Your data remains yours" },
              { dot: "bg-primary/60", text: "Private by default" },
              { dot: "bg-muted-foreground/40", text: "Built for everyday use" },
              {
                dot: "bg-amber-500 dark:bg-amber-400/80",
                text: "Support for difficult weeks",
              },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2">
                <div
                  className={cn("h-1.5 w-1.5 shrink-0 rounded-full", item.dot)}
                />
                <span className="text-left text-xs text-muted-foreground">
                  {item.text}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
