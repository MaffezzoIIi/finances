import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createApp } from './app.js';

const dataDir = fileURLToPath(new URL('../data/', import.meta.url));
mkdirSync(dataDir, { recursive: true });

const db = openDb(`${dataDir}finances.db`);
const port = Number(process.env.PORT) || 3001;

createApp(db).listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
