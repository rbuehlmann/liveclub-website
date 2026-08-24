import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware Link/router — used only within the [locale] route tree
// (public pages). Dashboard/admin keep using plain next/link, since they're
// outside this routing setup entirely.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
