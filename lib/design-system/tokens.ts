import type { ModuleRegistryKey } from "@/lib/moduleRegistry";

export const ACTIFY_RADIUS = {
  sm: "0.6rem",
  md: "0.85rem",
  lg: "1rem",
  xl: "1.25rem",
  "2xl": "1.5rem"
} as const;

export const ACTIFY_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32
} as const;

export const ACTIFY_MOTION = {
  quick: 160,
  base: 230,
  slow: 620
} as const;

export type ModuleVisualToken = {
  accentGradientClasses: string;
  iconChipClasses: string;
  accentHex: string;
  primaryGradient: string;
  softWashGradient: string;
};

export const MODULE_VISUAL_TOKENS: Record<ModuleRegistryKey, ModuleVisualToken> = {
  dashboard: {
    accentGradientClasses: "from-amber-300 to-yellow-500 text-zinc-950",
    iconChipClasses: "from-amber-300/95 to-yellow-500/95",
    accentHex: "#FBBF24",
    primaryGradient: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 60%, #D97706 100%)",
    softWashGradient: "linear-gradient(135deg, #1B1B1F 0%, #23232A 100%)"
  },
  calendar: {
    accentGradientClasses: "from-blue-400 to-blue-600 text-white",
    iconChipClasses: "from-blue-400/95 to-blue-600/95",
    accentHex: "#2563EB",
    primaryGradient: "linear-gradient(135deg, #3B82F6 0%, #2563EB 60%, #1D4ED8 100%)",
    softWashGradient: "linear-gradient(135deg, #171B24 0%, #1A2232 100%)"
  },
  templates: {
    accentGradientClasses: "from-violet-500 to-fuchsia-600 text-white",
    iconChipClasses: "from-violet-500/95 to-fuchsia-600/95",
    accentHex: "#7C3AED",
    primaryGradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 55%, #6D28D9 100%)",
    softWashGradient: "linear-gradient(135deg, #1E1A2A 0%, #261D38 100%)"
  },
  attendance: {
    accentGradientClasses: "from-sky-400 to-cyan-500 text-slate-950",
    iconChipClasses: "from-sky-400/95 to-cyan-500/95",
    accentHex: "#38BDF8",
    primaryGradient: "linear-gradient(135deg, #38BDF8 0%, #0EA5E9 55%, #0284C7 100%)",
    softWashGradient: "linear-gradient(135deg, #17212B 0%, #132733 100%)"
  },
  notes: {
    accentGradientClasses: "from-violet-300 to-purple-500 text-zinc-950",
    iconChipClasses: "from-violet-300/95 to-purple-500/95",
    accentHex: "#A78BFA",
    primaryGradient: "linear-gradient(135deg, #C4B5FD 0%, #A78BFA 55%, #8B5CF6 100%)",
    softWashGradient: "linear-gradient(135deg, #201A2E 0%, #272038 100%)"
  },
  residents: {
    accentGradientClasses: "from-slate-200 to-slate-400 text-slate-950",
    iconChipClasses: "from-slate-200/95 to-slate-400/95",
    accentHex: "#94A3B8",
    primaryGradient: "linear-gradient(135deg, #CBD5E1 0%, #94A3B8 60%, #64748B 100%)",
    softWashGradient: "linear-gradient(135deg, #1E232A 0%, #252C35 100%)"
  },
  "care-plan": {
    accentGradientClasses: "from-emerald-400 to-emerald-600 text-white",
    iconChipClasses: "from-emerald-400/95 to-emerald-600/95",
    accentHex: "#10B981",
    primaryGradient: "linear-gradient(135deg, #34D399 0%, #10B981 55%, #059669 100%)",
    softWashGradient: "linear-gradient(135deg, #12251F 0%, #153228 100%)"
  },
  analytics: {
    accentGradientClasses: "from-cyan-400 to-blue-500 text-slate-950",
    iconChipClasses: "from-cyan-400/95 to-blue-500/95",
    accentHex: "#06B6D4",
    primaryGradient: "linear-gradient(135deg, #22D3EE 0%, #06B6D4 55%, #0284C7 100%)",
    softWashGradient: "linear-gradient(135deg, #13222B 0%, #16313B 100%)"
  },
  volunteers: {
    accentGradientClasses: "from-violet-400 to-purple-600 text-white",
    iconChipClasses: "from-violet-400/95 to-purple-600/95",
    accentHex: "#8B5CF6",
    primaryGradient: "linear-gradient(135deg, #A78BFA 0%, #8B5CF6 55%, #7C3AED 100%)",
    softWashGradient: "linear-gradient(135deg, #1F1A31 0%, #27203A 100%)"
  },
  "budget-stock": {
    accentGradientClasses: "from-rose-400 to-red-500 text-white",
    iconChipClasses: "from-rose-400/95 to-red-500/95",
    accentHex: "#F43F5E",
    primaryGradient: "linear-gradient(135deg, #FB7185 0%, #F43F5E 55%, #E11D48 100%)",
    softWashGradient: "linear-gradient(135deg, #2A1B1F 0%, #311F23 100%)"
  },
  "resident-council": {
    accentGradientClasses: "from-amber-400 to-orange-500 text-zinc-950",
    iconChipClasses: "from-amber-400/95 to-orange-500/95",
    accentHex: "#F59E0B",
    primaryGradient: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 55%, #EA580C 100%)",
    softWashGradient: "linear-gradient(135deg, #2A2117 0%, #33281B 100%)"
  },
  reports: {
    accentGradientClasses: "from-zinc-300 to-slate-500 text-zinc-950",
    iconChipClasses: "from-zinc-300/95 to-slate-500/95",
    accentHex: "#A1A1AA",
    primaryGradient: "linear-gradient(135deg, #D4D4D8 0%, #A1A1AA 55%, #71717A 100%)",
    softWashGradient: "linear-gradient(135deg, #202124 0%, #262A30 100%)"
  }
};
