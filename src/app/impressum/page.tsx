import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata = { title: "Impressum – LiveClub" };

export default function ImpressumPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="mb-6 font-teko text-4xl font-bold text-gray-900 dark:text-white">Impressum</h1>

        <div className="flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Betreiber</h2>
            <p>LiveClub ist ein Angebot von</p>
            <p className="mt-2">
              <strong className="text-gray-900 dark:text-white">oryno.dev</strong>
              <br />
              Inhaber: Raffael Bühlmann
              <br />
              Luzernerstrasse 5
              <br />
              5630 Muri
              <br />
              Schweiz
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Kontakt</h2>
            <p>E-Mail: hello@oryno.dev</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Verantwortlich für den Inhalt</h2>
            <p>Raffael Bühlmann</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Rechtsform</h2>
            <p>Einzelunternehmen nach schweizerischem Recht.</p>
            <p className="mt-2">
              Soweit gesetzlich erforderlich erfolgt ein Eintrag ins Handelsregister sowie die
              Anmeldung zur Mehrwertsteuer.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Haftung</h2>
            <p>
              Die Inhalte dieser Website wurden mit grösstmöglicher Sorgfalt erstellt. Dennoch wird
              keine Gewähr für deren Richtigkeit, Vollständigkeit oder Aktualität übernommen.
            </p>
            <p className="mt-2">
              Für Inhalte externer Websites, auf welche mittels Links verwiesen wird, sind
              ausschliesslich deren jeweilige Betreiber verantwortlich.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Urheberrecht</h2>
            <p>
              Sämtliche Inhalte, Designs, Logos und Softwarebestandteile von LiveClub unterliegen
              dem Urheberrecht, soweit nichts anderes angegeben ist.
            </p>
            <p className="mt-2">
              Von Vereinen hochgeladene Inhalte (z. B. Vereinslogos) verbleiben im Eigentum des
              jeweiligen Vereins.
            </p>
          </section>

          <p className="text-xs text-gray-400 dark:text-gray-500">Stand: August 2026</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
