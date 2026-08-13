export function getCheckInCode(eventId: number | string): string {
  return `poap-${eventId}`;
}

export function buildCheckInUrl(origin: string, eventId: number | string): string {
  const url = new URL(`/checkin/${eventId}`, origin);
  url.searchParams.set("code", getCheckInCode(eventId));
  return url.toString();
}
