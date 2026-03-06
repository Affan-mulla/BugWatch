
---

# 📦 Database Architecture – Automated PR Review System

## 🧠 Overview

The database acts as the persistent memory of the system.

It stores:

* Users
* Repositories
* Pull Requests
* Review Runs
* Issues detected
* Rule metadata
* Settings
* Metrics history

The database does **not** analyze code.
It only stores structured results produced by the backend.

---

# 🏗 System Interaction Flow

## High-Level Architecture

```
Frontend → Backend API → PostgreSQL (Docker)
```

* Frontend NEVER talks directly to the database.
* Backend is the only layer allowed to access Postgres.
* Database is private infrastructure.

---

# 🚀 Database Initialization

## Step 1 – Start PostgreSQL (Docker)

From project root:

```bash
docker compose up -d
```

This starts:

* PostgreSQL container
* Persistent volume storage

---

## Step 2 – Backend Connection

Backend `.env`:

```
DATABASE_URL=postgresql://affan:password@localhost:5432/pr_review
```

Backend connects to database at startup.

If connection fails → backend must crash.
Fail fast. No silent errors.

---

## Step 3 – Schema Initialization (First Time Setup)

The schema must be initialized automatically using migrations.

Recommended approach:

* Use Prisma or Drizzle ORM
* Run migrations on startup (or manually first time)

Example:

```
npx prisma migrate dev
```

This creates all required tables.

After first migration, DB structure exists permanently.

---

# 🗂 Core Database Tables

## 1️⃣ users

Stores GitHub-authenticated users.

Fields:

* id
* github_id
* username
* avatar_url
* created_at

---

## 2️⃣ repositories

Stores connected repositories.

Fields:

* id
* github_repo_id
* name
* owner
* review_enabled
* created_at

---

## 3️⃣ pull_requests

Stores PR metadata.

Fields:

* id
* github_pr_id
* repository_id
* title
* author
* status
* created_at
* merged_at

---

## 4️⃣ review_runs

Each PR update creates a review run.

Fields:

* id
* pull_request_id
* total_issues
* high_count
* medium_count
* low_count
* created_at

---

## 5️⃣ issues

Stores detected rule violations.

Fields:

* id
* review_run_id
* file_path
* line_number
* rule_name
* severity
* rule_explanation
* ai_explanation
* suggested_fix
* code_snippet

---

## 6️⃣ rules

Stores rule metadata.

Fields:

* id
* name
* category
* default_severity
* description

---

## 7️⃣ settings

Per-repository configuration.

Fields:

* id
* repository_id
* security_rules_enabled
* logic_rules_enabled
* ai_enabled
* severity_threshold

---

# 🔄 How Backend Uses the Database

## On PR Webhook Event

1. GitHub sends webhook
2. Backend fetches changed files
3. Backend runs AST rule analysis
4. Backend generates AI explanations
5. Backend stores:

   * PR metadata (if new)
   * Review run
   * All detected issues
6. Backend posts review comments to GitHub

Database becomes historical record.

---

# 🖥 How Frontend Uses the Database

Frontend never accesses DB directly.

Frontend calls backend API endpoints:

Examples:

GET `/api/repos`
GET `/api/repos/:id/prs`
GET `/api/pr/:id`
GET `/api/pr/:id/issues`
GET `/api/metrics`

Backend fetches from DB and returns JSON.

Frontend displays:

* PR list
* Issue breakdown
* Code diff with markers
* Metrics graphs
* Settings

---

# 🧩 How Diff Viewer Works with DB

Diff itself comes from:

* GitHub API (patch)
  or
* Stored patch in DB (optional)

Issues table contains:

* file_path
* line_number

Frontend:

1. Loads PR diff
2. Loads issues for PR
3. Highlights lines with issues
4. Displays explanation panel

Database does not store full file.
Only stores issue metadata.

---

# 🤖 What Your Agent Is Responsible For

Your AI agent does NOT control the database directly.

Agent responsibilities:

* Analyze AST
* Detect rule violations
* Generate explanation text

Backend responsibilities:

* Persist agent output into database
* Enforce schema
* Handle failures
* Maintain integrity

Agent is logic.
Backend is authority.

---

# 🔐 Security Rules

* Database must not be exposed publicly
* Only backend connects
* Use environment variables
* No secrets in frontend
* Use SSL in production

---

# 🧪 Development Workflow

1. Start Docker
2. Start Backend
3. Run migrations
4. Start Frontend
5. Create PR
6. Webhook triggers backend
7. Issues stored
8. Frontend fetches and displays

---

# 📊 Why Database Is Required

Without DB:

* No review history
* No metrics
* No trends
* No per-repo settings
* No audit trail

With DB:

System becomes:

Persistent
Trackable
Measurable
Professional

---

# 🎯 Final Mental Model

Backend = Brain
Database = Memory
Frontend = Visual Cortex

If memory is missing, your system cannot learn from past mistakes.

And a review system without history is just a comment bot.

---
