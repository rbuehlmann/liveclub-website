"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useClubContext } from "@/components/club/ClubContext";
import { buildClubUrl } from "@/lib/publicRoutes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function SharePage() {
  const t = useTranslations("share");
  const tCommon = useTranslations("common");
  const { club } = useClubContext();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!club || !origin) return;
    QRCode.toDataURL(`${origin}${buildClubUrl(club.publicClubId)}`, { width: 240 }).then(
      setQrDataUrl
    );
  }, [club, origin]);

  if (!club || !origin) return null;

  const publicLink = `${origin}${buildClubUrl(club.publicClubId)}`;
  const widgetCode = `<div\n  class="liveclub-widget"\n  data-club-id="${club.publicClubId}">\n</div>\n\n<script\n  async\n  src="${origin}/widget.js">\n</script>`;

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>

      <Card>
        <h2 className="mb-2 font-semibold text-gray-900">{t("publicLink")}</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-sm">
            {publicLink}
          </code>
          <Button variant="secondary" onClick={() => copy("link", publicLink)}>
            {copiedKey === "link" ? tCommon("linkCopied") : tCommon("copyLink")}
          </Button>
        </div>
        <p className="mt-3 text-sm text-gray-500">{t("shareText")}</p>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-gray-900">{t("qrCode")}</h2>
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="QR-Code" width={200} height={200} />
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-gray-900">{t("widgetCode")}</h2>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
          {widgetCode}
        </pre>
        <Button variant="secondary" className="mt-3" onClick={() => copy("widget", widgetCode)}>
          {copiedKey === "widget" ? tCommon("linkCopied") : tCommon("copyLink")}
        </Button>
      </Card>
    </div>
  );
}
