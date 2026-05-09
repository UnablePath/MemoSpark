import { AIStructuredData } from '@/components/seo/AIOptimizedMeta';
import { organizationSchema } from '@/lib/seo/structuredData';
import { HomepageNavbar } from '@/components/layout/HomepageNavbar';
import { ContactForm } from '@/components/contact/ContactForm';
import { MEMOSPARK_SUPPORT_EMAIL } from '@/lib/support/memosparkSupportEmail';
import type { Metadata } from 'next';

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
      <div
        className="app-container min-h-screen w-full bg-background text-foreground"
        data-marketing-home
      >
        <HomepageNavbar />
        <main className="pt-16">
          <section className="w-full py-16 md:py-20">
            <div className="responsive-container">
              <div className="mb-10 flex flex-col gap-4 border-b border-border/60 pb-7 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Contact
                  </p>
                  <h1 className="text-3xl font-black tracking-tighter md:text-4xl">
                    Talk to the team.
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                    If something feels off, you have feedback, or you want to partner with MemoSpark,
                    send a note. We read everything.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Typical response: <span className="text-foreground">within 24-72 hours</span>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-12">
                <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm md:p-8 lg:col-span-7">
                  <ContactForm supportEmail={MEMOSPARK_SUPPORT_EMAIL} />
                </div>

                <aside className="rounded-3xl border border-border/70 bg-card p-6 md:p-8 lg:col-span-5">
                  <h2 className="text-lg font-semibold">What to include for faster support</h2>
                  <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <li>
                      <span className="text-foreground">Account email</span> (if it is about login or billing)
                    </li>
                    <li>
                      <span className="text-foreground">What you were trying to do</span> and what happened instead
                    </li>
                    <li>
                      <span className="text-foreground">Screenshots</span> if it is a UI bug
                    </li>
                  </ul>

                  <div className="mt-6 rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">
                      Prefer email? Write us at{' '}
                      <a
                        className="text-foreground underline underline-offset-4"
                        href={`mailto:${MEMOSPARK_SUPPORT_EMAIL}`}
                      >
                        {MEMOSPARK_SUPPORT_EMAIL}
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