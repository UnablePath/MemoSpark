import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Push notification test — MemoSpark",
  description:
    "Queue a test notification and verify Web Push, Edge Functions, and Supabase.",
  robots: { index: false, follow: false },
};

export default function NotificationPushTestLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
