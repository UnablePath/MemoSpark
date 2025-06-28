import type { Metadata } from 'next';
import { generateNextjsMetadata } from '@/lib/seo/seoConfig';

export const metadata: Metadata = {
  ...generateNextjsMetadata('settings'),
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 