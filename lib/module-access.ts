import { ModuleFlags, asModuleFlags } from "@/lib/module-flags";

export type ModuleKey = keyof ModuleFlags["modules"];

export function isModuleEnabled(flagsRaw: unknown, moduleKey: ModuleKey) {
  const flags = asModuleFlags(flagsRaw);
  return flags.modules[moduleKey];
}
