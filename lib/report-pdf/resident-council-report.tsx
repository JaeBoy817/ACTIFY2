import React from "react";
import fs from "node:fs";
import path from "node:path";
import { Defs, Document, Image, LinearGradient, Page, Rect, Stop, Svg, Text, View, pdf } from "@react-pdf/renderer";

import { GlassCard, GlassPill, SectionHeader } from "./components";
import { defaultReportTheme, type ReportThemeTokens } from "./ReportTheme";
import { PDF_BODY_FONT, PDF_DISPLAY_FONT } from "./fonts";

export interface ResidentCouncilPdfItem {
  id: string;
  category: string;
  concern: string;
  followUp: string | null;
  status: "RESOLVED" | "UNRESOLVED";
  owner: string | null;
  updatedAt: Date;
}

export interface ResidentCouncilPdfMeeting {
  id: string;
  heldAt: Date;
  attendanceCount: number;
  notes: string | null;
  items: ResidentCouncilPdfItem[];
}

type ParsedMeetingSheet = {
  summary: string | null;
  residentsInAttendance: string[];
  departmentUpdates: Array<{ label: string; notes: string }>;
  oldBusiness: string | null;
  newBusiness: string | null;
  additionalNotes: string | null;
};

let cachedActifyLogoDataUri: string | undefined;

function getActifyLogoDataUri() {
  if (cachedActifyLogoDataUri !== undefined) {
    return cachedActifyLogoDataUri;
  }

  const candidates = [
    path.join(process.cwd(), "public", "actify-logo-liquid-glass-nodots.svg"),
    path.join(process.cwd(), "public", "actify-logo.svg")
  ];

  for (const filePath of candidates) {
    try {
      const svgContent = fs.readFileSync(filePath, "utf8");
      cachedActifyLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent, "utf8").toString("base64")}`;
      return cachedActifyLogoDataUri;
    } catch {
      // Continue to next candidate.
    }
  }

  cachedActifyLogoDataUri = "";
  return cachedActifyLogoDataUri;
}

function truncate(value: string | number | null | undefined, max = 120) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function collapseParsedSection(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.toLowerCase() === "not discussed.") return null;
  if (trimmed.toLowerCase() === "none.") return null;
  return trimmed;
}

function parseMeetingSheetNotes(notes?: string | null): ParsedMeetingSheet | null {
  if (!notes) return null;
  const normalized = notes.replace(/\r\n/g, "\n");

  if (
    !normalized.includes("Summary:") ||
    !normalized.includes("Residents in Attendance:") ||
    !normalized.includes("Department Updates:")
  ) {
    return null;
  }

  const summaryLines: string[] = [];
  const oldBusinessLines: string[] = [];
  const newBusinessLines: string[] = [];
  const additionalLines: string[] = [];
  const residentsInAttendance: string[] = [];
  const departmentUpdates: Array<{ label: string; notes: string }> = [];
  let lastDepartmentIndex = -1;

  let section:
    | "summary"
    | "residents"
    | "departments"
    | "oldBusiness"
    | "newBusiness"
    | "additional"
    | null = null;

  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "Summary:") {
      section = "summary";
      continue;
    }
    if (trimmed === "Residents in Attendance:") {
      section = "residents";
      continue;
    }
    if (trimmed === "Department Updates:") {
      section = "departments";
      continue;
    }
    if (trimmed === "Old Business:") {
      section = "oldBusiness";
      continue;
    }
    if (trimmed === "New Business:") {
      section = "newBusiness";
      continue;
    }
    if (trimmed === "Additional Notes:") {
      section = "additional";
      continue;
    }

    if (section === "residents") {
      if (trimmed.startsWith("- ")) {
        const value = trimmed.slice(2).trim();
        if (value && value.toLowerCase() !== "none listed") {
          residentsInAttendance.push(value);
        }
      }
      continue;
    }

    if (section === "departments") {
      if (trimmed.startsWith("- ")) {
        const value = trimmed.slice(2).trim();
        if (value.toLowerCase() !== "no department updates recorded.") {
          const separatorIndex = value.indexOf(":");
          if (separatorIndex > 0) {
            const label = value.slice(0, separatorIndex).trim();
            const departmentNotes = value.slice(separatorIndex + 1).trim();
            departmentUpdates.push({ label, notes: departmentNotes.length > 0 ? departmentNotes : "No update recorded." });
            lastDepartmentIndex = departmentUpdates.length - 1;
          } else if (lastDepartmentIndex >= 0) {
            departmentUpdates[lastDepartmentIndex] = {
              ...departmentUpdates[lastDepartmentIndex],
              notes: `${departmentUpdates[lastDepartmentIndex].notes}\n${trimmed}`
            };
          }
        }
      } else if (trimmed.length > 0 && lastDepartmentIndex >= 0) {
        departmentUpdates[lastDepartmentIndex] = {
          ...departmentUpdates[lastDepartmentIndex],
          notes: `${departmentUpdates[lastDepartmentIndex].notes}\n${trimmed}`
        };
      }
      continue;
    }

    if (section === "summary") summaryLines.push(line);
    if (section === "oldBusiness") oldBusinessLines.push(line);
    if (section === "newBusiness") newBusinessLines.push(line);
    if (section === "additional") additionalLines.push(line);
  }

  return {
    summary: collapseParsedSection(summaryLines.join("\n")),
    residentsInAttendance,
    departmentUpdates,
    oldBusiness: collapseParsedSection(oldBusinessLines.join("\n")),
    newBusiness: collapseParsedSection(newBusinessLines.join("\n")),
    additionalNotes: collapseParsedSection(additionalLines.join("\n"))
  };
}

function formatTimestamp(value: Date, timeZone?: string) {
  return value.toLocaleString("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getPagePadding(margins?: "NORMAL" | "NARROW" | "WIDE") {
  if (margins === "NARROW") return 22;
  if (margins === "WIDE") return 36;
  return 28;
}

function PdfFooter({
  theme,
  generatedAt,
  facilityName,
  label,
  pagePadding
}: {
  theme: ReportThemeTokens;
  generatedAt: string;
  facilityName: string;
  label: string;
  pagePadding: number;
}) {
  return (
    <View
      fixed
      style={{
        position: "absolute",
        left: pagePadding,
        right: pagePadding,
        bottom: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: theme.colors.glassBorder,
        paddingTop: 7
      }}
    >
      <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 8, color: theme.colors.textMuted }}>
        {facilityName} - {label} - Generated {generatedAt}
      </Text>
      <Text
        style={{ fontFamily: PDF_BODY_FONT, fontSize: 8, color: theme.colors.textMuted }}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

function MetricBox({
  theme,
  label,
  value,
  detail,
  tone
}: {
  theme: ReportThemeTokens;
  label: string;
  value: string | number;
  detail: string;
  tone: "blue" | "mint" | "rose" | "amber";
}) {
  const tones: Record<"blue" | "mint" | "rose" | "amber", { bg: string; border: string; value: string; accent: string }> = {
    blue: { bg: "#EFF6FF", border: "#BFDBFE", value: theme.colors.accentBlue, accent: theme.colors.accentBlue },
    mint: { bg: "#ECFEF8", border: "#99F6E4", value: "#0F766E", accent: theme.colors.accentMint },
    rose: { bg: "#FFF1F2", border: "#FDA4AF", value: theme.colors.accentRose, accent: theme.colors.accentRose },
    amber: { bg: "#FFFBEB", border: "#FDE68A", value: "#B45309", accent: theme.colors.accentAmber }
  };
  const current = tones[tone];

  return (
    <View
      style={{
        width: "24%",
        borderWidth: 1,
        borderColor: current.border,
        borderRadius: 10,
        backgroundColor: current.bg,
        padding: 8,
        minHeight: 72
      }}
    >
      <View
        style={{
          width: 34,
          height: 3,
          borderRadius: 999,
          backgroundColor: current.accent,
          marginBottom: 4
        }}
      />
      <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 7.6, textTransform: "uppercase", color: theme.colors.textMuted }}>
        {label}
      </Text>
      <Text style={{ marginTop: 2, fontFamily: PDF_DISPLAY_FONT, fontSize: 14.5, color: current.value }}>
        {value}
      </Text>
      <Text style={{ marginTop: 1, fontFamily: PDF_BODY_FONT, fontSize: 7.8, color: theme.colors.textSecondary }}>
        {detail}
      </Text>
    </View>
  );
}

function residentCouncilDocument(args: {
  meeting: ResidentCouncilPdfMeeting;
  facilityName: string;
  generatedAt: string;
  theme: ReportThemeTokens;
  timeZone?: string;
  paperSize?: "LETTER" | "A4";
  margins?: "NORMAL" | "NARROW" | "WIDE";
  includeFooterMeta?: boolean;
}) {
  const { meeting, facilityName, generatedAt, theme, timeZone, paperSize, margins, includeFooterMeta } = args;
  const pagePadding = getPagePadding(margins);
  const parsed = parseMeetingSheetNotes(meeting.notes);
  const logoDataUri = getActifyLogoDataUri();
  const meetingDateLabel = formatTimestamp(meeting.heldAt, timeZone);

  const summary = truncate(parsed?.summary ?? meeting.notes ?? "No summary recorded for this meeting.", 520);
  const oldBusiness = (parsed?.oldBusiness ?? "Not discussed.").trim();
  const newBusiness = (parsed?.newBusiness ?? "Not discussed.").trim();
  const additionalNotes = parsed?.additionalNotes ? truncate(parsed.additionalNotes, 220) : null;

  const residents = (parsed?.residentsInAttendance ?? []).slice(0, 10);
  const residentsTruncated = (parsed?.residentsInAttendance?.length ?? 0) > residents.length;
  const residentDisplayRows = Array.from({ length: 11 }, (_, index) => residents[index] ?? null);
  const departmentDefaults = ["Activities", "Nursing", "Therapy", "Dietary", "Housekeeping", "Social Services", "Maintenance", "Administrator"];
  const parsedDepartmentRows = parsed?.departmentUpdates ?? [];
  const departmentMap = new Map(
    parsedDepartmentRows.map((department) => [department.label.trim().toLowerCase(), department.notes] as const)
  );
  const extraDepartmentRows = parsedDepartmentRows
    .filter((department) => !departmentDefaults.some((label) => label.toLowerCase() === department.label.trim().toLowerCase()))
    .map((department) => ({
      department: department.label,
      notes: department.notes
    }));
  const departmentPageRows = [
    ...departmentDefaults.map((label) => ({
      department: label,
      notes: departmentMap.get(label.toLowerCase()) ?? "No update recorded."
    })),
    ...extraDepartmentRows
  ];
  const departmentPageDisplayRows = departmentPageRows.map((row) => ({
    department: row.department,
    notes: row.notes
  }));

  const sortedItems = [...meeting.items].sort((a, b) => {
    if (a.status === b.status) {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
    return a.status === "UNRESOLVED" ? -1 : 1;
  });

  const unresolvedCount = sortedItems.filter((item) => item.status === "UNRESOLVED").length;
  const resolvedCount = sortedItems.length - unresolvedCount;

  const actionRows = sortedItems.map((item) => ({
    status: item.status === "UNRESOLVED" ? "Open" : "Resolved",
    category: item.category,
    concern: item.concern,
    owner: item.owner ?? "-"
  }));

  const followUpRows = sortedItems.filter((item) => item.followUp);

  return (
    <Document title="Resident Council Meeting Report" author="ACTIFY" subject="Resident Council Meeting">
      <Page
        size={paperSize ?? "LETTER"}
        style={{
          position: "relative",
          backgroundColor: theme.colors.background,
          paddingTop: pagePadding,
          paddingBottom: pagePadding,
          paddingHorizontal: pagePadding,
          fontFamily: PDF_BODY_FONT
        }}
      >
        <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, height: 190 }} viewBox="0 0 612 190" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="rc-bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#DBEAFE" stopOpacity={0.5} />
              <Stop offset="0.55" stopColor="#E0F2FE" stopOpacity={0.34} />
              <Stop offset="1" stopColor="#CCFBF1" stopOpacity={0.28} />
            </LinearGradient>
            <LinearGradient id="rc-band" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={theme.colors.accentBlue} stopOpacity={1} />
              <Stop offset="1" stopColor={theme.colors.accentMint} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="612" height="190" fill="url(#rc-bg)" />
          <Rect x="0" y="0" width="612" height="6" fill="url(#rc-band)" />
        </Svg>

        <GlassCard id="rc-header" theme={theme} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 20, color: theme.colors.textPrimary }}>
                Resident Council Meeting Brief
              </Text>
              <Text style={{ marginTop: 2, fontFamily: PDF_DISPLAY_FONT, fontSize: 9.2, color: theme.colors.textSecondary }}>
                {facilityName}
              </Text>
              <Text style={{ marginTop: 2, fontFamily: PDF_BODY_FONT, fontSize: 8.3, color: theme.colors.textMuted }}>
                Meeting: {meetingDateLabel}
              </Text>
              <Text style={{ marginTop: 1, fontFamily: PDF_BODY_FONT, fontSize: 8.1, color: theme.colors.textMuted }}>
                Generated: {generatedAt}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              {logoDataUri ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={logoDataUri} style={{ width: 46, height: 46 }} />
              ) : (
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.colors.glassBorder,
                    backgroundColor: "#EEF2FF",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 12, color: theme.colors.accentBlue }}>A</Text>
                </View>
              )}
              <View style={{ marginTop: 6 }}>
                <GlassPill theme={theme} label={unresolvedCount > 0 ? `${unresolvedCount} open` : "All items resolved"} tone={unresolvedCount > 0 ? "coral" : "mint"} />
              </View>
            </View>
          </View>
        </GlassCard>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <MetricBox theme={theme} label="Attendance" value={meeting.attendanceCount} detail="Residents at meeting" tone="blue" />
          <MetricBox theme={theme} label="Action Items" value={sortedItems.length} detail="Total logged" tone="amber" />
          <MetricBox theme={theme} label="Open" value={unresolvedCount} detail="Needs follow-up" tone="rose" />
          <MetricBox theme={theme} label="Resolved" value={resolvedCount} detail="Closed items" tone="mint" />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <View style={{ width: "61.5%" }}>
            <GlassCard id="rc-summary" theme={theme} style={{ marginBottom: 8 }}>
              <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 14.2, color: theme.colors.textPrimary }}>
                Summary
              </Text>
              <Text style={{ marginTop: 1, fontFamily: PDF_BODY_FONT, fontSize: 8.2, color: theme.colors.textMuted }}>
                Compact overview of what was discussed
              </Text>
              <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 9.1, lineHeight: 1.35, color: theme.colors.textPrimary }}>
                {summary}
              </Text>
            </GlassCard>

            <GlassCard id="rc-old" theme={theme} style={{ marginBottom: 8 }}>
              <SectionHeader theme={theme} title="Old Business" />
              <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 8.7, lineHeight: 1.3, color: theme.colors.textSecondary }}>
                {oldBusiness}
              </Text>
            </GlassCard>
            <GlassCard id="rc-new" theme={theme} style={{ marginBottom: 0 }}>
              <SectionHeader theme={theme} title="New Business" />
              <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 8.7, lineHeight: 1.3, color: theme.colors.textSecondary }}>
                {newBusiness}
              </Text>
            </GlassCard>
          </View>

          <View style={{ width: "35.5%" }}>
            <GlassCard id="rc-attendance-list" theme={theme} style={{ marginBottom: 0, minHeight: 294 }}>
              <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 14.2, color: theme.colors.textPrimary }}>
                Residents Present
              </Text>
              <Text style={{ marginTop: 1, fontFamily: PDF_BODY_FONT, fontSize: 8.2, color: theme.colors.textMuted }}>
                {`${parsed?.residentsInAttendance?.length ?? 0} listed`}
              </Text>
              <View style={{ flexGrow: 1 }}>
                {residentDisplayRows.map((resident, index) => (
                  <View
                    key={`resident-row-${index}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#DBEAFE",
                      borderRadius: 7,
                      backgroundColor: resident ? "#F8FAFC" : "#FFFFFF",
                      paddingVertical: 3,
                      paddingHorizontal: 6,
                      marginBottom: index === residentDisplayRows.length - 1 ? 0 : 3
                    }}
                  >
                    <View
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: 999,
                        backgroundColor: resident ? "#DBEAFE" : "#F3F4F6",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 5
                      }}
                    >
                      <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 7, color: resident ? theme.colors.accentBlue : theme.colors.textMuted }}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text
                      style={{
                        flexGrow: 1,
                        fontFamily: PDF_BODY_FONT,
                        fontSize: 8,
                        lineHeight: 1.2,
                        color: resident ? theme.colors.textSecondary : theme.colors.textMuted
                      }}
                    >
                      {resident ? truncate(resident, 38) : "—"}
                    </Text>
                  </View>
                ))}
              </View>
              {residents.length === 0 ? (
                <Text style={{ marginTop: 4, fontFamily: PDF_BODY_FONT, fontSize: 7.8, color: theme.colors.textMuted }}>
                  No resident roster captured.
                </Text>
              ) : null}
              {residentsTruncated ? (
                <Text style={{ marginTop: 4, fontFamily: PDF_BODY_FONT, fontSize: 7.8, color: theme.colors.textMuted }}>
                  Additional residents omitted for compact layout.
                </Text>
              ) : null}
            </GlassCard>
          </View>
        </View>

        <GlassCard id="rc-actions" theme={theme} style={{ marginBottom: 8 }}>
          <SectionHeader
            theme={theme}
            title="Action Items"
            subtitle="Prioritized list for quick follow-up"
          />
          {actionRows.length === 0 ? (
            <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 8.5, color: theme.colors.textMuted }}>
              No action items recorded for this meeting.
            </Text>
          ) : (
            actionRows.map((item, index) => (
              <View
                key={`action-item-${index}`}
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 8,
                  backgroundColor: index % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  marginBottom: index === actionRows.length - 1 ? 0 : 5
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                  <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 8.2, color: theme.colors.textSecondary }}>
                    {item.category}
                  </Text>
                  <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 8, color: item.status === "Open" ? theme.colors.accentRose : "#0F766E" }}>
                    {item.status}
                  </Text>
                </View>
                <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 8.8, lineHeight: 1.28, color: theme.colors.textPrimary }}>
                  {item.concern}
                </Text>
                <Text style={{ marginTop: 2, fontFamily: PDF_BODY_FONT, fontSize: 8.1, color: theme.colors.textMuted }}>
                  Owner: {item.owner}
                </Text>
              </View>
            ))
          )}
        </GlassCard>

        {followUpRows.length > 0 || additionalNotes ? (
          <GlassCard id="rc-followup" theme={theme} style={{ marginBottom: 0 }}>
            <SectionHeader theme={theme} title="Follow-Up Snapshot" />
            {followUpRows.length > 0 ? (
              followUpRows.map((item) => (
                <View key={item.id} style={{ marginBottom: 4 }}>
                  <Text
                    style={{
                      fontFamily: PDF_DISPLAY_FONT,
                      fontSize: 8.2,
                      lineHeight: 1.2,
                      color: theme.colors.textSecondary
                    }}
                  >
                    - {item.category}
                  </Text>
                  <Text
                    style={{
                      marginTop: 1,
                      fontFamily: PDF_BODY_FONT,
                      fontSize: 8.3,
                      lineHeight: 1.26,
                      color: theme.colors.textSecondary
                    }}
                  >
                    {item.followUp}
                  </Text>
                </View>
              ))
            ) : null}
            {additionalNotes ? (
              <Text style={{ marginTop: followUpRows.length > 0 ? 4 : 0, fontFamily: PDF_BODY_FONT, fontSize: 8.3, color: theme.colors.textMuted }}>
                Additional notes: {additionalNotes}
              </Text>
            ) : null}
          </GlassCard>
        ) : null}

        {includeFooterMeta ?? true ? (
          <PdfFooter
            theme={theme}
            generatedAt={generatedAt}
            facilityName={facilityName}
            label={meeting.heldAt.toLocaleDateString("en-US")}
            pagePadding={pagePadding}
          />
        ) : null}
      </Page>

      <Page
        size={paperSize ?? "LETTER"}
        style={{
          position: "relative",
          backgroundColor: theme.colors.background,
          paddingTop: pagePadding,
          paddingBottom: pagePadding,
          paddingHorizontal: pagePadding,
          fontFamily: PDF_BODY_FONT
        }}
      >
        <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, height: 170 }} viewBox="0 0 612 170" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="rc-dept-bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#DBEAFE" stopOpacity={0.45} />
              <Stop offset="0.5" stopColor="#E0F2FE" stopOpacity={0.3} />
              <Stop offset="1" stopColor="#CCFBF1" stopOpacity={0.24} />
            </LinearGradient>
            <LinearGradient id="rc-dept-band" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={theme.colors.accentBlue} stopOpacity={1} />
              <Stop offset="1" stopColor={theme.colors.accentCoral} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="612" height="170" fill="url(#rc-dept-bg)" />
          <Rect x="0" y="0" width="612" height="6" fill="url(#rc-dept-band)" />
        </Svg>

        <GlassCard id="rc-department-header" theme={theme} style={{ marginBottom: 10 }}>
          <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 19, color: theme.colors.textPrimary }}>
            Department Notes
          </Text>
          <Text style={{ marginTop: 1, fontFamily: PDF_BODY_FONT, fontSize: 8.4, color: theme.colors.textMuted }}>
            Full department update detail for this Resident Council meeting.
          </Text>
          <Text style={{ marginTop: 2, fontFamily: PDF_BODY_FONT, fontSize: 8.1, color: theme.colors.textMuted }}>
            Meeting date: {meetingDateLabel}
          </Text>
        </GlassCard>

        {departmentPageDisplayRows.map((department, index) => (
          <GlassCard
            key={`department-full-${index}`}
            id={`rc-department-full-${index}`}
            theme={theme}
            style={{ marginBottom: index === departmentPageDisplayRows.length - 1 ? 0 : 7 }}
          >
            <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 8.6, textTransform: "uppercase", color: theme.colors.textSecondary }}>
              {department.department}
            </Text>
            <Text
              style={{
                marginTop: 2,
                fontFamily: PDF_BODY_FONT,
                fontSize: 9.2,
                lineHeight: 1.35,
                color: theme.colors.textPrimary
              }}
            >
              {department.notes}
            </Text>
          </GlassCard>
        ))}

        {includeFooterMeta ?? true ? (
          <PdfFooter
            theme={theme}
            generatedAt={generatedAt}
            facilityName={facilityName}
            label={`${meeting.heldAt.toLocaleDateString("en-US")} - Department Notes`}
            pagePadding={pagePadding}
          />
        ) : null}
      </Page>
    </Document>
  );
}

export async function generateResidentCouncilPdf(
  args: {
    meeting: ResidentCouncilPdfMeeting;
    facilityName: string;
    generatedAt: string;
    timeZone?: string;
  },
  theme: ReportThemeTokens = defaultReportTheme,
  options?: {
    paperSize?: "LETTER" | "A4";
    margins?: "NORMAL" | "NARROW" | "WIDE";
    includeFooterMeta?: boolean;
  }
) {
  const doc = residentCouncilDocument({
    ...args,
    theme,
    paperSize: options?.paperSize,
    margins: options?.margins,
    includeFooterMeta: options?.includeFooterMeta
  });

  const output = await pdf(doc).toBuffer();

  if (output instanceof Uint8Array) {
    return output;
  }

  if (output && typeof output === "object" && "on" in output) {
    const stream = output as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    return await new Promise<Uint8Array>((resolve, reject) => {
      stream.on("data", (chunk: Buffer | Uint8Array | string) => {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
      });
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  throw new Error("Failed to generate resident council PDF bytes.");
}
