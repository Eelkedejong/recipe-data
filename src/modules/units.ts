/**
 * Unit conversion for shopping-list merging.
 *
 * The whole design rests on one rule: **when a conversion cannot be done
 * honestly, this returns null**. A wrong conversion does not announce itself -
 * it shows up as a wrong quantity on a shopping list, days later, in a shop.
 * Two separate lines are always better than one invented number.
 *
 * Units are not stored in the database. A recipe row carries whatever text
 * was typed; this module decides what, if anything, that text means. Adding a
 * new spelling is therefore a code change, not a migration.
 */

/** What amounts are summed in. Everything convertible lands on one of these. */
export type BaseUnit = 'g' | 'ml' | 'piece';

/**
 * Ratios to a base unit. Volume spoon sizes are the Dutch convention:
 * an eetlepel is 15 ml and a theelepel 5 ml.
 */
const TO_BASE: Record<string, { base: BaseUnit; factor: number }> = {
  g: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  cl: { base: 'ml', factor: 10 },
  dl: { base: 'ml', factor: 100 },
  l: { base: 'ml', factor: 1000 },
  tbsp: { base: 'ml', factor: 15 },
  tsp: { base: 'ml', factor: 5 },
  piece: { base: 'piece', factor: 1 },
};

/**
 * Dutch unit spellings seen in recipes, mapped onto the canonical set.
 *
 * Anything absent here is opaque: it is kept verbatim and never merged with
 * something else. "bos", "blik", "krop" and friends have no reliable size, so
 * guessing one would be exactly the silent error this module exists to avoid.
 */
const SPELLINGS: Record<string, string> = {
  g: 'g', gr: 'g', gram: 'g', grammen: 'g',
  kg: 'kg', kilo: 'kg', kilogram: 'kg',
  ml: 'ml', milliliter: 'ml',
  cl: 'cl', dl: 'dl',
  l: 'l', liter: 'l', liters: 'l',
  el: 'tbsp', eetlepel: 'tbsp', eetlepels: 'tbsp', eetlepeltje: 'tbsp',
  tl: 'tsp', theelepel: 'tsp', theelepels: 'tsp', theelepeltje: 'tsp',
  stuk: 'piece', stuks: 'piece', st: 'piece',
  teen: 'piece', tenen: 'piece', teentje: 'piece', teentjes: 'piece',
};

/** Dutch labels for the canonical units, used when printing a line. */
const LABELS: Record<string, string> = {
  g: 'g', kg: 'kg',
  ml: 'ml', cl: 'cl', dl: 'dl', l: 'l',
  tbsp: 'el', tsp: 'tl',
  piece: '',
};

export interface Quantity {
  amount: number;
  /** Canonical unit, or the original text when it could not be resolved. */
  unit: string;
  /** False when the unit is opaque and the amount must stay on its own line. */
  convertible: boolean;
}

/** Lowercases and strips punctuation so "Gram." and "gram" agree. */
const normaliseUnit = (unit: string): string =>
  (unit ?? '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .trim();

/** Resolves a written unit to its canonical name, or null when it is opaque. */
export const canonicalUnit = (unit: string): string | null =>
  SPELLINGS[normaliseUnit(unit)] ?? null;

/**
 * Converts an amount to the base unit it can be summed in.
 *
 * Returns null when the unit is opaque, the amount is not a usable number, or
 * the ingredient offers no way across (a count of onions cannot become grams
 * without a weight per onion, which is deliberately not recorded by hand).
 */
export const toBase = (
  amount: unknown,
  unit: string,
): { amount: number; unit: BaseUnit } | null => {
  const value =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string' && amount.trim() !== ''
        ? Number(amount.replace(',', '.'))
        : NaN;

  if (!Number.isFinite(value)) return null;

  // An empty unit means a count: "2 uien".
  const canonical = unit?.trim() ? canonicalUnit(unit) : 'piece';
  if (!canonical) return null;

  const conversion = TO_BASE[canonical];
  if (!conversion) return null;

  return { amount: value * conversion.factor, unit: conversion.base };
};

/**
 * Formats an amount for display.
 *
 * Takes a canonical unit, so a line that only ever used spoons prints as
 * "2 el" rather than "30 ml" - more useful in a shop, and still exact.
 * Grams and millilitres step up to kilos and litres once they get large.
 */
export const formatQuantity = (amount: number, unit: string): string => {
  const round = (value: number) => parseFloat(value.toFixed(2)).toString();

  if (unit === 'g' && amount >= 1000) return `${round(amount / 1000)} kg`;
  if (unit === 'ml' && amount >= 1000) return `${round(amount / 1000)} l`;

  const label = LABELS[unit] ?? unit;
  return label ? `${round(amount)} ${label}` : round(amount);
};

export interface MergeInput {
  amount: unknown;
  unit: string;
}

export interface MergeResult {
  /**
   * Summed amounts. One entry per base unit reached, labelled with the
   * written unit when only one was used for that base.
   */
  merged: { amount: number; unit: string }[];
  /** Amounts that could not be converted, kept exactly as they were given. */
  separate: { amount: unknown; unit: string }[];
}

/**
 * Sums what can be summed and leaves the rest alone.
 *
 * Amounts reaching different base units stay apart: "400 g tomaten" and
 * "1 blik tomaten" are both true, and a list showing them on two lines is
 * correct. One showing an invented total is not.
 */
export const mergeQuantities = (inputs: MergeInput[]): MergeResult => {
  // Summed per written unit first, so a line that only used one of them can
  // be printed in that unit instead of being pushed down to the base.
  const byUnit = new Map<string, number>();
  const separate: { amount: unknown; unit: string }[] = [];

  for (const input of inputs) {
    const value =
      typeof input.amount === 'number'
        ? input.amount
        : typeof input.amount === 'string' && input.amount.trim() !== ''
          ? Number(input.amount.replace(',', '.'))
          : NaN;

    const canonical = input.unit?.trim() ? canonicalUnit(input.unit) : 'piece';

    if (!Number.isFinite(value) || !canonical || !TO_BASE[canonical]) {
      separate.push({ amount: input.amount, unit: input.unit });
      continue;
    }

    byUnit.set(canonical, (byUnit.get(canonical) ?? 0) + value);
  }

  // Units sharing a base are only combined when there is more than one of
  // them; otherwise the written unit is kept.
  const byBase = new Map<BaseUnit, { unit: string; amount: number }[]>();
  for (const [unit, amount] of byUnit) {
    const base = TO_BASE[unit].base;
    byBase.set(base, [...(byBase.get(base) ?? []), { unit, amount }]);
  }

  const merged: { amount: number; unit: string }[] = [];
  for (const [base, entries] of byBase) {
    if (entries.length === 1) {
      merged.push({ amount: entries[0].amount, unit: entries[0].unit });
      continue;
    }
    merged.push({
      amount: entries.reduce(
        (sum, entry) => sum + entry.amount * TO_BASE[entry.unit].factor,
        0,
      ),
      unit: base,
    });
  }

  return { merged, separate };
};
