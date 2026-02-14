import type { Appearance } from "@clerk/types";

export const actifyClerkAppearance: Appearance = {
  layout: {
    socialButtonsPlacement: "top",
    unsafe_disableDevelopmentModeWarnings: true,
    termsPageUrl: "/terms",
    privacyPageUrl: "/privacy"
  },
  variables: {
    colorPrimary: "#2563EB",
    colorBackground: "transparent",
    colorNeutral: "#6B7280",
    colorDanger: "#FB7185",
    colorText: "#111827",
    colorInputBackground: "rgba(255,255,255,0.9)",
    colorInputText: "#111827",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-sans)"
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full",
    main: "w-full",
    card: "!w-full !bg-transparent !shadow-none !border-0 !p-0",
    navbar: "bg-transparent",
    logoBox: "hidden",
    header: "mb-4 px-2",
    headerTitle: "px-2 text-[1.55rem] leading-tight tracking-tight text-foreground",
    headerSubtitle: "mt-1 px-2 text-sm text-foreground/72",
    socialButtonsBlockButton:
      "h-11 rounded-xl border border-white/75 bg-white/82 text-foreground shadow-sm hover:bg-white/92 transition-colors focus-visible:ring-2 focus-visible:ring-actifyBlue/25",
    socialButtonsBlockButtonText: "text-sm font-medium text-foreground",
    dividerRow: "my-4",
    dividerLine: "bg-white/65",
    dividerText: "text-foreground/60 text-xs",
    formButtonPrimary:
      "mx-auto h-11 w-[calc(100%-0.75rem)] rounded-xl bg-actify-brand text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all focus-visible:ring-2 focus-visible:ring-actifyBlue/30",
    formContainer: "!bg-transparent !border-0 !shadow-none",
    form: "space-y-4 px-1",
    formFieldRow: "space-y-1.5",
    formFieldLabel: "block w-full text-center text-sm font-medium text-foreground/80",
    formFieldInput:
      "mx-auto h-11 w-[calc(100%-0.75rem)] rounded-xl border border-actifyBlue/45 bg-white/90 px-4 text-center text-foreground placeholder:text-center placeholder:text-foreground/45 focus:border-actifyBlue focus:ring-2 focus:ring-actifyBlue/25",
    formFieldHintText: "text-xs text-foreground/60",
    formFieldErrorText: "text-xs text-destructive",
    formFieldAction: "text-sm font-medium text-actifyBlue hover:text-actifyBlue/80",
    formFieldInputShowPasswordButton: "text-foreground/60 hover:text-foreground",
    footerActionText: "text-sm text-foreground/65",
    footerActionLink: "text-sm font-semibold text-actifyBlue hover:text-actifyBlue/80",
    footerAction: "!pt-2",
    footer: "!bg-transparent !shadow-none !border-0 !mt-3",
    footerItem: "!bg-transparent !border-0 !shadow-none",
    footerPages: "!pt-2",
    footerPagesLink: "text-xs text-foreground/55 hover:text-actifyBlue",
    badge: "!border !border-actifyBlue/20 !bg-actifyBlue/10 !text-actifyBlue",
    alert: "!rounded-lg !border !border-actifyCoral/30 !bg-actifyCoral/10 !text-foreground",
    identityPreviewText: "text-sm text-foreground/80",
    identityPreviewEditButton: "text-sm font-semibold text-actifyBlue hover:text-actifyBlue/80",
    otpCodeFieldInput:
      "h-11 rounded-xl border border-actifyBlue/45 bg-white/90 text-foreground focus:border-actifyBlue focus:ring-2 focus:ring-actifyBlue/25",
    formResendCodeLink: "text-sm font-semibold text-actifyBlue hover:text-actifyBlue/80"
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
