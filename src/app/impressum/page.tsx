import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata = { title: "Impressum – LiveClub" };

export default function ImpressumPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-white">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="mb-6 font-teko text-4xl font-bold text-gray-900">Impressum</h1>

        <div className="flex flex-col gap-6 text-sm text-gray-700">
          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Betreiber</h2>
            <p>
              LiveClub ist ein eigenständiges Angebot und wird betrieben von:
            </p>
            <p className="mt-2">
              oryno.dev · Raffael Bühlmann
              <br />
              Luzernerstrasse 5
              <br />
              5630 Muri
              <br />
              Schweiz
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Kontakt</h2>
            <p>hello@oryno.dev</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Verantwortlich für den Inhalt</h2>
            <p>Raffael Bühlmann, Anschrift wie oben.</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Rechtsform</h2>
            <p>
              Einzelunternehmen. Kein Handelsregistereintrag, keine Mehrwertsteuerpflicht (Umsatz
              unterhalb der massgeblichen Schwellenwerte).
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Haftungsausschluss</h2>
            <p>
              Die Inhalte dieser Website wurden sorgfältig erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität wird keine Gewähr übernommen. Für Inhalte externer,
              verlinkter Websites ist ausschliesslich deren Betreiber verantwortlich — im Zeitpunkt
              der Verlinkung waren keine rechtswidrigen Inhalte erkennbar.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Urheberrecht</h2>
            <p>
              Die auf dieser Website veröffentlichten Inhalte (Texte, Layout, Logo, Software)
              unterliegen dem Urheberrecht. Jede Vervielfältigung, Verbreitung oder Bearbeitung
              ausserhalb der engen Grenzen des Urheberrechts bedarf der schriftlichen Zustimmung
              des Betreibers. Vereine bleiben Eigentümer der von ihnen selbst hochgeladenen Inhalte
              (z. B. Vereinslogo).
            </p>
          </section>

          <p className="text-xs text-gray-400">Stand: August 2026</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
