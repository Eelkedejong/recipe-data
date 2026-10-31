/**
 * Who may publish a recipe to the public side.
 *
 * Skips unless TEST_DATABASE_URL is set - see test/db-harness.ts.
 *
 * PRODUCT.md: the public collection is admin-authored. It is a publication,
 * not a user-generated-content platform, so there is no submission flow -
 * other people simply cannot publish.
 *
 * Before this gate existed, `createRecipe` and `updateRecipe` took `isPublic`
 * straight from the request body and the route was behind `protect` but not
 * `requireAdmin`, so any signed-in user could put a recipe on the public site
 * with a direct API call.
 */
import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { canPublish, resolveIsPublic } from '../src/modules/publishing';
import {
  canRunDbTests,
  skipReason,
  testDb,
  resetDb,
  disconnect,
  makeUser,
} from './db-harness';

describe('canPublish', () => {
  test('admins may', () => {
    assert.equal(canPublish('ADMIN'), true);
  });

  test('ordinary users may not', () => {
    assert.equal(canPublish('USER'), false);
  });

  test('an unknown or missing role may not', () => {
    // A deleted user, or a role the schema gains later: the safe answer is no.
    assert.equal(canPublish(undefined), false);
    assert.equal(canPublish(null), false);
    assert.equal(canPublish('EDITOR'), false);
  });
});

describe('resolveIsPublic', { skip: !canRunDbTests && skipReason }, () => {
  let db: ReturnType<typeof testDb>;
  let adminId: string;
  let userId: string;

  before(() => {
    db = testDb();
  });

  after(async () => {
    await resetDb();
    await disconnect();
  });

  beforeEach(async () => {
    await resetDb();
    adminId = (await makeUser('ADMIN')).id;
    userId = (await makeUser('USER')).id;
  });

  describe('when the request does not mention isPublic', () => {
    test('leaves it alone, so an edit cannot unpublish by omission', async () => {
      // undefined reaches Prisma as "no change". An admin editing the text of
      // a published recipe must not take it off the public site.
      const decision = await resolveIsPublic(adminId, undefined, db);

      assert.deepEqual(decision, { allowed: true, isPublic: undefined });
    });

    test('treats null the same as absent', async () => {
      const decision = await resolveIsPublic(userId, null, db);

      assert.deepEqual(decision, { allowed: true, isPublic: undefined });
    });
  });

  describe('when asking to be private', () => {
    test('anyone may keep their own recipe private', async () => {
      const decision = await resolveIsPublic(userId, false, db);

      assert.deepEqual(decision, { allowed: true, isPublic: false });
    });

    test('an admin may unpublish', async () => {
      const decision = await resolveIsPublic(adminId, false, db);

      assert.deepEqual(decision, { allowed: true, isPublic: false });
    });
  });

  describe('when asking to be public', () => {
    test('an admin may publish', async () => {
      const decision = await resolveIsPublic(adminId, true, db);

      assert.deepEqual(decision, { allowed: true, isPublic: true });
    });

    test('THE RULE: an ordinary user may not', async () => {
      const decision = await resolveIsPublic(userId, true, db);

      assert.deepEqual(decision, { allowed: false });
    });

    test('a string "true" is treated as asking to publish', async () => {
      // Bodies arrive as JSON but also as urlencoded form data, where
      // booleans come through as strings. A string must not slip past the
      // gate by failing a `=== true` check.
      assert.deepEqual(await resolveIsPublic(userId, 'true', db), { allowed: false });
      assert.deepEqual(await resolveIsPublic(adminId, 'true', db), {
        allowed: true,
        isPublic: true,
      });
    });

    test('a user whose account no longer exists may not', async () => {
      const ghost = (await makeUser('ADMIN')).id;
      await db.user.delete({ where: { id: ghost } });

      const decision = await resolveIsPublic(ghost, true, db);

      assert.deepEqual(decision, { allowed: false });
    });

    test('the role is read now, not taken on trust', async () => {
      // requireAdmin reads the role from the database rather than the token so
      // a demoted admin loses access immediately. This must behave the same,
      // or demotion would not take effect until the token expired.
      const demoted = (await makeUser('ADMIN')).id;
      assert.deepEqual(await resolveIsPublic(demoted, true, db), {
        allowed: true,
        isPublic: true,
      });

      await db.user.update({ where: { id: demoted }, data: { role: 'USER' } });

      assert.deepEqual(
        await resolveIsPublic(demoted, true, db),
        { allowed: false },
        'demotion must take effect at once',
      );
    });
  });
});
