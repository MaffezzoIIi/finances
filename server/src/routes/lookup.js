import { Router } from 'express';
import { HttpError, validateName } from '../validation.js';

// Generic CRUD for simple name lists (categories, payment methods).
// `table` and `fkColumn` are internal constants, never user input.
export function createLookupRouter(db, { table, fkColumn, label }) {
  const router = Router();

  const selectAll = db.prepare(`
    SELECT t.id, t.name,
      (SELECT COUNT(*) FROM expenses WHERE ${fkColumn} = t.id) AS usageCount
    FROM ${table} t ORDER BY t.name COLLATE NOCASE`);
  const selectOne = db.prepare(`
    SELECT t.id, t.name,
      (SELECT COUNT(*) FROM expenses WHERE ${fkColumn} = t.id) AS usageCount
    FROM ${table} t WHERE t.id = ?`);
  const findByName = db.prepare(`SELECT id FROM ${table} WHERE name = ?`);
  const insert = db.prepare(`INSERT INTO ${table} (name) VALUES (?)`);
  const update = db.prepare(`UPDATE ${table} SET name = ? WHERE id = ?`);
  const remove = db.prepare(`DELETE FROM ${table} WHERE id = ?`);

  const getOr404 = (id) => {
    const row = selectOne.get(Number(id));
    if (!row) throw new HttpError(404, `${label} não encontrada.`);
    return row;
  };
  const assertUnique = (name, exceptId) => {
    const dup = findByName.get(name);
    if (dup && dup.id !== exceptId) throw new HttpError(409, `${label} "${name}" já existe.`);
  };

  router.get('/', (_req, res) => res.json(selectAll.all()));

  router.post('/', (req, res) => {
    const name = validateName(req.body);
    assertUnique(name);
    const { lastInsertRowid } = insert.run(name);
    res.status(201).json(selectOne.get(lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const current = getOr404(req.params.id);
    const name = validateName(req.body);
    assertUnique(name, current.id);
    update.run(name, current.id);
    res.json(selectOne.get(current.id));
  });

  router.delete('/:id', (req, res) => {
    const current = getOr404(req.params.id);
    if (current.usageCount > 0) {
      throw new HttpError(
        409,
        `Não é possível excluir "${current.name}": está em uso por ${current.usageCount} gasto(s). Altere esses gastos antes.`,
      );
    }
    remove.run(current.id);
    res.status(204).end();
  });

  return router;
}
