import { POST as createCheckoutSession } from "@/app/api/stripe/create-checkout-session/route";

export const runtime = "nodejs";

export async function POST() {
  return createCheckoutSession();
}
