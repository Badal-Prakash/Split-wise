# Splitwise Clone

Production-oriented Next.js 15 + MongoDB implementation of a Splitwise-style expense platform with a real balance engine, multi-payer expenses, rich splits, settlements, recurring expenses, import preview, and mobile-first UI shell.

## Included
- JWT email/password auth with refresh cookies, password reset endpoints, protected middleware
- Groups, expenses, settlements, friends, comments, notifications, analytics, import preview, recurring expenses, debt simplification
- Cents-based split engine for equal, exact, percentage, share, unequal, and adjustment splits
- Dynamic historical balance recalculation from expenses plus settlement records
- Soft-delete/edit history for expenses, group balance summaries, searchable expenses/groups/users
- Responsive App Router UI, dark mode, mobile bottom nav, charts, PWA manifest/service worker
- Docker, seed script, Jest test, CI workflow, Postman collection

## Run locally
1. `cp .env.example .env`
2. `npm install`
3. `docker compose up -d mongo`
4. `npm run seed`
5. `npm run dev`

## Core API
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | register |
| POST | `/api/auth/login` | login |
| POST | `/api/auth/logout` | logout |
| POST | `/api/auth/refresh` | refresh JWT |
| GET/POST | `/api/groups` | list/create groups |
| GET/PATCH | `/api/groups/:id` | read/update group |
| GET/POST | `/api/expenses` | list/create expenses |
| PATCH/DELETE | `/api/expenses/:id` | update/delete expense |
| POST | `/api/expenses/:id/comments` | add comments, replies, and mentions |
| GET/POST | `/api/settlements` | list/create settlements |
| GET | `/api/balances` | user/group raw and simplified balances |
| GET/POST | `/api/friends` | list/create friend relationships |
| GET/POST/PATCH | `/api/recurring` | manage recurring expenses and generate due occurrences |
| GET | `/api/search` | search expenses, groups, and users |
| GET | `/api/analytics/monthly` | monthly totals |
| POST | `/api/import/splitwise` | CSV/XLSX preview |

## Architecture
`models` own Mongo shape, `services` own business logic, `validators` own zod contracts, `app/api` owns transport, and UI pages stay thin. That separation is deliberate: features such as notifications, recurring jobs, OCR, and email delivery can grow without turning routes into mud.

## Deployment notes
- Set strong JWT secrets and secure cookie domains in production.
- Put the app behind TLS and a reverse proxy with upload limits.
- Use MongoDB replica sets for transactions.
- Add a queue/worker for recurring expenses, email, OCR, push notifications, and background sync.
- Use object storage for receipts instead of local disk.

## Splitwise-compatible domain behavior
- Expenses support multiple payers, participant subsets, excluded members, notes, tags, categories, attachments, recurring templates, comments, reactions, edit history, and soft delete.
- Balances are recalculated from immutable expense/settlement history and can be viewed globally, per group, or per user.
- Debt simplification uses a net-balance min-cash-flow pass to reduce settlement count while preserving what each member owes.
- Imports parse CSV/XLSX exports, normalize common Splitwise columns, identify duplicates, surface validation errors, and return a rollback token for wizard-driven imports.
# Split-wise
# Split-wise
