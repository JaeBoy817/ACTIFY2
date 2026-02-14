export const motionTiming = {
  quick: 160,
  base: 230,
  slow: 780
} as const;

export const motionEasing = {
  standard: "cubic-bezier(0.22, 1, 0.36, 1)",
  gentle: "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
} as const;
