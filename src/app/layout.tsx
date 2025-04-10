import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClientBody } from "./ClientBody";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudySpark - Gamified Study Companion",
  description: "Enhance student engagement with StudySpark's interactive and gamified study experience",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ClientBody>
            {children}
          </ClientBody>
        </AuthProvider>
      </body>
    </html>
  );
}
