# Bunker West / Room 5 – Gesamtplan neue Website

Stand: 20.10.2026 · Grundlage: Meeting-Protokoll vom 19.10.2026, Farbcode, Wochenplan-Skizze, Wünsche von Nino.
Ziel: **die echte, neue Seite** – mit funktionierendem Backend, so günstig wie möglich (Fixkosten 0 €).

> Legende: ✅ entschieden · ❓ offen (siehe Kapitel 12) · 🔒 versteckt (Code bleibt, nur ausgeblendet)

---

## 1. Rahmen

- Die Seite wird komplett auf das neue Konzept umgebaut: **zwei Membership-Stufen**, Studio-Buchung nur für Artist-Member direkt, alle anderen fragen an.
- Neu dazu: **Light- & Dark-Mode**, **Deutsch & Englisch**, **echtes Backend** (Datenbank, Login, Zahlungen, E-Mails).
- Alle E-Mails werden jetzt vollständig gebaut (Vorlagen + Versand-Logik). Scharf geschaltet wird der Versand, sobald der Mail-Dienst verbunden ist – bis dahin landen sie in einem Protokoll im Admin-Bereich.
- Grundsatz bleibt: flüssig, sauber, keine schweren Effekte (nur Transform/Opacity), Seitenübergang (Vorhang) bleibt.

---

## 2. Design & Branding

| Thema | Entscheidung |
|---|---|
| Akzentfarbe | ✅ Alles Orange → **Bunkergrün `#cff096`** (auch der Schimmer/Glow im Hintergrund) |
| Member-Preise | ✅ **Gold** für Member-Preis, Normalpreis durchgestrichen |
| Verifizierungs-Haken | ✅ Twitter-Stil in Bunkergrün: **Community = Outline-Haken**, **Artist = gefüllter Haken** |
| Titelschrift | ✅ bleibt (Unbounded) – auch im Laufband gefüllt + Outline |
| Fließtext-Schrift | ✅ Bunker-eigene Schrift „Selino“ ❓ (Datei/Name fehlt noch) – bis dahin bleibt Inter Tight als Platzhalter |
| Schreibschrift-Akzente (Kandinsky-Effekt) | ✅ bleibt |
| Laufband | ✅ bleibt, **Bug links fixen** (Anfang „spackt weg“) |
| Startseiten-Design / Hero | ✅ passt so |

**Light-Mode:** gleiche Struktur, heller Beton-/Papierton als Hintergrund. `#cff096` ist auf Hell zu blass für Text → im Light-Mode zusätzlich ein dunkleres Grün für Text/Buttons (z. B. `#4f7d14`), `#cff096` bleibt für Flächen/Glow. Umschalter im Header, Standard = Systemeinstellung, Auswahl wird gemerkt.

**Sprache:** Umschalter DE/EN im Header. Alle Texte kommen aus Übersetzungsdateien (`de.json`, `en.json`), auch E-Mails. Standard = Browsersprache, Auswahl wird gemerkt.

---

## 3. Startseite (von oben nach unten)

1. **Header** – rechts: Button **„Anfragen“** für alle; für eingeloggte Artist-Member **„Jetzt buchen“**. Dazu Sprach- und Theme-Umschalter.
2. **Hero** – ✅ bleibt (ROOM 5 + Mikro-Animation).
3. **„Der Raum“ + Zahlen** – Fläche **22 m²** (korrigiert). „2 Sessions/Tag“ und „6 Stunden“ fliegen raus → stärkere Zahlen ❓ (z. B. „Records im Bunker aufgenommen“, „Artists“, „Events pro Jahr“ – echte Zahlen nötig).
4. **Laufband** – bleibt, Bug fixen.
5. **„Was dich erwartet“** (4 Kacheln)
   - 01 Plug & Play ✅
   - 02 Akustik ✅
   - 03 **Equipment** (statt Vocal-Ecke; Bild bleibt, Untertitel „Equipment“, verlinkt zur echten Equipment-Liste)
   - 04 **Unique Creator Space** (statt Lounge) – einzigartiger Kreativraum, Bunker-Atmosphäre, Songwriting-Vibe. Kurzer Text, Bild ❓
6. **„In 3 Takten zur Session“** – Termin wählen → Extras dazu → anfragen. Mit klarem Teaser: *„Direkt buchen & bezahlen nur als Artist-Member“*.
7. **Kachel „Bunker West Community“** – Design bleibt; links statt Einzelbild eine **Artist-Galerie** im gleichen Look (rechts ausgefadet, links harte Kante). ✅ Swipen + langsamer Auto-Lauf, pausiert bei Berührung. Vorteile neu:
   - „Nur Member können direkt buchen“
   - „30 % auf alle Sessions“
   - Netzwerk-Punkt bleibt
8. **Preise** – Textblock oben rechts entfernen. Jede Karte zeigt Normalpreis durchgestrichen + Member-Preis in Gold + „X € gespart“. Grundausstattung inklusive bleibt in dieser Sektion.
9. **Großer CTA** – bleibt.

---

## 4. Preise Studio (Room 5)

| Session | Zeit | Normal | Artist-Member (−30 %) | Ersparnis |
|---|---|---|---|---|
| Day Session | 12:00–18:00 | 150 € | **105 €** | 45 € |
| Night Session | 18:30–00:30 ✅ | 150 € | **105 €** | 45 € |
| Day + Night | beide | **290 €** (statt 300 €, 10 € Paket-Nachlass für alle) | **203 €** | 87 € |

- Zwischen Day und Night liegen **30 Min. Pause** (Aufräumen/Wechsel). ✅ Night 18:30–00:30, beide Sessions 6 h.
- Reihenfolge der Rabatte: erst Paket-Nachlass (−10 €), dann Member-Rabatt (−30 %).
- Member-Rabatt gilt **nur auf Sessions**, nicht auf Engineer/Produzent/Mixing/Mastering.

### Add-ons

| Leistung | Status | Preis |
|---|---|---|
| Recording Engineer | ✅ | 85 € / Stunde |
| Produzent | ✅ | 150 € / Stunde |
| Mixing | ✅ | 499,99 € pro Track |
| Mastering | ✅ | 499,99 € pro Track |
| Grundausstattung | ✅ inklusive | – |
| Verlängerung nach 0 Uhr | 🔒 aus | – |
| Premium-Equipment | 🔒 aus (bis Equipment fertig) | – |
| Wöchentlich wiederholen | 🔒 aus | – |

---

## 5. Rollen & Rechte

| | Gast | Community-Member | Artist-Member | Admin |
|---|---|---|---|---|
| Beitritt | – | **frei registrieren** | **Bewerbung** + Freigabe | – |
| Kosten | – | kostenlos | Monatsbeitrag ❓ (40 zahlend) / frei (10 Plätze) | – |
| Haken | – | Outline grün | gefüllt grün | – |
| Studio anfragen | ✅ | ✅ | ✅ | ✅ |
| Studio **direkt buchen & bezahlen** | sieht es, gold durchgestrichen | sieht es, gold durchgestrichen | ✅ | ✅ |
| 30 % auf Sessions | – | – | ✅ | – |
| Newsletter & Event-Infos | – | ✅ | ✅ | – |
| „Benachrichtige mich zu Events“ | – | ✅ | ✅ | – |
| Gelegentliche Event-Gutscheine (15 %) | – | ✅ (per Mail) | ✅ | – |
| Eigenes Event im Bunker anfragen (gegen Miete) | über Kontakt | ✅ | ✅ | – |
| Creative Coworking (Mo–Do 9–17, Fr 9–14/15 ❓) | ausgeblendet | **geblockt/ausgeblendet** | ✅ exklusiv (grün) | – |
| Café / Bar / Events / Yoga −30 % | – | – | ✅ (vor Ort) | – |
| Limitierte Free-Tickets (first come, first served) | – | – | ✅ | – |
| Kino-Montag frei + 1 Begleitung | – | – | ✅ | – |
| Verwaltung | – | – | – | ✅ |

**Artist-Plätze:** 50 gesamt = **40 zahlend + 10 frei** (Influencer/Werbung/Freunde, vergibt Admin). Wenn voll → **Warteliste**; wird ein Platz frei, wird der Nächste automatisch benachrichtigt. Öffentlich sichtbar: „noch X Plätze“ oder „Warteliste“.

---

## 6. Wochenplan Bunker (aus der Skizze)

| Zeit | Mo | Di | Mi | Do | Fr | Sa | So |
|---|---|---|---|---|---|---|---|
| 07–09 | Yoga & More | Yoga & More | Yoga & More | Yoga & More | Yoga & More | Yoga & More | Events / Yoga & More (bis 20 Uhr) |
| 09–14 | **Creative Coworking – Club for Artists** | ← | ← | ← | ← | – | ↓ |
| 14–17 | ← | ← | ← | ← | Auf-/Umbau | Auf-/Umbau | ↓ |
| 17–19 | Aufbau / Abbau / Umbau | ← | ← | ← | ← | ← | ↓ |
| 19–24 | **Kino** (+ Yoga & More) | Yoga & More, Comedy, Film, Panel | Sip & Paint, Art, Yoga ❓ | **Musik**: Workshops, Konzerte | Ganztages-Events / Conventions | ← | – |

- Wird als **interaktiver Wochenplan** gebaut: Farbblöcke wie auf der Skizze (Grün = Coworking, Pink = Yoga & More, Blau = Auf-/Umbau, Orange = Events – Farben an das neue Farbsystem angepasst).
- Coworking-Block ist für Gäste/Community **ausgegraut mit Schloss**, für Artist-Member aktiv.
- Konkrete Events (Datum, Titel, Plätze, Free-Tickets) pflegt der Admin; Abend-Events ab 19 Uhr, i. d. R. bis 100 Gäste.
- ❓ Freitag Coworking bis 14 Uhr (Skizze) oder 15 Uhr (Meeting)?

---

## 7. Seiten (Sitemap)

✅ **Am Ende wird zusammengeführt.** Das große „Über uns“ wird die Bunker-Seite, das Studio-Spezifische kommt verkleinert auf die Room-5-Startseite. **Jetzt zuerst:** diese Seite mit allen Inhalten aus dem Meeting, Profilen, Membership und Backend sauber fertig bauen – die Zusammenführung folgt danach.

Empfohlene Struktur (zusammengeführt):

| Seite | Inhalt |
|---|---|
| **Start (Bunker West)** | Wer wir sind, Wochenplan-Teaser, nächste Events, Community, Studio-Teaser |
| **Room 5 / Studio** | heutige Startseite (Hero, Raum, Was dich erwartet, 3 Takte, Preise) + verkleinertes „Über uns“ des Studios |
| **Buchen / Anfragen** | Kalender Day/Night, Add-ons, Anfrage (alle) oder Buchung + Bezahlung (Artist) |
| **Events & Wochenplan** | Wochenplan, Event-Liste, „Benachrichtige mich“, Free-Tickets für Artist-Member |
| **Membership** | Community vs. Artist, Vorteile, Plätze/Warteliste, Registrieren / Bewerben |
| **Über uns (Bunker)** | große Bunker-Seite; Claim „Unter Beton entsteht Lärm“ bleibt beim Studio |
| **Kontakt** | **ein zentrales Formular für alles** |
| **Login / Profil** | Profil je nach Stufe (Kapitel 8) |
| **Admin** | Verwaltung (Kapitel 9) |
| **Impressum / AGB / Datenschutz** | von der aktuellen Bunker-Seite übernehmen ❓ (Texte fehlen) |

Wenn **getrennt**: Room-5-Seite wie oben ohne „Start (Bunker)“ und „Über uns (Bunker)“; Events/Wochenplan und Membership trotzdem hier, weil sie an den Login hängen.

---

## 8. Funktionen im Detail

### Kontakt – ein Formular für alles
- „Worum geht's?“: **Studio-Session · Membership-Club · Event im Bunker · Kooperation · Booking · Presse · Sonstiges**.
- Je nach Auswahl erscheinen passende Zusatzfelder (z. B. Event: Art, Datum, Gäste; Studio: Wunschdatum, Day/Night; Membership → Link zur Bewerbung).
- Jeder „Anfrage“-Button auf der Seite führt hierher, mit vorausgewählter Art.
- Spam-Schutz mit Cloudflare Turnstile (kostenlos, ohne nervige Bilderrätsel).

### Studio: Anfrage vs. Buchung
- Tag im Kalender → Day / Night / beides → Add-ons (Engineer, Produzent, Mixing, Mastering).
- **Gäste & Community:** Button „Anfrage senden“ + überall Hinweis *„Als Artist-Member würdest du X € sparen“*. „Direkt buchen“ ist sichtbar, aber gold durchgestrichen.
- **Artist-Member:** Member-Preise, Button „Jetzt buchen & bezahlen“ → Bezahlung über Stripe → Termin sofort fest.
- Mehrere Tage auf einmal bleiben möglich.

### Membership
- **Community:** Registrierung (Name, E-Mail, Passwort) + Haken für Newsletter/Event-Infos → sofort aktiv, E-Mail-Bestätigung.
- **Artist:** Bewerbung (wer bist du, was machst du musikalisch, Links) → Admin prüft → bei Zusage Zahlungslink (monatliches Abo über Stripe) oder Freiplatz → Haken wird gefüllt. Kündigung über das Profil (Stripe-Kundenportal). Bei vollen Plätzen: Warteliste.

### Profil (wird neu gebaut, danach gemeinsames Review)
- Alle: Name, Haken-Status, Sprache, Theme, Newsletter-Einstellungen, eigene Anfragen & Buchungen.
- Community: „Artist werden“-Bereich, Event-Benachrichtigungen.
- Artist: Mitgliedsstatus & Abo, Rabatte, Free-Tickets, Coworking-Zeiten, Buchungen.

---

## 9. Admin-Bereich

- **Anfragen-Eingang** (alle Kontaktarten, mit Status: neu / in Bearbeitung / erledigt).
- **Studio-Kalender**: Anfragen bestätigen/ablehnen, Buchungen sehen, Tage sperren.
- **Mitglieder**: Bewerbungen annehmen/ablehnen, Freiplätze vergeben, Warteliste, Plätze-Zähler (40/10).
- **Events**: anlegen/bearbeiten, Free-Ticket-Kontingent, Benachrichtigungen auslösen.
- **Newsletter**: Empfängerliste exportieren bzw. an den Newsletter-Dienst übergeben.
- **E-Mail-Protokoll**: alle (noch nicht versendeten) Mails einsehbar.

---

## 10. Technik & Kosten

**Empfehlung: alles auf Cloudflare (kostenloser Plan) + Stripe + Resend.**

| Baustein | Dienst | Kosten |
|---|---|---|
| Hosting der Seite | **Cloudflare Pages** | 0 € (auch eigene Domain) |
| Backend / API | **Cloudflare Workers** (Weiterentwicklung unserer jetzigen `server.js`-Logik) | 0 € im Free-Plan |
| Datenbank | **Cloudflare D1** (SQL) | 0 € im Free-Plan |
| Login | eigenes Login (gehashte Passwörter, sichere Cookies) – kein Zusatzdienst | 0 € |
| Spam-Schutz | **Cloudflare Turnstile** | 0 € |
| Bezahlung (Buchung + Artist-Abo) | **Stripe** (Checkout, Abos, Kundenportal) | keine Fixkosten, nur Gebühr pro Zahlung |
| E-Mails (Bestätigungen etc.) | **Resend** | 0 € im Free-Plan (für unser Volumen ausreichend) |
| Newsletter (1×/Monat) | Resend Broadcasts oder Brevo – wird beim Aufsetzen geprüft | 0 € im Free-Plan |

Warum so:
- **0 € Fixkosten**, keine Server, die einschlafen (anders als manche Gratis-Datenbanken), alles bei einem Anbieter.
- Unsere jetzige Logik (Buchung, Preise, Profile, Membership) lässt sich fast 1:1 übernehmen.
- Die Free-Limits liegen weit über dem, was ein Studio + Bunker an Besuchern und Anfragen erzeugt. Die genauen aktuellen Limits prüfe ich beim Aufsetzen.
- Lokal läuft alles weiter mit `npm run dev`; der Demo-Modus bleibt als Ausweichweg.

Was ihr anlegen müsst (mit eurer E-Mail, kostenlos): Cloudflare-Account, Stripe-Account (mit Firmendaten/Bankkonto), Resend-Account + Domain-Bestätigung. Ich bereite alles so vor, dass nur noch Schlüssel eingetragen werden.

**Domain:** Wenn die Bunker-Seite aktuell bei Wix liegt und wir zusammenführen, zieht die Domain zu Cloudflare um – die Wix-Seite wird dann ersetzt. ❓

### Datenmodell (vereinfacht)
`users` (Rolle: community/artist/admin, Haken, Sprache, Newsletter) · `artist_applications` · `memberships` (Stripe-Abo, Freiplatz ja/nein) · `waitlist` · `studio_bookings` + `booking_sessions` · `requests` (zentrales Kontaktformular, Typ + Zusatzfelder) · `events` + `event_tickets` + `event_notify` · `email_outbox` · `settings` (Preise, Plätze, Zeiten – im Admin änderbar).

---

## 11. E-Mails (werden komplett gebaut, Versand später scharf)

| Auslöser | An wen |
|---|---|
| Community-Registrierung (Bestätigung + Willkommen) | Nutzer |
| Passwort vergessen | Nutzer |
| Kontaktanfrage eingegangen (Kopie) | Absender + Bunker-Team |
| Studio-Anfrage eingegangen / bestätigt / abgelehnt | Anfragender + Team |
| Studio-Buchung bezahlt (mit Kalender-Datei) | Artist + Team |
| Artist-Bewerbung eingegangen | Bewerber + Team |
| Bewerbung angenommen (mit Zahlungslink) / abgelehnt / Warteliste | Bewerber |
| Platz frei – du bist dran | Nächster auf der Warteliste |
| Abo-Zahlung fehlgeschlagen / gekündigt | Artist + Team |
| Neues Event (für „Benachrichtige mich“) | Community + Artist |
| Free-Ticket gesichert | Artist |
| Newsletter (1×/Monat) | alle mit Newsletter-Haken |

Alle Mails zweisprachig (DE/EN je nach Profil), im Bunker-Design.

---

## 12. Offene Entscheidungen – brauche ich von euch

| # | Frage | Vorschlag |
|---|---|---|
| 1 | ~~Zusammenführen?~~ | ✅ ja, am Ende – erst diese Seite fertig |
| 2 | ~~Night Session~~ | ✅ 18:30–00:30 |
| 3 | Artist-Membership: Preis pro Monat? Mindestlaufzeit? | – (fehlt komplett) |
| 4 | ~~Produzent~~ | ✅ 150 € / Stunde |
| 5 | ~~Galerie~~ | ✅ Swipen + Auto-Lauf |
| 6 | Coworking Freitag bis 14 oder 15 Uhr? | – |
| 7 | Mittwoch-Abendformat | vorerst „Art & Yoga“ laut Skizze |
| 8 | Zahlen unter dem Hero (Records, Artists, Events …) | echte Zahlen nötig |

**Nachzureichen:** Schrift „Selino“ (Datei + Lizenz), Equipment-Liste (geprüft von Nesto) + Fotos, Fotos für die Artist-Galerie, Bild für „Unique Creator Space“, AGB/Impressum/Datenschutz-Texte bzw. Link zur aktuellen Bunker-Seite, Domain-Zugang.

---

## 13. Umsetzungsreihenfolge

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **1. Fundament** | Farbsystem Grün/Gold, Light/Dark, DE/EN-Gerüst, Laufband-Bug, Inhalte aus dem Meeting (Kacheln, Zahlen, Texte, Preise, Add-ons) | Seite sieht & liest sich wie beschlossen |
| **2. Backend** | Cloudflare Worker + D1, Login, Rollen (Community/Artist/Admin), Datenmodell, Admin-Grundgerüst; lokal + Demo-Modus weiter lauffähig | echte Daten, echte Accounts |
| **3. Membership** | Community-Registrierung, Artist-Bewerbung, Plätze 40+10, Warteliste, Haken, neues Profil | Membership-System läuft |
| **4. Studio** | Day/Night mit Pause, Paketpreis, Member-Preise gold, Anfrage vs. Direktbuchung, Stripe-Bezahlung | Buchen & Bezahlen läuft |
| **5. Kontakt & Events** | zentrales Formular mit Zusatzfeldern, Wochenplan, Events, Benachrichtigungen, Free-Tickets | Bunker-Seite komplett |
| **6. E-Mails** | alle Vorlagen DE/EN, Outbox, Anbindung Resend/Newsletter | Mails versandbereit |
| **7. Livegang** | Cloudflare + Domain, Stripe live, rechtliche Seiten, Test-Zugänge entfernen, Mobile-/Performance-Check | neue Seite online |

Phase 1 kann sofort starten. Phasen 2–6 bauen aufeinander auf. Vor Phase 7 braucht es die Accounts und die offenen Punkte aus Kapitel 12.

---

## 14. Umsetzungsstand (20.10.2026)

| Bereich | Stand |
|---|---|
| Farbsystem Bunkergrün + Gold, Light/Dark | ✅ umgesetzt |
| Deutsch/Englisch (alle öffentlichen Seiten, E-Mails) | ✅ umgesetzt (Admin bewusst nur Deutsch) |
| Startseite nach Meeting (Kacheln, Zahlen, 3 Takte mit Gold-Teaser, Galerie, Preise mit Member-Preis) | ✅ umgesetzt |
| Studio: Day 12–18, Night 18:30–00:30, Paket 290 €, Artist −30 %, Add-ons, Anfrage vs. Direktbuchung | ✅ umgesetzt |
| Verlängerung, Premium-Equipment, Wöchentlich wiederholen | 🔒 ausgeblendet (`FEATURES` in config.js) |
| Membership Community/Artist, Haken, Plätze 40+10, Warteliste, Bewerbung, Abo | ✅ umgesetzt |
| Profil je Stufe, Einstellungen, Passwort, Buchungen/Anfragen/Tickets | ✅ umgesetzt |
| Zentrales Kontaktformular mit Zusatzfeldern | ✅ umgesetzt |
| Events & Wochenplan, Benachrichtigungen, Free-Tickets | ✅ umgesetzt |
| Admin: Anfragen, Buchungen, Bewerbungen/Mitglieder, Events, Einstellungen, E-Mail-Protokoll, Newsletter-CSV | ✅ umgesetzt |
| Backend-Kern lokal / Demo / Cloudflare D1, Stripe, Resend, Turnstile | ✅ gebaut – Accounts & Schlüssel fehlen noch (siehe LIVEGANG.md) |
| Zusammenführung mit der Bunker-West-Seite | ⏳ nächster Schritt |

---

## 15. Ergänzungen (20.10.2026)

- **Free-Tickets:** 1 pro Artist und Event; bei großen Events (ab 150 verkauften Tickets oder im Admin markiert) 2 – für sich + einen Freund. ✅
- **Montag = Membersday:** nur Artist-Member + 1 Gast, Kino ohne Eintritt (nur Getränke), Networking, Get-together, Spieleabende. ✅
- **Slogan „Create your own space“** ist der Anfrage-Button überall. ✅
- **Kontakt:** „Booking“ und „Event im Bunker“ zusammengelegt; neu „Location: Shooting & Videodreh“. ✅
- **Profil:** Member-Navigation (Wochenplan · Free-Tickets/Events · Buchungen · Membership | Einstellungen · Logout). ✅
- **Zukunft – Uni-Kooperationen:** Musik- und Kunsthochschulen als Partner. Studierende bekommen Vorteile
  (nicht so weitreichend wie Artist-Member), z. B. Rabatt auf Sessions, Location-Shootings oder auf die
  Artist-Membership selbst. Umsetzung später: Partner-Code bei Registrierung/Bewerbung + eigene Rabattstufe.
