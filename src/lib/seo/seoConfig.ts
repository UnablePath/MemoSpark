import { DefaultSeoProps } from 'next-seo';
import type { Metadata } from 'next';

// Base URL for the application
export const BASE_URL = 'https://www.memospark.live';

// Helper function to generate canonical URLs
export const getCanonicalUrl = (path: string = ''): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${BASE_URL}${cleanPath ? `/${cleanPath}` : ''}`;
};

// Default SEO configuration
export const defaultSeoConfig: DefaultSeoProps = {
  titleTemplate: '%s | MemoSpark',
  defaultTitle: 'MemoSpark - AI-Powered Study Companion',
  description: 'Transform your learning with AI-powered task management, smart scheduling, and personalized study insights.',
  
  // Canonical URL will be set per page
  canonical: BASE_URL,
  
  // OpenGraph configuration
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'MemoSpark',
    title: 'MemoSpark - AI-Powered Study Companion',
    description: 'Transform your learning with AI-powered task management, smart scheduling, and personalized study insights.',
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'MemoSpark - AI-Powered Study Companion',
        type: 'image/png',
      },
    ],
  },
  
  // Twitter Card configuration
  twitter: {
    handle: '@memospark',
    site: '@memospark',
    cardType: 'summary_large_image',
  },
  
  // Additional meta tags
  additionalMetaTags: [
    {
      name: 'keywords',
      content: 'study, ai, task management, education, productivity, learning, scheduling, insights',
    },
    {
      name: 'author',
      content: 'MemoSpark Team',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      name: 'googlebot',
      content: 'index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1',
    },
    {
      name: 'format-detection',
      content: 'telephone=no',
    },
    {
      name: 'mobile-web-app-capable',
      content: 'yes',
    },
    {
      name: 'apple-mobile-web-app-title',
      content: 'MemoSpark',
    },
    {
      name: 'apple-mobile-web-app-status-bar-style',
      content: 'default',
    },
    {
      name: 'theme-color',
      content: '#ffffff',
    },
    {
      name: 'msapplication-TileColor',
      content: '#fadbdb',
    },
  ],
  
  // Additional link tags
  additionalLinkTags: [
    {
      rel: 'icon',
      href: '/icon.svg',
      type: 'image/svg+xml',
    },
    {
      rel: 'icon',
      href: '/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      rel: 'icon',
      href: '/icon-256x256.png',
      sizes: '256x256',
      type: 'image/png',
    },
    {
      rel: 'icon',
      href: '/icon-384x384.png',
      sizes: '384x384',
      type: 'image/png',
    },
    {
      rel: 'icon',
      href: '/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      rel: 'apple-touch-icon',
      href: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
    },
    {
      rel: 'manifest',
      href: '/manifest.webmanifest',
    },
  ],
};

// Page-specific SEO configurations
export const pageSeoConfigs = {
  home: {
    title: 'AI-Powered Study Companion',
    description: 'Transform your learning with AI-powered task management, smart scheduling, and personalized study insights. Join thousands of students improving their academic performance.',
    canonical: getCanonicalUrl(),
  },
  
  dashboard: {
    title: 'Dashboard',
    description: 'Your personalized study dashboard with AI-powered insights, task management, and progress tracking.',
    canonical: getCanonicalUrl('dashboard'),
  },
  
  pricing: {
    title: 'Pricing Plans',
    description: 'Choose the perfect MemoSpark plan for your learning needs. Free and premium options available with AI-powered features.',
    canonical: getCanonicalUrl('pricing'),
  },
  
  about: {
    title: 'About MemoSpark',
    description: 'Learn about MemoSpark\'s mission to revolutionize education through AI-powered study tools and personalized learning experiences.',
    canonical: getCanonicalUrl('about'),
  },
  
  contact: {
    title: 'Contact Us',
    description: 'Get in touch with the MemoSpark team. We\'re here to help you succeed in your learning journey.',
    canonical: getCanonicalUrl('contact'),
  },
  
  profile: {
    title: 'Your Profile',
    description: 'Manage your MemoSpark profile, learning preferences, and AI personalization settings. Customize your study experience and track your academic progress.',
    canonical: getCanonicalUrl('profile'),
  },
  
  settings: {
    title: 'Settings',
    description: 'Customize your MemoSpark experience with notification preferences, theme settings, subscription management, and accessibility options.',
    canonical: getCanonicalUrl('settings'),
  },
  
  subscription: {
    title: 'Subscription & Billing',
    description: 'Manage your MemoSpark subscription, view billing history, and upgrade to premium plans. Compare features and choose the perfect plan for your learning needs.',
    canonical: getCanonicalUrl('settings/subscription'),
  },
  
  'premium-demo': {
    title: 'Premium Features Demo',
    description: 'Explore MemoSpark\'s premium features including advanced AI insights, unlimited task management, and enhanced study planning tools.',
    canonical: getCanonicalUrl('premium-demo'),
  },
  
  onboarding: {
    title: 'Welcome to MemoSpark',
    description: 'Get started with MemoSpark! Complete your setup, personalize your learning experience, and discover how AI can transform your study habits.',
    canonical: getCanonicalUrl('onboarding'),
  },
  
  questionnaire: {
    title: 'AI Learning Assessment',
    description: 'Complete your personalized AI learning assessment to help MemoSpark understand your study habits, preferences, and goals for optimal recommendations.',
    canonical: getCanonicalUrl('questionnaire'),
  },
} as const;

// SEO utility functions
export const generatePageSeo = (pageKey: keyof typeof pageSeoConfigs) => {
  const pageConfig = pageSeoConfigs[pageKey];
  return {
    title: pageConfig.title,
    description: pageConfig.description,
    canonical: pageConfig.canonical,
    openGraph: {
      ...defaultSeoConfig.openGraph,
      title: `${pageConfig.title} | MemoSpark`,
      description: pageConfig.description,
      url: pageConfig.canonical,
    },
    twitter: {
      ...defaultSeoConfig.twitter,
    },
  };
};

// Next.js 15 Metadata generator for layout files
export const generateNextjsMetadata = (pageKey: keyof typeof pageSeoConfigs): Metadata => {
  const pageConfig = pageSeoConfigs[pageKey];
  return {
    title: `${pageConfig.title} | MemoSpark`,
    description: pageConfig.description,
    alternates: {
      canonical: pageConfig.canonical,
    },
    openGraph: {
      title: `${pageConfig.title} | MemoSpark`,
      description: pageConfig.description,
      url: pageConfig.canonical,
      siteName: 'MemoSpark',
      images: [
        {
          url: `${BASE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'MemoSpark - AI-Powered Study Companion',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pageConfig.title} | MemoSpark`,
      description: pageConfig.description,
      site: '@memospark',
      creator: '@memospark',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
};

export default defaultSeoConfig; 