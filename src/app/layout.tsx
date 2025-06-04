import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
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
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
      border: '1px solid hsl(40, 30%, 80%)',
      borderRadius: '0.75rem',
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
    userButtonPopoverCard: {
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
        border: '1px solid hsl(40, 30%, 80%)',
        borderRadius: '0.75rem',
    },
    userButtonPopoverActionButton:
        'text-[hsl(0,0%,10%)] hover:bg-[hsl(40,30%,92%)] flex items-center gap-2 w-full',
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
        <body className={inter.className}>
          <ThemeProvider>
            <UserProvider>
              <AIProvider>
                <ClientBody>
                  <ConditionalHeader />
                  {children}
                </ClientBody>
              </AIProvider>
            </UserProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
