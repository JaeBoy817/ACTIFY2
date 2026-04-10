-- Stripe subscription fields for Actify billing flow.
ALTER TABLE "Subscription"
ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;

ALTER TABLE "Subscription"
ADD COLUMN IF NOT EXISTS "hasActiveSubscription" BOOLEAN NOT NULL DEFAULT false;

-- Backfill active flag from existing status values.
UPDATE "Subscription"
SET "hasActiveSubscription" = CASE
  WHEN "status" IN ('ACTIVE', 'TRIALING') THEN true
  ELSE false
END
WHERE "hasActiveSubscription" IS DISTINCT FROM CASE
  WHEN "status" IN ('ACTIVE', 'TRIALING') THEN true
  ELSE false
END;

CREATE INDEX IF NOT EXISTS "Subscription_hasActiveSubscription_idx"
ON "Subscription"("hasActiveSubscription");
