# Run / Start Instructions (End-to-End MVP)

## 1) Prerequisites
- Node.js 18+
- Docker Desktop running
- A GitHub App configured for webhook + repo access
- A GitHub OAuth App secret available
- (Optional) Ollama running for AI explanations

## 2) Environment Setup

### Backend .env
File: Backend/.env
Required keys:
- DATABASE_URL=postgresql://affan:axon0023@localhost:5432/pr_review
- GITHUB_APP_ID=...
- GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
- GITHUB_WEBHOOK_SECRET=...
- GITHUB_CLIENT_ID=...
- GITHUB_CLIENT_SECRET=...
- GITHUB_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
- AUTH_TOKEN_SECRET=...
- FRONTEND_ORIGIN=http://localhost:5173

### Frontend .env
File: Frontend/.env
- VITE_API_BASE_URL=http://localhost:3000
- VITE_GITHUB_CLIENT_ID=...
- VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback

## 3) Start Database
From workspace root:
- docker compose -f docker.compose.yaml up -d

## 4) Build + Migrate Backend
From Backend:
- npm install
- npm run build
- npm run db:migrate

## 5) Start Backend
From Backend:
- npm start

Health check:
- GET http://localhost:3000/health

## 6) Start Frontend
From Frontend:
- npm install
- npm run dev

Open:
- http://localhost:5173

## 7) OAuth Login Flow
1. Open Login page
2. Click Continue with GitHub
3. Authorize on GitHub
4. Redirect to /auth/callback
5. Frontend exchanges code with backend and stores session token

## 8) API Endpoints Implemented
- GET /api/repos
- GET /api/repos/:repoId/prs
- GET /api/pr/:prId
- GET /api/pr/:prId/issues
- GET /api/pr/:prId/diff
- PATCH /api/repos/:repoId/settings
- GET /api/repos/:repoId/settings
- PATCH /api/repos/:repoId/review-state
- GET /api/metrics

Auth endpoints:
- GET /api/auth/github/login
- POST /api/auth/github/exchange
- GET /api/auth/me
- POST /api/auth/logout

## 9) Webhook to Data Flow
1. GitHub sends webhook -> POST /webhook
2. Backend verifies signature
3. Backend runs static analysis (+ AI explanation if enabled)
4. Backend stores repository, PR, review_run, issues in Postgres
5. Frontend fetches stored data from REST APIs

## 10) Verification Checklist
- Backend build passes: npm run build
- Frontend build passes: npm run build
- Backend tests pass: npm test (Backend)
- Health endpoint returns 200
- Login succeeds with real GitHub OAuth secret
- Repositories, PRs, issues, diff load from backend (not mock)

## 11) Notes
- Mock API file was removed; frontend now uses real backend only.
- If OAuth secret is invalid/missing, login fails (expected).
- If Docker is down, backend DB init fails fast (expected).
