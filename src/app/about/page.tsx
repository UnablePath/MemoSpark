import { AIStructuredData } from '@/components/seo/AIOptimizedMeta';
import { generatePageStructuredData } from '@/lib/seo/structuredData';
import { HomepageNavbar } from '@/components/layout/HomepageNavbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | MemoSpark',
  description:
    'MemoSpark is built for real student life: coursework, people in your classes, and support for the harder weeks.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  const structuredDataSchemas = generatePageStructuredData('about');

  return (
    <>
      <AIStructuredData schemas={structuredDataSchemas} />
      <div
        className="app-container min-h-screen w-full bg-[#0c0e13] text-white"
        data-marketing-home
      >
        <HomepageNavbar />
        <main className="pt-16">
          <section className="w-full bg-[#0c0e13] py-16 md:py-20">
            <div className="responsive-container">
              <div className="mb-10 max-w-3xl border-b border-white/[0.06] pb-7">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
                  About
                </p>
                <h1 className="text-3xl font-black tracking-tighter text-white md:text-4xl">
                  Built for student life.
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/55 md:text-base">
                  MemoSpark helps you stay on top of coursework, connect with people in your classes,
                  and keep your head above water when the week gets heavy.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-12">
                <div className="rounded-3xl border border-white/[0.08] bg-[#0a0c10] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] md:p-8 lg:col-span-7">
                  <h2 className="text-lg font-semibold text-white">What we’re building</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">
                    A single place students can organize deadlines, find their people, and get support
                    without needing five different apps to make it work.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      { title: 'Coursework, made manageable', body: 'Plans, tasks, and weekly structure you can actually follow.' },
                      { title: 'Connections that help', body: 'Meet classmates, join groups, and study with people in your lane.' },
                      { title: 'Crashout + private journaling', body: 'A place to vent, reflect, and reset when things are a lot.' },
                      { title: 'Streaks, achievements, and momentum', body: 'Light gamification that keeps you moving.' },
                    ].map((card) => (
                      <div
                        key={card.title}
                        className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"
                      >
                        <p className="text-sm font-semibold text-white">{card.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-white/45">{card.body}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <aside className="rounded-3xl border border-white/[0.08] bg-[#0a0c10] p-6 md:p-8 lg:col-span-5">
                  <h2 className="text-lg font-semibold text-white">Principles</h2>
                  <ul className="mt-4 space-y-3 text-sm text-white/55">
                    <li>
                      <span className="text-white/70">Practical over perfect.</span> Useful defaults beat complicated systems.
                    </li>
                    <li>
                      <span className="text-white/70">Private by default.</span> You choose what’s shared and what stays personal.
                    </li>
                    <li>
                      <span className="text-white/70">Built with students.</span> The details come from real schedules and real weeks.
                    </li>
                  </ul>
                </aside>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
} 