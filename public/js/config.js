// Zentrale Konfiguration – gilt für Browser, Demo-Modus, lokalen Server und Cloudflare.
// Stand: Meeting vom 19.10.2026. Werte mit "PLATZHALTER" müssen noch bestätigt werden.
// Zeiten in Minuten ab Mitternacht (12:00 = 720). Werte > 1440 = nach Mitternacht.

export const STUDIO = {
  name: 'Room 5',
  house: 'Bunker West',
  email: 'room5@bunkerwest.de',          // PLATZHALTER
  phone: '+49 000 0000000',              // PLATZHALTER
  street: 'Bunker West · Adresse folgt', // PLATZHALTER
  city: 'Deutschland',
  instagram: 'https://instagram.com/',   // PLATZHALTER
  bunkerwestUrl: 'https://bunkerwest.de',
  size: 22,                              // m² (korrigiert im Meeting)
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
  { id: 'engineer', kind: 'hourly', price: 85,     icon: 'sliders-horizontal', label: { de: 'Recording Engineer', en: 'Recording Engineer' }, desc: { de: 'Aufnahme, Gain-Staging, saubere Takes – du konzentrierst dich auf die Performance.', en: 'Recording, gain staging, clean takes – you focus on the performance.' } },
  { id: 'producer', kind: 'hourly', price: 150,    icon: 'audio-waveform',     label: { de: 'Produzent', en: 'Producer' },                     desc: { de: 'Beats, Arrangement, Vocal-Produktion. Ein zweites Paar Ohren mit Plan.', en: 'Beats, arrangement, vocal production. A second pair of ears with a plan.' } },
  { id: 'mix',      kind: 'track',  price: 499.99, icon: 'blend',              label: { de: 'Mixing', en: 'Mixing' },                          desc: { de: 'Vollständiger Mix deines Songs.', en: 'A complete mix of your song.' } },
  { id: 'master',   kind: 'track',  price: 499.99, icon: 'gauge',              label: { de: 'Mastering', en: 'Mastering' },                    desc: { de: 'Laut, klar, streaming-ready.', en: 'Loud, clear, streaming-ready.' } },
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
  artistPriceMonthly: 49,      // PLATZHALTER – Preis noch offen (Kap. 12 im Plan)
  bookingWindowDays: 120,      // so weit im Voraus buchbar/anfragbar
  holdMinutes: 30,             // so lange ist ein Termin während der Bezahlung reserviert
};

// Kontaktformular: alle Anfrage-Arten an einer Stelle
export const REQUEST_TYPES = [
  { id: 'studio',     icon: 'mic-vocal',      label: { de: 'Studio-Session', en: 'Studio session' } },
  { id: 'membership', icon: 'badge-check',    label: { de: 'Membership-Club', en: 'Membership club' } },
  { id: 'event',      icon: 'party-popper',   label: { de: 'Event im Bunker', en: 'Event at the Bunker' } },
  { id: 'kooperation',icon: 'handshake',      label: { de: 'Kooperation', en: 'Collaboration' } },
  { id: 'booking',    icon: 'calendar-range', label: { de: 'Booking', en: 'Booking' } },
  { id: 'presse',     icon: 'newspaper',      label: { de: 'Presse', en: 'Press' } },
  { id: 'sonstiges',  icon: 'message-circle', label: { de: 'Sonstiges', en: 'Other' } },
];

// Wochenplan Bunker (aus der Skizze vom 14.10.). Zeiten in Minuten.
// kind: yoga | cowork (nur Artist-Member) | setup | event
export const WEEK = [
  /* Mo */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'cowork', from: 540, to: 1020 }, { kind: 'setup', from: 1020, to: 1140 }, { kind: 'event', from: 1140, to: 1440, title: { de: 'Kino', en: 'Cinema' }, note: { de: 'Artist-Member frei + 1 Begleitung', en: 'Artist members free + 1 guest' } }],
  /* Di */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'cowork', from: 540, to: 1020 }, { kind: 'setup', from: 1020, to: 1140 }, { kind: 'event', from: 1140, to: 1440, title: { de: 'Comedy, Yoga & Talks', en: 'Comedy, yoga & talks' } }],
  /* Mi */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'cowork', from: 540, to: 1020 }, { kind: 'setup', from: 1020, to: 1140 }, { kind: 'event', from: 1140, to: 1440, title: { de: 'Art, Sip & Paint', en: 'Art, sip & paint' } }],
  /* Do */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'cowork', from: 540, to: 1020 }, { kind: 'setup', from: 1020, to: 1140 }, { kind: 'event', from: 1140, to: 1440, title: { de: 'Musik & Workshops', en: 'Music & workshops' } }],
  /* Fr */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'cowork', from: 540, to: 840 }, { kind: 'setup', from: 840, to: 1140 }, { kind: 'event', from: 1140, to: 1440, title: { de: 'Events & Conventions', en: 'Events & conventions' } }],
  /* Sa */ [{ kind: 'yoga', from: 420, to: 540 }, { kind: 'setup', from: 840, to: 1140 }, { kind: 'event', from: 1140, to: 1440, title: { de: 'Events & Conventions', en: 'Events & conventions' } }],
  /* So */ [{ kind: 'event', from: 420, to: 1200, title: { de: 'Retreats, Yoga & Events', en: 'Retreats, yoga & events' }, note: { de: 'ruhiger Tag, bis 20 Uhr', en: 'quiet day, until 8 pm' } }],
];

export const EVENT_CATEGORIES = {
  kino:     { de: 'Kino', en: 'Cinema' },
  comedy:   { de: 'Comedy', en: 'Comedy' },
  yoga:     { de: 'Yoga & Health', en: 'Yoga & health' },
  musik:    { de: 'Musik', en: 'Music' },
  workshop: { de: 'Workshop', en: 'Workshop' },
  art:      { de: 'Art', en: 'Art' },
  talk:     { de: 'Talk & Film', en: 'Talk & film' },
  special:  { de: 'Special', en: 'Special' },
};

// PLATZHALTER – wird durch die von Nesto geprüfte Liste ersetzt
export const GEAR = [
  { group: { de: 'Monitoring', en: 'Monitoring' }, items: ['Adam Audio A7X', 'Beyerdynamic DT 770 / 990'] },
  { group: { de: 'Recording', en: 'Recording' }, items: ['Universal Audio Apollo', 'Großmembran-Mikrofon', 'Shure SM7B'] },
  { group: { de: 'Instrumente', en: 'Instruments' }, items: ['Native Instruments Komplete Kontrol', 'E-Gitarre', 'E-Bass'] },
  { group: { de: 'Raum', en: 'Room' }, items: ['Holz-Diffusor-Wand', 'Deckensegel', 'Breitband-Absorber', 'Vocal-Ecke mit Popschutz'] },
];
