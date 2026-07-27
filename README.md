# LiveClub — Website & Firebase-Backend

Phase 1 (Website-First MVP) für kleine Sportvereine, um Spiele live zu bedienen. Siehe Projektbrief für den vollständigen Funktionsumfang; dieser Stand deckt den dünnen End-to-End-Slice ab (Registrierung → Verein → Team → Spiel → Live-Erfassung → öffentliche Seite/Widget → manuelle Lizenzverwaltung).

## Voraussetzungen (einmalig)

- **Node.js** via [nvm](https://github.com/nvm-sh/nvm): `nvm install --lts`
- **Java 17+** (nur für den Firestore-Emulator), z. B. via [Adoptium Temurin](https://adoptium.net/) — kein `brew` nötig, ein lokales JDK-Tarball reicht.
- Firebase-Projekt: für die lokale Entwicklung **nicht nötig** — alles läuft gegen die Emulator Suite unter der Demo-Projekt-ID `demo-liveclub`.

## Lokale Entwicklung starten

Zwei Prozesse parallel laufen lassen:

```bash
# Terminal 1 — Firebase Emulator Suite (Auth, Firestore, Functions, Storage)
firebase emulators:start
```

```bash
# Terminal 2 — Next.js Dev-Server
npm run dev
```

Dann `http://localhost:3000` öffnen. `.env.local` (aus `.env.example` kopiert) zeigt den Client bereits auf die Emulatoren.

Die Emulator-UI (Firestore-Daten einsehen, Auth-User verwalten) läuft unter `http://localhost:4000`.

### Sich selbst zum Plattform-Administrator machen (nur lokal)

Auf `/admin` gehen, dort erscheint (nur wenn gegen die Emulatoren verbunden) ein Button "Dev: Mir Plattform-Admin-Rechte geben".

## Build & Deployment (Infomaniak Node.js-Hosting)

Läuft als normaler Next.js-Server (`npm run build && npm start`) — kein statischer Export nötig, da Infomaniak einen echten, persistenten Node.js-Prozess bereitstellt (Start/Stopp/Neustart, Logs, SSH-Zugang). Genaue Build-/Start-Befehle und Deploy-Mechanismus (Git-Push vs. SSH) werden noch mit dem Infomaniak-Environment abgestimmt.

Firebase (Auth/Firestore/Functions) läuft davon unabhängig auf einem echten Firebase-Projekt (Blaze-Tarif) — die `.env.local`-Werte für den Build müssen dann auf das echte Projekt zeigen, nicht auf die Emulatoren.

## Struktur

- `src/app` — Next.js App Router Seiten (öffentlich, `/dashboard/*` Vereinsportal, `/admin/*` Plattform-Administration)
- `src/lib/publicRoutes.ts` — einzige Stelle, die weiss, wie eine öffentliche URL (Vereinslink, Spiel-Live-Link, Widget-Embed, Einladung) gebaut wird
- `functions/` — Cloud Functions (Vereins-/Lizenzerstellung, Score-Engine, Einladungen, Admin-Aktionen)
- `firestore.rules`, `storage.rules` — Security Rules
- `public/widget.js` — Embed-Skript für Drittanbieter-Websites

## Noch nicht enthalten (bewusst, nächste Iteration)

Stripe/Zahlungen, Rabattcodes, Gutscheine, Sponsoring-UI, echter E-Mail-Versand für Reporter-Einladungen (aktuell: Link kopieren & manuell teilen), Bearbeiten bereits angelegter Spiele, echtes Firebase-Projekt (aktuell nur Emulator Suite).
