'use client';

import React, { lazy, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

// Lazy load the heavy AIQuestionnaire component
const AIQuestionnaire = lazy(() => import('@/components/ai/AIQuestionnaire').then(module => ({ default: module.AIQuestionnaire })));

// Enhanced loading component for better UX
const QuestionnaireLoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Loading AI Questionnaire</h3>
        <p className="text-sm text-muted-foreground">Preparing your personalized experience...</p>
      </div>
    </div>
  </div>
);

function QuestionnairePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromOnboarding = searchParams.get('from') === 'onboarding';

  const handleQuestionnaireComplete = (patterns: any) => {
    console.log('AI Patterns analyzed:', patterns);
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
              <Button variant="ghost" className="text-muted-foreground">
                Skip for now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      
      <SignedIn>
        <React.Suspense fallback={<div>Loading...</div>}>
          <QuestionnairePageContent />
        </React.Suspense>
      </SignedIn>
    </div>
  );
} 