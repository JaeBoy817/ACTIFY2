export interface ReportThemeTokens {
  colors: {
    background: string;
    panel: string;
    glassFill: string;
    glassFillStrong: string;
    glassBorder: string;
    glassInnerBorder: string;
    sheenStart: string;
    sheenEnd: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accentBlue: string;
    accentMint: string;
    accentCoral: string;
    accentAmber: string;
    accentRose: string;
    rowStripe: string;
    tableHeader: string;
  };
  elevation: {
    cardShadowColor: string;
    cardShadowOpacity: number;
    cardShadowRadius: number;
    cardShadowOffsetY: number;
  };
  radius: {
    big: number;
    small: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    title: number;
    section: number;
    body: number;
    table: number;
  };
}

export const defaultReportTheme: ReportThemeTokens = {
  colors: {
    background: "#FFF7ED",
    panel: "#FFFFFF",
    glassFill: "#FFFFFF",
    glassFillStrong: "#F8FAFC",
    glassBorder: "#E5E7EB",
    glassInnerBorder: "#F3F4F6",
    sheenStart: "#FFFFFF",
    sheenEnd: "#F8FAFC",
    textPrimary: "#111827",
    textSecondary: "#374151",
    textMuted: "#6B7280",
    accentBlue: "#2563EB",
    accentMint: "#2DD4BF",
    accentCoral: "#FB7185",
    accentAmber: "#F59E0B",
    accentRose: "#F43F5E",
    rowStripe: "#F8FAFC",
    tableHeader: "#EEF2FF"
  },
  elevation: {
    cardShadowColor: "#111827",
    cardShadowOpacity: 0.08,
    cardShadowRadius: 6,
    cardShadowOffsetY: 2
  },
  radius: {
    big: 20,
    small: 13
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32
  },
  typography: {
    title: 25,
    section: 15,
    body: 10.5,
    table: 10
  }
};

export type ReportThemeMode = "CLASSIC" | "CLEAN" | "LIQUID_GLASS";
export type ReportAccent = "BLUE" | "MINT" | "CORAL";

export function resolveReportTheme(options?: {
  theme?: ReportThemeMode;
  accent?: ReportAccent;
}): ReportThemeTokens {
  const mode = options?.theme ?? "LIQUID_GLASS";
  const accent = options?.accent ?? "BLUE";

  const accentMap: Record<ReportAccent, { blue: string; mint: string; coral: string }> = {
    BLUE: { blue: "#2563EB", mint: "#2DD4BF", coral: "#FB7185" },
    MINT: { blue: "#1D4ED8", mint: "#2DD4BF", coral: "#FB7185" },
    CORAL: { blue: "#2563EB", mint: "#22C1A5", coral: "#FB7185" }
  };

  const accentColors = accentMap[accent];

  if (mode === "CLASSIC") {
    return {
      ...defaultReportTheme,
      colors: {
        ...defaultReportTheme.colors,
        background: "#FFFFFF",
        panel: "#FFFFFF",
        glassFillStrong: "#F8FAFC",
        accentBlue: accentColors.blue,
        accentMint: accentColors.mint,
        accentCoral: accentColors.coral
      }
    };
  }

  if (mode === "CLEAN") {
    return {
      ...defaultReportTheme,
      colors: {
        ...defaultReportTheme.colors,
        background: "#F8FAFC",
        panel: "#FFFFFF",
        glassFillStrong: "#F1F5F9",
        rowStripe: "#F8FAFC",
        tableHeader: "#E2E8F0",
        accentBlue: accentColors.blue,
        accentMint: accentColors.mint,
        accentCoral: accentColors.coral
      }
    };
  }

  return {
    ...defaultReportTheme,
    colors: {
      ...defaultReportTheme.colors,
      accentBlue: accentColors.blue,
      accentMint: accentColors.mint,
      accentCoral: accentColors.coral
    }
  };
}
