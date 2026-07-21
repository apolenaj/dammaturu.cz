/**
 * Billing / subscriptions — Stripe-backed entitlements (D-061).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";
import { timestamps } from "@/db/schema/enums";

export const billingSubscriptions = pgTable(
  "billing_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    learnerKey: varchar("learner_key", { length: 64 }).notNull(),
    planId: varchar("plan_id", { length: 32 }).notNull().default("free"),
    status: varchar("status", { length: 32 }).notNull().default("none"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 120 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 120 }),
    stripePriceId: varchar("stripe_price_id", { length: 120 }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    lastPaymentError: text("last_payment_error"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("billing_subscriptions_user_uidx").on(t.userId),
    uniqueIndex("billing_subscriptions_learner_uidx").on(t.learnerKey),
    uniqueIndex("billing_subscriptions_stripe_customer_uidx").on(
      t.stripeCustomerId,
    ),
    uniqueIndex("billing_subscriptions_stripe_sub_uidx").on(
      t.stripeSubscriptionId,
    ),
    index("billing_subscriptions_status_idx").on(t.status),
  ],
);

export const billingEvents = pgTable(
  "billing_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stripeEventId: varchar("stripe_event_id", { length: 120 }).notNull(),
    type: varchar("type", { length: 120 }).notNull(),
    learnerKey: varchar("learner_key", { length: 64 }),
    payloadSummary: text("payload_summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("billing_events_stripe_event_uidx").on(t.stripeEventId),
    index("billing_events_learner_idx").on(t.learnerKey),
  ],
);
