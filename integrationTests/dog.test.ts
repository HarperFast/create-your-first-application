/**
 * Verifies CRUD on the Dog REST API and the DogWithHumanAge custom resource.
 * DogWithHumanAge adds a calculated humanAge field: age 1→15, age 2→24, age 3→29.
 * Explicit IDs are used for all records so GET lookups are reliable.
 */
import { suite, test, before, after } from 'node:test';
import { strictEqual, ok } from 'node:assert/strict';
import { setupHarperWithFixture, teardownHarper, type ContextWithHarper } from '@harperfast/integration-testing';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(__dirname, '..');

// harper's `exports` map only exposes ".", so the harness's default
// `require.resolve('harper/dist/bin/harper.js')` throws ERR_PACKAGE_PATH_NOT_EXPORTED.
// Resolve the CLI from the exported package root and pass it explicitly.
const require = createRequire(import.meta.url);
const harperBinPath = resolve(dirname(require.resolve('harper')), 'bin/harper.js');

function basicAuth(username: string, password: string): string {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

interface Dog {
  id: string;
  name: string;
  breed: string;
  age: number;
}

suite('Dog API and DogWithHumanAge', (ctx: ContextWithHarper) => {
  // Resolved once in before() and closed over, rather than re-derived in every test.
  let httpURL: string;
  let auth: string;

  before(async () => {
    await setupHarperWithFixture(ctx, fixtureDir, { harperBinPath });
    httpURL = ctx.harper.httpURL;
    auth = basicAuth(ctx.harper.admin.username, ctx.harper.admin.password);
  });

  after(async () => {
    await teardownHarper(ctx);
  });

  const authGet = (path: string) => fetch(`${httpURL}${path}`, { headers: { Authorization: auth } });

  // Every test seeds its own record. The status is asserted here so a failed seed surfaces
  // as "setup PUT failed" rather than as a confusing downstream assertion — a silent seed
  // failure can otherwise make a test pass for the wrong reason (a DELETE test, for
  // instance, would still see a 404 at the end because the record never existed).
  async function putDog(dog: Dog): Promise<void> {
    const res = await fetch(`${httpURL}/Dog/${dog.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify(dog),
    });
    ok(res.ok, `setup PUT /Dog/${dog.id} failed: HTTP ${res.status}`);
  }

  test('PUT /Dog/:id creates a dog', async () => {
    await putDog({ id: 'test-buddy', name: 'Buddy', breed: 'Golden Retriever', age: 3 });

    // Round-trip the record: an accepted write is not proof it was stored.
    const getRes = await authGet('/Dog/test-buddy');
    strictEqual(getRes.status, 200, `GET after create: HTTP ${getRes.status}`);
    const body = await getRes.json() as Dog;
    strictEqual(body.name, 'Buddy');
    strictEqual(body.breed, 'Golden Retriever');
    strictEqual(body.age, 3);
  });

  test('GET /Dog/:id returns the dog', async () => {
    await putDog({ id: 'test-max', name: 'Max', breed: 'Labrador', age: 2 });

    const getRes = await authGet('/Dog/test-max');
    strictEqual(getRes.status, 200, `GET /Dog/test-max: HTTP ${getRes.status}`);
    const body = await getRes.json() as Dog;
    strictEqual(body.name, 'Max');
  });

  test('PUT /Dog/:id updates the dog name', async () => {
    await putDog({ id: 'test-update', name: 'Before', breed: 'Poodle', age: 1 });
    await putDog({ id: 'test-update', name: 'After', breed: 'Poodle', age: 1 });

    const getRes = await authGet('/Dog/test-update');
    strictEqual(getRes.status, 200, `GET after update: HTTP ${getRes.status}`);
    const body = await getRes.json() as Dog;
    strictEqual(body.name, 'After');
  });

  test('DELETE /Dog/:id removes the dog', async () => {
    await putDog({ id: 'test-delete', name: 'Delete Me', breed: 'Dachshund', age: 4 });

    const deleteRes = await fetch(`${httpURL}/Dog/test-delete`, {
      method: 'DELETE',
      headers: { Authorization: auth },
    });
    ok(deleteRes.ok, `expected successful delete, got HTTP ${deleteRes.status}`);

    const getRes = await authGet('/Dog/test-delete');
    strictEqual(getRes.status, 404);
  });

  // The three humanAge cases are structurally identical, so they are table-driven:
  // adding a new age mapping is one row rather than another copy of the test body.
  const humanAgeCases: ReadonlyArray<{ age: number; humanAge: number; name: string; breed: string }> = [
    { age: 1, humanAge: 15, name: 'Puppy', breed: 'Beagle' },
    { age: 2, humanAge: 24, name: 'Teenager', breed: 'Boxer' },
    { age: 3, humanAge: 29, name: 'Adult', breed: 'Collie' },
  ];

  for (const { age, humanAge, name, breed } of humanAgeCases) {
    test(`GET /DogWithHumanAge/:id returns humanAge=${humanAge} for age=${age}`, async () => {
      const id = `test-age${age}`;
      await putDog({ id, name, breed, age });

      const res = await authGet(`/DogWithHumanAge/${id}`);
      strictEqual(res.status, 200, `GET /DogWithHumanAge/${id}: HTTP ${res.status}`);
      const body = await res.json() as { humanAge: number };
      strictEqual(body.humanAge, humanAge);
    });
  }
});
