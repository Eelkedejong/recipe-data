/**
 * Finds ingredient names that are probably the same thing written differently.
 *
 * Real recipe data is full of these: "creme fraiche" / "creme fraise" /
 * "creme fraishe", "zelfrijzend bakmeel" / "zelfrijzendbakmeel",
 * "tomaten puree" / "tomatenpuree". Each one inflates the distinct count and
 * costs a separate decision during curation.
 *
 * These are CANDIDATES, never automatic merges. A false positive costs a
 * glance; a silent wrong merge costs a wrong shopping list. Confirm each one.
 */

/** Levenshtein distance, capped for early exit. */
export const editDistance = (a: string, b: string, cap = 3): number => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
      current.push(value);
      if (value < rowMin) rowMin = value;
    }

    if (rowMin > cap) return cap + 1;
    previous = current;
  }

  return previous[b.length];
};

const despace = (input: string): string => input.replace(/\s+/g, '');

/** Dutch plural/diminutive endings, longest first. */
const SUFFIXES = ['tjes', 'jes', 'eren', 'en', 'tje', 'je', 's', 'n'];

const isPluralPair = (a: string, b: string): boolean => {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (!long.startsWith(short)) return false;
  const suffix = long.slice(short.length);
  return suffix.length > 0 && SUFFIXES.includes(suffix);
};

export type Reason = 'spacing' | 'plural' | 'spelling';

export interface Candidate {
  a: string;
  b: string;
  reason: Reason;
}

/**
 * Returns candidate pairs among the given match keys.
 *
 * Thresholds are deliberately tighter on short words, where a distance of 2
 * is more likely to be two different ingredients than one misspelt one
 * ("peper" and "peren" are three letters apart and unrelated).
 */
export const findCandidates = (keys: string[]): Candidate[] => {
  const candidates: Candidate[] = [];

  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      const a = keys[i];
      const b = keys[j];
      const da = despace(a);
      const db = despace(b);

      // Identical once spaces are removed: near-certain.
      if (da === db) {
        candidates.push({ a, b, reason: 'spacing' });
        continue;
      }

      if (isPluralPair(da, db)) {
        candidates.push({ a, b, reason: 'plural' });
        continue;
      }

      const shortest = Math.min(da.length, db.length);
      if (shortest < 5) continue;

      const allowed = shortest >= 8 ? 2 : 1;
      if (editDistance(da, db, allowed) <= allowed) {
        candidates.push({ a, b, reason: 'spelling' });
      }
    }
  }

  return candidates;
};

/** Groups candidate pairs into clusters via union-find. */
export const buildClusters = (
  keys: string[],
  candidates: Candidate[],
): string[][] => {
  const parent = new Map<string, string>(keys.map((k) => [k, k]));

  const find = (key: string): string => {
    let root = key;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let walk = key;
    while (parent.get(walk) !== walk) {
      const next = parent.get(walk)!;
      parent.set(walk, root);
      walk = next;
    }
    return root;
  };

  for (const { a, b } of candidates) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  }

  const clusters = new Map<string, string[]>();
  for (const key of keys) {
    const root = find(key);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(key);
  }

  return [...clusters.values()].filter((group) => group.length > 1);
};
