import "server-only";

import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export class StripeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigurationError";
  }
}

function validateStripeSecretKey(key: string) {
  return key.startsWith("sk_") || key.startsWith("rk_");
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

export function getStripeMonthlyPriceId() {
  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY?.trim();
  if (!priceId) {
    throw new StripeConfigurationError("Billing is not configured: missing STRIPE_PRICE_ID_MONTHLY.");
  }
  if (!priceId.startsWith("price_")) {
    throw new StripeConfigurationError("Billing is not configured: STRIPE_PRICE_ID_MONTHLY appears invalid.");
  }
  return priceId;
}
