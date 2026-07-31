import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata = { title: "Datenschutzerklärung – LiveClub" };

export default function DatenschutzPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-white">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="mb-6 font-teko text-4xl font-bold text-gray-900">Datenschutzerklärung</h1>

        <div className="flex flex-col gap-6 text-sm text-gray-700">
          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Verantwortlicher</h2>
            <p>
              oryno.dev · Raffael Bühlmann
              <br />
              Luzernerstrasse 5, 5630 Muri, Schweiz
              <br />
              hello@oryno.dev
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Welche Daten wir erheben</h2>
            <p>
              Im Gegensatz zu anderen Angeboten von oryno.dev verarbeitet LiveClub echte
              personenbezogene Daten, da die Nutzung eines Vereinskontos, das Erfassen von
              Mannschaften/Spielen und (bei Bezahlvereinen) eine Zahlungsabwicklung ein Konto
              voraussetzt:
            </p>
            <ul className="mt-2 list-disc pl-5">
              <li>Kontodaten: Name, E-Mail-Adresse (Firebase Authentication)</li>
              <li>
                Vereinsdaten: Vereinsname, Kontaktperson, Kontakt-E-Mail, Logo, Mannschafts- und
                Spieldaten (Firestore-Datenbank)
              </li>
              <li>
                Bei Redaktoren-Einladungen: die E-Mail-Adresse der eingeladenen Person, zum
                Versand der Einladung
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Hosting & Auftragsverarbeiter</h2>
            <p>
              Kontodaten, Vereinsdaten und Spieldaten werden über Firebase (Google Ireland Ltd. /
              Google LLC) gespeichert und verarbeitet. Die Datenbank läuft aktuell in einer
              nordamerikanischen Google-Cloud-Region — eine Datenübermittlung in die USA findet
              damit statt. Die Website selbst (dieses Frontend) wird bei Infomaniak (Schweiz)
              gehostet.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Zahlungsabwicklung</h2>
            <p>
              Vereins-Abos werden über Stripe abgewickelt. Zahlungs- und Rechnungsdaten (z. B.
              Zahlungsmittel, Rechnungsadresse) werden direkt von Stripe verarbeitet und
              gespeichert — sie laufen nie über unsere eigenen Server. Es gilt zusätzlich die
              Datenschutzerklärung von Stripe.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">E-Mail-Versand</h2>
            <p>
              Einladungs-E-Mails an Redaktoren werden über einen SMTP-Server bei Infomaniak
              (Schweiz) versendet.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Tracking & Analyse</h2>
            <p>Diese Website verwendet keine Analytics-Tools, kein Tracking und keine Werbung.</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Öffentliche Spielstände</h2>
            <p>
              Vereinsname, Mannschaftsnamen, Logo und Live-Spielstände, die ein Verein selbst
              veröffentlicht, sind bewusst öffentlich einsehbar (Vereinssuche, öffentliche
              Vereins-/Mannschaftsseiten, Einbettungs-Widget) — das ist der Kernzweck der
              Anwendung.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900">Deine Rechte</h2>
            <p>
              Du kannst jederzeit Auskunft, Berichtigung oder Löschung deiner Daten verlangen —
              kontaktiere uns dazu unter hello@oryno.dev.
            </p>
          </section>

          <p className="text-xs text-gray-400">Stand: Juli 2026</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
