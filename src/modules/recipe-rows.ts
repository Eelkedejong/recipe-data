/**
 * Identity of the rows inside Recipe.ingredients.
 *
 * Extracted from handlers/recipe.ts so it can be tested directly. This is
 * small but load-bearing: shopping lists remember excluded rows by id
 * (listState.excludedRows), so an id has to keep meaning the same row for as
 * long as that row exists. See test/recipe-rows.test.ts for the bug this
 * prevents.
 */

/** The highest positive integer id present, or 0 when there is none. */
const highestId = (rows: unknown[]): number =>
  rows.reduce<number>((highest, row) => {
    const id = (row as { id?: unknown })?.id
    return typeof id === 'number' && Number.isInteger(id) && id > highest ? id : highest
  }, 0)

/**
 * Makes sure every ingredient row has an id that is unique within the recipe.
 *
 * Ids that arrive are kept exactly as sent; only missing, invalid or colliding
 * ones are filled in. Rows are never renumbered, which would move a shopping
 * list's exclusion onto a different ingredient.
 *
 * Returns the input unchanged when it is not an array, so a malformed body
 * fails validation rather than here.
 */
export const withRowIds = (ingredients: unknown): unknown => {
  if (!Array.isArray(ingredients)) return ingredients

  const taken = new Set<number>()
  let next = highestId(ingredients) + 1

  return ingredients.map((row) => {
    const stored = (row as { id?: unknown })?.id

    if (typeof stored === 'number' && Number.isInteger(stored) && stored > 0 && !taken.has(stored)) {
      taken.add(stored)
      return row
    }

    const id = next++
    taken.add(id)
    return { ...(row as object), id }
  })
}
