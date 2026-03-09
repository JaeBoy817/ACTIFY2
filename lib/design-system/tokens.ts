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
    accentGradientClasses: "from-sky-500/35 to-indigo-500/10 text-sky-700",
    iconChipClasses: "from-sky-500/30 to-indigo-500/15",
    accentHex: "#4DABF7",
    primaryGradient: "linear-gradient(135deg, #63E6BE 0%, #4DABF7 55%, #748FFC 100%)",
    softWashGradient: "linear-gradient(135deg, #F7F4EE 0%, #F7F4EE 100%)"
  },
  calendar: {
    accentGradientClasses: "from-blue-500/35 to-indigo-500/10 text-blue-700",
    iconChipClasses: "from-blue-500/30 to-indigo-500/15",
    accentHex: "#5C7CFA",
    primaryGradient: "linear-gradient(135deg, #74C0FC 0%, #5C7CFA 55%, #B197FC 100%)",
    softWashGradient: "linear-gradient(135deg, #E7F5FF 0%, #EDF2FF 55%, #F3F0FF 100%)"
  },
  templates: {
    accentGradientClasses: "from-violet-500/35 to-fuchsia-500/10 text-violet-700",
    iconChipClasses: "from-violet-500/30 to-fuchsia-500/15",
    accentHex: "#DA77F2",
    primaryGradient: "linear-gradient(135deg, #B197FC 0%, #DA77F2 55%, #FFA8A8 100%)",
    softWashGradient: "linear-gradient(135deg, #F3F0FF 0%, #F8F0FC 55%, #FFF0F6 100%)"
  },
  attendance: {
    accentGradientClasses: "from-emerald-500/35 to-teal-500/10 text-emerald-700",
    iconChipClasses: "from-emerald-500/30 to-teal-500/15",
    accentHex: "#38D9A9",
    primaryGradient: "linear-gradient(135deg, #8CE99A 0%, #63E6BE 55%, #38D9A9 100%)",
    softWashGradient: "linear-gradient(135deg, #EBFBEE 0%, #E6FCF5 55%, #E6FFFA 100%)"
  },
  notes: {
    accentGradientClasses: "from-rose-500/35 to-orange-400/10 text-rose-700",
    iconChipClasses: "from-rose-500/30 to-orange-400/15",
    accentHex: "#FF8787",
    primaryGradient: "linear-gradient(135deg, #FFA8A8 0%, #FF8787 55%, #FFC078 100%)",
    softWashGradient: "linear-gradient(135deg, #FFF0F0 0%, #FFE3E3 55%, #FFF4E6 100%)"
  },
  residents: {
    accentGradientClasses: "from-fuchsia-500/35 to-rose-500/10 text-fuchsia-700",
    iconChipClasses: "from-fuchsia-500/30 to-rose-500/15",
    accentHex: "#B197FC",
    primaryGradient: "linear-gradient(135deg, #DA77F2 0%, #B197FC 55%, #FFA8A8 100%)",
    softWashGradient: "linear-gradient(135deg, #FFF0F6 0%, #F8F0FC 55%, #F3F0FF 100%)"
  },
  "care-plan": {
    accentGradientClasses: "from-cyan-500/35 to-blue-500/10 text-cyan-700",
    iconChipClasses: "from-cyan-500/30 to-blue-500/15",
    accentHex: "#5C7CFA",
    primaryGradient: "linear-gradient(135deg, #4DABF7 0%, #5C7CFA 55%, #3BC9DB 100%)",
    softWashGradient: "linear-gradient(135deg, #E7F5FF 0%, #EDF2FF 55%, #E3FAFC 100%)"
  },
  analytics: {
    accentGradientClasses: "from-indigo-500/35 to-violet-500/10 text-indigo-700",
    iconChipClasses: "from-indigo-500/30 to-violet-500/15",
    accentHex: "#9775FA",
    primaryGradient: "linear-gradient(135deg, #9775FA 0%, #B197FC 55%, #74C0FC 100%)",
    softWashGradient: "linear-gradient(135deg, #F3F0FF 0%, #EFE9FF 55%, #E7F5FF 100%)"
  },
  volunteers: {
    accentGradientClasses: "from-emerald-500/35 to-cyan-500/10 text-emerald-700",
    iconChipClasses: "from-emerald-500/30 to-cyan-500/15",
    accentHex: "#69DB7C",
    primaryGradient: "linear-gradient(135deg, #69DB7C 0%, #63E6BE 55%, #96F2D7 100%)",
    softWashGradient: "linear-gradient(135deg, #EBFBEE 0%, #E6FCF5 55%, #E6FFFA 100%)"
  },
  "budget-stock": {
    accentGradientClasses: "from-amber-500/35 to-orange-500/10 text-amber-700",
    iconChipClasses: "from-amber-500/30 to-orange-500/15",
    accentHex: "#FFA94D",
    primaryGradient: "linear-gradient(135deg, #FFD43B 0%, #FFC078 55%, #FFA94D 100%)",
    softWashGradient: "linear-gradient(135deg, #FFF9DB 0%, #FFF4E6 55%, #FFF0E6 100%)"
  },
  "resident-council": {
    accentGradientClasses: "from-orange-500/35 to-rose-500/10 text-orange-700",
    iconChipClasses: "from-orange-500/30 to-rose-500/15",
    accentHex: "#FF8787",
    primaryGradient: "linear-gradient(135deg, #FFA94D 0%, #FF8787 55%, #FFA8A8 100%)",
    softWashGradient: "linear-gradient(135deg, #FFF4E6 0%, #FFF0F0 55%, #FFF0F6 100%)"
  },
  reports: {
    accentGradientClasses: "from-slate-500/35 to-indigo-400/10 text-slate-700",
    iconChipClasses: "from-slate-500/30 to-indigo-400/15",
    accentHex: "#A5B4FC",
    primaryGradient: "linear-gradient(135deg, #CED4DA 0%, #A5B4FC 55%, #74C0FC 100%)",
    softWashGradient: "linear-gradient(135deg, #F8F9FA 0%, #EEF2FF 55%, #E7F5FF 100%)"
  }
};
