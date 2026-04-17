export const MONTHLY_PRICE = 5.99;
export const ANNUAL_PRICE = 60;

export const MONTHLY_YEAR_TOTAL = Number((MONTHLY_PRICE * 12).toFixed(2));
export const ANNUAL_MONTHLY_EQUIVALENT = Number((ANNUAL_PRICE / 12).toFixed(2));
export const ANNUAL_SAVINGS = Number((MONTHLY_YEAR_TOTAL - ANNUAL_PRICE).toFixed(2));
export const ANNUAL_DISCOUNT_PERCENT = Number(((ANNUAL_SAVINGS / MONTHLY_YEAR_TOTAL) * 100).toFixed(1));

export const MONTHLY_FEATURES = [
  "Full access to Actify AI Assistant",
  "Residents workspace",
  "Calendar planning tools",
  "Activity idea generation",
  "Note writing and note rewording help",
  "Attendance and participation insights",
  "Birthday and holiday calendar support"
] as const;

export const ANNUAL_FEATURES = [
  "Everything in Monthly",
  "Lower yearly cost",
  "Best value",
  "One easy annual payment",
  "Less to think about all year"
] as const;

export const VALUE_ITEMS = [
  {
    title: "Faster Documentation",
    body: "Reword rough progress notes and 1:1 notes into cleaner wording in seconds."
  },
  {
    title: "Faster Calendar Planning",
    body: "Build a month faster without staring at a blank calendar or retyping ideas."
  },
  {
    title: "Smarter Resident Support",
    body: "Keep preferences, participation patterns, and follow-up context organized in one place."
  },
  {
    title: "Better Daily Workflow",
    body: "Use AI shortcuts and planning tools to cut down on mental clutter."
  },
  {
    title: "More Useful Than Its Cost",
    body: "If Actify saves even a few minutes a day, it more than covers its monthly price."
  }
] as const;

export const FAQ_ITEMS = [
  {
    question: "What's included in Actify?",
    answer:
      "Actify includes the AI assistant, residents workspace, calendar tools, note writing and rewording support, and activity planning help."
  },
  {
    question: "Is Actify a PCC replacement?",
    answer:
      "No. Actify is a support tool for Activities Directors. It helps with planning, writing, organization, and workflow, but it is not an EHR or charting replacement."
  },
  {
    question: "Why is the annual plan cheaper?",
    answer:
      "Annual billing lowers the effective monthly cost and saves $11.88 per year compared with paying monthly."
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Yes. Plan updates can be managed through your billing settings at renewal."
  },
  {
    question: "Who is Actify built for?",
    answer:
      "Activities Directors in skilled nursing facilities and similar care settings who want faster planning, cleaner notes, and less daily overwhelm."
  },
  {
    question: "Is this worth it for a single Activities Director?",
    answer:
      "Yes. Actify is especially valuable for individual ADs because it reduces repetitive admin work and speeds up planning, notes, and resident support."
  }
] as const;
