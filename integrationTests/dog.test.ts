/**
 * Verifies CRUD on the Dog REST API and the DogWithHumanAge custom resource.
 * DogWithHumanAge adds a calculated humanAge field: age 1→15, age 2→24, age 3→29.
 * Explicit IDs are used for all records so GET lookups are reliable.
 */
import { suite, test, before, after } from 'node:test';
import { strictEqual, ok } from 'node:assert/strict';
import { setupHarperWithFixture, teardownHarper, type ContextWithHarper } from '@harperfast/integration-testing';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(__dirname, '..');

function basicAuth(username: string, password: string): string {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

suite('Dog API and DogWithHumanAge', (ctx: ContextWithHarper) => {
  before(async () => {
    await setupHarperWithFixture(ctx, fixtureDir);
  });

  after(async () => {
    await teardownHarper(ctx);
  });

  test('PUT /Dog/:id creates a dog', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    const res = await fetch(`${httpURL}/Dog/test-buddy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ id: 'test-buddy', name: 'Buddy', breed: 'Golden Retriever', age: 3 }),
    });

    ok(res.ok, `expected successful create, got HTTP ${res.status}`);
  });

  test('GET /Dog/:id returns the dog', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    await fetch(`${httpURL}/Dog/test-max`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ id: 'test-max', name: 'Max', breed: 'Labrador', age: 2 }),
    });

    const getRes = await fetch(`${httpURL}/Dog/test-max`, {
      headers: { Authorization: auth },
    });

    strictEqual(getRes.status, 200);
    const body = await getRes.json() as { id: string; name: string };
    strictEqual(body.name, 'Max');
  });

  test('PUT /Dog/:id updates the dog name', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    await fetch(`${httpURL}/Dog/test-update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ id: 'test-update', name: 'Before', breed: 'Poodle', age: 1 }),
    });

    await fetch(`${httpURL}/Dog/test-update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ id: 'test-update', name: 'After', breed: 'Poodle', age: 1 }),
    });

    const getRes = await fetch(`${httpURL}/Dog/test-update`, {
      headers: { Authorization: auth },
    });
    const body = await getRes.json() as { name: string };
    strictEqual(body.name, 'After');
  });

  test('DELETE /Dog/:id removes the dog', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    await fetch(`${httpURL}/Dog/test-delete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ id: 'test-delete', name: 'Delete Me', breed: 'Dachshund', age: 4 }),
    });

    const deleteRes = await fetch(`${httpURL}/Dog/test-delete`, {
      method: 'DELETE',
      headers: { Authorization: auth },
    });
    ok(deleteRes.ok, `expected successful delete, got HTTP ${deleteRes.status}`);

    const getRes = await fetch(`${httpURL}/Dog/test-delete`, {
      headers: { Authorization: auth },
    });
    strictEqual(getRes.status, 404);
  });

  test('GET /DogWithHumanAge/:id returns humanAge=15 for age=1', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    await fetch(`${httpURL}/Dog/test-age1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ id: 'test-age1', name: 'Puppy', breed: 'Beagle', age: 1 }),
    });

    const res = await fetch(`${httpURL}/DogWithHumanAge/test-age1`, {
      headers: { Authorization: auth },
    });

    strictEqual(res.status, 200);
    const body = await res.json() as { humanAge: number };
    strictEqual(body.humanAge, 15);
  });

  test('GET /DogWithHumanAge/:id returns humanAge=24 for age=2', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    await fetch(`${httpURL}/Dog/test-age2`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ id: 'test-age2', name: 'Teenager', breed: 'Boxer', age: 2 }),
    });

    const res = await fetch(`${httpURL}/DogWithHumanAge/test-age2`, {
      headers: { Authorization: auth },
    });

    strictEqual(res.status, 200);
    const body = await res.json() as { humanAge: number };
    strictEqual(body.humanAge, 24);
  });

  test('GET /DogWithHumanAge/:id returns humanAge=29 for age=3', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    await fetch(`${httpURL}/Dog/test-age3`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ id: 'test-age3', name: 'Adult', breed: 'Collie', age: 3 }),
    });

    const res = await fetch(`${httpURL}/DogWithHumanAge/test-age3`, {
      headers: { Authorization: auth },
    });

    strictEqual(res.status, 200);
    const body = await res.json() as { humanAge: number };
    strictEqual(body.humanAge, 29);
  });
});
