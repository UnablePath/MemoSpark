import { Metadata } from 'next';
import { BASE_URL } from '@/lib/seo/seoConfig';

interface AIOptimizedMetaProps {
  title?: string;
  description?: string;
  contentType?: 'educational' | 'application' | 'article' | 'landing-page';
  aiContext?: {
    primaryPurpose?: string;
    targetAudience?: string;
    contentComplexity?: 'simple' | 'moderate' | 'complex';
    learningOutcomes?: string[];
    prerequisites?: string[];
  };
  structuredData?: object[];
}

// AI-specific meta tags for enhanced content understanding
export function generateAIOptimizedMetadata({
  title = 'MemoSpark - AI-Powered Study Companion',
  description = 'Transform your learning with AI-powered task management, smart scheduling, and personalized study insights.',
  contentType = 'application',
  aiContext = {},
}: AIOptimizedMetaProps): Metadata {
  const {
    primaryPurpose = 'Educational productivity enhancement',
    targetAudience = 'Students, educators, lifelong learners',
    contentComplexity = 'moderate',
    learningOutcomes = ['Improved study efficiency', 'Better task management', 'Enhanced learning outcomes'],
    prerequisites = ['Basic computer literacy', 'Web browser access'],
  } = aiContext;

  return {
    title,
    description,
    other: {
      // AI Engine Optimization Meta Tags
      'ai:content-type': contentType,
      'ai:primary-purpose': primaryPurpose,
      'ai:target-audience': targetAudience,
      'ai:content-complexity': contentComplexity,
      'ai:learning-outcomes': learningOutcomes.join(', '),
      'ai:prerequisites': prerequisites.join(', '),
      
      // Educational Technology Specific
      'education:category': 'productivity-tools',
      'education:level': 'all-levels',
      'education:subject': 'study-skills',
      'education:delivery-method': 'web-application',
      
      // Content Classification for AI
      'content:category': 'educational-technology',
      'content:interaction-level': 'high',
      'content:personalization': 'ai-powered',
      'content:accessibility': 'wcag-compliant',
      
      // AI Training Friendly Tags
      'ai-training:suitable': 'true',
      'ai-training:content-license': 'educational-use',
      'ai-training:privacy-level': 'public-content-only',
      
      // Semantic Web Enhancement
      'semantic:domain': 'education-technology',
      'semantic:concepts': 'artificial-intelligence, education, productivity, task-management',
      'semantic:relationships': 'student-to-tool, user-to-ai-assistant, learner-to-content',
      
      // Performance and Technical Hints for AI
      'technical:framework': 'next.js',
      'technical:rendering': 'server-side-rendering',
      'technical:interactivity': 'high',
      'technical:data-freshness': 'real-time',
      
      // User Experience Context
      'ux:primary-actions': 'create-tasks, track-progress, view-insights',
      'ux:user-journey': 'onboarding -> task-creation -> progress-tracking -> insights',
      'ux:interaction-patterns': 'dashboard, forms, analytics, gamification',
      
      // Business Context for AI Understanding
      'business:model': 'freemium',
      'business:value-proposition': 'ai-enhanced-learning-efficiency',
      'business:competitive-advantage': 'personalized-ai-insights',
    },
  };
}

// Structured Data Component for AI Engines
export function AIStructuredData({ schemas }: { schemas: object[] }) {
  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema, null, 2),
          }}
        />
      ))}
    </>
  );
}

// AI Content Hints Component
export function AIContentHints({ 
  contentType,
  mainTopics,
  difficulty,
  estimatedReadTime,
  lastUpdated,
}: {
  contentType: string;
  mainTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime?: string;
  lastUpdated?: string;
}) {
  return (
    <>
      <meta name="ai:content-classification" content={contentType} />
      <meta name="ai:main-topics" content={mainTopics.join(', ')} />
      <meta name="ai:difficulty-level" content={difficulty} />
      {estimatedReadTime && (
        <meta name="ai:estimated-read-time" content={estimatedReadTime} />
      )}
      {lastUpdated && (
        <meta name="ai:content-freshness" content={lastUpdated} />
      )}
      
      {/* AI Training Context */}
      <meta name="ai-training:content-quality" content="high" />
      <meta name="ai-training:factual-accuracy" content="verified" />
      <meta name="ai-training:bias-assessment" content="minimal" />
      <meta name="ai-training:educational-value" content="high" />
      
      {/* Content Relationships for AI Understanding */}
      <meta name="ai:content-relationships" content="parent-child, sequential, complementary" />
      <meta name="ai:cross-references" content="internal-links, related-topics, prerequisites" />
    </>
  );
}

// AI-Friendly Navigation Hints
export function AINavigationHints({
  currentPage,
  breadcrumbs,
  relatedPages,
  nextActions,
}: {
  currentPage: string;
  breadcrumbs: Array<{ title: string; url: string }>;
  relatedPages?: Array<{ title: string; url: string; relationship: string }>;
  nextActions?: string[];
}) {
  return (
    <>
      <meta name="ai:current-page-context" content={currentPage} />
      <meta name="ai:navigation-breadcrumbs" content={breadcrumbs.map(b => b.title).join(' > ')} />
      {relatedPages && (
        <meta 
          name="ai:related-content" 
          content={relatedPages.map(p => `${p.title}:${p.relationship}`).join(', ')} 
        />
      )}
      {nextActions && (
        <meta name="ai:suggested-actions" content={nextActions.join(', ')} />
      )}
      
      {/* User Journey Context */}
      <meta name="ai:user-journey-stage" content={getUserJourneyStage(currentPage)} />
      <meta name="ai:conversion-potential" content={getConversionPotential(currentPage)} />
    </>
  );
}

// Helper functions
function getUserJourneyStage(page: string): string {
  const stageMap: Record<string, string> = {
    '/': 'awareness',
    '/about': 'consideration',
    '/pricing': 'evaluation',
    '/sign-up': 'conversion',
    '/dashboard': 'activation',
    '/profile': 'engagement',
    '/settings': 'retention',
  };
  return stageMap[page] || 'engagement';
}

function getConversionPotential(page: string): string {
  const conversionMap: Record<string, string> = {
    '/': 'high',
    '/pricing': 'very-high',
    '/sign-up': 'conversion-page',
    '/dashboard': 'retention-focused',
    '/about': 'medium',
    '/contact': 'support-focused',
  };
  return conversionMap[page] || 'medium';
}

export default generateAIOptimizedMetadata; 