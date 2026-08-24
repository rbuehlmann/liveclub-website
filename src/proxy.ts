import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Named proxy.ts, not middleware.ts — Next 16 deprecated & renamed the file
// convention (see node_modules/next/dist/docs/.../file-conventions/proxy.md),
// the exported function/behavior is unchanged.
export default createIntlMiddleware(routing);

export const config = {
  // Scoped to public pages only (2026-08-24 decision) — everything else
  // (dashboard, admin, login, register, onboarding, api routes, static
  // files, .well-known) must never be touched by this, or dashboard/admin
  // URLs would suddenly need a locale prefix too. Mirrors the same
  // "NOT this route" exclusion problem as apple-app-site-association's
  // path list, for the same underlying reason: a bare top-level segment
  // (a club id) is otherwise indistinguishable from any other top-level
  // route without an explicit exclusion list.
  matcher: [
    "/((?!api|_next|_vercel|\\.well-known|dashboard|admin|login|register|onboarding|.*\\..*).*)",
  ],
};
