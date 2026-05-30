import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LocaleProvider } from "@/lib/i18n/context";
import { PreferencesProvider } from "@/lib/preferences";
import { DemoModeBanner } from "@/components/layout/DemoModeBanner";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Static default shown during SSR / before the client locale loads (and what
// search engines + link previews see). DocumentTitle swaps it to the user's
// chosen language on the client.
const APP_NAME = "CallFin";
const APP_TITLE = "CallFin — AI Finance Assistant";
const APP_DESC = "Chat to record transactions, track budgets & goals, and get instant financial insights — powered by AI.";
const APP_URL = "https://callfin.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: APP_TITLE,
  description: APP_DESC,
  applicationName: APP_NAME,
  keywords: [
    "personal finance", "AI finance assistant", "expense tracker",
    "budget", "keuangan", "catat keuangan", "manajemen keuangan", "CallFin",
  ],
  authors: [{ name: "CallFin" }],
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_TITLE,
    description: APP_DESC,
    url: APP_URL,
    locale: "en_US",
    // The generated src/app/opengraph-image.tsx is picked up automatically.
  },
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: APP_DESC,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${jakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <LocaleProvider>
            <PreferencesProvider>
              <DocumentTitle />
              <DemoModeBanner />
              {children}
            </PreferencesProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
