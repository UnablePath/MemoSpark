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

declare global {
  interface Window {
    OneSignal?: any;
    gtag?: (...args: any[]) => void;
    _pwaSWListenerAdded?: boolean;
  }
} 