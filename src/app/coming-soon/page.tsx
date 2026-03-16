import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { MemoSparkLogoSvg } from '@/components/ui/MemoSparkLogoSvg';

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#0c0e13] text-white">
      <div className="responsive-container py-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white/70"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to MemoSpark
          </Link>
          <MemoSparkLogoSvg height={28} className="opacity-70" />
        </div>

        <main className="mx-auto mt-10 max-w-3xl">
          <div className="mb-8 rounded-3xl border border-white/[0.08] bg-[#0a0c10] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
              <Clock className="h-3.5 w-3.5" />
              Coming soon
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tighter text-white md:text-4xl">
              PromptU
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/55 md:text-base">
              We’re the team behind MemoSpark. This page is a placeholder while we package up more of
              what we’re building.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: 'Product work',
                  body: 'More tools that help students stay organized and keep momentum through the week.',
                },
                {
                  title: 'Infrastructure',
                  body: 'Better reliability, performance, and analytics so MemoSpark stays fast as it grows.',
                },
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

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild className="h-11 bg-white font-semibold text-black hover:bg-white/90">
                <Link href="/dashboard">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Open MemoSpark
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 border-white/15 bg-transparent text-white hover:bg-white/5"
              >
                <Link href="/">See the homepage</Link>
              </Button>
            </div>
          </div>

          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} MemoSpark by PromptU.
          </p>
        </main>
      </div>
    </div>
  );
}
