import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata = { title: "AGB – LiveClub" };

export default function AgbPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="mb-1 font-teko text-4xl font-bold text-gray-900 dark:text-white">
          Allgemeine Geschäftsbedingungen (AGB)
        </h1>
        <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">Stand: August 2026</p>

        <div className="flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">1. Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Plattform
              LiveClub.
            </p>
            <p className="mt-2">
              Betreiber von LiveClub ist <strong className="text-gray-900 dark:text-white">oryno.dev</strong>.
            </p>
            <p className="mt-2">
              Mit der Registrierung oder Nutzung von LiveClub akzeptiert der Verein diese AGB.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">2. Leistungsbeschreibung</h2>
            <p>
              LiveClub ist eine Plattform zur Erfassung und Veröffentlichung von Live-Spielständen
              sowie spielbezogenen Ereignissen.
            </p>
            <p className="mt-2">
              Der Funktionsumfang kann jederzeit erweitert, angepasst oder reduziert werden.
            </p>
            <p className="mt-2">Ein Anspruch auf bestimmte Funktionen besteht nicht.</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">3. Registrierung</h2>
            <p>
              Ein Vereinskonto darf nur von Personen erstellt werden, welche berechtigt sind, den
              betreffenden Verein zu vertreten oder im Auftrag des Vereins handeln.
            </p>
            <p className="mt-2">
              Die bei der Registrierung gemachten Angaben müssen vollständig und wahrheitsgemäss
              sein.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">4. Vereinskonten</h2>
            <p>
              Der Verein ist für sämtliche Aktivitäten verantwortlich, welche über sein Konto
              erfolgen.
            </p>
            <p className="mt-2">
              Zugangsdaten sind vertraulich aufzubewahren und dürfen Unberechtigten nicht
              zugänglich gemacht werden.
            </p>
            <p className="mt-2 font-medium text-gray-900 dark:text-white">
              LiveClub ist berechtigt, Vereinskonten bei Missbrauch oder begründetem Verdacht auf
              unberechtigte Nutzung jederzeit vorübergehend oder dauerhaft zu sperren.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">5. Redaktoren</h2>
            <p>
              Für jedes Spiel gibt es zu jedem Zeitpunkt genau einen verantwortlichen
              Hauptredaktor.
            </p>
            <p className="mt-2">
              Dieser ist für die Richtigkeit der veröffentlichten Spielinformationen
              verantwortlich.
            </p>
            <p className="mt-2">
              Die Verantwortung kann an eine andere berechtigte Person desselben Vereins oder –
              sofern beide Vereine LiveClub nutzen – an den gegnerischen Verein übertragen werden.
            </p>
            <p className="mt-2">Übergaben und Übernahmen können protokolliert werden.</p>
            <p className="mt-2">
              Systembezogene Benachrichtigungen werden per E-Mail versendet und können – soweit
              vorgesehen – in den Profileinstellungen deaktiviert werden.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">
              6. Push-Mitteilungen und veröffentlichte Inhalte
            </h2>
            <p>
              Der Verein ist für sämtliche durch seine berechtigten Redaktorinnen und Redaktoren
              veröffentlichten Inhalte sowie versendeten Push-Mitteilungen verantwortlich.
            </p>
            <p className="mt-2">
              Er stellt sicher, dass sämtliche Inhalte rechtmässig sind und keine Rechte Dritter
              verletzen.
            </p>
            <p className="mt-2">
              Untersagt sind insbesondere Inhalte, welche gegen geltendes Recht verstossen oder
              beleidigend, diskriminierend, irreführend, urheberrechtsverletzend,
              persönlichkeitsverletzend oder als Spam einzustufen sind.
            </p>
            <p className="mt-2 font-medium text-gray-900 dark:text-white">
              LiveClub ist berechtigt, Inhalte oder Push-Mitteilungen jederzeit einzuschränken,
              abzulehnen oder zu entfernen sowie den Versand von Push-Mitteilungen oder den Zugang
              zum Dienst vorübergehend oder dauerhaft zu sperren.
            </p>
            <p className="mt-2">
              Die Anzahl der versendbaren Push-Mitteilungen kann technisch oder organisatorisch
              begrenzt werden.
            </p>
            <p className="mt-2">
              Ein Anspruch auf eine bestimmte Anzahl, eine bestimmte Versandgeschwindigkeit oder
              die tatsächliche Zustellung von Push-Mitteilungen besteht nicht.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">7. Preise und Zahlung</h2>
            <p>
              Neue Vereinskonten können während einer kostenlosen Testphase genutzt werden.
            </p>
            <p className="mt-2">
              Nach Ablauf der Testphase ist für die weitere Nutzung ein kostenpflichtiges
              Abonnement erforderlich.
            </p>
            <p className="mt-2">Die jeweils gültigen Preise werden auf LiveClub veröffentlicht.</p>
            <p className="mt-2">Die Zahlungsabwicklung erfolgt über Stripe.</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">8. Laufzeit und Kündigung</h2>
            <p>
              Ein Abonnement kann jederzeit gekündigt werden und bleibt bis zum Ende der bereits
              bezahlten Laufzeit aktiv.
            </p>
            <p className="mt-2">
              Nach Ablauf eines Abonnements bleiben die Vereinsdaten grundsätzlich erhalten,
              öffentliche Inhalte können jedoch ausgeblendet oder deaktiviert werden.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">9. Verfügbarkeit</h2>
            <p>LiveClub wird mit der gebotenen Sorgfalt betrieben.</p>
            <p className="mt-2">
              Eine jederzeitige Verfügbarkeit, Fehlerfreiheit oder ununterbrochene Erreichbarkeit
              kann jedoch nicht gewährleistet werden.
            </p>
            <p className="mt-2">
              LiveClub ist berechtigt, Wartungsarbeiten durchzuführen oder einzelne Funktionen
              jederzeit anzupassen.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">10. Haftung</h2>
            <p>
              LiveClub übernimmt keine Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität
              veröffentlichter Spielinformationen.
            </p>
            <p className="mt-2">
              Soweit gesetzlich zulässig, ist die Haftung von LiveClub auf Vorsatz und grobe
              Fahrlässigkeit beschränkt.
            </p>
            <p className="mt-2">
              Eine Haftung für Ausfälle von Drittanbietern, insbesondere Apple, Google, Firebase,
              Stripe oder anderen technischen Dienstleistern, ist ausgeschlossen, soweit gesetzlich
              zulässig.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">11. Datenschutz</h2>
            <p>
              Die Bearbeitung personenbezogener Daten erfolgt gemäss der separaten
              Datenschutzerklärung.
            </p>
            <p className="mt-2">Diese bildet einen integrierenden Bestandteil dieser AGB.</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">12. Änderungen</h2>
            <p>LiveClub ist berechtigt, diese AGB jederzeit anzupassen.</p>
            <p className="mt-2">
              Massgeblich ist jeweils die zum Zeitpunkt der Nutzung veröffentlichte Fassung.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">
              13. Anwendbares Recht und Gerichtsstand
            </h2>
            <p>Es gilt ausschliesslich Schweizer Recht.</p>
            <p className="mt-2">
              Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz des Betreibers.
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
