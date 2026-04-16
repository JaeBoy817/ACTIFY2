import type { ActivityTemplateItem, CalendarActivity, CalendarDay, CalendarMonth, CalendarThemeWeek } from "@/lib/calendar-creation/types";

function activity(input: Partial<CalendarActivity> & Pick<CalendarActivity, "id" | "title" | "category" | "type">): CalendarActivity {
  return {
    startTime: input.startTime ?? "10:00 AM",
    endTime: input.endTime ?? "10:45 AM",
    location: input.location ?? "Activity Room",
    description: input.description ?? "Resident-friendly activity block.",
    residentFacingDescription: input.residentFacingDescription ?? input.description ?? "Resident-friendly activity block.",
    suppliesNeeded: input.suppliesNeeded ?? [],
    internalNotes: input.internalNotes ?? "",
    prepLevel: input.prepLevel ?? "Low",
    indoorOutdoor: input.indoorOutdoor ?? "Indoor",
    backupAlternative: input.backupAlternative ?? "Seated conversation circle",
    reusableTemplate: input.reusableTemplate ?? false,
    repeatRule: input.repeatRule ?? null,
    tags: input.tags ?? [],
    aiGenerated: input.aiGenerated ?? false,
    createdFromTemplate: input.createdFromTemplate ?? false,
    ...input
  };
}

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

const COMPLETE_MONTH_DAYS: CalendarDay[] = [
  makeDay("2026-04-01", {
    activities: [
      activity({ id: "a-1", title: "Morning Bingo Social", category: "Games / Trivia", type: "Group", startTime: "10:00 AM", endTime: "10:45 AM", tags: ["Bingo", "Social"] }),
      activity({ id: "a-2", title: "Afternoon 1:1 Room Visits", category: "Room Visit", type: "1:1", startTime: "2:00 PM", endTime: "3:30 PM" })
    ],
    hasOneToOneCoverage: true,
    hasBackupPlan: true,
    dayNotes: "Strong attendance on first-of-month socials.",
    prepReminders: "Print bingo cards.",
    staffOnlyNotes: "Offer low-noise alternative in lounge."
  }),
  makeDay("2026-04-02", {
    activities: [
      activity({ id: "a-3", title: "Chair Stretch + Music", category: "Physical Activity", type: "Group", startTime: "9:30 AM", endTime: "10:10 AM", tags: ["Low Energy", "Music"] }),
      activity({ id: "a-4", title: "Word Search Corner", category: "Independent Activity", type: "Independent", startTime: "1:30 PM", endTime: "2:15 PM", tags: ["Word Searches"] })
    ],
    hasBackupPlan: true,
    hasOneToOneCoverage: true
  }),
  makeDay("2026-04-03", {
    activities: [
      activity({ id: "a-5", title: "Coffee + Current Events", category: "Social Event", type: "Group", startTime: "10:15 AM", endTime: "11:00 AM", tags: ["Social"] })
    ],
    hasBackupPlan: true,
    hasOneToOneCoverage: false
  }),
  makeDay("2026-04-04", {
    activities: [activity({ id: "a-6", title: "Weekend Reminiscing Circle", category: "Dementia-Friendly", type: "Group", startTime: "11:00 AM", endTime: "11:35 AM" })],
    hasBackupPlan: true
  }),
  makeDay("2026-04-05", {
    activities: [activity({ id: "a-7", title: "Sunday Devotions", category: "Spiritual / Religious", type: "Group", startTime: "9:45 AM", endTime: "10:30 AM", tags: ["Bible Study"] })],
    hasOneToOneCoverage: true
  }),
  makeDay("2026-04-06"),
  makeDay("2026-04-07"),
  makeDay("2026-04-08"),
  makeDay("2026-04-09"),
  makeDay("2026-04-10"),
  makeDay("2026-04-11"),
  makeDay("2026-04-12"),
  makeDay("2026-04-13"),
  makeDay("2026-04-14"),
  makeDay("2026-04-15"),
  makeDay("2026-04-16"),
  makeDay("2026-04-17"),
  makeDay("2026-04-18"),
  makeDay("2026-04-19", {
    isHoliday: true,
    holidayName: "Easter",
    activities: [activity({ id: "a-8", title: "Easter Music + Memory", category: "Holiday Activity", type: "Group", startTime: "10:30 AM", endTime: "11:15 AM", tags: ["Holiday"] })]
  }),
  makeDay("2026-04-20"),
  makeDay("2026-04-21"),
  makeDay("2026-04-22"),
  makeDay("2026-04-23"),
  makeDay("2026-04-24"),
  makeDay("2026-04-25"),
  makeDay("2026-04-26"),
  makeDay("2026-04-27"),
  makeDay("2026-04-28"),
  makeDay("2026-04-29"),
  makeDay("2026-04-30", {
    isSpecialEvent: true,
    activities: [activity({ id: "a-9", title: "Month-End Celebration Social", category: "Social Event", type: "Group", startTime: "2:00 PM", endTime: "3:00 PM", tags: ["Special Event"] })],
    hasBackupPlan: true,
    hasOneToOneCoverage: true
  })
];

const DRAFT_MONTH_DAYS: CalendarDay[] = Array.from({ length: 31 }, (_, idx) => {
  const day = String(idx + 1).padStart(2, "0");
  const date = `2026-05-${day}`;
  if (idx % 4 === 0) {
    return makeDay(date, {
      activities: [
        activity({
          id: `draft-${idx + 1}`,
          title: "Template Activity Block",
          category: "Group Activity",
          type: "Group",
          startTime: "10:00 AM",
          endTime: "10:40 AM",
          createdFromTemplate: true
        })
      ],
      hasBackupPlan: idx % 8 === 0,
      hasOneToOneCoverage: idx % 6 === 0
    });
  }
  return makeDay(date);
});

export const SAMPLE_CALENDARS: CalendarMonth[] = [
  {
    calendarId: "calendar-apr-2026-final",
    title: "April 2026 Activity Calendar",
    month: 4,
    year: 2026,
    facilityName: "Actify Demo SNF",
    templateSource: "Balanced Monthly Calendar",
    isDraft: false,
    createdAt: "2026-03-22T10:00:00.000Z",
    updatedAt: "2026-03-30T16:30:00.000Z",
    days: COMPLETE_MONTH_DAYS,
    notes: "Leadership-ready monthly schedule with backup coverage.",
    printSettings: {
      includeInternalNotes: false,
      includeBackupNotes: true,
      includeDescriptions: false,
      grayscale: false,
      includeFacilityName: true,
      includeHolidayBadges: true,
      includeLegend: true
    },
    exportSettings: {
      lastExportAt: "2026-03-31T09:22:00.000Z",
      lastFormat: "PDF"
    }
  },
  {
    calendarId: "calendar-may-2026-draft",
    title: "May 2026 Draft Calendar",
    month: 5,
    year: 2026,
    facilityName: "Actify Demo SNF",
    templateSource: "Low-Budget Calendar",
    isDraft: true,
    createdAt: "2026-04-05T11:00:00.000Z",
    updatedAt: "2026-04-12T14:45:00.000Z",
    days: DRAFT_MONTH_DAYS,
    notes: "Partially filled draft month pending weekend additions.",
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
  }
];

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
