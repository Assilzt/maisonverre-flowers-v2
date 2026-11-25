-- Meta Conversions API: durable queue of server-side events, and the
-- visitor's browser context kept on the order for later status events.
CREATE TABLE IF NOT EXISTS mv_capi_events (
  event_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  order_id BIGINT,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS mv_capi_events_queue ON mv_capi_events (status, available_at);
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS meta_context JSONB;
