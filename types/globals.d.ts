export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      onboardingComplete?: boolean
    }
  }
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }
} 