export const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
export const clerkSecretKey = process.env.CLERK_SECRET_KEY;

export const isClerkConfigured = Boolean(
  clerkPublishableKey && (clerkPublishableKey.startsWith("pk_test_") || clerkPublishableKey.startsWith("pk_live_"))
);

export const isClerkBackendConfigured = Boolean(clerkSecretKey && isClerkConfigured);
