/**
 * Curated spelling corrections for ingredient text in existing recipes.
 *
 * Keyed by a folded form (lowercase, trimmed, diacritics removed) so every
 * case and accent variant of a misspelling is caught by one entry. The value
 * is the exact replacement text, including its intended capitalisation.
 *
 * Scope is deliberately narrow: genuine misspellings and Dutch compounds that
 * should be one word. Singular/plural variation is NOT corrected - "ei" and
 * "eieren" are both right, and a recipe calling for one egg should say so.
 * That variation is resolved by catalog aliases instead.
 */
export const CORRECTIONS: Record<string, string> = {
  // --- misspellings ---
  'cachewnoten': 'Cashewnoten',
  'carpaccia': 'Carpaccio',
  'chroizo': 'Chorizo',
  'gerapste kaas': 'Geraspte kaas',
  'geroookte kip reepjes': 'Gerookte kipreepjes',
  'groentebouilon': 'Groentebouillon',
  'ijsbersla': 'IJsbergsla',
  'kanneel': 'Kaneel',
  'komommer': 'Komkommer',
  'marscapone': 'Mascarpone',
  'mozarella': 'Mozzarella',
  'mozerella': 'Mozzarella',
  'oregana': 'Oregano',
  'organo': 'Oregano',
  'verse bascilicum': 'Verse basilicum',
  'zongedroodge tomaat': 'Zongedroogde tomaat',
  'foccacia': 'Focaccia',
  'chiabatta brood': 'Ciabattabrood',
  'parmazaanse kaas in vlokken': 'Parmezaanse kaas in vlokken',
  'pitaboordjes': 'Pita broodjes',
  'rijpe perzikken': 'Rijpe perziken',
  'tagliatelle of andere groffe pasta': 'Tagliatelle of andere grove pasta',
  'witvis (kabeljouw of pangasius filet)': 'Witvis (kabeljauw of pangasiusfilet)',
  'kouseband / sperciebonen': 'Kouseband / sperziebonen',
  'haricot verts (sperziebonen)': 'Haricots verts (sperziebonen)',
  'magerekwark': 'Magere kwark',

  // --- crème fraîche, five ways ---
  'creme fraiche': 'Crème fraîche',
  'creme fraise': 'Crème fraîche',
  'creme fraishe': 'Crème fraîche',

  // --- Dutch compounds that should be one word ---
  'griekseyoghurt': 'Griekse yoghurt',
  'plaattaartdeeg': 'Plaattaart deeg',
  'zelfrijzendbakmeel': 'Zelfrijzend bakmeel',
  'zoeteaardappel': 'Zoete aardappel',
  'zongedroogdetomaten': 'Zongedroogde tomaten',
  'tomaten puree': 'Tomatenpuree',
  'kidney bonen': 'Kidneybonen',
  'vanille suiker': 'Vanillesuiker',
  'zakje vanille suiker': 'Zakje vanillesuiker',
  'vanille suiker/vanille extract': 'Vanillesuiker/vanille-extract',
  'uien poeder': 'Uienpoeder',
  'amandel schaafsel': 'Amandelschaafsel',
  'amandel extract': 'Amandelextract',
  'vanille extract': 'Vanille-extract',
  'ras al hanout': 'Ras el hanout',
  'ras el hanout kruiden': 'Ras el hanout',

  // --- the Caesar dressing cell, which had two spellings wrong ---
  'ceaser salade/yoghurt dressing of (mayonaise, yoghurt, olijfolie, worcesershiresaus, mosterd, citroensap, peper en zout)':
    'Caesar- of yoghurtdressing (of mayonaise, yoghurt, olijfolie, worcestershiresaus, mosterd, citroensap, peper en zout)',
};

/**
 * Rows that need a human decision rather than a text fix, reported by the
 * script instead of being rewritten.
 */
export const NEEDS_REVIEW: Record<string, string> = {
  'macaroni groente 450 gram': 'amount (450 gram) is inside the ingredient name',
  'knoflook, peper zout': 'three ingredients in one row',
  'peper en zout': 'two ingredients in one row',
  'romige nederlands-poolse sperziebonensalade': 'a dish name used as an ingredient',
  'citroensap & olijfolie  of sladedressing naar smaak': 'two ingredients plus an amount phrase',
  'kop sterke koffie': 'the unit (kop) is inside the ingredient name',
};
