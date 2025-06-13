import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { UserProvider } from "@/lib/user-context";
import { AIProvider } from "@/lib/ai/aiContext";
import ClientBody from "./ClientBody";
import { ConditionalHeader } from "@/components/layout/ConditionalHeader";
import { ThemeAwareClerkProvider } from "@/components/providers/clerk-theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MemoSpark - Your Ultimate Study Companion",
  description: "An innovative app designed to enhance your learning experience with smart task management, collaborative features, and gamified reminders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        {process.env.NODE_ENV === 'development' && (
          <script src="/dev-helpers.js" defer></script>
        )}
      </head>
      <body className={`${inter.className} max-w-full overflow-x-hidden`}>
        <ThemeProvider>
          <ThemeAwareClerkProvider>
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
          </ThemeAwareClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
