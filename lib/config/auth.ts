export type AuthVariant = "split" | "stack" | "center";

const FALLBACK_VARIANT: AuthVariant = "split";

function isAuthVariant(value: string): value is AuthVariant {
  return value === "split" || value === "stack" || value === "center";
}

export function resolveAuthVariant(value?: string | null): AuthVariant {
  if (!value) return FALLBACK_VARIANT;
  const normalized = value.trim().toLowerCase();
  return isAuthVariant(normalized) ? normalized : FALLBACK_VARIANT;
}

export const authVariant = resolveAuthVariant(process.env.NEXT_PUBLIC_AUTH_VARIANT);
