# Livegang – Schritt für Schritt (Cloudflare, Stripe, Resend)

Alles mit kostenlosen Plänen. Fixkosten: 0 €. Stripe nimmt nur eine Gebühr pro Zahlung.

## 1. Cloudflare (Hosting, Backend, Datenbank)

1. Kostenlosen Account auf cloudflare.com anlegen.
2. **Datenbank anlegen:** Workers & Pages → D1 → „Create database“, Name `bunkerwest`.
   Danach in der Datenbank-Konsole den Inhalt von `cloudflare/schema.sql` ausführen.
3. Die Database-ID in `wrangler.toml` bei `database_id` eintragen.
4. **Pages-Projekt:** Workers & Pages → Create → Pages → „Connect to Git“ → Repo `room5-bunkerwest`.
   - Build command: *(leer)*
   - Build output directory: `public`
5. Im Pages-Projekt unter Settings → Functions → D1 bindings: Variable `DB` → Datenbank `bunkerwest`.
6. Unter Settings → Environment variables (Production) eintragen:

| Variable | Wert |
|---|---|
| `SITE_URL` | z. B. `https://bunkerwest.de` |
| `ADMIN_EMAIL` | E-Mail des ersten Admins |
| `ADMIN_PASSWORD` | sicheres Passwort (wird beim ersten Aufruf gehasht gespeichert) |
| `PBKDF2_ITER` | `20000` |
| `TEAM_EMAIL` | Adresse, an die neue Anfragen gehen |

7. Neu deployen. Unter `https://<projekt>.pages.dev` läuft die Seite mit echtem Backend
   (im Footer steht dann „Server verbunden“ statt „Demo-Modus“).
8. **Eigene Domain:** Pages-Projekt → Custom domains. Liegt die Domain noch bei Wix,
   werden die DNS-Einträge zu Cloudflare umgezogen – die Wix-Seite ist danach ersetzt.

## 2. Stripe (Bezahlung)

1. Account auf stripe.com mit Firmendaten & Bankkonto anlegen.
2. Developers → API keys → Secret key als `STRIPE_SECRET_KEY` in Cloudflare eintragen.
3. Developers → Webhooks → Endpoint hinzufügen: `https://<domain>/api/stripe/webhook`
   Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`.
   Signing secret als `STRIPE_WEBHOOK_SECRET` eintragen.
4. Settings → Billing → Customer portal aktivieren (damit Artists ihr Abo selbst verwalten/kündigen).
5. Erst mit Test-Schlüsseln (`sk_test_…`) durchspielen, dann auf Live-Schlüssel wechseln.

## 3. Resend (E-Mails)

1. Account auf resend.com, Domain hinzufügen und die DNS-Einträge (bei Cloudflare) setzen.
2. API key als `RESEND_API_KEY` eintragen, `MAIL_FROM` z. B. `Bunker West <noreply@bunkerwest.de>`.
3. Ab dann werden alle Mails versendet (vorher stehen sie im Admin unter „E-Mails“).

## 4. Spam-Schutz (Turnstile)

1. Cloudflare → Turnstile → Site hinzufügen (Domain eintragen).
2. `TURNSTILE_SITE_KEY` und `TURNSTILE_SECRET` eintragen – die Formulare zeigen den Check dann automatisch.

## 5. Vor dem Schalter-Umlegen

- [ ] Artist-Preis festlegen (Admin → Einstellungen)
- [ ] Equipment-Liste (von Nesto geprüft) in `public/js/config.js`
- [ ] Impressum, Datenschutz, AGB in `public/rechtliches.html`
- [ ] Kontaktdaten & Adresse in `public/js/config.js`
- [ ] Echte Zahlen unter dem Hero (z. B. aufgenommene Records)
- [ ] Test-Zugänge entfernen: `public/data-seed.json` leeren (Demo-Modus braucht sie nicht mehr)
- [ ] Einmal komplett durchspielen: Anfrage, Bewerbung → Freigabe → Abo, Direktbuchung, Event + Ticket
