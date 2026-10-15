// Zentrale Konfiguration – wird vom Browser UND vom Server (server.js) importiert.
// Alle Preise, Zeiten, Equipment- und Kontaktangaben hier anpassen.
// Session-Preise laut Absprache vom 15.10.2026. Personal, Services, Premium-Equipment und Adresse sind noch Platzhalter.

export const STUDIO = {
  name: 'Room 5',
  house: 'Bunkerwest',
  claim: 'Ein Raum unter Beton. Gebaut für Sound.',
  email: 'room5@bunkerwest.de',
  phone: '+49 000 0000000',
  street: 'Bunkerwest · Adresse folgt',
  city: 'Deutschland',
  instagram: 'https://instagram.com/',
  bunkerwestUrl: 'https://bunkerwest.de',
  size: '28 m²',
};

export const CURRENCY = 'EUR';

// Zwei feste 6-Stunden-Sessions pro Tag, jeden Tag.
export const SLOTS = {
  day:   { id: 'day',   label: 'Day Session',   from: 12, to: 18, icon: 'sun' },
  night: { id: 'night', label: 'Night Session', from: 18, to: 24, icon: 'moon' },
};
export const SLOT_PRICE = 150;          // € pro Session – egal welche (Eröffnungspreis)

// Verlängerung nach 0 Uhr, nur im Anschluss an die Night Session, im Stundentakt
export const EXTENSION = { pricePerHour: 20, maxHours: 6 };

// Personal pro Stunde (wird pro Session gebucht)
export const STAFF = [
  { id: 'engineer', label: 'Recording Engineer', price: 40, unit: 'h', icon: 'sliders-horizontal', desc: 'Aufnahme, Gain-Staging, saubere Takes – du konzentrierst dich auf die Performance.' },
  { id: 'producer', label: 'Produzent',           price: 60, unit: 'h', icon: 'audio-waveform',     desc: 'Beats, Arrangement, Vocal-Produktion. Ein zweites Paar Ohren mit Plan.' },
];

// Services pro Track
export const SERVICES = [
  { id: 'mix',    label: 'Mixing',    price: 120, unit: 'Track', icon: 'blend',    desc: 'Vollständiger Mix deines Songs, 2 Revisionen.' },
  { id: 'master', label: 'Mastering', price: 45,  unit: 'Track', icon: 'gauge',    desc: 'Laut, klar, streaming-ready.' },
];

// Premium-Equipment gegen Aufpreis, pauschal pro Session (Grundausstattung ist inklusive).
// Schäden an Premium-Equipment werden berechnet. Platzhalter – echte Liste folgt.
export const UPGRADES = [
  { id: 'mic',     label: 'Premium-Mikrofon',            price: 25, icon: 'mic-vocal',      desc: 'Großmembran-Upgrade für Vocals.' },
  { id: 'chain',   label: 'Analog Vocal Chain',          price: 40, icon: 'cable',          desc: 'Preamp & Kompressor im Signalweg.' },
  { id: 'synth',   label: 'Synth-Paket',                 price: 20, icon: 'keyboard-music', desc: 'Zusätzliche Synths, fertig verkabelt.' },
  { id: 'cue',     label: 'Kopfhörer-Mix für 4',         price: 10, icon: 'headphones',     desc: 'Vier Cue-Mixe für Features & Bands.' },
];

export const MEMBER = {
  discount: 0.15,         // 15 % auf Raumpreise
  windowPublic: 30,       // Tage im Voraus buchbar (öffentlich)
  windowMember: 90,       // Tage im Voraus buchbar (Mitglieder)
};

export const GEAR = [
  { group: 'Monitoring', items: ['Adam Audio A7X', 'Yamaha NS-10 (Referenz)', 'Beyerdynamic DT 770 / 990'] },
  { group: 'Recording',  items: ['Universal Audio Apollo', 'Neumann TLM 103', 'Shure SM7B', 'Großmembran-Röhrenmikro'] },
  { group: 'Instrumente', items: ['Native Instruments Komplete Kontrol', 'Fender Telecaster', 'Yamaha E-Bass', 'Akai MPC'] },
  { group: 'Raum',       items: ['Holz-Diffusor Wall', 'Deckensegel', 'Breitband-Absorber', 'Vocal-Ecke mit Pop-Schutz'] },
];
