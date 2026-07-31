"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { collection, onSnapshot } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { useClubContext } from "@/components/club/ClubContext";
import { buildClubUrl, buildTeamUrl } from "@/lib/publicRoutes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Team } from "@/lib/types";

export default function SharePage() {
  const t = useTranslations("share");
  const tCommon = useTranslations("common");
  const { club } = useClubContext();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamQrs, setTeamQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!club || !origin) return;
    QRCode.toDataURL(`${origin}${buildClubUrl(club.publicClubId)}`, { width: 240 }).then(
      setQrDataUrl
    );
  }, [club, origin]);

  useEffect(() => {
    if (!club) return;
    const { db } = getFirebaseClient();
    return onSnapshot(collection(db, "clubs", club.clubId, "teams"), (snap) => {
      setTeams(
        snap.docs.map((d) => ({
          teamId: d.id,
          clubId: club.clubId,
          publicTeamId: d.data().publicTeamId ?? null,
          name: d.data().name,
          shortName: d.data().shortName,
          sport: d.data().sport,
          active: d.data().active ?? true,
        }))
      );
    });
  }, [club]);

  useEffect(() => {
    if (!origin) return;
    teams.forEach((team) => {
      if (!team.publicTeamId || teamQrs[team.publicTeamId]) return;
      QRCode.toDataURL(`${origin}${buildTeamUrl(team.publicTeamId)}`, { width: 200 }).then(
        (dataUrl) => setTeamQrs((prev) => ({ ...prev, [team.publicTeamId as string]: dataUrl }))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, origin]);

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

      {teams.filter((team) => team.publicTeamId).length > 0 && (
        <Card>
          <h2 className="mb-2 font-semibold text-gray-900">Mannschaften teilen</h2>
          <div className="flex flex-col gap-6">
            {teams
              .filter((team) => team.publicTeamId)
              .map((team) => {
                const teamLink = `${origin}${buildTeamUrl(team.publicTeamId as string)}`;
                return (
                  <div key={team.teamId} className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <p className="mb-1 font-medium text-gray-900">{team.name}</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-sm">
                          {teamLink}
                        </code>
                        <Button variant="secondary" onClick={() => copy(team.teamId, teamLink)}>
                          {copiedKey === team.teamId ? tCommon("linkCopied") : tCommon("copyLink")}
                        </Button>
                      </div>
                    </div>
                    {teamQrs[team.publicTeamId as string] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={teamQrs[team.publicTeamId as string]}
                        alt={`QR-Code ${team.name}`}
                        width={120}
                        height={120}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      )}

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
