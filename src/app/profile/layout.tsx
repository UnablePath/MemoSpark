import type { Metadata } from 'next';
import { generateNextjsMetadata } from '@/lib/seo/seoConfig';

export const metadata: Metadata = {
  ...generateNextjsMetadata('profile'),
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 