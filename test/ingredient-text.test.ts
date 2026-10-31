/**
 * The ingredient text normaliser.
 *
 * Converted from scripts/normalise-selftest.ts so `npm test` runs it. Every
 * case is kept, including the `why` notes - these are the cases where a naive
 * implementation silently does the wrong thing.
 *
 * What this feeds: the normaliser produces the matchKey used to link recipe
 * text to catalog ingredients, which in turn drives ingredient filtering and
 * diet flags. A wrong match here can mislabel food (see the kipstukjes case
 * at the bottom), so the tests err on the side of refusing to guess.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseIngredient,
  toMatchKey,
  stripDiacritics,
} from '../src/modules/ingredient-text';

/** Prep order follows discovery rather than importance, so compare as a set. */
const assertPrep = (got: string[], expected: string[], message?: string) =>
  assert.deepEqual([...got].sort(), [...expected].sort(), message);

describe('normaliseIngredient - qualifiers move out of the name', () => {
  test('the core case: qualifier out of the name, into prep', () => {
    const got = normaliseIngredient('gesnipperde ui');
    assert.equal(got.name, 'ui');
    assertPrep(got.prep, ['gesnipperde']);
  });

  test('a comma tail is preparation, and "rode ui" stays its own concept', () => {
    const got = normaliseIngredient('rode ui, gesnipperd');
    assert.equal(got.name, 'rode ui');
    assertPrep(got.prep, ['gesnipperd']);
  });

  test('the longest phrase wins, so nothing is left dangling', () => {
    // A shorter match would leave this as "aubergine gesneden".
    const got = normaliseIngredient('aubergine in blokjes gesneden');
    assert.equal(got.name, 'aubergine');
    assertPrep(got.prep, ['in blokjes gesneden']);
  });

  test('a size qualifier and a compound tail are both removed', () => {
    assert.equal(normaliseIngredient('grote winterpeen, geschild en in stukken').name, 'winterpeen');
  });

  test('dried vs fresh is a prep note, not a separate catalog entry', () => {
    const got = normaliseIngredient('gedroogde oregano');
    assert.equal(got.name, 'oregano');
    assertPrep(got.prep, ['gedroogde']);
  });

  test('parentheticals are notes', () => {
    const got = normaliseIngredient('verse basilicum (een handvol)');
    assert.equal(got.name, 'basilicum');
    assertPrep(got.prep, ['een handvol', 'verse']);
  });
});

describe('normaliseIngredient - what must survive untouched', () => {
  test('THE TRAP: "gehakt" is minced meat, not a qualifier', () => {
    // The word is also the past participle of "to mince". Stripping it would
    // turn an ingredient into nothing at all.
    const got = normaliseIngredient('gehakt');
    assert.equal(got.name, 'gehakt');
    assertPrep(got.prep, []);
  });

  test('the same word as a qualifier, where something is left over', () => {
    const got = normaliseIngredient('gehakte tomaten');
    assert.equal(got.name, 'tomaten');
    assertPrep(got.prep, ['gehakte']);
  });

  test('a plain ingredient passes through untouched', () => {
    const got = normaliseIngredient('kipfilet');
    assert.equal(got.name, 'kipfilet');
    assertPrep(got.prep, []);
  });

  test('diacritics are kept in the name', () => {
    assert.equal(normaliseIngredient('crème fraîche').name, 'crème fraîche');
  });

  test('case is irrelevant to identity', () => {
    assert.equal(normaliseIngredient('VERSE Gember').name, 'gember');
  });
});

describe('normaliseIngredient - bad input is flagged, not fixed', () => {
  test('an amount typed into the name field is reported', () => {
    // Surfaced rather than silently moved, so a bad row can be spotted.
    const got = normaliseIngredient('2 el olijfolie');
    assert.equal(got.name, 'olijfolie');
    assert.equal(got.embeddedAmount, '2 el');
  });
});

describe('toMatchKey - identity for catalog lookup', () => {
  test('folds diacritics, so the key matches however it was typed', () => {
    assert.equal(toMatchKey('crème fraîche'), toMatchKey('creme fraiche'));
  });

  test('is case insensitive', () => {
    assert.equal(toMatchKey('Gember'), toMatchKey('gember'));
  });

  test('stripDiacritics leaves plain ascii alone', () => {
    assert.equal(stripDiacritics('kipfilet'), 'kipfilet');
  });

  test('stripDiacritics folds the accents it is given', () => {
    assert.equal(stripDiacritics('crème fraîche'), 'creme fraiche');
  });

  test('a parenthetical is a note, so it does not change identity', () => {
    // This is correct: "(biologische) tomaten" and "tomaten" are the same
    // ingredient, and parentheticals are notes rather than part of the name.
    //
    // It is worth knowing where it bites, though. Production once held
    // "(Vegetarische of gerookte) kipstukjes", where the parenthetical carried
    // the only thing distinguishing a vegetarian product from chicken. The
    // normaliser reduced it to "kipstukjes", an alias mapped that to
    // "kipreepjes", and a vegetarian quiche would have been linked to meat and
    // flipped to non-vegetarian.
    //
    // The fix was to the recipe text, not to this rule - a name that only
    // makes sense with its parenthetical is a data problem. The assertion
    // records the rule so the trade-off stays visible.
    const withParenthetical = normaliseIngredient('(Vegetarische of gerookte) kipstukjes');
    const withoutIt = normaliseIngredient('kipstukjes');

    assert.equal(toMatchKey(withParenthetical.name), toMatchKey(withoutIt.name));
  });
});
