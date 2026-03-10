export type ClerkDiagnostic = {
  level: "error" | "warn";
  message: string;
};

const APP_DASHBOARD_PATH = "/dashboard";

export const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
export const clerkSecretKey = process.env.CLERK_SECRET_KEY;

function normalizeRoutePath(value: string | undefined, fallback: string) {
  if (!value) return fallback;

  try {
    const parsed = new URL(value);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path || fallback;
  } catch {
    return value.startsWith("/") ? value : `/${value}`;
  }
}

export const clerkSignInUrl = normalizeRoutePath(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL, "/sign-in");
export const clerkSignUpUrl = normalizeRoutePath(process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL, "/sign-up");
export const clerkAfterSignOutUrl = normalizeRoutePath(process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL, "/signed-out");
export const clerkSignInFallbackRedirectUrl = normalizeRoutePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
  APP_DASHBOARD_PATH
);
export const clerkSignUpFallbackRedirectUrl = normalizeRoutePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
  APP_DASHBOARD_PATH
);

export const isClerkConfigured = Boolean(
  clerkPublishableKey && (clerkPublishableKey.startsWith("pk_test_") || clerkPublishableKey.startsWith("pk_live_"))
);

export const isClerkBackendConfigured = Boolean(clerkSecretKey && isClerkConfigured);

const areKeyEnvironmentsMismatched =
  Boolean(clerkPublishableKey?.startsWith("pk_test_")) !== Boolean(clerkSecretKey?.startsWith("sk_test_"));

export const clerkDiagnostics: ClerkDiagnostic[] = [
  ...(isClerkConfigured
    ? []
    : [
        {
          level: "error" as const,
          message: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing or invalid (expected pk_test_*/pk_live_*)."
        }
      ]),
  ...(clerkSecretKey
    ? []
    : [
        {
          level: "error" as const,
          message: "CLERK_SECRET_KEY is missing."
        }
      ]),
  ...(areKeyEnvironmentsMismatched
    ? [
        {
          level: "warn" as const,
          message: "Clerk keys appear mixed between test and live environments."
        }
      ]
    : [])
];
