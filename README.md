# Bunker West · Room 5

Website für Room 5 im Bunker West: Studio-Anfrage und -Buchung, zweistufige Membership
(Community & Artist), Events & Wochenplan, Profile, zentrales Kontaktformular, Admin-Bereich.
Hell/Dunkel-Modus und Deutsch/Englisch.

**Live (Demo):** https://ninoborn1-stack.github.io/room5-bunkerwest/
**Gesamtplan:** [docs/PLAN.md](docs/PLAN.md) · **Livegang-Anleitung:** [docs/LIVEGANG.md](docs/LIVEGANG.md)

## Starten

```bash
npm install     # einmalig (kopiert auch Libs/Fonts nach public/vendor)
npm run dev     # → http://localhost:1102  (startet bei Änderungen neu)
npm test        # Ablauf-Test des Backends
```

Test-Zugänge (Admin, Artist, Community) stehen in `data/seed.json` – nur für lokal & Demo.

## Wie das Backend aufgebaut ist

Ein gemeinsamer Backend-Kern (`public/js/backend/core.js`) läuft in drei Umgebungen – mit identischer Logik:

| Umgebung | Daten | Wofür |
|---|---|---|
| `npm run dev` (server.js) | `data/db.json` | lokal entwickeln & testen |
| Browser ohne Server (z. B. GitHub Pages) | `localStorage` | Demo-Link zum Herzeigen |
| Cloudflare Pages Functions (`functions/api/`) | Cloudflare D1 | echte Seite, 0 € Fixkosten |

Optionale Dienste werden nur über Umgebungsvariablen eingeschaltet (`.env.example`):
- **Stripe** – Bezahlung der Artist-Direktbuchung und des Artist-Abos. Ohne Schlüssel: Testzahlung.
- **Resend** – E-Mail-Versand. Ohne Schlüssel landen alle Mails im Protokoll im Admin-Bereich.
- **Cloudflare Turnstile** – Spam-Schutz für Formulare.

## Rollen

| | Gast | Community | Artist | Admin |
|---|---|---|---|---|
| Beitritt | – | frei registrieren | Bewerbung + Freigabe | – |
| Studio | anfragen | anfragen | **direkt buchen & bezahlen, −30 %** | alles |
| Events | ansehen | Benachrichtigungen | Free-Tickets, Kino frei +1 | verwalten |
| Coworking (Wochenplan) | gesperrt | gesperrt | freigeschaltet | – |

Artist-Plätze: 40 zahlend + 10 frei, danach Warteliste (rückt automatisch nach).

## Anpassen

- **Preise, Zeiten, Add-ons, Plätze, Wochenplan, Kontaktdaten:** `public/js/config.js`
- **Artist-Preis & Plätze im Betrieb:** Admin → Einstellungen
- **Texte:** Deutsch direkt im HTML, Englisch in `public/js/i18n/en.js` (Texte aus JavaScript: `de.js` / `en.js`)
- **E-Mail-Vorlagen:** `public/js/backend/emails.js`
- **Design:** `public/css/style.css` (Farben als Variablen für Dunkel & Hell)
- **Fotos:** Originale lokal in `originals/` (nicht im Repo), bearbeitete in `public/img/` (`npm run grade`)
