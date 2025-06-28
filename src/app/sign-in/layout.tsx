import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | MemoSpark',
  description: 'Sign in to your MemoSpark account to access your personalized study dashboard and AI-powered learning tools.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 