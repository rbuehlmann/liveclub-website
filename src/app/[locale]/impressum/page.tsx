import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale } = await params;
  return { title: locale === "en" ? "Legal Notice – LiveClub" : "Impressum – LiveClub" };
}

export default async function ImpressumPage({ params }: { params: Params }) {
  const { locale } = await params;
  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">{locale === "en" ? <ContentEn /> : <ContentDe />}</main>
      <PublicFooter />
    </div>
  );
}

function ContentDe() {
  return (
    <>
      <h1 className="mb-1 font-teko text-4xl font-bold text-gray-900 dark:text-white">Impressum</h1>
      <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">Stand: August 2026</p>

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
            Soweit gesetzlich erforderlich erfolgt ein Eintrag ins Handelsregister sowie die Anmeldung zur
            Mehrwertsteuer.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Haftung</h2>
          <p>
            Die Inhalte dieser Website wurden mit grösstmöglicher Sorgfalt erstellt. Dennoch wird keine Gewähr für
            deren Richtigkeit, Vollständigkeit oder Aktualität übernommen.
          </p>
          <p className="mt-2">
            Für Inhalte externer Websites, auf welche mittels Links verwiesen wird, sind ausschliesslich deren
            jeweilige Betreiber verantwortlich.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Urheberrecht</h2>
          <p>
            Sämtliche Inhalte, Designs, Logos und Softwarebestandteile von LiveClub unterliegen dem Urheberrecht,
            soweit nichts anderes angegeben ist.
          </p>
          <p className="mt-2">
            Von Vereinen hochgeladene Inhalte (z. B. Vereinslogos) verbleiben im Eigentum des jeweiligen Vereins.
          </p>
        </section>
      </div>
    </>
  );
}

function ContentEn() {
  return (
    <>
      <h1 className="mb-1 font-teko text-4xl font-bold text-gray-900 dark:text-white">Legal Notice</h1>
      <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">Last updated: August 2026</p>

      <div className="flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Operator</h2>
          <p>LiveClub is an offering by</p>
          <p className="mt-2">
            <strong className="text-gray-900 dark:text-white">oryno.dev</strong>
            <br />
            Owner: Raffael Bühlmann
            <br />
            Luzernerstrasse 5
            <br />
            5630 Muri
            <br />
            Switzerland
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Contact</h2>
          <p>Email: hello@oryno.dev</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Responsible for content</h2>
          <p>Raffael Bühlmann</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Legal form</h2>
          <p>Sole proprietorship under Swiss law.</p>
          <p className="mt-2">
            A commercial register entry and VAT registration are made where legally required.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Liability</h2>
          <p>
            The content of this website has been created with the greatest possible care. Nevertheless, no
            guarantee is given for its accuracy, completeness, or timeliness.
          </p>
          <p className="mt-2">
            The respective operators are solely responsible for the content of external websites referenced by
            links.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">Copyright</h2>
          <p>
            All content, designs, logos, and software components of LiveClub are subject to copyright, unless
            otherwise stated.
          </p>
          <p className="mt-2">Content uploaded by clubs (e.g. club logos) remains the property of the respective club.</p>
        </section>
      </div>
    </>
  );
}
