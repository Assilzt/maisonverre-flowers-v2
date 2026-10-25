ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS product_slug VARCHAR(80) NOT NULL DEFAULT 'flower-seed-mix';
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS order_snapshot JSONB NOT NULL DEFAULT '{}';
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS lead_token_hash TEXT;
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT;
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS remote_validated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_sync_error TEXT;
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS sync_attempt_at TIMESTAMPTZ;
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_status_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS mv_orders_provider_tracking ON atlasio_orders (shipping_provider_id, ecotrack_tracking);
CREATE TABLE IF NOT EXISTS mv_rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS mv_jobs (key TEXT PRIMARY KEY, locked_until TIMESTAMPTZ, owner TEXT);
CREATE TABLE IF NOT EXISTS mv_provider_sync (account_id TEXT PRIMARY KEY,last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS mv_notification_outbox (
  order_id BIGINT PRIMARY KEY REFERENCES atlasio_orders(id), version BIGINT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), locked_until TIMESTAMPTZ,
  last_error TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mv_landing_pages (
  slug VARCHAR(80) PRIMARY KEY, draft JSONB NOT NULL, published JSONB,
  revision INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mv_page_revisions (
  slug VARCHAR(80) REFERENCES mv_landing_pages(slug), revision INTEGER NOT NULL,
  config JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (slug,revision)
);
