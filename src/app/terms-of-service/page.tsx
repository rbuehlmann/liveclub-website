import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata = { title: "AGB – LiveClub" };

export default function AgbPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-white dark:bg-brand-black">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="mb-6 font-teko text-4xl font-bold text-gray-900 dark:text-white">
          Allgemeine Geschäftsbedingungen (AGB)
        </h1>

        <div className="flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">1. Geltungsbereich</h2>
            <p>
              Diese AGB gelten für die Nutzung von LiveClub (liveclub.app), einer Plattform für
              Live-Spielstände kleiner und mittlerer Sportvereine, betrieben von oryno.dev ·
              Raffael Bühlmann, Luzernerstrasse 5, 5630 Muri, Schweiz. Mit der Registrierung eines
              Vereinskontos akzeptierst du diese AGB.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">2. Leistungsbeschreibung</h2>
            <p>
              LiveClub stellt Vereinen ein Werkzeug zur Verfügung, um Spiele anzulegen, live zu
              begleiten (Tore, Spielstand, Status) und die Ergebnisse öffentlich zu veröffentlichen
              (Vereinssuche, Vereins-/Mannschaftsseiten, Einbettungs-Widget). Neue Vereinskonten
              erhalten eine kostenlose Testphase; danach ist die Weiternutzung kostenpflichtig
              (siehe Ziffer 6).
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">3. Registrierung & Vereinskonten</h2>
            <p>
              Wer für einen Verein ein Konto registriert, sichert zu, für diesen Verein tatsächlich
              berechtigt zu handeln (z. B. als Vorstandsmitglied, Trainer oder von diesen
              beauftragte Person). Es dürfen keine Vereine oder Mannschaften angelegt werden, denen
              man selbst nicht angehört oder für die keine Berechtigung zur Vertretung besteht.
            </p>
            <p className="mt-2 font-medium text-gray-900 dark:text-white">
              LiveClub behält sich ausdrücklich vor, ein Konto bei begründetem Verdacht auf eine
              solche Fehlregistrierung mit sofortiger Wirkung und ohne Vorankündigung zu sperren —
              ohne Anspruch auf Rückerstattung bereits geleisteter Zahlungen.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">4. Pflichten der Nutzenden</h2>
            <p>
              Zugangsdaten sind vertraulich zu behandeln. Veröffentlichte Inhalte (Vereinsname,
              Logo, Spieldaten) müssen wahrheitsgemäss sein und dürfen keine Rechte Dritter
              verletzen. Der Verein bleibt Eigentümer der von ihm hochgeladenen Inhalte.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">5. Redaktoren & Spielverwaltung</h2>
            <p>
              Für jedes erfasste Spiel gibt es zu jedem Zeitpunkt genau eine verantwortliche Person
              (Hauptredaktor), die den Spielverlauf (Start, Tore, Spielstand) erfasst. Wer ein Spiel
              als Hauptredaktor erstellt oder übernimmt, ist für die Richtigkeit der erfassten Daten
              verantwortlich. Nutzende können in ihrem Profil einen frei wählbaren öffentlichen
              Anzeigenamen hinterlegen, der bei einem laufenden Spiel als "Redaktor: [Name]"
              angezeigt wird und keine Rückschlüsse auf die reale Identität zulassen muss.
            </p>
            <p className="mt-2">
              Die Verantwortung für ein Spiel kann jederzeit an eine andere berechtigte Person
              desselben Vereins oder — sofern beide beteiligten Vereine LiveClub nutzen — des
              gegnerischen Vereins übertragen werden. Jede Übernahme und Übergabe wird protokolliert.
              Nutzende erhalten hierzu automatische E-Mail-Benachrichtigungen (z. B. bei einer
              Einladung zur Übernahme, bei erfolgter Übernahme oder Übergabe), die sich in den
              persönlichen Profileinstellungen einzeln deaktivieren lassen.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">6. Preise & Zahlung</h2>
            <p>
              Die Testphase ist kostenlos und zeitlich befristet. Für die Weiternutzung danach
              gelten die auf liveclub.app angezeigten Preise; die Zahlungsabwicklung erfolgt über
              Stripe. Läuft eine Testphase oder ein Abo ohne Zahlung ab, werden Vereins- und
              Mannschaftsdaten nicht gelöscht, aber öffentlich nicht mehr angezeigt (siehe Ziffer
              7) — der Zugriff über das eigene Konto bleibt weiterhin möglich.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">7. Laufzeit & Kündigung</h2>
            <p>
              Ein Abo kann jederzeit gekündigt werden und läuft bis zum Ende der bezahlten Periode
              weiter. Bei Ablauf ohne Verlängerung sowie bei einer Sperrung nach Ziffer 3 werden
              keine Daten automatisch gelöscht — es entfällt lediglich die öffentliche
              Sichtbarkeit. Eine dauerhafte Löschung erfolgt nur auf Anfrage oder nach eigenem
              Ermessen von LiveClub bei begründetem Verdacht auf Missbrauch.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">8. Haftung</h2>
            <p>
              LiveClub wird mit Sorgfalt betrieben, es kann jedoch keine Gewähr für ständige
              Verfügbarkeit, Fehlerfreiheit oder Richtigkeit der angezeigten Spielstände übernommen
              werden. Die Haftung ist, soweit gesetzlich zulässig, auf Vorsatz und grobe
              Fahrlässigkeit beschränkt.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">9. Änderungen dieser AGB</h2>
            <p>
              Diese AGB können bei Bedarf angepasst werden, etwa wenn sich das Angebot
              weiterentwickelt. Massgeblich ist jeweils die zum Zeitpunkt der Nutzung aktuelle
              Fassung auf dieser Seite.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">
              10. Anwendbares Recht & Gerichtsstand
            </h2>
            <p>
              Es gilt Schweizer Recht. Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz des
              Betreibers.
            </p>
          </section>

          <p className="text-xs text-gray-400 dark:text-gray-500">Stand: August 2026</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
