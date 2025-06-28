'use client';

import { useUser } from '@clerk/nextjs';
import { PageSeo } from './PageSeo';
import { pageSeoConfigs } from '@/lib/seo/seoConfig';

interface AuthAwareSeoProps {
  pageKey: keyof typeof pageSeoConfigs;
  publicTitle?: string;
  publicDescription?: string;
  privateTitle?: string;
  privateDescription?: string;
  forceNoindex?: boolean;
  forcePublic?: boolean;
}

export const AuthAwareSeo: React.FC<AuthAwareSeoProps> = ({
  pageKey,
  publicTitle,
  publicDescription,
  privateTitle,
  privateDescription,
  forceNoindex = false,
  forcePublic = false,
}) => {
  const { isSignedIn, isLoaded } = useUser();
  
  // Get base configuration
  const baseConfig = pageSeoConfigs[pageKey];
  
  // Determine if we should show private content
  const showPrivateContent = isLoaded && isSignedIn && !forcePublic;
  
  // Determine SEO settings based on authentication state
  const title = showPrivateContent 
    ? (privateTitle || baseConfig.title)
    : (publicTitle || baseConfig.title);
    
  const description = showPrivateContent
    ? (privateDescription || baseConfig.description)
    : (publicDescription || baseConfig.description);
  
  // Always noindex for private content, or if forced
  const shouldNoindex = forceNoindex || showPrivateContent;
  
  return (
    <PageSeo
      title={title}
      description={description}
      canonical={baseConfig.canonical}
      noindex={shouldNoindex}
      nofollow={shouldNoindex}
    />
  );
};

export default AuthAwareSeo; 