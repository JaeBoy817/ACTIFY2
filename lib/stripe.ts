import "server-only";

import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL");
  }
  return appUrl.replace(/\/$/, "");
}

export function getStripeMonthlyPriceId() {
  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
  if (!priceId) {
    throw new Error("Missing STRIPE_PRICE_ID_MONTHLY");
  }
  return priceId;
}
