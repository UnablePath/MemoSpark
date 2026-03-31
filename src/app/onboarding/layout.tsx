import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { generateNextjsMetadata } from '@/lib/seo/seoConfig';

export const metadata: Metadata = {
  ...generateNextjsMetadata('onboarding'),
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();
  if (userId && sessionClaims?.metadata?.onboardingComplete === true) {
    redirect('/dashboard');
  }

  return <>{children}</>;
} 