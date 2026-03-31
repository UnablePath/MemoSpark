export {}

/** Clerk JWT session claims: Dashboard must map publicMetadata → token (metadata.*). */
declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      onboardingComplete?: boolean
      onboardingVersion?: number
      onboardingCompletedAt?: string
      name?: string
      email?: string
      yearOfStudy?: string
      birthDate?: string
      interests?: string[]
      learningStyle?: string
      subjects?: string[]
      aiPreferences?: {
        difficulty?: number
        explanationStyle?: 'simple' | 'balanced' | 'detailed' | string
        interactionFrequency?: 'minimal' | 'moderate' | 'frequent' | string
      }
      /** Breaking-change rule: bump `onboardingVersion` when removing or renaming keys. */
    }
  }
}

declare global {
  interface Navigator {
    standalone?: boolean
  }
}

declare global {
  interface Window {
    OneSignal?: unknown
    gtag?: (...args: unknown[]) => void
    _pwaSWListenerAdded?: boolean
  }
}
