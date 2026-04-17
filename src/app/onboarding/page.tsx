'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import styles from '@/components/onboarding/OnboardingFlow.module.css';

const OnboardingWizard = dynamic(
  () =>
    import('@/components/onboarding/OnboardingWizard').then((mod) => ({
      default: mod.OnboardingWizard,
    })),
  {
    loading: () => (
      <div
        className={`${styles.root} flex min-h-screen flex-col items-center justify-center gap-5 px-4`}
        data-testid="onboarding-loading"
      >
        <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
          <Skeleton className="mb-4 h-6 w-40" />
          <Skeleton className="mb-3 h-4 w-full" />
          <Skeleton className="mb-3 h-4 w-10/12" />
          <Skeleton className="h-11 w-full" />
        </div>
        <p className="text-sm text-muted-foreground">Preparing your setup flow...</p>
      </div>
    ),
  }
);

export default function OnboardingPage() {
  return (
    <main data-onboarding-root className={styles.root}>
      <OnboardingWizard />
    </main>
  );
}
