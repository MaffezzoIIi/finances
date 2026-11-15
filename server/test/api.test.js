import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

let db;
let app;
beforeEach(() => {
  db = openDb(':memory:');
  app = createApp(db);
});

const idOf = async (path, name) =>
  (await request(app).get(path)).body.find((x) => x.name === name).id;

async function newExpense(overrides = {}, status = 201) {
  const body = {
    description: 'Almoço',
    amountCents: 3590,
    date: '2026-11-04',
    categoryId: await idOf('/api/categories', 'Alimentação'),
    paymentMethodId: await idOf('/api/payment-methods', 'Pix'),
    ...overrides,
  };
  return request(app).post('/api/expenses').send(body).expect(status);
}

for (const [path, seedCount, sample, fk] of [
  ['/api/categories', 7, 'Lazer', 'categoryId'],
  ['/api/payment-methods', 6, 'Boleto', 'paymentMethodId'],
]) {
  describe(path, () => {
    test('GET returns seeds sorted with usageCount', async () => {
      const res = await request(app).get(path).expect(200);
      assert.equal(res.body.length, seedCount);
      const names = res.body.map((x) => x.name);
      assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
      assert.ok(res.body.every((x) => x.usageCount === 0));
    });

    test('POST creates, rejects duplicates (case-insensitive) and empty names', async () => {
      const res = await request(app).post(path).send({ name: '  Novo  ' }).expect(201);
      assert.equal(res.body.name, 'Novo');
      await request(app).post(path).send({ name: 'novo' }).expect(409);
      await request(app).post(path).send({ name: '   ' }).expect(400);
      await request(app).post(path).send({ name: 'x'.repeat(51) }).expect(400);
    });

    test('PUT renames and the new name shows up in expenses', async () => {
      const id = await idOf(path, sample);
      await newExpense({ [fk]: id });
      await request(app).put(`${path}/${id}`).send({ name: 'Renomeado' }).expect(200);
      const [expense] = (await request(app).get('/api/expenses')).body;
      assert.ok([expense.categoryName, expense.paymentMethodName].includes('Renomeado'));
    });

    test('PUT conflicts / not found', async () => {
      const id = await idOf(path, sample);
      const other = (await request(app).get(path)).body.find((x) => x.id !== id).name;
      await request(app).put(`${path}/${id}`).send({ name: other }).expect(409);
      await request(app).put(`${path}/${id}`).send({ name: sample.toUpperCase() }).expect(200);
      await request(app).put(`${path}/9999`).send({ name: 'X' }).expect(404);
    });

    test('DELETE removes unused, blocks in-use with 409', async () => {
      const id = await idOf(path, sample);
      const { body: expense } = await newExpense({ [fk]: id });
      const blocked = await request(app).delete(`${path}/${id}`).expect(409);
      assert.match(blocked.body.error, /em uso por 1 gasto/);

      await request(app).delete(`/api/expenses/${expense.id}`).expect(204);
      await request(app).delete(`${path}/${id}`).expect(204);
      await request(app).delete(`${path}/${id}`).expect(404);
      assert.equal((await request(app).get(path)).body.length, seedCount - 1);
    });
  });
}

test('seeds are not recreated after deleting defaults and reopening the db', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'finances-'));
  try {
    const file = join(dir, 'test.db');
    let fileDb = openDb(file);
    let fileApp = createApp(fileDb);
    const { body } = await request(fileApp).get('/api/categories');
    await request(fileApp).delete(`/api/categories/${body[0].id}`).expect(204);
    fileDb.close();

    fileDb = openDb(file);
    fileApp = createApp(fileDb);
    assert.equal((await request(fileApp).get('/api/categories')).body.length, 6);
    fileDb.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('/api/expenses', () => {
  test('POST creates with joined names', async () => {
    const res = await newExpense();
    assert.equal(res.body.description, 'Almoço');
    assert.equal(res.body.amountCents, 3590);
    assert.equal(res.body.categoryName, 'Alimentação');
    assert.equal(res.body.paymentMethodName, 'Pix');
  });

  test('POST rejects invalid payloads', async () => {
    await newExpense({ description: '  ' }, 400);
    await newExpense({ amountCents: 0 }, 400);
    await newExpense({ amountCents: 10.5 }, 400);
    await newExpense({ date: '2026-02-30' }, 400);
    await newExpense({ date: '04/11/2026' }, 400);
    await newExpense({ categoryId: 9999 }, 400);
    await newExpense({ paymentMethodId: 9999 }, 400);
    assert.equal((await request(app).get('/api/expenses')).body.length, 0);
  });

  test('GET orders by date desc and filters by category and paymentMethod', async () => {
    const transporte = await idOf('/api/categories', 'Transporte');
    const boleto = await idOf('/api/payment-methods', 'Boleto');
    await newExpense({ description: 'A', date: '2026-01-01', paymentMethodId: boleto });
    await newExpense({ description: 'B', date: '2026-03-01', categoryId: transporte });
    await newExpense({ description: 'C', date: '2026-02-01', categoryId: transporte, paymentMethodId: boleto });

    const all = (await request(app).get('/api/expenses').expect(200)).body;
    assert.deepEqual(all.map((e) => e.description), ['B', 'C', 'A']);

    const byCategory = (await request(app).get(`/api/expenses?categoryId=${transporte}`)).body;
    assert.deepEqual(byCategory.map((e) => e.description), ['B', 'C']);

    const byPayment = (await request(app).get(`/api/expenses?paymentMethodId=${boleto}`)).body;
    assert.deepEqual(byPayment.map((e) => e.description), ['C', 'A']);

    const byBoth = (await request(app).get(`/api/expenses?categoryId=${transporte}&paymentMethodId=${boleto}`)).body;
    assert.deepEqual(byBoth.map((e) => e.description), ['C']);
  });

  test('PUT updates / 404 / 400', async () => {
    const { body: created } = await newExpense();
    const lazer = await idOf('/api/categories', 'Lazer');
    const res = await request(app)
      .put(`/api/expenses/${created.id}`)
      .send({ ...created, description: 'Cinema', amountCents: 5000, categoryId: lazer })
      .expect(200);
    assert.equal(res.body.description, 'Cinema');
    assert.equal(res.body.amountCents, 5000);
    assert.equal(res.body.categoryName, 'Lazer');

    await request(app).put('/api/expenses/9999').send(created).expect(404);
    await request(app).put(`/api/expenses/${created.id}`).send({ ...created, amountCents: -1 }).expect(400);
  });

  test('DELETE removes / 404', async () => {
    const { body: created } = await newExpense();
    await request(app).delete(`/api/expenses/${created.id}`).expect(204);
    assert.equal((await request(app).get('/api/expenses')).body.length, 0);
    await request(app).delete(`/api/expenses/${created.id}`).expect(404);
  });
});
