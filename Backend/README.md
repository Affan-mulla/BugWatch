# Backend Setup

## Quick Start (PostgreSQL + Backend)

### 1) Start PostgreSQL (Docker)
From repository root:

```bash
docker compose up -d
```

This starts PostgreSQL using `docker.compose.yaml` on port `5432`.

### 2) Configure environment
Create `Backend/.env` (or update existing):

```env
PORT=3000
DATABASE_URL=postgresql://affan:axon0023@localhost:5432/pr_review
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

The backend fails fast if required variables are missing or DB connection fails.

### 3) Install dependencies
From `Backend/`:

```bash
npm install
```

### 4) Run migrations
From `Backend/`:

```bash
npm run db:migrate
```

### 5) Build and run backend
From `Backend/`:

```bash
npm run build
npm start
```

### 6) Run tests
From `Backend/`:

```bash
npm test
```

## Layer Boundaries

- `routes -> controllers -> services -> repositories -> db`
- Controllers do not execute SQL.
- Repositories contain data access logic only.
- Analysis layer does not access DB directly.

## Notes

- Migrations run automatically on app startup via `initializeDatabase()`.
- `npm run db:migrate` is also available for explicit migration execution.
- Database pool is shut down gracefully on `SIGINT` and `SIGTERM`.
