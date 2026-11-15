import { Router } from 'express';
import { validateFundSettings } from '../validation.js';

const DEFAULT_ESSENTIALS = ['Moradia', 'Alimentação', 'Saúde', 'Transporte', 'Educação'];

export function createEmergencyFundRouter(db) {
  const router = Router();

  const selectSettings = db.prepare(
    'SELECT months, saved_cents AS savedCents FROM emergency_fund_settings WHERE id = 1',
  );
  const selectEssentialIds = db.prepare(
    'SELECT category_id AS id FROM emergency_fund_categories ORDER BY category_id',
  );
  const selectDefaultEssentials = db.prepare(
    `SELECT id FROM categories WHERE name IN (${DEFAULT_ESSENTIALS.map(() => '?').join(', ')}) ORDER BY id`,
  );
  const upsertSettings = db.prepare(`
    INSERT INTO emergency_fund_settings (id, months, saved_cents)
    VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET months = excluded.months, saved_cents = excluded.saved_cents`);
  const clearCategories = db.prepare('DELETE FROM emergency_fund_categories');
  const insertCategory = db.prepare(
    'INSERT INTO emergency_fund_categories (category_id) VALUES (?)',
  );

  const readState = () => {
    const row = selectSettings.get();
    if (!row) {
      return {
        months: 6,
        savedCents: 0,
        essentialCategoryIds: selectDefaultEssentials.all(...DEFAULT_ESSENTIALS).map((r) => r.id),
      };
    }
    return {
      months: row.months,
      savedCents: row.savedCents,
      essentialCategoryIds: selectEssentialIds.all().map((r) => r.id),
    };
  };

  router.get('/', (_req, res) => res.json(readState()));

  router.put('/', (req, res) => {
    const { months, savedCents, essentialCategoryIds } = validateFundSettings(db, req.body);
    db.exec('BEGIN');
    try {
      upsertSettings.run(months, savedCents);
      clearCategories.run();
      for (const id of essentialCategoryIds) insertCategory.run(id);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    res.json(readState());
  });

  return router;
}
