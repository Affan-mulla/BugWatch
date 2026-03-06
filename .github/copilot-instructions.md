# 📋 Project Overview

The **Automated Pull Request Review System** is a GitHub App built to streamline code review processes by automatically analyzing only the modified files in a pull request and providing structured, actionable feedback directly on the PR.

This system acts as a first-pass reviewer for development teams, identifying logical, security, and correctness issues in both frontend (React, JavaScript, TypeScript) and backend (Node.js, Express) codebases.

---

# 🎯 Core Objectives

- **Automated Analysis**: Perform static code analysis on PR changes without manual intervention
- **Deterministic Detection**: Use AST parsing and rule-based analysis for reliable issue identification
- **AI-Assisted Explanation**: Leverage LLM (Llama 3.1 8B, Dolphin-tuned) only for generating human-readable explanations
- **Transparency**: Ensure all detected issues are based on explicit rules, not opaque AI decisions
- **Professional Quality**: Mirror industry-standard developer tools with emphasis on correctness

---

# 🏗 System Architecture

https://app.eraser.io/workspace/35wqK5RdzV3jrfMi6n2A?origin=share

---

# 🔧 Key Components

## 1. GitHub Integration

- **GitHub App**: Registered application with webhook subscriptions
- **Webhook Handler**: Receives pull_request events (opened, synchronize, reopened)
- **API Client**: Fetches PR metadata, changed files, and posts review comments

## 2. Static Analysis Engine

- **AST Parser**: Parses JavaScript, TypeScript, and React/JSX code into Abstract Syntax Trees
- **Rule-Based Analyzer**: Deterministic detection engine with multiple rule categories:
    - **Security Rules**: SQL injection, XSS vulnerabilities, hardcoded secrets, unsafe eval usage
    - **Logic Rules**: Missing error handling, improper null checks, resource leaks, race conditions
    - **Pattern Rules**: Code smells, anti-patterns, performance issues

## 3. AI Explanation Layer

- **Model**: Llama 3.1 8B (Dolphin-tuned) - open-source LLM
- **Purpose**: Converts detected rule violations into clear, human-readable explanations
- **Role**: Does NOT determine what is a bug; only explains pre-detected issues
- **Output**: Suggested fixes and context-aware recommendations

## 4. Review System

- **Review Formatter**: Structures findings into GitHub-compatible review comments
- **Comment Poster**: Publishes inline comments at specific file locations
- **Batch Processing**: Handles multiple issues efficiently

## 5. Dashboard (Optional)

- **Read-Only Interface**: Displays historical review results
- **Metrics**: Shows trends, common issues, and team statistics
- **Lightweight**: Minimal overhead, focused on data presentation

## 6. Storage

- **Database**: Stores review history, detected issues, and metadata
- **Schema**: Tracks PRs, files analyzed, issues found, timestamps

---

# 💻 Technical Stack

## Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript/TypeScript
- **AST Parsing**: @babel/parser, @typescript-eslint/parser
- **API Integration**: @octokit/rest (GitHub API client)

## AI/ML

- **Model**: Llama 3.1 8B (Dolphin-tuned variant)
- **Interface**: Local inference or API endpoint
- **Framework**: Ollama / llama.cpp compatible

## Frontend (Dashboard)

- **Library**: React
- **Language**: JavaScript/TypeScript
- **Styling**: CSS/Tailwind (lightweight)

## Database

- **Options**: PostgreSQL, MongoDB, or SQLite
- **Purpose**: Review history and metrics storage

---

# 🔄 Event-Driven Workflow

1. **Trigger**: Developer opens or updates a pull request
2. **Webhook Event**: GitHub sends webhook payload to backend service
3. **File Retrieval**: System fetches only the modified files via GitHub API
4. **AST Parsing**: Changed files are parsed into Abstract Syntax Trees
5. **Rule Analysis**: Rule engine scans AST for predefined issue patterns
6. **Issue Detection**: Security, logic, and pattern violations are identified
7. **AI Explanation**: LLM converts technical findings into readable explanations
8. **Review Posting**: Structured comments are posted to the PR at specific line numbers
9. **Storage**: Review results are logged to database
10. **Dashboard Update**: Metrics and history are updated for visualization

---

# ✨ Core Features

## Static Analysis Capabilities

- ✅ Missing input validation detection
- ✅ Improper error handling identification
- ✅ Unsafe concurrency pattern detection
- ✅ Missing authentication/authorization checks
- ✅ SQL injection vulnerability scanning
- ✅ XSS vulnerability detection
- ✅ Hardcoded credential detection
- ✅ Resource leak identification
- ✅ Null/undefined reference checking

## Integration Features

- ✅ GitHub App authentication
- ✅ Webhook-driven automation
- ✅ Inline PR comments at specific lines
- ✅ Changed files only analysis (efficient)
- ✅ Batch comment posting

## AI Assistance

- ✅ Human-readable issue explanations
- ✅ Context-aware fix suggestions
- ✅ Code example generation
- ✅ Transparent reasoning (rule + explanation)

---

# 🎨 Design Principles

## 1. **Correctness First**

All issue detection is rule-based and deterministic. AI is used only for explanation, not decision-making.

## 2. **Transparency**

Every detected issue traces back to a specific rule. No "black box" AI decisions.

## 3. **Professional Quality**

System mirrors production-grade developer tools used in industry (SonarQube, CodeClimate, etc.)

## 4. **Efficiency**

Analyzes only changed files, not entire codebase, to minimize processing time.

## 5. **Explainability**

Each finding includes:

- Rule violated
- File and line location
- Clear explanation
- Suggested fix
- Severity level

## 6. **Non-Intrusive**

Acts as advisor, not enforcer. Developers maintain final decision authority.

---

# 📊 Use Cases

- **Early Issue Detection**: Catch bugs before human reviewers invest time
- **Team Onboarding**: Help junior developers learn best practices
- **Consistency Enforcement**: Apply coding standards uniformly
- **Security Scanning**: Identify vulnerabilities early in development
- **Technical Debt Management**: Track and highlight code smells
- **Review Load Reduction**: Free up senior developers from routine checks

---

# 🚀 Project Status

This is an academic/educational project designed to demonstrate:

- Real-world software engineering practices
- Integration of AI with deterministic systems
- Professional developer tooling architecture
- Responsible AI usage (transparent, explainable, limited scope)

---

# 📝 Technical Highlights

## AST-Based Analysis

Using Abstract Syntax Trees ensures precise code understanding without regex-based heuristics.

## Rule Engine Architecture

Modular design allows easy addition of new rules without system refactoring.

## Hybrid AI Approach

Combines deterministic analysis reliability with AI's natural language capabilities.

## Event-Driven Design

Webhook-based architecture ensures real-time responsiveness and scalability.

---

# 🎓 Learning Outcomes

- Understanding static code analysis techniques
- GitHub App development and webhook handling
- AST parsing and traversal
- Responsible AI integration in software tools
- Event-driven architecture patterns
- Professional code review automation

---

