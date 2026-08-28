import { Button } from "@/components/ui/Button";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/storeLinks";
import type { MobilePlatform } from "@/lib/useMobilePlatform";

interface MobileAppPromptProps {
  platform: Exclude<MobilePlatform, null>;
  logoUrl?: string | null;
  name: string;
  message: string;
}

// Replaces a club/team page's full (desktop-shaped) content on an actual
// phone with no app installed — see 2026-08-28 "Startseite immer anders"
// decision. A phone WITH the app installed never reaches this at all:
// Universal Links (apple-app-site-association) / App Links (assetlinks.json)
// hand the same URL straight to the app before this page ever renders.
export function MobileAppPrompt({ platform, logoUrl, name, message }: MobileAppPromptProps) {
  const storeUrl = platform === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
  const storeLabel = platform === "ios" ? "App Store" : "Play Store";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-24 w-24 rounded-full object-contain" />
      )}
      <h1 className="font-teko text-4xl font-bold text-gray-900 dark:text-white">{name}</h1>
      <p className="max-w-xs text-gray-600 dark:text-gray-400">{message}</p>
      <a href={storeUrl} target="_blank" rel="noopener noreferrer">
        <Button>{storeLabel}</Button>
      </a>
    </main>
  );
}
