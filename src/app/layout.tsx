import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { UserProvider } from "@/lib/user-context";
import { AIProvider } from "@/lib/ai/aiContext";
import { TutorialProvider } from "@/components/tutorial";
import ClientBody from "./ClientBody";
import { ConditionalHeader } from "@/components/layout/ConditionalHeader";
import { ThemeAwareClerkProvider } from "@/components/providers/clerk-theme-provider";
import { PWAProvider } from "@/components/providers/pwa-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MemoSpark - AI-Powered Student Productivity",
  description: "Transform your study routine with AI-powered task management, smart scheduling, and gamified progress tracking",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MemoSpark",
    // startupImage: [
    //   // TODO: Add startup images for different devices
    // ],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#fadbdb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.className} max-w-full overflow-x-hidden`}>
        <ThemeProvider>
          <ThemeAwareClerkProvider>
            <QueryProvider>
              <UserProvider>
                <AIProvider>
                  <TutorialProvider>
                    <PWAProvider>
                    <ClientBody>
                      <ConditionalHeader />
                      {children}
                    </ClientBody>
                    </PWAProvider>
                  </TutorialProvider>
                </AIProvider>
              </UserProvider>
            </QueryProvider>
          </ThemeAwareClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
