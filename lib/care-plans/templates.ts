import type { CarePlanFrequency, GoalBaseline, InterventionType } from "@prisma/client";

import type { CarePlanFocusAreaKey } from "@/lib/care-plans/enums";

export type CarePlanGoalTemplate = {
  templateKey: string;
  title: string;
  text: string;
  focusArea: CarePlanFocusAreaKey;
  suggestedBaseline: GoalBaseline;
  suggestedTarget: GoalBaseline;
  suggestedTimeframeDays: number;
};

export type CarePlanInterventionTemplate = {
  title: string;
  type: InterventionType;
  focusAreas?: CarePlanFocusAreaKey[];
  bedBoundFriendly?: boolean;
  dementiaFriendly?: boolean;
  lowVisionFriendly?: boolean;
  hardOfHearingFriendly?: boolean;
};

export type CarePlanTemplate = {
  key: string;
  name: string;
  description: string;
  defaultFocusAreas: CarePlanFocusAreaKey[];
  defaultGoalTemplates: Array<{
    templateKey: string;
    baseline: GoalBaseline;
    target: GoalBaseline;
    timeframeDays: number;
  }>;
  defaultInterventions: CarePlanInterventionTemplate[];
  defaultFrequency: CarePlanFrequency;
  defaultReviewDays: number;
  suggestedBarriers?: string[];
  suggestedSupports?: string[];
};

export const CARE_PLAN_GOAL_TEMPLATES: CarePlanGoalTemplate[] = [
  {
    templateKey: "leisure-participation-consistency",
    title: "Improve leisure participation",
    text: "Resident will participate in preferred meaningful leisure programming with staff cueing as needed.",
    focusArea: "LEISURE_ENGAGEMENT",
    suggestedBaseline: "RARE",
    suggestedTarget: "SOMETIMES",
    suggestedTimeframeDays: 30
  },
  {
    templateKey: "leisure-choice-based",
    title: "Choice-based engagement",
    text: "Resident will choose between 2-3 activity options and engage in selected activity with support.",
    focusArea: "LEISURE_ENGAGEMENT",
    suggestedBaseline: "SOMETIMES",
    suggestedTarget: "OFTEN",
    suggestedTimeframeDays: 60
  },
  {
    templateKey: "social-peer-contact",
    title: "Increase peer contact",
    text: "Resident will participate in social opportunities to increase positive peer interaction.",
    focusArea: "SOCIALIZATION",
    suggestedBaseline: "RARE",
    suggestedTarget: "SOMETIMES",
    suggestedTimeframeDays: 30
  },
  {
    templateKey: "social-small-group",
    title: "Small-group social comfort",
    text: "Resident will attend small-group social activities to reduce isolation and build connection.",
    focusArea: "SOCIALIZATION",
    suggestedBaseline: "SOMETIMES",
    suggestedTarget: "OFTEN",
    suggestedTimeframeDays: 60
  },
  {
    templateKey: "cognitive-structured-games",
    title: "Structured cognition",
    text: "Resident will participate in structured cognitive games with cueing support as needed.",
    focusArea: "COGNITIVE_STIMULATION",
    suggestedBaseline: "RARE",
    suggestedTarget: "SOMETIMES",
    suggestedTimeframeDays: 30
  },
  {
    templateKey: "cognitive-reminiscence",
    title: "Reminiscence support",
    text: "Resident will engage in reminiscence-based sessions to support memory and identity.",
    focusArea: "COGNITIVE_STIMULATION",
    suggestedBaseline: "SOMETIMES",
    suggestedTarget: "OFTEN",
    suggestedTimeframeDays: 90
  },
  {
    templateKey: "mood-calm-programming",
    title: "Calming engagement",
    text: "Resident will participate in preferred calming activities to support mood and reduce distress.",
    focusArea: "MOOD_WELLBEING",
    suggestedBaseline: "RARE",
    suggestedTarget: "SOMETIMES",
    suggestedTimeframeDays: 30
  },
  {
    templateKey: "mood-purposeful-role",
    title: "Purposeful role",
    text: "Resident will participate in purposeful activity roles to support confidence and motivation.",
    focusArea: "MOOD_WELLBEING",
    suggestedBaseline: "SOMETIMES",
    suggestedTarget: "OFTEN",
    suggestedTimeframeDays: 60
  },
  {
    templateKey: "physical-chair-based",
    title: "Chair-based movement",
    text: "Resident will participate in chair-based movement activities to support endurance and mobility.",
    focusArea: "PHYSICAL_ENGAGEMENT",
    suggestedBaseline: "RARE",
    suggestedTarget: "SOMETIMES",
    suggestedTimeframeDays: 30
  },
  {
    templateKey: "physical-fine-motor",
    title: "Fine motor carryover",
    text: "Resident will engage in fine-motor leisure tasks to support dexterity and confidence.",
    focusArea: "PHYSICAL_ENGAGEMENT",
    suggestedBaseline: "SOMETIMES",
    suggestedTarget: "OFTEN",
    suggestedTimeframeDays: 60
  },
  {
    templateKey: "comm-cueing-support",
    title: "Communication cueing",
    text: "Resident will participate using individualized communication cues and simplified prompts.",
    focusArea: "COMMUNICATION_SUPPORT",
    suggestedBaseline: "RARE",
    suggestedTarget: "SOMETIMES",
    suggestedTimeframeDays: 30
  },
  {
    templateKey: "comm-nonverbal-options",
    title: "Nonverbal options",
    text: "Resident will be offered nonverbal participation options (pointing, choices, visual cues).",
    focusArea: "COMMUNICATION_SUPPORT",
    suggestedBaseline: "SOMETIMES",
    suggestedTarget: "OFTEN",
    suggestedTimeframeDays: 60
  },
  {
    templateKey: "sensory-music-regulation",
    title: "Music comfort",
    text: "Resident will engage in music-based sensory sessions to support comfort and regulation.",
    focusArea: "SENSORY_STIMULATION",
    suggestedBaseline: "RARE",
    suggestedTarget: "SOMETIMES",
    suggestedTimeframeDays: 30
  },
  {
    templateKey: "sensory-tactile-options",
    title: "Tactile options",
    text: "Resident will engage in tactile sensory activities to support focus and calm participation.",
    focusArea: "SENSORY_STIMULATION",
    suggestedBaseline: "SOMETIMES",
    suggestedTarget: "OFTEN",
    suggestedTimeframeDays: 60
  },
  {
    templateKey: "behavior-redirection",
    title: "Behavior redirection",
    text: "Resident will be offered redirection activities during periods of agitation or wandering.",
    focusArea: "BEHAVIORAL_SUPPORT",
    suggestedBaseline: "RARE",
    suggestedTarget: "SOMETIMES",
    suggestedTimeframeDays: 30
  },
  {
    templateKey: "behavior-structured-routine",
    title: "Structured routine",
    text: "Resident will engage in a consistent structured routine to reduce behavioral distress.",
    focusArea: "BEHAVIORAL_SUPPORT",
    suggestedBaseline: "SOMETIMES",
    suggestedTarget: "OFTEN",
    suggestedTimeframeDays: 60
  },
  {
    templateKey: "spiritual-faith-services",
    title: "Faith-based support",
    text: "Resident will be offered faith-based services or spiritual support opportunities.",
    focusArea: "SPIRITUAL_CULTURAL",
    suggestedBaseline: "RARE",
    suggestedTarget: "SOMETIMES",
    suggestedTimeframeDays: 30
  },
  {
    templateKey: "community-event-engagement",
    title: "Community event participation",
    text: "Resident will attend facility community events to support belonging and inclusion.",
    focusArea: "COMMUNITY_INTEGRATION",
    suggestedBaseline: "RARE",
    suggestedTarget: "SOMETIMES",
    suggestedTimeframeDays: 60
  }
];

export const GOAL_TEMPLATES_BY_FOCUS = CARE_PLAN_GOAL_TEMPLATES.reduce(
  (acc, template) => {
    acc[template.focusArea] = acc[template.focusArea] ?? [];
    acc[template.focusArea].push(template);
    return acc;
  },
  {} as Record<CarePlanFocusAreaKey, CarePlanGoalTemplate[]>
);

export const CARE_PLAN_INTERVENTION_LIBRARY: CarePlanInterventionTemplate[] = [
  { title: "Offer choice of 2–3 activities", type: "GROUP" },
  { title: "Seat near facilitator and reduce distractions", type: "GROUP", hardOfHearingFriendly: true },
  { title: "Use small-group option before large group", type: "GROUP" },
  { title: "Provide 1:1 in-room check-in", type: "ONE_TO_ONE", bedBoundFriendly: true },
  { title: "Provide 1:1 motivation before group start", type: "ONE_TO_ONE" },
  { title: "Use reminiscence prompts during 1:1", type: "ONE_TO_ONE", dementiaFriendly: true },
  { title: "Use simple one-step verbal cues", type: "ONE_TO_ONE", dementiaFriendly: true },
  { title: "Provide visual cue cards and high contrast print", type: "ONE_TO_ONE", lowVisionFriendly: true },
  { title: "Use adaptive communication choices (yes/no)", type: "ONE_TO_ONE", hardOfHearingFriendly: true },
  { title: "Offer independent leisure setup at bedside", type: "INDEPENDENT", bedBoundFriendly: true },
  { title: "Set up puzzle/word search station", type: "INDEPENDENT" },
  { title: "Provide music playlist with resident preferences", type: "INDEPENDENT", dementiaFriendly: true },
  { title: "Use tactile sensory bin/fidget option", type: "INDEPENDENT", dementiaFriendly: true },
  { title: "Adapt materials for low vision", type: "INDEPENDENT", lowVisionFriendly: true },
  { title: "Coordinate activity timing around therapy", type: "GROUP" },
  { title: "Document response and follow-up in 1:1 note", type: "ONE_TO_ONE" }
];

export const CARE_PLAN_TEMPLATES: CarePlanTemplate[] = [
  {
    key: "socialEngagementBoost",
    name: "Social Engagement Boost",
    description: "For residents needing stronger peer interaction and social consistency.",
    defaultFocusAreas: ["SOCIALIZATION", "LEISURE_ENGAGEMENT"],
    defaultGoalTemplates: [
      { templateKey: "social-peer-contact", baseline: "RARE", target: "SOMETIMES", timeframeDays: 30 },
      { templateKey: "leisure-choice-based", baseline: "SOMETIMES", target: "OFTEN", timeframeDays: 60 }
    ],
    defaultInterventions: [
      { title: "Offer choice of 2–3 activities", type: "GROUP" },
      { title: "Provide 1:1 motivation before group start", type: "ONE_TO_ONE" },
      { title: "Use small-group option before large group", type: "GROUP" }
    ],
    defaultFrequency: "THREE_PER_WEEK",
    defaultReviewDays: 30,
    suggestedBarriers: ["Isolation / withdrawal", "Low motivation"],
    suggestedSupports: ["Choice-based offers", "Small-group option", "1:1 encouragement"]
  },
  {
    key: "bedBoundEssential",
    name: "Bed-Bound Essential",
    description: "Bedside-friendly plan emphasizing comfort, engagement, and cueing.",
    defaultFocusAreas: ["LEISURE_ENGAGEMENT", "SENSORY_STIMULATION"],
    defaultGoalTemplates: [
      { templateKey: "leisure-participation-consistency", baseline: "RARE", target: "SOMETIMES", timeframeDays: 30 },
      { templateKey: "sensory-music-regulation", baseline: "SOMETIMES", target: "OFTEN", timeframeDays: 60 }
    ],
    defaultInterventions: [
      { title: "Provide 1:1 in-room check-in", type: "ONE_TO_ONE", bedBoundFriendly: true },
      { title: "Offer independent leisure setup at bedside", type: "INDEPENDENT", bedBoundFriendly: true },
      { title: "Provide music playlist with resident preferences", type: "INDEPENDENT", bedBoundFriendly: true }
    ],
    defaultFrequency: "DAILY",
    defaultReviewDays: 30,
    suggestedBarriers: ["Limited mobility / bed-bound", "Fatigue"],
    suggestedSupports: ["Bedside option", "1:1 encouragement", "Music support"]
  },
  {
    key: "dementiaFriendlyEngagement",
    name: "Dementia-Friendly Engagement",
    description: "Simplified steps, cueing, and routine-based activities.",
    defaultFocusAreas: ["COGNITIVE_STIMULATION", "BEHAVIORAL_SUPPORT"],
    defaultGoalTemplates: [
      { templateKey: "cognitive-reminiscence", baseline: "RARE", target: "SOMETIMES", timeframeDays: 30 },
      { templateKey: "behavior-structured-routine", baseline: "SOMETIMES", target: "OFTEN", timeframeDays: 60 }
    ],
    defaultInterventions: [
      { title: "Use reminiscence prompts during 1:1", type: "ONE_TO_ONE", dementiaFriendly: true },
      { title: "Use simple one-step verbal cues", type: "ONE_TO_ONE", dementiaFriendly: true },
      { title: "Provide music playlist with resident preferences", type: "INDEPENDENT", dementiaFriendly: true }
    ],
    defaultFrequency: "THREE_PER_WEEK",
    defaultReviewDays: 30,
    suggestedBarriers: ["Dementia / cognitive impairment", "Behavioral symptoms"],
    suggestedSupports: ["Consistent staffing approach", "Sensory-friendly setup", "Reminiscence prompts"]
  },
  {
    key: "independentLeisureSupport",
    name: "Independent Leisure Support",
    description: "Supports residents who prefer independent activity with light staff assist.",
    defaultFocusAreas: ["LEISURE_ENGAGEMENT", "COMMUNICATION_SUPPORT"],
    defaultGoalTemplates: [
      { templateKey: "leisure-choice-based", baseline: "SOMETIMES", target: "OFTEN", timeframeDays: 60 },
      { templateKey: "comm-nonverbal-options", baseline: "RARE", target: "SOMETIMES", timeframeDays: 30 }
    ],
    defaultInterventions: [
      { title: "Set up puzzle/word search station", type: "INDEPENDENT" },
      { title: "Provide visual cue cards and high contrast print", type: "ONE_TO_ONE", lowVisionFriendly: true },
      { title: "Offer independent leisure setup at bedside", type: "INDEPENDENT" }
    ],
    defaultFrequency: "WEEKLY",
    defaultReviewDays: 90,
    suggestedBarriers: ["Prefers independent", "Vision impairment"],
    suggestedSupports: ["Adaptive equipment", "Visual cueing", "Schedule reminders"]
  },
  {
    key: "moodAdjustmentSupport",
    name: "Mood Adjustment Support",
    description: "For anxiety, low mood, and adjustment stress using low-pressure engagement.",
    defaultFocusAreas: ["MOOD_WELLBEING", "SOCIALIZATION"],
    defaultGoalTemplates: [
      { templateKey: "mood-calm-programming", baseline: "RARE", target: "SOMETIMES", timeframeDays: 30 },
      { templateKey: "social-small-group", baseline: "RARE", target: "SOMETIMES", timeframeDays: 60 }
    ],
    defaultInterventions: [
      { title: "Provide 1:1 in-room check-in", type: "ONE_TO_ONE" },
      { title: "Use small-group option before large group", type: "GROUP" },
      { title: "Provide music playlist with resident preferences", type: "INDEPENDENT" }
    ],
    defaultFrequency: "THREE_PER_WEEK",
    defaultReviewDays: 30,
    suggestedBarriers: ["Anxiety", "Depression / flat affect"],
    suggestedSupports: ["1:1 encouragement", "Small-group option", "Music support"]
  },
  {
    key: "sensoryComfortSupport",
    name: "Sensory Comfort Support",
    description: "Sensory-first plan for comfort, regulation, and engagement tolerance.",
    defaultFocusAreas: ["SENSORY_STIMULATION", "MOOD_WELLBEING"],
    defaultGoalTemplates: [
      { templateKey: "sensory-music-regulation", baseline: "RARE", target: "SOMETIMES", timeframeDays: 30 },
      { templateKey: "sensory-tactile-options", baseline: "SOMETIMES", target: "OFTEN", timeframeDays: 60 }
    ],
    defaultInterventions: [
      { title: "Use tactile sensory bin/fidget option", type: "INDEPENDENT" },
      { title: "Provide music playlist with resident preferences", type: "INDEPENDENT" },
      { title: "Provide 1:1 in-room check-in", type: "ONE_TO_ONE" }
    ],
    defaultFrequency: "DAILY",
    defaultReviewDays: 30,
    suggestedBarriers: ["Anxiety", "Behavioral symptoms"],
    suggestedSupports: ["Sensory-friendly setup", "Music support", "Bedside option"]
  },
  {
    key: "newAdmissionAdjustment",
    name: "New Admission Adjustment",
    description: "Fast-start plan for first 30–60 days after admission.",
    defaultFocusAreas: ["SOCIALIZATION", "COMMUNITY_INTEGRATION", "MOOD_WELLBEING"],
    defaultGoalTemplates: [
      { templateKey: "social-peer-contact", baseline: "RARE", target: "SOMETIMES", timeframeDays: 30 },
      { templateKey: "community-event-engagement", baseline: "RARE", target: "SOMETIMES", timeframeDays: 60 }
    ],
    defaultInterventions: [
      { title: "Provide 1:1 motivation before group start", type: "ONE_TO_ONE" },
      { title: "Offer choice of 2–3 activities", type: "GROUP" },
      { title: "Seat near facilitator and reduce distractions", type: "GROUP" }
    ],
    defaultFrequency: "THREE_PER_WEEK",
    defaultReviewDays: 30,
    suggestedBarriers: ["Anxiety", "Isolation / withdrawal"],
    suggestedSupports: ["Consistent staffing approach", "Family collaboration", "Choice-based offers"]
  }
];

export const CARE_PLAN_TEMPLATE_BY_KEY = CARE_PLAN_TEMPLATES.reduce(
  (acc, template) => {
    acc[template.key] = template;
    return acc;
  },
  {} as Record<string, CarePlanTemplate>
);

export function getGoalTemplateByKey(templateKey: string) {
  return CARE_PLAN_GOAL_TEMPLATES.find((item) => item.templateKey === templateKey) ?? null;
}
