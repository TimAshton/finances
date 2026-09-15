# finances

A locally-run web app for tracking family bills, debt, and payoff plans. No cloud, no accounts, no bank integrations — everything lives in a local SQLite database and a `.env` file that never leaves your machine. See `SPEC.md` for the full design.

## Run it

```bash
cp .env.example .env   # fill in your real account details
docker compose up --build
```

Open `http://localhost:8000`.

## Develop it

Backend (Python 3.12 required — see `CLAUDE.md` for why):
```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --app-dir backend --reload --port 8000   # run from repo root
python -m pytest -q                                            # tests
```

Frontend:
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api to :8000
```

See `CLAUDE.md` for architecture notes and more commands.
