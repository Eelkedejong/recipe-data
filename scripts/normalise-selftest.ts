/**
 * Runs the normaliser against its tricky cases. No database needed.
 *
 *   npx tsx scripts/normalise-selftest.ts
 *
 * These are the cases where a naive implementation silently does the wrong
 * thing, so they are worth reading before trusting the extraction output.
 */
import { normaliseIngredient } from './lib/normalise';

interface Case {
  input: string;
  name: string;
  prep?: string[];
  embeddedAmount?: string | null;
  why: string;
}

const cases: Case[] = [
  {
    input: 'gesnipperde ui',
    name: 'ui',
    prep: ['gesnipperde'],
    why: 'the core case: qualifier out of the name, into prep',
  },
  {
    input: 'rode ui, gesnipperd',
    name: 'rode ui',
    prep: ['gesnipperd'],
    why: 'comma tail is preparation; "rode ui" stays its own concept',
  },
  {
    input: 'gehakt',
    name: 'gehakt',
    prep: [],
    why: 'THE TRAP: minced meat is an ingredient, not a qualifier. Must survive.',
  },
  {
    input: 'gehakte tomaten',
    name: 'tomaten',
    prep: ['gehakte'],
    why: 'same word as a qualifier, where something is left over',
  },
  {
    input: 'verse basilicum (een handvol)',
    name: 'basilicum',
    prep: ['een handvol', 'verse'],
    why: 'parentheticals are notes; order follows discovery, not importance',
  },
  {
    input: '2 el olijfolie',
    name: 'olijfolie',
    embeddedAmount: '2 el',
    why: 'amount typed into the name field — flagged so you can spot bad rows',
  },
  {
    input: 'crème fraîche',
    name: 'crème fraîche',
    why: 'diacritics kept in the name; only matchKey is folded',
  },
  {
    input: 'aubergine in blokjes gesneden',
    name: 'aubergine',
    prep: ['in blokjes gesneden'],
    why: 'longest phrase wins, so this is not left as "aubergine gesneden"',
  },
  {
    input: 'grote winterpeen, geschild en in stukken',
    name: 'winterpeen',
    why: 'size qualifier and a compound tail both removed',
  },
  {
    input: 'VERSE Gember',
    name: 'gember',
    why: 'case is irrelevant to identity',
  },
  {
    input: 'kipfilet',
    name: 'kipfilet',
    prep: [],
    why: 'a plain ingredient passes through untouched',
  },
  {
    input: 'gedroogde oregano',
    name: 'oregano',
    prep: ['gedroogde'],
    why: 'dried vs fresh is a prep note here, not a separate catalog entry',
  },
];

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

let failed = 0;

for (const c of cases) {
  const got = normaliseIngredient(c.input);
  const problems: string[] = [];

  if (got.name !== c.name) {
    problems.push(`name: expected "${c.name}", got "${got.name}"`);
  }
  if (c.prep !== undefined && !eq([...got.prep].sort(), [...c.prep].sort())) {
    problems.push(`prep: expected ${JSON.stringify(c.prep)}, got ${JSON.stringify(got.prep)}`);
  }
  if (c.embeddedAmount !== undefined && got.embeddedAmount !== c.embeddedAmount) {
    problems.push(`amount: expected ${JSON.stringify(c.embeddedAmount)}, got ${JSON.stringify(got.embeddedAmount)}`);
  }

  if (problems.length) {
    failed += 1;
    console.log(`FAIL  "${c.input}"`);
    problems.forEach((p) => console.log(`        ${p}`));
    console.log(`        (${c.why})`);
  } else {
    console.log(`ok    "${c.input}" -> "${got.name}"${got.prep.length ? `  prep: ${got.prep.join(' | ')}` : ''}`);
  }
}

console.log(`\n${cases.length - failed}/${cases.length} passed`);
if (failed > 0) process.exit(1);
