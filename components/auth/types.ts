import type { AuthVariant } from "@/lib/config/auth";

export type AuthMode = "sign-in" | "sign-up";

export type AuthVariantProps = {
  mode: AuthMode;
  reducedMotion: boolean;
  children: React.ReactNode;
};

export type AuthShellProps = {
  mode: AuthMode;
  variant: AuthVariant;
  userReducedMotion?: boolean | null;
  children: React.ReactNode;
};
