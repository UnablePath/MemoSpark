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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MemoSpark",
  },
  formatDetection: {
    telephone: false,
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
    <html lang="en">
      <head>
        {/* Favicon for different browsers and devices */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* PWA meta tags */}
        <meta name="apple-mobile-web-app-title" content="MemoSpark" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
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
