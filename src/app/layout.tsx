import "@/app/globals.css";
import ClientBody from "@/app/ClientBody";
import { NotificationPrompt } from "@/components/notifications/NotificationPrompt";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";
import { ProfileSyncProvider } from "@/components/providers/ProfileSyncProvider";
import { ThemeAwareClerkProvider } from "@/components/providers/clerk-theme-provider";
import { PatternCacheHydration } from "@/components/providers/pattern-cache-hydration";
import { PremiumPopupProvider } from "@/components/providers/premium-popup-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { TexturaPretextProvider } from "@/components/providers/textura-pretext-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PwaInstaller } from "@/components/pwa/PwaInstaller";
import { ServiceWorkerUpdater } from "@/components/pwa/ServiceWorkerUpdater";
import { TutorialProvider } from "@/components/tutorial/TutorialProvider";
import { NetworkErrorBoundary } from "@/components/ui/NetworkErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { AIProvider } from "@/lib/ai/aiContext";
import { BASE_URL } from "@/lib/seo/seoConfig";
import { UserProvider } from "@/lib/user-context";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Geist, Manrope } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-sans",
});

/** Display font for headings; paired with Geist body via `[data-marketing-home]` in globals.css */
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | MemoSpark",
    default: "MemoSpark - Student life, in one place",
  },
  description:
    "MemoSpark helps students keep up with coursework, find people in their classes, and stay on track when the week gets rough.",
  keywords: [
    "students",
    "study planning",
    "task management",
    "timetables",
    "study groups",
    "messaging",
    "wellness",
    "productivity",
  ],
  authors: [{ name: "MemoSpark Team" }],
  creator: "MemoSpark",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    title: "MemoSpark - Student life, in one place",
    description:
      "MemoSpark helps students keep up with coursework, find people in their classes, and stay on track when the week gets rough.",
    siteName: "MemoSpark",
    images: [
      {
        url: `${BASE_URL}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: "MemoSpark - Student life, in one place",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MemoSpark - Student life, in one place",
    description:
      "MemoSpark helps students keep up with coursework, find people in their classes, and stay on track when the week gets rough.",
    creator: "@memospark",
    site: "@memospark",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/MemoSpark.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MemoSpark",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Performance optimizations - preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link rel="dns-prefetch" href="https://api.memospark.live" />

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
      <body
        className={`${geist.variable} ${manrope.variable} font-sans max-w-full overflow-x-hidden`}
      >
        <ServiceWorkerProvider />
        <ThemeAwareClerkProvider>
          <ThemeProvider>
            <ProfileSyncProvider>
              <PatternCacheHydration />
              <QueryProvider>
                <TexturaPretextProvider>
                  <UserProvider>
                    <AIProvider>
                      <TutorialProvider>
                        <PremiumPopupProvider>
                          <NetworkErrorBoundary>
                            <ClientBody>
                              {children}
                              <PwaInstaller />
                              <ServiceWorkerUpdater />
                              <NotificationPrompt />
                              <Toaster />
                            </ClientBody>
                          </NetworkErrorBoundary>
                        </PremiumPopupProvider>
                      </TutorialProvider>
                    </AIProvider>
                  </UserProvider>
                </TexturaPretextProvider>
              </QueryProvider>
            </ProfileSyncProvider>
          </ThemeProvider>
        </ThemeAwareClerkProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
