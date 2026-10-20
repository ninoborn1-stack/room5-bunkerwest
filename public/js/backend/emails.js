// E-Mail-Vorlagen (DE/EN) im Bunker-Look. Werden in die Outbox gelegt und – sobald ein
// Mail-Dienst verbunden ist (RESEND_API_KEY) – sofort versendet.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout({ title, intro, body = '', cta, lang }) {
  const foot = lang === 'en' ? 'Bunker West · Room 5 – you are receiving this email because of your activity on our website.' : 'Bunker West · Room 5 – du bekommst diese E-Mail wegen deiner Aktivität auf unserer Website.';
  return `<!doctype html><html><body style="margin:0;background:#070706;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#eeece4">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#121210;border:1px solid #2a2a25;border-radius:18px">
  <tr><td style="padding:32px">
    <div style="font-family:monospace;font-size:11px;letter-spacing:3px;color:#cff096;text-transform:uppercase">Bunker West · Room 5</div>
    <h1 style="font-size:26px;line-height:1.1;margin:18px 0 12px;text-transform:uppercase;letter-spacing:-0.5px">${title}</h1>
    <p style="font-size:16px;line-height:1.55;color:#cfcdc4;margin:0 0 18px">${intro}</p>
    ${body}
    ${cta ? `<p style="margin:26px 0 6px"><a href="${esc(cta.url)}" style="display:inline-block;background:#cff096;color:#0f1a06;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:99px">${cta.label}</a></p>` : ''}
  </td></tr></table>
  <p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#6d6b63;text-align:center">${foot}</p>
  </body></html>`;
}
const list = (rows) => `<table role="presentation" width="100%" style="border-collapse:collapse;margin:8px 0">${rows.map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #2a2a25;color:#9b998f;font-size:14px">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #2a2a25;text-align:right;font-size:14px">${esc(v)}</td></tr>`).join('')}</table>`;

/** Jede Vorlage: (data, lang) => { subject, html } */
export const TEMPLATES = {
  welcome: (d, l) => ({
    subject: l === 'en' ? 'Welcome to the Bunker West community' : 'Willkommen in der Bunker West Community',
    html: layout({ lang: l, title: l === 'en' ? `Welcome, ${esc(d.name)}` : `Willkommen, ${esc(d.name)}`,
      intro: l === 'en' ? 'Your free community membership is active. You will hear from us about events, the weekly programme and occasional member deals.' : 'Deine kostenlose Community-Mitgliedschaft ist aktiv. Du hörst von uns zu Events, dem Wochenprogramm und gelegentlichen Deals.',
      cta: { url: d.link, label: l === 'en' ? 'Open your profile' : 'Zum Profil' } }),
  }),
  reset: (d, l) => ({
    subject: l === 'en' ? 'Reset your password' : 'Passwort zurücksetzen',
    html: layout({ lang: l, title: l === 'en' ? 'New password' : 'Neues Passwort',
      intro: l === 'en' ? 'Click the button to choose a new password. The link is valid for one hour.' : 'Klick auf den Button, um ein neues Passwort zu wählen. Der Link ist eine Stunde gültig.',
      cta: { url: d.link, label: l === 'en' ? 'Choose password' : 'Passwort wählen' } }),
  }),
  request_received: (d, l) => ({
    subject: l === 'en' ? `We received your request (${d.typeLabel})` : `Deine Anfrage ist da (${d.typeLabel})`,
    html: layout({ lang: l, title: l === 'en' ? 'Request received' : 'Anfrage erhalten',
      intro: l === 'en' ? `Thanks ${esc(d.name)} – we will get back to you as soon as possible.` : `Danke ${esc(d.name)} – wir melden uns so schnell wie möglich.`,
      body: list([[l === 'en' ? 'Topic' : 'Thema', d.typeLabel], ...(d.summary || [])]) }),
  }),
  team_request: (d) => ({
    subject: `Neue Anfrage: ${d.typeLabel} – ${d.name}`,
    html: layout({ lang: 'de', title: 'Neue Anfrage', intro: `${esc(d.name)} (${esc(d.email)}) hat eine Anfrage gesendet.`,
      body: list([['Thema', d.typeLabel], ...(d.summary || [])]) + (d.message ? `<p style="white-space:pre-wrap;color:#cfcdc4">${esc(d.message)}</p>` : ''),
      cta: { url: d.link, label: 'Im Admin öffnen' } }),
  }),
  request_answered: (d, l) => ({
    subject: l === 'en' ? 'Update on your studio request' : 'Update zu deiner Studio-Anfrage',
    html: layout({ lang: l, title: d.accepted ? (l === 'en' ? 'Your session is confirmed' : 'Deine Session steht') : (l === 'en' ? 'Unfortunately not this time' : 'Diesmal leider nicht'),
      intro: d.accepted ? (l === 'en' ? 'We confirmed your studio session. Payment on site or by invoice.' : 'Wir haben deine Studio-Session bestätigt. Bezahlung vor Ort oder per Rechnung.') : (l === 'en' ? 'The requested time is not available. Feel free to request another date.' : 'Der gewünschte Termin ist leider nicht frei. Frag gern einen anderen Tag an.'),
      body: list(d.summary || []) }),
  }),
  booking_paid: (d, l) => ({
    subject: l === 'en' ? `Booking confirmed · ${d.id}` : `Buchung bestätigt · ${d.id}`,
    html: layout({ lang: l, title: l === 'en' ? 'The session is yours' : 'Die Session gehört dir',
      intro: l === 'en' ? 'Payment received – your booking is confirmed. See you at the Bunker.' : 'Zahlung erhalten – deine Buchung ist bestätigt. Wir sehen uns im Bunker.',
      body: list([...(d.summary || []), [l === 'en' ? 'Total' : 'Gesamt', d.total]]) }),
  }),
  team_booking: (d) => ({
    subject: `Neue bezahlte Buchung ${d.id} – ${d.name}`,
    html: layout({ lang: 'de', title: 'Neue Buchung', intro: `${esc(d.name)} (${esc(d.email)}) hat direkt gebucht und bezahlt.`, body: list([...(d.summary || []), ['Gesamt', d.total]]), cta: { url: d.link, label: 'Im Admin öffnen' } }),
  }),
  application_received: (d, l) => ({
    subject: l === 'en' ? 'Your Artist Membership application' : 'Deine Bewerbung als Artist-Member',
    html: layout({ lang: l, title: l === 'en' ? 'Application received' : 'Bewerbung erhalten',
      intro: l === 'en' ? 'Thanks! We listen to every application personally and get back to you, usually within a week.' : 'Danke! Wir hören uns jede Bewerbung persönlich an und melden uns, meist innerhalb einer Woche.' }),
  }),
  team_application: (d) => ({
    subject: `Neue Artist-Bewerbung – ${d.name}`,
    html: layout({ lang: 'de', title: 'Neue Bewerbung', intro: `${esc(d.name)} (${esc(d.email)}) möchte Artist-Member werden.`, body: list(d.summary || []), cta: { url: d.link, label: 'Bewerbung ansehen' } }),
  }),
  application_invited: (d, l) => ({
    subject: l === 'en' ? 'You are in – activate your Artist Membership' : 'Du bist dabei – aktiviere deine Artist-Membership',
    html: layout({ lang: l, title: l === 'en' ? 'Welcome to the club' : 'Willkommen im Club',
      intro: l === 'en' ? `Your application was accepted. Activate your membership (${d.price} per month) to unlock direct booking, 30 % off sessions and creative coworking.` : `Deine Bewerbung wurde angenommen. Aktiviere deine Membership (${d.price} pro Monat) und schalte Direktbuchung, 30 % auf Sessions und Creative Coworking frei.`,
      cta: { url: d.link, label: l === 'en' ? 'Activate membership' : 'Membership aktivieren' } }),
  }),
  application_free: (d, l) => ({
    subject: l === 'en' ? 'Your Artist Membership is active' : 'Deine Artist-Membership ist aktiv',
    html: layout({ lang: l, title: l === 'en' ? 'Welcome to the club' : 'Willkommen im Club',
      intro: l === 'en' ? 'You received one of our free Artist Membership spots. All benefits are active right away.' : 'Du hast einen unserer freien Artist-Plätze bekommen. Alle Vorteile sind ab sofort aktiv.',
      cta: { url: d.link, label: l === 'en' ? 'Open your profile' : 'Zum Profil' } }),
  }),
  application_waitlist: (d, l) => ({
    subject: l === 'en' ? 'You are on the waiting list' : 'Du bist auf der Warteliste',
    html: layout({ lang: l, title: l === 'en' ? 'Waiting list' : 'Warteliste',
      intro: l === 'en' ? 'Your application was accepted, but all Artist spots are currently taken. As soon as a spot opens up, you are next in line – we will email you.' : 'Deine Bewerbung wurde angenommen, aber alle Artist-Plätze sind gerade vergeben. Sobald ein Platz frei wird, bist du dran – wir schreiben dir.' }),
  }),
  application_rejected: (d, l) => ({
    subject: l === 'en' ? 'About your application' : 'Zu deiner Bewerbung',
    html: layout({ lang: l, title: l === 'en' ? 'Not this time' : 'Diesmal nicht',
      intro: l === 'en' ? 'Thank you for your interest. We cannot offer you an Artist spot right now – your community membership stays active.' : 'Danke für dein Interesse. Gerade können wir dir keinen Artist-Platz anbieten – deine Community-Mitgliedschaft bleibt aktiv.' }),
  }),
  membership_active: (d, l) => ({
    subject: l === 'en' ? 'Artist Membership activated' : 'Artist-Membership aktiviert',
    html: layout({ lang: l, title: l === 'en' ? 'You are an Artist Member' : 'Du bist Artist-Member',
      intro: l === 'en' ? 'Payment received. Direct booking, member prices and coworking are unlocked.' : 'Zahlung erhalten. Direktbuchung, Member-Preise und Coworking sind freigeschaltet.',
      cta: { url: d.link, label: l === 'en' ? 'Book a session' : 'Session buchen' } }),
  }),
  membership_ended: (d, l) => ({
    subject: l === 'en' ? 'Your Artist Membership ended' : 'Deine Artist-Membership ist beendet',
    html: layout({ lang: l, title: l === 'en' ? 'Membership ended' : 'Membership beendet',
      intro: l === 'en' ? 'Your Artist Membership is no longer active. Your community membership remains.' : 'Deine Artist-Membership ist nicht mehr aktiv. Deine Community-Mitgliedschaft bleibt bestehen.' }),
  }),
  payment_failed: (d, l) => ({
    subject: l === 'en' ? 'Payment failed' : 'Zahlung fehlgeschlagen',
    html: layout({ lang: l, title: l === 'en' ? 'Payment failed' : 'Zahlung fehlgeschlagen',
      intro: l === 'en' ? 'We could not collect your membership fee. Please update your payment method.' : 'Wir konnten deinen Mitgliedsbeitrag nicht einziehen. Bitte aktualisiere deine Zahlungsmethode.',
      cta: { url: d.link, label: l === 'en' ? 'Open profile' : 'Zum Profil' } }),
  }),
  event_new: (d, l) => ({
    subject: `${l === 'en' ? 'New at the Bunker' : 'Neu im Bunker'}: ${d.title}`,
    html: layout({ lang: l, title: esc(d.title), intro: esc(d.description || ''), body: list([[l === 'en' ? 'Date' : 'Datum', d.when]]),
      cta: { url: d.link, label: l === 'en' ? 'View event' : 'Zum Event' } }),
  }),
  ticket_claimed: (d, l) => ({
    subject: l === 'en' ? `Free ticket: ${d.title}` : `Free-Ticket: ${d.title}`,
    html: layout({ lang: l, title: l === 'en' ? 'Your ticket is secured' : 'Dein Ticket ist gesichert',
      intro: l === 'en' ? 'Show this email or your profile at the entrance.' : 'Zeig diese E-Mail oder dein Profil am Einlass.', body: list([['Event', d.title], [l === 'en' ? 'Date' : 'Datum', d.when]]) }),
  }),
};

export function renderEmail(template, data, lang = 'de') {
  const fn = TEMPLATES[template];
  if (!fn) throw new Error(`Unbekannte E-Mail-Vorlage: ${template}`);
  return fn(data, lang === 'en' ? 'en' : 'de');
}
