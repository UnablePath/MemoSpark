import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
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
import { OneSignalProvider } from '@/components/providers/onesignal-provider';
import { NotificationPrompt } from '@/components/notifications/NotificationPrompt';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: '%s | MemoSpark',
    default: 'MemoSpark - AI-Powered Study Companion',
  },
  description: 'Transform your learning with AI-powered task management, smart scheduling, and personalized study insights.',
  keywords: ['study', 'ai', 'task management', 'education', 'productivity', 'learning'],
  authors: [{ name: 'MemoSpark Team' }],
  creator: 'MemoSpark',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://memospark.live'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://memospark.live',
    title: 'MemoSpark - AI-Powered Study Companion',
    description: 'Transform your learning with AI-powered task management, smart scheduling, and personalized study insights.',
    siteName: 'MemoSpark',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MemoSpark - AI-Powered Study Companion',
    description: 'Transform your learning with AI-powered task management, smart scheduling, and personalized study insights.',
    creator: '@memospark',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-256x256.png', sizes: '256x256', type: 'image/png' },
      { url: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: 'MemoSpark',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <html lang="en" suppressHydrationWarning>
      <head>
          {/* OneSignal Web SDK - Official Implementation */}
          <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.OneSignalDeferred = window.OneSignalDeferred || [];
                OneSignalDeferred.push(async function(OneSignal) {
                  await OneSignal.init({
                    appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID}",
                    allowLocalhostAsSecureOrigin: true,
                    autoRegister: false,
                    autoResubscribe: false,
                    safari_web_id: "${process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID || ''}",
                    notifyButton: {
                      enable: false,
                    },
                    welcomeNotification: {
                      disable: false,
                      title: 'MemoSpark',
                      message: 'Thanks for subscribing! 🎉',
                      url: '/dashboard'
                    }
                  });
                });
              `
            }}
          />
          
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
                        <OneSignalProvider>
                    <ClientBody>
                      {children}
                            <PwaInstaller />
                            <NotificationPrompt />
                            <Toaster />
                    </ClientBody>
                        </OneSignalProvider>
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
