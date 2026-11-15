import { Router } from 'express';
import { HttpError, validateExpense } from '../validation.js';

const SELECT = `
  SELECT e.id, e.description, e.amount_cents AS amountCents, e.date,
         e.category_id AS categoryId, c.name AS categoryName,
         e.payment_method_id AS paymentMethodId, p.name AS paymentMethodName
  FROM expenses e
  JOIN categories c ON c.id = e.category_id
  JOIN payment_methods p ON p.id = e.payment_method_id`;
const ORDER = 'ORDER BY e.date DESC, e.id DESC';

export function createExpensesRouter(db) {
  const router = Router();

  const selectList = db.prepare(
    `${SELECT} WHERE e.category_id = COALESCE(?, e.category_id) AND e.payment_method_id = COALESCE(?, e.payment_method_id) ${ORDER}`,
  );
  const selectOne = db.prepare(`${SELECT} WHERE e.id = ?`);
  const insert = db.prepare(`
    INSERT INTO expenses (description, amount_cents, date, category_id, payment_method_id)
    VALUES (?, ?, ?, ?, ?)`);
  const update = db.prepare(`
    UPDATE expenses SET description = ?, amount_cents = ?, date = ?, category_id = ?,
           payment_method_id = ?, updated_at = datetime('now')
    WHERE id = ?`);
  const remove = db.prepare('DELETE FROM expenses WHERE id = ?');

  const getOr404 = (id) => {
    const row = selectOne.get(Number(id));
    if (!row) throw new HttpError(404, 'Gasto não encontrado.');
    return row;
  };
  const params = (e) => [e.description, e.amountCents, e.date, e.categoryId, e.paymentMethodId];

  router.get('/', (req, res) => {
    const { categoryId, paymentMethodId } = req.query;
    res.json(selectList.all(categoryId ? Number(categoryId) : null, paymentMethodId ? Number(paymentMethodId) : null));
  });

  router.post('/', (req, res) => {
    const expense = validateExpense(db, req.body);
    const { lastInsertRowid } = insert.run(...params(expense));
    res.status(201).json(selectOne.get(lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const { id } = getOr404(req.params.id);
    const expense = validateExpense(db, req.body);
    update.run(...params(expense), id);
    res.json(selectOne.get(id));
  });

  router.delete('/:id', (req, res) => {
    const { id } = getOr404(req.params.id);
    remove.run(id);
    res.status(204).end();
  });

  return router;
}
