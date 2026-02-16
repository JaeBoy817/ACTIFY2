"use client";

import { type ComponentType, useEffect, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultLanding, FontScale, Role, RoomFormatRule } from "@prisma/client";
import { Building2, CreditCard, ShieldCheck, SlidersHorizontal, UserCog } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  upsertFacilitySettings,
  upsertUserSettings,
  updatePermissionsMatrix,
  updateUserRole
} from "@/lib/settings/actions";
import {
  asRolePermissionMatrix,
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
  updatePermissionsMatrixSchema
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
import { defaultModuleFlags, type ModuleFlags } from "@/lib/module-flags";

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

const settingsTabs: Array<{ value: SettingsTabKey; label: string; adminOnly?: boolean }> = [
  { value: "facility", label: "Facility" },
  { value: "roles", label: "Roles", adminOnly: true },
  { value: "modules", label: "Modules" },
  { value: "calendar", label: "Calendar" },
  { value: "docs", label: "Docs Rules" },
  { value: "careplan", label: "Care Plan" },
  { value: "reports", label: "Reports" },
  { value: "inventory", label: "Inventory" },
  { value: "notifications", label: "Notifications" },
  { value: "compliance", label: "Compliance", adminOnly: true },
  { value: "personal", label: "Personal" }
];

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  AD: "Activities Director",
  ASSISTANT: "Assistant",
  READ_ONLY: "Read Only"
};

const barrierOptions = [
  "ASLEEP",
  "BED_BOUND",
  "THERAPY",
  "AT_APPOINTMENT",
  "REFUSED",
  "NOT_INFORMED",
  "PAIN",
  "ISOLATION_PRECAUTIONS",
  "OTHER"
] as const;

const moduleLabels: Record<string, string> = {
  templates: "Templates",
  calendar: "Calendar",
  notes: "Notes",
  reports: "Reports",
  goals: "Goals",
  analytics: "Analytics",
  assessments: "Assessments",
  inventory: "Inventory",
  prizeCart: "Prize Cart",
  residentCouncil: "Resident Council",
  volunteers: "Volunteers",
  carePlan: "Care Plans",
  analyticsHeatmaps: "Analytics Heatmaps",
  familyEngagementNotes: "Family Engagement"
};

const advancedCoreLockedModules = new Set([
  "carePlan",
  "assessments",
  "volunteers",
  "inventory",
  "prizeCart",
  "residentCouncil",
  "analyticsHeatmaps",
  "familyEngagementNotes"
]);

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

type SettingsTabsProps = {
  initialTab: SettingsTabKey;
  role: Role;
  facilityName: string;
  facilityTimezone: string;
  users: Array<{ id: string; name: string; email: string; role: Role }>;
  units: Array<{ id: string; name: string }>;
  facilitySettings: {
    timezone: string;
    businessHours: { start: string; end: string; days: number[] };
    roomFormatRule: RoomFormatRule;
    roomFormatHint: string;
    policyFlags: {
      allowSmokingTracking: boolean;
      hideTriggersInPrint: boolean;
      maskSensitiveFieldsInPrint: boolean;
      maskFamilyContactInPrint: boolean;
    };
    moduleFlags: ModuleFlags;
    attendanceRules: {
      engagementWeights: { present: number; active: number; leading: number };
      requireBarrierNoteFor: string[];
      groupMinutes: number;
      oneToOneMinutes: number;
      locations: string[];
      warnTherapyOverlap: boolean;
      warnOutsideBusinessHours: boolean;
      useBusinessHoursDefaults: boolean;
    };
    documentationRules: {
      noteRequiredFields: Array<"participationLevel" | "moodAffect" | "cuesRequired" | "response" | "followUp">;
      minNarrativeLen: number;
      requireGoalLinkForOneToOne: boolean;
    };
    carePlanRules: {
      reviewCadenceDays: number;
      requirePersonalization: boolean;
      blockReviewCompletionIfGeneric: boolean;
    };
    reportSettings: {
      theme: "CLASSIC" | "CLEAN" | "LIQUID_GLASS";
      accent: "BLUE" | "MINT" | "CORAL";
      includeSections: {
        topPrograms: boolean;
        attendanceTrends: boolean;
        engagementAvg: boolean;
        barriersSummary: boolean;
        oneToOneTotals: boolean;
        notableOutcomes: boolean;
        unitHeatmap: boolean;
      };
    };
    printDefaults: {
      paperSize: "LETTER" | "A4";
      margins: "NORMAL" | "NARROW" | "WIDE";
      includeFooterMeta: boolean;
    };
    inventoryDefaults: {
      reorderThresholdMultiplier: number;
      showLowStockBanner: boolean;
    };
    prizeCartDefaults: {
      presets: Array<{ category: string; defaultPriceCents: number; reorderAt: number }>;
      enableRestockSuggestions: boolean;
      restockAggressiveness: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
    };
    notificationDefaults: {
      dailyDigestEnabled: boolean;
      dailyDigestTime: string;
      weeklyDigestEnabled: boolean;
      weeklyDigestDay: "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
      taskReminders: boolean;
      reminderLeadTimeMinutes: 15 | 30 | 60 | 120;
    };
    compliance: {
      auditRetentionDays: number;
      exportRetentionDays: number;
      hideTriggersInPrint: boolean;
      maskFamilyContactInPrint: boolean;
    };
    permissions: RolePermissionMatrix;
  };
  userSettings: {
    defaultLanding: DefaultLanding;
    reduceMotion: boolean;
    highContrast: boolean;
    fontScale: FontScale;
    myQuickPhrases: string[];
    shortcutsEnabled: boolean;
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
    <div className={cn("flex items-start justify-between gap-4 rounded-xl border border-white/70 bg-white/65 p-3", disabled && "opacity-70") }>
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
  saveLabel = "Save changes"
}: {
  isPending: boolean;
  onReset: () => void;
  savedAt: string | null;
  saveLabel?: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/70 px-3 py-2.5">
      <div className="text-xs text-foreground/70">{savedAt ? `Saved ${savedAt}` : "Changes are saved only when you click Save."}</div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onReset} disabled={isPending}>
          Reset
        </Button>
        <GlassButton type="submit" disabled={isPending}>
          {isPending ? "Saving..." : saveLabel}
        </GlassButton>
      </div>
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

export function SettingsTabs({
  initialTab,
  role,
  facilityName,
  facilityTimezone,
  users,
  units,
  facilitySettings,
  userSettings
}: SettingsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isAdmin = role === Role.ADMIN;

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

  const onTabChange = (nextTab: string) => {
    const next = nextTab as SettingsTabKey;
    setActiveTab(next);

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/app/settings?${params.toString()}`, { scroll: false });
  };

  const facilityForm = useForm<z.infer<typeof facilityTabSchema>>({
    resolver: zodResolver(facilityTabSchema),
    defaultValues: {
      facilityName,
      timezone: facilitySettings.timezone || facilityTimezone,
      useBusinessHoursDefaults: facilitySettings.attendanceRules.useBusinessHoursDefaults,
      roomFormatRule: facilitySettings.roomFormatRule,
      roomFormatHint: facilitySettings.roomFormatHint,
      allowSmokingTracking: facilitySettings.policyFlags.allowSmokingTracking,
      hideTriggersInPrint: facilitySettings.policyFlags.hideTriggersInPrint,
      maskSensitiveFieldsInPrint: facilitySettings.policyFlags.maskSensitiveFieldsInPrint,
      maskFamilyContactInPrint: facilitySettings.policyFlags.maskFamilyContactInPrint,
      businessHoursStart: facilitySettings.businessHours.start,
      businessHoursEnd: facilitySettings.businessHours.end,
      businessDays: facilitySettings.businessHours.days
    }
  });

  const [facilityPending, startFacilitySave] = useTransition();
  const [facilitySavedAt, setFacilitySavedAt] = useState<string | null>(null);

  const onSubmitFacility = facilityForm.handleSubmit((values) => {
    startFacilitySave(async () => {
      try {
        const result = await upsertFacilitySettings({ section: "facility", values });
        setFacilitySavedAt(formatSavedAt(result.updatedAt));
        facilityForm.reset(values);
        router.refresh();
        toast({ title: "Facility settings saved" });
      } catch (error) {
        toast({
          title: "Failed to save facility settings",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  });

  const permissionsForm = useForm<z.infer<typeof updatePermissionsMatrixSchema>>({
    resolver: zodResolver(updatePermissionsMatrixSchema),
    defaultValues: {
      permissionsJson: asRolePermissionMatrix(facilitySettings.permissions)
    }
  });

  const [permissionsPending, startPermissionsSave] = useTransition();
  const [permissionsSavedAt, setPermissionsSavedAt] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<string, Role>>(
    users.reduce<Record<string, Role>>((acc, user) => {
      acc[user.id] = user.role;
      return acc;
    }, {})
  );
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const onSubmitPermissions = permissionsForm.handleSubmit((values) => {
    startPermissionsSave(async () => {
      try {
        const result = await updatePermissionsMatrix(values);
        setPermissionsSavedAt(formatSavedAt(result.updatedAt));
        permissionsForm.reset(values);
        toast({ title: "Permissions matrix saved" });
      } catch (error) {
        toast({
          title: "Failed to save permissions",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  });

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

  const modulesForm = useForm<z.infer<typeof modulesTabSchema>>({
    resolver: zodResolver(modulesTabSchema),
    defaultValues: {
      mode: facilitySettings.moduleFlags.mode,
      modules: {
        ...defaultModuleFlags.modules,
        ...facilitySettings.moduleFlags.modules
      }
    }
  });
  const [modulesPending, startModulesSave] = useTransition();
  const [modulesSavedAt, setModulesSavedAt] = useState<string | null>(null);

  const moduleMode = modulesForm.watch("mode");

  const onSubmitModules = modulesForm.handleSubmit((values) => {
    const nextModules = { ...values.modules };
    if (values.mode === "CORE_WORKFLOW") {
      for (const key of Object.keys(nextModules)) {
        if (advancedCoreLockedModules.has(key)) {
          nextModules[key as keyof typeof nextModules] = false;
        }
      }
    }

    startModulesSave(async () => {
      try {
        const result = await upsertFacilitySettings({
          section: "modules",
          values: {
            mode: values.mode,
            modules: nextModules
          }
        });
        setModulesSavedAt(formatSavedAt(result.updatedAt));
        modulesForm.reset({
          mode: values.mode,
          modules: nextModules
        });
        toast({ title: "Module settings saved" });
      } catch (error) {
        toast({
          title: "Failed to save module settings",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  });

  const calendarForm = useForm<z.infer<typeof calendarTabSchema>>({
    resolver: zodResolver(calendarTabSchema),
    defaultValues: {
      groupMinutes: facilitySettings.attendanceRules.groupMinutes,
      oneToOneMinutes: facilitySettings.attendanceRules.oneToOneMinutes,
      locations: facilitySettings.attendanceRules.locations,
      warnTherapyOverlap: facilitySettings.attendanceRules.warnTherapyOverlap,
      warnOutsideBusinessHours: facilitySettings.attendanceRules.warnOutsideBusinessHours
    }
  });

  const [calendarPending, startCalendarSave] = useTransition();
  const [calendarSavedAt, setCalendarSavedAt] = useState<string | null>(null);

  const onSubmitCalendar = calendarForm.handleSubmit((values) => {
    const locations = Array.from(new Set(values.locations.map((item) => item.trim()).filter(Boolean)));

    startCalendarSave(async () => {
      try {
        const result = await upsertFacilitySettings({
          section: "calendar",
          values: {
            ...values,
            locations
          }
        });
        setCalendarSavedAt(formatSavedAt(result.updatedAt));
        calendarForm.reset({
          ...values,
          locations
        });
        toast({ title: "Calendar defaults saved" });
      } catch (error) {
        toast({
          title: "Failed to save calendar defaults",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  });

  const docsForm = useForm<z.infer<typeof docsTabSchema>>({
    resolver: zodResolver(docsTabSchema),
    defaultValues: {
      presentWeight: facilitySettings.attendanceRules.engagementWeights.present,
      activeWeight: facilitySettings.attendanceRules.engagementWeights.active,
      leadingWeight: facilitySettings.attendanceRules.engagementWeights.leading,
      requireNoteForBarriers: facilitySettings.attendanceRules.requireBarrierNoteFor,
      noteRequiredFields: facilitySettings.documentationRules.noteRequiredFields,
      minNarrativeLen: facilitySettings.documentationRules.minNarrativeLen,
      requireGoalLinkForOneToOne: facilitySettings.documentationRules.requireGoalLinkForOneToOne
    }
  });

  const [docsPending, startDocsSave] = useTransition();
  const [docsSavedAt, setDocsSavedAt] = useState<string | null>(null);

  const onSubmitDocs = docsForm.handleSubmit((values) => {
    startDocsSave(async () => {
      try {
        const result = await upsertFacilitySettings({ section: "docs", values });
        setDocsSavedAt(formatSavedAt(result.updatedAt));
        docsForm.reset(values);
        toast({ title: "Documentation rules saved" });
      } catch (error) {
        toast({
          title: "Failed to save documentation rules",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
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
      cadencePreset: cadencePresetValue as "30" | "60" | "90" | "CUSTOM",
      customCadenceDays: cadencePresetValue === "CUSTOM" ? facilitySettings.carePlanRules.reviewCadenceDays : undefined,
      requirePersonalization: facilitySettings.carePlanRules.requirePersonalization,
      blockReviewCompletionIfGeneric: facilitySettings.carePlanRules.blockReviewCompletionIfGeneric
    }
  });

  const [carePlanPending, startCarePlanSave] = useTransition();
  const [carePlanSavedAt, setCarePlanSavedAt] = useState<string | null>(null);

  const onSubmitCarePlan = carePlanForm.handleSubmit((values) => {
    startCarePlanSave(async () => {
      try {
        const result = await upsertFacilitySettings({ section: "careplan", values });
        setCarePlanSavedAt(formatSavedAt(result.updatedAt));
        carePlanForm.reset(values);
        toast({ title: "Care plan rules saved" });
      } catch (error) {
        toast({
          title: "Failed to save care plan rules",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  });

  const reportsForm = useForm<z.infer<typeof reportsTabSchema>>({
    resolver: zodResolver(reportsTabSchema),
    defaultValues: {
      theme: facilitySettings.reportSettings.theme,
      accent: facilitySettings.reportSettings.accent,
      includeSections: facilitySettings.reportSettings.includeSections,
      paperSize: facilitySettings.printDefaults.paperSize,
      margins: facilitySettings.printDefaults.margins,
      includeFooterMeta: facilitySettings.printDefaults.includeFooterMeta
    }
  });

  const [reportsPending, startReportsSave] = useTransition();
  const [reportsSavedAt, setReportsSavedAt] = useState<string | null>(null);

  const onSubmitReports = reportsForm.handleSubmit((values) => {
    startReportsSave(async () => {
      try {
        const result = await upsertFacilitySettings({ section: "reports", values });
        setReportsSavedAt(formatSavedAt(result.updatedAt));
        reportsForm.reset(values);
        toast({ title: "Report defaults saved" });
      } catch (error) {
        toast({
          title: "Failed to save report defaults",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  });

  const inventoryForm = useForm<z.infer<typeof inventoryTabSchema>>({
    resolver: zodResolver(inventoryTabSchema),
    defaultValues: {
      reorderThresholdMultiplier: facilitySettings.inventoryDefaults.reorderThresholdMultiplier,
      showLowStockBanner: facilitySettings.inventoryDefaults.showLowStockBanner,
      presets: facilitySettings.prizeCartDefaults.presets,
      enableRestockSuggestions: facilitySettings.prizeCartDefaults.enableRestockSuggestions,
      restockAggressiveness: facilitySettings.prizeCartDefaults.restockAggressiveness
    }
  });

  const presetsFieldArray = useFieldArray({
    control: inventoryForm.control,
    name: "presets"
  });

  const [inventoryPending, startInventorySave] = useTransition();
  const [inventorySavedAt, setInventorySavedAt] = useState<string | null>(null);

  const onSubmitInventory = inventoryForm.handleSubmit((values) => {
    startInventorySave(async () => {
      try {
        const result = await upsertFacilitySettings({ section: "inventory", values });
        setInventorySavedAt(formatSavedAt(result.updatedAt));
        inventoryForm.reset(values);
        toast({ title: "Inventory and prize defaults saved" });
      } catch (error) {
        toast({
          title: "Failed to save inventory defaults",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  });

  const notificationsForm = useForm<z.infer<typeof notificationsTabSchema>>({
    resolver: zodResolver(notificationsTabSchema),
    defaultValues: {
      dailyDigestEnabled: facilitySettings.notificationDefaults.dailyDigestEnabled,
      dailyDigestTime: facilitySettings.notificationDefaults.dailyDigestTime,
      weeklyDigestEnabled: facilitySettings.notificationDefaults.weeklyDigestEnabled,
      weeklyDigestDay: facilitySettings.notificationDefaults.weeklyDigestDay,
      taskReminders: facilitySettings.notificationDefaults.taskReminders,
      reminderLeadTimeMinutes: String(facilitySettings.notificationDefaults.reminderLeadTimeMinutes) as "15" | "30" | "60" | "120"
    }
  });

  const [notificationsPending, startNotificationsSave] = useTransition();
  const [notificationsSavedAt, setNotificationsSavedAt] = useState<string | null>(null);

  const onSubmitNotifications = notificationsForm.handleSubmit((values) => {
    startNotificationsSave(async () => {
      try {
        const result = await upsertFacilitySettings({ section: "notifications", values });
        setNotificationsSavedAt(formatSavedAt(result.updatedAt));
        notificationsForm.reset(values);
        toast({ title: "Notification defaults saved" });
      } catch (error) {
        toast({
          title: "Failed to save notification defaults",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  });

  const complianceForm = useForm<z.infer<typeof complianceTabSchema>>({
    resolver: zodResolver(complianceTabSchema),
    defaultValues: {
      auditRetentionDays: facilitySettings.compliance.auditRetentionDays,
      exportRetentionDays: facilitySettings.compliance.exportRetentionDays,
      hideTriggersInPrint: facilitySettings.compliance.hideTriggersInPrint,
      maskFamilyContactInPrint: facilitySettings.compliance.maskFamilyContactInPrint
    }
  });

  const [compliancePending, startComplianceSave] = useTransition();
  const [complianceSavedAt, setComplianceSavedAt] = useState<string | null>(null);

  const onSubmitCompliance = complianceForm.handleSubmit((values) => {
    startComplianceSave(async () => {
      try {
        const result = await upsertFacilitySettings({ section: "compliance", values });
        setComplianceSavedAt(formatSavedAt(result.updatedAt));
        complianceForm.reset(values);
        toast({ title: "Compliance settings saved" });
      } catch (error) {
        toast({
          title: "Failed to save compliance settings",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  });

  const personalForm = useForm<z.infer<typeof personalTabSchema> & { quickPhrasesText: string }>({
    resolver: zodResolver(
      personalTabSchema.extend({
        quickPhrasesText: z.string().max(8000)
      })
    ),
    defaultValues: {
      defaultLanding: userSettings.defaultLanding,
      reduceMotion: userSettings.reduceMotion,
      highContrast: userSettings.highContrast,
      fontScale: userSettings.fontScale,
      quickPhrases: userSettings.myQuickPhrases,
      quickPhrasesText: userSettings.myQuickPhrases.join("\n"),
      shortcutsEnabled: userSettings.shortcutsEnabled
    }
  });

  const [personalPending, startPersonalSave] = useTransition();
  const [personalSavedAt, setPersonalSavedAt] = useState<string | null>(null);

  const onSubmitPersonal = personalForm.handleSubmit((values) => {
    const quickPhrases = parseQuickPhrasesList(values.quickPhrasesText);

    startPersonalSave(async () => {
      try {
        const result = await upsertUserSettings({
          values: {
            defaultLanding: values.defaultLanding,
            reduceMotion: values.reduceMotion,
            highContrast: values.highContrast,
            fontScale: values.fontScale,
            quickPhrases,
            shortcutsEnabled: values.shortcutsEnabled
          }
        });
        setPersonalSavedAt(formatSavedAt(result.updatedAt));
        personalForm.reset({
          ...values,
          quickPhrases,
          quickPhrasesText: quickPhrases.join("\n")
        });
        toast({ title: "Personal settings saved" });
      } catch (error) {
        toast({
          title: "Failed to save personal settings",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  });

  const filteredUsers = users.filter((user) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
  });

  const businessDayOptions = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" }
  ];

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
                <Badge variant="outline" className="bg-white/80">{facilityForm.watch("facilityName") || facilityName}</Badge>
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
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-xl border border-white/70 bg-white/70 p-2">
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg px-3 py-1.5 data-[state=active]:bg-actify-brand data-[state=active]:text-white">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="facility" forceMount hidden={activeTab !== "facility"}>
          <form onSubmit={onSubmitFacility} className="space-y-4">
            <GlassCard>
              <GlassSectionHeader
                title="Facility Identity"
                description="Timezone and scheduling defaults used across the workspace."
                icon={Building2}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Facility
                  <Input className="mt-1" {...facilityForm.register("facilityName")} />
                  {facilityForm.formState.errors.facilityName ? (
                    <p className="mt-1 text-xs text-destructive">{facilityForm.formState.errors.facilityName.message}</p>
                  ) : null}
                </label>
                <label className="text-sm">
                  Timezone
                  <Input className="mt-1" {...facilityForm.register("timezone")} />
                  {facilityForm.formState.errors.timezone ? (
                    <p className="mt-1 text-xs text-destructive">{facilityForm.formState.errors.timezone.message}</p>
                  ) : null}
                </label>
              </div>
              <div className="mt-4">
                <GlassToggleRow
                  label="Use business hours for scheduling defaults"
                  checked={facilityForm.watch("useBusinessHoursDefaults")}
                  onCheckedChange={(value) => facilityForm.setValue("useBusinessHoursDefaults", value)}
                />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Business hours start
                  <Input type="time" className="mt-1" {...facilityForm.register("businessHoursStart")} />
                </label>
                <label className="text-sm">
                  Business hours end
                  <Input type="time" className="mt-1" {...facilityForm.register("businessHoursEnd")} />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {businessDayOptions.map((day) => {
                  const selectedDays = facilityForm.watch("businessDays");
                  const checked = selectedDays.includes(day.value);
                  return (
                    <label key={day.value} className="inline-flex items-center gap-2 rounded-lg border border-white/70 bg-white/70 px-3 py-1.5 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          const current = facilityForm.getValues("businessDays");
                          const values = next
                            ? Array.from(new Set([...current, day.value])).sort((a, b) => a - b)
                            : current.filter((item) => item !== day.value);
                          facilityForm.setValue("businessDays", values, { shouldValidate: true });
                        }}
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="Units & Rooms" description="Room format and unit context used in lists and printouts." icon={SlidersHorizontal} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Room format rule
                  <Select
                    value={facilityForm.watch("roomFormatRule")}
                    onValueChange={(value) => facilityForm.setValue("roomFormatRule", value as RoomFormatRule, { shouldValidate: true })}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A_B">12A / 12B</SelectItem>
                      <SelectItem value="NUM">101 style</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                {facilityForm.watch("roomFormatRule") === "CUSTOM" ? (
                  <label className="text-sm">
                    Room format hint
                    <Input className="mt-1" placeholder="Example: East-101" {...facilityForm.register("roomFormatHint")} />
                  </label>
                ) : null}
              </div>
              <div className="mt-4 rounded-xl border border-white/70 bg-white/70 p-3">
                <p className="text-sm font-medium text-foreground">Existing units</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {units.map((unit) => (
                    <Badge key={unit.id} variant="outline" className="bg-white/80">{unit.name}</Badge>
                  ))}
                  {units.length === 0 ? <span className="text-xs text-foreground/70">No units found.</span> : null}
                </div>
                <div className="mt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/app/residents">Manage units and residents</Link>
                  </Button>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="Policies" description="Set what is tracked and how sensitive fields are handled in print." icon={ShieldCheck} />
              <div className="space-y-3">
                <GlassToggleRow
                  label="Allow smoking tracking"
                  checked={facilityForm.watch("allowSmokingTracking")}
                  onCheckedChange={(value) => facilityForm.setValue("allowSmokingTracking", value)}
                />
                <GlassToggleRow
                  label="Hide triggers in print"
                  checked={facilityForm.watch("hideTriggersInPrint")}
                  onCheckedChange={(value) => facilityForm.setValue("hideTriggersInPrint", value)}
                />
                <GlassToggleRow
                  label="Mask sensitive fields in print"
                  checked={facilityForm.watch("maskSensitiveFieldsInPrint")}
                  onCheckedChange={(value) => facilityForm.setValue("maskSensitiveFieldsInPrint", value)}
                />
                <GlassToggleRow
                  label="Mask family contact in print"
                  checked={facilityForm.watch("maskFamilyContactInPrint")}
                  onCheckedChange={(value) => facilityForm.setValue("maskFamilyContactInPrint", value)}
                />
              </div>
            </GlassCard>

            <FormFooter
              isPending={facilityPending}
              onReset={() => facilityForm.reset()}
              savedAt={facilitySavedAt}
            />
          </form>
        </TabsContent>

        <TabsContent value="roles" forceMount hidden={activeTab !== "roles"}>
          {!isAdmin ? (
            <GlassCard>
              <GlassSectionHeader title="Admin only" description="Only admins can view and edit role settings." icon={ShieldCheck} />
            </GlassCard>
          ) : (
            <div className="space-y-4">
              <form onSubmit={onSubmitPermissions} className="space-y-4">
                <GlassCard>
                  <GlassSectionHeader title="Role Matrix" description="Set role-based permissions for this facility." icon={ShieldCheck} />
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
                        {settingsPermissionKeys.map((key) => (
                          <TableRow key={key}>
                            <TableCell className="font-medium">{sectionLabels[key]}</TableCell>
                            {(["ADMIN", "AD", "ASSISTANT", "READ_ONLY"] as const).map((roleKey) => (
                              <TableCell key={roleKey}>
                                <Checkbox
                                  checked={permissionsForm.watch(`permissionsJson.${roleKey}.${key}`)}
                                  disabled={roleKey === "READ_ONLY"}
                                  onCheckedChange={(next) => {
                                    permissionsForm.setValue(`permissionsJson.${roleKey}.${key}`, Boolean(next), {
                                      shouldValidate: true
                                    });
                                  }}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </GlassCard>
                <FormFooter isPending={permissionsPending} onReset={() => permissionsForm.reset()} savedAt={permissionsSavedAt} />
              </form>

              <GlassCard>
                <GlassSectionHeader title="User Role Assignment" description="Search users and assign roles." icon={UserCog} />
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
            </div>
          )}
        </TabsContent>

        <TabsContent value="modules" forceMount hidden={activeTab !== "modules"}>
          <form onSubmit={onSubmitModules} className="space-y-4">
            <GlassCard>
              <GlassSectionHeader title="Mode" description="Core Workflow keeps essentials. Full Toolkit enables everything." icon={SlidersHorizontal} />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="rounded-xl border border-white/70 bg-white/70 p-3 text-sm font-medium">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={moduleMode === "CORE_WORKFLOW"}
                    onChange={() => modulesForm.setValue("mode", "CORE_WORKFLOW")}
                  />
                  Core Workflow
                </label>
                <label className="rounded-xl border border-white/70 bg-white/70 p-3 text-sm font-medium">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={moduleMode === "FULL_TOOLKIT"}
                    onChange={() => modulesForm.setValue("mode", "FULL_TOOLKIT")}
                  />
                  Full Toolkit
                </label>
              </div>
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="Module Toggles" description="Show or hide modules in the app." icon={SlidersHorizontal} />
              <div className="grid gap-3 md:grid-cols-2">
                {Object.keys(modulesForm.watch("modules") ?? {}).map((moduleKey) => {
                  const locked = moduleMode === "CORE_WORKFLOW" && advancedCoreLockedModules.has(moduleKey);
                  const moduleValues = modulesForm.watch("modules");
                  return (
                    <GlassToggleRow
                      key={moduleKey}
                      label={moduleLabels[moduleKey] ?? moduleKey}
                      description={locked ? "Locked in Core Workflow" : undefined}
                      checked={Boolean(moduleValues[moduleKey as keyof ModuleFlags["modules"]])}
                      disabled={locked}
                      onCheckedChange={(value) => {
                        modulesForm.setValue("modules", {
                          ...moduleValues,
                          [moduleKey]: value
                        });
                      }}
                    />
                  );
                })}
              </div>
            </GlassCard>

            <FormFooter isPending={modulesPending} onReset={() => modulesForm.reset()} savedAt={modulesSavedAt} />
          </form>
        </TabsContent>

        <TabsContent value="calendar" forceMount hidden={activeTab !== "calendar"}>
          <form onSubmit={onSubmitCalendar} className="space-y-4">
            <GlassCard>
              <GlassSectionHeader title="Default Durations" description="Used when creating new activities quickly." icon={SlidersHorizontal} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Group minutes
                  <Input
                    type="number"
                    min={15}
                    max={240}
                    className="mt-1"
                    value={calendarForm.watch("groupMinutes")}
                    onChange={(event) => calendarForm.setValue("groupMinutes", Number(event.target.value), { shouldValidate: true })}
                  />
                </label>
                <label className="text-sm">
                  1:1 minutes
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    className="mt-1"
                    value={calendarForm.watch("oneToOneMinutes")}
                    onChange={(event) => calendarForm.setValue("oneToOneMinutes", Number(event.target.value), { shouldValidate: true })}
                  />
                </label>
              </div>
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="Default Locations" description="One per line. Duplicates are removed on save." icon={Building2} />
              <Textarea
                rows={6}
                value={calendarForm.watch("locations").join("\n")}
                onChange={(event) => {
                  const values = event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean);
                  calendarForm.setValue("locations", values, { shouldValidate: true });
                }}
              />
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="Conflict Warnings" description="Warn staff before scheduling conflicts." icon={ShieldCheck} />
              <div className="space-y-3">
                <GlassToggleRow
                  label="Warn on therapy overlap"
                  checked={calendarForm.watch("warnTherapyOverlap")}
                  onCheckedChange={(value) => calendarForm.setValue("warnTherapyOverlap", value)}
                />
                <GlassToggleRow
                  label="Warn outside business hours"
                  checked={calendarForm.watch("warnOutsideBusinessHours")}
                  onCheckedChange={(value) => calendarForm.setValue("warnOutsideBusinessHours", value)}
                />
              </div>
            </GlassCard>

            <FormFooter isPending={calendarPending} onReset={() => calendarForm.reset()} savedAt={calendarSavedAt} />
          </form>
        </TabsContent>

        <TabsContent value="docs" forceMount hidden={activeTab !== "docs"}>
          <form onSubmit={onSubmitDocs} className="space-y-4">
            <GlassCard>
              <GlassSectionHeader title="Engagement Scoring" description="Weights used for present, active, and leading calculations." icon={SlidersHorizontal} />
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm">
                  Present weight
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    className="mt-1"
                    value={docsForm.watch("presentWeight")}
                    onChange={(event) => docsForm.setValue("presentWeight", Number(event.target.value), { shouldValidate: true })}
                  />
                </label>
                <label className="text-sm">
                  Active weight
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    className="mt-1"
                    value={docsForm.watch("activeWeight")}
                    onChange={(event) => docsForm.setValue("activeWeight", Number(event.target.value), { shouldValidate: true })}
                  />
                </label>
                <label className="text-sm">
                  Leading weight
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    className="mt-1"
                    value={docsForm.watch("leadingWeight")}
                    onChange={(event) => docsForm.setValue("leadingWeight", Number(event.target.value), { shouldValidate: true })}
                  />
                </label>
              </div>
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="Barrier Reasons" description="Require notes for selected barriers." icon={ShieldCheck} />
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {barrierOptions.map((barrier) => {
                  const selected = docsForm.watch("requireNoteForBarriers");
                  const checked = selected.includes(barrier);
                  return (
                    <label key={barrier} className="inline-flex items-center gap-2 rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          const current = docsForm.getValues("requireNoteForBarriers");
                          const values = next
                            ? Array.from(new Set([...current, barrier]))
                            : current.filter((item) => item !== barrier);
                          docsForm.setValue("requireNoteForBarriers", values, { shouldValidate: true });
                        }}
                      />
                      {barrier.replaceAll("_", " ")}
                    </label>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="Progress Note Requirements" description="Set required fields and narrative minimum." icon={UserCog} />
              <div className="grid gap-2 sm:grid-cols-2">
                {(["participationLevel", "moodAffect", "cuesRequired", "response", "followUp"] as const).map((field) => {
                  const selected = docsForm.watch("noteRequiredFields");
                  const checked = selected.includes(field);
                  return (
                    <label key={field} className="inline-flex items-center gap-2 rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          const current = docsForm.getValues("noteRequiredFields");
                          const values = next
                            ? Array.from(new Set([...current, field]))
                            : current.filter((item) => item !== field);
                          docsForm.setValue("noteRequiredFields", values, { shouldValidate: true });
                        }}
                      />
                      {field}
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Minimum narrative length
                  <Input
                    type="number"
                    min={0}
                    max={400}
                    className="mt-1"
                    value={docsForm.watch("minNarrativeLen")}
                    onChange={(event) => docsForm.setValue("minNarrativeLen", Number(event.target.value), { shouldValidate: true })}
                  />
                </label>
                <div className="pt-5">
                  <GlassToggleRow
                    label="Require goal link for 1:1 notes"
                    checked={docsForm.watch("requireGoalLinkForOneToOne")}
                    onCheckedChange={(value) => docsForm.setValue("requireGoalLinkForOneToOne", value)}
                  />
                </div>
              </div>
            </GlassCard>

            <FormFooter isPending={docsPending} onReset={() => docsForm.reset()} savedAt={docsSavedAt} />
          </form>
        </TabsContent>

        <TabsContent value="careplan" forceMount hidden={activeTab !== "careplan"}>
          <form onSubmit={onSubmitCarePlan} className="space-y-4">
            <GlassCard>
              <GlassSectionHeader title="Review Cadence" description="How often care plan reviews are expected." icon={ShieldCheck} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Cadence
                  <Select
                    value={carePlanForm.watch("cadencePreset")}
                    onValueChange={(value) => carePlanForm.setValue("cadencePreset", value as "30" | "60" | "90" | "CUSTOM", { shouldValidate: true })}
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
                {carePlanForm.watch("cadencePreset") === "CUSTOM" ? (
                  <label className="text-sm">
                    Custom days
                    <Input
                      type="number"
                      min={7}
                      max={180}
                      className="mt-1"
                      value={carePlanForm.watch("customCadenceDays") ?? ""}
                      onChange={(event) => carePlanForm.setValue("customCadenceDays", Number(event.target.value), { shouldValidate: true })}
                    />
                  </label>
                ) : null}
              </div>
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="Personalization Guardrails" description="Keep interventions personalized and practical." icon={UserCog} />
              <div className="space-y-3">
                <GlassToggleRow
                  label="Require personalization"
                  checked={carePlanForm.watch("requirePersonalization")}
                  onCheckedChange={(value) => carePlanForm.setValue("requirePersonalization", value)}
                />
                <GlassToggleRow
                  label="Block review completion when generic"
                  checked={carePlanForm.watch("blockReviewCompletionIfGeneric")}
                  onCheckedChange={(value) => carePlanForm.setValue("blockReviewCompletionIfGeneric", value)}
                />
              </div>
            </GlassCard>

            <FormFooter isPending={carePlanPending} onReset={() => carePlanForm.reset()} savedAt={carePlanSavedAt} />
          </form>
        </TabsContent>

        <TabsContent value="reports" forceMount hidden={activeTab !== "reports"}>
          <form onSubmit={onSubmitReports} className="space-y-4">
            <GlassCard>
              <GlassSectionHeader title="Report Theme" description="Set default PDF/preview styling and sections." icon={Building2} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Theme
                  <Select
                    value={reportsForm.watch("theme")}
                    onValueChange={(value) => reportsForm.setValue("theme", value as "CLASSIC" | "CLEAN" | "LIQUID_GLASS")}
                  >
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
                  <Select
                    value={reportsForm.watch("accent")}
                    onValueChange={(value) => reportsForm.setValue("accent", value as "BLUE" | "MINT" | "CORAL")}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BLUE">Blue</SelectItem>
                      <SelectItem value="MINT">Mint</SelectItem>
                      <SelectItem value="CORAL">Coral</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(Object.keys(reportsForm.watch("includeSections")) as Array<keyof z.infer<typeof reportsTabSchema>["includeSections"]>).map((sectionKey) => (
                  <GlassToggleRow
                    key={sectionKey}
                    label={sectionKey}
                    checked={reportsForm.watch(`includeSections.${sectionKey}`)}
                    onCheckedChange={(value) => reportsForm.setValue(`includeSections.${sectionKey}`, value, { shouldValidate: true })}
                  />
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="Print Defaults" description="Paper and footer defaults for print and export." icon={CreditCard} />
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm">
                  Paper size
                  <Select
                    value={reportsForm.watch("paperSize")}
                    onValueChange={(value) => reportsForm.setValue("paperSize", value as "LETTER" | "A4")}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LETTER">LETTER</SelectItem>
                      <SelectItem value="A4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="text-sm">
                  Margins
                  <Select
                    value={reportsForm.watch("margins")}
                    onValueChange={(value) => reportsForm.setValue("margins", value as "NORMAL" | "NARROW" | "WIDE")}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="NARROW">Narrow</SelectItem>
                      <SelectItem value="WIDE">Wide</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <div className="pt-5">
                  <GlassToggleRow
                    label="Include footer metadata"
                    checked={reportsForm.watch("includeFooterMeta")}
                    onCheckedChange={(value) => reportsForm.setValue("includeFooterMeta", value)}
                  />
                </div>
              </div>
            </GlassCard>

            <FormFooter isPending={reportsPending} onReset={() => reportsForm.reset()} savedAt={reportsSavedAt} />
          </form>
        </TabsContent>

        <TabsContent value="inventory" forceMount hidden={activeTab !== "inventory"}>
          <form onSubmit={onSubmitInventory} className="space-y-4">
            <GlassCard>
              <GlassSectionHeader title="Inventory Defaults" description="Defaults for reorder behavior and low-stock visibility." icon={SlidersHorizontal} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Reorder threshold multiplier
                  <Input
                    type="number"
                    min={0.5}
                    max={3}
                    step="0.1"
                    className="mt-1"
                    value={inventoryForm.watch("reorderThresholdMultiplier")}
                    onChange={(event) => inventoryForm.setValue("reorderThresholdMultiplier", Number(event.target.value), { shouldValidate: true })}
                  />
                </label>
                <div className="pt-5">
                  <GlassToggleRow
                    label="Show low stock banner"
                    checked={inventoryForm.watch("showLowStockBanner")}
                    onCheckedChange={(value) => inventoryForm.setValue("showLowStockBanner", value)}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="Prize Cart Presets" description="Set category defaults for price and reorder levels." icon={Building2} />
              <div className="space-y-2">
                {presetsFieldArray.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-2 rounded-lg border border-white/70 bg-white/70 p-3 md:grid-cols-[1fr_180px_140px_auto]">
                    <Input
                      placeholder="Category"
                      value={inventoryForm.watch(`presets.${index}.category`) ?? ""}
                      onChange={(event) => inventoryForm.setValue(`presets.${index}.category`, event.target.value, { shouldValidate: true })}
                    />
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Price cents"
                      value={inventoryForm.watch(`presets.${index}.defaultPriceCents`) ?? 0}
                      onChange={(event) => inventoryForm.setValue(`presets.${index}.defaultPriceCents`, Number(event.target.value), { shouldValidate: true })}
                    />
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Reorder at"
                      value={inventoryForm.watch(`presets.${index}.reorderAt`) ?? 0}
                      onChange={(event) => inventoryForm.setValue(`presets.${index}.reorderAt`, Number(event.target.value), { shouldValidate: true })}
                    />
                    <Button type="button" variant="outline" onClick={() => presetsFieldArray.remove(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => presetsFieldArray.append({ category: "", defaultPriceCents: 0, reorderAt: 0 })}
                >
                  Add preset
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                <GlassToggleRow
                  label="Enable restock suggestions"
                  checked={inventoryForm.watch("enableRestockSuggestions")}
                  onCheckedChange={(value) => inventoryForm.setValue("enableRestockSuggestions", value)}
                />
                <label className="text-sm">
                  Restock aggressiveness
                  <Select
                    value={inventoryForm.watch("restockAggressiveness")}
                    onValueChange={(value) => inventoryForm.setValue("restockAggressiveness", value as "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE")}
                  >
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

            <FormFooter isPending={inventoryPending} onReset={() => inventoryForm.reset()} savedAt={inventorySavedAt} />
          </form>
        </TabsContent>

        <TabsContent value="notifications" forceMount hidden={activeTab !== "notifications"}>
          <form onSubmit={onSubmitNotifications} className="space-y-4">
            <GlassCard>
              <GlassSectionHeader title="Digests" description="Choose digest schedule defaults." icon={Building2} />
              <div className="space-y-3">
                <GlassToggleRow
                  label="Daily digest"
                  checked={notificationsForm.watch("dailyDigestEnabled")}
                  onCheckedChange={(value) => notificationsForm.setValue("dailyDigestEnabled", value)}
                />
                <label className="text-sm">
                  Daily digest time
                  <Input
                    type="time"
                    className="mt-1"
                    value={notificationsForm.watch("dailyDigestTime") || ""}
                    onChange={(event) => notificationsForm.setValue("dailyDigestTime", event.target.value, { shouldValidate: true })}
                  />
                </label>
                <GlassToggleRow
                  label="Weekly digest"
                  checked={notificationsForm.watch("weeklyDigestEnabled")}
                  onCheckedChange={(value) => notificationsForm.setValue("weeklyDigestEnabled", value)}
                />
                <label className="text-sm">
                  Weekly digest day
                  <Select
                    value={notificationsForm.watch("weeklyDigestDay")}
                    onValueChange={(value) => notificationsForm.setValue("weeklyDigestDay", value as "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT")}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUN">Sunday</SelectItem>
                      <SelectItem value="MON">Monday</SelectItem>
                      <SelectItem value="TUE">Tuesday</SelectItem>
                      <SelectItem value="WED">Wednesday</SelectItem>
                      <SelectItem value="THU">Thursday</SelectItem>
                      <SelectItem value="FRI">Friday</SelectItem>
                      <SelectItem value="SAT">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="Reminders" description="Set reminder defaults for tasks and events." icon={SlidersHorizontal} />
              <div className="space-y-3">
                <GlassToggleRow
                  label="Task reminders"
                  checked={notificationsForm.watch("taskReminders")}
                  onCheckedChange={(value) => notificationsForm.setValue("taskReminders", value)}
                />
                <label className="text-sm">
                  Reminder lead time
                  <Select
                    value={notificationsForm.watch("reminderLeadTimeMinutes")}
                    onValueChange={(value) => notificationsForm.setValue("reminderLeadTimeMinutes", value as "15" | "30" | "60" | "120")}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </GlassCard>

            <FormFooter isPending={notificationsPending} onReset={() => notificationsForm.reset()} savedAt={notificationsSavedAt} />
          </form>
        </TabsContent>

        <TabsContent value="compliance" forceMount hidden={activeTab !== "compliance"}>
          {!isAdmin ? (
            <GlassCard>
              <GlassSectionHeader title="Admin only" description="Only admins can change compliance retention settings." icon={ShieldCheck} />
            </GlassCard>
          ) : (
            <form onSubmit={onSubmitCompliance} className="space-y-4">
              <GlassCard>
                <GlassSectionHeader title="Retention" description="Set retention windows for audit and exports." icon={ShieldCheck} />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    Audit retention days
                    <Input
                      type="number"
                      min={30}
                      max={3650}
                      className="mt-1"
                      value={complianceForm.watch("auditRetentionDays")}
                      onChange={(event) => complianceForm.setValue("auditRetentionDays", Number(event.target.value), { shouldValidate: true })}
                    />
                  </label>
                  <label className="text-sm">
                    Export retention days
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      className="mt-1"
                      value={complianceForm.watch("exportRetentionDays")}
                      onChange={(event) => complianceForm.setValue("exportRetentionDays", Number(event.target.value), { shouldValidate: true })}
                    />
                  </label>
                </div>
              </GlassCard>

              <GlassCard>
                <GlassSectionHeader title="Print Masking" description="Mask sensitive values in printed/exported materials." icon={ShieldCheck} />
                <div className="space-y-3">
                  <GlassToggleRow
                    label="Hide triggers in print"
                    checked={complianceForm.watch("hideTriggersInPrint")}
                    onCheckedChange={(value) => complianceForm.setValue("hideTriggersInPrint", value)}
                  />
                  <GlassToggleRow
                    label="Mask family contact in print"
                    checked={complianceForm.watch("maskFamilyContactInPrint")}
                    onCheckedChange={(value) => complianceForm.setValue("maskFamilyContactInPrint", value)}
                  />
                </div>
              </GlassCard>

              <FormFooter isPending={compliancePending} onReset={() => complianceForm.reset()} savedAt={complianceSavedAt} />
            </form>
          )}
        </TabsContent>

        <TabsContent value="personal" forceMount hidden={activeTab !== "personal"}>
          <form onSubmit={onSubmitPersonal} className="space-y-4">
            <GlassCard>
              <GlassSectionHeader title="Your Preferences" description="Set personal defaults for landing and accessibility." icon={UserCog} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Default landing
                  <Select
                    value={personalForm.watch("defaultLanding")}
                    onValueChange={(value) => personalForm.setValue("defaultLanding", value as DefaultLanding)}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DASHBOARD">Dashboard</SelectItem>
                      <SelectItem value="CALENDAR">Calendar</SelectItem>
                      <SelectItem value="NOTES">Notes</SelectItem>
                      <SelectItem value="RESIDENTS">Residents</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="text-sm">
                  Font scale
                  <Select
                    value={personalForm.watch("fontScale")}
                    onValueChange={(value) => personalForm.setValue("fontScale", value as FontScale)}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SM">Small</SelectItem>
                      <SelectItem value="MD">Medium</SelectItem>
                      <SelectItem value="LG">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <div className="mt-4 space-y-3">
                <GlassToggleRow
                  label="Reduce motion"
                  checked={personalForm.watch("reduceMotion")}
                  onCheckedChange={(value) => personalForm.setValue("reduceMotion", value)}
                />
                <GlassToggleRow
                  label="High contrast"
                  checked={personalForm.watch("highContrast")}
                  onCheckedChange={(value) => personalForm.setValue("highContrast", value)}
                />
                <GlassToggleRow
                  label="Shortcuts enabled"
                  checked={personalForm.watch("shortcutsEnabled")}
                  onCheckedChange={(value) => personalForm.setValue("shortcutsEnabled", value)}
                />
              </div>
            </GlassCard>

            <GlassCard>
              <GlassSectionHeader title="My Quick Phrases" description="One phrase per line, up to 100 phrases." icon={Building2} />
              <Textarea
                rows={8}
                value={personalForm.watch("quickPhrasesText")}
                onChange={(event) => personalForm.setValue("quickPhrasesText", event.target.value, { shouldValidate: true })}
              />
            </GlassCard>

            <FormFooter isPending={personalPending} onReset={() => personalForm.reset()} savedAt={personalSavedAt} />
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
