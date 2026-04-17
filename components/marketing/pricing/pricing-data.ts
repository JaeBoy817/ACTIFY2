export type BillingCycle = "monthly" | "yearly";

export const MONTHLY_PRICE = 5.99;
export const ANNUAL_PRICE = 60;

export const MONTHLY_YEAR_TOTAL = Number((MONTHLY_PRICE * 12).toFixed(2));
export const ANNUAL_MONTHLY_EQUIVALENT = Number((ANNUAL_PRICE / 12).toFixed(2));
export const ANNUAL_SAVINGS = Number((MONTHLY_YEAR_TOTAL - ANNUAL_PRICE).toFixed(2));
export const ANNUAL_DISCOUNT_PERCENT = Number(((ANNUAL_SAVINGS / MONTHLY_YEAR_TOTAL) * 100).toFixed(1));

export const MONTHLY_FEATURES = [
  "Actify AI Assistant",
  "Resident snapshots and follow-up tools",
  "Calendar planning with Month / Week / Day views",
  "Activity idea generation",
  "Note writing and note rewording help",
  "Attendance and participation tracking",
  "Birthday and holiday calendar support"
] as const;

export const ANNUAL_FEATURES = [
  "Everything in Monthly",
  "Lower yearly cost",
  "One easy yearly payment",
  "Best value for daily use",
  "Save 16.5% compared to monthly billing"
] as const;

export const VALUE_CARDS = [
  {
    title: "Faster Notes",
    body: "Reword progress notes and 1:1 notes in seconds instead of rewriting everything manually."
  },
  {
    title: "Faster Calendar Planning",
    body: "Build your month faster with a real calendar, quick activity creation, and less blank-page stress."
  },
  {
    title: "Better Resident Workflow",
    body: "Keep preferences, participation, birthdays, and attendance in one organized place."
  },
  {
    title: "Cheaper Than the Time It Saves",
    body: "If Actify saves even a few minutes a day, it easily pays for itself."
  }
] as const;

export const FAQ_ITEMS = [
  {
    question: "What's included in Actify?",
    answer:
      "Actify includes the AI assistant, resident workspace, calendar planning tools, note writing and rewording support, and participation tracking workflows."
  },
  {
    question: "Is Actify a PCC replacement?",
    answer:
      "No. Actify is a workflow support platform for Activities Directors. It helps planning, organization, and writing, but it is not an EHR or charting replacement."
  },
  {
    question: "Why is annual cheaper?",
    answer:
      "Annual billing lowers your effective monthly cost to $5.00 and saves $11.88 per year versus paying monthly."
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Yes. You can change plans from billing settings at renewal periods."
  },
  {
    question: "Who is Actify built for?",
    answer:
      "Activities Directors in skilled nursing settings who need faster planning, cleaner notes, and less daily overwhelm."
  },
  {
    question: "Why is this worth it for one Activities Director?",
    answer:
      "Because it removes repetitive admin work. If it saves even one hour per month, it already returns more value than the cost."
  }
] as const;
