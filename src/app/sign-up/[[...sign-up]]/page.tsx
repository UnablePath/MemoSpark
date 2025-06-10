import { SignUp } from "@clerk/nextjs";
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";

// Define the appearance object (ideally, this would be in a shared file)
const memoSparkClerkAppearance = {
  variables: {
    colorPrimary: 'rgba(59, 130, 246, 0.8)', // Semi-transparent blue
    colorText: 'rgba(15, 23, 42, 0.9)', // Dark text with slight transparency
    colorBackground: 'rgba(255, 255, 255, 0.05)', // Very light transparent background
    colorInputBackground: 'rgba(255, 255, 255, 0.1)', // Slightly more opaque for inputs
    colorInputText: 'rgba(15, 23, 42, 0.9)', // Dark text for inputs
    colorShimmer: 'rgba(59, 130, 246, 0.6)', // Transparent shimmer effect
    borderRadius: '0.5rem',
  },
  elements: {
    card: {
      boxShadow: 'none',
      border: 'none',
      padding: '1.5rem',
      backgroundColor: 'transparent', // Transparent to blend with wrapper
      color: 'inherit', // Inherit text color from parent
    },
    formButtonPrimary:
      'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary rounded-md text-sm font-medium shadow h-9 px-4 py-2',
    formFieldInput:
      'h-9 rounded-md border border-border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary md:text-sm',
    footerActionLink:
      'text-primary hover:text-primary/90 underline-offset-4 hover:underline text-sm',
    socialButtonsBlockButton:
      'border border-border bg-muted shadow-sm hover:bg-muted/80 hover:text-foreground rounded-md h-9 px-4 py-2 text-sm text-foreground',
    headerTitle: 'text-2xl font-semibold leading-none tracking-tight text-foreground',
    headerSubtitle: 'text-sm text-muted-foreground mt-1',
    dividerText: 'text-xs text-muted-foreground uppercase',
    formFieldLabel: 'text-sm font-medium text-foreground',
    alternativeMethodsBlockButton: 
      'border border-border bg-muted shadow-sm hover:bg-muted/80 hover:text-foreground rounded-md h-9 px-4 py-2 text-sm text-foreground',
  },
  layout: {
    logoPlacement: 'none' as const,
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  }
} as const;

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[hsl(var(--primary)/0.1)] via-[hsl(var(--background))] to-[hsl(var(--background))] p-4">
      <div className="w-full max-w-md bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] rounded-xl border border-[hsl(var(--border))] shadow-xl">
        <div className="flex flex-col items-center p-6">
          <div className="mx-auto mb-6 text-[hsl(var(--primary))]">
            <MemoSparkLogoSvg height={50} />
          </div>
          <SignUp 
            path="/sign-up" 
            appearance={memoSparkClerkAppearance} 
          />
        </div>
      </div>
    </div>
  );
} 