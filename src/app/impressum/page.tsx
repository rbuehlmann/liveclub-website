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
            <h2 className="mb-1 font-semibold text-gray-900">Anbieter</h2>
            <p>
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
            <h2 className="mb-1 font-semibold text-gray-900">Inhaltliche Verantwortung</h2>
            <p>Raffael Bühlmann (Anschrift wie oben)</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Haftungsausschluss</h2>
            <p>
              Die Inhalte dieser Website wurden sorgfältig erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität übernehmen wir keine Gewähr. Für externe Links
              übernehmen wir keine Verantwortung — zum Zeitpunkt der Verlinkung waren keine
              rechtswidrigen Inhalte erkennbar.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Urheberrecht</h2>
            <p>
              Die auf dieser Website veröffentlichten Inhalte unterliegen dem Urheberrecht. Eine
              Vervielfältigung oder Verbreitung bedarf der schriftlichen Zustimmung des Anbieters.
            </p>
          </section>

          <p className="text-xs text-gray-400">Stand: Juli 2026</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
