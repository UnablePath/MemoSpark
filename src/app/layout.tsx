import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { UserProvider } from "@/lib/user-context";
import { AIProvider } from "@/lib/ai/aiContext";
import { TutorialProvider } from "@/components/tutorial/TutorialProvider";
import { ThemeAwareClerkProvider } from "@/components/providers/clerk-theme-provider";
import { PWAProvider } from "@/components/providers/pwa-provider";
import { ConditionalHeader } from "@/components/layout/ConditionalHeader";
import ClientBody from "@/app/ClientBody";
import { PwaInstaller } from "@/components/pwa/PwaInstaller";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MemoSpark - AI-Powered Student Productivity",
  description: "Transform your study routine with AI-powered task management, smart scheduling, and gamified progress tracking",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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
      <head>
        {/* Favicon for different browsers and devices */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* PWA meta tags */}
        <meta name="apple-mobile-web-app-title" content="MemoSpark" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Microsoft tiles */}
        <meta name="msapplication-TileColor" content="#fadbdb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={`${inter.className} max-w-full overflow-x-hidden`}>
        <ThemeProvider>
          <ThemeAwareClerkProvider>
            <QueryProvider>
              <UserProvider>
                <AIProvider>
                  <TutorialProvider>
                    <PWAProvider>
                      <ClientBody>
                        {children}
                        <PwaInstaller />
                        <Toaster />
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
