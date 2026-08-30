import type { Metadata } from "next";
import { Geist, Geist_Mono, Teko } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { BrandingProvider } from "@/components/layout/BrandingProvider";
import deMessages from "../../messages/de.json";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Corporate font — used for headings/scores/club-team names, not body text
// (Teko is a condensed display face, hard to read in long paragraphs).
const teko = Teko({
  variable: "--font-teko-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LiveClub",
  description: "Live-Spielstände für kleine Sportvereine.",
};

// Deliberately static/hardcoded ("de" + a direct messages/de.json import),
// NOT next-intl's dynamic getLocale()/getMessages() — those read a
// per-request value (via src/proxy.ts, see i18n/request.ts), and since this
// layout wraps literally every route in the app, using them here forced
// *every* page — including /dashboard, /admin, /login, none of which have
// anything to do with i18n — into dynamic (non-prerendered) rendering.
// app/[locale]/layout.tsx nests its own NextIntlClientProvider with the
// real per-locale messages for the public-page subtree instead (via
// setRequestLocale, which stays static-rendering-safe because it's driven
// by the statically-known [locale] route param, not a request header).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = "de";
  const messages = deMessages;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${teko.variable} h-full antialiased`}
    >
      <head>
        {/* Dark mode, unconditionally — no exceptions, not even a stored
            "light" preference from earlier testing (2026-08-30: a machine
            with an old localStorage value from before dark became the
            default, or from testing the toggle back when it was still
            visible, was still showing light mode — "ich hab keine
            Kontrolle darüber"). The toggle is hidden (ThemeToggle.tsx's
            ENABLED flag) and light mode isn't polished yet, so there's
            currently no supported way to see anything but dark, on any
            device, ever — this matches that exactly instead of leaving a
            leftover per-browser escape hatch nothing can reach anymore. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("dark");`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <BrandingProvider>
            <AuthProvider>{children}</AuthProvider>
          </BrandingProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
