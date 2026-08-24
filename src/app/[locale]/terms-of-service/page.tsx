import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale } = await params;
  return { title: locale === "en" ? "Terms of Service – LiveClub" : "AGB – LiveClub" };
}

export default async function AgbPage({ params }: { params: Params }) {
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
      <h1 className="mb-1 font-teko text-4xl font-bold text-gray-900 dark:text-white">
        Allgemeine Geschäftsbedingungen (AGB)
      </h1>
      <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">Stand: August 2026</p>

      <div className="flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">1. Geltungsbereich</h2>
          <p>Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Plattform LiveClub.</p>
          <p className="mt-2">
            Betreiber von LiveClub ist <strong className="text-gray-900 dark:text-white">oryno.dev</strong>.
          </p>
          <p className="mt-2">Mit der Registrierung oder Nutzung von LiveClub akzeptiert der Verein diese AGB.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">2. Leistungsbeschreibung</h2>
          <p>
            LiveClub ist eine Plattform zur Erfassung und Veröffentlichung von Live-Spielständen sowie
            spielbezogenen Ereignissen.
          </p>
          <p className="mt-2">Der Funktionsumfang kann jederzeit erweitert, angepasst oder reduziert werden.</p>
          <p className="mt-2">Ein Anspruch auf bestimmte Funktionen besteht nicht.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">3. Registrierung</h2>
          <p>
            Ein Vereinskonto darf nur von Personen erstellt werden, welche berechtigt sind, den betreffenden Verein
            zu vertreten oder im Auftrag des Vereins handeln.
          </p>
          <p className="mt-2">Die bei der Registrierung gemachten Angaben müssen vollständig und wahrheitsgemäss sein.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">4. Vereinskonten</h2>
          <p>Der Verein ist für sämtliche Aktivitäten verantwortlich, welche über sein Konto erfolgen.</p>
          <p className="mt-2">
            Zugangsdaten sind vertraulich aufzubewahren und dürfen Unberechtigten nicht zugänglich gemacht werden.
          </p>
          <p className="mt-2 font-medium text-gray-900 dark:text-white">
            LiveClub ist berechtigt, Vereinskonten bei Missbrauch oder begründetem Verdacht auf unberechtigte Nutzung
            jederzeit vorübergehend oder dauerhaft zu sperren.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">5. Redaktoren</h2>
          <p>Für jedes Spiel gibt es zu jedem Zeitpunkt genau einen verantwortlichen Hauptredaktor.</p>
          <p className="mt-2">Dieser ist für die Richtigkeit der veröffentlichten Spielinformationen verantwortlich.</p>
          <p className="mt-2">
            Die Verantwortung kann an eine andere berechtigte Person desselben Vereins oder – sofern beide Vereine
            LiveClub nutzen – an den gegnerischen Verein übertragen werden.
          </p>
          <p className="mt-2">Übergaben und Übernahmen können protokolliert werden.</p>
          <p className="mt-2">
            Systembezogene Benachrichtigungen werden per E-Mail versendet und können – soweit vorgesehen – in den
            Profileinstellungen deaktiviert werden.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">6. Push-Mitteilungen und veröffentlichte Inhalte</h2>
          <p>
            Der Verein ist für sämtliche durch seine berechtigten Redaktorinnen und Redaktoren veröffentlichten
            Inhalte sowie versendeten Push-Mitteilungen verantwortlich.
          </p>
          <p className="mt-2">Er stellt sicher, dass sämtliche Inhalte rechtmässig sind und keine Rechte Dritter verletzen.</p>
          <p className="mt-2">
            Untersagt sind insbesondere Inhalte, welche gegen geltendes Recht verstossen oder beleidigend,
            diskriminierend, irreführend, urheberrechtsverletzend, persönlichkeitsverletzend oder als Spam
            einzustufen sind.
          </p>
          <p className="mt-2 font-medium text-gray-900 dark:text-white">
            LiveClub ist berechtigt, Inhalte oder Push-Mitteilungen jederzeit einzuschränken, abzulehnen oder zu
            entfernen sowie den Versand von Push-Mitteilungen oder den Zugang zum Dienst vorübergehend oder dauerhaft
            zu sperren.
          </p>
          <p className="mt-2">Die Anzahl der versendbaren Push-Mitteilungen kann technisch oder organisatorisch begrenzt werden.</p>
          <p className="mt-2">
            Ein Anspruch auf eine bestimmte Anzahl, eine bestimmte Versandgeschwindigkeit oder die tatsächliche
            Zustellung von Push-Mitteilungen besteht nicht.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">7. Preise und Zahlung</h2>
          <p>Neue Vereinskonten können während einer kostenlosen Testphase genutzt werden.</p>
          <p className="mt-2">Nach Ablauf der Testphase ist für die weitere Nutzung ein kostenpflichtiges Abonnement erforderlich.</p>
          <p className="mt-2">Die jeweils gültigen Preise werden auf LiveClub veröffentlicht.</p>
          <p className="mt-2">Die Zahlungsabwicklung erfolgt über Stripe.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">8. Laufzeit und Kündigung</h2>
          <p>
            Ein Abonnement kann jederzeit gekündigt werden und bleibt bis zum Ende der bereits bezahlten Laufzeit
            aktiv.
          </p>
          <p className="mt-2">
            Nach Ablauf eines Abonnements bleiben die Vereinsdaten grundsätzlich erhalten, öffentliche Inhalte können
            jedoch ausgeblendet oder deaktiviert werden.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">9. Verfügbarkeit</h2>
          <p>LiveClub wird mit der gebotenen Sorgfalt betrieben.</p>
          <p className="mt-2">
            Eine jederzeitige Verfügbarkeit, Fehlerfreiheit oder ununterbrochene Erreichbarkeit kann jedoch nicht
            gewährleistet werden.
          </p>
          <p className="mt-2">
            LiveClub ist berechtigt, Wartungsarbeiten durchzuführen oder einzelne Funktionen jederzeit anzupassen.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">10. Haftung</h2>
          <p>
            LiveClub übernimmt keine Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität veröffentlichter
            Spielinformationen.
          </p>
          <p className="mt-2">
            Soweit gesetzlich zulässig, ist die Haftung von LiveClub auf Vorsatz und grobe Fahrlässigkeit
            beschränkt.
          </p>
          <p className="mt-2">
            Eine Haftung für Ausfälle von Drittanbietern, insbesondere Apple, Google, Firebase, Stripe oder anderen
            technischen Dienstleistern, ist ausgeschlossen, soweit gesetzlich zulässig.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">11. Datenschutz</h2>
          <p>Die Bearbeitung personenbezogener Daten erfolgt gemäss der separaten Datenschutzerklärung.</p>
          <p className="mt-2">Diese bildet einen integrierenden Bestandteil dieser AGB.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">12. Änderungen</h2>
          <p>LiveClub ist berechtigt, diese AGB jederzeit anzupassen.</p>
          <p className="mt-2">Massgeblich ist jeweils die zum Zeitpunkt der Nutzung veröffentlichte Fassung.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">13. Anwendbares Recht und Gerichtsstand</h2>
          <p>Es gilt ausschliesslich Schweizer Recht.</p>
          <p className="mt-2">Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz des Betreibers.</p>
        </section>
      </div>
    </>
  );
}

function ContentEn() {
  return (
    <>
      <h1 className="mb-1 font-teko text-4xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
      <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">Last updated: August 2026</p>

      <div className="flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">1. Scope</h2>
          <p>These Terms of Service (&ldquo;Terms&rdquo;) govern the use of the LiveClub platform.</p>
          <p className="mt-2">
            LiveClub is operated by <strong className="text-gray-900 dark:text-white">oryno.dev</strong>.
          </p>
          <p className="mt-2">By registering or using LiveClub, the club accepts these Terms.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">2. Description of services</h2>
          <p>LiveClub is a platform for recording and publishing live game scores and game-related events.</p>
          <p className="mt-2">The scope of functionality may be expanded, modified, or reduced at any time.</p>
          <p className="mt-2">There is no entitlement to specific features.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">3. Registration</h2>
          <p>
            A club account may only be created by persons who are authorized to represent the club in question or
            who act on behalf of the club.
          </p>
          <p className="mt-2">The information provided during registration must be complete and truthful.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">4. Club accounts</h2>
          <p>The club is responsible for all activities carried out through its account.</p>
          <p className="mt-2">
            Login credentials must be kept confidential and must not be made accessible to unauthorized persons.
          </p>
          <p className="mt-2 font-medium text-gray-900 dark:text-white">
            LiveClub is entitled to temporarily or permanently suspend club accounts at any time in the event of
            misuse or reasonable suspicion of unauthorized use.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">5. Editors</h2>
          <p>At any given time, each game has exactly one responsible lead editor.</p>
          <p className="mt-2">This person is responsible for the accuracy of the published game information.</p>
          <p className="mt-2">
            Responsibility may be transferred to another authorized person of the same club or, if both clubs use
            LiveClub, to the opposing club.
          </p>
          <p className="mt-2">Transfers and takeovers may be logged.</p>
          <p className="mt-2">
            System-related notifications are sent by email and can, where provided, be disabled in the profile
            settings.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">6. Push notifications and published content</h2>
          <p>
            The club is responsible for all content published and push notifications sent by its authorized
            editors.
          </p>
          <p className="mt-2">It ensures that all content is lawful and does not infringe the rights of third parties.</p>
          <p className="mt-2">
            In particular, content that violates applicable law or is deemed offensive, discriminatory, misleading,
            infringing of copyright, infringing of personal rights, or spam is prohibited.
          </p>
          <p className="mt-2 font-medium text-gray-900 dark:text-white">
            LiveClub is entitled to restrict, reject, or remove content or push notifications at any time, and to
            temporarily or permanently block the sending of push notifications or access to the service.
          </p>
          <p className="mt-2">The number of push notifications that can be sent may be limited for technical or organizational reasons.</p>
          <p className="mt-2">
            There is no entitlement to a specific number, a specific sending speed, or the actual delivery of push
            notifications.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">7. Prices and payment</h2>
          <p>New club accounts can be used during a free trial period.</p>
          <p className="mt-2">After the trial period ends, a paid subscription is required for continued use.</p>
          <p className="mt-2">The applicable prices are published on LiveClub.</p>
          <p className="mt-2">Payment is processed via Stripe.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">8. Term and termination</h2>
          <p>
            A subscription can be cancelled at any time and remains active until the end of the already-paid term.
          </p>
          <p className="mt-2">
            After a subscription ends, the club&rsquo;s data generally remains intact, but public content may be
            hidden or deactivated.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">9. Availability</h2>
          <p>LiveClub is operated with due care.</p>
          <p className="mt-2">
            However, continuous availability, error-free operation, or uninterrupted accessibility cannot be
            guaranteed.
          </p>
          <p className="mt-2">LiveClub is entitled to perform maintenance work or adjust individual features at any time.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">10. Liability</h2>
          <p>
            LiveClub gives no guarantee for the accuracy, completeness, or timeliness of published game information.
          </p>
          <p className="mt-2">
            To the extent permitted by law, LiveClub&rsquo;s liability is limited to intent and gross negligence.
          </p>
          <p className="mt-2">
            Liability for failures of third-party providers, in particular Apple, Google, Firebase, Stripe, or other
            technical service providers, is excluded to the extent permitted by law.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">11. Privacy</h2>
          <p>The processing of personal data is governed by the separate Privacy Policy.</p>
          <p className="mt-2">It forms an integral part of these Terms.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">12. Changes</h2>
          <p>LiveClub is entitled to amend these Terms at any time.</p>
          <p className="mt-2">The version published at the time of use shall apply.</p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">13. Governing law and jurisdiction</h2>
          <p>Swiss law applies exclusively.</p>
          <p className="mt-2">To the extent permitted by law, the place of jurisdiction is the operator&rsquo;s registered office.</p>
        </section>
      </div>
    </>
  );
}
