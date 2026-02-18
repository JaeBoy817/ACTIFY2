"use client";

import { type ComponentType, useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultLanding, FontScale, Role, RoomFormatRule } from "@prisma/client";
import {
  BellRing,
  Building2,
  CreditCard,
  ShieldCheck,
  SlidersHorizontal,
  UserCog
} from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { saveQueue } from "@/lib/perf/save-queue";
import {
  upsertFacilitySettings,
  upsertUserSettings,
  updateUserRole
} from "@/lib/settings/actions";
import {
  defaultRoleSettingsConfig,
  parseQuickPhrasesList,
  settingsPermissionKeys,
  type RolePermissionMatrix
} from "@/lib/settings/defaults";
import {
  calendarTabSchema,
  carePlanTabSchema,
  complianceTabSchema,
  docsTabSchema,
  facilityTabSchema,
  inventoryTabSchema,
  modulesTabSchema,
  notificationsTabSchema,
  personalTabSchema,
  reportsTabSchema,
  rolesTabSchema
} from "@/lib/settings/schemas";
import { cn } from "@/lib/utils";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/use-toast";

export type SettingsTabKey =
  | "facility"
  | "roles"
  | "modules"
  | "calendar"
  | "docs"
  | "careplan"
  | "reports"
  | "inventory"
  | "notifications"
  | "compliance"
  | "personal";

type FacilitySectionKey = Exclude<SettingsTabKey, "personal">;

const settingsTabs: Array<{ value: SettingsTabKey; label: string; adminOnly?: boolean; icon: ComponentType<{ className?: string }> }> = [
  { value: "facility", label: "Facility", icon: Building2 },
  { value: "roles", label: "Roles", adminOnly: true, icon: ShieldCheck },
  { value: "modules", label: "Modules", adminOnly: true, icon: SlidersHorizontal },
  { value: "calendar", label: "Calendar", icon: SlidersHorizontal },
  { value: "docs", label: "Docs Rules", adminOnly: true, icon: ShieldCheck },
  { value: "careplan", label: "Care Plan", icon: UserCog },
  { value: "reports", label: "Reports", icon: CreditCard },
  { value: "inventory", label: "Inventory", icon: SlidersHorizontal },
  { value: "notifications", label: "Notifications", icon: BellRing },
  { value: "compliance", label: "Compliance", adminOnly: true, icon: ShieldCheck },
  { value: "personal", label: "Personal", icon: UserCog }
];

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  AD: "Activities Director",
  ASSISTANT: "Staff",
  READ_ONLY: "View Only"
};

const sectionLabels: Record<string, string> = {
  calendarEdit: "Edit calendar",
  attendanceEdit: "Edit attendance",
  notesCreateEdit: "Create/Edit notes",
  reportsExport: "Export reports",
  inventoryManage: "Manage inventory",
  prizeCartManage: "Manage prize cart",
  residentCouncilAccess: "Resident council access",
  auditLogView: "View audit log",
  settingsEdit: "Edit settings"
};

const stateOptions = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
] as const;

const notificationTriggerOptions = [
  { key: "oneToOneDueToday", label: "1:1 due today" },
  { key: "newAdmitAdded", label: "New admit added" },
  { key: "dischargePendingDocs", label: "Discharge pending docs" },
  { key: "lowInventory", label: "Low inventory" },
  { key: "carePlanReviewDue", label: "Care plan review due" },
  { key: "noteNeedsCosign", label: "Note needs cosign" }
] as const;

const moduleLabels: Record<string, string> = {
  attendanceTracking: "Attendance Tracking",
  oneToOneNotes: "1:1 Notes",
  groupNotes: "Group Notes",
  carePlanBuilder: "Care Plan Builder",
  activityTemplatesLibrary: "Templates Library",
  residentCouncil: "Resident Council",
  outingsTransportation: "Outings & Transportation",
  prizeCartIncentives: "Prize Cart Incentives",
  inventorySupplyTracking: "Inventory & Supplies",
  therapyCollaboration: "Therapy Collaboration",
  photoAttachments: "Photo Attachments",
  documentESignature: "Document eSignature",
  templates: "Templates (Legacy)",
  calendar: "Calendar (Legacy)",
  notes: "Notes (Legacy)",
  reports: "Reports",
  goals: "Goals",
  analytics: "Analytics",
  assessments: "Assessments",
  inventory: "Inventory (Legacy)",
  prizeCart: "Prize Cart (Legacy)",
  volunteers: "Volunteers",
  carePlan: "Care Plans",
  analyticsHeatmaps: "Analytics Heatmaps",
  familyEngagementNotes: "Family Engagement Notes"
};

const widgetLabels: Record<string, string> = {
  oneToOneDueList: "1:1 Due List",
  birthdays: "Birthdays",
  newAdmitsDischarges: "New Admits/Discharges",
  monthlyParticipationSnapshot: "Monthly Participation Snapshot"
};

type SettingsTabsProps = {
  initialTab: SettingsTabKey;
  role: Role;
  facilityName: string;
  facilityTimezone: string;
  users: Array<{ id: string; name: string; email: string; role: Role }>;
  units: Array<{ id: string; name: string }>;
  auditEntries: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    actorName: string | null;
  }>;
  facilitySettings: {
    timezone: string;
    roomFormatRule: RoomFormatRule;
    roomFormatHint: string;
    businessHours: { start: string; end: string; days: number[] };
    policyFlags: {
      allowSmokingTracking: boolean;
      hideTriggersInPrint: boolean;
      maskSensitiveFieldsInPrint: boolean;
      maskFamilyContactInPrint: boolean;
    };
    facilityProfile: {
      dba: string;
      address: { line1: string; line2: string; city: string; state: string; zip: string };
      type: "SNF" | "AssistedLiving" | "MemoryCare" | "Rehab";
      units: string[];
      roomNumberFormat: "ALPHA_NUM" | "NUMERIC" | "CUSTOM";
      activitySpaces: Array<{ name: string; notes: string }>;
      reportMonthMode: "CALENDAR_MONTH" | "ROLLING_30";
      branding: { logoUrl: string; accentColor: string; gradientPreset: string };
      directoryContacts: Array<{ role: string; name: string; phone: string; email: string }>;
      residentStatusLabels: string[];
      smoking: {
        enabled: boolean;
        scheduledTimes: string[];
        staffEscortRequired: boolean;
        countsAsActivity: boolean;
        activityLabel: string;
      };
    };
    moduleFlags: {
      mode: "CORE_WORKFLOW" | "FULL_TOOLKIT";
      modules: Record<string, boolean>;
      widgets: Record<string, boolean>;
    };
    attendanceRules: {
      engagementWeights: { present: number; active: number; leading: number };
      requireBarrierNoteFor: string[];
      groupMinutes: number;
      oneToOneMinutes: number;
      locations: string[];
      warnTherapyOverlap: boolean;
      warnOutsideBusinessHours: boolean;
      useBusinessHoursDefaults: boolean;
      calendarSettings: {
        defaultView: "DAY" | "WEEK" | "MONTH";
        colorMode: "BY_CATEGORY" | "BY_LOCATION" | "NONE";
        recurringDefaults: { enabled: boolean };
        setupBufferMinutes: 0 | 5 | 10 | 15 | 30;
        staffAssignmentEnabled: boolean;
        attendanceMode: "QUICK_CHECK" | "DETAILED";
        reminders: { enabled: boolean; minutesBefore: number };
        blackoutTimes: Array<{ label: string; start: string; end: string }>;
        holidayPacksEnabled: boolean;
        export: { icsEnabled: boolean; pdfEnabled: boolean };
      };
    };
    documentationRules: {
      noteRequiredFields: Array<"participationLevel" | "moodAffect" | "cuesRequired" | "response" | "followUp">;
      minNarrativeLen: number;
      requireGoalLinkForOneToOne: boolean;
      onlyAllowTemplateNotes: boolean;
      lockNotesAfterDays: "OFF" | 3 | 7 | 14 | 30;
      signature: { required: boolean; supervisorCosign: boolean };
      autoAddStandardLine: { enabled: boolean; text: string };
      terminologyWarnings: { enabled: boolean };
      attachments: { allowPhotos: boolean; allowPDFs: boolean; maxSizeMB: number };
      lateEntryMode: { enabled: boolean; requireReason: boolean };
      retentionYears: number;
    };
    carePlanRules: {
      reviewCadenceDays: number;
      requirePersonalization: boolean;
      blockReviewCompletionIfGeneric: boolean;
      interventionsLibraryEnabled: boolean;
      defaultInterventions: string[];
      goalMappingEnabled: boolean;
      defaultFrequencies: { groupDefault: string; oneToOneDefault: string };
      autoSuggestByTagsEnabled: boolean;
      reviewReminders: { enabled: boolean; days: 30 | 60 | 90 };
      export: { pdfEnabled: boolean; includeSignatureLine: boolean };
    };
    reportSettings: {
      theme: "CLASSIC" | "CLEAN" | "LIQUID_GLASS";
      accent: "BLUE" | "MINT" | "CORAL";
      includeSections: Record<string, boolean>;
      types: Record<string, boolean>;
      defaultDateRange: "THIS_MONTH" | "LAST_MONTH" | "ROLLING_30";
      defaultUnitFilter: string[];
      scoring: { enabled: boolean; weights: { low: number; moderate: number; high: number } };
      pdf: { includeLogo: boolean; headerStyle: "GLASS" | "CLEAN" | "CLASSIC"; includeCharts: boolean };
      autoGenerate: { enabled: boolean; dayOfMonth: number };
      exportFormats: { pdf: boolean; csv: boolean };
    };
    printDefaults: {
      paperSize: "LETTER" | "A4";
      margins: "NORMAL" | "NARROW" | "WIDE";
      includeFooterMeta: boolean;
    };
    inventoryDefaults: {
      enabled: boolean;
      categories: string[];
      parLevels: { enabled: boolean };
      lowStockAlerts: { enabled: boolean; thresholdMode: "BELOW_PAR" | "CUSTOM" };
      vendors: Array<{ name: string; link: string; notes: string }>;
      checkoutLog: { enabled: boolean };
      budgetTracking: { enabled: boolean; monthlyBudget: number };
      barcodeMode: { enabled: boolean };
      reorderThresholdMultiplier: number;
      showLowStockBanner: boolean;
    };
    prizeCartDefaults: {
      presets: Array<{ category: string; defaultPriceCents: number; reorderAt: number }>;
      enableRestockSuggestions: boolean;
      restockAggressiveness: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
    };
    notificationDefaults: {
      channels: { inApp: boolean; email: boolean; push: boolean };
      digest: { mode: "OFF" | "DAILY" | "WEEKLY"; time: string };
      triggers: Record<string, boolean>;
      quietHours: { enabled: boolean; start: string; end: string };
      escalation: { enabled: boolean; minutesAfterDue: number; notifyRole: Role };
    };
    compliance: {
      hipaaMode: { enabled: boolean; autoLogoutMinutes: 5 | 10 | 15 | 30; maskPHIInExports: boolean };
      accessLogs: { enabled: boolean };
      exportRestrictions: { onlyAdminsCanExport: boolean };
      security: { requireMFAForAdmins: boolean; deviceTrustEnabled: boolean };
      dataRetention: { years: number };
      incidentNotes: { enabled: boolean };
      auditRetentionDays: number;
      exportRetentionDays: number;
      hideTriggersInPrint: boolean;
      maskFamilyContactInPrint: boolean;
    };
    permissions: RolePermissionMatrix;
    roleSettings: {
      enabled: boolean;
      roleTemplatesSeeded: boolean;
      list: Array<{
        name: string;
        description: string;
        scope: "WHOLE_BUILDING" | "ASSIGNED_UNITS";
        assignedUnits: string[];
        permissions: Record<string, boolean>;
      }>;
      notesRequireSupervisorApproval: boolean;
      autoRoleForNewUsers: Role;
      auditTrailEnabled: boolean;
    };
  };
  userSettings: {
    defaultLanding: DefaultLanding;
    reduceMotion: boolean;
    highContrast: boolean;
    fontScale: FontScale;
    myQuickPhrases: string[];
    shortcutsEnabled: boolean;
    personal: {
      profile: { displayName: string; title: string; initials: string };
      defaults: { mood: string; cues: string; followUpText: string };
      dashboard: { widgets: string[] };
      accessibility: { fontSize: "SM" | "MD" | "LG" | "XL"; highContrast: boolean; reduceMotion: boolean };
      shortcuts: Array<{ slashCommand: string; expansionText: string }>;
      notifications: { overrides: Record<string, boolean> };
    };
  };
};

function GlassSectionHeader({
  title,
  description,
  icon: Icon
}: {
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <CardTitle className="text-base font-[var(--font-display)] text-foreground">{title}</CardTitle>
        <p className="mt-1 text-sm text-foreground/70">{description}</p>
      </div>
      {Icon ? (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-actifyBlue/15 text-actifyBlue">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}

function GlassToggleRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 rounded-xl border border-white/70 bg-white/65 p-3", disabled && "opacity-70")}>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? <p className="text-xs text-foreground/70">{description}</p> : null}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function FormFooter({
  isPending,
  onReset,
  savedAt,
  saveLabel = "Save changes",
  readOnly = false
}: {
  isPending: boolean;
  onReset: () => void;
  savedAt: string | null;
  saveLabel?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/85 px-3 py-2.5">
      <div className="text-xs text-foreground/70">
        {readOnly
          ? "Read-only access for this section."
          : savedAt
            ? `Saved ${savedAt}`
            : "Changes are saved only when you click Save."}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onReset} disabled={isPending || readOnly}>
          Reset
        </Button>
        <GlassButton type="submit" disabled={isPending || readOnly}>
          {isPending ? "Saving..." : saveLabel}
        </GlassButton>
      </div>
    </div>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="mb-3 rounded-xl border border-amber-300/60 bg-amber-100/70 px-3 py-2 text-xs text-amber-900">
      You can view this section, but you do not have permission to edit it.
    </div>
  );
}

function formatSavedAt(nowIso: string) {
  const date = new Date(nowIso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function updateStringList(list: string[], index: number, value: string) {
  const next = [...list];
  next[index] = value;
  return next;
}

function removeAt<T>(list: T[], index: number) {
  return list.filter((_, idx) => idx !== index);
}

function appendItem<T>(list: T[], item: T) {
  return [...list, item];
}

function StringRepeater({
  label,
  values,
  placeholder,
  onChange
}: {
  label: string;
  values: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {values.map((item, index) => (
        <div key={`${label}-${index}`} className="flex items-center gap-2">
          <Input value={item} placeholder={placeholder} onChange={(event) => onChange(updateStringList(values, index, event.target.value))} />
          <Button type="button" variant="outline" onClick={() => onChange(removeAt(values, index))}>Remove</Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange(appendItem(values, ""))}>Add</Button>
    </div>
  );
}

export function SettingsTabs({
  initialTab,
  role,
  facilityName,
  facilityTimezone,
  users,
  units,
  auditEntries,
  facilitySettings,
  userSettings
}: SettingsTabsProps) {
  const { toast } = useToast();
  const isAdmin = role === Role.ADMIN;
  const canEditByTab: Record<SettingsTabKey, boolean> = {
    facility: role === Role.ADMIN || role === Role.AD,
    roles: role === Role.ADMIN,
    modules: role === Role.ADMIN,
    calendar: role === Role.ADMIN || role === Role.AD,
    docs: role === Role.ADMIN,
    careplan: role === Role.ADMIN || role === Role.AD,
    reports: role === Role.ADMIN || role === Role.AD,
    inventory: role === Role.ADMIN || role === Role.AD,
    notifications: role === Role.ADMIN || role === Role.AD,
    compliance: role === Role.ADMIN,
    personal: role !== Role.READ_ONLY
  };

  const availableTabs = useMemo(
    () => settingsTabs.filter((tab) => (tab.adminOnly ? isAdmin : true)),
    [isAdmin]
  );

  const fallbackTab = availableTabs[0]?.value ?? "facility";
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(availableTabs.some((tab) => tab.value === initialTab) ? initialTab : fallbackTab);

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.value === activeTab)) {
      setActiveTab(fallbackTab);
    }
  }, [availableTabs, activeTab, fallbackTab]);

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.value === initialTab)) {
      return;
    }
    setActiveTab(initialTab);
  }, [initialTab, availableTabs]);

  const facilityForm = useForm<z.infer<typeof facilityTabSchema>>({
    resolver: zodResolver(facilityTabSchema),
    defaultValues: {
      facility: {
        name: facilityName,
        dba: facilitySettings.facilityProfile.dba,
        address: facilitySettings.facilityProfile.address,
        timezone: facilitySettings.timezone || facilityTimezone,
        type: facilitySettings.facilityProfile.type,
        units: facilitySettings.facilityProfile.units,
        roomNumberFormat: facilitySettings.facilityProfile.roomNumberFormat,
        roomFormatRule: facilitySettings.roomFormatRule,
        roomFormatHint: facilitySettings.roomFormatHint,
        activitySpaces: facilitySettings.facilityProfile.activitySpaces,
        businessHours: facilitySettings.businessHours,
        reportMonthMode: facilitySettings.facilityProfile.reportMonthMode,
        branding: facilitySettings.facilityProfile.branding,
        directoryContacts: facilitySettings.facilityProfile.directoryContacts,
        residentStatusLabels: facilitySettings.facilityProfile.residentStatusLabels,
        smoking: facilitySettings.facilityProfile.smoking
      },
      policyFlags: {
        hideTriggersInPrint: facilitySettings.policyFlags.hideTriggersInPrint,
        maskSensitiveFieldsInPrint: facilitySettings.policyFlags.maskSensitiveFieldsInPrint,
        maskFamilyContactInPrint: facilitySettings.policyFlags.maskFamilyContactInPrint
      }
    }
  });

  const rolesForm = useForm<z.infer<typeof rolesTabSchema>>({
    resolver: zodResolver(rolesTabSchema),
    defaultValues: {
      roles: facilitySettings.roleSettings,
      permissionsJson: facilitySettings.permissions
    }
  });
  const [userSearch, setUserSearch] = useState("");
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<string, Role>>(
    users.reduce<Record<string, Role>>((acc, user) => {
      acc[user.id] = user.role;
      return acc;
    }, {})
  );
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const modulesForm = useForm<z.infer<typeof modulesTabSchema>>({
    resolver: zodResolver(modulesTabSchema),
    defaultValues: {
      mode: facilitySettings.moduleFlags.mode,
      modules: facilitySettings.moduleFlags.modules as z.infer<typeof modulesTabSchema>["modules"],
      widgets: facilitySettings.moduleFlags.widgets as z.infer<typeof modulesTabSchema>["widgets"]
    }
  });

  const calendarForm = useForm<z.infer<typeof calendarTabSchema>>({
    resolver: zodResolver(calendarTabSchema),
    defaultValues: {
      calendar: {
        ...facilitySettings.attendanceRules.calendarSettings,
        setupBufferMinutes: String(facilitySettings.attendanceRules.calendarSettings.setupBufferMinutes) as "0" | "5" | "10" | "15" | "30"
      },
      defaults: {
        groupMinutes: facilitySettings.attendanceRules.groupMinutes,
        oneToOneMinutes: facilitySettings.attendanceRules.oneToOneMinutes,
        locations: facilitySettings.attendanceRules.locations,
        warnTherapyOverlap: facilitySettings.attendanceRules.warnTherapyOverlap,
        warnOutsideBusinessHours: facilitySettings.attendanceRules.warnOutsideBusinessHours,
        useBusinessHoursDefaults: facilitySettings.attendanceRules.useBusinessHoursDefaults
      }
    }
  });

  const docsForm = useForm<z.infer<typeof docsTabSchema>>({
    resolver: zodResolver(docsTabSchema),
    defaultValues: {
      scoring: {
        presentWeight: facilitySettings.attendanceRules.engagementWeights.present,
        activeWeight: facilitySettings.attendanceRules.engagementWeights.active,
        leadingWeight: facilitySettings.attendanceRules.engagementWeights.leading,
        requireNoteForBarriers: facilitySettings.attendanceRules.requireBarrierNoteFor,
        minNarrativeLen: facilitySettings.documentationRules.minNarrativeLen,
        requireGoalLinkForOneToOne: facilitySettings.documentationRules.requireGoalLinkForOneToOne
      },
      docs: {
        requiredFields: {
          mood: facilitySettings.documentationRules.noteRequiredFields.includes("moodAffect"),
          participationLevel: facilitySettings.documentationRules.noteRequiredFields.includes("participationLevel"),
          cues: facilitySettings.documentationRules.noteRequiredFields.includes("cuesRequired"),
          responseType: facilitySettings.documentationRules.noteRequiredFields.includes("response"),
          followUp: facilitySettings.documentationRules.noteRequiredFields.includes("followUp")
        },
        onlyAllowTemplateNotes: facilitySettings.documentationRules.onlyAllowTemplateNotes,
        lockNotesAfterDays:
          facilitySettings.documentationRules.lockNotesAfterDays === "OFF"
            ? "OFF"
            : String(facilitySettings.documentationRules.lockNotesAfterDays) as "OFF" | "3" | "7" | "14" | "30",
        signature: facilitySettings.documentationRules.signature,
        autoAddStandardLine: facilitySettings.documentationRules.autoAddStandardLine,
        terminologyWarnings: facilitySettings.documentationRules.terminologyWarnings,
        attachments: facilitySettings.documentationRules.attachments,
        lateEntryMode: facilitySettings.documentationRules.lateEntryMode,
        retentionYears: facilitySettings.documentationRules.retentionYears
      }
    }
  });

  const cadencePresetValue =
    facilitySettings.carePlanRules.reviewCadenceDays === 30 ||
    facilitySettings.carePlanRules.reviewCadenceDays === 60 ||
    facilitySettings.carePlanRules.reviewCadenceDays === 90
      ? String(facilitySettings.carePlanRules.reviewCadenceDays)
      : "CUSTOM";

  const carePlanForm = useForm<z.infer<typeof carePlanTabSchema>>({
    resolver: zodResolver(carePlanTabSchema),
    defaultValues: {
      carePlan: {
        reviewCadence: {
          preset: cadencePresetValue as "30" | "60" | "90" | "CUSTOM",
          customDays: cadencePresetValue === "CUSTOM" ? facilitySettings.carePlanRules.reviewCadenceDays : undefined
        },
        requirePersonalization: facilitySettings.carePlanRules.requirePersonalization,
        blockReviewCompletionIfGeneric: facilitySettings.carePlanRules.blockReviewCompletionIfGeneric,
        interventionsLibraryEnabled: facilitySettings.carePlanRules.interventionsLibraryEnabled,
        defaultInterventions: facilitySettings.carePlanRules.defaultInterventions,
        goalMappingEnabled: facilitySettings.carePlanRules.goalMappingEnabled,
        defaultFrequencies: facilitySettings.carePlanRules.defaultFrequencies,
        autoSuggestByTagsEnabled: facilitySettings.carePlanRules.autoSuggestByTagsEnabled,
        reviewReminders: {
          enabled: facilitySettings.carePlanRules.reviewReminders.enabled,
          days: String(facilitySettings.carePlanRules.reviewReminders.days) as "30" | "60" | "90"
        },
        export: facilitySettings.carePlanRules.export
      }
    }
  });

  const reportsForm = useForm<z.infer<typeof reportsTabSchema>>({
    resolver: zodResolver(reportsTabSchema),
    defaultValues: {
      reports: {
        ...facilitySettings.reportSettings,
        pdf: {
          ...facilitySettings.reportSettings.pdf,
          headerStyle: facilitySettings.reportSettings.pdf.headerStyle as "CLASSIC" | "CLEAN" | "LIQUID_GLASS" | "GLASS"
        }
      },
      printDefaults: facilitySettings.printDefaults
    }
  });

  const inventoryForm = useForm<z.infer<typeof inventoryTabSchema>>({
    resolver: zodResolver(inventoryTabSchema),
    defaultValues: {
      inventory: facilitySettings.inventoryDefaults,
      prizeCart: facilitySettings.prizeCartDefaults
    }
  });

  const notificationsForm = useForm<z.infer<typeof notificationsTabSchema>>({
    resolver: zodResolver(notificationsTabSchema),
    defaultValues: {
      notifications: facilitySettings.notificationDefaults
    }
  });

  const complianceForm = useForm<z.infer<typeof complianceTabSchema>>({
    resolver: zodResolver(complianceTabSchema),
    defaultValues: {
      compliance: {
        ...facilitySettings.compliance,
        hipaaMode: {
          ...facilitySettings.compliance.hipaaMode,
          autoLogoutMinutes: String(facilitySettings.compliance.hipaaMode.autoLogoutMinutes) as "5" | "10" | "15" | "30"
        }
      }
    }
  });

  const personalForm = useForm<z.infer<typeof personalTabSchema>>({
    resolver: zodResolver(personalTabSchema),
    defaultValues: {
      personal: userSettings.personal,
      account: {
        defaultLanding: userSettings.defaultLanding,
        reduceMotion: userSettings.reduceMotion,
        highContrast: userSettings.highContrast,
        fontScale: userSettings.fontScale,
        quickPhrases: userSettings.myQuickPhrases,
        shortcutsEnabled: userSettings.shortcutsEnabled
      }
    }
  });

  const [savingByTab, setSavingByTab] = useState<Record<SettingsTabKey, boolean>>({
    facility: false,
    roles: false,
    modules: false,
    calendar: false,
    docs: false,
    careplan: false,
    reports: false,
    inventory: false,
    notifications: false,
    compliance: false,
    personal: false
  });
  const [savedAtByTab, setSavedAtByTab] = useState<Partial<Record<SettingsTabKey, string>>>({});

  const setTabSaving = useCallback((tab: SettingsTabKey, value: boolean) => {
    setSavingByTab((prev) => (prev[tab] === value ? prev : { ...prev, [tab]: value }));
  }, []);

  const markTabSaved = useCallback((tab: SettingsTabKey, isoTimestamp: string) => {
    setSavedAtByTab((prev) => ({ ...prev, [tab]: formatSavedAt(isoTimestamp) }));
  }, []);

  const facilityPending = savingByTab.facility;
  const rolesPending = savingByTab.roles;
  const modulesPending = savingByTab.modules;
  const calendarPending = savingByTab.calendar;
  const docsPending = savingByTab.docs;
  const carePlanPending = savingByTab.careplan;
  const reportsPending = savingByTab.reports;
  const inventoryPending = savingByTab.inventory;
  const notificationsPending = savingByTab.notifications;
  const compliancePending = savingByTab.compliance;
  const personalPending = savingByTab.personal;

  const facilitySavedAt = savedAtByTab.facility ?? null;
  const rolesSavedAt = savedAtByTab.roles ?? null;
  const modulesSavedAt = savedAtByTab.modules ?? null;
  const calendarSavedAt = savedAtByTab.calendar ?? null;
  const docsSavedAt = savedAtByTab.docs ?? null;
  const carePlanSavedAt = savedAtByTab.careplan ?? null;
  const reportsSavedAt = savedAtByTab.reports ?? null;
  const inventorySavedAt = savedAtByTab.inventory ?? null;
  const notificationsSavedAt = savedAtByTab.notifications ?? null;
  const complianceSavedAt = savedAtByTab.compliance ?? null;
  const personalSavedAt = savedAtByTab.personal ?? null;

  const dirtyByTab = useMemo<Record<SettingsTabKey, boolean>>(
    () => ({
      facility: facilityForm.formState.isDirty,
      roles: rolesForm.formState.isDirty,
      modules: modulesForm.formState.isDirty,
      calendar: calendarForm.formState.isDirty,
      docs: docsForm.formState.isDirty,
      careplan: carePlanForm.formState.isDirty,
      reports: reportsForm.formState.isDirty,
      inventory: inventoryForm.formState.isDirty,
      notifications: notificationsForm.formState.isDirty,
      compliance: complianceForm.formState.isDirty,
      personal: personalForm.formState.isDirty
    }),
    [
      facilityForm.formState.isDirty,
      rolesForm.formState.isDirty,
      modulesForm.formState.isDirty,
      calendarForm.formState.isDirty,
      docsForm.formState.isDirty,
      carePlanForm.formState.isDirty,
      reportsForm.formState.isDirty,
      inventoryForm.formState.isDirty,
      notificationsForm.formState.isDirty,
      complianceForm.formState.isDirty,
      personalForm.formState.isDirty
    ]
  );
  const hasAnyDirty = useMemo(() => Object.values(dirtyByTab).some(Boolean), [dirtyByTab]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasAnyDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [hasAnyDirty]);

  const onTabChange = useCallback(
    (nextTab: string) => {
      const next = nextTab as SettingsTabKey;
      if (next !== activeTab && dirtyByTab[activeTab]) {
        const proceed = window.confirm("You have unsaved changes in this tab. Leave without saving?");
        if (!proceed) return;
      }

      setActiveTab(next);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", next);
        const target = `${url.pathname}?${url.searchParams.toString()}`;
        window.history.replaceState(window.history.state, "", target);
      }
    },
    [activeTab, dirtyByTab]
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q));
  }, [userSearch, users]);

  async function saveUserRole(userId: string) {
    setUpdatingUserId(userId);
    try {
      await updateUserRole({
        userId,
        role: userRoleDrafts[userId]
      });
      toast({ title: "User role updated" });
    } catch (error) {
      toast({
        title: "Failed to update role",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingUserId(null);
    }
  }

  const queueFacilitySectionSave = useCallback(
    async <TValues,>({
      tab,
      values,
      successTitle,
      errorTitle,
      onSuccessReset
    }: {
      tab: FacilitySectionKey;
      values: TValues;
      successTitle: string;
      errorTitle: string;
      onSuccessReset: () => void;
    }) => {
      setTabSaving(tab, true);
      markTabSaved(tab, new Date().toISOString());

      try {
        await saveQueue.enqueue(
          `settings:facility:${tab}`,
          values,
          async (latestValues) => {
            const result = await upsertFacilitySettings({ section: tab, values: latestValues });
            markTabSaved(tab, result.updatedAt);
          },
          350
        );
        onSuccessReset();
        toast({ title: successTitle });
      } catch (error) {
        toast({
          title: errorTitle,
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      } finally {
        setTabSaving(tab, false);
      }
    },
    [markTabSaved, setTabSaving, toast]
  );

  const queuePersonalSave = useCallback(
    async <TValues,>({
      values,
      onSuccessReset
    }: {
      values: TValues;
      onSuccessReset: () => void;
    }) => {
      setTabSaving("personal", true);
      markTabSaved("personal", new Date().toISOString());

      try {
        await saveQueue.enqueue(
          "settings:personal",
          values,
          async (latestValues) => {
            const result = await upsertUserSettings({ values: latestValues });
            markTabSaved("personal", result.updatedAt);
          },
          350
        );
        onSuccessReset();
        toast({ title: "Personal settings saved" });
      } catch (error) {
        toast({
          title: "Failed to save personal settings",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      } finally {
        setTabSaving("personal", false);
      }
    },
    [markTabSaved, setTabSaving, toast]
  );

  const onSubmitFacility = facilityForm.handleSubmit((values) => {
    void queueFacilitySectionSave({
      tab: "facility",
      values,
      successTitle: "Facility settings saved",
      errorTitle: "Failed to save facility settings",
      onSuccessReset: () => facilityForm.reset(values)
    });
  });

  const onSubmitRoles = rolesForm.handleSubmit((values) => {
    void queueFacilitySectionSave({
      tab: "roles",
      values,
      successTitle: "Role settings saved",
      errorTitle: "Failed to save role settings",
      onSuccessReset: () => rolesForm.reset(values)
    });
  });

  const onSubmitModules = modulesForm.handleSubmit((values) => {
    void queueFacilitySectionSave({
      tab: "modules",
      values,
      successTitle: "Module settings saved",
      errorTitle: "Failed to save module settings",
      onSuccessReset: () => modulesForm.reset(values)
    });
  });

  const onSubmitCalendar = calendarForm.handleSubmit((values) => {
    void queueFacilitySectionSave({
      tab: "calendar",
      values,
      successTitle: "Calendar settings saved",
      errorTitle: "Failed to save calendar settings",
      onSuccessReset: () => calendarForm.reset(values)
    });
  });

  const onSubmitDocs = docsForm.handleSubmit((values) => {
    void queueFacilitySectionSave({
      tab: "docs",
      values,
      successTitle: "Docs rules saved",
      errorTitle: "Failed to save docs rules",
      onSuccessReset: () => docsForm.reset(values)
    });
  });

  const onSubmitCarePlan = carePlanForm.handleSubmit((values) => {
    void queueFacilitySectionSave({
      tab: "careplan",
      values,
      successTitle: "Care plan settings saved",
      errorTitle: "Failed to save care plan settings",
      onSuccessReset: () => carePlanForm.reset(values)
    });
  });

  const onSubmitReports = reportsForm.handleSubmit((values) => {
    void queueFacilitySectionSave({
      tab: "reports",
      values,
      successTitle: "Report settings saved",
      errorTitle: "Failed to save report settings",
      onSuccessReset: () => reportsForm.reset(values)
    });
  });

  const onSubmitInventory = inventoryForm.handleSubmit((values) => {
    void queueFacilitySectionSave({
      tab: "inventory",
      values,
      successTitle: "Inventory settings saved",
      errorTitle: "Failed to save inventory settings",
      onSuccessReset: () => inventoryForm.reset(values)
    });
  });

  const onSubmitNotifications = notificationsForm.handleSubmit((values) => {
    void queueFacilitySectionSave({
      tab: "notifications",
      values,
      successTitle: "Notification settings saved",
      errorTitle: "Failed to save notification settings",
      onSuccessReset: () => notificationsForm.reset(values)
    });
  });

  const onSubmitCompliance = complianceForm.handleSubmit((values) => {
    void queueFacilitySectionSave({
      tab: "compliance",
      values,
      successTitle: "Compliance settings saved",
      errorTitle: "Failed to save compliance settings",
      onSuccessReset: () => complianceForm.reset(values)
    });
  });

  const onSubmitPersonal = personalForm.handleSubmit((values) => {
    void queuePersonalSave({
      values,
      onSuccessReset: () => personalForm.reset(values)
    });
  });

  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="relative !p-0 overflow-hidden">
        <div className="h-1.5 bg-actify-brand" />
        <div className="space-y-3 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">Settings</h1>
              <p className="text-sm text-foreground/75">Facility defaults, documentation rules, and your preferences.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-white/80">{facilityForm.watch("facility.name") || facilityName}</Badge>
                <Badge variant="outline" className="bg-white/80">Role: {roleLabels[role]}</Badge>
              </div>
            </div>
            <GlassButton asChild variant="dense" size="sm">
              <Link href="/app/billing" className="inline-flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" />
                Open Billing
              </Link>
            </GlassButton>
          </div>
        </div>
      </GlassPanel>

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <TabsList className="h-auto w-full flex-col items-stretch gap-2 rounded-xl border border-white/70 bg-white/70 p-2">
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="justify-start rounded-lg px-3 py-2 data-[state=active]:bg-actify-brand data-[state=active]:text-white">
                    <Icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </aside>

          <div className="space-y-4">
            <div className="lg:hidden">
              <Select value={activeTab} onValueChange={onTabChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableTabs.map((tab) => (
                    <SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="facility" forceMount hidden={activeTab !== "facility"}>
              <form onSubmit={onSubmitFacility} className="space-y-4">
                {!canEditByTab.facility ? <ReadOnlyNotice /> : null}
                <fieldset disabled={!canEditByTab.facility} className="space-y-4">
                <GlassCard>
                  <GlassSectionHeader title="Facility Identity" description="Core facility details and branding defaults." icon={Building2} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm">Facility Name<Input className="mt-1" {...facilityForm.register("facility.name")} /></label>
                    <label className="text-sm">DBA<Input className="mt-1" {...facilityForm.register("facility.dba")} /></label>
                    <label className="text-sm">Address Line 1<Input className="mt-1" {...facilityForm.register("facility.address.line1")} /></label>
                    <label className="text-sm">Address Line 2<Input className="mt-1" {...facilityForm.register("facility.address.line2")} /></label>
                    <label className="text-sm">City<Input className="mt-1" {...facilityForm.register("facility.address.city")} /></label>
                    <label className="text-sm">
                      State
                      <Select value={facilityForm.watch("facility.address.state")} onValueChange={(value) => facilityForm.setValue("facility.address.state", value, { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {stateOptions.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">Zip<Input className="mt-1" {...facilityForm.register("facility.address.zip")} /></label>
                    <label className="text-sm">Timezone<Input className="mt-1" {...facilityForm.register("facility.timezone")} /></label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="text-sm">
                      Facility Type
                      <Select value={facilityForm.watch("facility.type")} onValueChange={(value) => facilityForm.setValue("facility.type", value as "SNF" | "AssistedLiving" | "MemoryCare" | "Rehab", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SNF">SNF</SelectItem>
                          <SelectItem value="AssistedLiving">Assisted Living</SelectItem>
                          <SelectItem value="MemoryCare">Memory Care</SelectItem>
                          <SelectItem value="Rehab">Rehab</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">
                      Report Month Mode
                      <Select value={facilityForm.watch("facility.reportMonthMode")} onValueChange={(value) => facilityForm.setValue("facility.reportMonthMode", value as "CALENDAR_MONTH" | "ROLLING_30", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CALENDAR_MONTH">Calendar Month</SelectItem>
                          <SelectItem value="ROLLING_30">Rolling 30</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">Logo URL<Input className="mt-1" {...facilityForm.register("facility.branding.logoUrl")} /></label>
                    <label className="text-sm">Accent Color<Input className="mt-1" {...facilityForm.register("facility.branding.accentColor")} /></label>
                    <label className="text-sm">Gradient Preset<Input className="mt-1" {...facilityForm.register("facility.branding.gradientPreset")} /></label>
                  </div>
                </GlassCard>

                <GlassCard>
                  <GlassSectionHeader title="Units, Rooms, and Spaces" description="Define unit labels and activity spaces used across scheduling." icon={SlidersHorizontal} />
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="text-sm">
                      Room Number Format
                      <Select value={facilityForm.watch("facility.roomNumberFormat")} onValueChange={(value) => facilityForm.setValue("facility.roomNumberFormat", value as "ALPHA_NUM" | "NUMERIC" | "CUSTOM", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALPHA_NUM">ALPHA_NUM</SelectItem>
                          <SelectItem value="NUMERIC">NUMERIC</SelectItem>
                          <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">
                      Room Format Rule
                      <Select value={facilityForm.watch("facility.roomFormatRule")} onValueChange={(value) => facilityForm.setValue("facility.roomFormatRule", value as RoomFormatRule, { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A_B">A_B</SelectItem>
                          <SelectItem value="NUM">NUM</SelectItem>
                          <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">Room Format Hint<Input className="mt-1" {...facilityForm.register("facility.roomFormatHint")} /></label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="text-sm">Business Hours Start<Input className="mt-1" type="time" {...facilityForm.register("facility.businessHours.start")} /></label>
                    <label className="text-sm">Business Hours End<Input className="mt-1" type="time" {...facilityForm.register("facility.businessHours.end")} /></label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const selected = facilityForm.watch("facility.businessHours.days");
                      const checked = selected.includes(day);
                      return (
                        <label key={day} className="inline-flex items-center gap-2 rounded-lg border border-white/70 bg-white/70 px-3 py-1.5 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              const current = facilityForm.getValues("facility.businessHours.days");
                              const values = next
                                ? Array.from(new Set([...current, day])).sort((a, b) => a - b)
                                : current.filter((item) => item !== day);
                              facilityForm.setValue("facility.businessHours.days", values, { shouldValidate: true });
                            }}
                          />
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <StringRepeater
                      label="Units"
                      values={facilityForm.watch("facility.units")}
                      placeholder="West Hall"
                      onChange={(next) => facilityForm.setValue("facility.units", next, { shouldValidate: true })}
                    />
                    <StringRepeater
                      label="Resident Status Labels"
                      values={facilityForm.watch("facility.residentStatusLabels")}
                      placeholder="Active"
                      onChange={(next) => facilityForm.setValue("facility.residentStatusLabels", next, { shouldValidate: true })}
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Activity Spaces</p>
                    {facilityForm.watch("facility.activitySpaces").map((space, index) => (
                      <div key={`activity-space-${index}`} className="grid gap-2 rounded-lg border border-white/70 bg-white/70 p-3 md:grid-cols-[1fr_1fr_auto]">
                        <Input
                          placeholder="Main Lounge"
                          value={space.name}
                          onChange={(event) => {
                            const current = facilityForm.getValues("facility.activitySpaces");
                            current[index] = { ...current[index], name: event.target.value };
                            facilityForm.setValue("facility.activitySpaces", [...current], { shouldValidate: true });
                          }}
                        />
                        <Input
                          placeholder="Optional notes"
                          value={space.notes}
                          onChange={(event) => {
                            const current = facilityForm.getValues("facility.activitySpaces");
                            current[index] = { ...current[index], notes: event.target.value };
                            facilityForm.setValue("facility.activitySpaces", [...current], { shouldValidate: true });
                          }}
                        />
                        <Button type="button" variant="outline" onClick={() => facilityForm.setValue("facility.activitySpaces", removeAt(facilityForm.getValues("facility.activitySpaces"), index), { shouldValidate: true })}>Remove</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => facilityForm.setValue("facility.activitySpaces", appendItem(facilityForm.getValues("facility.activitySpaces"), { name: "", notes: "" }), { shouldValidate: true })}>Add Space</Button>
                  </div>
                </GlassCard>

                <GlassCard>
                  <GlassSectionHeader title="Directory Contacts and Smoking Policy" description="SNF-friendly operational controls and contacts." icon={ShieldCheck} />
                  <div className="space-y-3">
                    {facilityForm.watch("facility.directoryContacts").map((contact, index) => (
                      <div key={`contact-${index}`} className="grid gap-2 rounded-lg border border-white/70 bg-white/70 p-3 md:grid-cols-4">
                        <Input value={contact.role} placeholder="Role" onChange={(event) => {
                          const current = facilityForm.getValues("facility.directoryContacts");
                          current[index] = { ...current[index], role: event.target.value };
                          facilityForm.setValue("facility.directoryContacts", [...current], { shouldValidate: true });
                        }} />
                        <Input value={contact.name} placeholder="Name" onChange={(event) => {
                          const current = facilityForm.getValues("facility.directoryContacts");
                          current[index] = { ...current[index], name: event.target.value };
                          facilityForm.setValue("facility.directoryContacts", [...current], { shouldValidate: true });
                        }} />
                        <Input value={contact.phone} placeholder="Phone" onChange={(event) => {
                          const current = facilityForm.getValues("facility.directoryContacts");
                          current[index] = { ...current[index], phone: event.target.value };
                          facilityForm.setValue("facility.directoryContacts", [...current], { shouldValidate: true });
                        }} />
                        <div className="flex gap-2">
                          <Input value={contact.email} placeholder="Email" onChange={(event) => {
                            const current = facilityForm.getValues("facility.directoryContacts");
                            current[index] = { ...current[index], email: event.target.value };
                            facilityForm.setValue("facility.directoryContacts", [...current], { shouldValidate: true });
                          }} />
                          <Button type="button" variant="outline" onClick={() => facilityForm.setValue("facility.directoryContacts", removeAt(facilityForm.getValues("facility.directoryContacts"), index), { shouldValidate: true })}>Remove</Button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => facilityForm.setValue("facility.directoryContacts", appendItem(facilityForm.getValues("facility.directoryContacts"), { role: "", name: "", phone: "", email: "" }), { shouldValidate: true })}>Add Contact</Button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <GlassToggleRow
                      label="Smoking enabled"
                      checked={facilityForm.watch("facility.smoking.enabled")}
                      onCheckedChange={(value) => facilityForm.setValue("facility.smoking.enabled", value, { shouldValidate: true })}
                    />
                    <label className="text-sm">Smoking Activity Label<Input className="mt-1" {...facilityForm.register("facility.smoking.activityLabel")} /></label>
                    <StringRepeater
                      label="Scheduled Smoking Times"
                      values={facilityForm.watch("facility.smoking.scheduledTimes")}
                      placeholder="13:30"
                      onChange={(next) => facilityForm.setValue("facility.smoking.scheduledTimes", next, { shouldValidate: true })}
                    />
                    <GlassToggleRow
                      label="Staff escort required"
                      checked={facilityForm.watch("facility.smoking.staffEscortRequired")}
                      onCheckedChange={(value) => facilityForm.setValue("facility.smoking.staffEscortRequired", value, { shouldValidate: true })}
                    />
                    <GlassToggleRow
                      label="Counts as activity"
                      checked={facilityForm.watch("facility.smoking.countsAsActivity")}
                      onCheckedChange={(value) => facilityForm.setValue("facility.smoking.countsAsActivity", value, { shouldValidate: true })}
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    <GlassToggleRow
                      label="Hide triggers in print"
                      checked={facilityForm.watch("policyFlags.hideTriggersInPrint")}
                      onCheckedChange={(value) => facilityForm.setValue("policyFlags.hideTriggersInPrint", value, { shouldValidate: true })}
                    />
                    <GlassToggleRow
                      label="Mask sensitive fields in print"
                      checked={facilityForm.watch("policyFlags.maskSensitiveFieldsInPrint")}
                      onCheckedChange={(value) => facilityForm.setValue("policyFlags.maskSensitiveFieldsInPrint", value, { shouldValidate: true })}
                    />
                    <GlassToggleRow
                      label="Mask family contact in print"
                      checked={facilityForm.watch("policyFlags.maskFamilyContactInPrint")}
                      onCheckedChange={(value) => facilityForm.setValue("policyFlags.maskFamilyContactInPrint", value, { shouldValidate: true })}
                    />
                  </div>
                </GlassCard>
                <FormFooter isPending={facilityPending} onReset={() => facilityForm.reset()} savedAt={facilitySavedAt} readOnly={!canEditByTab.facility} />
                </fieldset>
              </form>
            </TabsContent>

            <TabsContent value="roles" forceMount hidden={activeTab !== "roles"}>
              {!isAdmin ? (
                <GlassCard>
                  <GlassSectionHeader title="Admin only" description="Only admins can manage roles and permissions." icon={ShieldCheck} />
                </GlassCard>
              ) : (
                <form onSubmit={onSubmitRoles} className="space-y-4">
                  {!canEditByTab.roles ? <ReadOnlyNotice /> : null}
                  <fieldset disabled={!canEditByTab.roles} className="space-y-4">
                  <GlassCard>
                    <GlassSectionHeader title="Role Matrix" description="Configure role permissions for each access level." icon={ShieldCheck} />
                    <div className="overflow-x-auto rounded-xl border border-white/70 bg-white/70">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Permission</TableHead>
                            <TableHead>ADMIN</TableHead>
                            <TableHead>AD</TableHead>
                            <TableHead>ASSISTANT</TableHead>
                            <TableHead>READ_ONLY</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settingsPermissionKeys.map((permissionKey) => (
                            <TableRow key={permissionKey}>
                              <TableCell className="font-medium">{sectionLabels[permissionKey]}</TableCell>
                              {(["ADMIN", "AD", "ASSISTANT", "READ_ONLY"] as const).map((roleKey) => (
                                <TableCell key={roleKey}>
                                  <Checkbox
                                    checked={rolesForm.watch(`permissionsJson.${roleKey}.${permissionKey}`)}
                                    disabled={roleKey === "READ_ONLY"}
                                    onCheckedChange={(value) => rolesForm.setValue(`permissionsJson.${roleKey}.${permissionKey}`, Boolean(value), { shouldValidate: true })}
                                  />
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </GlassCard>

                  <GlassCard>
                    <GlassSectionHeader title="Role Manager" description="Manage role templates, scope, and workflow toggles." icon={UserCog} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <GlassToggleRow
                        label="Roles enabled"
                        checked={rolesForm.watch("roles.enabled")}
                        onCheckedChange={(value) => rolesForm.setValue("roles.enabled", value, { shouldValidate: true })}
                      />
                      <GlassToggleRow
                        label="Notes require supervisor approval"
                        checked={rolesForm.watch("roles.notesRequireSupervisorApproval")}
                        onCheckedChange={(value) => rolesForm.setValue("roles.notesRequireSupervisorApproval", value, { shouldValidate: true })}
                      />
                      <GlassToggleRow
                        label="Audit trail enabled"
                        checked={rolesForm.watch("roles.auditTrailEnabled")}
                        onCheckedChange={(value) => rolesForm.setValue("roles.auditTrailEnabled", value, { shouldValidate: true })}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <label className="text-sm">
                        Auto role for new users
                        <Select value={rolesForm.watch("roles.autoRoleForNewUsers")} onValueChange={(value) => rolesForm.setValue("roles.autoRoleForNewUsers", value as Role, { shouldValidate: true })}>
                          <SelectTrigger className="mt-1 w-56"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                            <SelectItem value="AD">AD</SelectItem>
                            <SelectItem value="ASSISTANT">ASSISTANT</SelectItem>
                            <SelectItem value="READ_ONLY">READ_ONLY</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const defaults = defaultRoleSettingsConfig();
                          rolesForm.setValue("roles", { ...defaults, roleTemplatesSeeded: true }, { shouldValidate: true });
                        }}
                      >
                        Seed role templates
                      </Button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {rolesForm.watch("roles.list").map((roleDef, index) => (
                        <div key={`role-def-${index}`} className="space-y-3 rounded-xl border border-white/70 bg-white/70 p-3">
                          <div className="grid gap-2 md:grid-cols-2">
                            <Input
                              placeholder="Role name"
                              value={roleDef.name}
                              onChange={(event) => {
                                const current = rolesForm.getValues("roles.list");
                                current[index] = { ...current[index], name: event.target.value };
                                rolesForm.setValue("roles.list", [...current], { shouldValidate: true });
                              }}
                            />
                            <Input
                              placeholder="Description"
                              value={roleDef.description}
                              onChange={(event) => {
                                const current = rolesForm.getValues("roles.list");
                                current[index] = { ...current[index], description: event.target.value };
                                rolesForm.setValue("roles.list", [...current], { shouldValidate: true });
                              }}
                            />
                          </div>
                          <div className="grid gap-2 md:grid-cols-[200px_1fr_auto] md:items-start">
                            <Select
                              value={roleDef.scope}
                              onValueChange={(value) => {
                                const current = rolesForm.getValues("roles.list");
                                current[index] = { ...current[index], scope: value as "WHOLE_BUILDING" | "ASSIGNED_UNITS" };
                                rolesForm.setValue("roles.list", [...current], { shouldValidate: true });
                              }}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="WHOLE_BUILDING">Whole Building</SelectItem>
                                <SelectItem value="ASSIGNED_UNITS">Assigned Units</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="rounded-lg border border-white/70 bg-white/60 p-2">
                              {roleDef.scope === "ASSIGNED_UNITS" ? (
                                <div className="flex flex-wrap gap-2">
                                  {units.map((unit) => {
                                    const selected = roleDef.assignedUnits.includes(unit.name);
                                    return (
                                      <label key={unit.id} className="inline-flex items-center gap-2 text-xs">
                                        <Checkbox
                                          checked={selected}
                                          onCheckedChange={(next) => {
                                            const current = rolesForm.getValues("roles.list");
                                            const assignedUnits = next
                                              ? Array.from(new Set([...current[index].assignedUnits, unit.name]))
                                              : current[index].assignedUnits.filter((entry) => entry !== unit.name);
                                            current[index] = { ...current[index], assignedUnits };
                                            rolesForm.setValue("roles.list", [...current], { shouldValidate: true });
                                          }}
                                        />
                                        {unit.name}
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-foreground/70">Applies to whole building.</p>
                              )}
                            </div>
                            <Button type="button" variant="outline" onClick={() => rolesForm.setValue("roles.list", removeAt(rolesForm.getValues("roles.list"), index), { shouldValidate: true })}>Remove</Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          rolesForm.setValue(
                            "roles.list",
                            appendItem(rolesForm.getValues("roles.list"), {
                              name: "",
                              description: "",
                              scope: "WHOLE_BUILDING",
                              assignedUnits: [],
                              permissions: {
                                calendarEdit: true,
                                attendanceEdit: true,
                                notesCreateEdit: true,
                                reportsExport: false,
                                inventoryManage: false,
                                prizeCartManage: false,
                                residentCouncilAccess: true,
                                auditLogView: false,
                                settingsEdit: false
                              }
                            }),
                            { shouldValidate: true }
                          )
                        }
                      >
                        Add role
                      </Button>
                    </div>
                  </GlassCard>

                  <GlassCard>
                    <GlassSectionHeader title="User Role Assignment" description="Assign built-in ACTIFY roles to facility users." icon={UserCog} />
                    <Input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="Search by name or email"
                      className="mb-3"
                    />
                    <div className="space-y-2">
                      {filteredUsers.map((user) => (
                        <div key={user.id} className="grid gap-2 rounded-xl border border-white/70 bg-white/70 p-3 md:grid-cols-[1fr_200px_auto] md:items-center">
                          <div>
                            <p className="text-sm font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-foreground/70">{user.email}</p>
                          </div>
                          <Select
                            value={userRoleDrafts[user.id]}
                            onValueChange={(value) =>
                              setUserRoleDrafts((prev) => ({
                                ...prev,
                                [user.id]: value as Role
                              }))
                            }
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">ADMIN</SelectItem>
                              <SelectItem value="AD">AD</SelectItem>
                              <SelectItem value="ASSISTANT">ASSISTANT</SelectItem>
                              <SelectItem value="READ_ONLY">READ_ONLY</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            onClick={() => saveUserRole(user.id)}
                            disabled={updatingUserId === user.id || userRoleDrafts[user.id] === user.role}
                          >
                            {updatingUserId === user.id ? "Saving..." : "Save role"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  <GlassCard>
                    <GlassSectionHeader title="Roles Audit Trail" description="Recent permission and role changes." icon={ShieldCheck} />
                    <div className="overflow-hidden rounded-xl border border-white/70 bg-white/70">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>When</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Actor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditEntries.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center text-sm text-foreground/70">No recent settings audit entries.</TableCell></TableRow>
                          ) : (
                            auditEntries.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                                <TableCell>{entry.action}</TableCell>
                                <TableCell>{entry.entityType}</TableCell>
                                <TableCell>{entry.actorName ?? "System"}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </GlassCard>

                  <FormFooter isPending={rolesPending} onReset={() => rolesForm.reset()} savedAt={rolesSavedAt} readOnly={!canEditByTab.roles} />
                  </fieldset>
                </form>
              )}
            </TabsContent>

            <TabsContent value="modules" forceMount hidden={activeTab !== "modules"}>
              <form onSubmit={onSubmitModules} className="space-y-4">
                {!canEditByTab.modules ? <ReadOnlyNotice /> : null}
                <fieldset disabled={!canEditByTab.modules} className="space-y-4">
                <GlassCard>
                  <GlassSectionHeader title="Module Mode and Toggles" description="Enable/disable features and dashboard widgets." icon={SlidersHorizontal} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm">
                      Mode
                      <Select value={modulesForm.watch("mode")} onValueChange={(value) => modulesForm.setValue("mode", value as "CORE_WORKFLOW" | "FULL_TOOLKIT", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CORE_WORKFLOW">Core Workflow</SelectItem>
                          <SelectItem value="FULL_TOOLKIT">Full Toolkit</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {Object.keys(modulesForm.watch("modules") ?? {}).map((moduleKey) => (
                      <GlassToggleRow
                        key={moduleKey}
                        label={moduleLabels[moduleKey] ?? moduleKey}
                        checked={Boolean(modulesForm.watch(`modules.${moduleKey as keyof z.infer<typeof modulesTabSchema>["modules"]}`))}
                        onCheckedChange={(value) =>
                          modulesForm.setValue(`modules.${moduleKey as keyof z.infer<typeof modulesTabSchema>["modules"]}`, value, { shouldValidate: true })
                        }
                      />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {Object.keys(modulesForm.watch("widgets") ?? {}).map((widgetKey) => (
                      <GlassToggleRow
                        key={widgetKey}
                        label={widgetLabels[widgetKey] ?? widgetKey}
                        checked={Boolean(modulesForm.watch(`widgets.${widgetKey as keyof z.infer<typeof modulesTabSchema>["widgets"]}`))}
                        onCheckedChange={(value) =>
                          modulesForm.setValue(`widgets.${widgetKey as keyof z.infer<typeof modulesTabSchema>["widgets"]}`, value, { shouldValidate: true })
                        }
                      />
                    ))}
                  </div>
                </GlassCard>
                <FormFooter isPending={modulesPending} onReset={() => modulesForm.reset()} savedAt={modulesSavedAt} readOnly={!canEditByTab.modules} />
                </fieldset>
              </form>
            </TabsContent>

            <TabsContent value="calendar" forceMount hidden={activeTab !== "calendar"}>
              <form onSubmit={onSubmitCalendar} className="space-y-4">
                {!canEditByTab.calendar ? <ReadOnlyNotice /> : null}
                <fieldset disabled={!canEditByTab.calendar} className="space-y-4">
                <GlassCard>
                  <GlassSectionHeader title="Calendar Defaults" description="Primary scheduling behavior and day/week/month defaults." icon={SlidersHorizontal} />
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="text-sm">
                      Default View
                      <Select value={calendarForm.watch("calendar.defaultView")} onValueChange={(value) => calendarForm.setValue("calendar.defaultView", value as "DAY" | "WEEK" | "MONTH", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAY">Day</SelectItem>
                          <SelectItem value="WEEK">Week</SelectItem>
                          <SelectItem value="MONTH">Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">
                      Color Mode
                      <Select value={calendarForm.watch("calendar.colorMode")} onValueChange={(value) => calendarForm.setValue("calendar.colorMode", value as "BY_CATEGORY" | "BY_LOCATION" | "NONE", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BY_CATEGORY">By Category</SelectItem>
                          <SelectItem value="BY_LOCATION">By Location</SelectItem>
                          <SelectItem value="NONE">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">
                      Setup Buffer (minutes)
                      <Select value={calendarForm.watch("calendar.setupBufferMinutes")} onValueChange={(value) => calendarForm.setValue("calendar.setupBufferMinutes", value as "0" | "5" | "10" | "15" | "30", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">Group Minutes<Input type="number" className="mt-1" value={calendarForm.watch("defaults.groupMinutes")} onChange={(event) => calendarForm.setValue("defaults.groupMinutes", Number(event.target.value), { shouldValidate: true })} /></label>
                    <label className="text-sm">1:1 Minutes<Input type="number" className="mt-1" value={calendarForm.watch("defaults.oneToOneMinutes")} onChange={(event) => calendarForm.setValue("defaults.oneToOneMinutes", Number(event.target.value), { shouldValidate: true })} /></label>
                    <label className="text-sm">Reminder Minutes Before<Input type="number" className="mt-1" value={calendarForm.watch("calendar.reminders.minutesBefore")} onChange={(event) => calendarForm.setValue("calendar.reminders.minutesBefore", Number(event.target.value), { shouldValidate: true })} /></label>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <GlassToggleRow label="Recurring defaults enabled" checked={calendarForm.watch("calendar.recurringDefaults.enabled")} onCheckedChange={(value) => calendarForm.setValue("calendar.recurringDefaults.enabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Staff assignment enabled" checked={calendarForm.watch("calendar.staffAssignmentEnabled")} onCheckedChange={(value) => calendarForm.setValue("calendar.staffAssignmentEnabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Reminder notifications enabled" checked={calendarForm.watch("calendar.reminders.enabled")} onCheckedChange={(value) => calendarForm.setValue("calendar.reminders.enabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Holiday packs enabled" checked={calendarForm.watch("calendar.holidayPacksEnabled")} onCheckedChange={(value) => calendarForm.setValue("calendar.holidayPacksEnabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Warn therapy overlap" checked={calendarForm.watch("defaults.warnTherapyOverlap")} onCheckedChange={(value) => calendarForm.setValue("defaults.warnTherapyOverlap", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Warn outside business hours" checked={calendarForm.watch("defaults.warnOutsideBusinessHours")} onCheckedChange={(value) => calendarForm.setValue("defaults.warnOutsideBusinessHours", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Use business hours defaults" checked={calendarForm.watch("defaults.useBusinessHoursDefaults")} onCheckedChange={(value) => calendarForm.setValue("defaults.useBusinessHoursDefaults", value, { shouldValidate: true })} />
                    <GlassToggleRow label="ICS export enabled" checked={calendarForm.watch("calendar.export.icsEnabled")} onCheckedChange={(value) => calendarForm.setValue("calendar.export.icsEnabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="PDF export enabled" checked={calendarForm.watch("calendar.export.pdfEnabled")} onCheckedChange={(value) => calendarForm.setValue("calendar.export.pdfEnabled", value, { shouldValidate: true })} />
                  </div>
                  <div className="mt-4">
                    <StringRepeater label="Default Locations" values={calendarForm.watch("defaults.locations")} placeholder="Activity Room" onChange={(next) => calendarForm.setValue("defaults.locations", next, { shouldValidate: true })} />
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Blackout Times</p>
                    {calendarForm.watch("calendar.blackoutTimes").map((block, index) => (
                      <div key={`blackout-${index}`} className="grid gap-2 rounded-lg border border-white/70 bg-white/70 p-3 md:grid-cols-[1fr_140px_140px_auto]">
                        <Input value={block.label} placeholder="Quiet hours" onChange={(event) => {
                          const current = calendarForm.getValues("calendar.blackoutTimes");
                          current[index] = { ...current[index], label: event.target.value };
                          calendarForm.setValue("calendar.blackoutTimes", [...current], { shouldValidate: true });
                        }} />
                        <Input type="time" value={block.start || ""} onChange={(event) => {
                          const current = calendarForm.getValues("calendar.blackoutTimes");
                          current[index] = { ...current[index], start: event.target.value };
                          calendarForm.setValue("calendar.blackoutTimes", [...current], { shouldValidate: true });
                        }} />
                        <Input type="time" value={block.end || ""} onChange={(event) => {
                          const current = calendarForm.getValues("calendar.blackoutTimes");
                          current[index] = { ...current[index], end: event.target.value };
                          calendarForm.setValue("calendar.blackoutTimes", [...current], { shouldValidate: true });
                        }} />
                        <Button type="button" variant="outline" onClick={() => calendarForm.setValue("calendar.blackoutTimes", removeAt(calendarForm.getValues("calendar.blackoutTimes"), index), { shouldValidate: true })}>Remove</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => calendarForm.setValue("calendar.blackoutTimes", appendItem(calendarForm.getValues("calendar.blackoutTimes"), { label: "", start: "", end: "" }), { shouldValidate: true })}>Add blackout</Button>
                  </div>
                </GlassCard>
                <FormFooter isPending={calendarPending} onReset={() => calendarForm.reset()} savedAt={calendarSavedAt} readOnly={!canEditByTab.calendar} />
                </fieldset>
              </form>
            </TabsContent>

            <TabsContent value="docs" forceMount hidden={activeTab !== "docs"}>
              {!isAdmin ? (
                <GlassCard>
                  <GlassSectionHeader title="Admin only" description="Only admins can edit documentation enforcement rules." icon={ShieldCheck} />
                </GlassCard>
              ) : (
                <form onSubmit={onSubmitDocs} className="space-y-4">
                  {!canEditByTab.docs ? <ReadOnlyNotice /> : null}
                  <fieldset disabled={!canEditByTab.docs} className="space-y-4">
                  <GlassCard>
                    <GlassSectionHeader title="Required Fields & Scoring" description="Control required note fields and participation scoring." icon={ShieldCheck} />
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="text-sm">Present Weight<Input type="number" className="mt-1" value={docsForm.watch("scoring.presentWeight")} onChange={(event) => docsForm.setValue("scoring.presentWeight", Number(event.target.value), { shouldValidate: true })} /></label>
                      <label className="text-sm">Active Weight<Input type="number" className="mt-1" value={docsForm.watch("scoring.activeWeight")} onChange={(event) => docsForm.setValue("scoring.activeWeight", Number(event.target.value), { shouldValidate: true })} /></label>
                      <label className="text-sm">Leading Weight<Input type="number" className="mt-1" value={docsForm.watch("scoring.leadingWeight")} onChange={(event) => docsForm.setValue("scoring.leadingWeight", Number(event.target.value), { shouldValidate: true })} /></label>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <GlassToggleRow label="Mood required" checked={docsForm.watch("docs.requiredFields.mood")} onCheckedChange={(value) => docsForm.setValue("docs.requiredFields.mood", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Participation level required" checked={docsForm.watch("docs.requiredFields.participationLevel")} onCheckedChange={(value) => docsForm.setValue("docs.requiredFields.participationLevel", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Cues required" checked={docsForm.watch("docs.requiredFields.cues")} onCheckedChange={(value) => docsForm.setValue("docs.requiredFields.cues", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Response type required" checked={docsForm.watch("docs.requiredFields.responseType")} onCheckedChange={(value) => docsForm.setValue("docs.requiredFields.responseType", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Follow up required" checked={docsForm.watch("docs.requiredFields.followUp")} onCheckedChange={(value) => docsForm.setValue("docs.requiredFields.followUp", value, { shouldValidate: true })} />
                    </div>
                    <div className="mt-4">
                      <StringRepeater
                        label="Require Note For Barriers"
                        values={docsForm.watch("scoring.requireNoteForBarriers")}
                        placeholder="PAIN"
                        onChange={(next) => docsForm.setValue("scoring.requireNoteForBarriers", next, { shouldValidate: true })}
                      />
                    </div>
                  </GlassCard>
                  <GlassCard>
                    <GlassSectionHeader title="Enforcement, Signatures, and Guardrails" description="Apply policy-based documentation behavior." icon={ShieldCheck} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <GlassToggleRow label="Only allow template notes" checked={docsForm.watch("docs.onlyAllowTemplateNotes")} onCheckedChange={(value) => docsForm.setValue("docs.onlyAllowTemplateNotes", value, { shouldValidate: true })} />
                      <label className="text-sm">
                        Lock notes after
                        <Select value={docsForm.watch("docs.lockNotesAfterDays")} onValueChange={(value) => docsForm.setValue("docs.lockNotesAfterDays", value as "OFF" | "3" | "7" | "14" | "30", { shouldValidate: true })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OFF">Off</SelectItem>
                            <SelectItem value="3">3 days</SelectItem>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="14">14 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                      <GlassToggleRow label="Signature required" checked={docsForm.watch("docs.signature.required")} onCheckedChange={(value) => docsForm.setValue("docs.signature.required", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Supervisor cosign required" checked={docsForm.watch("docs.signature.supervisorCosign")} onCheckedChange={(value) => docsForm.setValue("docs.signature.supervisorCosign", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Auto add standard line" checked={docsForm.watch("docs.autoAddStandardLine.enabled")} onCheckedChange={(value) => docsForm.setValue("docs.autoAddStandardLine.enabled", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Terminology warnings enabled" checked={docsForm.watch("docs.terminologyWarnings.enabled")} onCheckedChange={(value) => docsForm.setValue("docs.terminologyWarnings.enabled", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Allow photo attachments" checked={docsForm.watch("docs.attachments.allowPhotos")} onCheckedChange={(value) => docsForm.setValue("docs.attachments.allowPhotos", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Allow PDF attachments" checked={docsForm.watch("docs.attachments.allowPDFs")} onCheckedChange={(value) => docsForm.setValue("docs.attachments.allowPDFs", value, { shouldValidate: true })} />
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="text-sm">Standard Line Text<Textarea rows={3} className="mt-1" value={docsForm.watch("docs.autoAddStandardLine.text")} onChange={(event) => docsForm.setValue("docs.autoAddStandardLine.text", event.target.value, { shouldValidate: true })} /></label>
                      <label className="text-sm">Attachment Max Size MB<Input type="number" className="mt-1" value={docsForm.watch("docs.attachments.maxSizeMB")} onChange={(event) => docsForm.setValue("docs.attachments.maxSizeMB", Number(event.target.value), { shouldValidate: true })} /></label>
                      <GlassToggleRow label="Late entry mode enabled" checked={docsForm.watch("docs.lateEntryMode.enabled")} onCheckedChange={(value) => docsForm.setValue("docs.lateEntryMode.enabled", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Late entry requires reason" checked={docsForm.watch("docs.lateEntryMode.requireReason")} onCheckedChange={(value) => docsForm.setValue("docs.lateEntryMode.requireReason", value, { shouldValidate: true })} />
                      <label className="text-sm">Retention Years<Input type="number" className="mt-1" value={docsForm.watch("docs.retentionYears")} onChange={(event) => docsForm.setValue("docs.retentionYears", Number(event.target.value), { shouldValidate: true })} /></label>
                      <label className="text-sm">Minimum Narrative Length<Input type="number" className="mt-1" value={docsForm.watch("scoring.minNarrativeLen")} onChange={(event) => docsForm.setValue("scoring.minNarrativeLen", Number(event.target.value), { shouldValidate: true })} /></label>
                      <GlassToggleRow label="Require goal link for 1:1 notes" checked={docsForm.watch("scoring.requireGoalLinkForOneToOne")} onCheckedChange={(value) => docsForm.setValue("scoring.requireGoalLinkForOneToOne", value, { shouldValidate: true })} />
                    </div>
                  </GlassCard>
                  <FormFooter isPending={docsPending} onReset={() => docsForm.reset()} savedAt={docsSavedAt} readOnly={!canEditByTab.docs} />
                  </fieldset>
                </form>
              )}
            </TabsContent>

            <TabsContent value="careplan" forceMount hidden={activeTab !== "careplan"}>
              <form onSubmit={onSubmitCarePlan} className="space-y-4">
                {!canEditByTab.careplan ? <ReadOnlyNotice /> : null}
                <fieldset disabled={!canEditByTab.careplan} className="space-y-4">
                <GlassPanel variant="warm" className="relative !p-0 overflow-hidden">
                  <div className="h-1.5 bg-actify-brand" />
                  <div className="space-y-4 p-5 md:p-6">
                    <GlassSectionHeader
                      title="Care Plan Studio"
                      description="A dedicated layout for your activities care-plan workflow, cadence, and intervention defaults."
                      icon={UserCog}
                    />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-white/75 bg-white/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-foreground/70">Review cadence</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {carePlanForm.watch("carePlan.reviewCadence.preset") === "CUSTOM"
                            ? `${carePlanForm.watch("carePlan.reviewCadence.customDays") || "Custom"} days`
                            : `${carePlanForm.watch("carePlan.reviewCadence.preset")} days`}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/75 bg-white/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-foreground/70">Default interventions</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{carePlanForm.watch("carePlan.defaultInterventions").filter(Boolean).length}</p>
                      </div>
                      <div className="rounded-xl border border-white/75 bg-white/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-foreground/70">Review reminders</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {carePlanForm.watch("carePlan.reviewReminders.enabled")
                            ? `Enabled • every ${carePlanForm.watch("carePlan.reviewReminders.days")} days`
                            : "Disabled"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/75 bg-white/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-foreground/70">Export readiness</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {carePlanForm.watch("carePlan.export.pdfEnabled") ? "PDF enabled" : "PDF disabled"}
                        </p>
                        <p className="text-xs text-foreground/70">
                          {carePlanForm.watch("carePlan.export.includeSignatureLine") ? "Signature line on" : "Signature line off"}
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
                  <GlassCard variant="dense" className="space-y-4 xl:sticky xl:top-4 xl:self-start">
                    <GlassSectionHeader title="Cadence Control Rail" description="Quickly manage cadence and reminders from one place." icon={ShieldCheck} />
                    <label className="text-sm">
                      Review Cadence
                      <Select
                        value={carePlanForm.watch("carePlan.reviewCadence.preset")}
                        onValueChange={(value) => carePlanForm.setValue("carePlan.reviewCadence.preset", value as "30" | "60" | "90" | "CUSTOM", { shouldValidate: true })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    {carePlanForm.watch("carePlan.reviewCadence.preset") === "CUSTOM" ? (
                      <label className="text-sm">
                        Custom Days
                        <Input
                          type="number"
                          className="mt-1"
                          value={carePlanForm.watch("carePlan.reviewCadence.customDays") ?? ""}
                          onChange={(event) => carePlanForm.setValue("carePlan.reviewCadence.customDays", Number(event.target.value), { shouldValidate: true })}
                        />
                      </label>
                    ) : null}
                    <GlassToggleRow
                      label="Review reminders enabled"
                      checked={carePlanForm.watch("carePlan.reviewReminders.enabled")}
                      onCheckedChange={(value) => carePlanForm.setValue("carePlan.reviewReminders.enabled", value, { shouldValidate: true })}
                    />
                    <label className="text-sm">
                      Review Reminder Days
                      <Select
                        value={carePlanForm.watch("carePlan.reviewReminders.days")}
                        onValueChange={(value) => carePlanForm.setValue("carePlan.reviewReminders.days", value as "30" | "60" | "90", { shouldValidate: true })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="60">60</SelectItem>
                          <SelectItem value="90">90</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <p className="rounded-xl border border-white/70 bg-white/65 px-3 py-2 text-xs text-foreground/70">
                      Tip: use 30-day cadence for high-acuity wings and 60–90 day cadence for stable caseloads.
                    </p>
                  </GlassCard>

                  <div className="space-y-4">
                    <GlassCard>
                      <GlassSectionHeader title="Quality Guardrails" description="Lock in the standards your team should follow in every care plan." icon={UserCog} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <GlassToggleRow
                          label="Interventions library enabled"
                          checked={carePlanForm.watch("carePlan.interventionsLibraryEnabled")}
                          onCheckedChange={(value) => carePlanForm.setValue("carePlan.interventionsLibraryEnabled", value, { shouldValidate: true })}
                        />
                        <GlassToggleRow
                          label="Goal mapping enabled"
                          checked={carePlanForm.watch("carePlan.goalMappingEnabled")}
                          onCheckedChange={(value) => carePlanForm.setValue("carePlan.goalMappingEnabled", value, { shouldValidate: true })}
                        />
                        <GlassToggleRow
                          label="Require personalization"
                          checked={carePlanForm.watch("carePlan.requirePersonalization")}
                          onCheckedChange={(value) => carePlanForm.setValue("carePlan.requirePersonalization", value, { shouldValidate: true })}
                        />
                        <GlassToggleRow
                          label="Block completion if generic"
                          checked={carePlanForm.watch("carePlan.blockReviewCompletionIfGeneric")}
                          onCheckedChange={(value) => carePlanForm.setValue("carePlan.blockReviewCompletionIfGeneric", value, { shouldValidate: true })}
                        />
                        <GlassToggleRow
                          label="Auto suggest by tags"
                          checked={carePlanForm.watch("carePlan.autoSuggestByTagsEnabled")}
                          onCheckedChange={(value) => carePlanForm.setValue("carePlan.autoSuggestByTagsEnabled", value, { shouldValidate: true })}
                        />
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <GlassSectionHeader title="Frequencies, Interventions, and Export" description="Set defaults for day-to-day plan writing and care plan print output." icon={ShieldCheck} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm">
                          Group Default Frequency
                          <Input
                            className="mt-1"
                            value={carePlanForm.watch("carePlan.defaultFrequencies.groupDefault")}
                            onChange={(event) => carePlanForm.setValue("carePlan.defaultFrequencies.groupDefault", event.target.value, { shouldValidate: true })}
                          />
                        </label>
                        <label className="text-sm">
                          1:1 Default Frequency
                          <Input
                            className="mt-1"
                            value={carePlanForm.watch("carePlan.defaultFrequencies.oneToOneDefault")}
                            onChange={(event) => carePlanForm.setValue("carePlan.defaultFrequencies.oneToOneDefault", event.target.value, { shouldValidate: true })}
                          />
                        </label>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <GlassToggleRow
                          label="Care plan PDF export enabled"
                          checked={carePlanForm.watch("carePlan.export.pdfEnabled")}
                          onCheckedChange={(value) => carePlanForm.setValue("carePlan.export.pdfEnabled", value, { shouldValidate: true })}
                        />
                        <GlassToggleRow
                          label="Include signature line in export"
                          checked={carePlanForm.watch("carePlan.export.includeSignatureLine")}
                          onCheckedChange={(value) => carePlanForm.setValue("carePlan.export.includeSignatureLine", value, { shouldValidate: true })}
                        />
                      </div>
                      <div className="mt-4">
                        <StringRepeater
                          label="Default Interventions"
                          values={carePlanForm.watch("carePlan.defaultInterventions")}
                          placeholder="Offer 1:1 music cueing"
                          onChange={(next) => carePlanForm.setValue("carePlan.defaultInterventions", next, { shouldValidate: true })}
                        />
                      </div>
                    </GlassCard>
                  </div>
                </div>
                <FormFooter isPending={carePlanPending} onReset={() => carePlanForm.reset()} savedAt={carePlanSavedAt} readOnly={!canEditByTab.careplan} />
                </fieldset>
              </form>
            </TabsContent>

            <TabsContent value="reports" forceMount hidden={activeTab !== "reports"}>
              <form onSubmit={onSubmitReports} className="space-y-4">
                {!canEditByTab.reports ? <ReadOnlyNotice /> : null}
                <fieldset disabled={!canEditByTab.reports} className="space-y-4">
                <GlassCard>
                  <GlassSectionHeader title="Report Types and Defaults" description="Set available report outputs and default filters." icon={CreditCard} />
                  <div className="grid gap-3 md:grid-cols-2">
                    {Object.entries(reportsForm.watch("reports.types")).map(([key, enabled]) => (
                      <GlassToggleRow key={key} label={key} checked={Boolean(enabled)} onCheckedChange={(value) => reportsForm.setValue(`reports.types.${key as keyof z.infer<typeof reportsTabSchema>["reports"]["types"]}`, value, { shouldValidate: true })} />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="text-sm">
                      Default Date Range
                      <Select value={reportsForm.watch("reports.defaultDateRange")} onValueChange={(value) => reportsForm.setValue("reports.defaultDateRange", value as "THIS_MONTH" | "LAST_MONTH" | "ROLLING_30", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="THIS_MONTH">This Month</SelectItem>
                          <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                          <SelectItem value="ROLLING_30">Rolling 30</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">
                      Theme
                      <Select value={reportsForm.watch("reports.theme")} onValueChange={(value) => reportsForm.setValue("reports.theme", value as "CLASSIC" | "CLEAN" | "LIQUID_GLASS", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CLASSIC">Classic</SelectItem>
                          <SelectItem value="CLEAN">Clean</SelectItem>
                          <SelectItem value="LIQUID_GLASS">Liquid Glass</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">
                      Accent
                      <Select value={reportsForm.watch("reports.accent")} onValueChange={(value) => reportsForm.setValue("reports.accent", value as "BLUE" | "MINT" | "CORAL", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BLUE">Blue</SelectItem>
                          <SelectItem value="MINT">Mint</SelectItem>
                          <SelectItem value="CORAL">Coral</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="text-sm">Scoring Low<Input type="number" className="mt-1" value={reportsForm.watch("reports.scoring.weights.low")} onChange={(event) => reportsForm.setValue("reports.scoring.weights.low", Number(event.target.value), { shouldValidate: true })} /></label>
                    <label className="text-sm">Scoring Moderate<Input type="number" className="mt-1" value={reportsForm.watch("reports.scoring.weights.moderate")} onChange={(event) => reportsForm.setValue("reports.scoring.weights.moderate", Number(event.target.value), { shouldValidate: true })} /></label>
                    <label className="text-sm">Scoring High<Input type="number" className="mt-1" value={reportsForm.watch("reports.scoring.weights.high")} onChange={(event) => reportsForm.setValue("reports.scoring.weights.high", Number(event.target.value), { shouldValidate: true })} /></label>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <GlassToggleRow label="Scoring enabled" checked={reportsForm.watch("reports.scoring.enabled")} onCheckedChange={(value) => reportsForm.setValue("reports.scoring.enabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="PDF include logo" checked={reportsForm.watch("reports.pdf.includeLogo")} onCheckedChange={(value) => reportsForm.setValue("reports.pdf.includeLogo", value, { shouldValidate: true })} />
                    <GlassToggleRow label="PDF include charts" checked={reportsForm.watch("reports.pdf.includeCharts")} onCheckedChange={(value) => reportsForm.setValue("reports.pdf.includeCharts", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Auto-generate reports" checked={reportsForm.watch("reports.autoGenerate.enabled")} onCheckedChange={(value) => reportsForm.setValue("reports.autoGenerate.enabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Allow PDF exports" checked={reportsForm.watch("reports.exportFormats.pdf")} onCheckedChange={(value) => reportsForm.setValue("reports.exportFormats.pdf", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Allow CSV exports" checked={reportsForm.watch("reports.exportFormats.csv")} onCheckedChange={(value) => reportsForm.setValue("reports.exportFormats.csv", value, { shouldValidate: true })} />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="text-sm">
                      PDF Header Style
                      <Select value={reportsForm.watch("reports.pdf.headerStyle")} onValueChange={(value) => reportsForm.setValue("reports.pdf.headerStyle", value as "CLASSIC" | "CLEAN" | "LIQUID_GLASS" | "GLASS", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GLASS">Glass</SelectItem>
                          <SelectItem value="CLASSIC">Classic</SelectItem>
                          <SelectItem value="CLEAN">Clean</SelectItem>
                          <SelectItem value="LIQUID_GLASS">Liquid Glass</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">Auto-generate Day Of Month<Input type="number" className="mt-1" min={1} max={28} value={reportsForm.watch("reports.autoGenerate.dayOfMonth")} onChange={(event) => reportsForm.setValue("reports.autoGenerate.dayOfMonth", Number(event.target.value), { shouldValidate: true })} /></label>
                    <label className="text-sm">Default Unit Filter (comma-separated)<Input className="mt-1" value={reportsForm.watch("reports.defaultUnitFilter").join(", ")} onChange={(event) => reportsForm.setValue("reports.defaultUnitFilter", event.target.value.split(",").map((item) => item.trim()).filter(Boolean), { shouldValidate: true })} /></label>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {Object.entries(reportsForm.watch("reports.includeSections")).map(([sectionKey, enabled]) => (
                      <GlassToggleRow key={sectionKey} label={sectionKey} checked={Boolean(enabled)} onCheckedChange={(value) => reportsForm.setValue(`reports.includeSections.${sectionKey as keyof z.infer<typeof reportsTabSchema>["reports"]["includeSections"]}`, value, { shouldValidate: true })} />
                    ))}
                  </div>
                </GlassCard>

                <GlassCard>
                  <GlassSectionHeader title="Print Defaults" description="Shared print defaults for report rendering and export." icon={CreditCard} />
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="text-sm">
                      Paper Size
                      <Select value={reportsForm.watch("printDefaults.paperSize")} onValueChange={(value) => reportsForm.setValue("printDefaults.paperSize", value as "LETTER" | "A4", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LETTER">LETTER</SelectItem>
                          <SelectItem value="A4">A4</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">
                      Margins
                      <Select value={reportsForm.watch("printDefaults.margins")} onValueChange={(value) => reportsForm.setValue("printDefaults.margins", value as "NORMAL" | "NARROW" | "WIDE", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="NARROW">Narrow</SelectItem>
                          <SelectItem value="WIDE">Wide</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <div className="pt-5">
                      <GlassToggleRow label="Include footer metadata" checked={reportsForm.watch("printDefaults.includeFooterMeta")} onCheckedChange={(value) => reportsForm.setValue("printDefaults.includeFooterMeta", value, { shouldValidate: true })} />
                    </div>
                  </div>
                </GlassCard>
                <FormFooter isPending={reportsPending} onReset={() => reportsForm.reset()} savedAt={reportsSavedAt} readOnly={!canEditByTab.reports} />
                </fieldset>
              </form>
            </TabsContent>

            <TabsContent value="inventory" forceMount hidden={activeTab !== "inventory"}>
              <form onSubmit={onSubmitInventory} className="space-y-4">
                {!canEditByTab.inventory ? <ReadOnlyNotice /> : null}
                <fieldset disabled={!canEditByTab.inventory} className="space-y-4">
                <GlassCard>
                  <GlassSectionHeader title="Inventory Controls" description="Stock categories, vendors, budgets, and low-stock behavior." icon={SlidersHorizontal} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <GlassToggleRow label="Inventory enabled" checked={inventoryForm.watch("inventory.enabled")} onCheckedChange={(value) => inventoryForm.setValue("inventory.enabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="PAR levels enabled" checked={inventoryForm.watch("inventory.parLevels.enabled")} onCheckedChange={(value) => inventoryForm.setValue("inventory.parLevels.enabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Low stock alerts enabled" checked={inventoryForm.watch("inventory.lowStockAlerts.enabled")} onCheckedChange={(value) => inventoryForm.setValue("inventory.lowStockAlerts.enabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Checkout log enabled" checked={inventoryForm.watch("inventory.checkoutLog.enabled")} onCheckedChange={(value) => inventoryForm.setValue("inventory.checkoutLog.enabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Budget tracking enabled" checked={inventoryForm.watch("inventory.budgetTracking.enabled")} onCheckedChange={(value) => inventoryForm.setValue("inventory.budgetTracking.enabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Barcode mode enabled" checked={inventoryForm.watch("inventory.barcodeMode.enabled")} onCheckedChange={(value) => inventoryForm.setValue("inventory.barcodeMode.enabled", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Show low stock banner" checked={inventoryForm.watch("inventory.showLowStockBanner")} onCheckedChange={(value) => inventoryForm.setValue("inventory.showLowStockBanner", value, { shouldValidate: true })} />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="text-sm">Monthly Budget<Input type="number" className="mt-1" value={inventoryForm.watch("inventory.budgetTracking.monthlyBudget")} onChange={(event) => inventoryForm.setValue("inventory.budgetTracking.monthlyBudget", Number(event.target.value), { shouldValidate: true })} /></label>
                    <label className="text-sm">Reorder Threshold Multiplier<Input type="number" step="0.1" className="mt-1" value={inventoryForm.watch("inventory.reorderThresholdMultiplier")} onChange={(event) => inventoryForm.setValue("inventory.reorderThresholdMultiplier", Number(event.target.value), { shouldValidate: true })} /></label>
                    <label className="text-sm">
                      Low Stock Threshold Mode
                      <Select value={inventoryForm.watch("inventory.lowStockAlerts.thresholdMode")} onValueChange={(value) => inventoryForm.setValue("inventory.lowStockAlerts.thresholdMode", value as "BELOW_PAR" | "CUSTOM", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BELOW_PAR">Below PAR</SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                  <div className="mt-4">
                    <StringRepeater label="Inventory Categories" values={inventoryForm.watch("inventory.categories")} placeholder="Snacks" onChange={(next) => inventoryForm.setValue("inventory.categories", next, { shouldValidate: true })} />
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Vendors</p>
                    {inventoryForm.watch("inventory.vendors").map((vendor, index) => (
                      <div key={`vendor-${index}`} className="grid gap-2 rounded-lg border border-white/70 bg-white/70 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                        <Input value={vendor.name} placeholder="Vendor name" onChange={(event) => {
                          const current = inventoryForm.getValues("inventory.vendors");
                          current[index] = { ...current[index], name: event.target.value };
                          inventoryForm.setValue("inventory.vendors", [...current], { shouldValidate: true });
                        }} />
                        <Input value={vendor.link} placeholder="Link" onChange={(event) => {
                          const current = inventoryForm.getValues("inventory.vendors");
                          current[index] = { ...current[index], link: event.target.value };
                          inventoryForm.setValue("inventory.vendors", [...current], { shouldValidate: true });
                        }} />
                        <Input value={vendor.notes} placeholder="Notes" onChange={(event) => {
                          const current = inventoryForm.getValues("inventory.vendors");
                          current[index] = { ...current[index], notes: event.target.value };
                          inventoryForm.setValue("inventory.vendors", [...current], { shouldValidate: true });
                        }} />
                        <Button type="button" variant="outline" onClick={() => inventoryForm.setValue("inventory.vendors", removeAt(inventoryForm.getValues("inventory.vendors"), index), { shouldValidate: true })}>Remove</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => inventoryForm.setValue("inventory.vendors", appendItem(inventoryForm.getValues("inventory.vendors"), { name: "", link: "", notes: "" }), { shouldValidate: true })}>Add Vendor</Button>
                  </div>
                </GlassCard>

                <GlassCard>
                  <GlassSectionHeader title="Prize Cart Presets" description="Category prices and restock behavior for incentive cart." icon={CreditCard} />
                  <div className="space-y-2">
                    {inventoryForm.watch("prizeCart.presets").map((preset, index) => (
                      <div key={`preset-${index}`} className="grid gap-2 rounded-lg border border-white/70 bg-white/70 p-3 md:grid-cols-[1fr_180px_140px_auto]">
                        <Input value={preset.category} placeholder="Category" onChange={(event) => {
                          const current = inventoryForm.getValues("prizeCart.presets");
                          current[index] = { ...current[index], category: event.target.value };
                          inventoryForm.setValue("prizeCart.presets", [...current], { shouldValidate: true });
                        }} />
                        <Input type="number" value={preset.defaultPriceCents} onChange={(event) => {
                          const current = inventoryForm.getValues("prizeCart.presets");
                          current[index] = { ...current[index], defaultPriceCents: Number(event.target.value) };
                          inventoryForm.setValue("prizeCart.presets", [...current], { shouldValidate: true });
                        }} />
                        <Input type="number" value={preset.reorderAt} onChange={(event) => {
                          const current = inventoryForm.getValues("prizeCart.presets");
                          current[index] = { ...current[index], reorderAt: Number(event.target.value) };
                          inventoryForm.setValue("prizeCart.presets", [...current], { shouldValidate: true });
                        }} />
                        <Button type="button" variant="outline" onClick={() => inventoryForm.setValue("prizeCart.presets", removeAt(inventoryForm.getValues("prizeCart.presets"), index), { shouldValidate: true })}>Remove</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => inventoryForm.setValue("prizeCart.presets", appendItem(inventoryForm.getValues("prizeCart.presets"), { category: "", defaultPriceCents: 0, reorderAt: 0 }), { shouldValidate: true })}>Add Preset</Button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <GlassToggleRow label="Enable restock suggestions" checked={inventoryForm.watch("prizeCart.enableRestockSuggestions")} onCheckedChange={(value) => inventoryForm.setValue("prizeCart.enableRestockSuggestions", value, { shouldValidate: true })} />
                    <label className="text-sm">
                      Restock Aggressiveness
                      <Select value={inventoryForm.watch("prizeCart.restockAggressiveness")} onValueChange={(value) => inventoryForm.setValue("prizeCart.restockAggressiveness", value as "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CONSERVATIVE">Conservative</SelectItem>
                          <SelectItem value="BALANCED">Balanced</SelectItem>
                          <SelectItem value="AGGRESSIVE">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                </GlassCard>
                <FormFooter isPending={inventoryPending} onReset={() => inventoryForm.reset()} savedAt={inventorySavedAt} readOnly={!canEditByTab.inventory} />
                </fieldset>
              </form>
            </TabsContent>

            <TabsContent value="notifications" forceMount hidden={activeTab !== "notifications"}>
              <form onSubmit={onSubmitNotifications} className="space-y-4">
                {!canEditByTab.notifications ? <ReadOnlyNotice /> : null}
                <fieldset disabled={!canEditByTab.notifications} className="space-y-4">
                <GlassCard>
                  <GlassSectionHeader title="Channels, Digests, and Triggers" description="Control who gets notified and when." icon={BellRing} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <GlassToggleRow label="In-app notifications" checked={notificationsForm.watch("notifications.channels.inApp")} onCheckedChange={(value) => notificationsForm.setValue("notifications.channels.inApp", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Email notifications" checked={notificationsForm.watch("notifications.channels.email")} onCheckedChange={(value) => notificationsForm.setValue("notifications.channels.email", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Push notifications" checked={notificationsForm.watch("notifications.channels.push")} onCheckedChange={(value) => notificationsForm.setValue("notifications.channels.push", value, { shouldValidate: true })} />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="text-sm">
                      Digest Mode
                      <Select value={notificationsForm.watch("notifications.digest.mode")} onValueChange={(value) => notificationsForm.setValue("notifications.digest.mode", value as "OFF" | "DAILY" | "WEEKLY", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OFF">Off</SelectItem>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">Digest Time<Input type="time" className="mt-1" value={notificationsForm.watch("notifications.digest.time")} onChange={(event) => notificationsForm.setValue("notifications.digest.time", event.target.value, { shouldValidate: true })} /></label>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {notificationTriggerOptions.map((option) => (
                      <GlassToggleRow
                        key={option.key}
                        label={option.label}
                        checked={Boolean(notificationsForm.watch(`notifications.triggers.${option.key as keyof z.infer<typeof notificationsTabSchema>["notifications"]["triggers"]}`))}
                        onCheckedChange={(value) => notificationsForm.setValue(`notifications.triggers.${option.key as keyof z.infer<typeof notificationsTabSchema>["notifications"]["triggers"]}`, value, { shouldValidate: true })}
                      />
                    ))}
                  </div>
                </GlassCard>

                <GlassCard>
                  <GlassSectionHeader title="Quiet Hours and Escalation" description="Define quiet windows and escalation behavior." icon={ShieldCheck} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <GlassToggleRow label="Quiet hours enabled" checked={notificationsForm.watch("notifications.quietHours.enabled")} onCheckedChange={(value) => notificationsForm.setValue("notifications.quietHours.enabled", value, { shouldValidate: true })} />
                    <label className="text-sm">Quiet Start<Input type="time" className="mt-1" value={notificationsForm.watch("notifications.quietHours.start")} onChange={(event) => notificationsForm.setValue("notifications.quietHours.start", event.target.value, { shouldValidate: true })} /></label>
                    <label className="text-sm">Quiet End<Input type="time" className="mt-1" value={notificationsForm.watch("notifications.quietHours.end")} onChange={(event) => notificationsForm.setValue("notifications.quietHours.end", event.target.value, { shouldValidate: true })} /></label>
                    <GlassToggleRow label="Escalation enabled" checked={notificationsForm.watch("notifications.escalation.enabled")} onCheckedChange={(value) => notificationsForm.setValue("notifications.escalation.enabled", value, { shouldValidate: true })} />
                    <label className="text-sm">Escalation Minutes After Due<Input type="number" className="mt-1" value={notificationsForm.watch("notifications.escalation.minutesAfterDue")} onChange={(event) => notificationsForm.setValue("notifications.escalation.minutesAfterDue", Number(event.target.value), { shouldValidate: true })} /></label>
                    <label className="text-sm">
                      Escalation Role
                      <Select value={notificationsForm.watch("notifications.escalation.notifyRole")} onValueChange={(value) => notificationsForm.setValue("notifications.escalation.notifyRole", value as Role, { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                          <SelectItem value="AD">AD</SelectItem>
                          <SelectItem value="ASSISTANT">ASSISTANT</SelectItem>
                          <SelectItem value="READ_ONLY">READ_ONLY</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                </GlassCard>
                <FormFooter isPending={notificationsPending} onReset={() => notificationsForm.reset()} savedAt={notificationsSavedAt} readOnly={!canEditByTab.notifications} />
                </fieldset>
              </form>
            </TabsContent>

            <TabsContent value="compliance" forceMount hidden={activeTab !== "compliance"}>
              {!isAdmin ? (
                <GlassCard>
                  <GlassSectionHeader title="Admin only" description="Only admins can modify compliance and security settings." icon={ShieldCheck} />
                </GlassCard>
              ) : (
                <form onSubmit={onSubmitCompliance} className="space-y-4">
                  {!canEditByTab.compliance ? <ReadOnlyNotice /> : null}
                  <fieldset disabled={!canEditByTab.compliance} className="space-y-4">
                  <GlassCard>
                    <GlassSectionHeader title="HIPAA, Security, and Export Restrictions" description="Set compliance guardrails for sessions and exports." icon={ShieldCheck} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <GlassToggleRow label="HIPAA mode enabled" checked={complianceForm.watch("compliance.hipaaMode.enabled")} onCheckedChange={(value) => complianceForm.setValue("compliance.hipaaMode.enabled", value, { shouldValidate: true })} />
                      <label className="text-sm">
                        Auto Logout Minutes
                        <Select value={complianceForm.watch("compliance.hipaaMode.autoLogoutMinutes")} onValueChange={(value) => complianceForm.setValue("compliance.hipaaMode.autoLogoutMinutes", value as "5" | "10" | "15" | "30", { shouldValidate: true })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                      <GlassToggleRow label="Mask PHI in exports" checked={complianceForm.watch("compliance.hipaaMode.maskPHIInExports")} onCheckedChange={(value) => complianceForm.setValue("compliance.hipaaMode.maskPHIInExports", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Access logs enabled" checked={complianceForm.watch("compliance.accessLogs.enabled")} onCheckedChange={(value) => complianceForm.setValue("compliance.accessLogs.enabled", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Only admins can export" checked={complianceForm.watch("compliance.exportRestrictions.onlyAdminsCanExport")} onCheckedChange={(value) => complianceForm.setValue("compliance.exportRestrictions.onlyAdminsCanExport", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Require MFA for admins" checked={complianceForm.watch("compliance.security.requireMFAForAdmins")} onCheckedChange={(value) => complianceForm.setValue("compliance.security.requireMFAForAdmins", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Device trust enabled" checked={complianceForm.watch("compliance.security.deviceTrustEnabled")} onCheckedChange={(value) => complianceForm.setValue("compliance.security.deviceTrustEnabled", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Incident notes enabled" checked={complianceForm.watch("compliance.incidentNotes.enabled")} onCheckedChange={(value) => complianceForm.setValue("compliance.incidentNotes.enabled", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Hide triggers in print" checked={complianceForm.watch("compliance.hideTriggersInPrint")} onCheckedChange={(value) => complianceForm.setValue("compliance.hideTriggersInPrint", value, { shouldValidate: true })} />
                      <GlassToggleRow label="Mask family contact in print" checked={complianceForm.watch("compliance.maskFamilyContactInPrint")} onCheckedChange={(value) => complianceForm.setValue("compliance.maskFamilyContactInPrint", value, { shouldValidate: true })} />
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <label className="text-sm">Data Retention Years<Input type="number" className="mt-1" value={complianceForm.watch("compliance.dataRetention.years")} onChange={(event) => complianceForm.setValue("compliance.dataRetention.years", Number(event.target.value), { shouldValidate: true })} /></label>
                      <label className="text-sm">Audit Retention Days<Input type="number" className="mt-1" value={complianceForm.watch("compliance.auditRetentionDays")} onChange={(event) => complianceForm.setValue("compliance.auditRetentionDays", Number(event.target.value), { shouldValidate: true })} /></label>
                      <label className="text-sm">Export Retention Days<Input type="number" className="mt-1" value={complianceForm.watch("compliance.exportRetentionDays")} onChange={(event) => complianceForm.setValue("compliance.exportRetentionDays", Number(event.target.value), { shouldValidate: true })} /></label>
                    </div>
                  </GlassCard>
                  <FormFooter isPending={compliancePending} onReset={() => complianceForm.reset()} savedAt={complianceSavedAt} readOnly={!canEditByTab.compliance} />
                  </fieldset>
                </form>
              )}
            </TabsContent>

            <TabsContent value="personal" forceMount hidden={activeTab !== "personal"}>
              <form onSubmit={onSubmitPersonal} className="space-y-4">
                {!canEditByTab.personal ? <ReadOnlyNotice /> : null}
                <fieldset disabled={!canEditByTab.personal} className="space-y-4">
                <GlassCard>
                  <GlassSectionHeader title="Profile, Defaults, and Accessibility" description="Your personal ACTIFY setup and editing preferences." icon={UserCog} />
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="text-sm">Display Name<Input className="mt-1" {...personalForm.register("personal.profile.displayName")} /></label>
                    <label className="text-sm">Title<Input className="mt-1" {...personalForm.register("personal.profile.title")} /></label>
                    <label className="text-sm">Initials<Input className="mt-1" {...personalForm.register("personal.profile.initials")} /></label>
                    <label className="text-sm">Default Mood<Input className="mt-1" {...personalForm.register("personal.defaults.mood")} /></label>
                    <label className="text-sm">Default Cues<Input className="mt-1" {...personalForm.register("personal.defaults.cues")} /></label>
                    <label className="text-sm">Follow-up Default<Textarea rows={2} className="mt-1" {...personalForm.register("personal.defaults.followUpText")} /></label>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="text-sm">
                      Font Size
                      <Select value={personalForm.watch("personal.accessibility.fontSize")} onValueChange={(value) => personalForm.setValue("personal.accessibility.fontSize", value as "SM" | "MD" | "LG" | "XL", { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SM">SM</SelectItem>
                          <SelectItem value="MD">MD</SelectItem>
                          <SelectItem value="LG">LG</SelectItem>
                          <SelectItem value="XL">XL</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">
                      Default Landing
                      <Select value={personalForm.watch("account.defaultLanding")} onValueChange={(value) => personalForm.setValue("account.defaultLanding", value as DefaultLanding, { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DASHBOARD">Dashboard</SelectItem>
                          <SelectItem value="CALENDAR">Calendar</SelectItem>
                          <SelectItem value="NOTES">Notes</SelectItem>
                          <SelectItem value="RESIDENTS">Residents</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <GlassToggleRow label="High contrast" checked={personalForm.watch("personal.accessibility.highContrast")} onCheckedChange={(value) => personalForm.setValue("personal.accessibility.highContrast", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Reduce motion" checked={personalForm.watch("personal.accessibility.reduceMotion")} onCheckedChange={(value) => personalForm.setValue("personal.accessibility.reduceMotion", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Account reduce motion" checked={personalForm.watch("account.reduceMotion")} onCheckedChange={(value) => personalForm.setValue("account.reduceMotion", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Account high contrast" checked={personalForm.watch("account.highContrast")} onCheckedChange={(value) => personalForm.setValue("account.highContrast", value, { shouldValidate: true })} />
                    <GlassToggleRow label="Shortcuts enabled" checked={personalForm.watch("account.shortcutsEnabled")} onCheckedChange={(value) => personalForm.setValue("account.shortcutsEnabled", value, { shouldValidate: true })} />
                  </div>
                </GlassCard>

                <GlassCard>
                  <GlassSectionHeader title="Dashboard Widgets and Shortcuts" description="Pick widget set and personal slash-command expansions." icon={SlidersHorizontal} />
                  <div className="grid gap-3 md:grid-cols-2">
                    {Object.entries(widgetLabels).map(([key, label]) => {
                      const selected = personalForm.watch("personal.dashboard.widgets");
                      const checked = selected.includes(key);
                      return (
                        <label key={key} className="inline-flex items-center gap-2 rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              const current = personalForm.getValues("personal.dashboard.widgets");
                              const values = next
                                ? Array.from(new Set([...current, key]))
                                : current.filter((entry) => entry !== key);
                              personalForm.setValue("personal.dashboard.widgets", values, { shouldValidate: true });
                            }}
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Quick Text Shortcuts</p>
                    {personalForm.watch("personal.shortcuts").map((shortcut, index) => (
                      <div key={`shortcut-${index}`} className="grid gap-2 rounded-lg border border-white/70 bg-white/70 p-3 md:grid-cols-[200px_1fr_auto]">
                        <Input value={shortcut.slashCommand} placeholder="/cue" onChange={(event) => {
                          const current = personalForm.getValues("personal.shortcuts");
                          current[index] = { ...current[index], slashCommand: event.target.value };
                          personalForm.setValue("personal.shortcuts", [...current], { shouldValidate: true });
                        }} />
                        <Input value={shortcut.expansionText} placeholder="Resident required verbal cueing..." onChange={(event) => {
                          const current = personalForm.getValues("personal.shortcuts");
                          current[index] = { ...current[index], expansionText: event.target.value };
                          personalForm.setValue("personal.shortcuts", [...current], { shouldValidate: true });
                        }} />
                        <Button type="button" variant="outline" onClick={() => personalForm.setValue("personal.shortcuts", removeAt(personalForm.getValues("personal.shortcuts"), index), { shouldValidate: true })}>Remove</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => personalForm.setValue("personal.shortcuts", appendItem(personalForm.getValues("personal.shortcuts"), { slashCommand: "", expansionText: "" }), { shouldValidate: true })}>Add Shortcut</Button>
                  </div>
                </GlassCard>

                <GlassCard>
                  <GlassSectionHeader title="Notifications and Quick Phrases" description="Personal trigger overrides and quick phrase text list." icon={BellRing} />
                  <div className="grid gap-3 md:grid-cols-2">
                    {notificationTriggerOptions.map((option) => (
                      <GlassToggleRow
                        key={option.key}
                        label={option.label}
                        checked={Boolean(personalForm.watch(`personal.notifications.overrides.${option.key}`))}
                        onCheckedChange={(value) => personalForm.setValue(`personal.notifications.overrides.${option.key}`, value, { shouldValidate: true })}
                      />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="text-sm">
                      Account Font Scale
                      <Select value={personalForm.watch("account.fontScale")} onValueChange={(value) => personalForm.setValue("account.fontScale", value as FontScale, { shouldValidate: true })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SM">SM</SelectItem>
                          <SelectItem value="MD">MD</SelectItem>
                          <SelectItem value="LG">LG</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-sm">
                      Quick Phrases (one per line)
                      <Textarea
                        rows={8}
                        className="mt-1"
                        value={personalForm.watch("account.quickPhrases").join("\n")}
                        onChange={(event) => personalForm.setValue("account.quickPhrases", parseQuickPhrasesList(event.target.value), { shouldValidate: true })}
                      />
                    </label>
                  </div>
                </GlassCard>
                <FormFooter isPending={personalPending} onReset={() => personalForm.reset()} savedAt={personalSavedAt} readOnly={!canEditByTab.personal} />
                </fieldset>
              </form>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
