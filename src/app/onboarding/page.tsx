'use client';

import dynamic from 'next/dynamic';

import styles from '@/components/onboarding/OnboardingFlow.module.css';

const OnboardingWizard = dynamic(
  () =>
    import('@/components/onboarding/OnboardingWizard').then((mod) => ({
      default: mod.OnboardingWizard,
    })),
  {
    loading: () => (
      <div
        className={`${styles.root} flex min-h-screen flex-col items-center justify-center gap-4`}
        data-testid="onboarding-loading"
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-white/60">Loading setup…</p>
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
