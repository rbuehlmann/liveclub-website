"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminListClubs, AdminClubListItem } from "@/lib/firebase/functionsApi";
import { Card } from "@/components/ui/Card";

export default function AdminOverviewPage() {
  const [clubs, setClubs] = useState<AdminClubListItem[] | null>(null);

  useEffect(() => {
    adminListClubs().then(setClubs);
  }, []);

  if (!clubs) return <p className="text-gray-500 dark:text-gray-400">Wird geladen …</p>;

  const trial = clubs.filter((c) => c.currentLicenseType === "trial").length;
  const active = clubs.filter((c) => c.currentLicenseStatus === "active").length;
  const expired = clubs.filter((c) => c.currentLicenseStatus !== "active").length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Übersicht</h1>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{clubs.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vereine</p>
        </Card>
        <Card>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{active}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Aktiv</p>
        </Card>
        <Card>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{trial}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Testphase</p>
        </Card>
        <Card>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{expired}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Abgelaufen/inaktiv</p>
        </Card>
      </div>
      <Link href="/admin/clubs" className="text-sm text-brand-red-link hover:underline">
        Alle Vereine ansehen →
      </Link>
    </div>
  );
}
