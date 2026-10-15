# Room 5 · Bunkerwest

Buchungsseite für Room 5 im Bunkerwest.

**Live (Demo):** https://ninoborn1-stack.github.io/room5-bunkerwest/
Die Live-Version läuft ohne Server im Demo-Modus: Buchungen, Profile und Anfragen werden nur im
eigenen Browser gespeichert. Jeder Push auf `main` veröffentlicht `public/` automatisch neu.

## Starten

```bash
npm install     # einmalig (kopiert auch Libs/Fonts nach public/vendor)
npm run dev     # → http://localhost:1102  (startet bei Änderungen neu)
```

## Seiten

| Seite | Datei |
|---|---|
| Startseite mit Hero & Scroll-Effekten | `public/index.html` |
| Buchung (Kalender, Mehrfachbuchung, Extras, Direktbuchung/Anfrage) | `public/buchen.html` |
| Membership (Stufe über dem Profil, nur auf Anfrage) | `public/membership.html` |
| Über uns | `public/ueber-uns.html` |
| Kontakt inkl. Kooperationsanfragen | `public/kontakt.html` |
| Login, Profil anlegen (kostenlos, für alle), Profilseite | `public/login.html`, `public/konto.html` |
| Intern: Buchungen bestätigen, Anfragen freigeben, Nachrichten | `public/admin.html` (Footer → „Intern“) |

## Profile & Membership

- Buchen geht immer ohne Profil.
- **Profil** (Rolle `user`): kostenlos, für alle – Buchungsübersicht, Daten vorausgefüllt.
- **Member** (Rolle `member`): nur per Anfrage; nach Freigabe im Admin-Bereich wird das bestehende
  Profil zum Member (15 % Rabatt, 90-Tage-Buchungsfenster). Wer ohne Profil anfragt, bekommt es gleich mit angelegt.

## Backend & Ausweichweg

- **Mit Server** (`npm run dev`): kleine JSON-API in `server.js`, Daten in `data/db.json`.
  `data/db.json` löschen und Server neu starten = alles zurücksetzen.
- **Ohne Server** (z. B. `public/` statisch gehostet): Die Seite merkt, dass keine API da ist, und
  nutzt dieselbe Logik im Browser (`localStorage`). Im Footer steht dann „Demo-Modus“.

Test-Zugänge (Admin & Demo-Member) stehen in `data/seed.json` – nur für die lokale Entwicklung.

## Anpassen

- **Sessions & Preise:** `SLOTS`, `SLOT_PRICE`, `EXTENSION` in `public/js/config.js` –
  Day 12–18 & Night 18–24 je 150 €, Verlängerung nach 0 Uhr +20 €/h (Stand 15.10.2026).
- **Personal, Services, Premium-Equipment, Kontaktdaten:** ebenfalls `config.js` (noch Platzhalter).
  Server und Browser lesen dieselbe Datei.
- **Member-Rabatt & Buchungsfenster:** `MEMBER` in `config.js` (15 %, 30 vs. 90 Tage).
- **Design:** `public/css/style.css` (Farben als Variablen in `:root`).
- **Fotos:** Originale lokal in `originals/` (nicht im Repo), bearbeitete Versionen in `public/img/`.
  Neu erzeugen mit `npm run grade` (Python + Pillow + NumPy, Skript `tools/grade.py`).

## Vor dem Livegang

- Echte Preise, Adresse, Impressum/Datenschutz eintragen.
- E-Mail-Versand für Bestätigungen anbinden (aktuell nur gespeichert).
- Für echtes Hosting: richtige Datenbank & Auth statt JSON-Datei, Test-Zugänge entfernen
  (`data/seed.json`, `public/data-seed.json`).
