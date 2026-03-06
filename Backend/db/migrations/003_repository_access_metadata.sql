ALTER TABLE repositories
  ADD COLUMN IF NOT EXISTS installation_status TEXT NOT NULL DEFAULT 'not_installed',
  ADD COLUMN IF NOT EXISTS installation_id BIGINT,
  ADD COLUMN IF NOT EXISTS access_checked_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'repositories_installation_status_check'
  ) THEN
    ALTER TABLE repositories
      ADD CONSTRAINT repositories_installation_status_check
      CHECK (installation_status IN ('installed', 'not_installed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_repositories_installation_status
  ON repositories(installation_status);

CREATE INDEX IF NOT EXISTS idx_repositories_installation_id
  ON repositories(installation_id)
  WHERE installation_id IS NOT NULL;

-- Rollback SQL (manual):
-- DROP INDEX IF EXISTS idx_repositories_installation_id;
-- DROP INDEX IF EXISTS idx_repositories_installation_status;
-- ALTER TABLE repositories DROP CONSTRAINT IF EXISTS repositories_installation_status_check;
-- ALTER TABLE repositories
--   DROP COLUMN IF EXISTS access_checked_at,
--   DROP COLUMN IF EXISTS installation_id,
--   DROP COLUMN IF EXISTS installation_status;
