import { DatabaseSync } from 'node:sqlite';

const SEEDS = {
  categories: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Outros'],
  payment_methods: ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Transferência'],
};

export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS categories (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );
    CREATE TABLE IF NOT EXISTS payment_methods (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      description       TEXT    NOT NULL,
      amount_cents      INTEGER NOT NULL CHECK (amount_cents > 0),
      date              TEXT    NOT NULL,
      category_id       INTEGER NOT NULL REFERENCES categories(id),
      payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id),
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const cols = db.prepare('PRAGMA table_info(expenses)').all();
  if (cols.some((c) => c.name === 'subscription_id')) {
    db.exec('ALTER TABLE expenses DROP COLUMN subscription_id');
  }
  db.exec('DROP TABLE IF EXISTS subscriptions');

  // Seed only on first run (empty table), so deleted defaults don't come back.
  for (const [table, names] of Object.entries(SEEDS)) {
    const { n } = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get();
    if (n === 0) {
      const insert = db.prepare(`INSERT INTO ${table} (name) VALUES (?)`);
      for (const name of names) insert.run(name);
    }
  }
  return db;
}
