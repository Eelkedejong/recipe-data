/**
 * The unit model, with the emphasis on what it refuses to do.
 *
 * Converted from scripts/units-selftest.ts so `npm test` runs it. Every case
 * from that file is kept.
 *
 * The refusals matter more than the conversions: guessing that "1 blik
 * tomaten" is 400 g would silently put a wrong quantity on a shopping list,
 * which is worse than leaving the line alone.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toBase, canonicalUnit, mergeQuantities, formatQuantity } from '../src/modules/units';

describe('toBase - conversions that must work', () => {
  test('gram passes through', () => {
    assert.deepEqual(toBase(500, 'gram'), { amount: 500, unit: 'g' });
  });

  test('kilo scales to grams', () => {
    assert.deepEqual(toBase(1.5, 'kg'), { amount: 1500, unit: 'g' });
  });

  test('liter scales to ml', () => {
    assert.deepEqual(toBase(0.5, 'l'), { amount: 500, unit: 'ml' });
  });

  test('eetlepel is 15 ml', () => {
    assert.deepEqual(toBase(2, 'el'), { amount: 30, unit: 'ml' });
  });

  test('theelepel is 5 ml', () => {
    assert.deepEqual(toBase(3, 'tl'), { amount: 15, unit: 'ml' });
  });

  test('a knoflookteen counts as a piece', () => {
    assert.deepEqual(toBase(2, 'teentje'), { amount: 2, unit: 'piece' });
  });

  test('an empty unit means a count', () => {
    assert.deepEqual(toBase(2, ''), { amount: 2, unit: 'piece' });
  });

  test('comma decimals are read', () => {
    // Dutch recipes are typed with commas.
    assert.deepEqual(toBase('1,5', 'kg'), { amount: 1500, unit: 'g' });
  });

  test('spelling is case and punctuation insensitive', () => {
    assert.deepEqual(toBase(1, 'Gram.'), { amount: 1, unit: 'g' });
  });
});

describe('toBase - the refusals, which matter more', () => {
  test('"blik" is opaque', () => {
    assert.equal(toBase(1, 'blik'), null);
  });

  test('"bos" is opaque', () => {
    assert.equal(toBase(1, 'bos'), null);
  });

  test('"krop" is opaque', () => {
    assert.equal(toBase(1, 'krop'), null);
  });

  test('"naar smaak" is opaque', () => {
    assert.equal(toBase(1, 'naar smaak'), null);
  });

  test('a missing amount converts to nothing', () => {
    assert.equal(toBase(null, 'gram'), null);
  });

  test('a non-numeric amount converts to nothing', () => {
    assert.equal(toBase('veel', 'gram'), null);
  });

  test('pieces never become grams', () => {
    // There is no general answer to "how much does one onion weigh", so the
    // model refuses to invent one.
    assert.equal(toBase(2, 'stuks')?.unit, 'piece');
  });

  test('unknown spellings resolve to null', () => {
    assert.equal(canonicalUnit('mespunt'), null);
  });
});

describe('mergeQuantities', () => {
  test('counts add up', () => {
    const onions = mergeQuantities([
      { amount: 1, unit: '' },
      { amount: 2, unit: 'stuks' },
    ]);

    assert.deepEqual(onions.merged, [{ amount: 3, unit: 'piece' }]);
    assert.equal(onions.separate.length, 0, 'nothing was set aside');
  });

  test('grams and kilos add up, and spoons are not guessed into grams', () => {
    const flour = mergeQuantities([
      { amount: 500, unit: 'gram' },
      { amount: 1, unit: 'kg' },
      { amount: 2, unit: 'el' },
    ]);

    assert.equal(flour.merged.find((m) => m.unit === 'g')?.amount, 1500);
    assert.equal(
      flour.merged.find((m) => m.unit === 'tbsp')?.amount,
      2,
      'a spoon of flour has no reliable weight, so it stays a spoon'
    );
  });

  test('an opaque unit is kept apart, and kept verbatim', () => {
    const tomatoes = mergeQuantities([
      { amount: 400, unit: 'gram' },
      { amount: 1, unit: 'blik' },
    ]);

    assert.deepEqual(tomatoes.merged, [{ amount: 400, unit: 'g' }]);
    assert.deepEqual(tomatoes.separate, [{ amount: 1, unit: 'blik' }]);
  });

  test('one unit for a base keeps that unit', () => {
    const spoons = mergeQuantities([
      { amount: 2, unit: 'el' },
      { amount: 1, unit: 'el' },
    ]);

    assert.deepEqual(spoons.merged, [{ amount: 3, unit: 'tbsp' }]);
  });

  test('several units for one base fall back to the base', () => {
    const mixed = mergeQuantities([
      { amount: 2, unit: 'el' },
      { amount: 100, unit: 'ml' },
    ]);

    assert.deepEqual(mixed.merged, [{ amount: 130, unit: 'ml' }]);
  });
});

describe('formatQuantity', () => {
  test('prints spoons in Dutch', () => {
    assert.equal(formatQuantity(3, 'tbsp'), '3 el');
  });

  test('grams become kilos when large', () => {
    assert.equal(formatQuantity(1500, 'g'), '1.5 kg');
  });

  test('ml becomes litres when large', () => {
    assert.equal(formatQuantity(2000, 'ml'), '2 l');
  });

  test('small amounts stay as they are', () => {
    assert.equal(formatQuantity(250, 'g'), '250 g');
  });

  test('counts carry no unit', () => {
    assert.equal(formatQuantity(3, 'piece'), '3');
  });

  test('decimals are trimmed', () => {
    assert.equal(formatQuantity(1.666666, 'g'), '1.67 g');
  });
});
