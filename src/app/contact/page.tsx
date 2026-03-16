import { AIStructuredData } from '@/components/seo/AIOptimizedMeta';
import { organizationSchema } from '@/lib/seo/structuredData';
import { HomepageNavbar } from '@/components/layout/HomepageNavbar';
import { ContactForm } from '@/components/contact/ContactForm';
import type { Metadata } from 'next';

const SUPPORT_EMAIL = 'support@memospark.app';

export const metadata: Metadata = {
  title: 'Contact | MemoSpark',
  description:
    'Questions or feedback? Reach the MemoSpark team by email and we’ll get back to you.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  const structuredDataSchemas = [organizationSchema];

  return (
    <>
      <AIStructuredData schemas={structuredDataSchemas} />
      <div className="app-container min-h-screen w-full bg-[#0c0e13] text-white">
        <HomepageNavbar />
        <main className="pt-16">
          <section className="w-full bg-[#0c0e13] py-16 md:py-20">
            <div className="responsive-container">
              <div className="mb-10 flex flex-col gap-4 border-b border-white/[0.06] pb-7 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
                    Contact
                  </p>
                  <h1 className="text-3xl font-black tracking-tighter text-white md:text-4xl">
                    Talk to the team.
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-white/55 md:text-base">
                    If something feels off, you have feedback, or you want to partner with MemoSpark,
                    send a note. We read everything.
                  </p>
                </div>
                <div className="text-xs text-white/35">
                  Typical response: <span className="text-white/60">within 24–72 hours</span>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-12">
                <div className="rounded-3xl border border-white/[0.08] bg-[#0a0c10] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] md:p-8 lg:col-span-7">
                  <ContactForm supportEmail={SUPPORT_EMAIL} />
                </div>

                <aside className="rounded-3xl border border-white/[0.08] bg-[#0a0c10] p-6 md:p-8 lg:col-span-5">
                  <h2 className="text-lg font-semibold text-white">What’s best to include</h2>
                  <ul className="mt-4 space-y-3 text-sm text-white/55">
                    <li>
                      <span className="text-white/70">Account email</span> (if it’s about a login or billing issue)
                    </li>
                    <li>
                      <span className="text-white/70">What you were trying to do</span> and what happened instead
                    </li>
                    <li>
                      <span className="text-white/70">Screenshots</span> if it’s a UI bug
                    </li>
                  </ul>

                  <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                    <p className="text-xs text-white/45">
                      Prefer email? Write us at{' '}
                      <a
                        className="text-white/70 underline-offset-4 hover:underline"
                        href={`mailto:${SUPPORT_EMAIL}`}
                      >
                        {SUPPORT_EMAIL}
                      </a>
                      .
                    </p>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
} 