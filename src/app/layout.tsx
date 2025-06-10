import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { UserProvider } from "@/lib/user-context";
import { AIProvider } from "@/lib/ai/aiContext";
import ClientBody from "./ClientBody";
import { ClerkProvider } from "@clerk/nextjs";
import { ConditionalHeader } from "@/components/layout/ConditionalHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MemoSpark - Your Ultimate Study Companion",
  description: "An innovative app designed to enhance your learning experience with smart task management, collaborative features, and gamified reminders.",
};

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
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0.75rem',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      color: 'inherit',
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
    userButtonPopoverCard: {
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.75rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        color: 'inherit',
    },
    userButtonPopoverActionButton:
        'text-foreground hover:bg-muted/80 flex items-center gap-2 w-full',
    userButtonPopoverFooter:
        'hidden', 
  },
  layout: {
    logoPlacement: 'none' as const,
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  }
} as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={memoSparkClerkAppearance}>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        </head>
        <body className={`${inter.className} max-w-full overflow-x-hidden`}>
          <ThemeProvider>
            <QueryProvider>
              <UserProvider>
                <AIProvider>
                  <ClientBody>
                    <ConditionalHeader />
                    {children}
                  </ClientBody>
                </AIProvider>
              </UserProvider>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
