'use client';

import { NextSeo, NextSeoProps } from 'next-seo';
import { defaultSeoConfig, getCanonicalUrl } from '@/lib/seo/seoConfig';

interface PageSeoProps extends Partial<NextSeoProps> {
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
  ...props
}) => {
  const seoProps: NextSeoProps = {
    ...defaultSeoConfig,
    title,
    description: description || defaultSeoConfig.description,
    canonical: canonical || getCanonicalUrl(),
    noindex,
    nofollow,
    openGraph: {
      ...defaultSeoConfig.openGraph,
      title: title ? `${title} | MemoSpark` : defaultSeoConfig.openGraph?.title,
      description: description || defaultSeoConfig.description,
      url: canonical || getCanonicalUrl(),
      ...(ogImage && {
        images: [
          {
            url: ogImage.url,
            width: ogImage.width || 1200,
            height: ogImage.height || 630,
            alt: ogImage.alt || title || 'MemoSpark',
          },
        ],
      }),
    },
    twitter: {
      ...defaultSeoConfig.twitter,
    },
    ...props,
  };

  return <NextSeo {...seoProps} />;
};

export default PageSeo; 