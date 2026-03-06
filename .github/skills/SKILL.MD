# GitHub Copilot Instructions for AI PR Review System

## Project Overview

This project is an Automated GitHub Pull Request Review System built as a GitHub App.

The system:
- Receives pull request webhook events
- Fetches only changed files
- Performs deterministic static analysis using AST parsing
- Uses an open-source LLM (local via Ollama) only to explain detected issues
- Posts structured review comments back to the pull request

AI must NOT replace rule-based detection logic.

---

## Architecture Principles

### 1. Deterministic First, AI Second

- All bug detection must be implemented using rule-based static analysis.
- LLM is used only to:
  - Explain detected issues
  - Suggest possible fixes
  - Improve readability of findings

Never allow AI to decide whether an issue exists.

---

### 2. PR-Scoped Analysis Only

- Analyze only files modified in the pull request.
- Never fetch or scan entire repository.
- Avoid redundant GitHub API calls.
- Minimize token usage when sending snippets to LLM.

---

### 3. Event-Driven Design

System Flow:

Webhook → Validate Signature → Fetch Changed Files → Static Analysis → AI Explanation → Post PR Comment

Each stage must be modular and independently testable.

---

## Code Organization Guidelines

Recommended Structure:

Backend/
├── src/
│   ├── index.js
│   ├── webhooks/
│   │   └── pullRequest.js
│   ├── github/
│   │   └── octokitClient.js
│   ├── analysis/
│   │   ├── parser.js
│   │   ├── ruleEngine.js
│   │   ├── rules/
│   │   │   ├── asyncErrorRule.js
│   │   │   ├── authMiddlewareRule.js
│   │   │   └── validationRule.js
│   ├── ai/
│   │   └── explanationService.js
│   └── utils/
│       └── logger.js

---

## Static Analysis Requirements

Use:
- @babel/parser
- @babel/traverse

Rules must:
- Be deterministic
- Be modular
- Return structured objects

Issue Format:

{
  file: string,
  category: string,
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  message: string,
  snippet: string,
  line?: number
}

Avoid writing logic inside controllers.
All analysis must be isolated inside `analysis/`.

---

## LLM Integration Rules

LLM must:
- Receive only specific issue + small snippet
- Follow strict output structure
- Never analyze full repository
- Never override rule engine

Prompt Structure:

SYSTEM:
"You are a backend code review assistant..."

TASK:
"Explain the following detected issue..."

Avoid sending entire files if unnecessary.

---

## Security Requirements

- Validate webhook signature before parsing payload.
- Never log secrets.
- Use installation-specific authentication for each PR.
- Avoid token reuse.
- Handle API failures gracefully.

---

## Performance Guidelines

- Do not call GitHub APIs inside loops.
- Reuse fetched PR file list.
- Limit LLM calls (batch where possible).
- Handle pagination if PR has >30 files.

---

## Error Handling

- Wrap webhook logic in try-catch.
- Always return 200 quickly for GitHub (after async processing if needed).
- Log internal errors but avoid leaking details to PR comments.

---

## Development Constraints

Do NOT implement:
- Full repository scanning
- Auto-fix commits
- Code formatting checks
- Multi-language support
- CI enforcement

Focus only on:
PR-based static analysis + AI explanation.

---

## Engineering Philosophy

- Correctness over cleverness
- Determinism over AI guessing
- Modular over monolithic
- Clarity over complexity