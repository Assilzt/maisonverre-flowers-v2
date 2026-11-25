-- Product images uploaded from the dashboard, served by /api/media.
CREATE TABLE IF NOT EXISTS mv_media (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
