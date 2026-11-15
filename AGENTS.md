# AGENTS.md — Meus Gastos (my-finances)

Context for AI coding agents. Human-facing docs live in [README.md](README.md) (pt-BR).

## What this is

A single-user, local personal expense tracker. Users create/list/edit/delete expenses,
classify them by **category** and **payment method**, filter by category and see charts.
No auth, no multi-tenancy, no deployment config.

| Layer    | Tech                                                        | Path      |
|----------|-------------------------------------------------------------|-----------|
| Frontend | React 19 + Vite 7, `lucide-react` icons, plain CSS          | `client/` |
| Backend  | Node.js + Express 5 (ESM)                                   | `server/` |
| Database | SQLite via built-in `node:sqlite` (`DatabaseSync`, sync API) | `server/data/finances.db` (gitignored) |
| Tests    | `node:test` + `node:assert/strict`; `supertest` for the API | `server/test/`, `client/src/**/*.test.js` |

Requires **Node.js ≥ 22.13** (uses `node:sqlite`); developed on Node 24, on Windows.
No TypeScript, no linter/formatter, no CSS framework, no chart library, no state library, no router.

## Commands (run from repo root)

```bash
npm run install:all   # installs root, server/ and client/ deps (three separate package.json files)
npm run dev           # API on :3001 (node --watch) + Vite on http://localhost:5173 (proxies /api -> :3001)
npm test              # server tests, then client tests (both `node --test`)
npm run build         # client production build -> client/dist
```

Per-package: `npm test --prefix server`, `npm test --prefix client`. Server port: `PORT` env var (default 3001).

## Repository map

```
server/src/
  index.js            entry: creates server/data/, opens DB, listens on PORT
  app.js              createApp(db): mounts routers, /api 404, central error handler
  db.js               openDb(file): schema (CREATE IF NOT EXISTS), ad-hoc migrations, first-run seeds
  validation.js       HttpError, validateName, validateExpense, isValidDate
  routes/expenses.js  CRUD /api/expenses (JOINs category + payment method names)
  routes/lookup.js    generic CRUD factory reused for categories AND payment methods
server/test/api.test.js  API integration tests (fresh ':memory:' DB per test)

client/src/
  main.jsx            React root (StrictMode)
  App.jsx             owns ALL app state + every mutation; passes data/callbacks down
  api.js              fetch wrapper; api.{expenses,categories,paymentMethods}.{list,create,update,remove}
  styles.css          all styles; CSS variables in :root
  components/
    ExpenseForm.jsx     create form (keeps date/category/payment after submit)
    ExpenseList.jsx     table + footer total (respects filter)
    ExpenseRow.jsx      read row / inline EditRow (Enter saves, Esc cancels)
    ExpenseCharts.jsx   SVG donut + bars by category (month selector) and 6-month bar chart
    CategoryFilter.jsx  category <select>
    ManagePanel.jsx     drawer with tabs to add/rename/delete categories & payment methods
    OptionSelect.jsx    <select> whose last option "+ Nova…" becomes an inline create input
    expensePayload.js   toExpensePayload(draft) -> { data } | { error }  (shared by form + edit row)
  utils/
    money.js            parseBRL, formatBRL, centsToInput, formatDate, today
    chartData.js        pure chart aggregations (getAvailableMonths, buildCategoryBreakdown, buildMonthlySeries, ...)
```

## Data model (SQLite)

```sql
categories      (id INTEGER PK AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE)
payment_methods (id INTEGER PK AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE)
expenses (
  id INTEGER PK AUTOINCREMENT,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  date TEXT NOT NULL,                       -- 'YYYY-MM-DD'
  category_id INTEGER NOT NULL REFERENCES categories(id),
  payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

- `PRAGMA foreign_keys = ON` is set in `openDb`.
- Seeds (7 categories, 6 payment methods, pt-BR names) are inserted **only when the table is empty**,
  so deleted defaults never come back. Tests depend on these exact seed counts/names.
- There is no migration framework. Schema changes go in `openDb` as idempotent steps
  (`CREATE ... IF NOT EXISTS`, or check `PRAGMA table_info` before `ALTER TABLE`).
  The existing `subscription_id` / `subscriptions` cleanup is such a step (a removed feature).

## HTTP API

All JSON, camelCase. Errors are always `{ "error": "<pt-BR message>" }`.

| Method | Route | Body | Success | Errors |
|---|---|---|---|---|
| GET    | `/api/expenses[?categoryId=N]` | – | 200 `Expense[]` ordered `date DESC, id DESC` | – |
| POST   | `/api/expenses` | `ExpenseInput` | 201 `Expense` | 400 |
| PUT    | `/api/expenses/:id` | `ExpenseInput` (full replace) | 200 `Expense` | 400, 404 |
| DELETE | `/api/expenses/:id` | – | 204 | 404 |
| GET    | `/api/categories` | – | 200 `Lookup[]` sorted by name (case-insensitive) | – |
| POST   | `/api/categories` | `{ name }` | 201 `Lookup` | 400, 409 duplicate |
| PUT    | `/api/categories/:id` | `{ name }` | 200 `Lookup` | 400, 404, 409 |
| DELETE | `/api/categories/:id` | – | 204 | 404, 409 if `usageCount > 0` |
| *      | `/api/payment-methods[/:id]` | same as categories | | |
| *      | any other `/api/*` | – | – | 404 |

```ts
ExpenseInput = { description: string /*trimmed, 1..200*/, amountCents: integer /*> 0*/,
                 date: 'YYYY-MM-DD' /*real calendar date*/, categoryId: integer, paymentMethodId: integer }
Expense      = { id, description, amountCents, date, categoryId, categoryName, paymentMethodId, paymentMethodName }
Lookup       = { id, name /*trimmed, 1..50, unique case-insensitive*/, usageCount }
```

`validateExpense` collects all failures and returns them joined in one 400 message.

## Conventions and invariants

**Money** — always integer cents (`amountCents` / `amount_cents`) in the API, DB and state. Convert only at
the UI edge: `parseBRL('1.234,56') -> 123456` (returns `null` for invalid/≤0), `formatBRL(cents) -> 'R$ 1.234,56'`,
`centsToInput(cents) -> '1234,56'`. Never store or send floats.

**Dates** — plain `'YYYY-MM-DD'` strings everywhere; months are `'YYYY-MM'` (`date.slice(0, 7)`).
Use `today()` (local time) for "now"; don't use `new Date().toISOString()` (UTC shifts the day in Brazil, UTC-3).
Display with `formatDate` (`DD/MM/YYYY`) and `formatMonthLabel`/`formatMonthShort`.

**Language** — code, identifiers and comments in English; every user-visible string (UI text, API error
messages, seeds) in **Brazilian Portuguese** (`lang="pt-BR"`).

**Backend**
- Routers are factories taking `db` (`createXRouter(db)`); `createApp(db)` is the composition root, so tests
  inject `openDb(':memory:')`. Keep that pattern for new routes.
- Prepare statements once per router factory, not per request. `node:sqlite` is synchronous; handlers are sync.
- Signal client errors with `throw new HttpError(status, 'mensagem')`. Express 5 forwards thrown/rejected errors
  to the handler in `app.js`; 500s are logged and masked as `'Erro interno do servidor.'`. No try/catch in routes.
- `lookup.js` interpolates `table`/`fkColumn` into SQL — they must stay hard-coded constants. All user values
  go through `?` placeholders.
- Category/payment-method deletes are blocked (409) while referenced; renames propagate via JOINs.

**Frontend**
- `App.jsx` is the single source of truth. Every mutation goes through `run(fn)` (catches errors and shows them
  in the auto-dismissing alert banner; returns result or `true`, or `null` on failure) and then calls `loadAll()`
  to refetch expenses + both lookups. No optimistic updates, no caching.
- Category filtering is done client-side in `App.jsx` (the API's `?categoryId=` is unused by the UI).
- `<select>` values are **strings**; IDs are converted with `Number()` in `toExpensePayload` and compared via
  `String(id)`.
- Client-side validation (`toExpensePayload`) mirrors the server; the server remains authoritative.
- Destructive actions use `window.confirm` with pt-BR text.
- Charts are hand-rolled SVG/CSS; aggregation logic belongs in pure functions in `utils/chartData.js` (tested),
  not in components.
- Style: function components + hooks, default export per component file, 2-space indent, single quotes,
  semicolons, trailing commas. Add classes to `styles.css`; reuse `.btn`, `.btn-primary`, `.btn-ghost`,
  `.icon-btn`, `.badge`, `.muted`, `.small` and the `:root` CSS variables.

## Testing

- Server: `server/test/api.test.js` drives the real app with `supertest` against a fresh `':memory:'` DB per test.
  Add a test there for any API behavior change.
- Client: only pure modules are tested (`utils/*.test.js`); there is no DOM/React test setup — keep logic
  testable by extracting it into pure functions.
- Tests are discovered by `node --test` default patterns (`*.test.js`, `test/` dir).

## Known issues

- `client/src/utils/money.test.js` imports `../components/subscriptionPayload.js` (and tests
  `toSubscriptionPayload`) from the removed subscriptions feature. That file doesn't exist, so the whole file
  fails with `ERR_MODULE_NOT_FOUND` and `npm test` fails at the client step. Fix by deleting that import and the
  `toSubscriptionPayload` test.
- No pagination: `GET /api/expenses` returns every row.

## Checklist for changes

1. New expense field → `db.js` (schema + idempotent migration), `validation.js`, `routes/expenses.js`
   (`SELECT`, `insert`, `update`, `params`), `api.test.js`, `expensePayload.js`, `ExpenseForm.jsx`,
   `ExpenseRow.jsx` (read + edit), `ExpenseList.jsx` headers/`colSpan`s, README.
2. New lookup-style list → reuse `createLookupRouter` in `app.js`, add to `api.js`, add a tab in `App.jsx`'s
   `ManagePanel` `tabs` and `SINGULAR` in `ManagePanel.jsx`.
3. Run `npm test` and `npm run build` before finishing.
