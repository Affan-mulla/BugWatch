# 🚀 Startup Guide – Automated PR Review System

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** (v18 or higher)
- **Docker Desktop** (for PostgreSQL)
- **Ollama** (for AI explanations) - [Download here](https://ollama.ai/)
- **GitHub App** credentials (App ID, Private Key, Webhook Secret)

---

## 🗂 Project Structure

```
AI-code-review-assistant/
├── Backend/          # Node.js/Express backend with webhook handler
├── Frontend/         # React frontend dashboard
└── docker.compose.yaml  # PostgreSQL database
```

---

## 🔧 Setup Instructions

### 1️⃣ Database Setup (PostgreSQL via Docker)

Start the PostgreSQL container:

```bash
# From project root
docker compose up -d
```

Verify it's running:

```bash
docker ps
# You should see: pr-review-db container running on port 5432
```

**Database Configuration:**
- Host: `localhost`
- Port: `5432`
- Database: `pr_review`
- User: `affan`
- Password: `axon0023`

---

### 2️⃣ Backend Setup

Navigate to backend directory:

```bash
cd Backend
```

Install dependencies:

```bash
npm install
```

Configure environment variables (Backend/.env):

```env
# GitHub App Configuration
GITHUB_APP_ID=2914927
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=affan0023

# Database
DATABASE_URL=postgresql://affan:axon0023@localhost:5432/pr_review

# Server
PORT=3000

# AI Configuration (Ollama)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
AI_TIMEOUT_MS=8000

# GitHub Review Settings
GITHUB_INLINE_REVIEW_MODE=true
MAX_FILES_PER_PR=100
MAX_FILE_PATCH_KB=120
MAX_AST_INPUT_KB=256
MAX_ISSUES_PER_FILE=20
```

Build the backend:

```bash
npm run build
```

Run database migrations:

```bash
npm run db:migrate
```

Start the backend server:

```bash
npm start
```

**Expected output:**
```
[info] Database initialized
[info] Server booted {"port":3000}
```

---

### 3️⃣ AI Setup (Ollama)

Install Ollama from [https://ollama.ai/](https://ollama.ai/)

Pull the required model:

```bash
ollama pull llama3.1:8b
```

Verify Ollama is running:

```bash
# Ollama should be running on http://localhost:11434
curl http://localhost:11434/api/tags
```

---

### 4️⃣ Frontend Setup

Navigate to frontend directory:

```bash
cd Frontend
```

Install dependencies:

```bash
npm install
```

Configure environment variables (Frontend/.env):

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_MOCK_API=true

# GitHub OAuth (for future authentication)
VITE_GITHUB_CLIENT_ID=Ov23li525BEe4lyoEe5b
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback
```

**Note:** The frontend is currently configured to use mock data (`VITE_USE_MOCK_API=true`) because the backend REST API is not yet implemented.

Start the development server:

```bash
npm run dev
```

**Expected output:**
```
  VITE v7.3.1  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 🎯 Testing the Webhook Flow

### 1. Expose Backend Locally (for GitHub webhook testing)

Use a tool like **ngrok** or **smee.io**:

```bash
# Using ngrok
ngrok http 3000
```

### 2. Configure GitHub App Webhook URL

In your GitHub App settings:
- Webhook URL: `https://your-ngrok-url.ngrok.io/webhook`
- Webhook Secret: `affan0023` (from .env)

### 3. Create a Pull Request

1. Install the GitHub App on a test repository
2. Create a pull request
3. Backend should receive webhook and process it
4. Check backend logs for processing confirmation

---

## 📊 Accessing the Application

| Component | URL | Status |
|-----------|-----|--------|
| Frontend Dashboard | http://localhost:5173 | ✅ Running (Mock Data) |
| Backend API | http://localhost:3000 | ✅ Running (Webhook Only) |
| Database | localhost:5432 | ✅ Running |
| Ollama AI | http://localhost:11434 | ⚠️ Must be started separately |

---

## 🧪 Verification Checklist

- [ ] PostgreSQL container running (`docker ps`)
- [ ] Backend starts without errors (`npm start` in Backend/)
- [ ] Database migrations applied successfully
- [ ] Ollama service running locally
- [ ] Frontend loads at http://localhost:5173
- [ ] No TypeScript compilation errors

---

## 🛠 Development Commands

### Backend

```bash
# Build TypeScript
npm run build

# Run migrations
npm run db:migrate

# Start server
npm start

# Run tests
npm test

# Watch mode tests
npm run test:watch
```

### Frontend

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

---

## 🔍 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps

# View logs
docker logs pr-review-db

# Restart container
docker compose restart
```

### Backend Won't Start

1. Check `.env` file exists in Backend/
2. Verify `DATABASE_URL` is correct
3. Ensure PostgreSQL is running
4. Run migrations: `npm run db:migrate`

### Frontend API Errors

The frontend currently uses mock data by default. To connect to real backend:
1. Set `VITE_USE_MOCK_API=false` in Frontend/.env
2. Ensure backend REST API endpoints are implemented (currently missing)

### Ollama Not Working

```bash
# Check if Ollama is running
ollama list

# Pull model
ollama pull llama3.1:8b

# Test manually
ollama run llama3.1:8b "Hello"
```

---

## 🎓 Next Steps

1. **Test Webhook Flow**: Create a PR on GitHub and verify backend receives it
2. **Implement REST API**: Backend needs API endpoints for frontend integration
3. **Add Authentication**: Implement GitHub OAuth flow
4. **Test End-to-End**: Full workflow from PR creation to review posting

---

## 📚 Additional Documentation

- [Backend Progress Notes](Backend/BACKEND_PROGRESS_NOTES.md)
- [Database Integration Guide](Backend/DB_INTEGRATION.md)
- [Frontend Objectives](Frontend/OBJECTIVE.MD)
- [Project Overview](README.md)
- [Database Architecture](DB.md)

---

## 🆘 Support

Check the [ISSUES_AND_GAPS.md](ISSUES_AND_GAPS.md) file for known limitations and missing features.
