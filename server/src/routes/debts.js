import { Router } from 'express';
import { HttpError, validateDebt } from '../validation.js';

const SELECT = `
  SELECT id, name, monthly_payment_cents AS monthlyPaymentCents, end_month AS endMonth
  FROM debts`;

export function createDebtsRouter(db) {
  const router = Router();

  const selectAll = db.prepare(`${SELECT} ORDER BY name COLLATE NOCASE, id`);
  const selectOne = db.prepare(`${SELECT} WHERE id = ?`);
  const insert = db.prepare(
    'INSERT INTO debts (name, monthly_payment_cents, end_month) VALUES (?, ?, ?)',
  );
  const update = db.prepare(`
    UPDATE debts
    SET name = ?, monthly_payment_cents = ?, end_month = ?, updated_at = datetime('now')
    WHERE id = ?`);
  const remove = db.prepare('DELETE FROM debts WHERE id = ?');

  const getOr404 = (id) => {
    const row = selectOne.get(Number(id));
    if (!row) throw new HttpError(404, 'Dívida não encontrada.');
    return row;
  };

  router.get('/', (_req, res) => res.json(selectAll.all()));

  router.post('/', (req, res) => {
    const debt = validateDebt(req.body);
    const { lastInsertRowid } = insert.run(debt.name, debt.monthlyPaymentCents, debt.endMonth);
    res.status(201).json(selectOne.get(lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const { id } = getOr404(req.params.id);
    const debt = validateDebt(req.body);
    update.run(debt.name, debt.monthlyPaymentCents, debt.endMonth, id);
    res.json(selectOne.get(id));
  });

  router.delete('/:id', (req, res) => {
    const { id } = getOr404(req.params.id);
    remove.run(id);
    res.status(204).end();
  });

  return router;
}
