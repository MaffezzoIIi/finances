import { Router } from 'express';
import { HttpError, validateSimulation } from '../validation.js';

const SELECT = `
  SELECT id, name, balance_cents AS balanceCents, annual_rate_bps AS annualRateBps,
         monthly_payment_cents AS monthlyPaymentCents, monthly_fees_cents AS monthlyFeesCents,
         fgts_balance_cents AS fgtsBalanceCents, fgts_monthly_deposit_cents AS fgtsMonthlyDepositCents
  FROM financing_simulations`;

export function createFinancingRouter(db) {
  const router = Router();

  const selectAll = db.prepare(`${SELECT} ORDER BY name COLLATE NOCASE, id`);
  const selectOne = db.prepare(`${SELECT} WHERE id = ?`);
  const insert = db.prepare(`
    INSERT INTO financing_simulations (name, balance_cents, annual_rate_bps, monthly_payment_cents,
      monthly_fees_cents, fgts_balance_cents, fgts_monthly_deposit_cents)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const update = db.prepare(`
    UPDATE financing_simulations SET name = ?, balance_cents = ?, annual_rate_bps = ?,
           monthly_payment_cents = ?, monthly_fees_cents = ?, fgts_balance_cents = ?,
           fgts_monthly_deposit_cents = ?, updated_at = datetime('now')
    WHERE id = ?`);
  const remove = db.prepare('DELETE FROM financing_simulations WHERE id = ?');

  const getOr404 = (id) => {
    const row = selectOne.get(Number(id));
    if (!row) throw new HttpError(404, 'Simulação não encontrada.');
    return row;
  };
  const params = (s) => [
    s.name, s.balanceCents, s.annualRateBps, s.monthlyPaymentCents,
    s.monthlyFeesCents, s.fgtsBalanceCents, s.fgtsMonthlyDepositCents,
  ];

  router.get('/', (_req, res) => res.json(selectAll.all()));

  router.post('/', (req, res) => {
    const sim = validateSimulation(req.body);
    const { lastInsertRowid } = insert.run(...params(sim));
    res.status(201).json(selectOne.get(lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const { id } = getOr404(req.params.id);
    const sim = validateSimulation(req.body);
    update.run(...params(sim), id);
    res.json(selectOne.get(id));
  });

  router.delete('/:id', (req, res) => {
    const { id } = getOr404(req.params.id);
    remove.run(id);
    res.status(204).end();
  });

  return router;
}
