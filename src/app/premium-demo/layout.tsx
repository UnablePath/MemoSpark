import type { Metadata } from 'next';
import { generateNextjsMetadata } from '@/lib/seo/seoConfig';

export const metadata: Metadata = {
  ...generateNextjsMetadata('premium-demo'),
};

export default function PremiumDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 