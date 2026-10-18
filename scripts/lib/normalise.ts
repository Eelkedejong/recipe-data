/**
 * The ingredient normaliser now lives in src/modules/ingredient-text.ts,
 * because the API needs it too: creating an ingredient derives its alias rows
 * from the same match keys the scripts use, and the two must never diverge.
 *
 * This re-export keeps the existing script imports working.
 */
export * from '../../src/modules/ingredient-text';
