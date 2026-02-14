import React from "react";
import fs from "node:fs";
import path from "node:path";
import {
  Defs,
  Document,
  Image,
  LinearGradient,
  Page,
  Rect,
  Stop,
  Svg,
  Text,
  View,
  pdf
} from "@react-pdf/renderer";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from "date-fns";

import { type ReportThemeTokens, defaultReportTheme } from "@/lib/report-pdf/ReportTheme";
import { PDF_BODY_FONT, PDF_DISPLAY_FONT } from "@/lib/report-pdf/fonts";

export type CalendarPdfView = "daily" | "weekly" | "monthly";

export type CalendarPdfActivity = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  location: string;
  attendanceCount: number;
};

type CalendarPdfDocumentArgs = {
  view: CalendarPdfView;
  anchorDate: Date;
  activities: CalendarPdfActivity[];
  facilityName: string;
  generatedAt: string;
  theme: ReportThemeTokens;
  paperSize?: "LETTER" | "A4";
  margins?: "NORMAL" | "NARROW" | "WIDE";
  includeFooterMeta?: boolean;
};

let cachedActifyLogoDataUri: string | undefined;

function getActifyLogoDataUri() {
  if (cachedActifyLogoDataUri !== undefined) {
    return cachedActifyLogoDataUri;
  }

  try {
    const preferredPath = path.join(process.cwd(), "public", "actify-logo-liquid-glass-nodots.svg");
    const fallbackPath = path.join(process.cwd(), "public", "actify-logo.svg");
    const sourcePath = fs.existsSync(preferredPath) ? preferredPath : fallbackPath;
    const svgContent = fs.readFileSync(sourcePath, "utf8");
    cachedActifyLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent, "utf8").toString("base64")}`;
  } catch {
    cachedActifyLogoDataUri = "";
  }

  return cachedActifyLogoDataUri;
}

function truncate(value: string | number | null | undefined, max = 58) {
  if (value === null || value === undefined) return "-";
  const text = String(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function buildGroupedByDay(activities: CalendarPdfActivity[]) {
  const map = new Map<string, CalendarPdfActivity[]>();
  for (const activity of activities) {
    const key = format(activity.startAt, "yyyy-MM-dd");
    map.set(key, [...(map.get(key) ?? []), activity]);
  }
  return map;
}

function Header({
  theme,
  title,
  subtitle,
  facilityName,
  generatedAt
}: {
  theme: ReportThemeTokens;
  title: string;
  subtitle: string;
  facilityName: string;
  generatedAt: string;
}) {
  const logoDataUri = getActifyLogoDataUri();

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        borderRadius: 11,
        backgroundColor: theme.colors.panel,
        overflow: "hidden",
        marginBottom: 10
      }}
    >
      <Svg width={560} height={14} viewBox="0 0 560 14">
        <Defs>
          <LinearGradient id="calendar-header-band" x1="0" y1="0" x2="560" y2="14">
            <Stop offset="0" stopColor={theme.colors.accentBlue} />
            <Stop offset="1" stopColor={theme.colors.accentMint} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="560" height="14" fill="url(#calendar-header-band)" />
      </Svg>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          paddingTop: 8,
          paddingBottom: 10,
          paddingLeft: 10,
          paddingRight: 10
        }}
      >
        <View style={{ width: 440 }}>
          <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 16, lineHeight: 1.2, color: theme.colors.textPrimary }}>{title}</Text>
          <Text style={{ marginTop: 2, fontFamily: PDF_BODY_FONT, fontSize: 9, lineHeight: 1.3, color: theme.colors.textSecondary }}>
            {subtitle}
          </Text>
          <Text style={{ marginTop: 1, fontFamily: PDF_BODY_FONT, fontSize: 8.2, lineHeight: 1.25, color: theme.colors.textMuted }}>
            {truncate(facilityName, 70)} · Generated {generatedAt}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", width: 86 }}>
          {logoDataUri ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={logoDataUri} style={{ width: 22, height: 22 }} />
          ) : (
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: theme.colors.glassBorder,
                backgroundColor: theme.colors.glassFillStrong
              }}
            />
          )}
          <Text style={{ marginTop: 2, fontFamily: PDF_DISPLAY_FONT, fontSize: 8, color: theme.colors.textSecondary, letterSpacing: 1 }}>
            ACTIFY
          </Text>
        </View>
      </View>
    </View>
  );
}

function Footer({
  theme,
  generatedAt,
  includeMeta
}: {
  theme: ReportThemeTokens;
  generatedAt: string;
  includeMeta: boolean;
}) {
  return (
    <View
      fixed
      style={{
        position: "absolute",
        left: 22,
        right: 22,
        bottom: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.glassBorder,
        paddingTop: 4,
        flexDirection: "row",
        justifyContent: "space-between"
      }}
    >
      {includeMeta ? (
        <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 8, lineHeight: 1.25, color: theme.colors.textMuted }}>
          ACTIFY Calendar PDF · {generatedAt}
        </Text>
      ) : (
        <View />
      )}
      <Text
        style={{ fontFamily: PDF_BODY_FONT, fontSize: 8, lineHeight: 1.25, color: theme.colors.textMuted }}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

function SectionHeading({ theme, title }: { theme: ReportThemeTokens; title: string }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 12, lineHeight: 1.22, color: theme.colors.textPrimary }}>{title}</Text>
      <Svg width={56} height={4} style={{ marginTop: 3 }}>
        <Defs>
          <LinearGradient id={`calendar-section-${title.replace(/\s+/g, "-").toLowerCase()}`} x1="0" y1="0" x2="56" y2="0">
            <Stop offset="0" stopColor={theme.colors.accentBlue} />
            <Stop offset="1" stopColor={theme.colors.accentMint} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="56" height="4" rx="2" fill={`url(#calendar-section-${title.replace(/\s+/g, "-").toLowerCase()})`} />
      </Svg>
    </View>
  );
}

function KpiCard({
  theme,
  label,
  value,
  tone
}: {
  theme: ReportThemeTokens;
  label: string;
  value: string;
  tone: "blue" | "mint" | "coral";
}) {
  const tones: Record<"blue" | "mint" | "coral", { bg: string; border: string; value: string }> = {
    blue: { bg: "#EFF6FF", border: "#BFDBFE", value: theme.colors.accentBlue },
    mint: { bg: "#ECFEF8", border: "#99F6E4", value: "#0F766E" },
    coral: { bg: "#FFF1F2", border: "#FDA4AF", value: "#BE123C" }
  };
  const activeTone = tones[tone];
  return (
    <View
      style={{
        width: 174,
        borderWidth: 1,
        borderColor: activeTone.border,
        borderRadius: 10,
        backgroundColor: activeTone.bg,
        padding: 10
      }}
    >
      <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 8.2, lineHeight: 1.2, color: theme.colors.textMuted }}>
        {label}
      </Text>
      <Text style={{ marginTop: 3, fontFamily: PDF_DISPLAY_FONT, fontSize: 16, lineHeight: 1.2, color: activeTone.value }}>
        {value}
      </Text>
    </View>
  );
}

function getPagePadding(margins?: "NORMAL" | "NARROW" | "WIDE") {
  if (margins === "NARROW") return 18;
  if (margins === "WIDE") return 34;
  return 24;
}

function renderDailyBody(args: CalendarPdfDocumentArgs) {
  const { anchorDate, activities, theme } = args;
  const totalAttendanceMarks = activities.reduce((sum, item) => sum + item.attendanceCount, 0);

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
        <KpiCard theme={theme} label="Activities" value={String(activities.length)} tone="blue" />
        <KpiCard theme={theme} label="Attendance Marks" value={String(totalAttendanceMarks)} tone="mint" />
        <KpiCard theme={theme} label="Date" value={format(anchorDate, "MMM d")} tone="coral" />
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.glassBorder,
          borderRadius: 10,
          backgroundColor: theme.colors.panel,
          padding: 10
        }}
      >
        <SectionHeading theme={theme} title="Daily Schedule" />
        {activities.length === 0 ? (
          <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 10, color: theme.colors.textMuted }}>
            No activities scheduled for this day.
          </Text>
        ) : (
          activities.map((activity, index) => (
            <View
              key={activity.id}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.glassBorder,
                borderRadius: 8,
                backgroundColor: index % 2 === 0 ? "#FFFFFF" : theme.colors.rowStripe,
                padding: 8,
                marginBottom: index === activities.length - 1 ? 0 : 6
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 10, color: theme.colors.textPrimary }}>
                  {truncate(activity.title, 52)}
                </Text>
                <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 8.5, color: theme.colors.accentBlue }}>
                  {format(activity.startAt, "h:mm a")} - {format(activity.endAt, "h:mm a")}
                </Text>
              </View>
              <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 9, color: theme.colors.textSecondary }}>
                {truncate(activity.location, 56)} · Attendance marks: {activity.attendanceCount}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function renderWeeklyBody(args: CalendarPdfDocumentArgs) {
  const { anchorDate, activities, theme } = args;
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const byDay = buildGroupedByDay(activities);
  const days = Array.from({ length: 7 }).map((_, index) => addDays(weekStart, index));

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
        <KpiCard theme={theme} label="Week Start" value={format(weekStart, "MMM d")} tone="blue" />
        <KpiCard theme={theme} label="Week End" value={format(weekEnd, "MMM d")} tone="mint" />
        <KpiCard theme={theme} label="Activities" value={String(activities.length)} tone="coral" />
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.glassBorder,
          borderRadius: 10,
          backgroundColor: theme.colors.panel,
          padding: 10,
          marginBottom: 10
        }}
      >
        <SectionHeading theme={theme} title="Weekly Calendar Snapshot" />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {days.map((day, index) => {
            const key = format(day, "yyyy-MM-dd");
            const rows = byDay.get(key) ?? [];
            return (
              <View
                key={key}
                style={{
                  width: 72,
                  borderWidth: 1,
                  borderColor: theme.colors.glassBorder,
                  borderRadius: 8,
                  backgroundColor: rows.length > 0 ? "#EEF2FF" : "#FFFFFF",
                  padding: 6,
                  marginRight: index === days.length - 1 ? 0 : 4,
                  marginBottom: 4
                }}
              >
                <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 8.2, color: theme.colors.textSecondary }}>
                  {format(day, "EEE")}
                </Text>
                <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 10, color: theme.colors.textPrimary }}>
                  {format(day, "d")}
                </Text>
                <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 7.8, color: theme.colors.textMuted }}>
                  {rows.length} act
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.glassBorder,
          borderRadius: 10,
          backgroundColor: theme.colors.panel,
          padding: 10
        }}
      >
        <SectionHeading theme={theme} title="Weekly Detail" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const rows = byDay.get(key) ?? [];
            return (
              <View
                key={`detail-${key}`}
                style={{
                  width: 258,
                  borderWidth: 1,
                  borderColor: theme.colors.glassBorder,
                  borderRadius: 8,
                  backgroundColor: theme.colors.glassFillStrong,
                  padding: 8,
                  marginBottom: 8
                }}
              >
                <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: 9.2, color: theme.colors.textPrimary, marginBottom: 3 }}>
                  {format(day, "EEEE, MMM d")}
                </Text>
                {rows.length === 0 ? (
                  <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 8.5, color: theme.colors.textMuted }}>
                    No activities scheduled.
                  </Text>
                ) : (
                  rows.slice(0, 8).map((activity) => (
                    <Text key={activity.id} style={{ fontFamily: PDF_BODY_FONT, fontSize: 8.5, lineHeight: 1.25, color: theme.colors.textSecondary }}>
                      {format(activity.startAt, "h:mm a")} · {truncate(activity.title, 28)}
                    </Text>
                  ))
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function renderMonthlyBody(args: CalendarPdfDocumentArgs) {
  const { anchorDate, activities, theme } = args;
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const byDay = buildGroupedByDay(activities);

  const days: Date[] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }

  const weeks: Date[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
        <KpiCard theme={theme} label="Month" value={format(monthStart, "MMMM")} tone="blue" />
        <KpiCard theme={theme} label="Days in grid" value={String(days.length)} tone="mint" />
        <KpiCard theme={theme} label="Activities" value={String(activities.length)} tone="coral" />
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.glassBorder,
          borderRadius: 10,
          backgroundColor: theme.colors.panel,
          padding: 10,
          marginBottom: 10
        }}
      >
        <SectionHeading theme={theme} title="Monthly Calendar Grid" />
        <View style={{ flexDirection: "row", marginBottom: 3 }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
            <View
              key={day}
              style={{
                width: 70,
                marginRight: index === 6 ? 0 : 3,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: theme.colors.tableHeader
              }}
            >
              <Text style={{ textAlign: "center", fontFamily: PDF_DISPLAY_FONT, fontSize: 8.5, color: theme.colors.textSecondary }}>
                {day}
              </Text>
            </View>
          ))}
        </View>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={{ flexDirection: "row", marginBottom: weekIndex === weeks.length - 1 ? 0 : 3 }}>
            {week.map((day, dayIndex) => {
              const key = format(day, "yyyy-MM-dd");
              const rows = byDay.get(key) ?? [];
              const inMonth = isSameMonth(day, monthStart);
              return (
                <View
                  key={key}
                  style={{
                    width: 70,
                    minHeight: 66,
                    marginRight: dayIndex === 6 ? 0 : 3,
                    borderWidth: 1,
                    borderColor: theme.colors.glassBorder,
                    borderRadius: 7,
                    backgroundColor: inMonth ? "#FFFFFF" : "#F8FAFC",
                    padding: 4
                  }}
                >
                  <Text
                    style={{
                      fontFamily: PDF_DISPLAY_FONT,
                      fontSize: 8.4,
                      color: inMonth ? theme.colors.textPrimary : theme.colors.textMuted
                    }}
                  >
                    {format(day, "d")}
                  </Text>
                  <Text style={{ marginTop: 1, fontFamily: PDF_BODY_FONT, fontSize: 7.2, color: theme.colors.textMuted }}>
                    {rows.length} act
                  </Text>
                  {rows[0] ? (
                    <Text style={{ marginTop: 2, fontFamily: PDF_BODY_FONT, fontSize: 6.9, lineHeight: 1.2, color: theme.colors.textSecondary }}>
                      {truncate(`${format(rows[0].startAt, "h:mm a")} ${rows[0].title}`, 22)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.glassBorder,
          borderRadius: 10,
          backgroundColor: theme.colors.panel,
          padding: 10
        }}
      >
        <SectionHeading theme={theme} title="Monthly Schedule Detail" />
        <View
          style={{
            flexDirection: "row",
            borderWidth: 1,
            borderColor: theme.colors.glassBorder,
            borderRadius: 8,
            backgroundColor: theme.colors.tableHeader,
            paddingVertical: 4,
            paddingHorizontal: 6
          }}
        >
          <Text style={{ width: 90, fontFamily: PDF_DISPLAY_FONT, fontSize: 8.5, color: theme.colors.textSecondary }}>Date</Text>
          <Text style={{ width: 70, fontFamily: PDF_DISPLAY_FONT, fontSize: 8.5, color: theme.colors.textSecondary }}>Time</Text>
          <Text style={{ width: 210, fontFamily: PDF_DISPLAY_FONT, fontSize: 8.5, color: theme.colors.textSecondary }}>Activity</Text>
          <Text style={{ width: 130, fontFamily: PDF_DISPLAY_FONT, fontSize: 8.5, color: theme.colors.textSecondary }}>Location</Text>
        </View>
        <View style={{ marginTop: 2 }}>
          {activities.length === 0 ? (
            <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 9, color: theme.colors.textMuted }}>
              No activities scheduled for this month.
            </Text>
          ) : (
            activities.map((activity, index) => (
              <View
                key={`month-row-${activity.id}`}
                style={{
                  flexDirection: "row",
                  paddingVertical: 4,
                  paddingHorizontal: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.glassBorder,
                  backgroundColor: index % 2 === 0 ? "#FFFFFF" : theme.colors.rowStripe
                }}
              >
                <Text style={{ width: 90, fontFamily: PDF_BODY_FONT, fontSize: 8.3, color: theme.colors.textSecondary }}>
                  {format(activity.startAt, "MMM d")}
                </Text>
                <Text style={{ width: 70, fontFamily: PDF_BODY_FONT, fontSize: 8.3, color: theme.colors.textSecondary }}>
                  {format(activity.startAt, "h:mm a")}
                </Text>
                <Text style={{ width: 210, fontFamily: PDF_BODY_FONT, fontSize: 8.3, color: theme.colors.textPrimary }}>
                  {truncate(activity.title, 42)}
                </Text>
                <Text style={{ width: 130, fontFamily: PDF_BODY_FONT, fontSize: 8.3, color: theme.colors.textSecondary }}>
                  {truncate(activity.location, 24)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

function calendarPdfDocument(args: CalendarPdfDocumentArgs) {
  const { view, anchorDate, facilityName, generatedAt, theme, paperSize, margins, includeFooterMeta } = args;
  const pagePadding = getPagePadding(margins);

  const title = view === "daily" ? "Daily Calendar PDF" : view === "weekly" ? "Weekly Calendar PDF" : "Monthly Calendar PDF";
  const subtitle = view === "daily"
    ? format(anchorDate, "EEEE, MMMM d, yyyy")
    : view === "weekly"
      ? `${format(startOfWeek(anchorDate, { weekStartsOn: 1 }), "MMM d")} - ${format(addDays(startOfWeek(anchorDate, { weekStartsOn: 1 }), 6), "MMM d, yyyy")}`
      : format(anchorDate, "MMMM yyyy");

  return (
    <Document>
      <Page
        size={paperSize ?? "LETTER"}
        style={{
          backgroundColor: theme.colors.background,
          paddingTop: Math.max(pagePadding - 2, 14),
          paddingRight: pagePadding,
          paddingBottom: pagePadding + 8,
          paddingLeft: pagePadding,
          fontFamily: PDF_BODY_FONT
        }}
      >
        <Header
          theme={theme}
          title={title}
          subtitle={subtitle}
          facilityName={facilityName}
          generatedAt={generatedAt}
        />

        {view === "daily" ? renderDailyBody(args) : null}
        {view === "weekly" ? renderWeeklyBody(args) : null}
        {view === "monthly" ? renderMonthlyBody(args) : null}

        <Footer theme={theme} generatedAt={generatedAt} includeMeta={includeFooterMeta ?? true} />
      </Page>
    </Document>
  );
}

export async function generateCalendarPdf(
  args: {
    view: CalendarPdfView;
    anchorDate: Date;
    activities: CalendarPdfActivity[];
    facilityName: string;
    generatedAt: string;
  },
  theme: ReportThemeTokens = defaultReportTheme,
  options?: {
    paperSize?: "LETTER" | "A4";
    margins?: "NORMAL" | "NARROW" | "WIDE";
    includeFooterMeta?: boolean;
  }
) {
  const doc = calendarPdfDocument({
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

  throw new Error("Failed to generate calendar PDF bytes.");
}
