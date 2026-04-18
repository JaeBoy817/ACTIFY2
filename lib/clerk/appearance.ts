import type { Appearance } from "@clerk/types";

export const actifyClerkAppearance: Appearance = {
  layout: {
    socialButtonsPlacement: "top",
    unsafe_disableDevelopmentModeWarnings: true,
    termsPageUrl: "/terms",
    privacyPageUrl: "/privacy"
  },
  variables: {
    colorPrimary: "#38bdf8",
    colorBackground: "transparent",
    colorNeutral: "#94a3b8",
    colorDanger: "#f43f5e",
    colorText: "#e2e8f0",
    colorInputBackground: "rgba(255,255,255,0.12)",
    colorInputText: "#f8fafc",
    borderRadius: "0.95rem",
    fontFamily: "var(--font-sans)"
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full",
    main: "w-full",
    card: "!w-full !bg-transparent !shadow-none !border-0 !p-0",
    navbar: "bg-transparent",
    logoBox: "hidden",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "h-11 rounded-xl border border-white/28 bg-white/12 text-white shadow-[0_18px_30px_-24px_rgba(8,47,73,0.9)] backdrop-blur-md transition-all duration-200 hover:bg-white/18 focus-visible:ring-2 focus-visible:ring-cyan-200/60",
    socialButtonsBlockButtonText: "text-sm font-medium text-slate-100",
    dividerRow: "my-4",
    dividerLine: "bg-white/20",
    dividerText: "text-slate-200/75 text-xs",
    formButtonPrimary:
      "mx-auto h-11 w-full rounded-xl border border-cyan-200/50 bg-[linear-gradient(135deg,rgba(56,189,248,0.92)_0%,rgba(99,102,241,0.88)_100%)] text-white shadow-[0_24px_42px_-28px_rgba(56,189,248,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-cyan-100/70",
    formContainer: "!bg-transparent !border-0 !shadow-none",
    form: "space-y-4",
    formFieldRow: "space-y-1.5",
    formFieldLabel: "block w-full text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-200/85",
    formFieldInput:
      "mx-auto h-11 w-full rounded-xl border border-white/28 bg-white/12 px-4 text-slate-50 placeholder:text-slate-300/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition-all duration-200 focus:border-cyan-200/70 focus:ring-2 focus:ring-cyan-200/35",
    formFieldHintText: "text-xs text-slate-300/80",
    formFieldErrorText: "text-xs text-rose-200",
    formFieldAction: "text-sm font-medium text-cyan-200 hover:text-cyan-100",
    formFieldInputShowPasswordButton: "text-slate-200/75 hover:text-slate-50",
    footerActionText: "text-sm text-slate-200/80",
    footerActionLink: "text-sm font-semibold text-cyan-200 hover:text-cyan-100",
    footerAction: "!pt-2",
    footer: "!bg-transparent !shadow-none !border-0 !mt-3",
    footerItem: "!bg-transparent !border-0 !shadow-none",
    footerPages: "!pt-2",
    footerPagesLink: "text-xs text-slate-200/75 hover:text-cyan-100",
    badge: "!border !border-cyan-200/45 !bg-cyan-400/20 !text-cyan-100",
    alert: "!rounded-lg !border !border-rose-200/35 !bg-rose-500/18 !text-slate-50",
    identityPreviewText: "text-sm text-slate-100/90",
    identityPreviewEditButton: "text-sm font-semibold text-cyan-200 hover:text-cyan-100",
    otpCodeFieldInput:
      "h-11 rounded-xl border border-white/28 bg-white/12 text-slate-50 focus:border-cyan-200/70 focus:ring-2 focus:ring-cyan-200/35",
    formResendCodeLink: "text-sm font-semibold text-cyan-200 hover:text-cyan-100"
  },
  signIn: {
    layout: {
      unsafe_disableDevelopmentModeWarnings: true
    },
    elements: {
      card: {
        background: "transparent",
        boxShadow: "none",
        border: "0"
      },
      cardBox: {
        width: "100%"
      },
      main: {
        background: "transparent"
      },
      footer: {
        display: "none"
      },
      footerItem: {
        display: "none"
      },
      footerAction: {
        display: "none"
      },
      footerPages: {
        display: "none"
      },
      badge: {
        display: "none"
      }
    }
  },
  signUp: {
    layout: {
      unsafe_disableDevelopmentModeWarnings: true
    },
    elements: {
      card: {
        background: "transparent",
        boxShadow: "none",
        border: "0"
      },
      cardBox: {
        width: "100%"
      },
      main: {
        background: "transparent"
      },
      footer: {
        display: "none"
      },
      footerItem: {
        display: "none"
      },
      footerAction: {
        display: "none"
      },
      footerPages: {
        display: "none"
      },
      badge: {
        display: "none"
      }
    }
  }
};

export const actifyUserButtonAppearance: Appearance = {
  variables: {
    colorPrimary: "#2563EB",
    colorBackground: "#FFFFFF",
    colorText: "#111827",
    colorNeutral: "#6B7280",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-sans)"
  },
  elements: {
    userButtonTrigger:
      "rounded-xl p-0.5 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-actifyBlue/30",
    userButtonAvatarBox: "h-9 w-9 rounded-xl ring-1 ring-actifyBlue/25 shadow-sm",
    userButtonPopoverCard:
      "rounded-2xl border border-white/75 bg-white/94 shadow-[0_24px_56px_-32px_rgba(17,24,39,0.40)] backdrop-blur-xl",
    userButtonPopoverMain:
      "rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,247,237,0.90)_100%)] p-2",
    userButtonPopoverActions: "gap-1",
    userButtonPopoverActionButton:
      "rounded-xl border border-transparent bg-transparent transition-colors hover:border-actifyBlue/20 hover:bg-actifyBlue/10",
    userButtonPopoverActionButtonText: "text-sm font-medium text-foreground",
    userButtonPopoverActionButtonIcon: "text-actifyBlue/85",
    userPreviewMainIdentifier: "text-sm font-semibold text-foreground",
    userPreviewSecondaryIdentifier: "text-xs text-foreground/65",
    userButtonPopoverFooter: "border-t border-actifyBlue/12 bg-white/80",
    userButtonPopoverFooterPages: "px-2 pb-2",
    userButtonPopoverFooterPagesLink: "text-xs text-foreground/65 transition-colors hover:text-actifyBlue"
  }
};
