import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | MemoSpark',
  description: 'Sign in to your MemoSpark account to access your personalized study dashboard and AI-powered learning tools.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 