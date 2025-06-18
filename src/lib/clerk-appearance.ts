import type { Appearance } from '@clerk/types';

// Shared Clerk appearance configuration with improved contrast and MemoSpark branding
export const memoSparkClerkAppearance: Appearance = {
  variables: {
    colorPrimary: 'hsl(142, 76%, 36%)', // MemoSpark green
    colorText: 'hsl(0, 0%, 5%)', // Very dark text for maximum contrast
    colorTextSecondary: 'hsl(0, 0%, 20%)', // Secondary text
    colorBackground: 'rgba(255, 255, 255, 0.7)', // Translucent white glass
    colorInputBackground: 'rgba(255, 255, 255, 0.8)', // Slightly more opaque for inputs
    colorInputText: 'hsl(0, 0%, 5%)', // Very dark text for inputs
    colorShimmer: 'hsl(142, 76%, 36%)', // MemoSpark green shimmer
    borderRadius: '0.5rem',
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: '0.875rem',
  },
  elements: {
    // Root container - glassy translucent effect
    rootBox: {
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      padding: '1.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.25)', // Translucent glass
      backdropFilter: 'blur(10px) saturate(180%)',
      WebkitBackdropFilter: 'blur(10px) saturate(180%)',
      color: 'hsl(0, 0%, 5%)', // Very dark text for contrast
    },
    // Card and container elements
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      color: 'hsl(0, 0%, 5%)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    cardBox: {
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      color: 'hsl(0, 0%, 5%)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    // Navigation and sidebar elements
    navbar: {
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      color: 'hsl(0, 0%, 5%)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    navbarButton: {
      color: 'hsl(0, 0%, 5%)',
      fontWeight: '600',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        color: 'hsl(0, 0%, 0%)',
      },
    },
    navbarMobileMenuButton: {
      color: 'hsl(0, 0%, 5%)',
    },
    // Sidebar and page navigation
    sidebar: {
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      color: 'hsl(0, 0%, 5%)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    pageScrollBox: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      color: 'hsl(0, 0%, 5%)',
    },
    // Profile section elements
    profileSection: {
      color: 'hsl(0, 0%, 5%)',
    },
    profileSectionPrimaryButton: {
      backgroundColor: 'hsl(142, 76%, 36%)',
      color: 'hsl(0, 0%, 100%)',
    },
    profileSectionTitle: {
      color: 'hsl(0, 0%, 5%)',
      fontSize: '1.125rem',
      fontWeight: '700',
    },
    profileSectionSubtitle: {
      color: 'hsl(0, 0%, 20%)',
      fontSize: '0.875rem',
      fontWeight: '500',
    },
    profileSectionContent: {
      color: 'hsl(0, 0%, 10%)',
    },
    // Text elements
    text: {
      color: 'hsl(0, 0%, 5%)',
    },
    textPrimary: {
      color: 'hsl(0, 0%, 5%)',
      fontWeight: '600',
    },
    textSecondary: {
      color: 'hsl(0, 0%, 20%)',
    },
    // Primary form button
    formButtonPrimary: {
      backgroundColor: 'hsl(142, 76%, 36%)',
      color: 'hsl(0, 0%, 100%)',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '600',
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
    // Form input fields - glassy with dark text
    formFieldInput: {
      height: '2.5rem',
      borderRadius: '0.5rem',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      backgroundColor: 'rgba(255, 255, 255, 0.6)', // Translucent white
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      padding: '0 0.75rem',
      fontSize: '0.875rem',
      color: 'hsl(0, 0%, 5%)', // Very dark text for contrast
      transition: 'all 0.2s ease-in-out',
      '&::placeholder': {
        color: 'hsl(0, 0%, 50%)', // Medium gray placeholder
      },
      '&:hover': {
        borderColor: 'hsl(142, 76%, 36%)',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
      '&:focus': {
        outline: '2px solid hsl(142, 76%, 36%)',
        borderColor: 'hsl(142, 76%, 36%)',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
      },
    },
    // Form field labels
    formFieldLabel: {
      color: 'hsl(0, 0%, 10%)',
      fontSize: '0.875rem',
      fontWeight: '600',
      marginBottom: '0.5rem',
    },
    // Footer action links
    footerActionLink: {
      color: 'hsl(142, 76%, 30%)',
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
      fontSize: '0.875rem',
      fontWeight: '600',
      '&:hover': {
        color: 'hsl(142, 76%, 25%)',
      },
    },
    // Social login buttons - glassy effect
    socialButtonsBlockButton: {
      width: '100%',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      color: 'hsl(0, 0%, 5%)', // Very dark text
      borderRadius: '0.5rem',
      height: '2.75rem',
      padding: '0 1rem',
      fontSize: '0.875rem',
      fontWeight: '600',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'hsl(142, 76%, 36%)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
    },
    // Header and title text
    headerTitle: {
      color: 'hsl(0, 0%, 5%)',
      fontSize: '1.5rem',
      fontWeight: '700',
    },
    headerSubtitle: {
      color: 'hsl(0, 0%, 20%)',
      fontSize: '0.875rem',
      fontWeight: '500',
    },
    // Error and warning text
    formFieldWarningText: {
      color: 'hsl(0, 84%, 35%)',
      fontSize: '0.75rem',
      fontWeight: '500',
      marginTop: '0.25rem',
    },
    formFieldErrorText: {
      color: 'hsl(0, 84%, 35%)',
      fontSize: '0.75rem',
      fontWeight: '500',
      marginTop: '0.25rem',
    },
    // Additional elements for complete coverage
    button: {
      color: 'hsl(0, 0%, 5%)',
      fontWeight: '600',
    },
    link: {
      color: 'hsl(142, 76%, 30%)',
      fontWeight: '600',
    },
    menuButton: {
      color: 'hsl(0, 0%, 5%)',
      fontWeight: '600',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
      },
    },
    menuItem: {
      color: 'hsl(0, 0%, 5%)',
      fontWeight: '500',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
      },
    },
    menuList: {
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    badge: {
      color: 'hsl(0, 0%, 5%)',
    },
    alert: {
      color: 'hsl(0, 0%, 5%)',
    },
  } as any,
  layout: {
    logoPlacement: 'none' as const,
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  }
} as const;

// Dark theme variant with glassy effect and white text
export const memoSparkClerkAppearanceDark: Appearance = {
  variables: {
    colorPrimary: 'hsl(142, 76%, 36%)', // MemoSpark green
    colorText: 'hsl(0, 0%, 98%)', // Near-white text for dark translucent background
    colorTextSecondary: 'hsl(0, 0%, 85%)', // Secondary text
    colorBackground: 'rgba(20, 20, 20, 0.7)', // Translucent dark glass
    colorInputBackground: 'rgba(30, 30, 30, 0.8)', // Slightly more opaque for inputs
    colorInputText: 'hsl(0, 0%, 98%)', // Near-white text for inputs
    colorShimmer: 'hsl(142, 76%, 36%)', // MemoSpark green shimmer
    borderRadius: '0.5rem',
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: '0.875rem',
  },
  elements: {
    // Root container - glassy translucent effect
    rootBox: {
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '1.5rem',
      backgroundColor: 'rgba(20, 20, 20, 0.3)', // Translucent dark glass
      backdropFilter: 'blur(10px) saturate(180%)',
      WebkitBackdropFilter: 'blur(10px) saturate(180%)',
      color: 'hsl(0, 0%, 98%)', // Near-white text for contrast
    },
    // Card and container elements
    card: {
      backgroundColor: 'rgba(30, 30, 30, 0.4)',
      color: 'hsl(0, 0%, 98%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    cardBox: {
      backgroundColor: 'rgba(30, 30, 30, 0.4)',
      color: 'hsl(0, 0%, 98%)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    // Navigation and sidebar elements
    navbar: {
      backgroundColor: 'rgba(30, 30, 30, 0.4)',
      color: 'hsl(0, 0%, 98%)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    navbarButton: {
      color: 'hsl(0, 0%, 98%)',
      fontWeight: '600',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: 'hsl(0, 0%, 100%)',
      },
    },
    navbarMobileMenuButton: {
      color: 'hsl(0, 0%, 98%)',
    },
    // Sidebar and page navigation
    sidebar: {
      backgroundColor: 'rgba(30, 30, 30, 0.4)',
      color: 'hsl(0, 0%, 98%)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    pageScrollBox: {
      backgroundColor: 'rgba(20, 20, 20, 0.2)',
      color: 'hsl(0, 0%, 98%)',
    },
    // Profile section elements
    profileSection: {
      color: 'hsl(0, 0%, 98%)',
    },
    profileSectionPrimaryButton: {
      backgroundColor: 'hsl(142, 76%, 36%)',
      color: 'hsl(0, 0%, 100%)',
    },
    profileSectionTitle: {
      color: 'hsl(0, 0%, 98%)',
      fontSize: '1.125rem',
      fontWeight: '700',
    },
    profileSectionSubtitle: {
      color: 'hsl(0, 0%, 85%)',
      fontSize: '0.875rem',
      fontWeight: '500',
    },
    profileSectionContent: {
      color: 'hsl(0, 0%, 95%)',
    },
    // Text elements
    text: {
      color: 'hsl(0, 0%, 98%)',
    },
    textPrimary: {
      color: 'hsl(0, 0%, 98%)',
      fontWeight: '600',
    },
    textSecondary: {
      color: 'hsl(0, 0%, 85%)',
    },
    // Primary form button
    formButtonPrimary: {
      backgroundColor: 'hsl(142, 76%, 36%)',
      color: 'hsl(0, 0%, 100%)',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '600',
      height: '2.5rem',
      padding: '0 1rem',
      transition: 'all 0.2s ease-in-out',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
      '&:hover': {
        backgroundColor: 'hsl(142, 76%, 40%)',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
      },
      '&:focus': {
        outline: '2px solid hsl(142, 76%, 36%)',
        outlineOffset: '2px',
      },
    },
    // Form input fields - glassy with white text
    formFieldInput: {
      height: '2.5rem',
      borderRadius: '0.5rem',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      backgroundColor: 'rgba(40, 40, 40, 0.6)', // Translucent dark
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      padding: '0 0.75rem',
      fontSize: '0.875rem',
      color: 'hsl(0, 0%, 98%)', // Near-white text for contrast
      transition: 'all 0.2s ease-in-out',
      '&::placeholder': {
        color: 'hsl(0, 0%, 60%)', // Light gray placeholder
      },
      '&:hover': {
        borderColor: 'hsl(142, 76%, 36%)',
        backgroundColor: 'rgba(40, 40, 40, 0.7)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      '&:focus': {
        outline: '2px solid hsl(142, 76%, 36%)',
        borderColor: 'hsl(142, 76%, 36%)',
        backgroundColor: 'rgba(40, 40, 40, 0.8)',
      },
    },
    // Form field labels
    formFieldLabel: {
      color: 'hsl(0, 0%, 95%)',
      fontSize: '0.875rem',
      fontWeight: '600',
      marginBottom: '0.5rem',
    },
    // Footer action links
    footerActionLink: {
      color: 'hsl(142, 76%, 50%)',
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
      fontSize: '0.875rem',
      fontWeight: '600',
      '&:hover': {
        color: 'hsl(142, 76%, 60%)',
      },
    },
    // Social login buttons - glassy effect
    socialButtonsBlockButton: {
      width: '100%',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      backgroundColor: 'rgba(50, 50, 50, 0.5)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      color: 'hsl(0, 0%, 98%)', // Near-white text
      borderRadius: '0.5rem',
      height: '2.75rem',
      padding: '0 1rem',
      fontSize: '0.875rem',
      fontWeight: '600',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: 'rgba(50, 50, 50, 0.7)',
        borderColor: 'hsl(142, 76%, 36%)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      },
    },
    // Header and title text
    headerTitle: {
      color: 'hsl(0, 0%, 98%)',
      fontSize: '1.5rem',
      fontWeight: '700',
    },
    headerSubtitle: {
      color: 'hsl(0, 0%, 85%)',
      fontSize: '0.875rem',
      fontWeight: '500',
    },
    // Error and warning text
    formFieldWarningText: {
      color: 'hsl(0, 84%, 65%)',
      fontSize: '0.75rem',
      fontWeight: '500',
      marginTop: '0.25rem',
    },
    formFieldErrorText: {
      color: 'hsl(0, 84%, 65%)',
      fontSize: '0.75rem',
      fontWeight: '500',
      marginTop: '0.25rem',
    },
    // Additional elements for complete coverage
    button: {
      color: 'hsl(0, 0%, 98%)',
      fontWeight: '600',
    },
    link: {
      color: 'hsl(142, 76%, 50%)',
      fontWeight: '600',
    },
    menuButton: {
      color: 'hsl(0, 0%, 98%)',
      fontWeight: '600',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      },
    },
    menuItem: {
      color: 'hsl(0, 0%, 98%)',
      fontWeight: '500',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      },
    },
    menuList: {
      backgroundColor: 'rgba(30, 30, 30, 0.4)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    },
    badge: {
      color: 'hsl(0, 0%, 98%)',
    },
    alert: {
      color: 'hsl(0, 0%, 98%)',
    },
  } as any,
  layout: {
    logoPlacement: 'none' as const,
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  }
} as const;

export const clerkAppearance: Appearance = {
  // baseTheme: 'light',
  variables: {
    colorPrimary: '#3B82F6',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#1f2937',
    borderRadius: '8px',
  },
  elements: {
    card: 'shadow-lg border border-gray-200',
    headerTitle: 'text-lg font-semibold text-gray-900',
    headerSubtitle: 'text-sm text-gray-600',
  },
};
