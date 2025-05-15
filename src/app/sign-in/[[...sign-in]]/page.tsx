import { SignIn } from "@clerk/nextjs";
import { StudySparkLogoSvg } from "@/components/ui/StudySparkLogoSvg";

// Define the appearance object (can be moved to a shared file later)
const studySparkClerkAppearance = {
  variables: {
    colorPrimary: 'hsl(142, 60%, 40%)',
    colorText: 'hsl(0, 0%, 10%)',
    colorBackground: 'hsl(0, 0%, 100%)', // Card background for Clerk component
    colorInputBackground: 'hsl(0, 0%, 98%)',
    colorInputText: 'hsl(0, 0%, 10%)',
    colorShimmer: 'hsl(142, 60%, 60%)',
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
      backgroundColor: 'hsl(0, 0%, 100%)', // Ensure it's white like our card content area
    },
    formButtonPrimary:
      'bg-[hsl(142,60%,40%)] text-[hsl(0,0%,100%)] hover:bg-[hsl(142,60%,35%)] focus-visible:ring-[hsl(142,60%,40%)] rounded-md text-sm font-medium shadow h-9 px-4 py-2',
    formFieldInput:
      'h-9 rounded-md border border-[hsl(40,30%,80%)] bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[hsl(0,0%,10%)] placeholder:text-[hsl(0,0%,45%)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(142,60%,40%)] md:text-sm',
    footerActionLink:
      'text-[hsl(142,60%,40%)] hover:text-[hsl(142,60%,35%)] underline-offset-4 hover:underline text-sm',
    socialButtonsBlockButton:
      'border border-[hsl(40,30%,80%)] bg-[hsl(0,0%,98%)] shadow-sm hover:bg-[hsl(40,30%,85%)] hover:text-[hsl(0,0%,10%)] rounded-md h-9 px-4 py-2 text-sm text-[hsl(0,0%,10%)]',
    headerTitle: 'text-2xl font-semibold leading-none tracking-tight text-[hsl(0,0%,10%)]',
    headerSubtitle: 'text-sm text-[hsl(0,0%,45%)] mt-1', // Added mt-1 for spacing
    dividerText: 'text-xs text-[hsl(0,0%,45%)] uppercase',
    formFieldLabel: 'text-sm font-medium text-[hsl(0,0%,10%)]',
    alternativeMethodsBlockButton: 
      'border border-[hsl(40,30%,80%)] bg-[hsl(0,0%,98%)] shadow-sm hover:bg-[hsl(40,30%,85%)] hover:text-[hsl(0,0%,10%)] rounded-md h-9 px-4 py-2 text-sm text-[hsl(0,0%,10%)]',
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
            <StudySparkLogoSvg height={50} />
          </div>
          <SignIn
            path="/sign-in"
            appearance={studySparkClerkAppearance}
          />
        </div>
      </div>
    </div>
  );
} 