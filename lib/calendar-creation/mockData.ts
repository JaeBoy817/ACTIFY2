import { format } from "date-fns";

import type { ActivityTemplateItem, CalendarDay, CalendarMonth, CalendarThemeWeek } from "@/lib/calendar-creation/types";

function makeDay(date: string, overrides?: Partial<CalendarDay>): CalendarDay {
  return {
    date,
    holidayName: null,
    isHoliday: false,
    isSpecialEvent: false,
    hasBackupPlan: false,
    hasOneToOneCoverage: false,
    dayNotes: "",
    prepReminders: "",
    staffOnlyNotes: "",
    activities: [],
    ...overrides
  };
}

function createBlankMonthDays(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return makeDay(`${year}-${String(month).padStart(2, "0")}-${day}`);
  });
}

function createBlankCalendarMonth(date: Date): CalendarMonth {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const monthLabel = format(date, "MMMM yyyy");
  const nowIso = new Date().toISOString();

  return {
    calendarId: `calendar-${year}-${String(month).padStart(2, "0")}-blank`,
    title: `${monthLabel} Activity Calendar`,
    month,
    year,
    facilityName: "Actify",
    templateSource: null,
    isDraft: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    days: createBlankMonthDays(year, month),
    notes: "",
    printSettings: {
      includeInternalNotes: false,
      includeBackupNotes: true,
      includeDescriptions: true,
      grayscale: false,
      includeFacilityName: true,
      includeHolidayBadges: true,
      includeLegend: false
    },
    exportSettings: {
      lastExportAt: null,
      lastFormat: null
    }
  };
}

const today = new Date();

export const SAMPLE_CALENDARS: CalendarMonth[] = [createBlankCalendarMonth(today)];

export const ACTIVITY_BANK_TEMPLATES: ActivityTemplateItem[] = [
  { id: "t-1", title: "Bingo", category: "Games / Trivia", prepLevel: "Low", energy: "Medium", indoorOutdoor: "Indoor", description: "Classic resident favorite with social engagement.", tags: ["Bingo", "Group"] },
  { id: "t-2", title: "Chair Exercise", category: "Physical Activity", prepLevel: "Low", energy: "Low", indoorOutdoor: "Indoor", description: "Gentle movement with adaptive options.", tags: ["Low Energy", "Movement"] },
  { id: "t-3", title: "Devotions", category: "Spiritual / Religious", prepLevel: "Low", energy: "Low", indoorOutdoor: "Indoor", description: "Quiet reflection and devotional reading.", tags: ["Bible Study"] },
  { id: "t-4", title: "Trivia", category: "Games / Trivia", prepLevel: "Low", energy: "Medium", indoorOutdoor: "Indoor", description: "Short trivia rounds for mixed cognition.", tags: ["Cognitive"] },
  { id: "t-5", title: "Music Hour", category: "Entertainment / Music", prepLevel: "Medium", energy: "Medium", indoorOutdoor: "Either", description: "Themed singalong and listening session.", tags: ["Music", "Social"] },
  { id: "t-6", title: "Nail Care", category: "1:1 Visits", prepLevel: "Low", energy: "Low", indoorOutdoor: "Indoor", description: "Personalized bedside or table visit support.", tags: ["Nail Care", "1:1"] },
  { id: "t-7", title: "Movie Matinee", category: "Entertainment / Music", prepLevel: "Low", energy: "Low", indoorOutdoor: "Indoor", description: "Resident-selected film and snack social.", tags: ["Movies / TV"] },
  { id: "t-8", title: "Craft Group", category: "Creative / Craft", prepLevel: "Medium", energy: "Low", indoorOutdoor: "Indoor", description: "Simple seasonal craft with adaptive options.", tags: ["Crafts"] },
  { id: "t-9", title: "1:1 Room Visits", category: "Room Visit", prepLevel: "Low", energy: "Low", indoorOutdoor: "Indoor", description: "Short personalized room visit rounds.", tags: ["1:1"] },
  { id: "t-10", title: "Sensory Cart", category: "Sensory Activity", prepLevel: "Medium", energy: "Low", indoorOutdoor: "Indoor", description: "Texture, scent, and visual sensory prompts.", tags: ["Sensory-Friendly"] },
  { id: "t-11", title: "Coffee Social", category: "Social Event", prepLevel: "Low", energy: "Low", indoorOutdoor: "Indoor", description: "Light social connection block with prompts.", tags: ["Social"] },
  { id: "t-12", title: "Word Searches", category: "Cognitive Activity", prepLevel: "Low", energy: "Low", indoorOutdoor: "Indoor", description: "Independent or small-group puzzle option.", tags: ["Word Searches", "Puzzles"] }
];

export const CALENDAR_TEMPLATE_CARDS = [
  { id: "ct-1", title: "Basic Monthly Calendar", description: "Balanced group + 1:1 monthly structure.", prefilledDays: 18, tags: ["Balanced", "Starter"] },
  { id: "ct-2", title: "Low-Budget Calendar", description: "Low-cost activities and reusable supplies.", prefilledDays: 20, tags: ["Low Budget", "Reusable"] },
  { id: "ct-3", title: "Dementia-Friendly Calendar", description: "Lower stimulation and familiar routines.", prefilledDays: 16, tags: ["Dementia-Friendly", "Quiet"] },
  { id: "ct-4", title: "Mixed Group + 1:1 Calendar", description: "Stronger personalized visit coverage.", prefilledDays: 22, tags: ["1:1", "Group Mix"] },
  { id: "ct-5", title: "Holiday Month Calendar", description: "Holiday highlights with backup alternatives.", prefilledDays: 24, tags: ["Holiday", "Family"] },
  { id: "ct-6", title: "Men's Group Heavy Calendar", description: "Sports and discussion-focused activity flow.", prefilledDays: 19, tags: ["Men's Group", "Discussion"] },
  { id: "ct-7", title: "Quiet / Low-Stimulation Calendar", description: "Calm social, sensory, and room visit options.", prefilledDays: 17, tags: ["Quiet", "Low Stimulation"] },
  { id: "ct-8", title: "High Participation Calendar", description: "Social-first and event-heavy scheduling.", prefilledDays: 25, tags: ["High Participation", "Social"] },
  { id: "ct-9", title: "Room Visit Support Calendar", description: "Expanded bedside and 1:1 coverage blocks.", prefilledDays: 21, tags: ["Room Visit", "Bed-Bound"] }
];

export const THEME_WEEK_EXAMPLE: CalendarThemeWeek = {
  id: "theme-spring-memory-lane",
  title: "Spring Memory Lane Week",
  description: "Low-pressure social week with music, reminiscence, and sensory touches.",
  dailySubthemes: [
    { day: "Monday", label: "Memory Music Monday", focus: "Familiar songs and story prompts" },
    { day: "Tuesday", label: "Taste of Spring", focus: "Simple food-themed social" },
    { day: "Wednesday", label: "Garden Reminisce", focus: "Photo prompts and sensory bins" },
    { day: "Thursday", label: "Family Story Circle", focus: "Conversation starters and photo cards" },
    { day: "Friday", label: "Favorites Showcase", focus: "Resident-requested activities" }
  ]
};

export const HOLIDAY_PLAN_EXAMPLE = {
  holiday: "Mother's Day",
  groupIdeas: ["Tea + Music Social", "Flower Craft Hour", "Family Photo Wall"],
  oneToOneAlternatives: ["Bedside card-making", "Photo conversation visit"],
  bedBoundAlternatives: ["Room floral sensory visit", "Personalized music playlist check-in"],
  decorReminders: ["Table flowers", "Photo board", "Welcome signage"],
  musicIdeas: ["Classic love songs", "Resident request playlist"],
  backupPlans: ["Conversation prompt cards", "Indoor seated social"]
};

export const LOW_BUDGET_WEEK_EXAMPLE = {
  title: "Low-Budget Week",
  days: [
    "Chair stretch + conversation prompts",
    "Word game social",
    "Music request hour",
    "Photo reminiscence circle",
    "Coffee chat and current events"
  ]
};

export const DAY_PATTERNS = [
  { id: "pattern-1", label: "Balanced Day", blocks: ["Morning Group", "Afternoon 1:1", "Backup Option"] },
  { id: "pattern-2", label: "Low-Energy Day", blocks: ["Quiet Morning", "Sensory Afternoon", "Room Visits"] },
  { id: "pattern-3", label: "Weekend Day", blocks: ["Late Morning Social", "Early Afternoon Independent", "Family Touchpoint"] }
];
