export const CARE_PLAN_FOCUS_AREAS = [
  { key: "LEISURE_ENGAGEMENT", label: "Leisure Engagement" },
  { key: "SOCIALIZATION", label: "Socialization" },
  { key: "COGNITIVE_STIMULATION", label: "Cognitive Stimulation" },
  { key: "MOOD_WELLBEING", label: "Mood / Emotional Well-Being" },
  { key: "PHYSICAL_ENGAGEMENT", label: "Physical Engagement" },
  { key: "COMMUNICATION_SUPPORT", label: "Communication Support" },
  { key: "SENSORY_STIMULATION", label: "Sensory Stimulation" },
  { key: "BEHAVIORAL_SUPPORT", label: "Behavioral Support" },
  { key: "SPIRITUAL_CULTURAL", label: "Spiritual / Cultural Support" },
  { key: "COMMUNITY_INTEGRATION", label: "Community Integration" }
] as const;

export type CarePlanFocusAreaKey = (typeof CARE_PLAN_FOCUS_AREAS)[number]["key"];

export const CARE_PLAN_FOCUS_LABEL: Record<CarePlanFocusAreaKey, string> = CARE_PLAN_FOCUS_AREAS.reduce(
  (acc, item) => {
    acc[item.key] = item.label;
    return acc;
  },
  {} as Record<CarePlanFocusAreaKey, string>
);

export const CARE_PLAN_FREQUENCIES = [
  { value: "DAILY", label: "Daily" },
  { value: "THREE_PER_WEEK", label: "3x per week" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "PRN", label: "PRN" },
  { value: "CUSTOM", label: "Custom" }
] as const;

export const CARE_PLAN_GOAL_BASELINES = [
  { value: "RARE", label: "Rare" },
  { value: "SOMETIMES", label: "Sometimes" },
  { value: "OFTEN", label: "Often" }
] as const;

export const CARE_PLAN_INTERVENTION_TYPES = [
  { value: "GROUP", label: "Group" },
  { value: "ONE_TO_ONE", label: "1:1" },
  { value: "INDEPENDENT", label: "Independent" }
] as const;

export const CARE_PLAN_REVIEW_RESULTS = [
  { value: "IMPROVED", label: "Improved" },
  { value: "NO_CHANGE", label: "No Change" },
  { value: "DECLINED", label: "Declined" }
] as const;

export const CARE_PLAN_PARTICIPATION_LEVELS = [
  { value: "LOW", label: "Low" },
  { value: "MODERATE", label: "Moderate" },
  { value: "HIGH", label: "High" }
] as const;

export const CARE_PLAN_RESPONSE_TYPES = [
  { value: "POSITIVE", label: "Positive" },
  { value: "NEUTRAL", label: "Neutral" },
  { value: "RESISTANT", label: "Resistant" }
] as const;

export const CARE_PLAN_BARRIER_CHIPS = [
  "Low motivation",
  "Fatigue",
  "Pain",
  "Anxiety",
  "Depression / flat affect",
  "Dementia / cognitive impairment",
  "Hearing impairment",
  "Vision impairment",
  "Aphasia / communication deficit",
  "Behavioral symptoms",
  "Limited mobility / bed-bound",
  "Dialysis or therapy conflict",
  "Prefers 1:1",
  "Prefers independent",
  "Isolation / withdrawal"
] as const;

export const CARE_PLAN_SUPPORT_CHIPS = [
  "Choice-based offers",
  "Consistent staffing approach",
  "Small-group option",
  "1:1 encouragement",
  "Transport support",
  "Sensory-friendly setup",
  "Visual cueing",
  "Verbal cueing",
  "Family collaboration",
  "Reminiscence prompts",
  "Music support",
  "Adaptive equipment",
  "Bedside option",
  "Schedule reminders"
] as const;

export const CARE_PLAN_REVIEW_WORKED_CHIPS = [
  "Resident responded to music",
  "Choice menu improved participation",
  "Small-group setting worked",
  "Bedside adaptation worked",
  "Verbal cueing effective",
  "Visual prompts effective",
  "Morning schedule better",
  "Family involvement helped"
] as const;

export const CARE_PLAN_REVIEW_ADJUST_CHIPS = [
  "Reduce group size",
  "Shift to morning sessions",
  "Increase 1:1 frequency",
  "Add sensory supports",
  "Simplify instructions",
  "Change activity type",
  "Coordinate with therapy schedule",
  "Update cueing level"
] as const;

export function focusAreaLabel(key: string) {
  return CARE_PLAN_FOCUS_LABEL[key as CarePlanFocusAreaKey] ?? key;
}
