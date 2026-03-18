"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardCheck,
  Copy,
  FileClock,
  Loader2,
  Printer,
  Save,
  Sparkles,
  Trash2
} from "lucide-react";

import type {
  ClinicalAssessmentEditorData,
  ClinicalAssessmentHistoryRow,
  DocumentationResidentOption
} from "@/app/app/documentation/_lib";
import {
  formatActifyDate,
  parseDateOnlyInputToUtcStart,
  toDateInputValueInTimeZone
} from "@/lib/datetime";
import type { DocumentationSectionChangeState, DocumentationStatus } from "@/lib/documentation/types";
import { cn } from "@/lib/utils";

type UdaAssessmentType = "ADMISSION" | "ANNUAL" | "QUARTERLY";

type UdaSectionDefinition = {
  id: string;
  label: string;
  helper: string;
  options: string[];
};

type AdmissionInterestField = {
  id: string;
  label: string;
  options: readonly string[];
  hasDescription?: boolean;
  descriptionLabel?: string;
  hasPetAtHome?: boolean;
};

type AdmissionValues = {
  typeOfAssessment: "" | "Admission" | "Re-Admission";
  preferredName: string;
  formerOccupation: string;
  religion: string;
  registeredVoter: "" | "Yes" | "No";
  veteran: "" | "Yes" | "No";
  education: string;
  children: "" | "Yes" | "No";
  childrenCount: string;
  grandchildren: "" | "Yes" | "No";
  grandchildrenCount: string;
  orientedPerson: "" | "Yes" | "No";
  orientedPlace: "" | "Yes" | "No";
  orientedTime: "" | "Yes" | "No";
  shortTermMemory: "" | "Good" | "Adequate" | "Poor";
  longTermMemory: "" | "Good" | "Adequate" | "Poor";
  decisionMakingSkills: "" | "Good" | "Adequate" | "Poor";
  makingSelfUnderstood:
    | ""
    | "0 Understood"
    | "1 Usually Understood"
    | "2 Sometimes Understood"
    | "3 Rarely / Never Understood";
  abilityToUnderstandOthers:
    | ""
    | "0 Understands"
    | "1 Usually Understands"
    | "2 Sometimes Understands"
    | "3 Rarely / Never Understands";
  hearing:
    | ""
    | "0 Adequate"
    | "1 Minimal Difficulty"
    | "2 Moderate Difficulty"
    | "3 Highly Impaired";
  hearingAidUsed: "" | "Yes" | "No";
  vision:
    | ""
    | "0 Adequate"
    | "1 Impaired"
    | "2 Moderately Impaired"
    | "3 Highly Impaired"
    | "4 Severely Impaired";
  correctiveLensesUsed: "" | "Yes" | "No";
  interestChoices: Record<string, string>;
  interestDescriptions: Record<string, string>;
  hasPetAtHome: "" | "Yes" | "No";
  otherInterests: string;
  assessedNeeds: string;
  admissionSummary: string;
};

const ADMISSION_INTEREST_FIELDS: AdmissionInterestField[] = [
  {
    id: "games_cards_word_trivia_bingo",
    label: "Games: Cards / Word / Trivia / Bingo",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description of Interest"
  },
  { id: "puzzles", label: "Puzzles", options: ["Past", "Current", "Not Interested"] },
  {
    id: "arts_crafts_woodwork_ceramics",
    label: "Arts & Crafts / Woodwork / Ceramics",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description of Interest"
  },
  {
    id: "knitting_crocheting",
    label: "Knitting / Crocheting",
    options: ["Past", "Current", "Not Interested"]
  },
  { id: "drawing_painting", label: "Drawing / Painting", options: ["Past", "Current", "Not Interested"] },
  {
    id: "exercise_sports_tv_sports",
    label: "Exercise Groups / Sports / Watching Sports on TV",
    options: ["Past", "Current", "Not Interested"]
  },
  {
    id: "music_singing_radio",
    label: "Music / Singing / Listening to Radio",
    options: ["Past", "Current", "Not Interested"]
  },
  { id: "reading_writing", label: "Reading / Writing", options: ["Past", "Current", "Not Interested"] },
  {
    id: "spiritual_religious_group_tv",
    label: "Spiritual / Religious with Groups / Watching Religious Services on TV",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description of Spiritual Interests"
  },
  {
    id: "visits_with_clergy",
    label: "Visits with Clergy",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description"
  },
  { id: "trips_outside_facility", label: "Trips / Outside the Facility", options: ["Past", "Current", "Not Interested"] },
  {
    id: "shopping",
    label: "Shopping",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description"
  },
  {
    id: "walking_wheeling_outdoors",
    label: "Walking / Wheeling Outdoors",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description"
  },
  { id: "reminiscing", label: "Reminiscing", options: ["Past", "Current", "Not Interested"] },
  {
    id: "womens_mens_group",
    label: "Women’s Group / Men’s Group",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description of Group"
  },
  {
    id: "tv_movies",
    label: "Watching TV / Movies",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description"
  },
  {
    id: "gardening_plants_shows",
    label: "Gardening / Plants / Watching Gardening Shows / Videos",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description"
  },
  { id: "talking_conversing", label: "Talking / Conversing", options: ["Past", "Current", "Not Interested"] },
  {
    id: "helping_others_volunteering",
    label: "Helping Others / Volunteering",
    options: ["Past", "Current", "Not Interested"]
  },
  {
    id: "parties_social_events",
    label: "Parties / Social Events",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description"
  },
  {
    id: "hobbies",
    label: "Hobbies",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description"
  },
  {
    id: "visits_with_cat_or_dog",
    label: "Visits with Cat or Dog",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    hasPetAtHome: true,
    descriptionLabel: "Description"
  },
  {
    id: "current_events_group",
    label: "Current Events Group",
    options: ["Past", "Current", "Not Interested"],
    hasDescription: true,
    descriptionLabel: "Description"
  },
  {
    id: "smoking",
    label: "Smoking",
    options: ["Past", "Current", "Not Interested", "Never Smoked"],
    hasDescription: true,
    descriptionLabel: "Description"
  }
];

const ADMISSION_ASSESSED_NEEDS_PHRASES = [
  "Resident may benefit from encouragement to attend group activities",
  "Resident prefers 1:1 visits",
  "Resident prefers in-room leisure",
  "Resident benefits from socialization opportunities",
  "Resident benefits from spiritual programming",
  "Resident may require cueing and set-up assistance",
  "Resident may benefit from adapted activities related to sensory or cognitive limitations",
  "Right to refuse should be honored",
  "Resident enjoys familiar and preference-based programming"
];

const ADMISSION_NAV_SECTIONS = [
  { id: "admission-type", label: "Type" },
  { id: "admission-background", label: "Background" },
  { id: "admission-communication", label: "Communication" },
  { id: "admission-interests", label: "Interests" },
  { id: "admission-needs", label: "Assessed Needs" },
  { id: "admission-summary", label: "Summary" }
] as const;

const ADMISSION_NARRATIVE_SECTIONS: UdaSectionDefinition[] = [
  {
    id: "type",
    label: "Type of Assessment",
    helper: "",
    options: []
  },
  {
    id: "background",
    label: "Resident Background / Factual Information",
    helper: "",
    options: []
  },
  {
    id: "communication",
    label: "Communication & Cognition",
    helper: "",
    options: []
  },
  {
    id: "interests",
    label: "Activity Interests",
    helper: "",
    options: []
  },
  {
    id: "needs",
    label: "Identified Needs / Focuses for Activity Intervention",
    helper: "",
    options: []
  },
  {
    id: "summary",
    label: "Activity Admission Summary",
    helper: "",
    options: []
  }
];

const ANNUAL_SECTIONS: UdaSectionDefinition[] = [
  {
    id: "interests_preferences",
    label: "Interests / Preferences",
    helper: "Document the resident's preferred leisure activities and interests.",
    options: [
      "Bingo",
      "Trivia",
      "Music",
      "Church / Devotion",
      "Reminiscing",
      "Word games",
      "TV",
      "Movies",
      "Outdoors",
      "Crafts",
      "Cards / Dominoes",
      "Social visits",
      "1:1 visits",
      "Independent leisure",
      "Family contact"
    ]
  },
  {
    id: "prior_lifestyle",
    label: "Prior Lifestyle / Background",
    helper: "Capture meaningful routines, hobbies, and social history that should continue in programming.",
    options: [
      "Worked in service-oriented role",
      "Enjoyed church/community groups",
      "Preferred family-centered activities",
      "Enjoyed independent hobbies",
      "Preferred structured daily routine"
    ]
  },
  {
    id: "participation_pattern",
    label: "Current Participation Pattern",
    helper: "Summarize the resident's current attendance and participation pattern.",
    options: [
      "Attends groups regularly",
      "Attends selectively",
      "Prefers 1:1",
      "Prefers in-room programming",
      "Declines most activities",
      "Participates with cueing",
      "Participates as desired and tolerated"
    ]
  },
  {
    id: "strengths_abilities",
    label: "Strengths / Abilities",
    helper: "Highlight strengths to preserve engagement and quality of life.",
    options: [
      "Responds well to familiar staff",
      "Remains socially engaged with cues",
      "Able to complete short activities",
      "Enjoys sensory stimulation",
      "Able to participate in structured group"
    ]
  },
  {
    id: "barriers_limitations",
    label: "Barriers / Limitations",
    helper: "Identify barriers impacting successful participation.",
    options: [
      "Fatigue",
      "Weakness",
      "Endurance",
      "Hearing deficit",
      "Vision deficit",
      "Cognitive impairment",
      "Communication difficulty",
      "Anxiety",
      "Behavioral symptoms",
      "Isolation preference",
      "Bedbound",
      "Wheelchair dependent",
      "Right to refuse"
    ]
  },
  {
    id: "cognitive_communication",
    label: "Cognitive / Communication Considerations",
    helper: "Describe cognitive status and cueing/communication approach.",
    options: [
      "Benefits from verbal cueing",
      "Benefits from visual prompts",
      "Short one-step direction preferred",
      "Needs repeated cueing",
      "Responds best with familiar approach"
    ]
  },
  {
    id: "sensory_physical",
    label: "Sensory / Physical Limitations Affecting Activity Participation",
    helper: "Capture hearing, vision, mobility, and endurance needs.",
    options: [
      "Requires amplified voice",
      "Requires visual contrast / large print",
      "Needs adapted positioning",
      "Tolerates short duration only",
      "Requires in-room alternatives"
    ]
  },
  {
    id: "psychosocial_emotional",
    label: "Psychosocial / Emotional Status Related to Activities",
    helper: "Document mood and psychosocial considerations affecting participation.",
    options: [
      "Pleasant and receptive",
      "Withdrawn at times",
      "Anxious in large groups",
      "Benefits from reassurance",
      "Responds positively to 1:1"
    ]
  },
  {
    id: "group_participation",
    label: "Group Participation",
    helper: "Summarize tolerance and response to group settings.",
    options: [
      "Attends selected groups",
      "Attends with cueing",
      "Short group tolerance",
      "Limited group tolerance",
      "Prefers small-group setting"
    ]
  },
  {
    id: "one_to_one_participation",
    label: "1:1 Participation",
    helper: "Describe 1:1 response and effective individual approaches.",
    options: [
      "Accepts 1:1 better than group setting",
      "Engages with preferred staff",
      "Responds to brief room visits",
      "Responds to reminiscence-based 1:1",
      "Responds to music-based 1:1"
    ]
  },
  {
    id: "independent_leisure",
    label: "Independent / In-room Leisure",
    helper: "Capture independent leisure habits and supports.",
    options: [
      "Prefers TV / movies",
      "Enjoys word books or puzzles",
      "Benefits from sensory items",
      "Enjoys magazines or reading",
      "Requires set-up assistance"
    ]
  },
  {
    id: "family_spiritual_social",
    label: "Family / Spiritual / Social Preferences",
    helper: "Document family contact patterns and spiritual or social preferences.",
    options: [
      "Family contact important",
      "Enjoys spiritual support",
      "Prefers selected peers",
      "Benefits from family encouragement",
      "No expressed spiritual preference"
    ]
  },
  {
    id: "interventions_needed",
    label: "Activity Interventions Needed",
    helper: "Define interventions required to support successful participation.",
    options: [
      "Encourage attendance",
      "Offer in-room alternatives",
      "Provide 1:1 visits",
      "Adapt activity approach",
      "Short duration activities",
      "Familiar staff approach",
      "Sensory-based intervention",
      "Music-based intervention",
      "Spiritual support",
      "Family contact encouragement"
    ]
  },
  {
    id: "summary_statement",
    label: "Summary / Assessment Statement",
    helper: "Document final UDA summary statement and clinical recommendation.",
    options: [
      "participates as desired and tolerated",
      "prefers selective attendance",
      "accepts 1:1 better than group setting",
      "right to refuse honored",
      "benefits from encouragement and cueing",
      "enjoys familiar preference-based programming",
      "requires adapted approach for successful engagement"
    ]
  }
];

const QUARTERLY_SECTIONS: UdaSectionDefinition[] = [
  {
    id: "participation_since_last_review",
    label: "Participation Since Last Review",
    helper: "Review participation change since prior assessment.",
    options: [
      "No significant participation change",
      "Improved participation tolerance",
      "Decline in group participation",
      "More receptive to 1:1",
      "Participation fluctuates with cueing"
    ]
  },
  {
    id: "changes_interests_preferences",
    label: "Changes in Interests / Preferences",
    helper: "Document any preference changes or reaffirm no change.",
    options: [
      "No change in interests",
      "Increased music preference",
      "Increased in-room preference",
      "Reduced tolerance for large groups",
      "Newly expressed spiritual interest"
    ]
  },
  {
    id: "changes_physical_cognitive",
    label: "Changes in Physical / Cognitive Ability",
    helper: "Capture changes impacting approach and cueing.",
    options: [
      "No notable change",
      "Increased fatigue",
      "Requires increased cueing",
      "Declined endurance",
      "Needs more simplified direction"
    ]
  },
  {
    id: "changes_mood_behavior",
    label: "Changes in Mood / Behavior Affecting Activities",
    helper: "Describe behavior or mood changes affecting participation.",
    options: [
      "Mood remains stable",
      "Anxiety impacts participation",
      "Increased withdrawal",
      "Variable tolerance",
      "Responds to reassurance"
    ]
  },
  {
    id: "barriers_review",
    label: "Continued Barriers / New Barriers",
    helper: "Identify barriers still present and new barriers since last review.",
    options: [
      "Barriers unchanged",
      "Ongoing endurance limitation",
      "Hearing/vision concern continues",
      "New mobility limitation",
      "Right to refuse continues"
    ]
  },
  {
    id: "preferred_interventions",
    label: "Current Preferred Interventions",
    helper: "Confirm interventions that remain effective or note updates.",
    options: [
      "Continue preference-based program",
      "Continue selective group approach",
      "Continue 1:1 emphasis",
      "Continue adapted in-room options",
      "Continue cueing and encouragement"
    ]
  },
  {
    id: "quarterly_summary",
    label: "Quarterly Summary Statement",
    helper: "Summarize no change/changes and recommendation for care approach.",
    options: [
      "Current activity approach remains appropriate",
      "Interventions remain effective",
      "Plan updated for change in tolerance",
      "Continue care plan approach with monitoring",
      "Recommend revised individualized interventions"
    ]
  }
];

const CHANGE_STATE_LABELS: Record<DocumentationSectionChangeState, string> = {
  NO_CHANGE: "No Change",
  UPDATED: "Updated",
  SIGNIFICANT_CHANGE: "Significant Change"
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSectionValues(narrative: string, sections: UdaSectionDefinition[]) {
  const values: Record<string, string> = {};
  for (const section of sections) {
    const label = escapeRegExp(section.label);
    const headingPattern = new RegExp(
      `(?:^|\\n)(?:##\\s*)?${label}:\\s*\\n([\\s\\S]*?)(?=\\n(?:##\\s*)?(?:${sections.map((item) => escapeRegExp(item.label)).join("|")}):\\s*\\n|$)`,
      "i"
    );
    const match = narrative.match(headingPattern);
    values[section.id] = (match?.[1] || "").trim();
  }
  return values;
}

function parseStructuredSectionPayload(value: string): {
  state: DocumentationSectionChangeState | null;
  prior: string;
  current: string;
} {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let state: DocumentationSectionChangeState | null = null;
  const priorParts: string[] = [];
  const currentParts: string[] = [];
  let mode: "prior" | "current" = "current";

  for (const line of lines) {
    if (line.startsWith("State:")) {
      const token = line.slice("State:".length).trim().toUpperCase().replaceAll(" ", "_");
      if (token === "NO_CHANGE" || token === "UPDATED" || token === "SIGNIFICANT_CHANGE") {
        state = token;
      }
      continue;
    }
    if (line.startsWith("Prior:")) {
      mode = "prior";
      const part = line.slice("Prior:".length).trim();
      if (part) priorParts.push(part);
      continue;
    }
    if (line.startsWith("Current:")) {
      mode = "current";
      const part = line.slice("Current:".length).trim();
      if (part) currentParts.push(part);
      continue;
    }

    if (mode === "prior") {
      priorParts.push(line);
    } else {
      currentParts.push(line);
    }
  }

  return {
    state,
    prior: priorParts.join("\n").trim(),
    current: currentParts.join("\n").trim()
  };
}

function normalizeLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseLabeledBlock(block: string) {
  const map = new Map<string, string>();
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim().toLowerCase();
    const value = trimmed.slice(idx + 1).trim();
    map.set(key, value);
  }
  return map;
}

function createEmptyInterestRecord() {
  const output: Record<string, string> = {};
  for (const field of ADMISSION_INTEREST_FIELDS) {
    output[field.id] = "";
  }
  return output;
}

function createDefaultAdmissionValues(residentName?: string): AdmissionValues {
  const firstName = residentName?.split(" ")[0]?.trim() || "";
  return {
    typeOfAssessment: "Admission",
    preferredName: firstName,
    formerOccupation: "",
    religion: "",
    registeredVoter: "",
    veteran: "",
    education: "",
    children: "",
    childrenCount: "",
    grandchildren: "",
    grandchildrenCount: "",
    orientedPerson: "",
    orientedPlace: "",
    orientedTime: "",
    shortTermMemory: "",
    longTermMemory: "",
    decisionMakingSkills: "",
    makingSelfUnderstood: "",
    abilityToUnderstandOthers: "",
    hearing: "",
    hearingAidUsed: "",
    vision: "",
    correctiveLensesUsed: "",
    interestChoices: createEmptyInterestRecord(),
    interestDescriptions: createEmptyInterestRecord(),
    hasPetAtHome: "",
    otherInterests: "",
    assessedNeeds: "",
    admissionSummary: ""
  };
}

function parseAdmissionValues(narrative: string, residentName?: string): AdmissionValues {
  const base = createDefaultAdmissionValues(residentName);
  const sections = parseSectionValues(narrative, ADMISSION_NARRATIVE_SECTIONS);

  const typeMap = parseLabeledBlock(sections.type || "");
  const backgroundMap = parseLabeledBlock(sections.background || "");
  const communicationMap = parseLabeledBlock(sections.communication || "");
  const interestsMap = parseLabeledBlock(sections.interests || "");

  const typeOfAssessment = typeMap.get("type") || "";
  if (typeOfAssessment === "Admission" || typeOfAssessment === "Re-Admission") {
    base.typeOfAssessment = typeOfAssessment;
  }

  base.preferredName = backgroundMap.get("preferred name") || base.preferredName;
  base.formerOccupation = backgroundMap.get("former occupation") || "";
  base.religion = backgroundMap.get("religion") || "";
  const registeredVoter = backgroundMap.get("registered voter") || "";
  if (registeredVoter === "Yes" || registeredVoter === "No") {
    base.registeredVoter = registeredVoter;
  }
  const veteran = backgroundMap.get("veteran") || "";
  if (veteran === "Yes" || veteran === "No") {
    base.veteran = veteran;
  }
  base.education = backgroundMap.get("education") || "";
  const children = backgroundMap.get("children") || "";
  if (children === "Yes" || children === "No") {
    base.children = children;
  }
  base.childrenCount = backgroundMap.get("if yes, how many children") || "";
  const grandchildren = backgroundMap.get("grandchildren") || "";
  if (grandchildren === "Yes" || grandchildren === "No") {
    base.grandchildren = grandchildren;
  }
  base.grandchildrenCount = backgroundMap.get("if yes, how many grandchildren") || "";

  const yesNoKeys: Array<keyof AdmissionValues> = [
    "orientedPerson",
    "orientedPlace",
    "orientedTime",
    "hearingAidUsed",
    "correctiveLensesUsed"
  ];

  const communicationKeyMap: Array<[keyof AdmissionValues, string]> = [
    ["orientedPerson", "oriented to person"],
    ["orientedPlace", "oriented to place"],
    ["orientedTime", "oriented to time"],
    ["shortTermMemory", "short term memory"],
    ["longTermMemory", "long term memory"],
    ["decisionMakingSkills", "decision making skills"],
    ["makingSelfUnderstood", "making self understood"],
    ["abilityToUnderstandOthers", "ability to understand others"],
    ["hearing", "hearing"],
    ["hearingAidUsed", "hearing aid or other appliance used"],
    ["vision", "vision"],
    ["correctiveLensesUsed", "corrective lenses used"]
  ];

  for (const [stateKey, mapKey] of communicationKeyMap) {
    const value = communicationMap.get(mapKey) || "";
    if (!value) continue;
    if (yesNoKeys.includes(stateKey) && value !== "Yes" && value !== "No") continue;
    (base as unknown as Record<string, string>)[stateKey] = value;
  }

  for (const field of ADMISSION_INTEREST_FIELDS) {
    const choice = interestsMap.get(field.label.toLowerCase()) || "";
    if (choice && field.options.includes(choice)) {
      base.interestChoices[field.id] = choice;
    }

    const detailLabel = field.descriptionLabel || "Description";
    const detailKey = `${field.label} ${detailLabel}`.toLowerCase();
    base.interestDescriptions[field.id] = interestsMap.get(detailKey) || "";
  }

  const hasPet = interestsMap.get("visits with cat or dog has a pet at home") || "";
  if (hasPet === "Yes" || hasPet === "No") {
    base.hasPetAtHome = hasPet;
  }

  base.otherInterests = interestsMap.get("other interests") || "";
  base.assessedNeeds = sections.needs || "";
  base.admissionSummary = sections.summary || "";

  return base;
}

function appendLine(lines: string[], label: string, value: string) {
  if (!value.trim()) return;
  lines.push(`${label}: ${normalizeLine(value)}`);
}

function buildAdmissionNarrative(values: AdmissionValues) {
  const blocks: string[] = [];

  const typeLines: string[] = [];
  appendLine(typeLines, "Type", values.typeOfAssessment || "Admission");
  if (typeLines.length > 0) {
    blocks.push(`Type of Assessment:\n${typeLines.join("\n")}`);
  }

  const backgroundLines: string[] = [];
  appendLine(backgroundLines, "Preferred Name", values.preferredName);
  appendLine(backgroundLines, "Former Occupation", values.formerOccupation);
  appendLine(backgroundLines, "Religion", values.religion);
  appendLine(backgroundLines, "Registered Voter", values.registeredVoter);
  appendLine(backgroundLines, "Veteran", values.veteran);
  appendLine(backgroundLines, "Education", values.education);
  appendLine(backgroundLines, "Children", values.children);
  appendLine(backgroundLines, "If Yes, How many Children", values.childrenCount);
  appendLine(backgroundLines, "Grandchildren", values.grandchildren);
  appendLine(backgroundLines, "If Yes, How many Grandchildren", values.grandchildrenCount);
  if (backgroundLines.length > 0) {
    blocks.push(`Resident Background / Factual Information:\n${backgroundLines.join("\n")}`);
  }

  const communicationLines: string[] = [];
  appendLine(communicationLines, "Oriented to Person", values.orientedPerson);
  appendLine(communicationLines, "Oriented to Place", values.orientedPlace);
  appendLine(communicationLines, "Oriented to Time", values.orientedTime);
  appendLine(communicationLines, "Short Term Memory", values.shortTermMemory);
  appendLine(communicationLines, "Long Term Memory", values.longTermMemory);
  appendLine(communicationLines, "Decision Making Skills", values.decisionMakingSkills);
  appendLine(communicationLines, "Making Self Understood", values.makingSelfUnderstood);
  appendLine(communicationLines, "Ability to Understand Others", values.abilityToUnderstandOthers);
  appendLine(communicationLines, "Hearing", values.hearing);
  appendLine(communicationLines, "Hearing Aid or Other Appliance Used", values.hearingAidUsed);
  appendLine(communicationLines, "Vision", values.vision);
  appendLine(communicationLines, "Corrective Lenses Used", values.correctiveLensesUsed);
  if (communicationLines.length > 0) {
    blocks.push(`Communication & Cognition:\n${communicationLines.join("\n")}`);
  }

  const interestLines: string[] = [];
  for (const field of ADMISSION_INTEREST_FIELDS) {
    const choice = values.interestChoices[field.id] || "";
    appendLine(interestLines, field.label, choice);
    if (field.hasDescription) {
      const descriptionLabel = field.descriptionLabel || "Description";
      appendLine(interestLines, `${field.label} ${descriptionLabel}`, values.interestDescriptions[field.id] || "");
    }
  }
  appendLine(interestLines, "Visits with Cat or Dog Has a Pet at Home", values.hasPetAtHome);
  appendLine(interestLines, "Other Interests", values.otherInterests);
  if (interestLines.length > 0) {
    blocks.push(`Activity Interests:\n${interestLines.join("\n")}`);
  }

  if (values.assessedNeeds.trim()) {
    blocks.push(`Identified Needs / Focuses for Activity Intervention:\n${values.assessedNeeds.trim()}`);
  }

  if (values.admissionSummary.trim()) {
    blocks.push(`Activity Admission Summary:\n${values.admissionSummary.trim()}`);
  }

  return blocks.join("\n\n").trim();
}

function parseQuarterlyNarrative(narrative: string) {
  const raw = parseSectionValues(narrative, QUARTERLY_SECTIONS);
  const current: Record<string, string> = {};
  const prior: Record<string, string> = {};
  const states: Record<string, DocumentationSectionChangeState> = {};

  for (const section of QUARTERLY_SECTIONS) {
    const parsed = parseStructuredSectionPayload(raw[section.id] || "");
    current[section.id] = parsed.current || raw[section.id] || "";
    prior[section.id] = parsed.prior;
    if (parsed.state) {
      states[section.id] = parsed.state;
    }
  }

  return { current, prior, states };
}

function buildNarrative(params: {
  assessmentType: UdaAssessmentType;
  annualValues: Record<string, string>;
  quarterlyValues: Record<string, string>;
  quarterlyChangeStates: Record<string, DocumentationSectionChangeState>;
  quarterlyPriorValues: Record<string, string>;
  admissionValues: AdmissionValues;
}) {
  const blocks: string[] = [];

  if (params.assessmentType === "ADMISSION") {
    return buildAdmissionNarrative(params.admissionValues);
  }

  if (params.assessmentType === "ANNUAL") {
    for (const section of ANNUAL_SECTIONS) {
      const value = (params.annualValues[section.id] || "").trim();
      if (!value) continue;
      blocks.push(`${section.label}:\n${value}`);
    }
    return blocks.join("\n\n").trim();
  }

  for (const section of QUARTERLY_SECTIONS) {
    const value = (params.quarterlyValues[section.id] || "").trim();
    const prior = (params.quarterlyPriorValues[section.id] || "").trim();
    const state = params.quarterlyChangeStates[section.id] || "NO_CHANGE";

    if (!value && !prior) continue;

    const lines: string[] = [];
    lines.push(`State: ${CHANGE_STATE_LABELS[state]}`);
    if (prior) lines.push(`Prior: ${prior}`);
    if (value) lines.push(`Current: ${value}`);

    blocks.push(`${section.label}:\n${lines.join("\n")}`);
  }

  return blocks.join("\n\n").trim();
}

function calculateProgress(params: {
  assessmentType: UdaAssessmentType;
  annualValues: Record<string, string>;
  quarterlyValues: Record<string, string>;
  admissionValues: AdmissionValues;
}) {
  if (params.assessmentType === "ANNUAL") {
    const done = ANNUAL_SECTIONS.filter((section) => (params.annualValues[section.id] || "").trim().length > 0).length;
    return Math.round((done / ANNUAL_SECTIONS.length) * 100);
  }

  if (params.assessmentType === "QUARTERLY") {
    const done = QUARTERLY_SECTIONS.filter((section) => (params.quarterlyValues[section.id] || "").trim().length > 0).length;
    return Math.round((done / QUARTERLY_SECTIONS.length) * 100);
  }

  const admission = params.admissionValues;
  const hasBackground =
    Boolean(admission.preferredName.trim()) ||
    Boolean(admission.formerOccupation.trim()) ||
    Boolean(admission.religion.trim()) ||
    Boolean(admission.education.trim()) ||
    Boolean(admission.registeredVoter) ||
    Boolean(admission.veteran) ||
    Boolean(admission.children) ||
    Boolean(admission.grandchildren);
  const hasCommunication =
    Boolean(admission.orientedPerson) &&
    Boolean(admission.orientedPlace) &&
    Boolean(admission.orientedTime) &&
    Boolean(admission.shortTermMemory) &&
    Boolean(admission.longTermMemory) &&
    Boolean(admission.decisionMakingSkills) &&
    Boolean(admission.makingSelfUnderstood) &&
    Boolean(admission.abilityToUnderstandOthers);
  const interestCount = ADMISSION_INTEREST_FIELDS.filter((field) => Boolean(admission.interestChoices[field.id])).length;
  const hasInterests = interestCount > 0 || Boolean(admission.otherInterests.trim());
  const hasNeeds = Boolean(admission.assessedNeeds.trim());
  const hasSummary = Boolean(admission.admissionSummary.trim());
  const hasType = Boolean(admission.typeOfAssessment);

  const completed = [hasType, hasBackground, hasCommunication, hasInterests, hasNeeds, hasSummary].filter(Boolean).length;
  return Math.round((completed / 6) * 100);
}

function summarizeAnnual(values: Record<string, string>) {
  const participation = values.participation_pattern || "participates as desired and tolerated";
  const barriers = values.barriers_limitations || "intermittent barriers noted";
  const interventions = values.interventions_needed || "preference-based interventions";
  return `Resident ${participation.toLowerCase()}. Barriers include ${barriers.toLowerCase()}. Continue ${interventions.toLowerCase()} while honoring right to refuse and reinforcing resident choice.`;
}

function summarizeQuarterly(values: Record<string, string>, states: Record<string, DocumentationSectionChangeState>) {
  const changeCount = Object.values(states).filter((state) => state === "UPDATED" || state === "SIGNIFICANT_CHANGE").length;
  const participation = values.participation_since_last_review || "participation remains as desired and tolerated";
  if (changeCount === 0) {
    return `Quarterly review indicates no major activity participation change. ${participation}. Current interventions remain appropriate and should continue.`;
  }
  return `Quarterly review identified ${changeCount} area(s) requiring update. ${participation}. Activity approach should be updated where indicated and monitored next review cycle.`;
}

function summarizeAdmission(values: AdmissionValues, residentName: string) {
  const currentInterests = ADMISSION_INTEREST_FIELDS.filter((field) => values.interestChoices[field.id] === "Current")
    .slice(0, 6)
    .map((field) => field.label.replace("Games: ", ""));

  const preferencePhrase =
    values.interestChoices.talking_conversing === "Current"
      ? "social conversation and relationship-centered interaction"
      : values.interestChoices.tv_movies === "Current" || values.interestChoices.reading_writing === "Current"
        ? "familiar in-room and independent leisure options"
        : values.interestChoices.games_cards_word_trivia_bingo === "Current"
          ? "structured group and game-based programming"
          : "a blend of group and individualized programming";

  const barriers: string[] = [];
  if (values.shortTermMemory === "Poor" || values.longTermMemory === "Poor") barriers.push("memory impairment");
  if (values.decisionMakingSkills === "Poor") barriers.push("decision-making limitations");
  if (values.hearing && values.hearing !== "0 Adequate") barriers.push("hearing limitations");
  if (values.vision && values.vision !== "0 Adequate") barriers.push("vision limitations");
  if (values.makingSelfUnderstood === "3 Rarely / Never Understood") barriers.push("communication challenges");

  const barrierText = barriers.length > 0 ? barriers.join(", ") : "no major communication/cognition barriers identified";
  const interestsText = currentInterests.length > 0 ? currentInterests.join(", ") : "resident preferences documented in assessment";

  return `${residentName || "Resident"} interviewed/assessed upon admission regarding background, communication, cognition, sensory status, and leisure interests. Resident expressed interest in ${interestsText}. Resident appears to prefer ${preferencePhrase}. Barriers that may affect participation include ${barrierText}. Resident will be encouraged to attend and participate in preferred group and/or 1:1 activities as desired and tolerated. Activity staff will provide interventions based on resident choice, abilities, and assessed needs to promote psychosocial well-being and quality of life.`;
}

function statusPill(status: DocumentationStatus) {
  if (status === "COMPLETED") return "border-emerald-300/35 bg-emerald-500/20 text-emerald-100";
  if (status === "READY_REVIEW") return "border-violet-300/35 bg-violet-500/20 text-violet-100";
  if (status === "IN_PROGRESS") return "border-sky-300/35 bg-sky-500/20 text-sky-100";
  return "border-slate-300/30 bg-slate-500/20 text-slate-100";
}

function assessmentTypeLabel(type: UdaAssessmentType) {
  if (type === "ADMISSION") return "Admission";
  return type === "ANNUAL" ? "Annual" : "Quarterly";
}

function addDaysToDateInput(value: string, days: number, timeZone?: string | null) {
  const parsed = parseDateOnlyInputToUtcStart(value, timeZone);
  if (!parsed) return "";
  return toDateInputValueInTimeZone(new Date(parsed.getTime() + days * 24 * 60 * 60 * 1000), timeZone);
}

function computeAdmissionDueDateFromResident(resident: DocumentationResidentOption | null, timeZone?: string | null) {
  if (!resident?.admissionDateIso) return "";
  const admissionDate = toDateInputValueInTimeZone(resident.admissionDateIso, timeZone);
  if (!admissionDate) return "";
  return addDaysToDateInput(admissionDate, 7, timeZone);
}

function dueIndicatorLabel(value: string, timeZone?: string | null) {
  const parsed = parseDateOnlyInputToUtcStart(value, timeZone);
  if (!parsed) return { label: "Due date unavailable", tone: "text-rose-200" as const };
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diff = Math.ceil((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    const days = Math.abs(diff);
    return {
      label: `Overdue by ${days} day${days === 1 ? "" : "s"}`,
      tone: "text-rose-200" as const
    };
  }
  if (diff === 0) return { label: "Due today", tone: "text-amber-100" as const };
  if (diff === 1) return { label: "Due tomorrow", tone: "text-amber-100" as const };
  return { label: `Due in ${diff} days`, tone: "text-emerald-100" as const };
}

function getAdmissionFinalizeIssues(params: {
  resident: DocumentationResidentOption | null;
  residentId: string;
  values: AdmissionValues;
  dueDate: string;
}) {
  const issues: string[] = [];
  if (!params.residentId) {
    issues.push("Resident must be selected.");
  }
  if (!params.resident?.admissionDateIso) {
    issues.push("Resident Admission Date is required before finalizing Admission UDA.");
  }
  if (!params.dueDate) {
    issues.push("Admission UDA due date is missing.");
  }
  if (!params.values.typeOfAssessment) {
    issues.push("Type of Assessment is required.");
  }
  if (!params.values.preferredName.trim() && !params.resident?.name) {
    issues.push("Preferred Name or resident identity is required.");
  }

  const missingCoreCommunication =
    !params.values.orientedPerson ||
    !params.values.orientedPlace ||
    !params.values.orientedTime ||
    !params.values.shortTermMemory ||
    !params.values.longTermMemory ||
    !params.values.decisionMakingSkills ||
    !params.values.makingSelfUnderstood ||
    !params.values.abilityToUnderstandOthers ||
    !params.values.hearing ||
    !params.values.vision;

  if (missingCoreCommunication) {
    issues.push("Core Communication & Cognition fields are required.");
  }

  const interestCount = ADMISSION_INTEREST_FIELDS.filter((field) => Boolean(params.values.interestChoices[field.id])).length;
  if (interestCount === 0 && !params.values.otherInterests.trim()) {
    issues.push("Document at least one Activity Interest.");
  }

  if (!params.values.assessedNeeds.trim()) {
    issues.push("Identified Needs / Focuses is required.");
  }

  if (!params.values.admissionSummary.trim()) {
    issues.push("Activity Admission Summary is required.");
  }

  return issues;
}

export function UdaAssessmentEditor({
  residents,
  initial,
  history,
  timeZone
}: {
  residents: DocumentationResidentOption[];
  initial: ClinicalAssessmentEditorData;
  history: ClinicalAssessmentHistoryRow[];
  timeZone?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialAssessmentType =
    (initial.assessmentType === "ADMISSION" || initial.assessmentType === "QUARTERLY" ? initial.assessmentType : "ANNUAL") as UdaAssessmentType;
  const [assessmentType, setAssessmentType] = useState<UdaAssessmentType>(initialAssessmentType);
  const [residentId, setResidentId] = useState(initial.residentId);
  const [status, setStatus] = useState<DocumentationStatus>(initial.status);
  const [priority, setPriority] = useState(initial.priority);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [reviewDate, setReviewDate] = useState(initial.reviewDate);
  const [occurredAt, setOccurredAt] = useState(initial.occurredAt);
  const [assignedStaff, setAssignedStaff] = useState(initial.assignedStaff);
  const [followUp, setFollowUp] = useState(initial.followUp);
  const [carryForwardFromId, setCarryForwardFromId] = useState(initial.carryForwardFromId);
  const [noMajorChange, setNoMajorChange] = useState(initial.noMajorChange);

  const initialAnnualValues = useMemo(() => parseSectionValues(initial.narrative, ANNUAL_SECTIONS), [initial.narrative]);
  const initialQuarterlyParsed = useMemo(() => parseQuarterlyNarrative(initial.narrative), [initial.narrative]);
  const initialAdmissionValues = useMemo(() => parseAdmissionValues(initial.narrative), [initial.narrative]);

  const [annualValues, setAnnualValues] = useState<Record<string, string>>(initialAnnualValues);
  const [quarterlyValues, setQuarterlyValues] = useState<Record<string, string>>(initialQuarterlyParsed.current);
  const [admissionValues, setAdmissionValues] = useState<AdmissionValues>(initialAdmissionValues);

  const [quarterlyChangeStates, setQuarterlyChangeStates] = useState<Record<string, DocumentationSectionChangeState>>(() => {
    const states: Record<string, DocumentationSectionChangeState> = {};
    for (const section of QUARTERLY_SECTIONS) {
      states[section.id] = initial.sectionStates[section.id] || initialQuarterlyParsed.states[section.id] || "NO_CHANGE";
    }
    return states;
  });

  const [quarterlyPriorValues, setQuarterlyPriorValues] = useState<Record<string, string>>(initialQuarterlyParsed.prior);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  const resident = useMemo(() => residents.find((item) => item.id === residentId) ?? null, [residentId, residents]);

  const latestAdmissionHistory = useMemo(
    () => history.find((entry) => entry.assessmentType === "ADMISSION") ?? null,
    [history]
  );
  const latestAnnualHistory = useMemo(
    () => history.find((entry) => entry.assessmentType === "ANNUAL") ?? null,
    [history]
  );

  const latestQuarterlyHistory = useMemo(
    () => history.find((entry) => entry.assessmentType === "QUARTERLY") ?? null,
    [history]
  );

  const currentProgress = useMemo(
    () =>
      calculateProgress({
        assessmentType,
        annualValues,
        quarterlyValues,
        admissionValues
      }),
    [admissionValues, annualValues, assessmentType, quarterlyValues]
  );

  const admissionDueDateAuto = useMemo(
    () => computeAdmissionDueDateFromResident(resident, timeZone),
    [resident, timeZone]
  );

  useEffect(() => {
    if (assessmentType !== "ADMISSION") return;
    if (status === "COMPLETED") return;
    if (!admissionDueDateAuto) {
      if (!dueDate) return;
      setDueDate("");
      return;
    }
    if (dueDate !== admissionDueDateAuto) {
      setDueDate(admissionDueDateAuto);
    }
  }, [assessmentType, admissionDueDateAuto, dueDate, status]);

  useEffect(() => {
    if (assessmentType !== "ADMISSION") return;
    if (admissionValues.preferredName.trim()) return;
    if (!resident?.name) return;
    const firstName = resident.name.split(" ")[0]?.trim();
    if (!firstName) return;
    setAdmissionValues((current) => ({
      ...current,
      preferredName: firstName
    }));
  }, [admissionValues.preferredName, assessmentType, resident?.name]);

  const dirtySnapshot = useMemo(
    () =>
      JSON.stringify({
        assessmentType,
        residentId,
        status,
        priority,
        dueDate,
        reviewDate,
        occurredAt,
        assignedStaff,
        followUp,
        carryForwardFromId,
        noMajorChange,
        annualValues,
        quarterlyValues,
        quarterlyChangeStates,
        quarterlyPriorValues,
        admissionValues
      }),
    [
      admissionValues,
      annualValues,
      assessmentType,
      assignedStaff,
      carryForwardFromId,
      dueDate,
      followUp,
      noMajorChange,
      occurredAt,
      priority,
      quarterlyChangeStates,
      quarterlyPriorValues,
      quarterlyValues,
      residentId,
      reviewDate,
      status
    ]
  );

  const baselineRef = useRef<string>(dirtySnapshot);
  const isDirty = dirtySnapshot !== baselineRef.current;

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const applyHistoryEntry = (entry: ClinicalAssessmentHistoryRow, mode: "duplicate" | "prior") => {
    if (mode === "duplicate") {
      const parsedAnnual = parseSectionValues(entry.narrative, ANNUAL_SECTIONS);
      const parsedQuarterly = parseQuarterlyNarrative(entry.narrative);
      const parsedAdmission = parseAdmissionValues(entry.narrative, resident?.name);

      if (entry.assessmentType === "ADMISSION") {
        setAssessmentType("ADMISSION");
        setAdmissionValues(parsedAdmission);
      } else if (entry.assessmentType === "ANNUAL") {
        setAssessmentType("ANNUAL");
        setAnnualValues(parsedAnnual);
      } else {
        setAssessmentType("QUARTERLY");
        setQuarterlyValues(parsedQuarterly.current);
        setQuarterlyPriorValues(parsedQuarterly.prior);
        setQuarterlyChangeStates((current) => {
          const next = { ...current };
          for (const section of QUARTERLY_SECTIONS) {
            next[section.id] = parsedQuarterly.states[section.id] || "NO_CHANGE";
          }
          return next;
        });
      }

      setCarryForwardFromId(entry.id);
      setFollowUp(entry.summary);
      if (entry.dueDateIso) setDueDate(entry.dueDateIso.slice(0, 10));
      if (entry.reviewDateIso) setReviewDate(entry.reviewDateIso.slice(0, 10));
      return;
    }

    const source = parseSectionValues(entry.narrative, ANNUAL_SECTIONS);
    const priorValues: Record<string, string> = {};

    for (const section of QUARTERLY_SECTIONS) {
      const annualKey = section.id
        .replace("participation_since_last_review", "participation_pattern")
        .replace("changes_interests_preferences", "interests_preferences")
        .replace("changes_physical_cognitive", "cognitive_communication")
        .replace("changes_mood_behavior", "psychosocial_emotional")
        .replace("barriers_review", "barriers_limitations")
        .replace("preferred_interventions", "interventions_needed")
        .replace("quarterly_summary", "summary_statement");
      priorValues[section.id] = source[annualKey] || "";
    }

    setAssessmentType("QUARTERLY");
    setQuarterlyPriorValues(priorValues);
    setCarryForwardFromId(entry.id);
  };

  const submit = (nextStatus: DocumentationStatus) => {
    setFeedback(null);

    let narrative = buildNarrative({
      assessmentType,
      annualValues,
      quarterlyValues,
      quarterlyChangeStates,
      quarterlyPriorValues,
      admissionValues
    });

    if (!residentId) {
      setFeedback({ type: "error", message: "Select a resident before saving this assessment." });
      return;
    }

    if (!narrative.trim()) {
      if (nextStatus === "DRAFT") {
        narrative = "Draft assessment started.";
      } else {
        setFeedback({ type: "error", message: "Complete at least one structured section before saving." });
        return;
      }
    }

    if (assessmentType === "ADMISSION" && nextStatus === "COMPLETED") {
      const issues = getAdmissionFinalizeIssues({
        resident,
        residentId,
        values: admissionValues,
        dueDate
      });

      if (issues.length > 0) {
        setFeedback({
          type: "error",
          message: `Finalize blocked: ${issues.join(" ")}`
        });
        return;
      }
    }

    const payload = {
      kind: "UDA" as const,
      residentId,
      title: `${assessmentTypeLabel(assessmentType)} UDA Assessment`,
      narrative,
      followUp,
      status: nextStatus,
      priority,
      dueDate: dueDate || null,
      reviewDate: reviewDate || null,
      occurredAt: occurredAt || null,
      assessmentType,
      assignedStaff: assignedStaff || null,
      noMajorChange: assessmentType === "QUARTERLY" ? noMajorChange : null,
      sectionStates: assessmentType === "QUARTERLY" ? quarterlyChangeStates : null,
      carryForwardFromId: carryForwardFromId || null,
      sectionProgress: currentProgress,
      participationLevel: "MODERATE" as const,
      moodAffect: "CALM" as const,
      cuesRequired: "VERBAL" as const,
      response: "NEUTRAL" as const
    };

    startTransition(async () => {
      try {
        const endpoint = initial.id ? `/api/documentation/entries/${initial.id}` : "/api/documentation/entries";
        const method = initial.id ? "PATCH" : "POST";
        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = (await response.json().catch(() => null)) as
          | { entry?: { id: string }; error?: { message?: string } }
          | null;

        if (!response.ok || !result?.entry?.id) {
          throw new Error(result?.error?.message || "Unable to save UDA assessment.");
        }

        baselineRef.current = dirtySnapshot;
        setFeedback({
          type: "ok",
          message: nextStatus === "COMPLETED" ? "Assessment finalized." : "Assessment saved."
        });

        router.replace(`/app/documentation/uda/${encodeURIComponent(result.entry.id)}`);
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Unable to save UDA assessment."
        });
      }
    });
  };

  const deleteEntry = () => {
    if (!initial.id) return;
    if (!window.confirm("Delete this UDA assessment? This action cannot be undone.")) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/documentation/entries/${initial.id}`, {
          method: "DELETE"
        });
        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(result?.error?.message || "Unable to delete UDA assessment.");
        }
        router.push("/app/documentation/uda");
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Unable to delete UDA assessment."
        });
      }
    });
  };

  const admissionDueLabel = useMemo(
    () => (assessmentType === "ADMISSION" && dueDate ? dueIndicatorLabel(dueDate, timeZone) : null),
    [assessmentType, dueDate, timeZone]
  );

  return (
    <section className="space-y-4">
      <header className="rounded-[1.6rem] border border-amber-300/25 bg-[linear-gradient(180deg,rgba(34,26,12,0.85)_0%,rgba(15,12,8,0.9)_100%)] p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-100/80">Activity Assessment Workflow</p>
            <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">
              {initial.id ? "Update UDA Assessment" : "New UDA Assessment"}
            </h2>
            <p className="mt-1 text-sm text-[#c2d2ec]">
              Admission, annual, and quarterly assessment workspace with due-date intelligence, carry-forward history, and finalize workflow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/app/documentation/uda"
              className="inline-flex h-10 items-center rounded-full border border-[#35527f] bg-[#132848] px-4 text-xs font-semibold text-[#d8e7ff]"
            >
              Back to Queue
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#3a5f8f] bg-[#17335f] px-4 text-xs font-semibold text-[#d8e7ff]"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            {initial.id ? (
              <button
                type="button"
                onClick={deleteEntry}
                disabled={isPending}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-rose-300/35 bg-rose-500/20 px-4 text-xs font-semibold text-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="space-y-3">
          <section className="rounded-2xl border border-[#2a426a] bg-[#0b1930] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab2d9]">Assessment Type</p>
            <div className="mt-2 grid gap-2">
              <button
                type="button"
                onClick={() => setAssessmentType("ADMISSION")}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-full border text-xs font-semibold",
                  assessmentType === "ADMISSION"
                    ? "border-amber-300/35 bg-amber-500/20 text-amber-100"
                    : "border-[#37527f] bg-[#152b4f] text-[#d8e7ff]"
                )}
              >
                Admission UDA
              </button>
              <button
                type="button"
                onClick={() => setAssessmentType("ANNUAL")}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-full border text-xs font-semibold",
                  assessmentType === "ANNUAL"
                    ? "border-amber-300/35 bg-amber-500/20 text-amber-100"
                    : "border-[#37527f] bg-[#152b4f] text-[#d8e7ff]"
                )}
              >
                Annual UDA
              </button>
              <button
                type="button"
                onClick={() => setAssessmentType("QUARTERLY")}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-full border text-xs font-semibold",
                  assessmentType === "QUARTERLY"
                    ? "border-amber-300/35 bg-amber-500/20 text-amber-100"
                    : "border-[#37527f] bg-[#152b4f] text-[#d8e7ff]"
                )}
              >
                Quarterly UDA
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#2a426a] bg-[#0b1930] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab2d9]">Section Progress</p>
            <p className="mt-2 text-3xl font-black text-white">{currentProgress}%</p>
            <div className="mt-2 h-2 rounded-full bg-[#1f355b]">
              <div className="h-2 rounded-full bg-[linear-gradient(90deg,#f59e0b_0%,#f97316_100%)]" style={{ width: `${Math.max(currentProgress, 4)}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#9cb4da]">Structured completion across required assessment sections.</p>
          </section>

          <section className="rounded-2xl border border-[#2a426a] bg-[#0b1930] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab2d9]">Quick Summary</p>
            <button
              type="button"
              onClick={() => {
                if (assessmentType === "ANNUAL") {
                  setAnnualValues((current) => ({
                    ...current,
                    summary_statement: summarizeAnnual(current)
                  }));
                  return;
                }
                if (assessmentType === "QUARTERLY") {
                  setQuarterlyValues((current) => ({
                    ...current,
                    quarterly_summary: summarizeQuarterly(current, quarterlyChangeStates)
                  }));
                  return;
                }
                setAdmissionValues((current) => ({
                  ...current,
                  admissionSummary: summarizeAdmission(current, resident?.name || current.preferredName || "Resident")
                }));
              }}
              className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1 rounded-full border border-[#3f5f90] bg-[#173460] text-xs font-semibold text-[#d9e8ff]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Build Summary Statement
            </button>

            {assessmentType === "QUARTERLY" ? (
              <label className="mt-3 flex items-center gap-2 text-xs text-[#c8d8f4]">
                <input
                  type="checkbox"
                  checked={noMajorChange}
                  onChange={(event) => setNoMajorChange(event.target.checked)}
                  className="h-4 w-4 rounded border-[#4a6591] bg-[#10213e]"
                />
                No major change this quarter
              </label>
            ) : null}

            {assessmentType === "ADMISSION" ? (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-[#9cb4da]">Jump to section</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ADMISSION_NAV_SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => {
                        const target = document.getElementById(section.id);
                        target?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="rounded-full border border-[#35527f] bg-[#142a4d] px-2.5 py-1 text-[10px] font-semibold text-[#d8e7ff]"
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </aside>

        <div className="space-y-4">
          <section className="rounded-2xl border border-[#294068] bg-[linear-gradient(180deg,#0a182f_0%,#091325_100%)] p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Resident</span>
                <select
                  value={residentId}
                  onChange={(event) => setResidentId(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                >
                  <option value="">Select resident</option>
                  {residents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.room} · {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as DocumentationStatus)}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="READY_REVIEW">Ready to Review</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Priority</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as "LOW" | "MEDIUM" | "HIGH")}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Due Date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  disabled={assessmentType === "ADMISSION"}
                  className={cn(
                    "h-10 w-full rounded-xl border px-3 text-sm text-[#dceaff]",
                    assessmentType === "ADMISSION"
                      ? "border-amber-300/40 bg-[#3b2a0f]/40"
                      : "border-[#2f476f] bg-[#0d1d36]"
                  )}
                />
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Review Date</span>
                <input
                  type="date"
                  value={reviewDate}
                  onChange={(event) => setReviewDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                />
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Assessment Date/Time</span>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                />
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf] md:col-span-2 xl:col-span-3">
                <span className="font-semibold uppercase tracking-[0.1em]">Assigned Staff</span>
                <input
                  value={assignedStaff}
                  onChange={(event) => setAssignedStaff(event.target.value)}
                  placeholder="Optional: assigned clinician or reviewer"
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff] placeholder:text-[#839bc1]"
                />
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf] md:col-span-2 xl:col-span-3">
                <span className="font-semibold uppercase tracking-[0.1em]">Follow-Up / Care Plan Coordination</span>
                <textarea
                  value={followUp}
                  onChange={(event) => setFollowUp(event.target.value)}
                  rows={2}
                  placeholder="Optional follow-up action summary"
                  className="w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#839bc1]"
                />
              </label>
            </div>

            {assessmentType === "ADMISSION" && !resident?.admissionDateIso ? (
              <div className="mt-3 rounded-xl border border-rose-300/35 bg-rose-500/10 p-3 text-xs text-rose-100">
                <p className="inline-flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Admission Date required
                </p>
                <p className="mt-1 text-rose-100/90">
                  This resident is missing an Admission Date. Add Admission Date on the resident profile before finalizing Admission UDA.
                </p>
                {resident ? (
                  <Link
                    href={`/app/residents/${encodeURIComponent(resident.id)}`}
                    className="mt-2 inline-flex h-8 items-center rounded-full border border-rose-300/40 bg-rose-500/15 px-3 text-[11px] font-semibold text-rose-100"
                  >
                    Open Resident Profile
                  </Link>
                ) : null}
              </div>
            ) : null}
          </section>

          {assessmentType === "ANNUAL" ? (
            <section className="space-y-3">
              {ANNUAL_SECTIONS.map((section) => (
                <article key={section.id} className="rounded-2xl border border-[#2a426a] bg-[#0a182f] p-4">
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{section.label}</h3>
                      <p className="mt-1 text-xs text-[#9fb6da]">{section.helper}</p>
                    </div>
                  </header>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {section.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setAnnualValues((current) => ({
                            ...current,
                            [section.id]: current[section.id]?.includes(option)
                              ? current[section.id]
                              : `${current[section.id] ? `${current[section.id].trim()}\n` : ""}${option}`.trim()
                          }))
                        }
                        className="inline-flex rounded-full border border-[#34517f] bg-[#142a4d] px-3 py-1 text-[11px] font-semibold text-[#d8e7ff]"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={4}
                    value={annualValues[section.id] || ""}
                    onChange={(event) =>
                      setAnnualValues((current) => ({
                        ...current,
                        [section.id]: event.target.value
                      }))
                    }
                    className="mt-3 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#8198be]"
                    placeholder="Document assessment details"
                  />
                </article>
              ))}
            </section>
          ) : null}

          {assessmentType === "QUARTERLY" ? (
            <section className="space-y-3">
              {QUARTERLY_SECTIONS.map((section) => (
                <article key={section.id} className="rounded-2xl border border-[#2a426a] bg-[#0a182f] p-4">
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{section.label}</h3>
                      <p className="mt-1 text-xs text-[#9fb6da]">{section.helper}</p>
                    </div>
                    <div className="inline-flex rounded-full border border-[#34527f] bg-[#13284b] p-1">
                      {(["NO_CHANGE", "UPDATED", "SIGNIFICANT_CHANGE"] as DocumentationSectionChangeState[]).map((state) => (
                        <button
                          key={state}
                          type="button"
                          onClick={() =>
                            setQuarterlyChangeStates((current) => ({
                              ...current,
                              [section.id]: state
                            }))
                          }
                          className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                            quarterlyChangeStates[section.id] === state
                              ? "bg-amber-500/25 text-amber-100"
                              : "text-[#b6cbef]"
                          )}
                        >
                          {CHANGE_STATE_LABELS[state]}
                        </button>
                      ))}
                    </div>
                  </header>

                  {quarterlyPriorValues[section.id] ? (
                    <div className="mt-2 rounded-xl border border-[#39557f] bg-[#112542] p-2 text-xs text-[#abc3e8]">
                      <p className="font-semibold text-[#dceaff]">Carry-forward prior</p>
                      <p className="mt-1 whitespace-pre-wrap">{quarterlyPriorValues[section.id]}</p>
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {section.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setQuarterlyValues((current) => ({
                            ...current,
                            [section.id]: current[section.id]?.includes(option)
                              ? current[section.id]
                              : `${current[section.id] ? `${current[section.id].trim()}\n` : ""}${option}`.trim()
                          }))
                        }
                        className="inline-flex rounded-full border border-[#34517f] bg-[#142a4d] px-3 py-1 text-[11px] font-semibold text-[#d8e7ff]"
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={quarterlyValues[section.id] || ""}
                    onChange={(event) =>
                      setQuarterlyValues((current) => ({
                        ...current,
                        [section.id]: event.target.value
                      }))
                    }
                    className="mt-3 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#8198be]"
                    placeholder="Document change review and current assessment updates"
                  />
                </article>
              ))}
            </section>
          ) : null}

          {assessmentType === "ADMISSION" ? (
            <section className="space-y-3">
              <article id="admission-type" className="rounded-2xl border border-[#2a426a] bg-[#0a182f] p-4">
                <header>
                  <h3 className="text-sm font-semibold text-white">Section I. Type of Assessment</h3>
                  <p className="mt-1 text-xs text-[#9fb6da]">Set the admission assessment context.</p>
                </header>
                <div className="mt-3 inline-flex rounded-full border border-[#36527f] bg-[#142a4d] p-1">
                  {(["Admission", "Re-Admission"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAdmissionValues((current) => ({ ...current, typeOfAssessment: option }))}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold",
                        admissionValues.typeOfAssessment === option ? "bg-amber-500/25 text-amber-100" : "text-[#c7d9f8]"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </article>

              <article id="admission-background" className="rounded-2xl border border-[#2a426a] bg-[#0a182f] p-4">
                <header>
                  <h3 className="text-sm font-semibold text-white">Section II. Resident Background / Factual Information</h3>
                  <p className="mt-1 text-xs text-[#9fb6da]">Capture baseline demographic and background details.</p>
                </header>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-xs text-[#a6bddf]">
                    <span className="font-semibold uppercase tracking-[0.1em]">Preferred Name</span>
                    <input
                      value={admissionValues.preferredName}
                      onChange={(event) =>
                        setAdmissionValues((current) => ({
                          ...current,
                          preferredName: event.target.value
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                    />
                  </label>

                  <label className="space-y-1 text-xs text-[#a6bddf]">
                    <span className="font-semibold uppercase tracking-[0.1em]">Former Occupation</span>
                    <input
                      value={admissionValues.formerOccupation}
                      onChange={(event) =>
                        setAdmissionValues((current) => ({
                          ...current,
                          formerOccupation: event.target.value
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                    />
                  </label>

                  <label className="space-y-1 text-xs text-[#a6bddf]">
                    <span className="font-semibold uppercase tracking-[0.1em]">Religion</span>
                    <input
                      value={admissionValues.religion}
                      onChange={(event) =>
                        setAdmissionValues((current) => ({
                          ...current,
                          religion: event.target.value
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                    />
                  </label>

                  <label className="space-y-1 text-xs text-[#a6bddf]">
                    <span className="font-semibold uppercase tracking-[0.1em]">Education</span>
                    <input
                      value={admissionValues.education}
                      onChange={(event) =>
                        setAdmissionValues((current) => ({
                          ...current,
                          education: event.target.value
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                    />
                  </label>

                  <label className="space-y-1 text-xs text-[#a6bddf]">
                    <span className="font-semibold uppercase tracking-[0.1em]">Registered Voter</span>
                    <select
                      value={admissionValues.registeredVoter}
                      onChange={(event) =>
                        setAdmissionValues((current) => ({
                          ...current,
                          registeredVoter: event.target.value as AdmissionValues["registeredVoter"]
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-xs text-[#a6bddf]">
                    <span className="font-semibold uppercase tracking-[0.1em]">Veteran</span>
                    <select
                      value={admissionValues.veteran}
                      onChange={(event) =>
                        setAdmissionValues((current) => ({
                          ...current,
                          veteran: event.target.value as AdmissionValues["veteran"]
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-xs text-[#a6bddf]">
                    <span className="font-semibold uppercase tracking-[0.1em]">Children</span>
                    <select
                      value={admissionValues.children}
                      onChange={(event) =>
                        setAdmissionValues((current) => ({
                          ...current,
                          children: event.target.value as AdmissionValues["children"],
                          childrenCount: event.target.value === "Yes" ? current.childrenCount : ""
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-xs text-[#a6bddf]">
                    <span className="font-semibold uppercase tracking-[0.1em]">If Yes, How many Children</span>
                    <input
                      value={admissionValues.childrenCount}
                      onChange={(event) =>
                        setAdmissionValues((current) => ({
                          ...current,
                          childrenCount: event.target.value
                        }))
                      }
                      disabled={admissionValues.children !== "Yes"}
                      className={cn(
                        "h-10 w-full rounded-xl border px-3 text-sm text-[#dceaff]",
                        admissionValues.children === "Yes"
                          ? "border-[#2f476f] bg-[#0d1d36]"
                          : "border-[#324d77]/60 bg-[#0d1d36]/50 text-[#8aa2c7]"
                      )}
                    />
                  </label>

                  <label className="space-y-1 text-xs text-[#a6bddf]">
                    <span className="font-semibold uppercase tracking-[0.1em]">Grandchildren</span>
                    <select
                      value={admissionValues.grandchildren}
                      onChange={(event) =>
                        setAdmissionValues((current) => ({
                          ...current,
                          grandchildren: event.target.value as AdmissionValues["grandchildren"],
                          grandchildrenCount: event.target.value === "Yes" ? current.grandchildrenCount : ""
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-xs text-[#a6bddf]">
                    <span className="font-semibold uppercase tracking-[0.1em]">If Yes, How many Grandchildren</span>
                    <input
                      value={admissionValues.grandchildrenCount}
                      onChange={(event) =>
                        setAdmissionValues((current) => ({
                          ...current,
                          grandchildrenCount: event.target.value
                        }))
                      }
                      disabled={admissionValues.grandchildren !== "Yes"}
                      className={cn(
                        "h-10 w-full rounded-xl border px-3 text-sm text-[#dceaff]",
                        admissionValues.grandchildren === "Yes"
                          ? "border-[#2f476f] bg-[#0d1d36]"
                          : "border-[#324d77]/60 bg-[#0d1d36]/50 text-[#8aa2c7]"
                      )}
                    />
                  </label>
                </div>
              </article>

              <article id="admission-communication" className="rounded-2xl border border-[#2a426a] bg-[#0a182f] p-4">
                <header>
                  <h3 className="text-sm font-semibold text-white">Section III. Communication & Cognition</h3>
                  <p className="mt-1 text-xs text-[#9fb6da]">Document orientation, memory, communication, hearing, and vision baseline.</p>
                </header>

                <div className="mt-3 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b6ccec]">Orientation</p>
                    <div className="mt-2 grid gap-3 md:grid-cols-3">
                      {[
                        ["Oriented to Person", "orientedPerson"],
                        ["Oriented to Place", "orientedPlace"],
                        ["Oriented to Time", "orientedTime"]
                      ].map(([label, key]) => (
                        <label key={key} className="space-y-1 text-xs text-[#a6bddf]">
                          <span className="font-semibold uppercase tracking-[0.1em]">{label}</span>
                          <select
                            value={admissionValues[key as keyof AdmissionValues] as string}
                            onChange={(event) =>
                              setAdmissionValues((current) => ({
                                ...current,
                                [key]: event.target.value as "" | "Yes" | "No"
                              }))
                            }
                            className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                          >
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b6ccec]">Memory / Decision Making</p>
                    <div className="mt-2 grid gap-3 md:grid-cols-3">
                      {[
                        ["Short Term Memory", "shortTermMemory"],
                        ["Long Term Memory", "longTermMemory"],
                        ["Decision Making Skills", "decisionMakingSkills"]
                      ].map(([label, key]) => (
                        <label key={key} className="space-y-1 text-xs text-[#a6bddf]">
                          <span className="font-semibold uppercase tracking-[0.1em]">{label}</span>
                          <select
                            value={admissionValues[key as keyof AdmissionValues] as string}
                            onChange={(event) =>
                              setAdmissionValues((current) => ({
                                ...current,
                                [key]: event.target.value as "" | "Good" | "Adequate" | "Poor"
                              }))
                            }
                            className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                          >
                            <option value="">Select</option>
                            <option value="Good">Good</option>
                            <option value="Adequate">Adequate</option>
                            <option value="Poor">Poor</option>
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b6ccec]">Communication</p>
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-xs text-[#a6bddf]">
                        <span className="font-semibold uppercase tracking-[0.1em]">Making Self Understood</span>
                        <select
                          value={admissionValues.makingSelfUnderstood}
                          onChange={(event) =>
                            setAdmissionValues((current) => ({
                              ...current,
                              makingSelfUnderstood: event.target.value as AdmissionValues["makingSelfUnderstood"]
                            }))
                          }
                          className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                        >
                          <option value="">Select</option>
                          <option value="0 Understood">0 Understood</option>
                          <option value="1 Usually Understood">1 Usually Understood</option>
                          <option value="2 Sometimes Understood">2 Sometimes Understood</option>
                          <option value="3 Rarely / Never Understood">3 Rarely / Never Understood</option>
                        </select>
                      </label>

                      <label className="space-y-1 text-xs text-[#a6bddf]">
                        <span className="font-semibold uppercase tracking-[0.1em]">Ability to Understand Others</span>
                        <select
                          value={admissionValues.abilityToUnderstandOthers}
                          onChange={(event) =>
                            setAdmissionValues((current) => ({
                              ...current,
                              abilityToUnderstandOthers: event.target.value as AdmissionValues["abilityToUnderstandOthers"]
                            }))
                          }
                          className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                        >
                          <option value="">Select</option>
                          <option value="0 Understands">0 Understands</option>
                          <option value="1 Usually Understands">1 Usually Understands</option>
                          <option value="2 Sometimes Understands">2 Sometimes Understands</option>
                          <option value="3 Rarely / Never Understands">3 Rarely / Never Understands</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b6ccec]">Hearing & Vision</p>
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-xs text-[#a6bddf]">
                        <span className="font-semibold uppercase tracking-[0.1em]">Hearing</span>
                        <select
                          value={admissionValues.hearing}
                          onChange={(event) =>
                            setAdmissionValues((current) => ({
                              ...current,
                              hearing: event.target.value as AdmissionValues["hearing"]
                            }))
                          }
                          className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                        >
                          <option value="">Select</option>
                          <option value="0 Adequate">0 Adequate</option>
                          <option value="1 Minimal Difficulty">1 Minimal Difficulty</option>
                          <option value="2 Moderate Difficulty">2 Moderate Difficulty</option>
                          <option value="3 Highly Impaired">3 Highly Impaired</option>
                        </select>
                      </label>

                      <label className="space-y-1 text-xs text-[#a6bddf]">
                        <span className="font-semibold uppercase tracking-[0.1em]">Hearing Aid or Other Appliance Used</span>
                        <select
                          value={admissionValues.hearingAidUsed}
                          onChange={(event) =>
                            setAdmissionValues((current) => ({
                              ...current,
                              hearingAidUsed: event.target.value as AdmissionValues["hearingAidUsed"]
                            }))
                          }
                          className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                        >
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </label>

                      <label className="space-y-1 text-xs text-[#a6bddf]">
                        <span className="font-semibold uppercase tracking-[0.1em]">Vision</span>
                        <select
                          value={admissionValues.vision}
                          onChange={(event) =>
                            setAdmissionValues((current) => ({
                              ...current,
                              vision: event.target.value as AdmissionValues["vision"]
                            }))
                          }
                          className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                        >
                          <option value="">Select</option>
                          <option value="0 Adequate">0 Adequate</option>
                          <option value="1 Impaired">1 Impaired</option>
                          <option value="2 Moderately Impaired">2 Moderately Impaired</option>
                          <option value="3 Highly Impaired">3 Highly Impaired</option>
                          <option value="4 Severely Impaired">4 Severely Impaired</option>
                        </select>
                      </label>

                      <label className="space-y-1 text-xs text-[#a6bddf]">
                        <span className="font-semibold uppercase tracking-[0.1em]">Corrective Lenses Used</span>
                        <select
                          value={admissionValues.correctiveLensesUsed}
                          onChange={(event) =>
                            setAdmissionValues((current) => ({
                              ...current,
                              correctiveLensesUsed: event.target.value as AdmissionValues["correctiveLensesUsed"]
                            }))
                          }
                          className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                        >
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
              </article>

              <article id="admission-interests" className="rounded-2xl border border-[#2a426a] bg-[#0a182f] p-4">
                <header>
                  <h3 className="text-sm font-semibold text-white">Section IV. Activity Interests</h3>
                  <p className="mt-1 text-xs text-[#9fb6da]">Document past/current activity preferences and resident interest details.</p>
                </header>

                <div className="mt-3 space-y-3">
                  {ADMISSION_INTEREST_FIELDS.map((field) => (
                    <article key={field.id} className="rounded-xl border border-[#2d456f] bg-[#0d1f3b] p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#cfe0ff]">{field.label}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {field.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setAdmissionValues((current) => ({
                                ...current,
                                interestChoices: {
                                  ...current.interestChoices,
                                  [field.id]: option
                                }
                              }))
                            }
                            className={cn(
                              "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold",
                              admissionValues.interestChoices[field.id] === option
                                ? "border-amber-300/40 bg-amber-500/20 text-amber-100"
                                : "border-[#34517f] bg-[#142a4d] text-[#d8e7ff]"
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>

                      {field.hasDescription ? (
                        <label className="mt-3 block space-y-1 text-xs text-[#a6bddf]">
                          <span className="font-semibold uppercase tracking-[0.1em]">{field.descriptionLabel || "Description"}</span>
                          <textarea
                            rows={2}
                            value={admissionValues.interestDescriptions[field.id] || ""}
                            onChange={(event) =>
                              setAdmissionValues((current) => ({
                                ...current,
                                interestDescriptions: {
                                  ...current.interestDescriptions,
                                  [field.id]: event.target.value
                                }
                              }))
                            }
                            className="w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#8198be]"
                            placeholder="Optional detail"
                          />
                        </label>
                      ) : null}

                      {field.hasPetAtHome ? (
                        <label className="mt-3 block space-y-1 text-xs text-[#a6bddf]">
                          <span className="font-semibold uppercase tracking-[0.1em]">Has a Pet at Home</span>
                          <select
                            value={admissionValues.hasPetAtHome}
                            onChange={(event) =>
                              setAdmissionValues((current) => ({
                                ...current,
                                hasPetAtHome: event.target.value as AdmissionValues["hasPetAtHome"]
                              }))
                            }
                            className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                          >
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </label>
                      ) : null}
                    </article>
                  ))}

                  <label className="block space-y-1 text-xs text-[#a6bddf]">
                    <span className="font-semibold uppercase tracking-[0.1em]">Other Interests</span>
                    <textarea
                      rows={3}
                      value={admissionValues.otherInterests}
                      onChange={(event) =>
                        setAdmissionValues((current) => ({
                          ...current,
                          otherInterests: event.target.value
                        }))
                      }
                      className="w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#8198be]"
                      placeholder="Document other interests"
                    />
                  </label>
                </div>
              </article>

              <article id="admission-needs" className="rounded-2xl border border-[#2a426a] bg-[#0a182f] p-4">
                <header>
                  <h3 className="text-sm font-semibold text-white">Section V. Assessed Needs</h3>
                  <p className="mt-1 text-xs text-[#9fb6da]">Identify activity intervention needs and focus areas.</p>
                </header>

                <div className="mt-3 flex flex-wrap gap-2">
                  {ADMISSION_ASSESSED_NEEDS_PHRASES.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() =>
                        setAdmissionValues((current) => ({
                          ...current,
                          assessedNeeds: current.assessedNeeds.includes(phrase)
                            ? current.assessedNeeds
                            : `${current.assessedNeeds ? `${current.assessedNeeds.trim()}\n` : ""}${phrase}`.trim()
                        }))
                      }
                      className="inline-flex rounded-full border border-[#34517f] bg-[#142a4d] px-3 py-1 text-[11px] font-semibold text-[#d8e7ff]"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={6}
                  value={admissionValues.assessedNeeds}
                  onChange={(event) =>
                    setAdmissionValues((current) => ({
                      ...current,
                      assessedNeeds: event.target.value
                    }))
                  }
                  className="mt-3 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#8198be]"
                  placeholder="Identified needs / focuses for activity intervention"
                />
              </article>

              <article id="admission-summary" className="rounded-2xl border border-[#2a426a] bg-[#0a182f] p-4">
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Activity Admission Summary</h3>
                    <p className="mt-1 text-xs text-[#9fb6da]">Generated from structured data and editable before finalization.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAdmissionValues((current) => ({
                        ...current,
                        admissionSummary: summarizeAdmission(current, resident?.name || current.preferredName || "Resident")
                      }))
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-[#3f5f90] bg-[#173460] px-3 text-xs font-semibold text-[#d9e8ff]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Regenerate Summary
                  </button>
                </header>

                <textarea
                  rows={7}
                  value={admissionValues.admissionSummary}
                  onChange={(event) =>
                    setAdmissionValues((current) => ({
                      ...current,
                      admissionSummary: event.target.value
                    }))
                  }
                  className="mt-3 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#8198be]"
                  placeholder="Resident interviewed/assessed upon admission..."
                />
              </article>
            </section>
          ) : null}
        </div>

        <aside className="space-y-3">
          <section className="rounded-2xl border border-[#2a426a] bg-[#0b1930] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab2d9]">Resident Snapshot</p>
            {resident ? (
              <>
                <p className="mt-2 text-lg font-semibold text-white">{resident.name}</p>
                <p className="text-xs text-[#9eb5db]">
                  Room {resident.room}
                  {resident.unit ? ` · ${resident.unit}` : ""}
                  {resident.age ? ` · Age ${resident.age}` : ""}
                </p>
                {resident.admissionDateIso ? (
                  <p className="mt-1 text-xs text-[#9db4da]">Admission Date: {formatActifyDate(resident.admissionDateIso, timeZone)}</p>
                ) : (
                  <p className="mt-1 text-xs text-rose-200">Admission Date missing</p>
                )}
                {assessmentType === "ADMISSION" ? (
                  <div className="mt-2 rounded-xl border border-amber-300/30 bg-amber-500/12 p-2 text-xs text-amber-100">
                    <p className="font-semibold">Admission UDA Due Date</p>
                    <p className="mt-1">{dueDate ? formatActifyDate(dueDate, timeZone) : "--"}</p>
                    {admissionDueLabel ? <p className={cn("mt-1", admissionDueLabel.tone)}>{admissionDueLabel.label}</p> : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-sm text-[#9eb5db]">Select a resident to begin charting.</p>
            )}

            <div className="mt-3 space-y-2 text-xs text-[#a8c0e6]">
              <p className="inline-flex items-center gap-1">
                <FileClock className="h-3.5 w-3.5 text-amber-200" />
                Last Admission: {latestAdmissionHistory ? formatActifyDate(latestAdmissionHistory.createdAtIso, timeZone) : "--"}
              </p>
              <p className="inline-flex items-center gap-1">
                <FileClock className="h-3.5 w-3.5 text-amber-200" />
                Last Annual: {latestAnnualHistory ? formatActifyDate(latestAnnualHistory.createdAtIso, timeZone) : "--"}
              </p>
              <p className="inline-flex items-center gap-1">
                <ClipboardCheck className="h-3.5 w-3.5 text-sky-200" />
                Last Quarterly: {latestQuarterlyHistory ? formatActifyDate(latestQuarterlyHistory.createdAtIso, timeZone) : "--"}
              </p>
            </div>

            {latestAnnualHistory ? (
              <button
                type="button"
                onClick={() => applyHistoryEntry(latestAnnualHistory, "prior")}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1 rounded-full border border-amber-300/35 bg-amber-500/15 text-xs font-semibold text-amber-100"
              >
                <Copy className="h-3.5 w-3.5" />
                Carry Forward Latest Annual
              </button>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[#2a426a] bg-[#0b1930] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab2d9]">Assessment History</p>
            <div className="mt-2 max-h-[460px] space-y-2 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#35527f] bg-[#10213e] px-3 py-4 text-xs text-[#9db4da]">
                  No prior UDA history for this resident yet.
                </p>
              ) : (
                history.map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-[#2f476f] bg-[#10213d] p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                          statusPill(entry.status)
                        )}
                      >
                        {entry.status.replaceAll("_", " ")}
                      </span>
                      <span className="text-[#a8c0e5]">{assessmentTypeLabel(entry.assessmentType as UdaAssessmentType)}</span>
                    </div>
                    <p className="mt-2 font-semibold text-white">{entry.summary}</p>
                    <p className="mt-1 text-[#98afd5]">
                      {formatActifyDate(entry.createdAtIso, timeZone)} · {entry.authorName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={`/app/documentation/uda/${encodeURIComponent(entry.id)}`}
                        className="inline-flex h-7 items-center gap-1 rounded-full border border-[#3c5a88] bg-[#17335f] px-3 text-[10px] font-semibold text-[#d9e8ff]"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        Open
                      </Link>
                      {!initial.id ? (
                        <button
                          type="button"
                          onClick={() => applyHistoryEntry(entry, "duplicate")}
                          className="inline-flex h-7 items-center gap-1 rounded-full border border-[#3c5a88] bg-[#142a4d] px-3 text-[10px] font-semibold text-[#d9e8ff]"
                        >
                          <Copy className="h-3 w-3" />
                          Duplicate
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          {feedback ? (
            <section
              className={cn(
                "rounded-xl border p-3 text-sm",
                feedback.type === "ok"
                  ? "border-emerald-300/35 bg-emerald-500/15 text-emerald-100"
                  : "border-rose-300/35 bg-rose-500/15 text-rose-100"
              )}
            >
              {feedback.message}
            </section>
          ) : null}
        </aside>
      </div>

      <footer className="sticky bottom-3 z-20 rounded-2xl border border-[#2a426a] bg-[linear-gradient(180deg,rgba(10,26,48,0.92)_0%,rgba(8,18,34,0.96)_100%)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#a8c0e6]">
            <p className="font-semibold text-white">{assessmentTypeLabel(assessmentType)} UDA · {currentProgress}% complete</p>
            <p>{isDirty ? "Unsaved changes" : "All changes synced in this session"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => submit("DRAFT")}
              disabled={isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#3f5f90] bg-[#17335f] px-4 text-xs font-semibold text-[#d8e7ff]"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => submit("READY_REVIEW")}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-full border border-violet-300/35 bg-violet-500/20 px-4 text-xs font-semibold text-violet-100"
            >
              Save + Ready to Review
            </button>
            <button
              type="button"
              onClick={() => submit("COMPLETED")}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-full border border-emerald-300/35 bg-emerald-500/20 px-4 text-xs font-semibold text-emerald-100"
            >
              Finalize Assessment
            </button>
          </div>
        </div>
      </footer>
    </section>
  );
}
