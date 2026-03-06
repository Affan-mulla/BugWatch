j# Current Issues / Runtime Blockers

## 1) Docker Engine not running in this environment
Observed during validation:
- `docker compose -f docker.compose.yaml up -d` failed because Docker Desktop engine pipe was unavailable.

Impact:
- PostgreSQL container cannot start here.
- End-to-end runtime smoke test (web app + DB + webhook persistence) could not be fully executed in this environment.

Fix:
- Start Docker Desktop and ensure Linux engine is running.

## 2) OAuth client secret placeholder still needs real value
Backend .env currently contains:
- `GITHUB_CLIENT_SECRET=CHANGE_ME_GITHUB_CLIENT_SECRET`

Impact:
- GitHub OAuth code exchange will fail until this is replaced.

Fix:
- Set real GitHub OAuth app secret in Backend/.env.

## 3) Local-only credential dependency
System requires valid GitHub App credentials and private key to perform real webhook + PR API operations.

Impact:
- If any key is invalid, login/webhook/PR-diff calls will fail.

Fix:
- Verify these keys in Backend/.env:
  - GITHUB_APP_ID
  - GITHUB_PRIVATE_KEY
  - GITHUB_WEBHOOK_SECRET
  - GITHUB_CLIENT_ID
  - GITHUB_CLIENT_SECRET
  - GITHUB_OAUTH_REDIRECT_URI

## 4) Compose warning in file
Docker emitted warning:
- `version` field in docker.compose.yaml is obsolete.

Impact:
- Non-blocking.

Fix:
- Remove top-level `version:` line from docker.compose.yaml (optional cleanup).

## 5) Security advisory notices from npm audit
Backend install reports high severity advisories in dependency tree.

Impact:
- Not blocking local run, but should be reviewed before production.

Fix:
- Run `npm audit` and resolve with controlled upgrades.
