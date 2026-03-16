'use client';

import type React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatProps {
  value: string;
  label: string;
  sub: string;
  accent: string;
}

const Stat: React.FC<StatProps> = ({ value, label, sub, accent }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45 }}
    viewport={{ once: true }}
    className="flex flex-col p-5"
  >
    <p className={`mb-1 text-3xl font-black tracking-tighter md:text-4xl ${accent}`}>{value}</p>
    <p className="text-sm font-semibold text-white">{label}</p>
    <p className="mt-1 text-xs text-white/35">{sub}</p>
  </motion.div>
);

interface TestimonialProps {
  name: string;
  role: string;
  content: string;
  rating: number;
}

const Testimonial: React.FC<TestimonialProps> = ({ name, role, content, rating }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45 }}
    viewport={{ once: true }}
    className="flex flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#111620] p-6"
  >
    <div>
      <div className="mb-4 flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-white/15'}`}
          />
        ))}
      </div>
      <blockquote className="text-sm leading-relaxed text-white/65">"{content}"</blockquote>
    </div>
    <div className="mt-5 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0f1319] text-xs font-bold text-white">
        {name.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{name}</p>
        <p className="text-xs text-white/35">{role}</p>
      </div>
    </div>
  </motion.div>
);

export const SocialProof: React.FC = () => {
  const stats: StatProps[] = [
    {
      value: '100+',
      label: 'Students using MemoSpark',
      sub: 'Active on the platform',
      accent: 'text-emerald-400',
    },
    {
      value: '1,000+',
      label: 'Tasks finished',
      sub: 'Completed by students',
      accent: 'text-white',
    },
    {
      value: '87%',
      label: 'Report better follow-through',
      sub: 'Say they stay on track more',
      accent: 'text-blue-400',
    },
    {
      value: '4.6',
      label: 'Average rating',
      sub: 'From student reviews',
      accent: 'text-amber-400',
    },
  ];

  const testimonials: TestimonialProps[] = [
    {
      name: 'Michael S.',
      role: 'Computer Science student',
      content:
        "I stopped missing deadlines. The weekly plan tells me what to do next, so I don't waste time figuring out where to start.",
      rating: 5,
    },
    {
      name: 'Kofi M.',
      role: 'Business Admin student',
      content:
        "The streaks sound simple, but they work. On the days I'm tired, that small nudge is enough to keep me moving.",
      rating: 5,
    },
    {
      name: 'Ama O.',
      role: 'Senior High student',
      content:
        "My schedule used to feel all over the place. Now I can see the week clearly, and I don't panic before tests the way I used to.",
      rating: 5,
    },
  ];

  return (
    <div className="w-full">
      {/* Stats */}
      <div className="border-y border-white/[0.06] bg-[#0c0e13] py-16">
        <div className="responsive-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-12 max-w-xl"
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
              By the numbers
            </p>
            <h2 className="text-3xl font-black tracking-tighter text-white md:text-4xl">
              Students are getting more done
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/[0.06] bg-[#111620]"
              >
                <Stat {...stat} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-[#0c0e13] py-16">
        <div className="responsive-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-12 flex items-end justify-between border-b border-white/[0.06] pb-6"
          >
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
                From students
              </p>
              <h2 className="text-3xl font-black tracking-tighter text-white md:text-4xl">
                What students say
              </h2>
            </div>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <Testimonial key={t.name} {...t} />
            ))}
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="border-t border-white/[0.05] bg-[#0a0c10] py-6">
        <div className="responsive-container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-6 md:gap-10"
          >
            {[
              { dot: 'bg-emerald-400', text: 'Your data remains yours' },
              { dot: 'bg-blue-400', text: 'Private by default' },
              { dot: 'bg-white/30', text: 'Built for everyday use' },
              { dot: 'bg-amber-400', text: 'Support for difficult weeks' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
                <span className="text-xs text-white/35">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
