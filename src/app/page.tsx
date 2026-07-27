import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 px-4 text-center">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">LiveClub</h1>
        <p className="mt-3 max-w-md text-lg text-gray-600">
          Live-Spielstände für kleine und mittlere Sportvereine — mit wenigen Klicks bedient.
        </p>
      </div>
      <div className="flex gap-4">
        <Link href="/register">
          <Button>Verein registrieren</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Anmelden</Button>
        </Link>
      </div>
    </main>
  );
}
