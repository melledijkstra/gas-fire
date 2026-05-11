export function normalizeIban(iban: string) {
  return iban.replace(/\s+/g, '').toUpperCase()
}
