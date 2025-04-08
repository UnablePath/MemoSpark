import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ClientBody } from "./ClientBody";

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
        <ClientBody>
          {children}
          <Toaster position="top-center" />
        </ClientBody>
      </body>
    </html>
  );
}
