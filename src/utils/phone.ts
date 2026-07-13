// Canonicalizes a Swedish phone number so that "070...", "+4670...",
// "0046 70...", and dashed/spaced variants all resolve to the same key.
// Used anywhere a phone number is a lookup key (bookings, PINs, subscriptions).
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0046')) return '46' + digits.slice(4);
  if (digits.startsWith('46')) return digits;
  if (digits.startsWith('0')) return '46' + digits.slice(1);
  return digits;
}
