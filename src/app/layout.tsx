import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { UserProvider } from "@/lib/user-context";
import ClientBody from "./ClientBody";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudySpark - Gamified Study Companion",
  description: "Enhance student engagement with StudySpark's interactive and gamified study experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <UserProvider>
            <ClientBody>
              {children}
            </ClientBody>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
