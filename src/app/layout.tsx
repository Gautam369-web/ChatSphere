import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

export const metadata: Metadata = {
  title: "ChatSphere - Modern Real-Time Collaboration & Messaging",
  description: "Next-generation real-time team chat, voice messages, group channels, and calls.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans select-none overflow-hidden h-screen h-[100dvh] w-screen bg-slate-950 text-slate-100">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
