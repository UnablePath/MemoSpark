import { BASE_URL } from './seoConfig';

// Organization Schema for AI engines
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MemoSpark',
  description: 'AI-powered study companion for students and educators',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  sameAs: [
    'https://twitter.com/memospark',
    'https://linkedin.com/company/memospark',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@memospark.live',
    url: `${BASE_URL}/contact`,
  },
  foundingDate: '2024',
  industry: 'Educational Technology',
  keywords: [
    'AI education',
    'study tools',
    'task management',
    'productivity',
    'learning optimization',
    'student success',
  ],
};

// WebApplication Schema for AI understanding
export const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'MemoSpark',
  description: 'AI-powered study companion that helps students optimize their learning through intelligent task management and personalized insights',
  url: BASE_URL,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web Browser',
  browserRequirements: 'Requires JavaScript. Modern browser recommended.',
  softwareVersion: '1.0',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    category: 'Freemium',
  },
  featureList: [
    'AI-powered task suggestions',
    'Smart scheduling',
    'Progress tracking',
    'Study analytics',
    'Gamification elements',
    'Social study features',
  ],
  screenshot: `${BASE_URL}/screenshot.png`,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1250',
    bestRating: '5',
    worstRating: '1',
  },
};

// FAQ Schema for AI engines
export const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is MemoSpark?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'MemoSpark is an AI-powered study companion that helps students optimize their learning through intelligent task management, smart scheduling, and personalized study insights.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does AI enhance the study experience?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Our AI analyzes your study patterns, suggests optimal study times, creates personalized task recommendations, and provides insights to improve your learning efficiency.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is MemoSpark free to use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'MemoSpark offers a free tier with core features, and premium plans with advanced AI capabilities and additional tools for enhanced productivity.',
      },
    },
    {
      '@type': 'Question',
      name: 'What devices does MemoSpark support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'MemoSpark is a web-based application that works on all modern browsers and devices, including desktop, tablet, and mobile devices.',
      },
    },
  ],
};

// Course/Educational Content Schema
export const educationalContentSchema = {
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: 'AI-Enhanced Study Methodology',
  description: 'Learn how to leverage AI tools for optimal study performance and academic success',
  provider: {
    '@type': 'Organization',
    name: 'MemoSpark',
    url: BASE_URL,
  },
  educationalLevel: 'All Levels',
  about: 'Study optimization, AI tools, productivity, learning techniques',
  teaches: [
    'AI-powered study planning',
    'Efficient task management',
    'Progress tracking and analytics',
    'Collaborative learning techniques',
  ],
  courseMode: 'online',
  isAccessibleForFree: true,
  inLanguage: 'en',
  timeRequired: 'PT30M', // 30 minutes to get started
};

// BreadcrumbList Schema for navigation
export const createBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

// AI-Optimized Article Schema for blog posts/content
export const createArticleSchema = (article: {
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: article.title,
  description: article.description,
  datePublished: article.datePublished,
  dateModified: article.dateModified || article.datePublished,
  author: {
    '@type': 'Person',
    name: article.author || 'MemoSpark Team',
  },
  publisher: organizationSchema,
  url: article.url,
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': article.url,
  },
  image: `${BASE_URL}/og-image.png`,
  articleSection: 'Education Technology',
  keywords: [
    'AI education',
    'study tips',
    'productivity',
    'learning optimization',
  ],
});

// AI Training Data Schema (for responsible AI training)
export const aiTrainingSchema = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'MemoSpark Educational Content',
  description: 'Public educational content from MemoSpark platform suitable for AI training',
  creator: organizationSchema,
  license: 'https://creativecommons.org/licenses/by/4.0/',
  distribution: {
    '@type': 'DataDownload',
    contentUrl: `${BASE_URL}/api/public-content`,
    encodingFormat: 'application/json',
  },
  keywords: [
    'education',
    'study methods',
    'productivity',
    'AI tools',
    'learning optimization',
  ],
  temporalCoverage: '2024/..',
  spatialCoverage: 'Global',
  isAccessibleForFree: true,
  inLanguage: 'en',
  usageInfo: {
    '@type': 'CreativeWork',
    name: 'AI Training Usage Guidelines',
    description: 'This content is available for responsible AI training. Please respect user privacy and follow ethical AI development practices.',
    url: `${BASE_URL}/ai-usage-guidelines`,
  },
};

// Helper function to inject structured data
export const injectStructuredData = (schema: object) => {
  if (typeof window !== 'undefined') {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }
};

// Helper function to generate all structured data for a page
export const generatePageStructuredData = (pageType: string, customData?: any) => {
  const schemas = [organizationSchema, webApplicationSchema];
  
  switch (pageType) {
    case 'home':
      schemas.push(faqSchema, educationalContentSchema);
      break;
    case 'about':
      schemas.push(aiTrainingSchema);
      break;
    case 'article':
      if (customData) {
        schemas.push(createArticleSchema(customData));
      }
      break;
  }
  
  return schemas;
}; 