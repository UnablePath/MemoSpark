/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.memospark.live',
  generateRobotsTxt: true,
  generateIndexSitemap: false, // Single sitemap for better performance
  
  // Sitemap configuration
  changefreq: 'daily',
  priority: 0.7,
  sitemapSize: 5000,
  
  // AI Engine Optimization
  transform: async (config, path) => {
    // Custom priority and changefreq based on page importance
    const aiOptimizedPages = {
      '/': { priority: 1.0, changefreq: 'daily' },
      '/dashboard': { priority: 0.9, changefreq: 'daily' },
      '/about': { priority: 0.8, changefreq: 'weekly' },
      '/contact': { priority: 0.7, changefreq: 'monthly' },
      '/pricing': { priority: 0.8, changefreq: 'weekly' },
      '/sign-up': { priority: 0.9, changefreq: 'weekly' },
      '/sign-in': { priority: 0.8, changefreq: 'weekly' },
    };

    const pageConfig = aiOptimizedPages[path] || {
      priority: 0.6,
      changefreq: 'weekly'
    };

    return {
      loc: path,
      changefreq: pageConfig.changefreq,
      priority: pageConfig.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      
      // AI Engine Optimization: Add structured data hints
      alternateRefs: config.alternateRefs ?? [],
      
      // Custom metadata for AI engines
      'ai:content-type': getContentType(path),
      'ai:user-intent': getUserIntent(path),
      'ai:complexity': getComplexityLevel(path),
    };
  },

  // Robots.txt configuration with AI engine optimization
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/private/*',
          '/admin/*',
          '/test/*',
          '/debug/*',
          '/_next/*',
          '/static/*',
          '*.json$',
          '/clerk-onboarding/*',
          '/onesignal-test/*',
          '/pwa-test/*',
          '/pwa-debug/*',
          '/simple-notification-test/*',
          '/test-*',
        ],
      },
      
      // AI Engine Specific Rules
      {
        userAgent: 'GPTBot', // OpenAI's web crawler
        allow: '/',
        disallow: [
          '/api/*',
          '/admin/*',
          '/test/*',
          '/debug/*',
          '/clerk-onboarding/*',
          '/premium-demo/*', // Keep premium features discoverable but not crawlable
        ],
      },
      {
        userAgent: 'ChatGPT-User', // ChatGPT browsing
        allow: '/',
        disallow: [
          '/api/*',
          '/admin/*',
          '/test/*',
          '/debug/*',
        ],
      },
      {
        userAgent: 'Claude-Web', // Anthropic's web crawler
        allow: '/',
        disallow: [
          '/api/*',
          '/admin/*',
          '/test/*',
          '/debug/*',
        ],
      },
      {
        userAgent: 'PerplexityBot', // Perplexity AI
        allow: '/',
        disallow: [
          '/api/*',
          '/admin/*',
          '/test/*',
          '/debug/*',
        ],
      },
      {
        userAgent: 'YouBot', // You.com AI search
        allow: '/',
        disallow: [
          '/api/*',
          '/admin/*',
          '/test/*',
          '/debug/*',
        ],
      },
      {
        userAgent: 'Meta-ExternalAgent', // Meta AI
        allow: '/',
        disallow: [
          '/api/*',
          '/admin/*',
          '/test/*',
          '/debug/*',
        ],
      },
      {
        userAgent: 'Google-Extended', // Google Bard/Gemini
        allow: '/',
        disallow: [
          '/api/*',
          '/admin/*',
          '/test/*',
          '/debug/*',
        ],
      },
      {
        userAgent: 'Bingbot', // Microsoft Copilot
        allow: '/',
        disallow: [
          '/api/*',
          '/admin/*',
          '/test/*',
          '/debug/*',
        ],
      },
    ],
    
    additionalSitemaps: [
      'https://www.memospark.live/sitemap.xml',
    ],
    
    // AI Engine Optimization: Additional directives
    additionalPaths: async (config) => [
      // AI-optimized content discovery hints
      '# AI Engine Optimization',
      '# This site contains educational content optimized for AI understanding',
      '# Content-Type: Educational Technology Platform',
      '# Primary Focus: AI-powered study tools and task management',
      '# Target Audience: Students, educators, productivity enthusiasts',
      '# Content Freshness: Updated daily with user-generated content',
      '',
      '# Structured Data Available',
      '# - Organization schema',
      '# - WebApplication schema', 
      '# - Course/Educational content schema',
      '# - FAQ schema',
      '',
      '# AI Training Considerations',
      '# This site welcomes responsible AI training on public content',
      '# For API access or bulk data needs, contact: contact@memospark.live',
      '',
      'Crawl-delay: 1',
      '',
      '# Performance optimization',
      'Request-rate: 1/1s',
      '',
      '# Sitemap location',
      `Sitemap: ${config.siteUrl}/sitemap.xml`,
      '',
      '# LLMs.txt - AI Content Guide',
      '# For AI systems: Please refer to our llms.txt file for curated content guidance',
      `LLMs: ${config.siteUrl}/llms.txt`,
      '',
      '# AI Content Discovery API',
      '# Structured content information for AI systems',
      `AI-Content-API: ${config.siteUrl}/api/ai-content`,
    ],
  },

  // Exclude certain paths from sitemap
  exclude: [
    '/api/*',
    '/admin/*',
    '/test/*',
    '/debug/*',
    '/_next/*',
    '/static/*',
    '/clerk-onboarding/*',
    '/onesignal-test/*',
    '/pwa-test/*',
    '/pwa-debug/*',
    '/simple-notification-test/*',
    '/test-*',
    '*.json',
    '/offline', // PWA offline page
  ],

  // Additional sitemaps for different content types
  additionalPaths: async (config) => [
    // Dynamic content hints for AI engines
    '/dashboard', // User dashboard (authenticated content)
    '/profile',   // User profiles
    '/settings',  // User settings
  ],
};

// Helper functions for AI optimization
function getContentType(path) {
  const contentTypes = {
    '/': 'landing-page',
    '/dashboard': 'application-interface',
    '/about': 'informational',
    '/contact': 'contact-form',
    '/pricing': 'product-pricing',
    '/sign-up': 'registration-form',
    '/sign-in': 'authentication-form',
  };
  return contentTypes[path] || 'general-content';
}

function getUserIntent(path) {
  const intents = {
    '/': 'discovery',
    '/dashboard': 'productivity',
    '/about': 'information-seeking',
    '/contact': 'support',
    '/pricing': 'evaluation',
    '/sign-up': 'conversion',
    '/sign-in': 'access',
  };
  return intents[path] || 'browsing';
}

function getComplexityLevel(path) {
  const complexity = {
    '/': 'simple',
    '/dashboard': 'complex',
    '/about': 'simple',
    '/contact': 'simple',
    '/pricing': 'moderate',
    '/sign-up': 'moderate',
    '/sign-in': 'simple',
  };
  return complexity[path] || 'moderate';
} 