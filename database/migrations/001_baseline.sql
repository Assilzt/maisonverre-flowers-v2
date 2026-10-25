CREATE TABLE IF NOT EXISTS atlasio_orders (
          id BIGSERIAL PRIMARY KEY,
          lead_id VARCHAR(64) NOT NULL UNIQUE,
          status VARCHAR(24) NOT NULL DEFAULT 'abandoned',
          campaign VARCHAR(64) NOT NULL DEFAULT 'الرابط الأساسي',
          price INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          delivery_fee INTEGER NOT NULL DEFAULT 0,
          delivery_type VARCHAR(24),
          phone VARCHAR(32) NOT NULL,
          full_name VARCHAR(160),
          wilaya VARCHAR(120),
          commune VARCHAR(160),
          source_url TEXT,
          gift_booklet BOOLEAN NOT NULL DEFAULT FALSE,
          shipping_provider_id VARCHAR(64),
          shipping_provider_name VARCHAR(160),
          stock_product_id BIGINT,
          stock_product_name VARCHAR(160),
          ship_from_stock BOOLEAN NOT NULL DEFAULT TRUE,
          ecotrack_tracking VARCHAR(120),
          ecotrack_status VARCHAR(120),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS delivery_fee INTEGER NOT NULL DEFAULT 0;

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(24);

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_tracking VARCHAR(120);

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_status VARCHAR(120);

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS gift_booklet BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS shipping_provider_id VARCHAR(64);

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS shipping_provider_name VARCHAR(160);

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS stock_product_id BIGINT;

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS stock_product_name VARCHAR(160);

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ship_from_stock BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS atlasio_stock_products (id BIGSERIAL PRIMARY KEY, name VARCHAR(160) NOT NULL, sku VARCHAR(80), quantity INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS status_before_trash VARCHAR(24);

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ;

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(32) NOT NULL DEFAULT 'pending';

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS contact_result VARCHAR(32) NOT NULL DEFAULT 'not_contacted';

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS contact_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS shipment_status VARCHAR(32) NOT NULL DEFAULT 'not_ready';

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32) NOT NULL DEFAULT 'cash_on_delivery';

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_driver VARCHAR(160);

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_driver_phone VARCHAR(32);

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_desk_phone VARCHAR(32);

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_station VARCHAR(160);

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_last_note TEXT;

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_last_activity_at TIMESTAMPTZ;

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_last_synced_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS atlasio_order_events (id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL, event_type VARCHAR(64) NOT NULL, from_value VARCHAR(64), to_value VARCHAR(64), message TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

CREATE INDEX IF NOT EXISTS atlasio_order_events_order_id_idx ON atlasio_order_events (order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS atlasio_shipment_updates (id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL, tracking VARCHAR(120) NOT NULL, source VARCHAR(24) NOT NULL, status VARCHAR(80), reason TEXT, details TEXT, station VARCHAR(160), driver VARCHAR(160), driver_phone VARCHAR(32), desk_phone VARCHAR(32), activity_date VARCHAR(32), activity_time VARCHAR(32), postponed_to VARCHAR(32), fingerprint VARCHAR(128) NOT NULL, raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

CREATE UNIQUE INDEX IF NOT EXISTS atlasio_shipment_updates_fingerprint_idx ON atlasio_shipment_updates (fingerprint);

ALTER TABLE atlasio_stock_products ADD COLUMN IF NOT EXISTS provider_id VARCHAR(64);

ALTER TABLE atlasio_stock_products ADD COLUMN IF NOT EXISTS provider_product_id VARCHAR(160);

CREATE TABLE IF NOT EXISTS atlasio_settings (
          key VARCHAR(64) PRIMARY KEY,
          value TEXT NOT NULL DEFAULT '',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

INSERT INTO atlasio_settings (key, value) VALUES ('ecotrack_provider', 'navexdelivery') ON CONFLICT (key) DO NOTHING;

INSERT INTO atlasio_settings (key, value) VALUES ('ecotrack_token', '') ON CONFLICT (key) DO NOTHING;

INSERT INTO atlasio_settings (key, value) VALUES ('delivery_fees', '{}') ON CONFLICT (key) DO NOTHING;

INSERT INTO atlasio_settings (key, value) VALUES ('shipping_providers', '[]') ON CONFLICT (key) DO NOTHING;

INSERT INTO atlasio_settings (key, value) VALUES ('active_provider_id', '') ON CONFLICT (key) DO NOTHING;

INSERT INTO atlasio_settings (key, value) VALUES ('shipping_mode', 'stock') ON CONFLICT (key) DO NOTHING;

INSERT INTO atlasio_settings (key, value) VALUES ('meta_pixel_id', '837444182648161') ON CONFLICT (key) DO NOTHING;
