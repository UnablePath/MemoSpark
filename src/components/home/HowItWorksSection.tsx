'use client';

import { motion } from 'framer-motion';
import { Users, MessageSquare, Trophy, Brain, BookOpen, Zap } from 'lucide-react';

interface BentoFeature {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  title: string;
  body: string;
  accent: string;
  bg: string;
  border: string;
  preview: React.ReactNode;
  colClass: string;
}

const features: BentoFeature[] = [
  {
    id: 'connect',
    icon: <Users className="h-5 w-5 text-blue-400" />,
    iconBg: 'bg-blue-500/15',
    label: 'Student network',
    title: 'Find your study people',
    body: 'See students in your courses, connect, and message without leaving the app.',
    accent: 'text-blue-400',
    bg: 'bg-[#0e1320]',
    border: 'border-blue-400/[0.08]',
    colClass: 'md:col-span-7',
    preview: (
      <div className="flex items-center gap-2 pt-1">
        <div className="flex -space-x-2">
          {(['K', 'A', 'M', 'E'] as const).map((letter, i) => (
            <div
              key={letter}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0e1320] text-xs font-bold ${
                i === 0
                  ? 'bg-blue-500/30 text-blue-300'
                  : i === 1
                    ? 'bg-purple-500/30 text-purple-300'
                    : i === 2
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/30 text-amber-300'
              }`}
            >
              {letter}
            </div>
          ))}
        </div>
        <span className="text-xs text-white/30">3 shared courses</span>
      </div>
    ),
  },
  {
    id: 'crashout',
    icon: <MessageSquare className="h-5 w-5 text-amber-400" />,
    iconBg: 'bg-amber-400/10',
    label: 'Emotional space',
    title: 'The Crashout room',
    body: 'For the harder days: post by mood, stay anonymous if you prefer, or keep it in your private journal.',
    accent: 'text-amber-400',
    bg: 'bg-[#13100a]',
    border: 'border-amber-400/[0.08]',
    colClass: 'md:col-span-5',
    preview: (
      <div className="flex flex-wrap gap-1.5 pt-1">
        {['stressed', 'overwhelmed', 'exhausted', 'anxious'].map((m) => (
          <span
            key={m}
            className="rounded-full border border-amber-400/15 bg-amber-400/[0.07] px-2.5 py-1 text-[11px] text-amber-300/65"
          >
            {m}
          </span>
        ))}
      </div>
    ),
  },
  {
    id: 'gamification',
    icon: <Trophy className="h-5 w-5 text-emerald-400" />,
    iconBg: 'bg-emerald-500/15',
    label: 'Gamification',
    title: 'Earn while you study',
    body: 'Finish work, build streaks, unlock achievements, and use coins on themes or streak recovery.',
    accent: 'text-emerald-400',
    bg: 'bg-[#0a120e]',
    border: 'border-emerald-400/[0.08]',
    colClass: 'md:col-span-5',
    preview: (
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { val: '10', label: 'per task', color: 'text-emerald-400' },
          { val: '+25', label: 'streak bonus', color: 'text-amber-400' },
          { val: '1K', label: 'century club', color: 'text-purple-400' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/[0.06] bg-[#111620] py-2 text-center"
          >
            <p className={`text-base font-bold ${item.color}`}>{item.val}</p>
            <p className="text-[10px] text-white/30">{item.label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'ai',
    icon: <Brain className="h-5 w-5 text-purple-400" />,
    iconBg: 'bg-purple-500/15',
    label: 'AI system',
    title: 'AI that knows your patterns',
    body: "Stu watches your patterns and helps place work when you're most likely to get it done.",
    accent: 'text-purple-400',
    bg: 'bg-[#0f0d15]',
    border: 'border-purple-400/[0.08]',
    colClass: 'md:col-span-7',
    preview: (
      <div className="flex items-start gap-3 rounded-xl border border-purple-400/15 bg-purple-500/[0.07] px-4 py-3 pt-1 mt-1">
        <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
        <p className="text-xs leading-relaxed text-purple-200/65">
          "You work best between 8–10 pm. I've moved your heavy sessions there."
        </p>
      </div>
    ),
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="w-full bg-[#0c0e13] py-24">
      <div className="responsive-container">
        {/* Left-aligned editorial header */}
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400/65">
            What you can do here
          </p>
          <h2 className="text-4xl font-black tracking-tighter text-white md:text-5xl">
            More than a planner
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-white/40 md:text-lg">
            Start with tasks and timetables. Use the rest when the week gets messy.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Row 1 */}
          {features.slice(0, 2).map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: i * 0.07 }}
              viewport={{ once: true, amount: 0.2 }}
              className={`col-span-1 ${f.colClass} ${f.bg} rounded-2xl border ${f.border} p-7 flex flex-col`}
            >
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${f.iconBg}`}>
                {f.icon}
              </div>
              <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-widest ${f.accent} opacity-70`}>
                {f.label}
              </p>
              <h3 className="mb-2 text-xl font-bold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-white/45">{f.body}</p>
              {f.preview}
            </motion.div>
          ))}

          {/* Row 2 */}
          {features.slice(2, 4).map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.1 + i * 0.07 }}
              viewport={{ once: true, amount: 0.2 }}
              className={`col-span-1 ${f.colClass} ${f.bg} rounded-2xl border ${f.border} p-7 flex flex-col`}
            >
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${f.iconBg}`}>
                {f.icon}
              </div>
              <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-widest ${f.accent} opacity-70`}>
                {f.label}
              </p>
              <h3 className="mb-2 text-xl font-bold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-white/45">{f.body}</p>
              {f.preview}
            </motion.div>
          ))}

          {/* Full-width row: Timetable + extras */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, delay: 0.2 }}
            viewport={{ once: true, amount: 0.2 }}
            className="col-span-1 md:col-span-12 flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-[#111620] p-6 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                <BookOpen className="h-5 w-5 text-white/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Full timetable + iCal sync</p>
                <p className="text-xs text-white/35">
                  Courses, lecturers, rooms, and colour coding. Your week is easier to read here than in your head.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/25">
              <span>Voice input</span>
              <span className="text-white/10">·</span>
              <span>Smart reminders</span>
              <span className="text-white/10">·</span>
              <span>Relaxation audio</span>
              <span className="text-white/10">·</span>
              <span>Stress game</span>
              <span className="text-white/10">·</span>
              <span>Push notifications</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
