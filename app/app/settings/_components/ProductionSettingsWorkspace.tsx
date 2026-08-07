"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DefaultLanding, FontScale, Role, SubscriptionStatus } from "@prisma/client";
import {
  BellRing,
  BookOpenCheck,
  Bot,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Newspaper,
  Printer,
  ShieldCheck,
  UserCog,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import type { ZodTypeAny } from "zod";

import { ManageBillingButton } from "@/components/billing/ManageBillingButton";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { updateUserRole } from "@/lib/settings/actions";
import { saveProductionSettingsSection } from "@/lib/settings/production-actions";
import {
  assistantSettingsSchema,
  calendarSettingsSchema,
  dailyChronicleSettingsSchema,
  defaultAssistantSettings,
  documentationSettingsSchema,
  facilitySettingsSchema,
  notificationsSettingsSchema,
  profileSettingsSchema,
  reportsPrintingSettingsSchema,
  roleDisplayLabel,
  securityDataSettingsSchema,
  subscriptionStatusLabel,
  type ProductionSettingsValues,
  type SettingsAuditSummary,
  type SettingsBillingSummary,
  type SettingsSectionKey,
  type SettingsUserSummary
} from "@/lib/settings/production-settings";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";

type Category = {
  key: SettingsSectionKey;
  label: string;
  description: string;
  icon: typeof UserCog;
  adminOnly?: boolean;
  saveable: boolean;
};

type FieldErrors = Record<string, string>;

const categories: Category[] = [
  { key: "profile", label: "Profile", description: "Your personal Actify preferences.", icon: UserCog, saveable: true },
  { key: "facility", label: "Facility", description: "Authoritative facility identity and location.", icon: Building2, saveable: true },
  { key: "calendar", label: "Calendar & Activities", description: "Scheduling, birthday, holiday, and print defaults.", icon: CalendarDays, saveable: true },
  { key: "documentation", label: "Documentation", description: "Note templates, thresholds, and participation rules.", icon: BookOpenCheck, saveable: true },
  { key: "assistant", label: "AI Assistant", description: "Safe AI writing and planning preferences.", icon: Bot, saveable: true },
  { key: "chronicle", label: "Daily Chronicle", description: "Daily Chronicle sections and accuracy controls.", icon: Newspaper, saveable: true },
  { key: "reports", label: "Reports & Printing", description: "Export defaults and print-ready report details.", icon: Printer, saveable: true },
  { key: "notifications", label: "Notifications", description: "In-app reminders and digest timing.", icon: BellRing, saveable: true },
  { key: "team", label: "Team & Permissions", description: "Roles, access levels, and team members.", icon: UsersRound, adminOnly: true, saveable: false },
  { key: "subscription", label: "Subscription", description: "Plan, billing status, and Stripe portal access.", icon: CreditCard, saveable: false },
  { key: "security", label: "Security & Data", description: "Export controls, retention, and danger-zone guidance.", icon: ShieldCheck, adminOnly: true, saveable: true }
];

const editableSchemas: Partial<Record<SettingsSectionKey, ZodTypeAny>> = {
  profile: profileSettingsSchema,
  facility: facilitySettingsSchema,
  calendar: calendarSettingsSchema,
  documentation: documentationSettingsSchema,
  assistant: assistantSettingsSchema,
  chronicle: dailyChronicleSettingsSchema,
  reports: reportsPrintingSettingsSchema,
  notifications: notificationsSettingsSchema,
  security: securityDataSettingsSchema
};

const stateOptions = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function optionList<T extends string>(values: readonly T[]) {
  return values.map((value) => ({ value, label: value }));
}

function minuteOptionList<T extends string>(values: readonly T[]) {
  return values.map((value) => ({ value, label: `${value} minutes` }));
}

const attendanceStatusOptions = optionList(["Attended", "Declined", "Unavailable", "Not Recorded"] as const);
const setupBufferOptions = minuteOptionList(["0", "5", "10", "15", "30"] as const);
const noteTypeOptions = optionList(["Progress Note", "1:1 Note", "Group Activity Note", "Refusal Note", "Care Plan Note"] as const);
const documentationToneOptions = optionList(["Professional", "Concise", "Detailed", "Warm"] as const);
const noteLengthOptions = optionList(["Concise", "Balanced", "Detailed"] as const);
const followUpStatusOptions = optionList(["No follow-up", "Follow up this week", "Add to 1:1 list", "Review care plan"] as const);
const responseLengthOptions = optionList(["Short", "Balanced", "Detailed"] as const);
const documentationStyleOptions = optionList(["PCC-ready", "State-ready", "Plain language", "Care-plan focused"] as const);
const assistantToneOptions = optionList(["Professional", "Warm", "Formal", "Conversational"] as const);
const assistantReadingLevelOptions = optionList(["Simple", "Standard", "Detailed"] as const);
const assistantBibleOptions = optionList(["ERV", "KJV", "NIV", "NLT", "None"] as const);
const activityDifficultyOptions = optionList(["Low", "Moderate", "High", "Mixed"] as const);
const groupSizeOptions = optionList(["1:1", "Small group", "Large group", "Mixed"] as const);
const chronicleReadingLevelOptions = optionList(["Simple", "Standard", "Large-print friendly"] as const);
const articleLengthOptions = optionList(["Brief", "Standard", "Expanded"] as const);
const chronicleBibleOptions = optionList(["ERV", "KJV", "NIV", "NLT"] as const);
const reportPeriodOptions = optionList(["Today", "This week", "This month", "Last month", "Rolling 30"] as const);
const participationCalculationOptions = optionList(["Group and completed 1:1", "Group only", "Completed 1:1 only"] as const);
const displayModeOptions = optionList(["Percentages and totals", "Percentages only", "Totals only"] as const);
const notificationFrequencyOptions = optionList(["Immediate", "Daily digest", "Weekly digest", "Off"] as const);
const autoLogoutOptions = minuteOptionList(["5", "10", "15", "30"] as const);

function stringify(value: unknown) {
  return JSON.stringify(value);
}

function formatSavedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatSubscriptionDate(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function errorsFromZod(schema: ZodTypeAny | undefined, values: unknown): FieldErrors {
  if (!schema) return {};
  const result = schema.safeParse(values);
  if (result.success) return {};
  return result.error.issues.reduce<FieldErrors>((acc, issue) => {
    const key = issue.path.join(".") || "form";
    acc[key] = issue.message;
    return acc;
  }, {});
}

function roleCanSave(role: Role, section: SettingsSectionKey) {
  if (section === "profile") return role !== Role.READ_ONLY;
  if (section === "team" || section === "security") return role === Role.ADMIN;
  if (section === "subscription") return false;
  return role === Role.ADMIN || role === Role.AD;
}

function getSectionSummary(values: ProductionSettingsValues, section: SettingsSectionKey) {
  switch (section) {
    case "profile":
      return `${values.profile.fullName} • ${values.profile.jobTitle || "Activity team"}`;
    case "facility":
      return `${values.facility.facilityName} • ${values.facility.facilityTimezone}`;
    case "calendar":
      return `${values.calendar.defaultCalendarView.toLowerCase()} view • ${values.calendar.defaultActivityDurationMinutes} min groups`;
    case "documentation":
      return `${values.documentation.defaultNoteType} • ${values.documentation.noteLength.toLowerCase()} notes`;
    case "assistant":
      return `${values.assistant.preferredDocumentationStyle} • ${values.assistant.defaultResponseLength.toLowerCase()} responses`;
    case "chronicle":
      return values.chronicle.enabled ? `Publishes around ${values.chronicle.defaultPublicationTime}` : "Daily Chronicle disabled";
    case "reports":
      return `${values.reports.defaultReportPeriod} • ${values.reports.paperSize}`;
    case "notifications":
      return `${values.notifications.method} • ${values.notifications.frequency}`;
    case "team":
      return "Role-based access and team members";
    case "subscription":
      return "Stripe billing and plan status";
    case "security":
      return `${values.security.dataRetentionYears} year retention • ${values.security.autoLogoutMinutes} min logout`;
    default:
      return "";
  }
}

function TextField({
  label,
  value,
  onChange,
  error,
  type = "text",
  readOnly = false,
  help
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  readOnly?: boolean;
  help?: string;
}) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <Input
        className="mt-1 h-11 rounded-xl border-emerald-900/15 bg-white/80"
        value={value}
        type={type}
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {help ? <span className="mt-1 block text-xs font-normal text-foreground/60">{help}</span> : null}
      {error ? <span className="mt-1 block text-xs text-rose-700">{error}</span> : null}
    </label>
  );
}

function TextAreaField({ label, value, onChange, rows = 4, help }: { label: string; value: string; onChange: (value: string) => void; rows?: number; help?: string }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <Textarea className="mt-1 rounded-xl border-emerald-900/15 bg-white/80" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
      {help ? <span className="mt-1 block text-xs font-normal text-foreground/60">{help}</span> : null}
    </label>
  );
}

function SelectField<TValue extends string>({
  label,
  value,
  options,
  onChange,
  help
}: {
  label: string;
  value: TValue;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
  help?: string;
}) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <Select value={value} onValueChange={(next) => onChange(next as TValue)}>
        <SelectTrigger className="mt-1 h-11 rounded-xl border-emerald-900/15 bg-white/85">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {help ? <span className="mt-1 block text-xs font-normal text-foreground/60">{help}</span> : null}
    </label>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border border-emerald-900/10 bg-white/70 px-3 py-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description ? <p className="text-xs text-foreground/60">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function StringListEditor({ label, values, onChange, placeholder, help }: { label: string; values: string[]; onChange: (values: string[]) => void; placeholder: string; help?: string }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {help ? <p className="text-xs text-foreground/60">{help}</p> : null}
      </div>
      <div className="space-y-2">
        {values.map((item, index) => (
          <div key={`${label}-${index}`} className="flex gap-2">
            <Input
              className="h-10 rounded-xl border-emerald-900/15 bg-white/80"
              value={item}
              placeholder={placeholder}
              onChange={(event) => {
                const next = [...values];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}>
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" className="rounded-xl" onClick={() => onChange([...values, ""])}>
        Add item
      </Button>
    </div>
  );
}

function SectionHeader({ title, description, icon: Icon }: { title: string; description: string; icon: Category["icon"] }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-emerald-50 shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="font-[var(--font-display)] text-2xl text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-foreground/70">{description}</p>
      </div>
    </div>
  );
}

function SaveBar({ isDirty, isSaving, savedAt, canSave, onSave, onReset }: { isDirty: boolean; isSaving: boolean; savedAt?: string; canSave: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="sticky bottom-3 z-20 rounded-2xl border border-emerald-900/15 bg-[#f7fbf4]/95 p-3 shadow-[0_18px_35px_-26px_rgba(6,78,59,0.45)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground/70">
          {isDirty ? "You have unsaved changes." : savedAt ? `Saved ${savedAt}.` : "No unsaved changes."}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="rounded-xl" disabled={!isDirty || isSaving} onClick={onReset}>Cancel changes</Button>
          <Button type="button" className="rounded-xl bg-emerald-900 text-white hover:bg-emerald-800" disabled={!isDirty || isSaving || !canSave} onClick={onSave}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProductionSettingsWorkspace({
  initialSection,
  role,
  facilityName,
  values,
  users,
  auditEntries,
  billing
}: {
  initialSection: SettingsSectionKey;
  role: Role;
  facilityName: string;
  values: ProductionSettingsValues;
  users: SettingsUserSummary[];
  auditEntries: SettingsAuditSummary[];
  billing: SettingsBillingSummary;
}) {
  const { toast } = useToast();
  const isAdmin = role === Role.ADMIN;
  const availableCategories = useMemo(() => categories.filter((category) => !category.adminOnly || isAdmin), [isAdmin]);
  const initial = availableCategories.some((category) => category.key === initialSection) ? initialSection : availableCategories[0]?.key ?? "profile";
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>(initial);
  const [draft, setDraft] = useState<ProductionSettingsValues>(values);
  const [baseline, setBaseline] = useState<ProductionSettingsValues>(values);
  const [savingSection, setSavingSection] = useState<SettingsSectionKey | null>(null);
  const [savedAtBySection, setSavedAtBySection] = useState<Partial<Record<SettingsSectionKey, string>>>({});
  const [errorsBySection, setErrorsBySection] = useState<Partial<Record<SettingsSectionKey, FieldErrors>>>({});
  const [roleDrafts, setRoleDrafts] = useState<Record<string, Role>>(() => users.reduce<Record<string, Role>>((acc, user) => {
    acc[user.id] = user.role;
    return acc;
  }, {}));
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const dirtyBySection = useMemo(() => {
    return Object.fromEntries(
      Object.keys(draft).map((section) => [section, stringify(draft[section as keyof ProductionSettingsValues]) !== stringify(baseline[section as keyof ProductionSettingsValues])])
    ) as Record<keyof ProductionSettingsValues, boolean>;
  }, [draft, baseline]);

  const activeCategory = availableCategories.find((category) => category.key === activeSection) ?? availableCategories[0];
  const activeDirty = activeSection in dirtyBySection ? dirtyBySection[activeSection as keyof ProductionSettingsValues] : false;
  const activeErrors = errorsBySection[activeSection] ?? {};
  const activeCanSave = roleCanSave(role, activeSection) && Boolean(activeCategory?.saveable);

  useEffect(() => {
    const hasDirty = Object.values(dirtyBySection).some(Boolean);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirtyBySection]);

  const changeSection = useCallback((section: SettingsSectionKey) => {
    if (section !== activeSection && activeDirty) {
      const proceed = window.confirm("You have unsaved changes in this section. Leave without saving?");
      if (!proceed) return;
    }

    setActiveSection(section);
    const url = new URL(window.location.href);
    url.searchParams.set("section", section);
    url.searchParams.delete("tab");
    window.history.replaceState(window.history.state, "", `${url.pathname}?${url.searchParams.toString()}`);
  }, [activeDirty, activeSection]);

  const updateDraft = useCallback(<TSection extends keyof ProductionSettingsValues>(section: TSection, updater: (current: ProductionSettingsValues[TSection]) => ProductionSettingsValues[TSection]) => {
    setDraft((current) => ({ ...current, [section]: updater(current[section]) }));
  }, []);

  const resetActiveSection = useCallback(() => {
    if (!(activeSection in baseline)) return;
    setDraft((current) => ({
      ...current,
      [activeSection]: baseline[activeSection as keyof ProductionSettingsValues]
    }));
    setErrorsBySection((current) => ({ ...current, [activeSection]: {} }));
  }, [activeSection, baseline]);

  const saveActiveSection = useCallback(async () => {
    if (!activeCategory?.saveable || !(activeSection in draft)) return;
    const valuesForSection = draft[activeSection as keyof ProductionSettingsValues];
    const nextErrors = errorsFromZod(editableSchemas[activeSection], valuesForSection);
    setErrorsBySection((current) => ({ ...current, [activeSection]: nextErrors }));
    if (Object.keys(nextErrors).length > 0) {
      toast({ title: "Check this section", description: "Fix the highlighted settings before saving.", variant: "destructive" });
      return;
    }

    setSavingSection(activeSection);
    try {
      const result = await saveProductionSettingsSection({ section: activeSection, values: valuesForSection });
      setBaseline((current) => ({ ...current, [activeSection]: valuesForSection }));
      setSavedAtBySection((current) => ({ ...current, [activeSection]: formatSavedAt(result.updatedAt) }));
      toast({ title: "Settings saved" });
    } catch (error) {
      toast({
        title: "Unable to save settings",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingSection(null);
    }
  }, [activeCategory?.saveable, activeSection, draft, toast]);

  async function saveUserRole(userId: string) {
    setUpdatingUserId(userId);
    try {
      await updateUserRole({ userId, role: roleDrafts[userId] });
      toast({ title: "Team role updated" });
    } catch (error) {
      toast({
        title: "Unable to update role",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="relative overflow-hidden !p-0">
        <div className="h-1.5 bg-[linear-gradient(90deg,#0f3d2e,#1f7a58,#5ee0b8)]" />
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/55">Actify settings</p>
              <h1 className="mt-1 font-[var(--font-display)] text-3xl text-foreground">Settings</h1>
              <p className="mt-2 max-w-2xl text-sm text-foreground/72">
                Configure facility, documentation, AI, reports, notifications, team access, and data controls without turning Actify into an EHR.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white/75">{draft.facility.facilityName || facilityName}</Badge>
                <Badge variant="outline" className="bg-white/75">Role: {roleDisplayLabel(role)}</Badge>
                <Badge variant="outline" className="bg-white/75">{getSectionSummary(draft, activeSection)}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <GlassButton asChild variant="dense" size="sm">
                <Link href="/app/billing" className="inline-flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Billing</Link>
              </GlassButton>
              <GlassButton asChild variant="dense" size="sm">
                <Link href="/contact" className="inline-flex items-center gap-1.5">Help</Link>
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-[1.6rem] border border-emerald-900/15 bg-[#10261d] p-2.5 shadow-[0_22px_45px_-34px_rgba(6,78,59,0.7)]">
            <div className="space-y-1">
              {availableCategories.map((category) => {
                const Icon = category.icon;
                const active = category.key === activeSection;
                const dirty = category.key in dirtyBySection ? dirtyBySection[category.key as keyof ProductionSettingsValues] : false;
                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => changeSection(category.key)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60",
                      active ? "bg-emerald-100 text-emerald-950 shadow-sm" : "text-emerald-50/78 hover:bg-emerald-900/45 hover:text-white"
                    )}
                  >
                    <Icon className={cn("mt-0.5 h-4 w-4", active ? "text-emerald-800" : "text-emerald-200/80")} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {category.label}
                        {dirty ? <span className="h-2 w-2 rounded-full bg-amber-400" aria-label="Unsaved changes" /> : null}
                      </span>
                      <span className={cn("mt-0.5 block text-xs", active ? "text-emerald-900/65" : "text-emerald-50/52")}>{category.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="lg:hidden">
            <Select value={activeSection} onValueChange={(value) => changeSection(value as SettingsSectionKey)}>
              <SelectTrigger className="h-12 rounded-2xl border-emerald-900/15 bg-white/85">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((category) => (
                  <SelectItem key={category.key} value={category.key}>{category.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeErrors.form ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">{activeErrors.form}</div>
          ) : null}

          {activeSection === "profile" ? renderProfileSection(draft, updateDraft, activeErrors) : null}
          {activeSection === "facility" ? renderFacilitySection(draft, updateDraft, activeErrors) : null}
          {activeSection === "calendar" ? renderCalendarSection(draft, updateDraft) : null}
          {activeSection === "documentation" ? renderDocumentationSection(draft, updateDraft) : null}
          {activeSection === "assistant" ? renderAssistantSection(draft, updateDraft) : null}
          {activeSection === "chronicle" ? renderChronicleSection(draft, updateDraft) : null}
          {activeSection === "reports" ? renderReportsSection(draft, updateDraft) : null}
          {activeSection === "notifications" ? renderNotificationsSection(draft, updateDraft) : null}
          {activeSection === "team" ? renderTeamSection({ users, roleDrafts, setRoleDrafts, updatingUserId, saveUserRole, auditEntries }) : null}
          {activeSection === "subscription" ? renderSubscriptionSection(billing) : null}
          {activeSection === "security" ? renderSecuritySection(draft, updateDraft) : null}

          {activeCategory?.saveable ? (
            <SaveBar
              isDirty={activeDirty}
              isSaving={savingSection === activeSection}
              savedAt={savedAtBySection[activeSection]}
              canSave={activeCanSave}
              onSave={saveActiveSection}
              onReset={resetActiveSection}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function renderProfileSection(values: ProductionSettingsValues, updateDraft: <TSection extends keyof ProductionSettingsValues>(section: TSection, updater: (current: ProductionSettingsValues[TSection]) => ProductionSettingsValues[TSection]) => void, errors: FieldErrors) {
  const profile = values.profile;
  const update = (patch: Partial<typeof profile>) => updateDraft("profile", (current) => ({ ...current, ...patch }));
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader title="Profile" description="Your personal settings follow you across Actify. Email and password changes stay in the authentication provider flow." icon={UserCog} />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="Full name" value={profile.fullName} error={errors.fullName} onChange={(fullName) => update({ fullName })} />
          <TextField label="Preferred name" value={profile.preferredName} onChange={(preferredName) => update({ preferredName })} />
          <TextField label="Job title" value={profile.jobTitle} onChange={(jobTitle) => update({ jobTitle })} />
          <TextField label="Email address" value={profile.email} readOnly help="Email changes must be handled through the secure sign-in provider." onChange={() => undefined} />
          <TextField label="Phone number" value={profile.phone} onChange={(phone) => update({ phone })} />
          <TextField label="Profile photo URL" value={profile.profilePhotoUrl} onChange={(profilePhotoUrl) => update({ profilePhotoUrl })} />
          <TextField label="Initials avatar" value={profile.initials} onChange={(initials) => update({ initials })} />
          <SelectField label="Preferred time format" value={profile.preferredTimeFormat} options={[{ value: "12H", label: "12-hour" }, { value: "24H", label: "24-hour" }]} onChange={(preferredTimeFormat) => update({ preferredTimeFormat })} />
          <TextField label="Personal timezone" value={profile.personalTimezone} error={errors.personalTimezone} onChange={(personalTimezone) => update({ personalTimezone })} />
          <SelectField label="Default landing page" value={profile.defaultLandingPage} options={[{ value: DefaultLanding.DASHBOARD, label: "Dashboard" }, { value: DefaultLanding.CALENDAR, label: "Calendar" }, { value: DefaultLanding.NOTES, label: "Documentation" }, { value: DefaultLanding.RESIDENTS, label: "Residents" }]} onChange={(defaultLandingPage) => update({ defaultLandingPage })} />
          <SelectField label="Font scale" value={profile.fontScale} options={[{ value: FontScale.SM, label: "Small" }, { value: FontScale.MD, label: "Medium" }, { value: FontScale.LG, label: "Large" }]} onChange={(fontScale) => update({ fontScale })} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ToggleRow label="High contrast" checked={profile.highContrast} onChange={(highContrast) => update({ highContrast })} />
          <ToggleRow label="Reduce motion" checked={profile.reduceMotion} onChange={(reduceMotion) => update({ reduceMotion })} />
        </div>
      </GlassCard>
    </div>
  );
}

function renderFacilitySection(values: ProductionSettingsValues, updateDraft: <TSection extends keyof ProductionSettingsValues>(section: TSection, updater: (current: ProductionSettingsValues[TSection]) => ProductionSettingsValues[TSection]) => void, errors: FieldErrors) {
  const facility = values.facility;
  const update = (patch: Partial<typeof facility>) => updateDraft("facility", (current) => ({ ...current, ...patch }));
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader title="Facility" description="This location powers weather, local news, report headers, calendars, and Daily Chronicle defaults." icon={Building2} />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="Facility name" value={facility.facilityName} error={errors.facilityName} onChange={(facilityName) => update({ facilityName })} />
          <TextField label="Facility logo URL" value={facility.facilityLogoUrl} onChange={(facilityLogoUrl) => update({ facilityLogoUrl })} />
          <SelectField label="Facility type" value={facility.facilityType} options={[{ value: "SNF", label: "Skilled Nursing" }, { value: "AssistedLiving", label: "Assisted Living" }, { value: "MemoryCare", label: "Memory Care" }, { value: "Rehab", label: "Rehab" }]} onChange={(facilityType) => update({ facilityType })} />
          <TextField label="Main phone number" value={facility.mainPhone} onChange={(mainPhone) => update({ mainPhone })} />
          <TextField label="Street address" value={facility.streetAddress} onChange={(streetAddress) => update({ streetAddress })} />
          <TextField label="Address line 2" value={facility.addressLine2} onChange={(addressLine2) => update({ addressLine2 })} />
          <TextField label="City" value={facility.city} onChange={(city) => update({ city })} />
          <SelectField label="State" value={facility.state || "TX"} options={stateOptions.map((state) => ({ value: state, label: state }))} onChange={(state) => update({ state })} />
          <TextField label="ZIP code" value={facility.zipCode} onChange={(zipCode) => update({ zipCode })} />
          <TextField label="Facility timezone" value={facility.facilityTimezone} error={errors.facilityTimezone} onChange={(facilityTimezone) => update({ facilityTimezone })} />
          <TextField label="Administrator name" value={facility.administratorName} onChange={(administratorName) => update({ administratorName })} />
          <TextField label="Activities Director name" value={facility.activitiesDirectorName} onChange={(activitiesDirectorName) => update({ activitiesDirectorName })} />
          <TextField label="Census capacity" type="number" value={facility.censusCapacity} onChange={(censusCapacity) => update({ censusCapacity: Number(censusCapacity) })} />
          <TextField label="Default resident population / care level" value={facility.defaultPopulation} onChange={(defaultPopulation) => update({ defaultPopulation })} />
          <TextField label="Operating hours start" type="time" value={facility.operatingHours.start} onChange={(start) => update({ operatingHours: { ...facility.operatingHours, start } })} />
          <TextField label="Operating hours end" type="time" value={facility.operatingHours.end} onChange={(end) => update({ operatingHours: { ...facility.operatingHours, end } })} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {dayLabels.map((label, index) => {
            const checked = facility.operatingHours.days.includes(index);
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  const days = checked
                    ? facility.operatingHours.days.filter((day) => day !== index)
                    : Array.from(new Set([...facility.operatingHours.days, index])).sort((a, b) => a - b);
                  update({ operatingHours: { ...facility.operatingHours, days } });
                }}
                className={cn("rounded-full border px-3 py-1.5 text-sm", checked ? "border-emerald-700 bg-emerald-900 text-white" : "border-emerald-900/15 bg-white/80 text-foreground")}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <ToggleRow label="Enable memory-care-specific activity options" checked={facility.memoryCareActivityOptionsEnabled} onChange={(memoryCareActivityOptionsEnabled) => update({ memoryCareActivityOptionsEnabled })} />
        </div>
      </GlassCard>
    </div>
  );
}

function renderCalendarSection(values: ProductionSettingsValues, updateDraft: <TSection extends keyof ProductionSettingsValues>(section: TSection, updater: (current: ProductionSettingsValues[TSection]) => ProductionSettingsValues[TSection]) => void) {
  const calendar = values.calendar;
  const update = (patch: Partial<typeof calendar>) => updateDraft("calendar", (current) => ({ ...current, ...patch }));
  return (
    <GlassCard>
      <SectionHeader title="Calendar & Activities" description="Keep the calendar practical: verified birthdays only, scheduled activities only, and printer-friendly defaults." icon={CalendarDays} />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <SelectField label="Default calendar view" value={calendar.defaultCalendarView} options={[{ value: "MONTH", label: "Month" }, { value: "WEEK", label: "Week" }, { value: "DAY", label: "Day" }]} onChange={(defaultCalendarView) => update({ defaultCalendarView })} />
        <SelectField label="First day of week" value={calendar.firstDayOfWeek} options={[{ value: "SUNDAY", label: "Sunday" }, { value: "MONDAY", label: "Monday" }]} onChange={(firstDayOfWeek) => update({ firstDayOfWeek })} />
        <SelectField label="Time format" value={calendar.timeFormat} options={[{ value: "12H", label: "12-hour" }, { value: "24H", label: "24-hour" }]} onChange={(timeFormat) => update({ timeFormat })} />
        <TextField label="Default group duration" type="number" value={calendar.defaultActivityDurationMinutes} onChange={(value) => update({ defaultActivityDurationMinutes: Number(value) })} />
        <TextField label="Default 1:1 duration" type="number" value={calendar.defaultOneToOneDurationMinutes} onChange={(value) => update({ defaultOneToOneDurationMinutes: Number(value) })} />
        <TextField label="Default location" value={calendar.defaultActivityLocation} onChange={(defaultActivityLocation) => update({ defaultActivityLocation })} />
        <TextField label="Default staff member" value={calendar.defaultStaffMember} onChange={(defaultStaffMember) => update({ defaultStaffMember })} />
        <SelectField label="Default attendance status" value={calendar.defaultAttendanceStatus} options={attendanceStatusOptions} onChange={(defaultAttendanceStatus) => update({ defaultAttendanceStatus })} />
        <SelectField label="Setup/cleanup buffer" value={calendar.setupBufferMinutes} options={setupBufferOptions} onChange={(setupBufferMinutes) => update({ setupBufferMinutes })} />
        <SelectField label="Printable orientation" value={calendar.printableCalendarOrientation} options={[{ value: "PORTRAIT", label: "Portrait" }, { value: "LANDSCAPE", label: "Landscape" }]} onChange={(printableCalendarOrientation) => update({ printableCalendarOrientation })} />
        <SelectField label="Printable font size" value={calendar.printableCalendarFontSize} options={[{ value: "SMALL", label: "Small" }, { value: "STANDARD", label: "Standard" }, { value: "LARGE", label: "Large" }]} onChange={(printableCalendarFontSize) => update({ printableCalendarFontSize })} />
        <TextField label="Printable footer text" value={calendar.printableCalendarFooterText} onChange={(printableCalendarFooterText) => update({ printableCalendarFooterText })} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ToggleRow label="Show weekends" checked={calendar.showWeekends} onChange={(showWeekends) => update({ showWeekends })} />
        <ToggleRow label="Show resident birthdays" description="Birthdays must come from verified resident records." checked={calendar.showResidentBirthdays} onChange={(showResidentBirthdays) => update({ showResidentBirthdays })} />
        <ToggleRow label="Show holidays" checked={calendar.showHolidays} onChange={(showHolidays) => update({ showHolidays })} />
        <ToggleRow label="Show special events" checked={calendar.showSpecialEvents} onChange={(showSpecialEvents) => update({ showSpecialEvents })} />
        <ToggleRow label="Allow overlapping activities" checked={calendar.allowOverlappingActivities} onChange={(allowOverlappingActivities) => update({ allowOverlappingActivities })} />
        <ToggleRow label="Include setup and cleanup time" checked={calendar.includeSetupCleanupTime} onChange={(includeSetupCleanupTime) => update({ includeSetupCleanupTime })} />
        <ToggleRow label="Show facility logo on printed calendars" checked={calendar.showFacilityLogoOnPrintedCalendars} onChange={(showFacilityLogoOnPrintedCalendars) => update({ showFacilityLogoOnPrintedCalendars })} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(calendar.categoryColors).map(([key, color]) => (
          <TextField key={key} label={`${key} color`} value={color} onChange={(next) => update({ categoryColors: { ...calendar.categoryColors, [key]: next } })} />
        ))}
      </div>
    </GlassCard>
  );
}

function renderDocumentationSection(values: ProductionSettingsValues, updateDraft: <TSection extends keyof ProductionSettingsValues>(section: TSection, updater: (current: ProductionSettingsValues[TSection]) => ProductionSettingsValues[TSection]) => void) {
  const docs = values.documentation;
  const update = (patch: Partial<typeof docs>) => updateDraft("documentation", (current) => ({ ...current, ...patch }));
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader title="Documentation" description="Documentation settings stay activity-focused and never authorize AI to invent facts." icon={BookOpenCheck} />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SelectField label="Default note type" value={docs.defaultNoteType} options={noteTypeOptions} onChange={(defaultNoteType) => update({ defaultNoteType })} />
          <SelectField label="Default documentation tone" value={docs.defaultDocumentationTone} options={documentationToneOptions} onChange={(defaultDocumentationTone) => update({ defaultDocumentationTone })} />
          <SelectField label="Note length" value={docs.noteLength} options={noteLengthOptions} onChange={(noteLength) => update({ noteLength })} />
          <TextField label="Auto-save interval seconds" type="number" value={docs.autoSaveIntervalSeconds} onChange={(value) => update({ autoSaveIntervalSeconds: Number(value) })} />
          <SelectField label="Default follow-up status" value={docs.defaultFollowUpStatus} options={followUpStatusOptions} onChange={(defaultFollowUpStatus) => update({ defaultFollowUpStatus })} />
          <SelectField label="Attendance participation rule" value={docs.participationRule} options={[{ value: "GROUP_AND_COMPLETED_1TO1", label: "Group + completed 1:1" }, { value: "GROUP_ONLY", label: "Group only" }, { value: "COMPLETED_1TO1_ONLY", label: "Completed 1:1 only" }]} onChange={(participationRule) => update({ participationRule })} />
          <TextField label="Weekly not-seen threshold days" type="number" value={docs.weeklyNotSeenThresholdDays} onChange={(value) => update({ weeklyNotSeenThresholdDays: Number(value) })} />
          <TextField label="Monthly not-seen threshold days" type="number" value={docs.monthlyNotSeenThresholdDays} onChange={(value) => update({ monthlyNotSeenThresholdDays: Number(value) })} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ToggleRow label="Refusals count as documented contacts" checked={docs.refusalsCountAsDocumentedContacts} onChange={(refusalsCountAsDocumentedContacts) => update({ refusalsCountAsDocumentedContacts })} />
          <ToggleRow label="Passive attendance counts as participation" checked={docs.passiveAttendanceCountsAsParticipation} onChange={(passiveAttendanceCountsAsParticipation) => update({ passiveAttendanceCountsAsParticipation })} />
          <ToggleRow label="Require staff initials or signature" checked={docs.requireStaffInitialsOrSignature} onChange={(requireStaffInitialsOrSignature) => update({ requireStaffInitialsOrSignature })} />
          <ToggleRow label="Require completion date and time" checked={docs.requireCompletionDateTime} onChange={(requireCompletionDateTime) => update({ requireCompletionDateTime })} />
        </div>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Templates" description="Defaults for staff drafts. AI-generated notes still require human review before saving." icon={FileText} />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <TextAreaField label="Group-note template" value={docs.groupNoteTemplate} onChange={(groupNoteTemplate) => update({ groupNoteTemplate })} />
          <TextAreaField label="1:1-note template" value={docs.oneToOneNoteTemplate} onChange={(oneToOneNoteTemplate) => update({ oneToOneNoteTemplate })} />
          <TextAreaField label="Care-plan note template" value={docs.carePlanNoteTemplate} onChange={(carePlanNoteTemplate) => update({ carePlanNoteTemplate })} />
          <TextAreaField label="Admission UDA template" value={docs.admissionUdaTemplate} onChange={(admissionUdaTemplate) => update({ admissionUdaTemplate })} />
          <TextAreaField label="Quarterly UDA template" value={docs.quarterlyUdaTemplate} onChange={(quarterlyUdaTemplate) => update({ quarterlyUdaTemplate })} />
          <TextAreaField label="Annual UDA template" value={docs.annualUdaTemplate} onChange={(annualUdaTemplate) => update({ annualUdaTemplate })} />
        </div>
        <div className="mt-5">
          <StringListEditor label="Required documentation fields" values={docs.requiredFields} placeholder="Mood/Affect" onChange={(requiredFields) => update({ requiredFields })} />
        </div>
      </GlassCard>
    </div>
  );
}

function renderAssistantSection(values: ProductionSettingsValues, updateDraft: <TSection extends keyof ProductionSettingsValues>(section: TSection, updater: (current: ProductionSettingsValues[TSection]) => ProductionSettingsValues[TSection]) => void) {
  const assistant = values.assistant;
  const update = (patch: Partial<typeof assistant>) => updateDraft("assistant", (current) => ({ ...current, ...patch }));
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader title="AI Assistant" description="These controls shape AI output, but never expose API keys, model internals, or system prompts in the browser." icon={Bot} />
        <div className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          AI output should always be reviewed before being placed into a resident medical or care record. Actify is a writing helper, not PCC or an EHR.
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SelectField label="Default response length" value={assistant.defaultResponseLength} options={responseLengthOptions} onChange={(defaultResponseLength) => update({ defaultResponseLength })} />
          <SelectField label="Preferred documentation style" value={assistant.preferredDocumentationStyle} options={documentationStyleOptions} onChange={(preferredDocumentationStyle) => update({ preferredDocumentationStyle })} />
          <SelectField label="Tone" value={assistant.tone} options={assistantToneOptions} onChange={(tone) => update({ tone })} />
          <SelectField label="Reading level" value={assistant.readingLevel} options={assistantReadingLevelOptions} onChange={(readingLevel) => update({ readingLevel })} />
          <SelectField label="Default Bible translation" value={assistant.defaultBibleTranslation} options={assistantBibleOptions} onChange={(defaultBibleTranslation) => update({ defaultBibleTranslation })} />
          <SelectField label="Preferred activity difficulty" value={assistant.preferredActivityDifficulty} options={activityDifficultyOptions} onChange={(preferredActivityDifficulty) => update({ preferredActivityDifficulty })} />
          <SelectField label="Preferred group size" value={assistant.preferredGroupSize} options={groupSizeOptions} onChange={(preferredGroupSize) => update({ preferredGroupSize })} />
          <TextField label="Default activity duration" type="number" value={assistant.defaultActivityDurationMinutes} onChange={(value) => update({ defaultActivityDurationMinutes: Number(value) })} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ToggleRow label="Allow resident-facing language" checked={assistant.allowResidentFacingLanguage} onChange={(allowResidentFacingLanguage) => update({ allowResidentFacingLanguage })} />
          <ToggleRow label="Enable AI suggestions" checked={assistant.enableAiSuggestions} onChange={(enableAiSuggestions) => update({ enableAiSuggestions })} />
          <ToggleRow label="Enable activity adaptations" checked={assistant.enableActivityAdaptations} onChange={(enableActivityAdaptations) => update({ enableActivityAdaptations })} />
          <ToggleRow label="Enable AI supply lists" checked={assistant.enableSupplyLists} onChange={(enableSupplyLists) => update({ enableSupplyLists })} />
          <ToggleRow label="Enable care-plan suggestions" checked={assistant.enableCarePlanSuggestions} onChange={(enableCarePlanSuggestions) => update({ enableCarePlanSuggestions })} />
          <ToggleRow label="Confirm before resident info is included" checked={assistant.requireConfirmationBeforeResidentInfo} onChange={(requireConfirmationBeforeResidentInfo) => update({ requireConfirmationBeforeResidentInfo })} />
        </div>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Facility AI Language" description="Give Actify your facility-approved wording without exposing private backend prompts." icon={FileText} />
        <div className="mt-5">
          <TextAreaField label="Custom facility instructions" rows={5} value={assistant.customFacilityInstructions} onChange={(customFacilityInstructions) => update({ customFacilityInstructions })} />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <StringListEditor label="Approved terminology" values={assistant.approvedTerminology} placeholder="participated" onChange={(approvedTerminology) => update({ approvedTerminology })} />
          <StringListEditor label="Terms or phrases to avoid" values={assistant.termsToAvoid} placeholder="noncompliant" onChange={(termsToAvoid) => update({ termsToAvoid })} />
        </div>
        <Button type="button" variant="outline" className="mt-5 rounded-xl" onClick={() => updateDraft("assistant", () => ({ ...defaultAssistantSettings }))}>
          Reset AI preferences to defaults
        </Button>
      </GlassCard>
    </div>
  );
}

function renderChronicleSection(values: ProductionSettingsValues, updateDraft: <TSection extends keyof ProductionSettingsValues>(section: TSection, updater: (current: ProductionSettingsValues[TSection]) => ProductionSettingsValues[TSection]) => void) {
  const chronicle = values.chronicle;
  const update = (patch: Partial<typeof chronicle>) => updateDraft("chronicle", (current) => ({ ...current, ...patch }));
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader title="Daily Chronicle" description="Controls for the resident-friendly daily news and activity handout. Missing facts must stay unavailable, not invented." icon={Newspaper} />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ToggleRow label="Enable Daily Chronicle" checked={chronicle.enabled} onChange={(enabled) => update({ enabled })} />
          <TextField label="Default publication time" type="time" value={chronicle.defaultPublicationTime} onChange={(defaultPublicationTime) => update({ defaultPublicationTime })} />
          <SelectField label="Reading level" value={chronicle.readingLevel} options={chronicleReadingLevelOptions} onChange={(readingLevel) => update({ readingLevel })} />
          <SelectField label="Maximum article length" value={chronicle.maximumArticleLength} options={articleLengthOptions} onChange={(maximumArticleLength) => update({ maximumArticleLength })} />
          <SelectField label="Default Bible translation" value={chronicle.defaultBibleTranslation} options={chronicleBibleOptions} onChange={(defaultBibleTranslation) => update({ defaultBibleTranslation })} />
          <TextField label="News max age in days" type="number" value={chronicle.requiredNewsPublishedWithinDays} onChange={(value) => update({ requiredNewsPublishedWithinDays: Number(value) })} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Object.entries(chronicle.sections).map(([key, enabled]) => (
            <ToggleRow key={key} label={key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())} checked={enabled} onChange={(value) => update({ sections: { ...chronicle.sections, [key]: value } })} />
          ))}
          <ToggleRow label="Large-print mode" checked={chronicle.largePrintMode} onChange={(largePrintMode) => update({ largePrintMode })} />
          <ToggleRow label="Use facility address for local news/weather" checked={chronicle.useFacilityAddressForLocalInfo} onChange={(useFacilityAddressForLocalInfo) => update({ useFacilityAddressForLocalInfo })} />
          <ToggleRow label="Display source names" checked={chronicle.displaySourceNames} onChange={(displaySourceNames) => update({ displaySourceNames })} />
          <ToggleRow label="Display clickable source links" checked={chronicle.displayClickableSourceLinks} onChange={(displayClickableSourceLinks) => update({ displayClickableSourceLinks })} />
          <ToggleRow label="Display retrieved date/time" checked={chronicle.displayRetrievedDateTime} onChange={(displayRetrievedDateTime) => update({ displayRetrievedDateTime })} />
        </div>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="News Domains" description="Administrators can guide source selection without allowing fabricated news." icon={ShieldCheck} />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <StringListEditor label="Approved news domains" values={chronicle.approvedNewsDomains} placeholder="apnews.com" onChange={(approvedNewsDomains) => update({ approvedNewsDomains })} />
          <StringListEditor label="Blocked news domains" values={chronicle.blockedNewsDomains} placeholder="example.com" onChange={(blockedNewsDomains) => update({ blockedNewsDomains })} />
        </div>
      </GlassCard>
    </div>
  );
}

function renderReportsSection(values: ProductionSettingsValues, updateDraft: <TSection extends keyof ProductionSettingsValues>(section: TSection, updater: (current: ProductionSettingsValues[TSection]) => ProductionSettingsValues[TSection]) => void) {
  const reports = values.reports;
  const update = (patch: Partial<typeof reports>) => updateDraft("reports", (current) => ({ ...current, ...patch }));
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader title="Reports & Printing" description="Keep reports state-ready, printable, and separate from clinical charting." icon={Printer} />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SelectField label="Default report period" value={reports.defaultReportPeriod} options={reportPeriodOptions} onChange={(defaultReportPeriod) => update({ defaultReportPeriod })} />
          <SelectField label="Default participation calculation" value={reports.defaultParticipationCalculation} options={participationCalculationOptions} onChange={(defaultParticipationCalculation) => update({ defaultParticipationCalculation })} />
          <SelectField label="Show" value={reports.displayMode} options={displayModeOptions} onChange={(displayMode) => update({ displayMode })} />
          <SelectField label="Paper size" value={reports.paperSize} options={[{ value: "LETTER", label: "Letter" }, { value: "A4", label: "A4" }]} onChange={(paperSize) => update({ paperSize })} />
          <SelectField label="Orientation" value={reports.orientation} options={[{ value: "PORTRAIT", label: "Portrait" }, { value: "LANDSCAPE", label: "Landscape" }]} onChange={(orientation) => update({ orientation })} />
          <SelectField label="Print mode" value={reports.printColorMode} options={[{ value: "Color", label: "Color" }, { value: "Ink-friendly", label: "Ink-friendly" }]} onChange={(printColorMode) => update({ printColorMode })} />
          <SelectField label="CSV date format" value={reports.csvDateFormat} options={[{ value: "MM/DD/YYYY", label: "MM/DD/YYYY" }, { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }]} onChange={(csvDateFormat) => update({ csvDateFormat })} />
          <TextField label="PDF naming convention" value={reports.pdfNamingConvention} onChange={(pdfNamingConvention) => update({ pdfNamingConvention })} />
          <TextField label="Default footer" value={reports.defaultFooter} onChange={(defaultFooter) => update({ defaultFooter })} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ToggleRow label="Include group attendance" checked={reports.includeGroupAttendance} onChange={(includeGroupAttendance) => update({ includeGroupAttendance })} />
          <ToggleRow label="Include 1:1 visits" checked={reports.includeOneToOneVisits} onChange={(includeOneToOneVisits) => update({ includeOneToOneVisits })} />
          <ToggleRow label="Include refusals" checked={reports.includeRefusals} onChange={(includeRefusals) => update({ includeRefusals })} />
          <ToggleRow label="Include passive participation" checked={reports.includePassiveParticipation} onChange={(includePassiveParticipation) => update({ includePassiveParticipation })} />
          <ToggleRow label="Large-print mode" checked={reports.largePrintMode} onChange={(largePrintMode) => update({ largePrintMode })} />
          <ToggleRow label="Include facility logo" checked={reports.includeFacilityLogo} onChange={(includeFacilityLogo) => update({ includeFacilityLogo })} />
          <ToggleRow label="Include facility address" checked={reports.includeFacilityAddress} onChange={(includeFacilityAddress) => update({ includeFacilityAddress })} />
          <ToggleRow label="Include staff signature line" checked={reports.includeStaffSignatureLine} onChange={(includeStaffSignatureLine) => update({ includeStaffSignatureLine })} />
          <ToggleRow label="Include generated date/time" checked={reports.includeGeneratedDateTime} onChange={(includeGeneratedDateTime) => update({ includeGeneratedDateTime })} />
          <ToggleRow label="Allow PDF export" checked={reports.exportFormats.pdf} onChange={(value) => update({ exportFormats: { ...reports.exportFormats, pdf: value } })} />
          <ToggleRow label="Allow CSV export" checked={reports.exportFormats.csv} onChange={(value) => update({ exportFormats: { ...reports.exportFormats, csv: value } })} />
        </div>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Live Print Preview" description="A lightweight preview of the report sign-off style using your current defaults." icon={FileText} />
        <div className="mt-5 rounded-2xl border border-zinc-300 bg-white p-5 text-zinc-900 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Generated by Actify</p>
          <h3 className="mt-2 text-xl font-bold">Monthly Attendance Report</h3>
          <p className="mt-1 text-sm text-zinc-600">Default period: {reports.defaultReportPeriod} • {reports.displayMode}</p>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg border p-3">Group attendance: {reports.includeGroupAttendance ? "Included" : "Hidden"}</div>
            <div className="rounded-lg border p-3">1:1 visits: {reports.includeOneToOneVisits ? "Included" : "Hidden"}</div>
            <div className="rounded-lg border p-3">Print: {reports.paperSize} / {reports.orientation}</div>
          </div>
          <p className="mt-5 border-t pt-4 text-sm">Activities Director Signature: _______________________________</p>
          <p className="mt-3 text-sm">Administrator Signature: _______________________________</p>
        </div>
      </GlassCard>
    </div>
  );
}

function renderNotificationsSection(values: ProductionSettingsValues, updateDraft: <TSection extends keyof ProductionSettingsValues>(section: TSection, updater: (current: ProductionSettingsValues[TSection]) => ProductionSettingsValues[TSection]) => void) {
  const notifications = values.notifications;
  const update = (patch: Partial<typeof notifications>) => updateDraft("notifications", (current) => ({ ...current, ...patch }));
  return (
    <GlassCard>
      <SectionHeader title="Notifications" description="Actify currently supports in-app notifications. Email, SMS, and push controls are not shown as fake options." icon={BellRing} />
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Notification method: In-app only.</div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <SelectField label="Notification frequency" value={notifications.frequency} options={notificationFrequencyOptions} onChange={(frequency) => update({ frequency })} />
        <TextField label="Quiet hours start" type="time" value={notifications.quietHoursStart} onChange={(quietHoursStart) => update({ quietHoursStart })} />
        <TextField label="Quiet hours end" type="time" value={notifications.quietHoursEnd} onChange={(quietHoursEnd) => update({ quietHoursEnd })} />
      </div>
      <div className="mt-4">
        <ToggleRow label="Quiet hours enabled" checked={notifications.quietHoursEnabled} onChange={(quietHoursEnabled) => update({ quietHoursEnabled })} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {Object.entries(notifications.triggers).map(([key, enabled]) => (
          <ToggleRow key={key} label={key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())} checked={enabled} onChange={(value) => update({ triggers: { ...notifications.triggers, [key]: value } })} />
        ))}
      </div>
    </GlassCard>
  );
}

function renderTeamSection({ users, roleDrafts, setRoleDrafts, updatingUserId, saveUserRole, auditEntries }: { users: SettingsUserSummary[]; roleDrafts: Record<string, Role>; setRoleDrafts: React.Dispatch<React.SetStateAction<Record<string, Role>>>; updatingUserId: string | null; saveUserRole: (userId: string) => Promise<void>; auditEntries: SettingsAuditSummary[] }) {
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader title="Team & Permissions" description="Administrators can update team roles. Server actions enforce these permissions; hiding buttons is not the security layer." icon={UsersRound} />
        {users.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-emerald-900/10 bg-white/70 p-4 text-sm text-foreground/70">No team members found.</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-emerald-900/10 bg-white/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select value={roleDrafts[user.id] ?? user.role} onValueChange={(value) => setRoleDrafts((current) => ({ ...current, [user.id]: value as Role }))}>
                        <SelectTrigger className="h-10 min-w-[190px] rounded-xl bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[Role.ADMIN, Role.AD, Role.ASSISTANT, Role.READ_ONLY].map((role) => (
                            <SelectItem key={role} value={role}>{roleDisplayLabel(role)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" className="rounded-xl" disabled={updatingUserId === user.id || roleDrafts[user.id] === user.role} onClick={() => void saveUserRole(user.id)}>
                        {updatingUserId === user.id ? "Saving..." : "Save role"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Team invitations, resend invitation, and cancel invitation require a connected team-invite provider. This interface does not show fake invite controls until that service is connected.
        </div>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Recent Settings Audit" description="A compact trail of recent settings and role changes." icon={ShieldCheck} />
        <div className="mt-4 space-y-2">
          {auditEntries.length === 0 ? <p className="rounded-2xl border border-emerald-900/10 bg-white/70 p-4 text-sm text-foreground/70">No recent settings audit entries.</p> : null}
          {auditEntries.slice(0, 8).map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-emerald-900/10 bg-white/70 p-3 text-sm">
              <p className="font-semibold text-foreground">{entry.entityType}</p>
              <p className="text-foreground/65">{entry.action} by {entry.actorName ?? "Unknown user"} on {formatSavedAt(entry.createdAt)}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function renderSubscriptionSection(billing: SettingsBillingSummary) {
  const active = billing.hasActiveSubscription || billing.status === SubscriptionStatus.ACTIVE || billing.status === SubscriptionStatus.TRIALING;
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader title="Subscription" description="Billing is connected through the existing Stripe flow. Pricing is shown clearly without fake local billing actions." icon={CreditCard} />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-900/10 bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/55">Current plan</p>
            <h3 className="mt-2 text-2xl font-black text-foreground">{billing.planName}</h3>
            <p className="mt-1 text-sm text-foreground/70">{billing.planPriceLabel}</p>
            <Badge className={cn("mt-3", active ? "bg-emerald-900 text-white" : "bg-amber-100 text-amber-900 hover:bg-amber-100")}>{active ? "Active" : "Inactive"}</Badge>
          </div>
          <div className="rounded-2xl border border-emerald-900/10 bg-white/75 p-4 text-sm text-foreground/75">
            <p>Status: {subscriptionStatusLabel(billing.status)}</p>
            <p className="mt-2">Renewal / period end: {formatSubscriptionDate(billing.currentPeriodEnd)}</p>
            <p className="mt-2">Billing profile: {billing.stripeCustomerId ? "Connected" : "Not connected"}</p>
            <p className="mt-2">Available plan options: $5.99 monthly or $60 yearly.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <ManageBillingButton disabled={!billing.stripeCustomerId} className="rounded-xl" />
          <Button asChild className="rounded-xl bg-emerald-900 text-white hover:bg-emerald-800">
            <Link href="/subscribe">View plan options</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-foreground/60">Billing history, plan changes, and cancellation are handled by the Stripe billing portal when a billing profile is connected.</p>
      </GlassCard>
    </div>
  );
}

function renderSecuritySection(values: ProductionSettingsValues, updateDraft: <TSection extends keyof ProductionSettingsValues>(section: TSection, updater: (current: ProductionSettingsValues[TSection]) => ProductionSettingsValues[TSection]) => void) {
  const security = values.security;
  const update = (patch: Partial<typeof security>) => updateDraft("security", (current) => ({ ...current, ...patch }));
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader title="Security & Data" description="Keep sensitive security and billing data server-side while exposing facility-safe controls." icon={ShieldCheck} />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SelectField label="Auto logout minutes" value={security.autoLogoutMinutes} options={autoLogoutOptions} onChange={(autoLogoutMinutes) => update({ autoLogoutMinutes })} />
          <TextField label="Data retention years" type="number" value={security.dataRetentionYears} onChange={(value) => update({ dataRetentionYears: Number(value) })} />
          <TextField label="Audit retention days" type="number" value={security.auditRetentionDays} onChange={(value) => update({ auditRetentionDays: Number(value) })} />
          <TextField label="Export retention days" type="number" value={security.exportRetentionDays} onChange={(value) => update({ exportRetentionDays: Number(value) })} />
          <TextField label="Permanent delete confirmation phrase" value={security.dangerZoneConfirmationPhrase} onChange={(dangerZoneConfirmationPhrase) => update({ dangerZoneConfirmationPhrase })} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ToggleRow label="HIPAA-aware mode" checked={security.hipaaModeEnabled} onChange={(hipaaModeEnabled) => update({ hipaaModeEnabled })} />
          <ToggleRow label="Mask PHI in exports" checked={security.maskPhiInExports} onChange={(maskPhiInExports) => update({ maskPhiInExports })} />
          <ToggleRow label="Audit log access enabled" checked={security.auditLogAccessEnabled} onChange={(auditLogAccessEnabled) => update({ auditLogAccessEnabled })} />
          <ToggleRow label="Only administrators can export" checked={security.onlyAdminsCanExport} onChange={(onlyAdminsCanExport) => update({ onlyAdminsCanExport })} />
          <ToggleRow label="Require MFA for admins when supported" checked={security.requireMfaForAdmins} onChange={(requireMfaForAdmins) => update({ requireMfaForAdmins })} />
          <ToggleRow label="Device trust enabled when supported" checked={security.deviceTrustEnabled} onChange={(deviceTrustEnabled) => update({ deviceTrustEnabled })} />
          <ToggleRow label="Allow facility data export" checked={security.allowFacilityDataExport} onChange={(allowFacilityDataExport) => update({ allowFacilityDataExport })} />
          <ToggleRow label="Allow personal data download" checked={security.allowPersonalDataDownload} onChange={(allowPersonalDataDownload) => update({ allowPersonalDataDownload })} />
        </div>
      </GlassCard>
      <GlassCard className="border-rose-200 bg-rose-50/80">
        <SectionHeader title="Danger Zone" description="Destructive account actions are intentionally separated and must never delete an entire facility from a standard member account." icon={ShieldCheck} />
        <div className="mt-4 rounded-2xl border border-rose-300 bg-white/75 p-4 text-sm text-rose-900">
          Password changes, active sessions, sign out of other sessions, MFA enrollment, account deactivation, and account deletion are managed through the authentication provider and facility policy. Actify does not show destructive fake buttons here.
        </div>
      </GlassCard>
    </div>
  );
}
