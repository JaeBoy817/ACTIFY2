import { auth, currentUser } from "@clerk/nextjs/server";
import { Role, SubscriptionStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { getFacilityBillingState, isActiveSubscriptionStatus } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

const DEFAULT_CREATOR_BYPASS_EMAILS = [
  "jasonaddington817@gmail.com",
  "terlewis@ensignservices.net"
];
const BLOCKED_REDIRECT_PATH = "/subscribe";
const SIGN_IN_PATH = "/sign-in";

export type AppAccessDenialReason =
  | "UNAUTHENTICATED"
  | "USER_NOT_FOUND"
  | "EMAIL_UNAVAILABLE"
  | "SUBSCRIPTION_INACTIVE"
  | "BILLING_LOOKUP_FAILED";

export type AppAccessUserRecord = {
  id: string;
  clerkUserId: string;
  email: string;
  facilityId: string;
  role: Role;
};

export type AppAccessState = {
  isAuthenticated: boolean;
  clerkUserId: string | null;
  user: AppAccessUserRecord | null;
  email: string | null;
  normalizedEmail: string | null;
  isPrimaryEmailVerified: boolean;
  creatorBypassEmail: string;
  isCreatorBypass: boolean;
  hasActiveSubscription: boolean;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  allowed: boolean;
  denialReason: AppAccessDenialReason | null;
  redirectTo: string;
};

export class AppAccessError extends Error {
  status: number;
  code: string;
  state: AppAccessState;

  constructor(message: string, status: number, code: string, state: AppAccessState) {
    super(message);
    this.name = "AppAccessError";
    this.status = status;
    this.code = code;
    this.state = state;
  }
}

export function normalizeEmail(email: string | null | undefined) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function parseBypassEmailList(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter((item): item is string => Boolean(item));
}

export function getCreatorBypassEmails() {
  const normalizedDefaults = DEFAULT_CREATOR_BYPASS_EMAILS.map((item) => normalizeEmail(item)).filter(
    (item): item is string => Boolean(item)
  );
  const fromSingleValue = parseBypassEmailList(process.env.CREATOR_BYPASS_EMAIL);
  const fromListValue = parseBypassEmailList(process.env.CREATOR_BYPASS_EMAILS);

  return [...new Set([...normalizedDefaults, ...fromSingleValue, ...fromListValue])];
}

export function getCreatorBypassEmail() {
  return getCreatorBypassEmails()[0] ?? DEFAULT_CREATOR_BYPASS_EMAILS[0];
}

export function isCreatorBypassEmail(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getCreatorBypassEmails().includes(normalized);
}

async function getPrimarySessionEmail() {
  const clerkUser = await currentUser().catch(() => null);
  if (!clerkUser) {
    return {
      email: null as string | null,
      normalizedEmail: null as string | null,
      isPrimaryEmailVerified: false
    };
  }

  const primaryAddress =
    clerkUser.emailAddresses.find((address) => address.id === clerkUser.primaryEmailAddressId) ??
    clerkUser.emailAddresses[0] ??
    null;

  const email = primaryAddress?.emailAddress ?? null;
  const verificationStatus = primaryAddress?.verification?.status ?? null;

  return {
    email,
    normalizedEmail: normalizeEmail(email),
    isPrimaryEmailVerified: verificationStatus === "verified"
  };
}

function buildDeniedState(input: {
  clerkUserId: string | null;
  user: AppAccessUserRecord | null;
  email: string | null;
  normalizedEmail: string | null;
  isPrimaryEmailVerified: boolean;
  creatorBypassEmail: string;
  denialReason: AppAccessDenialReason;
}) {
  return {
    isAuthenticated: Boolean(input.clerkUserId),
    clerkUserId: input.clerkUserId,
    user: input.user,
    email: input.email,
    normalizedEmail: input.normalizedEmail,
    isPrimaryEmailVerified: input.isPrimaryEmailVerified,
    creatorBypassEmail: input.creatorBypassEmail,
    isCreatorBypass: false,
    hasActiveSubscription: false,
    subscriptionStatus: SubscriptionStatus.NONE,
    currentPeriodEnd: null,
    allowed: false,
    denialReason: input.denialReason,
    redirectTo: input.clerkUserId ? BLOCKED_REDIRECT_PATH : SIGN_IN_PATH
  } satisfies AppAccessState;
}

async function syncUserEmailIfNeeded(user: AppAccessUserRecord, email: string | null) {
  if (!email) return;
  if (user.email === email) return;

  await prisma.user
    .update({
      where: { id: user.id },
      data: { email }
    })
    .catch((error) => {
      console.error("[access-control] user email sync skipped", {
        userId: user.id,
        error
      });
    });
}

export async function getAccessStateForUser(user: AppAccessUserRecord): Promise<AppAccessState> {
  const creatorBypassEmail = getCreatorBypassEmail();
  const sessionEmail = await getPrimarySessionEmail();
  const email = sessionEmail.email ?? user.email ?? null;
  const normalizedEmail = sessionEmail.normalizedEmail ?? normalizeEmail(user.email);
  const normalizedSessionEmail = sessionEmail.normalizedEmail;
  const hasVerifiedBypassSession =
    Boolean(normalizedSessionEmail) &&
    sessionEmail.isPrimaryEmailVerified &&
    isCreatorBypassEmail(normalizedSessionEmail);

  await syncUserEmailIfNeeded(user, sessionEmail.email);

  if (!normalizedEmail) {
    return buildDeniedState({
      clerkUserId: user.clerkUserId,
      user,
      email,
      normalizedEmail,
      isPrimaryEmailVerified: sessionEmail.isPrimaryEmailVerified,
      creatorBypassEmail,
      denialReason: "EMAIL_UNAVAILABLE"
    });
  }

  if (hasVerifiedBypassSession) {
    return {
      isAuthenticated: true,
      clerkUserId: user.clerkUserId,
      user,
      email,
      normalizedEmail: normalizedSessionEmail,
      isPrimaryEmailVerified: sessionEmail.isPrimaryEmailVerified,
      creatorBypassEmail,
      isCreatorBypass: true,
      hasActiveSubscription: true,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: null,
      allowed: true,
      denialReason: null,
      redirectTo: BLOCKED_REDIRECT_PATH
    };
  }

  const billing = await getFacilityBillingState(user.facilityId).catch((error) => {
    console.error("[access-control] billing lookup failed", {
      userId: user.id,
      facilityId: user.facilityId,
      error
    });
    return null;
  });

  if (!billing) {
    return buildDeniedState({
      clerkUserId: user.clerkUserId,
      user,
      email,
      normalizedEmail,
      isPrimaryEmailVerified: sessionEmail.isPrimaryEmailVerified,
      creatorBypassEmail,
      denialReason: "BILLING_LOOKUP_FAILED"
    });
  }

  const hasActiveSubscription = isActiveSubscriptionStatus(billing.subscriptionStatus);

  return {
    isAuthenticated: true,
    clerkUserId: user.clerkUserId,
    user,
    email,
    normalizedEmail,
    isPrimaryEmailVerified: sessionEmail.isPrimaryEmailVerified,
    creatorBypassEmail,
    isCreatorBypass: false,
    hasActiveSubscription,
    subscriptionStatus: billing.subscriptionStatus,
    currentPeriodEnd: billing.subscriptionCurrentPeriodEnd,
    allowed: hasActiveSubscription,
    denialReason: hasActiveSubscription ? null : "SUBSCRIPTION_INACTIVE",
    redirectTo: BLOCKED_REDIRECT_PATH
  };
}

export async function getCurrentAccessState(): Promise<AppAccessState> {
  const { userId: clerkUserId } = await auth();
  const creatorBypassEmail = getCreatorBypassEmail();

  if (!clerkUserId) {
    return buildDeniedState({
      clerkUserId: null,
      user: null,
      email: null,
      normalizedEmail: null,
      isPrimaryEmailVerified: false,
      creatorBypassEmail,
      denialReason: "UNAUTHENTICATED"
    });
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      facilityId: true,
      role: true
    }
  });

  if (!user) {
    return buildDeniedState({
      clerkUserId,
      user: null,
      email: null,
      normalizedEmail: null,
      isPrimaryEmailVerified: false,
      creatorBypassEmail,
      denialReason: "USER_NOT_FOUND"
    });
  }

  return getAccessStateForUser(user);
}

function toAccessErrorFromState(state: AppAccessState) {
  if (!state.isAuthenticated) {
    return new AppAccessError("Unauthorized", 401, "UNAUTHORIZED", state);
  }

  if (!state.user) {
    return new AppAccessError("User not found.", 404, "USER_NOT_FOUND", state);
  }

  if (state.denialReason === "EMAIL_UNAVAILABLE") {
    return new AppAccessError(
      "A verified account email is required to access Actify.",
      403,
      "EMAIL_REQUIRED",
      state
    );
  }

  if (state.denialReason === "BILLING_LOOKUP_FAILED") {
    return new AppAccessError(
      "Unable to verify subscription access right now. Please try again.",
      403,
      "BILLING_LOOKUP_FAILED",
      state
    );
  }

  return new AppAccessError(
    "An active subscription is required to access Actify.",
    403,
    "SUBSCRIPTION_REQUIRED",
    state
  );
}

export async function requireCurrentAppAccess() {
  const state = await getCurrentAccessState();
  if (!state.allowed) {
    throw toAccessErrorFromState(state);
  }
  return state;
}

export async function requireCurrentAppUserWithAccess() {
  const state = await requireCurrentAppAccess();
  if (!state.user) {
    throw toAccessErrorFromState(state);
  }
  return state.user;
}

export async function requireCurrentAssistantUserWithAccess() {
  const { userId: clerkUserId } = await auth();
  const creatorBypassEmail = getCreatorBypassEmail();

  if (!clerkUserId) {
    throw toAccessErrorFromState(
      buildDeniedState({
        clerkUserId: null,
        user: null,
        email: null,
        normalizedEmail: null,
        isPrimaryEmailVerified: false,
        creatorBypassEmail,
        denialReason: "UNAUTHENTICATED"
      })
    );
  }

  const sessionEmail = await getPrimarySessionEmail();
  const hasVerifiedBypassSession =
    Boolean(sessionEmail.normalizedEmail) &&
    sessionEmail.isPrimaryEmailVerified &&
    isCreatorBypassEmail(sessionEmail.normalizedEmail);
  const fallbackBypassUser = {
    id: clerkUserId,
    clerkUserId,
    email: sessionEmail.email ?? sessionEmail.normalizedEmail ?? "unknown@example.com",
    facilityId: "assistant-fallback-facility",
    role: Role.ADMIN
  } satisfies AppAccessUserRecord;

  try {
    const state = await getCurrentAccessState();
    if (state.allowed && state.user) return state.user;

    // Admins should not be locked out of the core assistant by a missing
    // subscription row or billing lookup problem.
    if (state.user?.role === Role.ADMIN) return state.user;

    if (!state.user && hasVerifiedBypassSession) return fallbackBypassUser;

    throw toAccessErrorFromState(state);
  } catch (error) {
    if (error instanceof AppAccessError) {
      throw error;
    }

    if (hasVerifiedBypassSession) {
      console.error("[access-control] assistant DB access skipped for verified bypass user", error);
      return fallbackBypassUser;
    }

    throw error;
  }
}

export async function requireAppAccessForUser(user: AppAccessUserRecord) {
  const state = await getAccessStateForUser(user);
  if (!state.allowed) {
    throw toAccessErrorFromState(state);
  }
  return state;
}

export async function redirectIfNoAppAccessForUser(
  user: AppAccessUserRecord,
  options: { blockedRedirectPath?: string } = {}
) {
  const state = await getAccessStateForUser(user);
  if (!state.allowed) {
    redirect(options.blockedRedirectPath ?? state.redirectTo);
  }
  return state;
}

export function asAppAccessErrorResponse(error: unknown) {
  if (!(error instanceof AppAccessError)) return null;

  return Response.json(
    {
      error: error.message,
      code: error.code,
      denialReason: error.state.denialReason,
      subscriptionStatus: error.state.subscriptionStatus,
      hasActiveSubscription: error.state.hasActiveSubscription,
      isCreatorBypass: error.state.isCreatorBypass,
      redirectTo: error.state.redirectTo
    },
    { status: error.status }
  );
}
