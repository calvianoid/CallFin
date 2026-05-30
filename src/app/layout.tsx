import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LocaleProvider } from "@/lib/i18n/context";
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
export const metadata: Metadata = {
  title: "CallFin — AI Finance Assistant",
  description: "Record, track, and improve your finances with AI.",
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
            <DocumentTitle />
            <DemoModeBanner />
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
