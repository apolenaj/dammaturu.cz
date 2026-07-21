-- DámMaturu billing / Stripe subscriptions (D-061)
-- Apply after 0003:
--   psql "$DATABASE_URL" -f src/db/migrations/0004_billing.sql

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learner_key varchar(64) NOT NULL,
  plan_id varchar(32) NOT NULL DEFAULT 'free',
  status varchar(32) NOT NULL DEFAULT 'none',
  stripe_customer_id varchar(120),
  stripe_subscription_id varchar(120),
  stripe_price_id varchar(120),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  trial_ends_at timestamptz,
  last_payment_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_user_uidx
  ON billing_subscriptions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_learner_uidx
  ON billing_subscriptions (learner_key);
CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_stripe_customer_uidx
  ON billing_subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_stripe_sub_uidx
  ON billing_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS billing_subscriptions_status_idx
  ON billing_subscriptions (status);

CREATE TABLE IF NOT EXISTS billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id varchar(120) NOT NULL,
  type varchar(120) NOT NULL,
  learner_key varchar(64),
  payload_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_events_stripe_event_uidx
  ON billing_events (stripe_event_id);
CREATE INDEX IF NOT EXISTS billing_events_learner_idx
  ON billing_events (learner_key);
