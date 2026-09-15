# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A locally-run family finance tracker (bills, debt payoff planning). Runs entirely on localhost — no cloud, no deployment, no auth, no multi-user support. Single Docker container in production; FastAPI serves both the API and the pre-built React static frontend. `SPEC.md` is the original design document (data model, page-by-page requirements, payoff formulas) — consult it for feature intent beyond what's summarized here.

## Commands

Backend (from repo root, using the venv at `backend/.venv`):
```bash
cd backend && python3.12 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
source .venv/bin/activate && python -m pytest -q          # run all tests
source .venv/bin/activate && python -m pytest -q tests/test_payoff.py::TestSimulateStrategy::test_avalanche_prioritizes_highest_rate  # single test
uvicorn app.main:app --app-dir backend --reload --port 8000   # dev server, run from repo root
```
Requires Python 3.12 — `pydantic-core`'s compiled wheel does not yet support 3.14 (no prebuilt wheel and source build fails against 3.14's ABI); use `python3.12`, not whatever `python3` resolves to.

Frontend (from `frontend/`):
```bash
npm install
npm run dev        # dev server on :5173, proxies /api to localhost:8000 (see vite.config.ts)
npm run build       # tsc -b && vite build -> dist/
npm run lint         # oxlint
```

Full stack via Docker (from repo root):
```bash
cp .env.example .env   # fill in real values
docker compose up --build
```
Runs at `http://localhost:8000` — FastAPI serves the built frontend and the API from one process/port.

There is no Playwright E2E suite yet (SPEC.md calls for one across all pages) — only the Pytest backend suite exists today.

## Privacy model — the most important constraint

- `.env` holds real account details (names, numbers, balances, rates) and must **never** be committed. `.env.example` (all keys, empty values) is committed instead.
- `db/finance.db` (local SQLite) must **never** be committed.
- Both are excluded in `.gitignore` from the first commit — if you touch either path, re-verify the ignore rule still covers it.
- Settings' "re-import from .env" must stay idempotent: re-running it updates existing rows rather than duplicating them.

## Tech stack

- Frontend: React 19 + TypeScript (Vite), react-router-dom, recharts
- Backend: Python / FastAPI
- Database: SQLite via SQLAlchemy 2.0 (declarative `Mapped[]` style)
- Config: python-dotenv
- Tests: Pytest (calculation logic, API endpoints via `TestClient`)

## Architecture

- **`backend/app/payoff.py`** is the core domain logic, deliberately free of DB/FastAPI imports so it's unit-testable in isolation (see `backend/tests/test_payoff.py`):
  - `calculate_single_account_payoff` — closed-form months/interest for a fixed payment, used by the per-account payoff calculator (`GET /accounts/{id}/payoff-calculator`).
  - `simulate_strategy` — month-by-month simulation across multiple accounts for avalanche/snowball, used by the cross-account planner (`POST /payoff/plan`). It's a simulation rather than a formula because minimum payments free up and cascade to the next-priority account as each account is paid off; the closed-form formula can't express that.
- **`backend/app/env_import.py`** parses the fixed `.env` block structure (MORTGAGE_*, AUTO_*, CC{N}_*, ELECTRIC_*, INTERNET_*) into accounts keyed by a stable `source_key` (e.g. `"CC1"`) stored on the `Account` row — this is what makes re-import an upsert instead of a duplicate-inserter. `CC{N}` blocks are discovered dynamically by regex over `os.environ`, not hardcoded to a fixed count.
- **Data model** (`backend/app/models.py`): `Account` (bill/debt with balance, rate, minimum, due day, plus `source_key`), `Payment` (a logged payment against an account; `crud.create_payment` is what actually mutates `Account.balance`), `Snapshot` (point-in-time total-debt/minimums aggregate, created on demand from the Dashboard, not on a schedule).
- **Frontend data flow** is deliberately simple: no state management library. `src/api/client.ts` is a thin typed fetch wrapper (`api.getAccounts()`, etc.); each page in `src/pages/` calls it directly in `useEffect`/event handlers and holds its own `useState`. Recharts is the only visualization dependency.
- **Docker build** (`Dockerfile`) is a two-stage build: `node:20-slim` builds the frontend to `/frontend/dist`, then that output is copied into the `python:3.12-slim` final stage as `/app/static`. `STATIC_DIR` env var controls whether `app/main.py` mounts static files at all — unset in local dev (frontend runs separately via `vite dev`), set to `/app/static` in the container.
- `DATABASE_PATH` (default `db/finance.db`) is resolved relative to the process's **current working directory**, not the source file location — this only lines up with the intended `db/` folder if uvicorn is run from the repo root (locally, `--app-dir backend`) or from `/app` (in the container, matching the `./db:/app/db` compose mount). Don't refactor this to be relative to `__file__` without re-checking both cases.

## Known gaps vs. SPEC.md

- No interest-rate-history tracking on `/accounts/:id` (SPEC mentions it, but the Data Model section doesn't define a table for it — would need a schema addition).
- "Interest paid over time" on `/reports` is an estimate computed client-side from each payment's implied prior balance and the account's *current* rate (see `frontend/src/pages/Reports.tsx`), since the Payment Log doesn't store an interest/principal split.
- No Playwright E2E suite yet.
