export function foldText(text: unknown): string {
  const value =
    typeof text === 'string' || typeof text === 'number' || typeof text === 'boolean' ? text : '';
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeItemName(
  name: unknown,
  translations: Record<string, string> = {},
): string {
  if (
    !name ||
    (typeof name !== 'string' && typeof name !== 'number' && typeof name !== 'boolean')
  ) {
    return '';
  }
  const clean = String(name).toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (translations[clean]) return translations[clean];

  const folded = foldText(clean);
  if (translations[folded]) return translations[folded];

  return folded
    .replace(/['`]/g, "'")
    .replace(/[^a-z0-9'+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
