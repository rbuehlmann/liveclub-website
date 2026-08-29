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
        {/* Applied before hydration so the wrong theme never flashes first
            — kept in sync with ThemeToggle's storage key. Dark is the
            default (2026-08-29: light mode isn't polished yet, dark ships
            first) — only an explicit stored "light" opts back out. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              if (localStorage.getItem("liveclub-theme") !== "light") {
                document.documentElement.classList.add("dark");
              }
            } catch (e) {}`,
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
