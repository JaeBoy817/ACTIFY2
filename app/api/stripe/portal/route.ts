import { POST as createCustomerPortalSession } from "@/app/api/stripe/customer-portal/route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return createCustomerPortalSession(request);
}
