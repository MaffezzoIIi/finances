---
name: docs-sync
description: >-
  Checks whether README.md or AGENTS.md need updates after code changes and
  applies them directly. Run before finishing any non-trivial code change.
---

# Docs Sync

Keep `README.md` (pt-BR, user-facing) and `AGENTS.md` (English, agent-facing)
in sync with the codebase.

## Steps

1. Inspect what changed in the working tree:
   ```powershell
   git status --porcelain
   git diff HEAD
   ```
   Include untracked files reported by `git status --porcelain`.

2. **Quick exit** if the diff *only* touches:
   - tests (`*.test.js`, `server/test/**`)
   - CSS/styling (`client/src/styles.css`)
   - internal refactors with no behavior, API, schema, or file-layout change
   - `README.md`, `AGENTS.md`, or `.agents/**`

3. Otherwise, check each changed area against the mapping below and read only
   the relevant sections of `README.md` and `AGENTS.md`:

   | Code change | `README.md` (pt-BR) | `AGENTS.md` (English) |
   |---|---|---|
   | `server/src/routes/**` or `server/src/app.js` | **API** table | **HTTP API** table & types |
   | `server/src/db.js` | **Rodando** / **Funcionalidades** (if user-visible) | **Data model (SQLite)** |
   | `server/src/validation.js` | – (unless user-visible rule changes) | **HTTP API** types / validation notes |
   | Files added, removed, or renamed | – | **Repository map** |
   | `package.json` scripts or Node version | **Rodando** / **Testes e build** | **Commands** |
   | User-facing UI/feature in `client/src/**` | **Funcionalidades** | **Conventions** / **Repository map** (if new component/util) |

4. Edit `README.md` and/or `AGENTS.md` directly to match the actual code:
   - Keep `README.md` in Brazilian Portuguese.
   - Keep `AGENTS.md` in English (with pt-BR only for user-visible strings).
   - Do not invent or extrapolate behavior you didn't observe in the diff/files.
