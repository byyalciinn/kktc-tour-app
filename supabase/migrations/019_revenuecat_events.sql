-- RevenueCat webhook event log for subscription sync

CREATE TABLE IF NOT EXISTS revenuecat_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT UNIQUE,
  app_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entitlement_ids TEXT[] DEFAULT '{}',
  product_id TEXT,
  environment TEXT,
  raw_event JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS revenuecat_events_app_user_id_idx
  ON revenuecat_events(app_user_id);
