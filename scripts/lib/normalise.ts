/**
 * Normalises free-text ingredient strings so they can be grouped.
 *
 * This is deliberately conservative. It never stems Dutch plurals: "uien" and
 * "ui" are left as separate groups, because algorithmic Dutch stemming merges
 * unrelated words silently (and a wrong merge surfaces as a wrong shopping
 * list, which is exactly the failure we cannot detect later). Plurals are
 * resolved in the curation pass instead, where a human sees both forms.
 *
 * Everything removed from a name is kept and reported, so no stripping is
 * invisible in the output CSV.
 */

/** Preparation and qualifier words that belong in `prep`, not in the name. */
const QUALIFIERS = [
  // cutting / processing
  'gesnipperde', 'gesnipperd',
  'fijngehakte', 'fijngehakt',
  'grofgehakte', 'grofgehakt',
  'gehakte', 'gehakt',
  'gesneden', 'gewassen',
  'geraspte', 'geraspt',
  'geperste', 'geperst',
  'gepelde', 'gepeld',
  'geschilde', 'geschild',
  'gepureerde', 'gepureerd',
  'geplette', 'geplet',
  'uitgelekte', 'uitgelekt',
  'gemalen',
  'geweekte', 'geweekt',
  // cooking state
  'gekookte', 'gekookt',
  'gebakken',
  'geroosterde', 'geroosterd',
  'gesmolten',
  'gegrilde', 'gegrild',
  'rauwe', 'rauw',
  // freshness / form
  'verse', 'vers',
  'gedroogde', 'gedroogd',
  'diepvries', 'bevroren',
  // size
  'grote', 'groot', 'kleine', 'klein', 'middelgrote', 'halve', 'hele',
  // noise
  'optioneel', 'eventueel', 'ongeveer', 'circa',
] as const;

/** Phrases removed before single-word qualifiers. Order matters: longest first. */
const QUALIFIER_PHRASES = [
  'in kleine blokjes gesneden',
  'in blokjes gesneden',
  'in dunne reepjes',
  'in grove stukken',
  'in stukken gesneden',
  'naar smaak',
  'in blokjes',
  'in reepjes',
  'in ringen',
  'in partjes',
  'in stukken',
  'in plakjes',
  'zonder zaadjes',
  'zonder schil',
  'met schil',
  'vers geperst',
  'fijn gesneden',
  'grof gesneden',
] as const;

/** Unit tokens that may appear glued into the name field by mistake. */
const EMBEDDED_UNITS = [
  'gram', 'gr', 'g', 'kilo', 'kg', 'ml', 'cl', 'dl', 'liter', 'l',
  'el', 'eetlepel', 'eetlepels', 'tl', 'theelepel', 'theelepels',
  'snufje', 'snuf', 'teentje', 'teentjes', 'bosje', 'bos',
  'blikje', 'blik', 'pak', 'pakje', 'stuk', 'stuks', 'plakje', 'plakjes',
  'takje', 'takjes', 'handje', 'handvol',
] as const;

export interface NormalisedIngredient {
  /** The original string, exactly as stored. */
  raw: string;
  /** Cleaned name: lowercase, qualifiers and noise removed. */
  name: string;
  /** Diacritics-stripped, punctuation-free key used for grouping. */
  matchKey: string;
  /** Everything pulled out of the name, in the order it was found. */
  prep: string[];
  /** An amount found inside the name field, e.g. "2 el" in "2 el olijfolie". */
  embeddedAmount: string | null;
}

/** Strips diacritics so "creme" and "crème" group together. */
export const stripDiacritics = (input: string): string =>
  input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const collapse = (input: string): string => input.replace(/\s+/g, ' ').trim();

/** Builds the grouping key: diacritics folded, punctuation flattened. */
export const toMatchKey = (input: string): string =>
  collapse(stripDiacritics(input.toLowerCase()).replace(/[^a-z0-9]+/g, ' '));

/** Trims punctuation and dangling conjunctions from both ends. */
const trimEdges = (input: string): string =>
  collapse(input)
    .replace(/^[\s,;:.\-–—/+&]+/, '')
    .replace(/[\s,;:.\-–—/+&]+$/, '')
    .replace(/^(en|of|met|zonder)\s+/, '')
    .replace(/\s+(en|of|met)$/, '');

/**
 * Removes a token or phrase from `name`, but only if something is left over.
 *
 * This guard is what keeps "gehakt" (minced meat, a real ingredient) from
 * being erased by the "gehakt" qualifier, while still reducing
 * "gehakte tomaten" to "tomaten".
 */
const removeIfNotEverything = (
  name: string,
  pattern: RegExp,
): { name: string; removed: string[] } => {
  const removed: string[] = [];
  const candidate = name.replace(pattern, (match) => {
    removed.push(collapse(match));
    return ' ';
  });

  if (removed.length === 0) return { name, removed };
  if (trimEdges(candidate).length === 0) return { name, removed: [] };

  return { name: collapse(candidate), removed };
};

const escapeRegExp = (input: string): string =>
  input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const normaliseIngredient = (raw: string): NormalisedIngredient => {
  const prep: string[] = [];
  let embeddedAmount: string | null = null;

  let working = collapse(String(raw ?? '')).toLowerCase();

  // 1. Parentheticals are always notes, never part of the name.
  working = working.replace(/\(([^)]*)\)/g, (_match, inner: string) => {
    const note = collapse(inner);
    if (note) prep.push(note);
    return ' ';
  });

  // 2. Anything after the first comma is preparation, not identity.
  //    "rode ui, gesnipperd" -> name "rode ui", prep "gesnipperd"
  const commaIndex = working.indexOf(',');
  if (commaIndex !== -1) {
    const tail = trimEdges(working.slice(commaIndex + 1));
    if (tail) prep.push(tail);
    working = working.slice(0, commaIndex);
  }

  // 3. An amount typed into the name field, e.g. "2 el olijfolie".
  const unitAlternation = EMBEDDED_UNITS.map(escapeRegExp).join('|');
  const amountPattern = new RegExp(
    `^(\\d+(?:[.,]\\d+)?(?:\\s*[-/]\\s*\\d+(?:[.,]\\d+)?)?)\\s*(${unitAlternation})?\\b`,
  );
  const amountMatch = working.match(amountPattern);
  if (amountMatch) {
    const captured = collapse(amountMatch[0]);
    // Only treat it as a stray amount if a real name follows it.
    if (trimEdges(working.slice(amountMatch[0].length)).length > 0) {
      embeddedAmount = captured;
      working = working.slice(amountMatch[0].length);
    }
  }

  // 4. Multi-word qualifier phrases, longest first.
  for (const phrase of QUALIFIER_PHRASES) {
    const result = removeIfNotEverything(
      working,
      new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'g'),
    );
    working = result.name;
    prep.push(...result.removed);
  }

  // 5. Single-word qualifiers.
  for (const word of QUALIFIERS) {
    const result = removeIfNotEverything(
      working,
      new RegExp(`\\b${escapeRegExp(word)}\\b`, 'g'),
    );
    working = result.name;
    prep.push(...result.removed);
  }

  const name = trimEdges(working);
  const matchKey = toMatchKey(name);

  return {
    raw: String(raw ?? ''),
    name,
    matchKey,
    prep: prep.filter(Boolean),
    embeddedAmount,
  };
};
