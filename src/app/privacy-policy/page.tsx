import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata = { title: "Datenschutzerklärung – LiveClub" };

export default function DatenschutzPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="mb-1 font-teko text-4xl font-bold text-gray-900 dark:text-white">
          Datenschutzerklärung
        </h1>
        <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">Stand: August 2026</p>

        <div className="flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">1. Verantwortlicher</h2>
            <p>
              Verantwortlich für die Bearbeitung personenbezogener Daten im Zusammenhang mit
              LiveClub ist:
            </p>
            <p className="mt-2">
              <strong className="text-gray-900 dark:text-white">oryno.dev</strong>
              <br />
              Inhaber: Raffael Bühlmann
              <br />
              E-Mail: hello@oryno.dev
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">2. Zweck der Datenbearbeitung</h2>
            <p>
              Personenbezogene Daten werden ausschliesslich bearbeitet, soweit dies für den
              Betrieb von LiveClub erforderlich ist. Dies umfasst insbesondere:
            </p>
            <ul className="mt-2 list-disc pl-5">
              <li>Registrierung und Verwaltung von Vereinskonten</li>
              <li>Authentifizierung von Nutzenden</li>
              <li>Verwaltung von Vereinen, Mannschaften und Spielen</li>
              <li>Versand von Einladungen sowie systembezogenen E-Mails</li>
              <li>Versand von Push-Mitteilungen</li>
              <li>Abwicklung kostenpflichtiger Abonnemente</li>
              <li>Betrieb, Sicherheit und Weiterentwicklung der Plattform</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">3. Welche Daten bearbeitet werden</h2>
            <p>Je nach Nutzung werden insbesondere folgende Daten bearbeitet:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>Name</li>
              <li>E-Mail-Adresse</li>
              <li>Vereinsname</li>
              <li>Kontaktperson</li>
              <li>Vereinslogo</li>
              <li>Mannschafts- und Spieldaten</li>
              <li>freiwillig angegebene Profilinformationen (z. B. öffentlicher Anzeigename)</li>
              <li>technische Protokolldaten, soweit diese für den sicheren Betrieb erforderlich sind</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">4. Öffentliche Inhalte</h2>
            <p>LiveClub dient der Veröffentlichung von Live-Spielständen.</p>
            <p className="mt-2">
              Vom Verein veröffentlichte Inhalte wie Vereinsname, Mannschaften, Vereinslogo,
              Spielstände sowie weitere Spielinformationen sind bewusst öffentlich zugänglich und
              können über die Plattform oder eingebundene Widgets angezeigt werden.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">5. Push-Mitteilungen</h2>
            <p>Über LiveClub können Vereine Push-Mitteilungen an ihre Abonnenten versenden.</p>
            <p className="mt-2">
              Für den Inhalt dieser Mitteilungen ist ausschliesslich der jeweilige Verein
              verantwortlich.
            </p>
            <p className="mt-2">
              Für die Zustellung werden die Push-Dienste von Apple und Google verwendet. Auf deren
              Verarbeitung personenbezogener Daten hat LiveClub keinen Einfluss.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">6. Zahlungsabwicklung</h2>
            <p>Kostenpflichtige Abonnemente werden ausschliesslich über Stripe abgewickelt.</p>
            <p className="mt-2">
              Zahlungsdaten, Rechnungsinformationen sowie Zahlungsmittel werden direkt durch Stripe
              verarbeitet und nicht auf den Servern von LiveClub gespeichert.
            </p>
            <p className="mt-2">Es gelten ergänzend die Datenschutzbestimmungen von Stripe.</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">7. Eingesetzte Dienstleister</h2>
            <p>Zur Bereitstellung von LiveClub werden folgende Dienstleister eingesetzt:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>Firebase (Google) für Authentifizierung, Datenbank und weitere Backend-Dienste</li>
              <li>Infomaniak (Schweiz) für Website und E-Mail-Versand</li>
              <li>Stripe für die Zahlungsabwicklung</li>
            </ul>
            <p className="mt-2">Diese Dienstleister bearbeiten Daten ausschliesslich im erforderlichen Umfang.</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">
              8. Datenübermittlung ins Ausland
            </h2>
            <p>
              Bei der Nutzung von Firebase und Stripe können personenbezogene Daten auch
              ausserhalb der Schweiz bearbeitet werden, insbesondere in den USA.
            </p>
            <p className="mt-2">
              Die Übermittlung erfolgt auf Grundlage geeigneter gesetzlicher Garantien nach dem
              anwendbaren Datenschutzrecht.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">9. Aufbewahrung</h2>
            <p>
              Personenbezogene Daten werden nur so lange aufbewahrt, wie dies für den Betrieb von
              LiveClub oder aufgrund gesetzlicher Aufbewahrungspflichten erforderlich ist.
            </p>
            <p className="mt-2">
              Nach der Löschung eines Kontos können Daten gelöscht oder anonymisiert werden, sofern
              keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">10. Deine Rechte</h2>
            <p>Du hast im Rahmen des anwendbaren Datenschutzrechts insbesondere das Recht auf:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>Auskunft</li>
              <li>Berichtigung</li>
              <li>Löschung</li>
              <li>Einschränkung der Bearbeitung, soweit gesetzlich vorgesehen</li>
            </ul>
            <p className="mt-2">
              Anfragen können jederzeit an{" "}
              <strong className="text-gray-900 dark:text-white">hello@oryno.dev</strong> gerichtet
              werden.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">11. Änderungen</h2>
            <p>Diese Datenschutzerklärung kann jederzeit angepasst werden.</p>
            <p className="mt-2">
              Massgeblich ist jeweils die zum Zeitpunkt der Nutzung veröffentlichte Fassung.
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
