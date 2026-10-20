// Zentrale Konfiguration – gilt für Browser, Demo-Modus, lokalen Server und Cloudflare.
// Stand: Meeting vom 19.10.2026. Werte mit "PLATZHALTER" müssen noch bestätigt werden.
// Zeiten in Minuten ab Mitternacht (12:00 = 720). Werte > 1440 = nach Mitternacht.

export const STUDIO = {
  name: 'Room 5',
  house: 'Bunker West',
  email: 'info@bunkerwest.com',          // von bunkerwest.net – eigene Room-5-Adresse folgt evtl.
  phone: '+49 162 2417234',              // Kontaktnummer laut bunkerwest.net
  street: 'Hohenzollerndamm 120',
  city: '14199 Berlin',
  instagram: 'https://www.instagram.com/bunkerwestberlin/',
  instagramHandle: '@bunkerwestberlin',
  bunkerwestUrl: 'https://www.bunkerwest.net',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Hohenzollerndamm+120+14199+Berlin',
  size: 22,                              // m² (korrigiert im Meeting)
};

// Angaben fürs Impressum (Stand bunkerwest.net/blank, Okt. 2026)
export const LEGAL = {
  company: 'BUNKER WEST',
  owner: 'Albert Rabaev',                // auf bunkerwest.net einmal "Rabev" geschrieben – bitte bestätigen
  street: 'Hohenzollerndamm 120',
  city: '14199 Berlin',
  phone: '+49 162 8413905',              // Nummer laut Impressum (weicht von der Kontaktnummer ab)
  email: 'info@bunkerwest.com',
  taxNo: '24/482/01085',
};

// Zwei Sessions pro Tag, dazwischen 30 Min. Pause zum Aufräumen
export const SLOTS = {
  day:   { id: 'day',   from: 12 * 60,      to: 18 * 60,      icon: 'sun',  label: { de: 'Day Session',   en: 'Day Session' } },
  night: { id: 'night', from: 18 * 60 + 30, to: 24 * 60 + 30, icon: 'moon', label: { de: 'Night Session', en: 'Night Session' } },
};
export const PRICES = {
  slot: 150,          // € pro Session (egal welche)
  bundle: 290,        // Day + Night zusammen (10 € Paket-Nachlass für alle)
};

// Zubuchbare Leistungen (Member-Rabatt gilt NICHT darauf)
export const ADDONS = [
  { id: 'engineer', kind: 'hourly', price: 20,     icon: 'sliders-horizontal', label: { de: 'Recording Engineer', en: 'Recording Engineer' }, desc: { de: 'Aufnahme, Gain-Staging, saubere Takes – du konzentrierst dich auf die Performance.', en: 'Recording, gain staging, clean takes – you focus on the performance.' } },
  { id: 'producer', kind: 'hourly', price: 30,     icon: 'audio-waveform',     label: { de: 'Produzent', en: 'Producer' },                     desc: { de: 'Beats, Arrangement, Vocal-Produktion. Ein zweites Paar Ohren mit Plan.', en: 'Beats, arrangement, vocal production. A second pair of ears with a plan.' } },
  { id: 'mix',      kind: 'track',  price: 250,    icon: 'blend',              label: { de: 'Mixing', en: 'Mixing' },                          desc: { de: 'Vollständiger Mix deines Songs.', en: 'A complete mix of your song.' } },
  { id: 'master',   kind: 'track',  price: 85,     icon: 'gauge',              label: { de: 'Mastering', en: 'Mastering' },                    desc: { de: 'Laut, klar, streaming-ready.', en: 'Loud, clear, streaming-ready.' } },
];

// Versteckt laut Meeting (Code bleibt, nur ausgeschaltet)
export const FEATURES = {
  extensionAfterMidnight: false,
  premiumEquipment: false,
  weeklyRepeat: false,
};

export const MEMBERSHIP = {
  artistDiscount: 0.30,        // 30 % auf alle Sessions
  paidSlots: 40,               // zahlende Artist-Plätze
  freeSlots: 10,               // Freiplätze (Influencer, Werbung, Freunde)
  artistPriceMonthly: 49,      // PLATZHALTER – wird NICHT öffentlich gezeigt, nur in der Einladung (Admin → Einstellungen)
  bookingWindowDays: 120,      // so weit im Voraus buchbar/anfragbar
  holdMinutes: 30,             // so lange ist ein Termin während der Bezahlung reserviert
  bigEventThreshold: 150,      // ab so vielen verkauften Tickets: 2 Free-Tickets pro Artist (für sich + Freund)
};

// Kontaktformular: alle Anfrage-Arten an einer Stelle
export const REQUEST_TYPES = [
  { id: 'event',      icon: 'sparkles',       label: { de: 'Create your own space', en: 'Create your own space' } },
  { id: 'studio',     icon: 'mic-vocal',      label: { de: 'Studio-Session', en: 'Studio session' } },
  { id: 'location',   icon: 'clapperboard',   label: { de: 'Location: Shooting & Videodreh', en: 'Location: shoot & video' } },
  { id: 'membership', icon: 'badge-check',    label: { de: 'Membership-Club', en: 'Membership club' } },
  { id: 'kooperation',icon: 'handshake',      label: { de: 'Kooperation', en: 'Collaboration' } },
  { id: 'presse',     icon: 'newspaper',      label: { de: 'Presse', en: 'Press' } },
  { id: 'sonstiges',  icon: 'message-circle', label: { de: 'Sonstiges', en: 'Other' } },
];

// Wochenplan Bunker (aus der Skizze vom 14.10.). Zeiten in Minuten.
// kind: yoga | cowork (nur Artist-Member) | setup ("Backstage": Bunker wird vorbereitet) | event
export const WEEK = [
  /* Mo */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'cowork', from: 540, to: 1020 }, { kind: 'setup', from: 1020, to: 1140 }, { kind: 'event', membersOnly: true, from: 1140, to: 1440, title: { de: 'Membersday', en: 'Members day' }, note: { de: 'Kino, Networking & Spieleabend – nur Artists +1 Gast, kein Eintritt', en: 'Cinema, networking & game night – artists +1 guest only, no entry fee' } }],
  /* Di */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'cowork', from: 540, to: 1020 }, { kind: 'setup', from: 1020, to: 1140 }, { kind: 'event', from: 1140, to: 1440, title: { de: 'Comedy, Yoga & Talks', en: 'Comedy, yoga & talks' } }],
  /* Mi */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'cowork', from: 540, to: 1020 }, { kind: 'setup', from: 1020, to: 1140 }, { kind: 'event', from: 1140, to: 1440, title: { de: 'Art, Sip & Paint', en: 'Art, sip & paint' } }],
  /* Do */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'cowork', from: 540, to: 1020 }, { kind: 'setup', from: 1020, to: 1140 }, { kind: 'event', from: 1140, to: 1440, title: { de: 'Musik & Workshops', en: 'Music & workshops' } }],
  /* Fr */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'cowork', from: 540, to: 840 }, { kind: 'setup', from: 840, to: 1140 }, { kind: 'event', from: 1140, to: 1440, title: { de: 'Events & Conventions', en: 'Events & conventions' } }],
  /* Sa */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'setup', from: 840, to: 1140 }, { kind: 'event', from: 1140, to: 1440, title: { de: 'Events & Conventions', en: 'Events & conventions' } }],
  /* So */ [{ kind: 'event', from: 420, to: 1200, title: { de: 'Retreats, Yoga & Events', en: 'Retreats, yoga & events' }, note: { de: 'ruhiger Tag, bis 20 Uhr', en: 'quiet day, until 8 pm' } }],
];

export const EVENT_CATEGORIES = {
  membersday: { de: 'Membersday', en: 'Members day' },
  kino:     { de: 'Kino', en: 'Cinema' },
  comedy:   { de: 'Comedy', en: 'Comedy' },
  yoga:     { de: 'Yoga & Health', en: 'Yoga & health' },
  musik:    { de: 'Musik', en: 'Music' },
  workshop: { de: 'Workshop', en: 'Workshop' },
  art:      { de: 'Art', en: 'Art' },
  talk:     { de: 'Talk & Film', en: 'Talk & film' },
  special:  { de: 'Special', en: 'Special' },
};

// Equipment im Raum (Stand 20.10.2026 – bewusst schlank, professioneller Standard)
export const GEAR = [
  { group: { de: 'Recording', en: 'Recording' }, items: ['Neumann Großmembran-Mikrofon', 'Universal Audio Apollo Twin', 'Popschutz & Shockmount'] },
  { group: { de: 'Monitoring', en: 'Monitoring' }, items: ['ADAM Audio Studiomonitore', 'Studio-Kopfhörer'] },
  { group: { de: 'Instrumente', en: 'Instruments' }, items: ['E-Gitarren & E-Bass', 'MIDI-Keyboard'] },
  { group: { de: 'Raum', en: 'Room' }, items: ['Holz-Diffusor-Wand', 'Deckensegel & Absorber', 'Vocal-Ecke'] },
];

// ---------------------------------------------------------------- Bunker West: Bereiche im Grundriss
// Nur anfragbar, nichts direkt buchbar. Flächen laut Architektenplan. Polygone in Pixeln von img/bunker/plan-*.jpg (1360×1737).
export const PLAN_SIZE = [1360, 1737];
export const SPACES = [
  { id: 'foyer', cat: 'event', area: 100, name: { de: 'Foyer', en: 'Foyer' },
    poly: '150,500 420,222 470,232 470,812 150,812',
    images: ['foyer', 'bar'],
    features: { de: ['Bar mit Zapfanlage', 'Garderobe', 'Lounge-Möbel', 'Direkter Eingang'], en: ['Bar counter', 'Cloakroom', 'Lounge furniture', 'Direct entrance'] },
    desc: { de: 'Empfang mit Bar und Garderobe – für Get-togethers, Empfänge und Ausstellungen.', en: 'Reception with bar and cloakroom – for get-togethers, receptions and exhibitions.' } },
  { id: 'halle1', cat: 'event', area: 104.6, name: { de: 'Halle 1', en: 'Hall 1' },
    poly: '490,234 800,234 1292,470 1292,565 1100,565 1100,458 940,458 940,575 822,575 822,438 590,512 568,512 490,598',
    images: ['halle1', 'halle1-2', 'halle12'],
    features: { de: ['104 m² Fläche', '3 m Raumhöhe', 'Strahler-Beleuchtung', 'Durchreiche zur Bar'], en: ['104 m²', '3 m ceiling', 'Track lighting', 'Bar hatch'] },
    desc: { de: 'Große Fläche mit 3 m Raumhöhe – für Ausstellungen, Shootings, Dinner und Auftritte.', en: 'Large space with a 3 m ceiling – for exhibitions, shoots, dinners and performances.' } },
  { id: 'halle2', cat: 'event', area: 135, name: { de: 'Halle 2 mit Bühne', en: 'Hall 2 with stage' },
    poly: '490,604 572,518 822,518 822,582 1230,582 1230,815 490,815',
    images: ['halle2', 'halle12', 'dinner'],
    features: { de: ['Inkl. Bühne', 'Musik- & Lichttechnik', 'Strahler-Beleuchtung', 'Mit Halle 1 verbindbar'], en: ['Incl. stage', 'Sound & light rig', 'Track lighting', 'Connects to Hall 1'] },
    desc: { de: 'Die Halle mit Bühne, Musik- und Lichttechnik – der Ort für Konzerte, Shows und Release-Events.', en: 'The hall with stage, sound and light – the place for concerts, shows and release events.' } },
  { id: 'history', cat: 'event', area: 25.7, name: { de: 'History Room', en: 'History Room' },
    poly: '66,898 312,898 312,1048 66,1048',
    images: ['history'],
    features: { de: ['26 m² Fläche', 'Ruhiger Nebenraum', 'Meetings & Break-outs', 'Workshops'], en: ['26 m²', 'Quiet side room', 'Meetings & break-outs', 'Workshops'] },
    desc: { de: 'Charaktervoller Nebenraum für Meetings, Break-outs, Workshops und kleine Sessions.', en: 'Characterful side room for meetings, break-outs, workshops and small sessions.' } },
  { id: 'studio6', cat: 'studio', area: 60.2, name: { de: 'Studio Room 6', en: 'Studio Room 6' },
    poly: '922,834 1186,834 1186,1148 922,1148',
    images: ['studio6', 'studio6-2'],
    features: { de: ['60 m² Fläche', 'Shooting & Videodreh', 'Ausstellung', 'Akustisch ruhig'], en: ['60 m²', 'Shoots & video', 'Exhibitions', 'Acoustically quiet'] },
    desc: { de: 'Großer, ruhiger Raum für Shootings, Videodrehs, Ausstellungen und Produktionen.', en: 'Large, quiet room for shoots, video, exhibitions and productions.' } },
  { id: 'room5', cat: 'studio', area: 22, name: { de: 'Room 5 – Tonstudio', en: 'Room 5 – recording studio' }, link: 'room5.html', own: true,
    poly: '922,1160 1186,1160 1186,1266 922,1266',
    images: ['../room-full', '../control-corner'],
    features: { de: ['Neumann & Apollo Twin', 'Akustisch behandelt', 'Day & Night Sessions', 'Eigene Buchung'], en: ['Neumann & Apollo Twin', 'Acoustically treated', 'Day & night sessions', 'Own booking'] },
    desc: { de: 'Unser Tonstudio hat einen eigenen Kalender: Artist-Member buchen direkt, alle anderen fragen an.', en: 'Our recording studio has its own calendar: Artist Members book directly, everyone else sends a request.' } },
  { id: 'lager', cat: 'storage', area: 36.9, name: { de: 'Lagerflächen', en: 'Storage' },
    poly: '66,1056 312,1056 312,1176 66,1176 M1098,1572 1296,1572 1296,1706 1098,1706',
    images: ['lager'],
    features: { de: ['Zwei Räume (21 + 16 m²)', 'Ab 10 Tagen', 'Trocken & sicher', 'Für Produktionen'], en: ['Two rooms (21 + 16 m²)', 'From 10 days', 'Dry & secure', 'For productions'] },
    desc: { de: 'Lagerfläche für Bühnenbau, Equipment und Produktionen – ab 10 Tagen.', en: 'Storage for stage builds, equipment and productions – from 10 days.' } },
];
// Schnellauswahl
export const SPACE_COMBOS = [
  { id: 'hallen', ids: ['foyer', 'halle1', 'halle2'], label: { de: 'Foyer + beide Hallen', en: 'Foyer + both halls' } },
  { id: 'alles', ids: ['foyer', 'halle1', 'halle2', 'history', 'studio6'], label: { de: 'Ganze Location', en: 'Entire location' } },
];
// Auf Anfrage dazu
export const SPACE_EXTRAS = [
  { id: 'bar', icon: 'wine', label: { de: 'Bar-Service mit Personal', en: 'Bar service with staff' } },
  { id: 'technik', icon: 'lightbulb', label: { de: 'Ton- & Lichttechnik', en: 'Sound & lighting' } },
  { id: 'catering', icon: 'utensils-crossed', label: { de: 'Catering', en: 'Catering' } },
  { id: 'security', icon: 'shield', label: { de: 'Security & Einlass', en: 'Security & door' } },
  { id: 'reinigung', icon: 'sparkles', label: { de: 'Endreinigung', en: 'Final cleaning' } },
];
// Wofür Bereiche angefragt werden können (Kontaktformular)
export const SPACE_REQUEST_TYPES = ['event', 'location', 'kooperation', 'sonstiges'];
