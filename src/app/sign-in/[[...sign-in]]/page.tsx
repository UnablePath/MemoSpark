import { SignIn } from "@clerk/nextjs";
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";

// Define the appearance object (can be moved to a shared file later)
const memoSparkClerkAppearance = {
  variables: {
    colorPrimary: 'rgba(59, 130, 246, 0.8)', // Semi-transparent blue
    colorText: 'rgba(15, 23, 42, 0.9)', // Dark text with slight transparency
    colorBackground: 'rgba(255, 255, 255, 0.05)', // Very light transparent background
    colorInputBackground: 'rgba(255, 255, 255, 0.1)', // Slightly more opaque for inputs
    colorInputText: 'rgba(15, 23, 42, 0.9)', // Dark text for inputs
    colorShimmer: 'rgba(59, 130, 246, 0.6)', // Transparent shimmer effect
    borderRadius: '0.5rem', // General border radius for elements within Clerk component (buttons, inputs)
    // fontFamily: 'Linea, sans-serif', // Uncomment if Linea should be default for Clerk UI text
  },
  elements: {
    card: {
      // This 'card' is Clerk's internal main component container.
      // We are wrapping it with our own styled div that looks like a shadcn card.
      // So, we might want Clerk's internal card to be mostly transparent or blend in.
      // Let's make Clerk's card have no shadow and use our wrapper for that.
      boxShadow: 'none',
      border: 'none', // Remove Clerk's default card border, our wrapper will have it.
      padding: '1.5rem', // Default is usually around this (24px)
      backgroundColor: 'transparent', // Transparent to blend with wrapper
      color: 'inherit', // Inherit text color from parent
    },
    formButtonPrimary:
      'w-full bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary rounded-md text-sm font-medium shadow h-11 px-4 py-2',
    formFieldInput:
      'h-9 rounded-md border border-border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary md:text-sm',
    footerActionLink:
      'text-primary hover:text-primary/90 underline-offset-4 hover:underline text-sm',
    socialButtonsBlockButton:
      'w-full border border-border bg-muted shadow-sm hover:bg-muted/80 hover:text-foreground rounded-md h-11 px-4 py-2 text-sm text-foreground transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-primary/30',
    headerTitle: 'text-2xl font-semibold leading-none tracking-tight text-foreground',
    headerSubtitle: 'text-sm text-muted-foreground mt-1', // Added mt-1 for spacing
    dividerText: 'text-xs text-muted-foreground uppercase',
    formFieldLabel: 'text-sm font-medium text-foreground',
    alternativeMethodsBlockButton: 
      'w-full border border-border bg-muted shadow-sm hover:bg-muted/80 hover:text-foreground rounded-md h-11 px-4 py-2 text-sm text-foreground transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-primary/30',
  },
  layout: {
    logoPlacement: 'none' as const, // Use 'as const' for specific literal types
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  }
} as const; // Add 'as const' to the entire object for deep literal types

export default function Page() {
  return (
    // This outer div provides the page background and centering, similar to your old login page.
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[hsl(var(--primary)/0.1)] via-[hsl(var(--background))] to-[hsl(var(--background))] p-4">
      {/* This div acts as the "Card" wrapper from your shadcn UI */}
      <div className="w-full max-w-md bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] rounded-xl border border-[hsl(var(--border))] shadow-xl">
        <div className="flex flex-col items-center p-6"> {/* Header-like section for the logo */}
          <div className="mx-auto mb-6 text-[hsl(var(--primary))]">
            <MemoSparkLogoSvg height={50} />
          </div>
          <SignIn
            path="/sign-in"
            appearance={memoSparkClerkAppearance}
          />
        </div>
      </div>
    </div>
  );
} 