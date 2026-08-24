import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale } = await params;
  return { title: locale === "en" ? "Privacy Policy – LiveClub" : "Datenschutzerklärung – LiveClub" };
}

export default async function DatenschutzPage({ params }: { params: Params }) {
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
      <h1 className="mb-1 font-teko text-4xl font-bold text-gray-900 dark:text-white">Datenschutzerklärung</h1>
      <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">Stand: August 2026</p>

      <div className="flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">1. Verantwortlicher</h2>
          <p>Verantwortlich für die Bearbeitung personenbezogener Daten im Zusammenhang mit LiveClub ist:</p>
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
            Personenbezogene Daten werden ausschliesslich bearbeitet, soweit dies für den Betrieb von LiveClub
            erforderlich ist. Dies umfasst insbesondere:
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
            Vom Verein veröffentlichte Inhalte wie Vereinsname, Mannschaften, Vereinslogo, Spielstände sowie weitere
            Spielinformationen sind bewusst öffentlich zugänglich und können über die Plattform oder eingebundene
            Widgets angezeigt werden.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">5. Push-Mitteilungen</h2>
          <p>Über LiveClub können Vereine Push-Mitteilungen an ihre Abonnenten versenden.</p>
          <p className="mt-2">Für den Inhalt dieser Mitteilungen ist ausschliesslich der jeweilige Verein verantwortlich.</p>
          <p className="mt-2">
            Für die Zustellung werden die Push-Dienste von Apple und Google verwendet. Auf deren Verarbeitung
            personenbezogener Daten hat LiveClub keinen Einfluss.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">6. Zahlungsabwicklung</h2>
          <p>Kostenpflichtige Abonnemente werden ausschliesslich über Stripe abgewickelt.</p>
          <p className="mt-2">
            Zahlungsdaten, Rechnungsinformationen sowie Zahlungsmittel werden direkt durch Stripe verarbeitet und
            nicht auf den Servern von LiveClub gespeichert.
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
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">8. Datenübermittlung ins Ausland</h2>
          <p>
            Bei der Nutzung von Firebase und Stripe können personenbezogene Daten auch ausserhalb der Schweiz
            bearbeitet werden, insbesondere in den USA.
          </p>
          <p className="mt-2">
            Die Übermittlung erfolgt auf Grundlage geeigneter gesetzlicher Garantien nach dem anwendbaren
            Datenschutzrecht.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">9. Aufbewahrung</h2>
          <p>
            Personenbezogene Daten werden nur so lange aufbewahrt, wie dies für den Betrieb von LiveClub oder
            aufgrund gesetzlicher Aufbewahrungspflichten erforderlich ist.
          </p>
          <p className="mt-2">
            Nach der Löschung eines Kontos können Daten gelöscht oder anonymisiert werden, sofern keine gesetzlichen
            Aufbewahrungspflichten entgegenstehen.
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
            Anfragen können jederzeit an <strong className="text-gray-900 dark:text-white">hello@oryno.dev</strong>{" "}
            gerichtet werden.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">11. Änderungen</h2>
          <p>Diese Datenschutzerklärung kann jederzeit angepasst werden.</p>
          <p className="mt-2">Massgeblich ist jeweils die zum Zeitpunkt der Nutzung veröffentlichte Fassung.</p>
        </section>
      </div>
    </>
  );
}

function ContentEn() {
  return (
    <>
      <h1 className="mb-1 font-teko text-4xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
      <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">Last updated: August 2026</p>

      <div className="flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">1. Controller</h2>
          <p>The controller responsible for processing personal data in connection with LiveClub is:</p>
          <p className="mt-2">
            <strong className="text-gray-900 dark:text-white">oryno.dev</strong>
            <br />
            Owner: Raffael Bühlmann
            <br />
            Email: hello@oryno.dev
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">2. Purpose of processing</h2>
          <p>
            Personal data is processed exclusively to the extent necessary for operating LiveClub. This includes in
            particular:
          </p>
          <ul className="mt-2 list-disc pl-5">
            <li>Registration and management of club accounts</li>
            <li>Authentication of users</li>
            <li>Management of clubs, teams, and games</li>
            <li>Sending invitations and system-related emails</li>
            <li>Sending push notifications</li>
            <li>Processing paid subscriptions</li>
            <li>Operation, security, and further development of the platform</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">3. What data is processed</h2>
          <p>Depending on use, the following data in particular is processed:</p>
          <ul className="mt-2 list-disc pl-5">
            <li>Name</li>
            <li>Email address</li>
            <li>Club name</li>
            <li>Contact person</li>
            <li>Club logo</li>
            <li>Team and game data</li>
            <li>voluntarily provided profile information (e.g. public display name)</li>
            <li>technical log data, to the extent required for secure operation</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">4. Public content</h2>
          <p>LiveClub serves to publish live game scores.</p>
          <p className="mt-2">
            Content published by the club, such as club name, teams, club logo, scores, and other game information,
            is deliberately publicly accessible and may be displayed via the platform or embedded widgets.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">5. Push notifications</h2>
          <p>Clubs can send push notifications to their subscribers via LiveClub.</p>
          <p className="mt-2">The respective club is solely responsible for the content of these notifications.</p>
          <p className="mt-2">
            Apple&rsquo;s and Google&rsquo;s push services are used for delivery. LiveClub has no influence over
            their processing of personal data.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">6. Payment processing</h2>
          <p>Paid subscriptions are processed exclusively via Stripe.</p>
          <p className="mt-2">
            Payment data, billing information, and payment methods are processed directly by Stripe and are not
            stored on LiveClub&rsquo;s servers.
          </p>
          <p className="mt-2">Stripe&rsquo;s privacy policy applies in addition.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">7. Service providers used</h2>
          <p>The following service providers are used to provide LiveClub:</p>
          <ul className="mt-2 list-disc pl-5">
            <li>Firebase (Google) for authentication, database, and other backend services</li>
            <li>Infomaniak (Switzerland) for website and email delivery</li>
            <li>Stripe for payment processing</li>
          </ul>
          <p className="mt-2">These service providers process data only to the extent required.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">8. International data transfer</h2>
          <p>
            When using Firebase and Stripe, personal data may also be processed outside Switzerland, in particular
            in the USA.
          </p>
          <p className="mt-2">
            The transfer takes place on the basis of appropriate legal safeguards under applicable data protection
            law.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">9. Data retention</h2>
          <p>
            Personal data is retained only for as long as necessary for operating LiveClub or as required by
            statutory retention obligations.
          </p>
          <p className="mt-2">
            After an account is deleted, data may be deleted or anonymized, provided no statutory retention
            obligations apply.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">10. Your rights</h2>
          <p>Under applicable data protection law, you have in particular the right to:</p>
          <ul className="mt-2 list-disc pl-5">
            <li>Access</li>
            <li>Rectification</li>
            <li>Erasure</li>
            <li>Restriction of processing, where legally provided</li>
          </ul>
          <p className="mt-2">
            Requests can be sent to <strong className="text-gray-900 dark:text-white">hello@oryno.dev</strong> at any
            time.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">11. Changes</h2>
          <p>This privacy policy may be amended at any time.</p>
          <p className="mt-2">The version published at the time of use shall apply.</p>
        </section>
      </div>
    </>
  );
}
