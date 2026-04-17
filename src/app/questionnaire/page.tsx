'use client';

import React, { lazy, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Show, RedirectToSignIn } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

// Lazy load the heavy AIQuestionnaire component
const AIQuestionnaire = lazy(() => import('@/components/ai/AIQuestionnaire').then(module => ({ default: module.AIQuestionnaire })));

// Enhanced loading component for better UX
const QuestionnaireLoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-emerald-500" aria-hidden />
      <div className="text-center text-zinc-100">
        <h3 className="text-lg font-semibold mb-2">Loading questionnaire</h3>
        <p className="text-sm text-zinc-400">Preparing your study profile…</p>
      </div>
    </div>
  </div>
);

function QuestionnairePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromOnboarding = searchParams.get('from') === 'onboarding';

  const handleQuestionnaireComplete = (_patterns: unknown) => {
    // Redirect to dashboard after completion
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000); // Give user 2 seconds to see completion message before auto-redirect
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {fromOnboarding ? (
          <div className="mb-6 text-right">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-zinc-400 hover:text-zinc-100">
                Skip for now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        )}
        
        {/* Questionnaire Component - Lazy Loaded */}
        <Suspense fallback={<QuestionnaireLoadingSpinner />}>
          <AIQuestionnaire 
            onComplete={handleQuestionnaireComplete}
            className="w-full"
          />
        </Suspense>
      </div>
    </div>
  );
}

export default function QuestionnairePage() {
  return (
    <div className="min-h-screen bg-[#0c0e13] text-zinc-100">
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      
      <Show when="signed-in">
        <React.Suspense
          fallback={
            <div className="container mx-auto max-w-4xl px-4 py-10 md:py-12">
              <div className="space-y-4 rounded-3xl border border-border/60 bg-card/40 p-6">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-40 w-full" />
              </div>
            </div>
          }
        >
          <QuestionnairePageContent />
        </React.Suspense>
      </Show>
    </div>
  );
} 