import type { Metadata } from 'next';
import { generateNextjsMetadata } from '@/lib/seo/seoConfig';

export const metadata: Metadata = {
  ...generateNextjsMetadata('questionnaire'),
  robots: {
    index: false,
    follow: false,
  },
};

export default function QuestionnaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 