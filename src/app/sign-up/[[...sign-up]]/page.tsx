import { SignUp } from "@clerk/nextjs";
import { StudySparkLogoSvg } from "@/components/ui/StudySparkLogoSvg";

// Define the appearance object (ideally, this would be in a shared file)
const studySparkClerkAppearance = {
  variables: {
    colorPrimary: 'hsl(142, 60%, 40%)',
    colorText: 'hsl(0, 0%, 10%)',
    colorBackground: 'hsl(0, 0%, 100%)',
    colorInputBackground: 'hsl(0, 0%, 98%)',
    colorInputText: 'hsl(0, 0%, 10%)',
    colorShimmer: 'hsl(142, 60%, 60%)',
    borderRadius: '0.5rem',
  },
  elements: {
    card: {
      boxShadow: 'none',
      border: 'none',
      padding: '1.5rem',
      backgroundColor: 'hsl(0, 0%, 100%)',
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
    headerSubtitle: 'text-sm text-[hsl(0,0%,45%)] mt-1',
    dividerText: 'text-xs text-[hsl(0,0%,45%)] uppercase',
    formFieldLabel: 'text-sm font-medium text-[hsl(0,0%,10%)]',
    alternativeMethodsBlockButton: 
      'border border-[hsl(40,30%,80%)] bg-[hsl(0,0%,98%)] shadow-sm hover:bg-[hsl(40,30%,85%)] hover:text-[hsl(0,0%,10%)] rounded-md h-9 px-4 py-2 text-sm text-[hsl(0,0%,10%)]',
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
            <StudySparkLogoSvg height={50} />
          </div>
          <SignUp 
            path="/sign-up" 
            appearance={studySparkClerkAppearance} 
          />
        </div>
      </div>
    </div>
  );
} 