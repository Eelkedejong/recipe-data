import { toMatchKey } from './normalise';

/**
 * The two vocabularies Phase 1 has to settle, plus a starter dictionary of
 * common Dutch ingredients used to pre-fill the curation CSV.
 *
 * Everything here is a SUGGESTION. The numbers are reasonable starting
 * estimates meant to make the review fast, not authoritative figures - check
 * the ones you care about, especially gramsPerPiece, before seeding.
 */

/** Supermarket walking order. sortOrder drives shopping-list grouping. */
export const CATEGORIES = [
  { slug: 'produce', nameNl: 'Groente & fruit', sortOrder: 10 },
  { slug: 'bakery', nameNl: 'Brood & bakkerij', sortOrder: 20 },
  { slug: 'dairy', nameNl: 'Zuivel & eieren', sortOrder: 30 },
  { slug: 'meat-fish', nameNl: 'Vlees & vis', sortOrder: 40 },
  { slug: 'pantry', nameNl: 'Voorraad', sortOrder: 50 },
  { slug: 'herbs-spices', nameNl: 'Kruiden & specerijen', sortOrder: 60 },
  { slug: 'frozen', nameNl: 'Diepvries', sortOrder: 70 },
  { slug: 'drinks', nameNl: 'Dranken', sortOrder: 80 },
  { slug: 'non-food', nameNl: 'Non-food', sortOrder: 90 },
  { slug: 'other', nameNl: 'Overig', sortOrder: 100 },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

/** Canonical units. Everything in a recipe converts into one of the first three. */
export const UNITS = {
  base: ['g', 'ml', 'piece'],
  convertible: ['kg', 'l', 'tbsp', 'tsp', 'pinch'],
  /** Never converted - no reliable basis. These stay their own shopping-list line. */
  opaque: ['bunch', 'can', 'pack', 'slice', 'sprig', 'handful'],
} as const;

/** Maps the Dutch unit strings likely already in the data onto canonical units. */
export const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gr: 'g', gram: 'g', grammen: 'g',
  kg: 'kg', kilo: 'kg', kilogram: 'kg',
  ml: 'ml', milliliter: 'ml',
  cl: 'ml', dl: 'ml',
  l: 'l', liter: 'l', liters: 'l',
  el: 'tbsp', eetlepel: 'tbsp', eetlepels: 'tbsp',
  tl: 'tsp', theelepel: 'tsp', theelepels: 'tsp',
  snuf: 'pinch', snufje: 'pinch',
  stuk: 'piece', stuks: 'piece', st: 'piece',
  teen: 'piece', teentje: 'piece', teentjes: 'piece',
  bos: 'bunch', bosje: 'bunch',
  blik: 'can', blikje: 'can',
  pak: 'pack', pakje: 'pack',
  plak: 'slice', plakje: 'slice', plakjes: 'slice',
  takje: 'sprig', takjes: 'sprig',
  handje: 'handful', handvol: 'handful',
  tenen: 'piece',
  plakken: 'slice',
  bol: 'piece', bollen: 'piece',
  blokje: 'piece', blokjes: 'piece',
  krop: 'piece',
  hand: 'handful', handjes: 'handful',
  zakje: 'pack', zakjes: 'pack',
  porties: 'piece', portie: 'piece',
  scheut: 'tbsp', scheuten: 'tbsp',
  mespunt: 'pinch',
};

export interface Suggestion {
  slug: string;
  nameNl: string;
  nameNlPlural?: string;
  category: CategorySlug;
  baseUnit?: 'g' | 'ml' | 'piece';
  gramsPerPiece?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  /**
   * Match keys that resolve to this entry. This is where Dutch plurals are
   * handled - declaratively, rather than by stemming.
   */
  aliases: string[];
}

const veg = { isVegetarian: true, isVegan: true };
const dairy = { isVegetarian: true, isVegan: false };
const meat = { isVegetarian: false, isVegan: false };

export const SUGGESTIONS: Suggestion[] = [
  // ---- produce ----
  { slug: 'ui', nameNl: 'ui', nameNlPlural: 'uien', category: 'produce', baseUnit: 'piece', gramsPerPiece: 150, ...veg, aliases: ['ui', 'uien', 'gele ui', 'gele uien'] },
  { slug: 'rode-ui', nameNl: 'rode ui', nameNlPlural: 'rode uien', category: 'produce', baseUnit: 'piece', gramsPerPiece: 150, ...veg, aliases: ['rode ui', 'rode uien'] },
  { slug: 'sjalot', nameNl: 'sjalot', nameNlPlural: 'sjalotten', category: 'produce', baseUnit: 'piece', gramsPerPiece: 40, ...veg, aliases: ['sjalot', 'sjalotten', 'sjalotje'] },
  { slug: 'knoflook', nameNl: 'knoflookteen', nameNlPlural: 'knoflooktenen', category: 'produce', baseUnit: 'piece', gramsPerPiece: 5, ...veg, aliases: ['knoflook', 'knoflookteen', 'knoflooktenen', 'knoflookteentje', 'knoflookteentjes'] },
  { slug: 'prei', nameNl: 'prei', category: 'produce', baseUnit: 'piece', gramsPerPiece: 200, ...veg, aliases: ['prei', 'preien'] },
  { slug: 'wortel', nameNl: 'wortel', nameNlPlural: 'wortels', category: 'produce', baseUnit: 'piece', gramsPerPiece: 80, ...veg, aliases: ['wortel', 'wortels', 'wortelen', 'peen'] },
  { slug: 'winterpeen', nameNl: 'winterpeen', category: 'produce', baseUnit: 'g', ...veg, aliases: ['winterpeen', 'winterpenen'] },
  { slug: 'aardappel', nameNl: 'aardappel', nameNlPlural: 'aardappels', category: 'produce', baseUnit: 'g', gramsPerPiece: 150, ...veg, aliases: ['aardappel', 'aardappels', 'aardappelen'] },
  { slug: 'zoete-aardappel', nameNl: 'zoete aardappel', nameNlPlural: 'zoete aardappels', category: 'produce', baseUnit: 'g', gramsPerPiece: 200, ...veg, aliases: ['zoete aardappel', 'zoete aardappels', 'zoete aardappelen'] },
  { slug: 'tomaat', nameNl: 'tomaat', nameNlPlural: 'tomaten', category: 'produce', baseUnit: 'piece', gramsPerPiece: 110, ...veg, aliases: ['tomaat', 'tomaten'] },
  { slug: 'cherrytomaat', nameNl: 'cherrytomaat', nameNlPlural: 'cherrytomaten', category: 'produce', baseUnit: 'g', gramsPerPiece: 15, ...veg, aliases: ['cherrytomaat', 'cherrytomaten', 'cherry tomaten'] },
  { slug: 'paprika', nameNl: 'paprika', nameNlPlural: "paprika's", category: 'produce', baseUnit: 'piece', gramsPerPiece: 160, ...veg, aliases: ['paprika', "paprika's", 'rode paprika', 'gele paprika', 'groene paprika'] },
  { slug: 'courgette', nameNl: 'courgette', nameNlPlural: 'courgettes', category: 'produce', baseUnit: 'piece', gramsPerPiece: 300, ...veg, aliases: ['courgette', 'courgettes'] },
  { slug: 'aubergine', nameNl: 'aubergine', nameNlPlural: 'aubergines', category: 'produce', baseUnit: 'piece', gramsPerPiece: 300, ...veg, aliases: ['aubergine', 'aubergines', 'eierplant'] },
  { slug: 'broccoli', nameNl: 'broccoli', category: 'produce', baseUnit: 'g', ...veg, aliases: ['broccoli'] },
  { slug: 'bloemkool', nameNl: 'bloemkool', category: 'produce', baseUnit: 'g', ...veg, aliases: ['bloemkool'] },
  { slug: 'spinazie', nameNl: 'spinazie', category: 'produce', baseUnit: 'g', ...veg, aliases: ['spinazie'] },
  { slug: 'champignon', nameNl: 'champignon', nameNlPlural: 'champignons', category: 'produce', baseUnit: 'g', gramsPerPiece: 20, ...veg, aliases: ['champignon', 'champignons'] },
  { slug: 'paddenstoelen', nameNl: 'paddenstoelen', category: 'produce', baseUnit: 'g', ...veg, aliases: ['paddenstoelen', 'paddestoelen'] },
  { slug: 'komkommer', nameNl: 'komkommer', nameNlPlural: 'komkommers', category: 'produce', baseUnit: 'piece', gramsPerPiece: 400, ...veg, aliases: ['komkommer', 'komkommers'] },
  { slug: 'sperziebonen', nameNl: 'sperziebonen', category: 'produce', baseUnit: 'g', ...veg, aliases: ['sperziebonen', 'sperzieboon', 'haricots verts'] },
  { slug: 'erwten', nameNl: 'erwten', category: 'produce', baseUnit: 'g', ...veg, aliases: ['erwten', 'doperwten'] },
  { slug: 'mais', nameNl: 'mais', category: 'produce', baseUnit: 'g', ...veg, aliases: ['mais', 'maïs'] },
  { slug: 'venkel', nameNl: 'venkel', category: 'produce', baseUnit: 'piece', gramsPerPiece: 250, ...veg, aliases: ['venkel'] },
  { slug: 'bleekselderij', nameNl: 'bleekselderij', category: 'produce', baseUnit: 'g', ...veg, aliases: ['bleekselderij', 'selderij'] },
  { slug: 'pompoen', nameNl: 'pompoen', category: 'produce', baseUnit: 'g', ...veg, aliases: ['pompoen', 'flespompoen', 'butternut'] },
  { slug: 'witlof', nameNl: 'witlof', category: 'produce', baseUnit: 'g', ...veg, aliases: ['witlof'] },
  { slug: 'rode-kool', nameNl: 'rode kool', category: 'produce', baseUnit: 'g', ...veg, aliases: ['rode kool', 'rodekool'] },
  { slug: 'spitskool', nameNl: 'spitskool', category: 'produce', baseUnit: 'g', ...veg, aliases: ['spitskool'] },
  { slug: 'boerenkool', nameNl: 'boerenkool', category: 'produce', baseUnit: 'g', ...veg, aliases: ['boerenkool'] },
  { slug: 'sla', nameNl: 'sla', category: 'produce', baseUnit: 'g', ...veg, aliases: ['sla', 'ijsbergsla', 'kropsla'] },
  { slug: 'rucola', nameNl: 'rucola', category: 'produce', baseUnit: 'g', ...veg, aliases: ['rucola'] },
  { slug: 'avocado', nameNl: 'avocado', nameNlPlural: "avocado's", category: 'produce', baseUnit: 'piece', gramsPerPiece: 170, ...veg, aliases: ['avocado', "avocado's"] },
  { slug: 'citroen', nameNl: 'citroen', nameNlPlural: 'citroenen', category: 'produce', baseUnit: 'piece', gramsPerPiece: 100, ...veg, aliases: ['citroen', 'citroenen'] },
  { slug: 'limoen', nameNl: 'limoen', nameNlPlural: 'limoenen', category: 'produce', baseUnit: 'piece', gramsPerPiece: 70, ...veg, aliases: ['limoen', 'limoenen'] },
  { slug: 'appel', nameNl: 'appel', nameNlPlural: 'appels', category: 'produce', baseUnit: 'piece', gramsPerPiece: 180, ...veg, aliases: ['appel', 'appels', 'appelen'] },
  { slug: 'banaan', nameNl: 'banaan', nameNlPlural: 'bananen', category: 'produce', baseUnit: 'piece', gramsPerPiece: 120, ...veg, aliases: ['banaan', 'bananen'] },
  { slug: 'sinaasappel', nameNl: 'sinaasappel', nameNlPlural: 'sinaasappels', category: 'produce', baseUnit: 'piece', gramsPerPiece: 200, ...veg, aliases: ['sinaasappel', 'sinaasappels'] },
  { slug: 'gember', nameNl: 'gember', category: 'produce', baseUnit: 'g', ...veg, aliases: ['gember', 'gemberwortel'] },
  { slug: 'rode-peper', nameNl: 'rode peper', nameNlPlural: 'rode pepers', category: 'produce', baseUnit: 'piece', gramsPerPiece: 15, ...veg, aliases: ['rode peper', 'rode pepers', 'chilipeper', 'chilipepers'] },
  { slug: 'lente-ui', nameNl: 'lente-ui', nameNlPlural: 'lente-uitjes', category: 'produce', baseUnit: 'piece', gramsPerPiece: 15, ...veg, aliases: ['lente ui', 'lente uitjes', 'lenteui', 'lente-ui', 'lente-uitjes', 'bosui', 'bosuitjes'] },

  // ---- bakery ----
  { slug: 'brood', nameNl: 'brood', category: 'bakery', baseUnit: 'g', isVegetarian: true, aliases: ['brood', 'witbrood', 'bruinbrood'] },
  { slug: 'ciabatta', nameNl: 'ciabatta', category: 'bakery', baseUnit: 'piece', isVegetarian: true, aliases: ['ciabatta'] },
  { slug: 'tortilla', nameNl: 'tortilla', nameNlPlural: "tortilla's", category: 'bakery', baseUnit: 'piece', isVegetarian: true, aliases: ['tortilla', "tortilla's", 'wrap', 'wraps'] },
  { slug: 'paneermeel', nameNl: 'paneermeel', category: 'bakery', baseUnit: 'g', isVegetarian: true, aliases: ['paneermeel', 'panko'] },

  // ---- dairy & eggs ----
  { slug: 'melk', nameNl: 'melk', category: 'dairy', baseUnit: 'ml', ...dairy, aliases: ['melk', 'volle melk', 'halfvolle melk'] },
  { slug: 'room', nameNl: 'slagroom', category: 'dairy', baseUnit: 'ml', ...dairy, aliases: ['room', 'slagroom', 'kookroom'] },
  { slug: 'creme-fraiche', nameNl: 'crème fraîche', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['creme fraiche', 'crème fraîche'] },
  { slug: 'yoghurt', nameNl: 'yoghurt', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['yoghurt', 'griekse yoghurt'] },
  { slug: 'boter', nameNl: 'boter', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['boter', 'roomboter', 'ongezouten boter'] },
  { slug: 'kaas', nameNl: 'kaas', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['kaas', 'geraspte kaas'] },
  { slug: 'parmezaan', nameNl: 'parmezaanse kaas', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['parmezaan', 'parmezaanse kaas', 'parmigiano'] },
  { slug: 'mozzarella', nameNl: 'mozzarella', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['mozzarella'] },
  { slug: 'feta', nameNl: 'feta', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['feta', 'fetakaas'] },
  { slug: 'ei', nameNl: 'ei', nameNlPlural: 'eieren', category: 'dairy', baseUnit: 'piece', gramsPerPiece: 55, ...dairy, aliases: ['ei', 'eieren', 'eitje'] },

  // ---- meat & fish ----
  { slug: 'kipfilet', nameNl: 'kipfilet', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['kipfilet', 'kipfilets', 'kipfilethaasjes'] },
  { slug: 'kipgehakt', nameNl: 'kipgehakt', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['kipgehakt'] },
  { slug: 'gehakt', nameNl: 'gehakt', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['gehakt', 'rundergehakt', 'half om half gehakt'] },
  { slug: 'spek', nameNl: 'spek', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['spek', 'spekjes', 'ontbijtspek'] },
  { slug: 'worst', nameNl: 'worst', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['worst', 'worstjes'] },
  { slug: 'zalm', nameNl: 'zalm', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['zalm', 'zalmfilet', 'zalmmoot'] },
  { slug: 'garnalen', nameNl: 'garnalen', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['garnalen', 'garnaal'] },
  { slug: 'tonijn', nameNl: 'tonijn', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['tonijn'] },

  // ---- pantry ----
  { slug: 'olijfolie', nameNl: 'olijfolie', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['olijfolie', 'extra vierge olijfolie'] },
  { slug: 'zonnebloemolie', nameNl: 'zonnebloemolie', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['zonnebloemolie', 'bakolie', 'olie'] },
  { slug: 'sesamolie', nameNl: 'sesamolie', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['sesamolie'] },
  { slug: 'bloem', nameNl: 'bloem', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['bloem', 'tarwebloem', 'patentbloem'] },
  { slug: 'maizena', nameNl: 'maizena', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['maizena', 'maïzena'] },
  { slug: 'suiker', nameNl: 'suiker', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['suiker', 'kristalsuiker', 'witte suiker'] },
  { slug: 'bruine-suiker', nameNl: 'bruine suiker', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['bruine suiker', 'basterdsuiker'] },
  { slug: 'honing', nameNl: 'honing', category: 'pantry', baseUnit: 'g', isVegetarian: true, isVegan: false, aliases: ['honing'] },
  { slug: 'rijst', nameNl: 'rijst', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['rijst', 'witte rijst', 'basmatirijst', 'pandanrijst'] },
  { slug: 'pasta', nameNl: 'pasta', category: 'pantry', baseUnit: 'g', isVegetarian: true, aliases: ['pasta', 'spaghetti', 'penne', 'macaroni', 'tagliatelle'] },
  { slug: 'couscous', nameNl: 'couscous', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['couscous'] },
  { slug: 'bulgur', nameNl: 'bulgur', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['bulgur'] },
  { slug: 'linzen', nameNl: 'linzen', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['linzen', 'rode linzen'] },
  { slug: 'kikkererwten', nameNl: 'kikkererwten', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['kikkererwten'] },
  { slug: 'kidneybonen', nameNl: 'kidneybonen', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['kidneybonen', 'bruine bonen', 'zwarte bonen'] },
  { slug: 'tomatenblokjes', nameNl: 'tomatenblokjes', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['tomatenblokjes', 'gepelde tomaten', 'tomaten uit blik'] },
  { slug: 'tomatenpuree', nameNl: 'tomatenpuree', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['tomatenpuree'] },
  { slug: 'passata', nameNl: 'passata', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['passata', 'tomatenpassata'] },
  { slug: 'kokosmelk', nameNl: 'kokosmelk', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['kokosmelk'] },
  { slug: 'bouillon', nameNl: 'bouillon', category: 'pantry', baseUnit: 'ml', aliases: ['bouillon', 'groentebouillon', 'kippenbouillon', 'bouillonblokje'] },
  { slug: 'sojasaus', nameNl: 'sojasaus', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['sojasaus', 'ketjap'] },
  { slug: 'azijn', nameNl: 'azijn', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['azijn', 'witte wijnazijn', 'balsamicoazijn', 'balsamico'] },
  { slug: 'mosterd', nameNl: 'mosterd', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['mosterd', 'dijonmosterd'] },
  { slug: 'mayonaise', nameNl: 'mayonaise', category: 'pantry', baseUnit: 'g', isVegetarian: true, isVegan: false, aliases: ['mayonaise', 'mayo'] },
  { slug: 'pindakaas', nameNl: 'pindakaas', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['pindakaas'] },
  { slug: 'noten', nameNl: 'noten', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['noten', 'walnoten', 'amandelen', 'cashewnoten', 'pijnboompitten'] },
  { slug: 'olijven', nameNl: 'olijven', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['olijven'] },
  { slug: 'tofu', nameNl: 'tofu', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['tofu'] },

  // ---- herbs & spices ----
  { slug: 'zout', nameNl: 'zout', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['zout', 'keukenzout', 'zeezout'] },
  { slug: 'peper', nameNl: 'peper', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['peper', 'zwarte peper', 'versgemalen peper'] },
  { slug: 'paprikapoeder', nameNl: 'paprikapoeder', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['paprikapoeder'] },
  { slug: 'komijn', nameNl: 'komijn', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['komijn', 'komijnzaad', 'djinten'] },
  { slug: 'kurkuma', nameNl: 'kurkuma', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['kurkuma', 'geelwortel'] },
  { slug: 'kerriepoeder', nameNl: 'kerriepoeder', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['kerrie', 'kerriepoeder', 'currypoeder'] },
  { slug: 'oregano', nameNl: 'oregano', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['oregano'] },
  { slug: 'tijm', nameNl: 'tijm', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['tijm'] },
  { slug: 'rozemarijn', nameNl: 'rozemarijn', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['rozemarijn'] },
  { slug: 'laurier', nameNl: 'laurierblad', nameNlPlural: 'laurierbladeren', category: 'herbs-spices', baseUnit: 'piece', ...veg, aliases: ['laurier', 'laurierblad', 'laurierbladeren'] },
  { slug: 'basilicum', nameNl: 'basilicum', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['basilicum'] },
  { slug: 'peterselie', nameNl: 'peterselie', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['peterselie'] },
  { slug: 'koriander', nameNl: 'koriander', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['koriander'] },
  { slug: 'dille', nameNl: 'dille', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['dille'] },
  { slug: 'munt', nameNl: 'munt', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['munt'] },
  { slug: 'kaneel', nameNl: 'kaneel', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['kaneel'] },
  { slug: 'nootmuskaat', nameNl: 'nootmuskaat', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['nootmuskaat'] },
  { slug: 'chilivlokken', nameNl: 'chilivlokken', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['chilivlokken', 'chilipoeder', 'sambal'] },

  // ---- drinks ----
  { slug: 'witte-wijn', nameNl: 'witte wijn', category: 'drinks', baseUnit: 'ml', ...veg, aliases: ['witte wijn'] },
  { slug: 'rode-wijn', nameNl: 'rode wijn', category: 'drinks', baseUnit: 'ml', ...veg, aliases: ['rode wijn'] },
  { slug: 'water', nameNl: 'water', category: 'other', baseUnit: 'ml', ...veg, aliases: ['water'] },

  // ---- added after the first extraction run against real recipes ----

  // produce
  { slug: 'zongedroogde-tomaat', nameNl: 'zongedroogde tomaat', nameNlPlural: 'zongedroogde tomaten', category: 'produce', baseUnit: 'g', ...veg, aliases: ['zongedroogde tomaat', 'zongedroogde tomaten'] },
  { slug: 'mango', nameNl: 'mango', nameNlPlural: "mango's", category: 'produce', baseUnit: 'piece', gramsPerPiece: 200, ...veg, aliases: ['mango', "mango's"] },
  { slug: 'blauwe-bessen', nameNl: 'blauwe bessen', category: 'produce', baseUnit: 'g', ...veg, aliases: ['blauwe bessen', 'bosbessen'] },
  { slug: 'aardbei', nameNl: 'aardbei', nameNlPlural: 'aardbeien', category: 'produce', baseUnit: 'g', ...veg, aliases: ['aardbei', 'aardbeien'] },
  { slug: 'biet', nameNl: 'biet', nameNlPlural: 'bieten', category: 'produce', baseUnit: 'g', ...veg, aliases: ['biet', 'bieten', 'rode biet'] },
  { slug: 'veldsla', nameNl: 'veldsla', category: 'produce', baseUnit: 'g', ...veg, aliases: ['veldsla'] },
  { slug: 'krieltjes', nameNl: 'krieltjes', category: 'produce', baseUnit: 'g', ...veg, aliases: ['krieltjes'] },
  { slug: 'edamame', nameNl: 'edamameboontjes', category: 'produce', baseUnit: 'g', ...veg, aliases: ['edamame', 'edamame boontjes', 'edamameboontjes'] },
  { slug: 'sugar-snaps', nameNl: 'sugar snaps', category: 'produce', baseUnit: 'g', ...veg, aliases: ['sugar snaps', 'sugarsnaps', 'peultjes'] },
  { slug: 'perzik', nameNl: 'perzik', nameNlPlural: 'perziken', category: 'produce', baseUnit: 'piece', gramsPerPiece: 150, ...veg, aliases: ['perzik', 'perziken', 'rijpe perziken'] },
  { slug: 'puntpaprika', nameNl: 'puntpaprika', category: 'produce', baseUnit: 'piece', gramsPerPiece: 90, ...veg, aliases: ['puntpaprika'] },

  // bakery
  { slug: 'bladerdeeg', nameNl: 'bladerdeeg', category: 'frozen', baseUnit: 'g', isVegetarian: true, aliases: ['bladerdeeg'] },
  { slug: 'plaattaartdeeg', nameNl: 'plaattaartdeeg', category: 'frozen', baseUnit: 'g', isVegetarian: true, aliases: ['plaattaart deeg', 'plaattaartdeeg'] },
  { slug: 'flammkuchendeeg', nameNl: 'flammkuchendeeg', category: 'frozen', baseUnit: 'g', isVegetarian: true, aliases: ['flammkuchen deeg', 'flammkuchendeeg'] },
  { slug: 'pitabroodje', nameNl: 'pitabroodje', nameNlPlural: 'pitabroodjes', category: 'bakery', baseUnit: 'piece', isVegetarian: true, aliases: ['pita broodjes', 'pitabroodje', 'pitabroodjes'] },
  { slug: 'naanbrood', nameNl: 'naanbrood', category: 'bakery', baseUnit: 'piece', isVegetarian: true, aliases: ['naanbrood', 'naan'] },
  { slug: 'turks-brood', nameNl: 'Turks brood', category: 'bakery', baseUnit: 'piece', isVegetarian: true, aliases: ['turks brood'] },
  { slug: 'focaccia', nameNl: 'focaccia', category: 'bakery', baseUnit: 'piece', isVegetarian: true, aliases: ['focaccia'] },
  { slug: 'pizzabodem', nameNl: 'pizzabodem', category: 'bakery', baseUnit: 'piece', isVegetarian: true, aliases: ['pizzabodem'] },
  { slug: 'lasagnebladen', nameNl: 'lasagnebladen', category: 'pantry', baseUnit: 'g', isVegetarian: true, aliases: ['lasagnebladen', 'lasagnevellen'] },
  { slug: 'lange-vingers', nameNl: 'lange vingers', category: 'bakery', baseUnit: 'g', isVegetarian: true, aliases: ['lange vingers', 'lange vinger koekjes'] },
  { slug: 'bastogne-koekjes', nameNl: 'bastognekoekjes', category: 'bakery', baseUnit: 'g', isVegetarian: true, aliases: ['bastogne koekjes', 'bastognekoekjes'] },
  { slug: 'meringue', nameNl: 'meringue', nameNlPlural: 'meringues', category: 'bakery', baseUnit: 'g', isVegetarian: true, aliases: ['meringue', 'meringues'] },

  // dairy
  { slug: 'kwark', nameNl: 'kwark', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['kwark', 'magere kwark'] },
  { slug: 'mascarpone', nameNl: 'mascarpone', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['mascarpone'] },
  { slug: 'ricotta', nameNl: 'ricotta', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['ricotta'] },
  { slug: 'roomkaas', nameNl: 'roomkaas', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['roomkaas', 'kruidenroomkaas', 'kruidenkaas', 'kruidencreme kruidenkaas'] },
  { slug: 'geitenkaas', nameNl: 'geitenkaas', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['geitenkaas'] },
  { slug: 'gorgonzola', nameNl: 'gorgonzola', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['gorgonzola'] },
  { slug: 'pecorino', nameNl: 'pecorino', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['pecorino', 'pecorino kaas'] },
  { slug: 'halloumi', nameNl: 'halloumi', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['halloumi'] },
  { slug: 'cottage-cheese', nameNl: 'cottage cheese', category: 'dairy', baseUnit: 'g', ...dairy, aliases: ['cottage cheese', 'hüttenkäse'] },
  { slug: 'eidooier', nameNl: 'eidooier', nameNlPlural: 'eidooiers', category: 'dairy', baseUnit: 'piece', gramsPerPiece: 18, ...dairy, aliases: ['eidooier', 'eidooiers'] },

  // meat & fish
  { slug: 'chorizo', nameNl: 'chorizo', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['chorizo'] },
  { slug: 'salami', nameNl: 'salami', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['salami'] },
  { slug: 'shoarma', nameNl: 'shoarmavlees', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['shoarma', 'shoarmavlees'] },
  { slug: 'kipdijfilet', nameNl: 'kipdijfilet', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['kipdijfilet'] },
  { slug: 'kipreepjes', nameNl: 'kipreepjes', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['kipreepjes', 'kipstukjes', 'gerookte kipreepjes', 'kip'] },
  { slug: 'runderreepjes', nameNl: 'runderreepjes', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['runderreepjes'] },
  { slug: 'hamblokjes', nameNl: 'hamblokjes', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['hamblokjes', 'ham'] },
  { slug: 'surimi', nameNl: 'surimi', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['surimi'] },
  { slug: 'witvis', nameNl: 'witvis', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['witvis', 'kabeljauw', 'pangasiusfilet'] },
  { slug: 'carpaccio', nameNl: 'carpaccio', category: 'meat-fish', baseUnit: 'g', ...meat, aliases: ['carpaccio'] },

  // pantry
  { slug: 'meel', nameNl: 'meel', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['meel', 'patent bloem', 'patentbloem'] },
  { slug: 'zelfrijzend-bakmeel', nameNl: 'zelfrijzend bakmeel', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['zelfrijzend bakmeel'] },
  { slug: 'bakpoeder', nameNl: 'bakpoeder', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['bakpoeder', 'baking soda', 'baksoda'] },
  { slug: 'poedersuiker', nameNl: 'poedersuiker', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['poedersuiker'] },
  { slug: 'vanillesuiker', nameNl: 'vanillesuiker', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['vanillesuiker', 'zakje vanillesuiker'] },
  { slug: 'vanille-extract', nameNl: 'vanille-extract', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['vanille extract', 'vanille-extract', 'vanilleextract', 'vanillestokje'] },
  { slug: 'amandelextract', nameNl: 'amandelextract', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['amandelextract'] },
  { slug: 'amandelschaafsel', nameNl: 'amandelschaafsel', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['amandelschaafsel'] },
  { slug: 'cacaopoeder', nameNl: 'cacaopoeder', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['cacaopoeder'] },
  { slug: 'chocolade', nameNl: 'chocolade', category: 'pantry', baseUnit: 'g', isVegetarian: true, aliases: ['chocola', 'chocolade'] },
  { slug: 'havermout', nameNl: 'havermout', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['havermout', 'havermout vlokken', 'haver vlokken', 'havervlokken'] },
  { slug: 'orzo', nameNl: 'orzo', category: 'pantry', baseUnit: 'g', isVegetarian: true, aliases: ['orzo'] },
  { slug: 'ravioli', nameNl: 'ravioli', category: 'frozen', baseUnit: 'g', isVegetarian: true, aliases: ['ravioli'] },
  { slug: 'woknoodles', nameNl: 'woknoodles', category: 'pantry', baseUnit: 'g', isVegetarian: true, aliases: ['woknoodles', 'rijstnoodles', 'noodles'] },
  { slug: 'rijstvellen', nameNl: 'rijstvellen', category: 'pantry', baseUnit: 'piece', ...veg, aliases: ['rijstvellen', 'rotivellen'] },
  { slug: 'sushirijst', nameNl: 'sushirijst', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['sushi rijst', 'sushirijst'] },
  { slug: 'gezeefde-tomaten', nameNl: 'gezeefde tomaten', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['gezeefde tomaten', 'tomatenpulp'] },
  { slug: 'tomatensaus', nameNl: 'tomatensaus', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['tomatensaus'] },
  { slug: 'knoflooksaus', nameNl: 'knoflooksaus', category: 'pantry', baseUnit: 'ml', isVegetarian: true, aliases: ['knoflooksaus'] },
  { slug: 'oestersaus', nameNl: 'oestersaus', category: 'pantry', baseUnit: 'ml', isVegetarian: false, aliases: ['oestersaus'] },
  { slug: 'rijstazijn', nameNl: 'rijstazijn', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['rijstazijn'] },
  { slug: 'sinaasappelsap', nameNl: 'sinaasappelsap', category: 'drinks', baseUnit: 'ml', ...veg, aliases: ['sinaasappelsap'] },
  { slug: 'maple-syrup', nameNl: 'ahornsiroop', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['maple syrup', 'ahornsiroop'] },
  { slug: 'rozenwater', nameNl: 'rozenwater', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['rozenwater'] },
  { slug: 'truffelmayonaise', nameNl: 'truffelmayonaise', category: 'pantry', baseUnit: 'g', isVegetarian: true, isVegan: false, aliases: ['truffelmayonaise'] },
  { slug: 'balsamicocreme', nameNl: 'balsamicocrème', category: 'pantry', baseUnit: 'ml', ...veg, aliases: ['balsamico creme', 'balsamicocreme'] },
  { slug: 'sesamzaad', nameNl: 'sesamzaad', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['sesamzaad'] },
  { slug: 'pistachenoten', nameNl: 'pistachenoten', category: 'pantry', baseUnit: 'g', ...veg, aliases: ['pistachenoten'] },
  { slug: 'zeewiersalade', nameNl: 'zeewiersalade', category: 'other', baseUnit: 'g', ...veg, aliases: ['zeewiersalade'] },
  { slug: 'vlaaivulling', nameNl: 'vlaaivulling', category: 'pantry', baseUnit: 'g', isVegetarian: true, aliases: ['vlaaivulling', 'vlaaivulling kersen'] },

  // herbs & spices
  { slug: 'bieslook', nameNl: 'bieslook', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['bieslook'] },
  { slug: 'ras-el-hanout', nameNl: 'ras el hanout', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['ras el hanout'] },
  { slug: 'italiaanse-kruiden', nameNl: 'Italiaanse kruiden', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['italiaanse kruiden'] },
  { slug: 'taco-kruiden', nameNl: 'tacokruiden', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['taco kruiden', 'tacokruiden'] },
  { slug: 'masala-kruiden', nameNl: 'masalakruiden', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['masala kruiden', 'masalakruiden', 'garam masala'] },
  { slug: 'furikake', nameNl: 'furikake', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['furikake', 'furikake kruidenmix'] },
  { slug: 'uienpoeder', nameNl: 'uienpoeder', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['uienpoeder'] },
  { slug: 'rode-currypasta', nameNl: 'rode currypasta', category: 'herbs-spices', baseUnit: 'g', ...veg, aliases: ['rode curry pasta', 'rode currypasta'] },
];

/** matchKey -> suggestion, built once. */
export const SUGGESTION_INDEX: Map<string, Suggestion> = (() => {
  const index = new Map<string, Suggestion>();
  for (const suggestion of SUGGESTIONS) {
    for (const alias of suggestion.aliases) {
      const key = toMatchKey(alias);
      if (key) index.set(key, suggestion);
    }
  }
  return index;
})();
