import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Support – LiveClub" };

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
        <div className="text-center">
          <h1 className="font-teko text-4xl font-bold text-gray-900 dark:text-white">Wie können wir helfen?</h1>
        </div>

        <Card>
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Häufige Fragen</h2>
          <div className="flex flex-col gap-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Ich habe mein Passwort vergessen.</p>
              <p>
                Auf der <a href="/login" className="text-brand-red hover:underline">Anmelden</a>
                -Seite kannst du unter „Passwort vergessen?" eine E-Mail zum Zurücksetzen
                anfordern.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Wie füge ich eine Mannschaft oder ein Spiel hinzu?
              </p>
              <p>
                Als Vereins-Admin findest du das unter „Mannschaften" bzw. „Spiele" in deinem
                Vereins-Dashboard.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Ich habe eine Frage zu meinem Abo/zur Rechnung.</p>
              <p>
                Als Vereins-Admin kannst du dein Abo direkt im Dashboard unter „Abo verwalten"
                einsehen und verwalten (läuft über Stripe). Bei weiteren Fragen melde dich direkt
                bei uns.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Ich habe einen Fehler gefunden.</p>
              <p>
                Schreib uns kurz, was passiert ist — am besten mit Verein/Mannschaft, Browser und
                den Schritten, die zum Fehler geführt haben.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Kontakt</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Schreib uns an{" "}
            <a href="mailto:hello@oryno.dev" className="text-brand-red hover:underline">
              hello@oryno.dev
            </a>{" "}
            — in der Regel antworten wir innerhalb von 1–2 Werktagen.
          </p>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
