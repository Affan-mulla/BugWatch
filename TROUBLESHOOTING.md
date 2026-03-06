# 🔧 Troubleshooting Checklist

**Use this guide to diagnose and fix common issues**

---

## 🏥 Health Check Commands

Run these to verify each component:

```bash
# 1. Database
docker ps | grep pr-review-db
# Expected: Container running on port 5432

# 2. Database Connection
docker exec pr-review-db psql -U affan -d pr_review -c "SELECT 1;"
# Expected: (1 row)

# 3. Backend Build
cd Backend
npm run build
# Expected: No errors, dist/ folder created

# 4. Backend Health
curl http://localhost:3000/health
# Expected: {"status":"ok","booted":true,"database":"ok"}

# 5. Ollama
ollama list
# Expected: llama3.1:8b listed

# 6. Frontend
cd Frontend
npm run build
# Expected: No errors, dist/ folder created
```

---

## ❌ Common Issues

### Issue 1: Database Connection Failed

**Symptoms:**
- Backend crashes on startup
- Error: `Database initialization failed`

**Causes:**
- PostgreSQL not running
- Wrong credentials
- Wrong port

**Solutions:**
```bash
# Check if container is running
docker ps

# If not running, start it
docker compose up -d

# Check logs
docker logs pr-review-db

# Verify credentials match Backend/.env
docker exec pr-review-db psql -U affan -d pr_review -c "\l"

# If container won't start, remove and recreate
docker compose down -v
docker compose up -d
```

---

### Issue 2: Backend Won't Start

**Symptoms:**
- `npm start` exits immediately
- TypeScript errors
- Missing environment variables

**Solutions:**
```bash
# 1. Check .env file exists
ls Backend/.env

# 2. Verify all required variables present
cd Backend
cat .env
# Required: DATABASE_URL, GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET

# 3. Rebuild TypeScript
npm run build

# 4. Check for TypeScript errors
npx tsc --noEmit

# 5. Run migrations
npm run db:migrate

# 6. Check dist/ folder exists
ls dist/

# 7. Try running directly
node dist/index.js
```

---

### Issue 3: Frontend Shows Blank Page

**Symptoms:**
- White/blank screen
- No errors in terminal
- Browser console errors

**Solutions:**
```bash
# 1. Check browser console (F12)
# Look for JavaScript errors

# 2. Verify .env file
cd Frontend
cat .env
# Should have: VITE_USE_MOCK_API=true

# 3. Clear Vite cache
rm -rf node_modules/.vite
npm run dev

# 4. Check if port 5173 is available
# Windows:
netstat -ano | findstr :5173
# If occupied, kill process or change port

# 5. Rebuild
npm run build
npm run preview
```

---

### Issue 4: Frontend API Calls Fail

**Symptoms:**
- CORS errors in console
- 404 errors
- Authentication failures

**Expected Behavior:**
- Frontend should use mock data (VITE_USE_MOCK_API=true)
- Real API not implemented yet

**If trying to connect to backend:**
```bash
# Backend doesn't have REST API implemented yet
# See ISSUES_AND_GAPS.md for details

# Frontend must stay in mock mode:
# Frontend/.env
VITE_USE_MOCK_API=true
```

---

### Issue 5: Migrations Won't Run

**Symptoms:**
- `npm run db:migrate` fails
- "Permission denied" errors
- "Relation already exists" errors

**Solutions:**
```bash
# 1. Check database connection
docker exec pr-review-db psql -U affan -d pr_review -c "SELECT 1;"

# 2. Check if migrations table exists
docker exec pr-review-db psql -U affan -d pr_review -c "\dt schema_migrations"

# 3. If corrupted, reset (⚠️ DELETES DATA)
docker compose down -v
docker compose up -d
cd Backend
npm run db:migrate

# 4. Check migration status manually
docker exec pr-review-db psql -U affan -d pr_review -c "SELECT * FROM schema_migrations;"

# 5. Rebuild backend first
npm run build
npm run db:migrate
```

---

### Issue 6: Ollama Not Responding

**Symptoms:**
- Backend logs: "AI provider timeout"
- Ollama endpoint unreachable

**Solutions:**
```bash
# 1. Check if Ollama is installed
ollama --version

# 2. Check if model is downloaded
ollama list
# Should show: llama3.1:8b

# 3. Pull model if missing
ollama pull llama3.1:8b

# 4. Test manually
ollama run llama3.1:8b "Hello"

# 5. Verify service is running
# Windows: Check Task Manager for "ollama"
# Mac/Linux: ps aux | grep ollama

# 6. Check endpoint
curl http://localhost:11434/api/tags

# 7. If not working, system still functions (AI explanations skipped)
```

---

### Issue 7: GitHub Webhook Not Triggering

**Symptoms:**
- Created PR on GitHub
- No backend logs
- No database records

**Solutions:**
```bash
# 1. Check if backend is running
curl http://localhost:3000/health

# 2. Check if webhook URL is configured in GitHub App
# GitHub App Settings > Webhook URL
# Should be: https://your-ngrok-url/webhook

# 3. Check webhook secret matches
# GitHub App webhook secret should match Backend/.env GITHUB_WEBHOOK_SECRET

# 4. Check GitHub webhook deliveries
# GitHub App Settings > Advanced > Recent Deliveries
# Check status codes and payloads

# 5. Check backend logs for HMAC errors
# If HMAC verification fails, secret is wrong

# 6. Use ngrok or smee.io for local testing
ngrok http 3000
# Update GitHub webhook URL with ngrok URL
```

---

### Issue 8: TypeScript Build Errors

**Symptoms:**
- `npm run build` fails
- Type errors
- Module not found

**Solutions:**
```bash
# Backend
cd Backend
rm -rf dist node_modules package-lock.json
npm install
npm run build

# Frontend
cd Frontend
rm -rf dist node_modules package-lock.json
npm install
npm run build

# Check TypeScript version
npx tsc --version
# Should be ~5.9.x for both
```

---

### Issue 9: Port Already in Use

**Symptoms:**
- `EADDRINUSE: address already in use`

**Solutions:**
```bash
# Windows - Find and kill process
# Backend (port 3000)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Frontend (port 5173)
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Database (port 5432)
netstat -ano | findstr :5432
# If another PostgreSQL is running, stop it or change port in docker-compose.yaml

# Mac/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

---

### Issue 10: Docker Issues

**Symptoms:**
- Container won't start
- Volume errors
- Network errors

**Solutions:**
```bash
# 1. Check Docker is running
docker --version
docker ps

# 2. Stop all containers
docker compose down

# 3. Remove volumes (⚠️ DELETES DATA)
docker compose down -v

# 4. Restart Docker Desktop

# 5. Clear Docker cache
docker system prune -a

# 6. Recreate everything
docker compose up -d --force-recreate

# 7. Check logs
docker logs pr-review-db
```

---

## 🔍 Diagnostic Commands

### Full System Check

Run this script to check everything:

```bash
# Save as check-system.sh

echo "=== Database ==="
docker ps | grep pr-review-db && echo "✅ Running" || echo "❌ Not running"

echo "\n=== Backend ==="
[ -d "Backend/dist" ] && echo "✅ Built" || echo "❌ Not built"
[ -f "Backend/.env" ] && echo "✅ .env exists" || echo "❌ .env missing"

echo "\n=== Frontend ==="
[ -d "Frontend/dist" ] && echo "✅ Built" || echo "❌ Not built"
[ -f "Frontend/.env" ] && echo "✅ .env exists" || echo "❌ .env missing"

echo "\n=== Ollama ==="
ollama list | grep llama3.1 && echo "✅ Model ready" || echo "❌ Model not found"

echo "\n=== Services ==="
curl -s http://localhost:3000/health > /dev/null && echo "✅ Backend running" || echo "❌ Backend down"
curl -s http://localhost:5173 > /dev/null && echo "✅ Frontend running" || echo "❌ Frontend down"
```

---

## 📞 Still Having Issues?

1. Check [STARTUP_GUIDE.md](STARTUP_GUIDE.md) for detailed setup
2. Review [ISSUES_AND_GAPS.md](ISSUES_AND_GAPS.md) for known limitations
3. Check [SYSTEM_STATUS.md](SYSTEM_STATUS.md) for architecture overview

---

## 🐛 Debug Mode

### Enable Verbose Logging

**Backend:**
```typescript
// Backend/src/logging/logger.ts
// Change level to 'debug'
```

**Frontend:**
```typescript
// Add to Frontend/.env
VITE_DEBUG=true
```

### Check Network Requests

**Browser DevTools:**
1. Open DevTools (F12)
2. Network tab
3. Look for failed requests
4. Check Response tab for error details

---

## ✅ Verification After Fixes

```bash
# 1. Stop everything
docker compose down
# Kill backend (Ctrl+C)
# Kill frontend (Ctrl+C)

# 2. Start in order
docker compose up -d
cd Backend && npm start &
cd Frontend && npm run dev

# 3. Test endpoints
curl http://localhost:3000/health
curl http://localhost:5173

# 4. Check database
docker exec pr-review-db psql -U affan -d pr_review -c "\dt"

# 5. Should see:
# - Backend: [info] Server booted {"port":3000}
# - Frontend: Local: http://localhost:5173/
# - Database: 8 tables listed
```
