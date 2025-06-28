import type { Metadata } from 'next';
import { generateNextjsMetadata } from '@/lib/seo/seoConfig';

export const metadata: Metadata = {
  ...generateNextjsMetadata('onboarding'),
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 