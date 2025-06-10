<<<<<<< Updated upstream
import type { Appearance } from '@clerk/types';

// Shared Clerk appearance configuration with improved contrast and MemoSpark branding
export const memoSparkClerkAppearance: Appearance = {
  variables: {
    colorPrimary: 'hsl(142, 76%, 36%)', // MemoSpark green
    colorText: 'hsl(0, 0%, 9%)', // High contrast dark text
    colorBackground: 'hsl(0, 0%, 100%)', // Pure white background
    colorInputBackground: 'hsl(0, 0%, 98%)', // Slightly off-white for inputs
    colorInputText: 'hsl(0, 0%, 9%)', // High contrast dark text for inputs
    colorShimmer: 'hsl(142, 76%, 36%)', // MemoSpark green shimmer
    borderRadius: '0.5rem',
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  elements: {
    // Root container
    rootBox: {
      boxShadow: 'none',
      border: 'none',
      padding: '1.5rem',
      backgroundColor: 'transparent',
      color: 'hsl(0, 0%, 9%)',
    },
    // Primary form button
    formButtonPrimary: {
      backgroundColor: 'hsl(142, 76%, 36%)',
      color: 'hsl(0, 0%, 100%)',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      height: '2.5rem',
      padding: '0 1rem',
      transition: 'all 0.2s ease-in-out',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      '&:hover': {
        backgroundColor: 'hsl(142, 76%, 32%)',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
      },
      '&:focus': {
        outline: '2px solid hsl(142, 76%, 36%)',
        outlineOffset: '2px',
      },
    },
    // Form input fields
    formFieldInput: {
      height: '2.5rem',
      borderRadius: '0.5rem',
      border: '1px solid hsl(214, 32%, 91%)',
      backgroundColor: 'hsl(0, 0%, 98%)',
      padding: '0 0.75rem',
      fontSize: '0.875rem',
      color: 'hsl(0, 0%, 9%)',
      transition: 'all 0.2s ease-in-out',
      '&::placeholder': {
        color: 'hsl(0, 0%, 50%)',
      },
      '&:hover': {
        borderColor: 'hsl(142, 76%, 36%)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
      '&:focus': {
        outline: '1px solid hsl(142, 76%, 36%)',
        borderColor: 'hsl(142, 76%, 36%)',
      },
    },
    // Footer action links
    footerActionLink: {
      color: 'hsl(142, 76%, 36%)',
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
      fontSize: '0.875rem',
      fontWeight: '500',
      '&:hover': {
        color: 'hsl(142, 76%, 32%)',
      },
    },
    // Social login buttons
    socialButtonsBlockButton: {
      width: '100%',
      border: '1px solid hsl(214, 32%, 91%)',
      backgroundColor: 'hsl(210, 40%, 94%)',
      color: 'hsl(0, 0%, 9%)',
      borderRadius: '0.5rem',
      height: '2.75rem',
      padding: '0 1rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: 'hsl(210, 40%, 88%)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
    },
    // Error and warning text
    formFieldWarningText: {
      color: 'hsl(0, 84%, 40%)',
      fontSize: '0.75rem',
      marginTop: '0.25rem',
    },
    formFieldErrorText: {
      color: 'hsl(0, 84%, 40%)',
      fontSize: '0.75rem',
      marginTop: '0.25rem',
    },
  } as any, // Use 'as any' to allow custom styling beyond TypeScript definitions
  layout: {
    logoPlacement: 'none' as const,
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
} as const;

// Dark theme variant with high contrast
export const memoSparkClerkAppearanceDark: Appearance = {
  variables: {
    colorPrimary: 'hsl(142, 76%, 36%)', // MemoSpark green
    colorText: 'hsl(0, 0%, 95%)', // High contrast light text
    colorBackground: 'hsl(0, 0%, 9%)', // Dark background
    colorInputBackground: 'hsl(0, 0%, 12%)', // Dark input background
    colorInputText: 'hsl(0, 0%, 95%)', // High contrast light text for inputs
    colorShimmer: 'hsl(142, 76%, 36%)', // MemoSpark green shimmer
    borderRadius: '0.5rem',
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  elements: {
    // Root container
    rootBox: {
      boxShadow: 'none',
      border: 'none',
      padding: '1.5rem',
      backgroundColor: 'transparent',
      color: 'hsl(0, 0%, 95%)',
    },
    // Primary form button
    formButtonPrimary: {
      backgroundColor: 'hsl(142, 76%, 36%)',
      color: 'hsl(0, 0%, 100%)',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      height: '2.5rem',
      padding: '0 1rem',
      transition: 'all 0.2s ease-in-out',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      '&:hover': {
        backgroundColor: 'hsl(142, 76%, 40%)',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
      },
      '&:focus': {
        outline: '2px solid hsl(142, 76%, 36%)',
        outlineOffset: '2px',
      },
    },
    // Form input fields
    formFieldInput: {
      height: '2.5rem',
      borderRadius: '0.5rem',
      border: '1px solid hsl(0, 0%, 25%)',
      backgroundColor: 'hsl(0, 0%, 12%)',
      padding: '0 0.75rem',
      fontSize: '0.875rem',
      color: 'hsl(0, 0%, 95%)',
      transition: 'all 0.2s ease-in-out',
      '&::placeholder': {
        color: 'hsl(0, 0%, 60%)',
      },
      '&:hover': {
        borderColor: 'hsl(142, 76%, 36%)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      '&:focus': {
        outline: '1px solid hsl(142, 76%, 36%)',
        borderColor: 'hsl(142, 76%, 36%)',
      },
    },
    // Footer action links
    footerActionLink: {
      color: 'hsl(142, 76%, 45%)',
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
      fontSize: '0.875rem',
      fontWeight: '500',
      '&:hover': {
        color: 'hsl(142, 76%, 50%)',
      },
    },
    // Social login buttons
    socialButtonsBlockButton: {
      width: '100%',
      border: '1px solid hsl(0, 0%, 25%)',
      backgroundColor: 'hsl(0, 0%, 15%)',
      color: 'hsl(0, 0%, 95%)',
      borderRadius: '0.5rem',
      height: '2.75rem',
      padding: '0 1rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: 'hsl(0, 0%, 20%)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      },
    },
    // Error and warning text
    formFieldWarningText: {
      color: 'hsl(0, 84%, 60%)',
      fontSize: '0.75rem',
      marginTop: '0.25rem',
    },
    formFieldErrorText: {
      color: 'hsl(0, 84%, 60%)',
      fontSize: '0.75rem',
      marginTop: '0.25rem',
    },
  } as any, // Use 'as any' to allow custom styling beyond TypeScript definitions
  layout: {
    logoPlacement: 'none' as const,
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
} as const; 
=======
 
>>>>>>> Stashed changes
