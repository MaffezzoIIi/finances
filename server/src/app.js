import express from 'express';
import { createLookupRouter } from './routes/lookup.js';
import { createExpensesRouter } from './routes/expenses.js';
import { createFinancingRouter } from './routes/financing.js';

export function createApp(db) {
  const app = express();
  app.use(express.json());

  app.use('/api/categories', createLookupRouter(db, {
    table: 'categories', fkColumn: 'category_id', label: 'Categoria',
  }));
  app.use('/api/payment-methods', createLookupRouter(db, {
    table: 'payment_methods', fkColumn: 'payment_method_id', label: 'Forma de pagamento',
  }));
  app.use('/api/expenses', createExpensesRouter(db));
  app.use('/api/financing-simulations', createFinancingRouter(db));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

  // Express 5 forwards thrown/rejected errors here automatically.
  app.use((err, _req, res, _next) => {
    const status = err.status ?? 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 ? 'Erro interno do servidor.' : err.message });
  });

  return app;
}
