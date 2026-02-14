export type GlassVariant = "default" | "warm" | "dense";

export function getGlassVariantClass(variant: GlassVariant) {
  switch (variant) {
    case "warm":
      return "glass-warm";
    case "dense":
      return "glass-dense";
    default:
      return "glass";
  }
}
