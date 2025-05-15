import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function ClerkOnboardingLayout({ children }: { children: React.ReactNode }) {
  if ((await auth()).sessionClaims?.metadata.onboardingComplete === true) {
    redirect('/') // Redirect to home if onboarding is already complete
  }

  return <>{children}</>
} 