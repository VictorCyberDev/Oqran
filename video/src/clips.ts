/** Measured from the captured files, not guessed — a Sequence longer than
 * its clip renders black at the tail. */
export const CLIP: Record<string, { file: string; sec: number }> = {
  authFirst:   { file: "clips/01-auth-first-signin.webm",      sec: 26.48 },
  authReturn:  { file: "clips/02-auth-returning-device.webm",  sec: 24.32 },
  citizenHome: { file: "clips/03-citizen-dashboard.webm",      sec: 28.48 },
  street:      { file: "clips/04-citizen-street-check.webm",   sec: 29.56 },
  incident:    { file: "clips/05-citizen-incident.webm",       sec: 25.40 },
  govInvest:   { file: "clips/06-gov-investigate-nin.webm",    sec: 31.52 },
  bankDesk:    { file: "clips/07-bank-desk.webm",              sec: 41.32 },
  bankEsc:     { file: "clips/08-bank-escalate.webm",          sec: 28.56 },
  govRecv:     { file: "clips/09-gov-receives-escalation.webm",sec: 32.76 },
  business:    { file: "clips/10-business-zone.webm",          sec: 36.00 },
  owner:       { file: "clips/11-owner-dashboard.webm",        sec: 24.88 },
  offline:     { file: "clips/12-offline-queue-sync.webm",     sec: 35.76 },
};

/** The app renders as a centred column at capture width; spotlights land
 * inside this band for every role except Government, whose map is full
 * bleed. */
export const COL = { x: 645, w: 630 } as const;
export const col = (y: number, h: number, pad = 0) => ({
  x: COL.x - pad,
  y,
  w: COL.w + pad * 2,
  h,
});
