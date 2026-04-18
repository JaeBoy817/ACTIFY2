import Link from "next/link";

import { clerkSignInUrl, clerkSignUpUrl } from "@/lib/clerk-config";

type AuthMode = "sign-in" | "sign-up";

export function AuthFooterLinks({ mode }: { mode: AuthMode }) {
  return (
    <div className="space-y-2 pt-4 text-center text-sm text-slate-200/85">
      {mode === "sign-in" ? (
        <>
          <p>
            <Link
              href="/sign-in/forgot-password"
              className="font-medium text-cyan-200 transition-colors duration-200 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
            >
              Forgot password?
            </Link>
          </p>
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href={clerkSignUpUrl}
              className="font-semibold text-cyan-200 transition-colors duration-200 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
            >
              Sign up
            </Link>
          </p>
        </>
      ) : (
        <p>
          Already have an account?{" "}
          <Link
            href={clerkSignInUrl}
            className="font-semibold text-cyan-200 transition-colors duration-200 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          >
            Sign in
          </Link>
        </p>
      )}
      <p className="text-xs text-slate-300/70">
        By continuing, you agree to our{" "}
        <Link
          href="/terms"
          className="font-medium text-slate-100/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="font-medium text-slate-100/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
