export function nowMs(): number {
  return Date.now();
}

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export function minutesFromNow(n: number): Date {
  return new Date(Date.now() + n * 60 * 1000);
}
