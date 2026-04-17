import type { Metadata } from 'next';
import { HomePageClient } from '@/components/home/HomePageClient';
import { AIStructuredData } from '@/components/seo/AIOptimizedMeta';
import { generatePageStructuredData } from '@/lib/seo/structuredData';
import { BASE_URL } from '@/lib/seo/seoConfig';

export const metadata: Metadata = {
  title: 'Student life, in one place',
  description:
    'MemoSpark helps students keep up with classes, meet people in their courses, and stay steady when the week gets rough.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Student life, in one place | MemoSpark',
    description:
      'MemoSpark helps students keep up with classes, meet people in their courses, and stay steady when the week gets rough.',
    url: '/',
    siteName: 'MemoSpark',
    images: [
      {
        url: `${BASE_URL}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: 'MemoSpark',
        type: 'image/svg+xml',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Student life, in one place | MemoSpark',
    description:
      'MemoSpark helps students keep up with classes, meet people in their courses, and stay steady when the week gets rough.',
    creator: '@memospark',
    site: '@memospark',
    images: [`${BASE_URL}/og-image.svg`],
  },
};

export default function LandingPage() {
  const structuredDataSchemas = generatePageStructuredData('home');

  return (
    <>
      <AIStructuredData schemas={structuredDataSchemas} />
      <HomePageClient />
    </>
  );
}
