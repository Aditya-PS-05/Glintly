import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import AuthSessionProvider from "@/components/providers/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Glintly — Prompt to production-ready app",
  description:
    "Describe an app in plain English. Glintly spins up a Next.js app in an E2B sandbox, streams the generated code, and pushes it to GitHub in seconds.",
};

/**
 * Root layout component that sets up global providers, fonts, and theming for the application.
 *
 * Wraps the app with tRPC, authentication session, and theme providers, applies global font styles, and includes a toast notification system.
 *
 * @param children - The content to render within the layout
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TRPCReactProvider>
      <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster />
            {children}
          </ThemeProvider>
        </AuthSessionProvider>
        
      </body>
    </html>
    </TRPCReactProvider>
  );
}
