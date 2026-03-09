export type GlassVariant = "default" | "warm" | "dense";

export function getGlassVariantClass(variant: GlassVariant) {
  switch (variant) {
    case "warm":
      return "nb-tone-warm";
    case "dense":
      return "nb-tone-dense";
    default:
      return "nb-tone-default";
  }
}
