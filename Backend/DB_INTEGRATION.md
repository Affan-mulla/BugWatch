# Database Setup & Integration (Backend)

## Layered Architecture

routes -> controllers -> services -> repositories -> database

- Controllers remain thin and call services only.
- Services orchestrate business flow and transactions.
- Repositories contain data access only (no Express or GitHub SDK).
- Analysis layer returns issues and does not access database directly.

## Folder Structure Changes

- Added `src/db/client.ts`
- Added `src/db/runMigrations.ts`
- Added `src/db/migrations/001_initial_schema.ts`
- Added `src/db/migrations/index.ts`
- Added `src/repositories/userRepository.ts`
- Added `src/repositories/repositoryRepository.ts`
- Added `src/repositories/prRepository.ts`
- Added `src/repositories/reviewRepository.ts`
- Added `src/repositories/issueRepository.ts`
- Added `src/repositories/webhookRepository.ts`
- Added `src/errors/DatabaseError.ts`
- Added SQL migration example `db/migrations/001_initial_schema.sql`
- Removed legacy SQLite files in `src/persistence/*`

## Migration Strategy

- Startup runs `initializeDatabase()` which:
  1. Opens PostgreSQL pool
  2. Verifies connectivity (`SELECT 1`)
  3. Executes pending migrations via `schema_migrations`
- Optional explicit migration command:
  - `npm run db:migrate`

## Updated PR Processing Flow

```text
GitHub Webhook
  -> routes/webhookRoutes
  -> controllers/webhookController (enqueue only)
  -> services/webhookQueueService
  -> services/pullRequestReviewService
       1) idempotency check (webhook_deliveries)
       2) fetch PR files (GitHub API)
       3) static analysis (deterministic)
       4) AI explanation generation (optional fallback)
       5) post PR review comment (GitHub)
       6) withTransaction:
            - upsert repository
            - upsert pull_request metadata
            - create review_run with severity counters
            - batch insert issues
       7) mark webhook delivery status
```

## Transaction & Performance Notes

- `withTransaction` wraps repo/pr/review/issues persistence atomically.
- `issueRepository.insertMany()` uses a single batched INSERT to avoid N+1 writes.
- Indexed columns:
  - `pull_requests.repository_id`
  - `review_runs.pull_request_id`
  - `issues.review_run_id`
  - `issues.severity`
- PostgreSQL connection pooling enabled via `pg.Pool`.

## Error Handling

- DB client throws `DatabaseError` for initialization/query/transaction failures.
- Startup fails fast when `DATABASE_URL` is missing or connection/migrations fail.
- Services handle errors and keep raw DB details out of controller responses.
