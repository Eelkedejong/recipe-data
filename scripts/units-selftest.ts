/**
 * Exercises the unit model, with the emphasis on what it refuses to do.
 *
 *   npx tsx scripts/units-selftest.ts
 *
 * No database needed. Follows the same pattern as normalise-selftest.ts.
 */
import { toBase, canonicalUnit, mergeQuantities, formatQuantity } from '../src/modules/units';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  -> ${detail}` : ''}`);
};

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// --- conversions that must work ---
check('gram passes through', eq(toBase(500, 'gram'), { amount: 500, unit: 'g' }));
check('kilo scales to grams', eq(toBase(1.5, 'kg'), { amount: 1500, unit: 'g' }));
check('liter scales to ml', eq(toBase(0.5, 'l'), { amount: 500, unit: 'ml' }));
check('eetlepel is 15 ml', eq(toBase(2, 'el'), { amount: 30, unit: 'ml' }));
check('theelepel is 5 ml', eq(toBase(3, 'tl'), { amount: 15, unit: 'ml' }));
check('a knoflookteen counts as a piece', eq(toBase(2, 'teentje'), { amount: 2, unit: 'piece' }));
check('an empty unit means a count', eq(toBase(2, ''), { amount: 2, unit: 'piece' }));
check('comma decimals are read', eq(toBase('1,5', 'kg'), { amount: 1500, unit: 'g' }));
check('spelling is case and punctuation insensitive', eq(toBase(1, 'Gram.'), { amount: 1, unit: 'g' }));

// --- the refusals, which matter more ---
check('"blik" is opaque', toBase(1, 'blik') === null);
check('"bos" is opaque', toBase(1, 'bos') === null);
check('"krop" is opaque', toBase(1, 'krop') === null);
check('"naar smaak" is opaque', toBase(1, 'naar smaak') === null);
check('a missing amount converts to nothing', toBase(null, 'gram') === null);
check('a non-numeric amount converts to nothing', toBase('veel', 'gram') === null);
check('pieces never become grams', toBase(2, 'stuks')?.unit === 'piece');
check('unknown spellings resolve to null', canonicalUnit('mespunt') === null);

// --- merging ---
const onions = mergeQuantities([
  { amount: 1, unit: '' },
  { amount: 2, unit: 'stuks' },
]);
check('counts add up', eq(onions.merged, [{ amount: 3, unit: 'piece' }]), JSON.stringify(onions.merged));
check('nothing was set aside', onions.separate.length === 0);

const flour = mergeQuantities([
  { amount: 500, unit: 'gram' },
  { amount: 1, unit: 'kg' },
  { amount: 2, unit: 'el' },
]);
const flourGrams = flour.merged.find((m) => m.unit === 'g');
const flourSpoons = flour.merged.find((m) => m.unit === 'tbsp');
check('grams and kilos add up', flourGrams?.amount === 1500, JSON.stringify(flourGrams));
check('spoons stay spoons rather than being guessed into grams', flourSpoons?.amount === 2, JSON.stringify(flourSpoons));

const tomatoes = mergeQuantities([
  { amount: 400, unit: 'gram' },
  { amount: 1, unit: 'blik' },
]);
check('an opaque unit is kept apart', eq(tomatoes.merged, [{ amount: 400, unit: 'g' }]));
check('and kept verbatim', eq(tomatoes.separate, [{ amount: 1, unit: 'blik' }]), JSON.stringify(tomatoes.separate));

// A written unit is kept when it is the only one for its base, but several
// units feeding one base are combined into it.
const spoons = mergeQuantities([
  { amount: 2, unit: 'el' },
  { amount: 1, unit: 'el' },
]);
check('one unit for a base keeps that unit', eq(spoons.merged, [{ amount: 3, unit: 'tbsp' }]), JSON.stringify(spoons.merged));
check('and prints in Dutch', formatQuantity(3, 'tbsp') === '3 el', formatQuantity(3, 'tbsp'));

const mixed = mergeQuantities([
  { amount: 2, unit: 'el' },
  { amount: 100, unit: 'ml' },
]);
check('several units for one base fall back to it', eq(mixed.merged, [{ amount: 130, unit: 'ml' }]), JSON.stringify(mixed.merged));

// --- display ---
check('grams become kilos when large', formatQuantity(1500, 'g') === '1.5 kg', formatQuantity(1500, 'g'));
check('ml becomes litres when large', formatQuantity(2000, 'ml') === '2 l', formatQuantity(2000, 'ml'));
check('small amounts stay as they are', formatQuantity(250, 'g') === '250 g', formatQuantity(250, 'g'));
check('counts carry no unit', formatQuantity(3, 'piece') === '3', formatQuantity(3, 'piece'));
check('decimals are trimmed', formatQuantity(1.666666, 'g') === '1.67 g', formatQuantity(1.666666, 'g'));

console.log(`\n${failed === 0 ? 'ALL PASSED' : `${failed} FAILED`}`);
process.exit(failed ? 1 : 0);
