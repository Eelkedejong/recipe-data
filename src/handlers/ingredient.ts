import crypto from 'node:crypto';
import prisma from '../db';
import { Request, Response, NextFunction } from 'express';

/**
 * The ingredient catalog is global, admin-curated and read by everyone.
 *
 * It is served whole in one response rather than searched server-side: the
 * whole thing is a few hundred rows, the client keeps it and filters in
 * memory, and autocomplete therefore costs no database queries at all. On
 * Neon's free plan that is the difference between the busiest endpoint on
 * the site waking the compute on every keystroke and never waking it.
 *
 * Two layers of caching support that:
 *   - an in-process memo, so repeated requests to a warm instance skip
 *     Postgres entirely
 *   - an ETag, so a client that already has the catalog gets a 304
 */

/** How long a warm instance may serve the catalog without re-reading it. */
const MEMO_TTL_MS = 60_000;

/** How long a browser may use its copy before revalidating. */
const BROWSER_MAX_AGE_S = 300;

interface CatalogPayload {
  categories: unknown[];
  ingredients: unknown[];
}

let memo: { at: number; body: string; etag: string } | null = null;

const buildCatalog = async (): Promise<CatalogPayload> => {
  const [categories, ingredients] = await Promise.all([
    prisma.ingredientCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, slug: true, nameNl: true, sortOrder: true },
    }),
    prisma.ingredient.findMany({
      orderBy: { nameNl: 'asc' },
      select: {
        id: true,
        slug: true,
        nameNl: true,
        nameNlPlural: true,
        categoryId: true,
        baseUnit: true,
        isVegetarian: true,
        isVegan: true,
        seasonMonths: true,
        aliases: { select: { name: true } },
      },
    }),
  ]);

  return {
    categories,
    // Aliases are flattened to bare strings: the client only ever matches on
    // them, and the objects would roughly double the payload.
    ingredients: ingredients.map((ingredient) => ({
      ...ingredient,
      aliases: ingredient.aliases.map((alias) => alias.name),
    })),
  };
};

/** Clears the memo so an admin edit is visible without waiting out the TTL. */
export const invalidateCatalogCache = () => {
  memo = null;
};

/**
 * GET /ingredient - the whole catalog. Public, unauthenticated.
 */
export const getCatalog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!memo || Date.now() - memo.at > MEMO_TTL_MS) {
      const payload = await buildCatalog();
      const body = JSON.stringify({ data: payload });
      memo = {
        at: Date.now(),
        body,
        etag: `"${crypto.createHash('sha1').update(body).digest('base64url')}"`,
      };
    }

    res.setHeader('Cache-Control', `public, max-age=${BROWSER_MAX_AGE_S}`);
    res.setHeader('ETag', memo.etag);

    // A client that already holds this exact catalog gets nothing back.
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch.split(',').some((tag) => tag.trim() === memo!.etag)) {
      res.status(304).end();
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(memo.body);
  } catch (e) {
    (e as { type?: string }).type = 'next';
    next(e);
  }
};

/**
 * GET /ingredient/:slug - one ingredient plus the public recipes using it.
 *
 * The recipe lookup reads the JSON ingredients column, which is adequate at
 * this scale. Phase 5 replaces it with an indexed join.
 */
export const getIngredient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredient = await prisma.ingredient.findUnique({
      where: { slug: req.params.slug },
      include: {
        aliases: { select: { name: true } },
        category: { select: { slug: true, nameNl: true, sortOrder: true } },
      },
    });

    if (!ingredient) {
      res.status(404);
      res.json({ message: 'Ingredient not found.' });
      return;
    }

    res.json({
      data: { ...ingredient, aliases: ingredient.aliases.map((alias) => alias.name) },
    });
  } catch (e) {
    (e as { type?: string }).type = 'next';
    next(e);
  }
};

/** GET /ingredient-category - the aisles, in walking order. */
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.ingredientCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        nameNl: true,
        sortOrder: true,
        _count: { select: { ingredients: true } },
      },
    });
    res.json({ data: categories });
  } catch (e) {
    (e as { type?: string }).type = 'next';
    next(e);
  }
};

/** Pulls only the writable fields off a request body. */
const ingredientInput = (body: Record<string, unknown>) => ({
  nameNl: body.nameNl as string,
  nameNlPlural: (body.nameNlPlural as string) ?? null,
  nameEn: (body.nameEn as string) ?? null,
  categoryId: (body.categoryId as string) ?? null,
  baseUnit: (body.baseUnit as string) ?? null,
  isVegetarian: body.isVegetarian === undefined ? null : (body.isVegetarian as boolean),
  isVegan: body.isVegan === undefined ? null : (body.isVegan as boolean),
  seasonMonths: Array.isArray(body.seasonMonths)
    ? (body.seasonMonths as number[]).filter((m) => m >= 1 && m <= 12)
    : [],
});

/** POST /ingredient - admin only. */
export const createIngredient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredient = await prisma.ingredient.create({
      data: { slug: req.body.slug, ...ingredientInput(req.body) },
    });
    invalidateCatalogCache();
    res.json({ data: ingredient });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') {
      res.status(409);
      res.json({ message: 'An ingredient with that slug already exists.' });
      return;
    }
    (e as { type?: string }).type = 'next';
    next(e);
  }
};

/** PUT /ingredient/:slug - admin only. */
export const updateIngredient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredient = await prisma.ingredient.update({
      where: { slug: req.params.slug },
      data: ingredientInput(req.body),
    });
    invalidateCatalogCache();
    res.json({ data: ingredient });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2025') {
      res.status(404);
      res.json({ message: 'Ingredient not found.' });
      return;
    }
    (e as { type?: string }).type = 'next';
    next(e);
  }
};

/**
 * DELETE /ingredient/:slug - admin only.
 *
 * Recipes referencing this ingredient keep working: the id stored on a recipe
 * row is not a foreign key, and each row carries its own display name, so a
 * deleted ingredient degrades to plain text rather than breaking the recipe.
 */
export const deleteIngredient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredient = await prisma.ingredient.delete({ where: { slug: req.params.slug } });
    invalidateCatalogCache();
    res.json({ data: ingredient });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2025') {
      res.status(404);
      res.json({ message: 'Ingredient not found.' });
      return;
    }
    (e as { type?: string }).type = 'next';
    next(e);
  }
};

/** PUT /ingredient/:slug/aliases - admin only. Replaces the whole set. */
export const setAliases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredient = await prisma.ingredient.findUnique({
      where: { slug: req.params.slug },
      select: { id: true },
    });

    if (!ingredient) {
      res.status(404);
      res.json({ message: 'Ingredient not found.' });
      return;
    }

    const names: string[] = Array.isArray(req.body.aliases)
      ? [...new Set((req.body.aliases as string[]).map((n) => n.trim().toLowerCase()).filter(Boolean))]
      : [];

    await prisma.$transaction([
      prisma.ingredientAlias.deleteMany({ where: { ingredientId: ingredient.id } }),
      prisma.ingredientAlias.createMany({
        data: names.map((name) => ({ name, ingredientId: ingredient.id })),
        skipDuplicates: true,
      }),
    ]);

    invalidateCatalogCache();
    res.json({ data: { slug: req.params.slug, aliases: names } });
  } catch (e) {
    (e as { type?: string }).type = 'next';
    next(e);
  }
};

/** POST /ingredient-category - admin only. */
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.ingredientCategory.create({
      data: {
        slug: req.body.slug,
        nameNl: req.body.nameNl,
        sortOrder: Number(req.body.sortOrder) || 0,
      },
    });
    invalidateCatalogCache();
    res.json({ data: category });
  } catch (e) {
    (e as { type?: string }).type = 'next';
    next(e);
  }
};

/** PUT /ingredient-category/:slug - admin only. */
export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.ingredientCategory.update({
      where: { slug: req.params.slug },
      data: {
        nameNl: req.body.nameNl,
        sortOrder: Number(req.body.sortOrder) || 0,
      },
    });
    invalidateCatalogCache();
    res.json({ data: category });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2025') {
      res.status(404);
      res.json({ message: 'Category not found.' });
      return;
    }
    (e as { type?: string }).type = 'next';
    next(e);
  }
};
