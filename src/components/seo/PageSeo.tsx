'use client';

import Head from 'next/head';
import { defaultSeoConfig, getCanonicalUrl } from '@/lib/seo/seoConfig';

interface PageSeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogImage?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
}

export const PageSeo: React.FC<PageSeoProps> = ({
  title,
  description,
  canonical,
  noindex = false,
  nofollow = false,
  ogImage,
}) => {
  const fullTitle = title ? `${title} | MemoSpark` : 'MemoSpark - AI-Powered Study Companion';
  const seoDescription = description || defaultSeoConfig.description;
  const canonicalUrl = canonical || getCanonicalUrl();

  const robotsContent = [
    noindex ? 'noindex' : 'index',
    nofollow ? 'nofollow' : 'follow'
  ].join(', ');

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="robots" content={robotsContent} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="MemoSpark" />
      <meta property="og:locale" content="en_US" />
      
      {ogImage ? (
        <>
          <meta property="og:image" content={ogImage.url} />
          <meta property="og:image:width" content={String(ogImage.width || 1200)} />
          <meta property="og:image:height" content={String(ogImage.height || 630)} />
          <meta property="og:image:alt" content={ogImage.alt || fullTitle} />
        </>
      ) : (
        <>
          <meta property="og:image" content={`${defaultSeoConfig.openGraph?.url || ''}/og-image.png`} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content={fullTitle} />
        </>
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:creator" content="@memospark" />
      <meta name="twitter:site" content="@memospark" />
      
      {/* Additional SEO meta tags */}
      <meta name="author" content="MemoSpark Team" />
      <meta name="creator" content="MemoSpark" />
    </Head>
  );
};

export default PageSeo; 