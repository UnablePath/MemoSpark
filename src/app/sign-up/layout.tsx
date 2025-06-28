import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | MemoSpark',
  description: 'Create your free MemoSpark account and start transforming your learning with AI-powered study tools and personalized insights.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 