import "server-only";

import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export type StripePlanKey = "monthly" | "annual";

type StripePlanDetails = {
  planKey: StripePlanKey;
  planName: "Monthly" | "Annual";
  billingInterval: "month" | "year";
};

export class StripeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigurationError";
  }
}

function validateStripeSecretKey(key: string) {
  return key.startsWith("sk_") || key.startsWith("rk_");
}

function validateStripePriceId(priceId: string) {
  return priceId.startsWith("price_");
}

function normalizeAbsoluteUrl(value: string) {
  const normalizedInput = value.trim();
  const withProtocol = /^https?:\/\//i.test(normalizedInput)
    ? normalizedInput
    : `https://${normalizedInput}`;

  const parsed = new URL(withProtocol);
  return parsed.toString().replace(/\/$/, "");
}

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new StripeConfigurationError("Billing is not configured: missing STRIPE_SECRET_KEY.");
  }
  if (!validateStripeSecretKey(key)) {
    throw new StripeConfigurationError("Billing is not configured: STRIPE_SECRET_KEY appears invalid.");
  }
  return key;
}

export function getStripe() {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(getStripeSecretKey(), {
      appInfo: {
        name: "Actify",
        version: "1.0.0"
      }
    });
  }
  return stripeSingleton;
}

export function getStripeAppUrl() {
  return getStripeAppUrlWithFallback();
}

export function getStripeAppUrlWithFallback(fallbackUrl?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      return normalizeAbsoluteUrl(appUrl);
    } catch {
      throw new StripeConfigurationError("Billing is not configured: NEXT_PUBLIC_APP_URL is not a valid URL.");
    }
  }

  if (!fallbackUrl) {
    throw new StripeConfigurationError("Billing is not configured: missing NEXT_PUBLIC_APP_URL.");
  }

  try {
    return normalizeAbsoluteUrl(fallbackUrl);
  } catch {
    throw new StripeConfigurationError("Billing is not configured: fallback app URL is invalid.");
  }
}

function readStripePriceIdFromEnv(keys: string[], label: string) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (!value) continue;
    if (!validateStripePriceId(value)) {
      throw new StripeConfigurationError(`Billing is not configured: ${key} appears invalid for ${label}.`);
    }
    return value;
  }

  throw new StripeConfigurationError(
    `Billing is not configured: missing ${keys.join(" or ")} for ${label}.`
  );
}

function readOptionalStripePriceIdFromEnv(keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (!value) continue;
    if (!validateStripePriceId(value)) return null;
    return value;
  }
  return null;
}

export function getStripeMonthlyPriceId() {
  return readStripePriceIdFromEnv(["STRIPE_PRICE_MONTHLY_ID", "STRIPE_PRICE_ID_MONTHLY"], "monthly plan");
}

export function getStripeAnnualPriceId() {
  return readStripePriceIdFromEnv(["STRIPE_PRICE_ANNUAL_ID", "STRIPE_PRICE_ID_ANNUAL"], "annual plan");
}

export function getStripePriceIdForPlan(plan: StripePlanKey) {
  return plan === "annual" ? getStripeAnnualPriceId() : getStripeMonthlyPriceId();
}

export function getStripePlanDetailsFromPriceId(priceId: string | null | undefined): (StripePlanDetails & { priceId: string }) | null {
  if (!priceId) return null;

  const monthlyPriceId = readOptionalStripePriceIdFromEnv(["STRIPE_PRICE_MONTHLY_ID", "STRIPE_PRICE_ID_MONTHLY"]);
  if (monthlyPriceId && priceId === monthlyPriceId) {
    return {
      priceId,
      planKey: "monthly",
      planName: "Monthly",
      billingInterval: "month"
    };
  }

  const annualPriceId = readOptionalStripePriceIdFromEnv(["STRIPE_PRICE_ANNUAL_ID", "STRIPE_PRICE_ID_ANNUAL"]);
  if (annualPriceId && priceId === annualPriceId) {
    return {
      priceId,
      planKey: "annual",
      planName: "Annual",
      billingInterval: "year"
    };
  }

  return null;
}
