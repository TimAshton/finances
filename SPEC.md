# SPEC.md — Family Finance Tracker

## Overview

A locally-run web application for tracking and improving family bills and finances. Runs entirely on localhost — no cloud, no deployment, no authentication. Sensitive account details live in a `.env` file that is never committed. The database is local and also excluded from version control.

---

## Privacy Model

This is the most important constraint in the project.

```
.env                  ← account names, numbers, balances, rates — NEVER committed
db/finance.db         ← local SQLite database — NEVER committed
.gitignore            ← must exclude both from day one
```

`.env.example` IS committed — it contains all the variable names with empty values so the structure is documented without exposing any real data.

---

## .env Structure

```env
# Mortgage
MORTGAGE_LENDER=
MORTGAGE_ACCOUNT=
MORTGAGE_BALANCE=
MORTGAGE_RATE=
MORTGAGE_MINIMUM=
MORTGAGE_DUE_DAY=

# Auto Loan
AUTO_LENDER=
AUTO_ACCOUNT=
AUTO_BALANCE=
AUTO_RATE=
AUTO_MINIMUM=
AUTO_DUE_DAY=

# Credit Cards (add as many blocks as needed)
CC1_NAME=
CC1_ACCOUNT=
CC1_BALANCE=
CC1_RATE=
CC1_LIMIT=
CC1_MINIMUM=
CC1_DUE_DAY=

CC2_NAME=
CC2_ACCOUNT=
CC2_BALANCE=
CC2_RATE=
CC2_LIMIT=
CC2_MINIMUM=
CC2_DUE_DAY=

# Utilities / Subscriptions
ELECTRIC_PROVIDER=
ELECTRIC_AMOUNT=
ELECTRIC_DUE_DAY=

INTERNET_PROVIDER=
INTERNET_AMOUNT=
INTERNET_DUE_DAY=
```

---

## Tech Stack

- **Frontend:** React + TypeScript (Vite) — runs in browser at localhost
- **Backend:** Python / FastAPI — local API server
- **Database:** SQLite (local file, gitignored)
- **ORM:** SQLAlchemy
- **Config:** python-dotenv — loads `.env` on startup

Single Docker container — FastAPI serves both the API and the pre-built React frontend as static files. One command to start everything.

---

## Data Model

### Bill / Account

```json
{
  "id": "uuid",
  "name": "Chase Sapphire",
  "category": "credit_card | mortgage | auto | student_loan | consolidation_loan | insurance | utility | subscription | other",
  "lender": "string",
  "balance": "decimal",
  "interest_rate": "decimal (APR %)",
  "credit_limit": "decimal (credit cards only)",
  "purchase_price": "decimal (mortgage/property accounts only)",
  "market_value": "decimal (mortgage/property accounts only; current estimated value, e.g. a Zestimate)",
  "minimum_payment": "decimal",
  "due_day": "int (day of month, 1-31)",
  "is_active": "boolean",
  "notes": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Payment Log

```json
{
  "id": "uuid",
  "account_id": "uuid (FK)",
  "amount": "decimal",
  "paid_on": "date",
  "new_balance": "decimal",
  "notes": "string"
}
```

### Monthly Snapshot

```json
{
  "id": "uuid",
  "snapshot_date": "date",
  "total_debt": "decimal",
  "total_monthly_minimums": "decimal",
  "net_worth_delta": "decimal"
}
```

---

## Pages

### `/` — Dashboard
- Total debt across all accounts
- Total minimum payments due this month
- Accounts due in the next 7 days (highlighted)
- Month-over-month debt reduction chart
- Quick summary cards per account (name, balance, rate, next due date)

### `/accounts` — All Accounts
- List of all active bills and accounts
- Sortable by balance, rate, due date, minimum payment
- Add / edit / deactivate account
- Color coding by category

### `/accounts/:id` — Account Detail
- Full account info
- Payoff calculator:
  - At minimum payment → months to payoff + total interest paid
  - At custom payment → months to payoff + total interest paid
  - Extra $X/month → how much interest saved
- Payment history log
- Add payment button (logs payment, updates balance)
- Interest rate history (if rate has changed over time)

### `/payoff` — Payoff Planner
- Compare payoff strategies across all accounts:
  - **Avalanche** — highest interest rate first (least total interest)
  - **Snowball** — lowest balance first (fastest psychological wins)
- Input: total extra monthly budget available
- Output: month-by-month payoff order and projected payoff date for each account
- Total interest saved vs minimum-only baseline

### `/calendar` — Bill Calendar
- Month view showing when each bill is due
- Click a bill to see details and log a payment
- Highlight overdue / unpaid bills

### `/reports` — Reports
- Monthly spending by category
- Debt reduction over time (line chart)
- Interest paid over time
- Net debt trend

### `/settings` — Settings
- Re-import account data from `.env` (refreshes balances/rates from file)
- Backup database (download SQLite file)
- Reset / clear data

---

## Payoff Calculator Logic

For a single account:

```
months_to_payoff = -log(1 - (rate/12 * balance) / payment) / log(1 + rate/12)
total_interest = (payment * months_to_payoff) - balance
```

Avalanche strategy — sort accounts by APR descending, apply extra budget to highest rate first while paying minimums on all others.

Snowball strategy — sort accounts by balance ascending, apply extra budget to lowest balance first.

---

## Local Setup

```bash
# Clone repo
git clone ...

# Copy env template and fill in your details
cp .env.example .env

# Build and run
docker compose up --build
```

App runs at `http://localhost:8000`

### How it works
- Vite builds the React frontend to `/app/static`
- FastAPI serves the static files at `/` and the API at `/api`
- SQLite database mounts from `./db/finance.db` on your local machine (gitignored)
- `.env` mounts into the container at runtime (never copied into the image)

### docker-compose.yml (generated by Claude Code)
```yaml
services:
  app:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./db:/app/db        # persistent local database
      - ./.env:/app/.env    # sensitive config, never in image
    restart: unless-stopped
```

---

## .gitignore Requirements

```gitignore
# Sensitive — never commit
.env
db/
*.sqlite3
*.db

# Python
__pycache__/
.venv/

# Node
node_modules/
dist/
```

---

## Testing

- **Pytest** — payoff calculation logic, API endpoints
- **Playwright** — E2E tests for all pages
- Calculations should have unit tests with known inputs and verified outputs

---

## Out of Scope

- Cloud deployment of any kind
- User accounts or multi-user support
- Mobile support
- Bank API integrations (Plaid etc) — manual entry only for now
- Automatic bill payment