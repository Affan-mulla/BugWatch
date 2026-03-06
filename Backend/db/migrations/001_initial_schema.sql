CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high');

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  github_id BIGINT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE repositories (
  id BIGSERIAL PRIMARY KEY,
  github_repo_id BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  review_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pull_requests (
  id BIGSERIAL PRIMARY KEY,
  github_pr_id BIGINT,
  repository_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  status TEXT NOT NULL,
  head_sha TEXT NOT NULL,
  base_sha TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  merged_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(repository_id, number)
);

CREATE TABLE review_runs (
  id BIGSERIAL PRIMARY KEY,
  pull_request_id BIGINT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  head_sha TEXT NOT NULL,
  total_issues INTEGER NOT NULL,
  high_count INTEGER NOT NULL DEFAULT 0,
  medium_count INTEGER NOT NULL DEFAULT 0,
  low_count INTEGER NOT NULL DEFAULT 0,
  ai_mode TEXT NOT NULL,
  review_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pull_request_id, head_sha)
);

CREATE TABLE rules (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  default_severity severity_level NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE issues (
  id BIGSERIAL PRIMARY KEY,
  review_run_id BIGINT NOT NULL REFERENCES review_runs(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  rule_name TEXT NOT NULL,
  severity severity_level NOT NULL,
  rule_explanation TEXT,
  ai_explanation TEXT,
  suggested_fix TEXT,
  code_snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE settings (
  id BIGSERIAL PRIMARY KEY,
  repository_id BIGINT NOT NULL UNIQUE REFERENCES repositories(id) ON DELETE CASCADE,
  security_rules_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  logic_rules_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  severity_threshold severity_level NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  delivery_id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  error_message TEXT
);

CREATE INDEX idx_pull_requests_repository_id ON pull_requests(repository_id);
CREATE INDEX idx_review_runs_pull_request_id ON review_runs(pull_request_id);
CREATE INDEX idx_issues_review_run_id ON issues(review_run_id);
CREATE INDEX idx_issues_severity ON issues(severity);
