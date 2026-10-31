import defaultPrisma from '../db';

/** See modules/recipe-ingredients.ts for why the client is a parameter. */
type Db = typeof defaultPrisma;

/**
 * Who may put a recipe on the public side of the site.
 *
 * PRODUCT.md: the public collection is written by admins. It is a publication
 * rather than a user-generated-content platform, so there is no submission or
 * approval flow - other people simply cannot publish.
 *
 * `isPublic` stays on user recipes so the door is not closed on changing
 * that one day; this is the gate that keeps it shut in the meantime.
 */
export const canPublish = (role: string | null | undefined): boolean => role === 'ADMIN';

export type PublishDecision =
  | { allowed: true; isPublic: boolean | undefined }
  | { allowed: false };

/**
 * Works out what `isPublic` should become for a write by this user.
 *
 * Returns a decision rather than throwing, because the app has no error
 * middleware - an uncaught throw would surface as a 500 instead of a 403.
 *
 * - not mentioned in the request -> `undefined`, so Prisma leaves it alone
 * - asked to be private         -> `false`, which anyone may do
 * - asked to be public          -> admins only; everyone else is refused
 *
 * The role is read from the database rather than the token, matching
 * `requireAdmin`, so a demoted admin loses the ability immediately rather
 * than when their token expires.
 */
export const resolveIsPublic = async (
  userId: string,
  requested: unknown,
  prisma: Db = defaultPrisma,
): Promise<PublishDecision> => {
  if (requested === undefined || requested === null) {
    return { allowed: true, isPublic: undefined };
  }

  // Bodies arrive as JSON but also as urlencoded form data, where booleans
  // come through as strings.
  const wantsPublic = requested === true || requested === 'true';

  if (!wantsPublic) {
    return { allowed: true, isPublic: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return canPublish(user?.role) ? { allowed: true, isPublic: true } : { allowed: false };
};

/** The message sent with the 403, kept in one place. */
export const PUBLISH_REFUSED = 'Only admins can publish recipes to the public site.';
