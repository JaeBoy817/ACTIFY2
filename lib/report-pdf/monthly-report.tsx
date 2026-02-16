import React from "react";
import fs from "node:fs";
import path from "node:path";
import { Defs, Document, Image, LinearGradient, Page, Path, RadialGradient, Rect, Stop, Svg, Text, View, pdf } from "@react-pdf/renderer";

import { defaultReportTheme, type ReportThemeTokens } from "./ReportTheme";
import { PDF_BODY_FONT, PDF_DISPLAY_FONT } from "./fonts";
import { type MonthlyReportPdfData } from "./types";

const supportiveStatuses = new Set(["PRESENT", "ACTIVE", "LEADING"]);

let cachedActifyLogoDataUri: string | undefined;

function getActifyLogoDataUri() {
  if (cachedActifyLogoDataUri !== undefined) {
    return cachedActifyLogoDataUri;
  }

  try {
    const svgPath = path.join(process.cwd(), "public", "actify-logo-liquid-glass-nodots.svg");
    const svgContent = fs.readFileSync(svgPath, "utf8");
    cachedActifyLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent, "utf8").toString("base64")}`;
  } catch {
    cachedActifyLogoDataUri = "";
  }

  return cachedActifyLogoDataUri;
}

type ProgramRow = {
  title: string;
  sessions: number;
  avgAttendance: number;
  avgEngagement: number;
};

type UnitRow = {
  unitName: string;
  presentActive: number;
  leading: number;
  refused: number;
  noShow: number;
  total: number;
};

function toPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncate(value: string | number | null | undefined, max = 58) {
  if (value === null || value === undefined) return "-";
  const text = String(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function formatTimestamp(value: Date) {
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getProgramRows(data: MonthlyReportPdfData, scoreMap: Record<string, number>): ProgramRow[] {
  const sessionsByTitle = new Map<string, number>();
  for (const activity of data.activities) {
    sessionsByTitle.set(activity.title, (sessionsByTitle.get(activity.title) ?? 0) + 1);
  }

  const attendanceByTitle = new Map<string, MonthlyReportPdfData["attendance"]>();
  for (const row of data.attendance) {
    const list = attendanceByTitle.get(row.activityTitle) ?? [];
    list.push(row);
    attendanceByTitle.set(row.activityTitle, list);
  }

  const preferredOrder = [
    ...data.topPrograms.map((item) => item.title),
    ...Array.from(sessionsByTitle.keys()).filter((title) => !data.topPrograms.some((item) => item.title === title))
  ];

  return preferredOrder
    .map((title) => {
      const sessions = sessionsByTitle.get(title) ?? 0;
      const rows = attendanceByTitle.get(title) ?? [];
      const supportiveCount = rows.filter((row) => supportiveStatuses.has(row.status)).length;
      const avgAttendance = sessions > 0 ? supportiveCount / sessions : 0;
      const avgEngagement =
        rows.length > 0
          ? rows.reduce((sum, row) => sum + (scoreMap[row.status] ?? 0), 0) / rows.length
          : 0;

      return {
        title,
        sessions,
        avgAttendance,
        avgEngagement
      };
    })
    .sort((a, b) => b.avgAttendance - a.avgAttendance)
    .slice(0, 6);
}

function getUnitRows(data: MonthlyReportPdfData): UnitRow[] {
  const rowsByUnit = new Map<string, UnitRow>();

  for (const row of data.attendance) {
    const current = rowsByUnit.get(row.unitName) ?? {
      unitName: row.unitName,
      presentActive: 0,
      leading: 0,
      refused: 0,
      noShow: 0,
      total: 0
    };

    if (row.status === "PRESENT" || row.status === "ACTIVE") current.presentActive += 1;
    if (row.status === "LEADING") current.leading += 1;
    if (row.status === "REFUSED") current.refused += 1;
    if (row.status === "NO_SHOW") current.noShow += 1;
    current.total += 1;

    rowsByUnit.set(row.unitName, current);
  }

  return Array.from(rowsByUnit.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function getBarrierRows(data: MonthlyReportPdfData) {
  const rows = Object.entries(data.barrierSummary)
    .map(([barrier, count]) => ({
      label: titleCase(barrier),
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (rows.length > 0) return rows;
  return [
    { label: "Refused", count: data.attendanceCounts.refused },
    { label: "No Show", count: data.attendanceCounts.noShow }
  ];
}

function KpiCard({
  theme,
  label,
  value,
  detail,
  tone
}: {
  theme: ReportThemeTokens;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "mint" | "coral" | "neutral";
}) {
  const toneStyles: Record<"blue" | "mint" | "coral" | "neutral", { bg: string; border: string; accent: string; value: string }> = {
    blue: { bg: "#EFF6FF", border: "#BFDBFE", accent: theme.colors.accentBlue, value: "#1D4ED8" },
    mint: { bg: "#ECFEF8", border: "#99F6E4", accent: theme.colors.accentMint, value: "#0F766E" },
    coral: { bg: "#FFF1F2", border: "#FDA4AF", accent: theme.colors.accentCoral, value: "#BE123C" },
    neutral: { bg: "#F8FAFC", border: theme.colors.glassBorder, accent: theme.colors.accentBlue, value: theme.colors.textPrimary }
  };
  const currentTone = toneStyles[tone];

  return (
    <View
      style={{
        width: 266,
        borderWidth: 1,
        borderColor: currentTone.border,
        borderRadius: 10,
        backgroundColor: currentTone.bg,
        padding: 10,
        marginBottom: 8
      }}
    >
      <View
        style={{
          width: 42,
          height: 3,
          borderRadius: 999,
          backgroundColor: currentTone.accent,
          marginBottom: 5
        }}
      />
      <Text
        style={{
          fontFamily: PDF_DISPLAY_FONT,
          fontSize: 8,
          lineHeight: 1.25,
          color: theme.colors.textMuted
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          marginTop: 3,
          fontFamily: PDF_DISPLAY_FONT,
          fontSize: 16,
          lineHeight: 1.2,
          color: currentTone.value
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          marginTop: 2,
          fontFamily: PDF_BODY_FONT,
          fontSize: 8.6,
          lineHeight: 1.25,
          color: theme.colors.textSecondary
        }}
      >
        {detail}
      </Text>
    </View>
  );
}

function SectionHeading({
  theme,
  title
}: {
  theme: ReportThemeTokens;
  title: string;
}) {
  return (
    <View style={{ marginBottom: 5 }}>
      <Text
        style={{
          fontFamily: PDF_DISPLAY_FONT,
          fontSize: 11.5,
          lineHeight: 1.22,
          color: theme.colors.textPrimary
        }}
      >
        {title}
      </Text>
      <Svg width={58} height={4} style={{ marginTop: 3 }}>
        <Defs>
          <LinearGradient id={`section-grad-${title.replace(/\s+/g, "-").toLowerCase()}`} x1="0" y1="0" x2="58" y2="0">
            <Stop offset="0" stopColor={theme.colors.accentBlue} />
            <Stop offset="1" stopColor={theme.colors.accentMint} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="58" height="4" rx="2" fill={`url(#section-grad-${title.replace(/\s+/g, "-").toLowerCase()})`} />
      </Svg>
    </View>
  );
}

function ActifyHeaderLogo({ theme, idSuffix }: { theme: ReportThemeTokens; idSuffix: string }) {
  const logoDataUri = getActifyLogoDataUri();

  if (logoDataUri) {
    return (
      <View style={{ alignItems: "flex-end", width: 86 }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={logoDataUri} style={{ width: 22, height: 22, borderRadius: 5 }} />
        <Text
          style={{
            marginTop: 2,
            fontFamily: PDF_DISPLAY_FONT,
            fontSize: 8,
            lineHeight: 1.25,
            letterSpacing: 1,
            color: theme.colors.textSecondary
          }}
        >
          ACTIFY
        </Text>
      </View>
    );
  }

  const baseGradientId = `actify-base-${idSuffix}`;
  const pinkGradientId = `actify-pink-${idSuffix}`;
  const rimGradientId = `actify-rim-${idSuffix}`;
  const highlightGradientId = `actify-highlight-${idSuffix}`;
  return (
    <View style={{ alignItems: "flex-end", width: 86 }}>
      <Svg width={22} height={22} viewBox="0 0 512 512">
        <Defs>
          <LinearGradient id={baseGradientId} x1="96" y1="96" x2="416" y2="416">
            <Stop offset="0" stopColor="#2B5BFF" />
            <Stop offset="0.55" stopColor="#22C7C7" />
            <Stop offset="1" stopColor="#34D399" />
          </LinearGradient>
          <LinearGradient id={pinkGradientId} x1="200" y1="340" x2="330" y2="230">
            <Stop offset="0" stopColor="#FB7185" />
            <Stop offset="1" stopColor="#FF4FD8" />
          </LinearGradient>
          <LinearGradient id={rimGradientId} x1="64" y1="64" x2="448" y2="448">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.15} />
          </LinearGradient>
          <RadialGradient id={highlightGradientId} cx="170" cy="140" r="260">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.36} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="48" y="48" width="416" height="416" rx="104" fill={`url(#${baseGradientId})`} />
        <Rect x="52" y="52" width="408" height="408" rx="100" fill="none" stroke={`url(#${rimGradientId})`} strokeWidth={6} />
        <Rect x="48" y="48" width="416" height="416" rx="104" fill={`url(#${highlightGradientId})`} />
        <Path d="M172 360 L256 160 L340 360" stroke="#FFFFFF" strokeWidth={60} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M206 292 L242 326 L310 250" stroke={`url(#${pinkGradientId})`} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text
        style={{
          marginTop: 2,
          fontFamily: PDF_DISPLAY_FONT,
          fontSize: 8,
          lineHeight: 1.25,
          letterSpacing: 1,
          color: theme.colors.textSecondary
        }}
      >
        ACTIFY
      </Text>
    </View>
  );
}

function Header({
  theme,
  facilityName,
  monthLabel,
  generatedAt,
  title,
  logoIdSuffix
}: {
  theme: ReportThemeTokens;
  facilityName: string;
  monthLabel: string;
  generatedAt: string;
  title: string;
  logoIdSuffix: string;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        borderRadius: 10,
        backgroundColor: theme.colors.panel,
        overflow: "hidden",
        marginBottom: 10
      }}
    >
      <Svg width={544} height={14} viewBox="0 0 544 14">
        <Defs>
          <LinearGradient id={`header-band-${logoIdSuffix}`} x1="0" y1="0" x2="544" y2="14">
            <Stop offset="0" stopColor={theme.colors.accentBlue} />
            <Stop offset="1" stopColor={theme.colors.accentMint} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="544" height="14" fill={`url(#header-band-${logoIdSuffix})`} />
      </Svg>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          paddingTop: 8,
          paddingRight: 10,
          paddingBottom: 10,
          paddingLeft: 10
        }}
      >
        <View style={{ width: 450 }}>
          <Text
            style={{
              fontFamily: PDF_DISPLAY_FONT,
              fontSize: 16,
              lineHeight: 1.2,
              color: theme.colors.textPrimary
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              marginTop: 2,
              fontFamily: PDF_BODY_FONT,
              fontSize: 9,
              lineHeight: 1.3,
              color: theme.colors.textSecondary
            }}
          >
            {truncate(facilityName, 60)} | {monthLabel}
          </Text>
          <Text
            style={{
              marginTop: 1,
              fontFamily: PDF_BODY_FONT,
              fontSize: 8.2,
              lineHeight: 1.3,
              color: theme.colors.textMuted
            }}
          >
            Generated {generatedAt}
          </Text>
        </View>
        <ActifyHeaderLogo theme={theme} idSuffix={logoIdSuffix} />
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
        left: 26,
        right: 26,
        bottom: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.glassBorder,
        paddingTop: 4,
        flexDirection: "row",
        justifyContent: "space-between"
      }}
    >
      {includeMeta ? (
        <Text
          style={{
            fontFamily: PDF_BODY_FONT,
            fontSize: 8,
            lineHeight: 1.25,
            color: theme.colors.textMuted
          }}
        >
          ACTIFY Monthly Activities Report | {generatedAt}
        </Text>
      ) : (
        <View />
      )}
      <Text
        style={{
          fontFamily: PDF_BODY_FONT,
          fontSize: 8,
          lineHeight: 1.25,
          color: theme.colors.textMuted
        }}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

function monthlyReportDocument({
  data,
  facilityName,
  generatedAt,
  theme,
  engagementWeights,
  includeSections,
  paperSize,
  margins,
  includeFooterMeta
}: {
  data: MonthlyReportPdfData;
  facilityName: string;
  generatedAt: string;
  theme: ReportThemeTokens;
  engagementWeights?: {
    present: number;
    active: number;
    leading: number;
  };
  includeSections?: {
    topPrograms?: boolean;
    attendanceTrends?: boolean;
    engagementAvg?: boolean;
    barriersSummary?: boolean;
    oneToOneTotals?: boolean;
    notableOutcomes?: boolean;
    unitHeatmap?: boolean;
  };
  paperSize?: "LETTER" | "A4";
  margins?: "NORMAL" | "NARROW" | "WIDE";
  includeFooterMeta?: boolean;
}) {
  const scoreMap: Record<string, number> = {
    PRESENT: engagementWeights?.present ?? 1,
    ACTIVE: engagementWeights?.active ?? 2,
    LEADING: engagementWeights?.leading ?? 3,
    REFUSED: 0,
    NO_SHOW: 0
  };

  const engagementScaleMax = Math.max(scoreMap.PRESENT, scoreMap.ACTIVE, scoreMap.LEADING);
  const sections = {
    topPrograms: includeSections?.topPrograms ?? true,
    attendanceTrends: includeSections?.attendanceTrends ?? true,
    engagementAvg: includeSections?.engagementAvg ?? true,
    barriersSummary: includeSections?.barriersSummary ?? true,
    oneToOneTotals: includeSections?.oneToOneTotals ?? true,
    notableOutcomes: includeSections?.notableOutcomes ?? true,
    unitHeatmap: includeSections?.unitHeatmap ?? true
  };

  const pageSize = paperSize ?? "LETTER";
  const pagePadding = margins === "NARROW" ? 18 : margins === "WIDE" ? 34 : 26;

  const pageStyle = {
    backgroundColor: theme.colors.background,
    paddingTop: Math.max(pagePadding - 2, 14),
    paddingRight: pagePadding,
    paddingBottom: pagePadding + 6,
    paddingLeft: pagePadding,
    fontFamily: PDF_BODY_FONT
  } as const;

  const cardStyle = {
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderRadius: 10,
    backgroundColor: theme.colors.panel,
    padding: 10,
    marginBottom: 8
  } as const;

  const labelStyle = {
    fontFamily: PDF_BODY_FONT,
    fontSize: 8.6,
    lineHeight: 1.28,
    color: theme.colors.textSecondary
  } as const;

  const supportiveTotal = data.attendanceCounts.present + data.attendanceCounts.active + data.attendanceCounts.leading;
  const monthlyParticipation = data.monthlyParticipation;
  const programRows = getProgramRows(data, scoreMap);
  const unitRows = getUnitRows(data);
  const barrierRows = getBarrierRows(data);
  const outcomeRows = data.notableOutcomes.slice(0, 5);

  const attendanceMix = [
    {
      label: "Present / Active",
      value: data.attendanceCounts.present + data.attendanceCounts.active,
      percent: toPercent(data.attendanceCounts.present + data.attendanceCounts.active, data.attendance.length),
      color: theme.colors.accentBlue
    },
    {
      label: "Leading",
      value: data.attendanceCounts.leading,
      percent: toPercent(data.attendanceCounts.leading, data.attendance.length),
      color: theme.colors.accentMint
    },
    {
      label: "Refused",
      value: data.attendanceCounts.refused,
      percent: toPercent(data.attendanceCounts.refused, data.attendance.length),
      color: theme.colors.accentCoral
    },
    {
      label: "No Show",
      value: data.attendanceCounts.noShow,
      percent: toPercent(data.attendanceCounts.noShow, data.attendance.length),
      color: theme.colors.accentRose
    }
  ];

  return (
    <Document>
      <Page size={pageSize} style={pageStyle}>
        <Header
          theme={theme}
          facilityName={facilityName}
          monthLabel={data.monthLabel}
          generatedAt={generatedAt}
          title="Monthly Activities Report"
          logoIdSuffix="page1"
        />

        <View
          style={{
            ...cardStyle,
            padding: 0,
            overflow: "hidden"
          }}
        >
          <Svg width={544} height={32} viewBox="0 0 544 32">
            <Defs>
              <LinearGradient id="summary-band" x1="0" y1="0" x2="544" y2="32">
                <Stop offset="0" stopColor="#2563EB" />
                <Stop offset="1" stopColor="#2DD4BF" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="544" height="32" fill="url(#summary-band)" />
          </Svg>
          <View style={{ padding: 10 }}>
            <SectionHeading theme={theme} title="Executive Summary" />
            <Text style={{ ...labelStyle, fontSize: 9.2, lineHeight: 1.3 }}>
              Attendance, engagement, barriers, and outcomes for this month.
            </Text>
            <Text style={{ ...labelStyle, marginTop: 3 }}>
              Total Attended Residents: {monthlyParticipation.totalResidentsInCurrentMonthThatHaveAttended}
              {" | "}
              Participation %: {monthlyParticipation.participationPercent.toFixed(1)}%
              {" | "}
              Average daily %: {monthlyParticipation.averageDailyPercent.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
          <View style={{ width: 266 }}>
            <KpiCard
              theme={theme}
              label="Total Attended Residents"
              value={String(monthlyParticipation.totalResidentsInCurrentMonthThatHaveAttended)}
              detail={`${monthlyParticipation.activeResidentCount} active residents`}
              tone="blue"
            />
            <KpiCard
              theme={theme}
              label="Residents Participated"
              value={String(monthlyParticipation.residentsParticipated)}
              detail="Unique residents with Present/Active/Leading"
              tone="coral"
            />
          </View>
          <View style={{ width: 266 }}>
            <KpiCard
              theme={theme}
              label="Participation %"
              value={`${monthlyParticipation.participationPercent.toFixed(1)}%`}
              detail={`${monthlyParticipation.residentsParticipated} of ${monthlyParticipation.activeResidentCount} active residents`}
              tone="mint"
            />
            <KpiCard
              theme={theme}
              label="Average Daily %"
              value={`${monthlyParticipation.averageDailyPercent.toFixed(1)}%`}
              detail="Average daily resident participation this month"
              tone="neutral"
            />
          </View>
        </View>

        {sections.attendanceTrends ? (
          <View style={cardStyle}>
            <SectionHeading theme={theme} title="Attendance Snapshot" />
            {attendanceMix.map((row) => (
              <View key={row.label} style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={labelStyle}>{row.label}</Text>
                  <Text style={labelStyle}>
                    {row.value} ({row.percent}%)
                  </Text>
                </View>
                <View
                  style={{
                    height: 7,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#BFDBFE",
                    backgroundColor: "#EFF6FF",
                    overflow: "hidden"
                  }}
                >
                  <View
                    style={{
                      height: 7,
                      borderRadius: 999,
                      backgroundColor: row.color,
                      width: `${Math.max(row.percent, row.value === 0 ? 0 : 8)}%`
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {sections.topPrograms ? (
          <View style={cardStyle}>
            <SectionHeading theme={theme} title="Top Programs" />
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
              <Text style={{ ...labelStyle, fontFamily: PDF_DISPLAY_FONT, width: 244 }}>Program</Text>
              <Text style={{ ...labelStyle, fontFamily: PDF_DISPLAY_FONT, width: 76, textAlign: "right" }}>Sessions</Text>
              <Text style={{ ...labelStyle, fontFamily: PDF_DISPLAY_FONT, width: 97, textAlign: "right" }}>Avg Attend</Text>
              <Text style={{ ...labelStyle, fontFamily: PDF_DISPLAY_FONT, width: 96, textAlign: "right" }}>Avg Engage</Text>
            </View>
            <View style={{ marginTop: 3 }}>
              {programRows.length === 0 ? (
                <Text style={labelStyle}>No program data for this month.</Text>
              ) : (
                programRows.map((row, index) => (
                  <View
                    key={`${row.title}-${index}`}
                    style={{
                      flexDirection: "row",
                      paddingVertical: 4,
                      paddingHorizontal: 6,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.glassBorder,
                      backgroundColor: index % 2 === 0 ? "#FFFFFF" : theme.colors.rowStripe
                    }}
                  >
                    <Text style={{ ...labelStyle, width: 244, color: theme.colors.textPrimary }}>{truncate(row.title, 33)}</Text>
                    <Text style={{ ...labelStyle, width: 76, textAlign: "right", color: theme.colors.textPrimary }}>{row.sessions}</Text>
                    <Text style={{ ...labelStyle, width: 97, textAlign: "right", color: theme.colors.textPrimary }}>
                      {row.avgAttendance.toFixed(1)}
                    </Text>
                    <Text style={{ ...labelStyle, width: 96, textAlign: "right", color: theme.colors.textPrimary }}>
                      {row.avgEngagement.toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}

        <Footer theme={theme} generatedAt={generatedAt} includeMeta={includeFooterMeta ?? true} />
      </Page>

      <Page size={pageSize} style={pageStyle}>
        <Header
          theme={theme}
          facilityName={facilityName}
          monthLabel={data.monthLabel}
          generatedAt={generatedAt}
          title="Monthly Activities Report - Detail"
          logoIdSuffix="page2"
        />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ width: 340 }}>
            {sections.unitHeatmap ? (
              <View style={cardStyle}>
                <SectionHeading theme={theme} title="Attendance by Unit" />
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
                  <Text style={{ ...labelStyle, fontFamily: PDF_DISPLAY_FONT, width: 104 }}>Unit</Text>
                  <Text style={{ ...labelStyle, fontFamily: PDF_DISPLAY_FONT, width: 56, textAlign: "right" }}>P/A</Text>
                  <Text style={{ ...labelStyle, fontFamily: PDF_DISPLAY_FONT, width: 50, textAlign: "right" }}>Lead</Text>
                  <Text style={{ ...labelStyle, fontFamily: PDF_DISPLAY_FONT, width: 62, textAlign: "right" }}>Refused</Text>
                  <Text style={{ ...labelStyle, fontFamily: PDF_DISPLAY_FONT, width: 62, textAlign: "right" }}>No Show</Text>
                </View>
                <View style={{ marginTop: 3 }}>
                  {unitRows.length === 0 ? (
                    <Text style={labelStyle}>No unit data for this month.</Text>
                  ) : (
                    unitRows.map((row, index) => (
                      <View
                        key={`${row.unitName}-${index}`}
                        style={{
                          flexDirection: "row",
                          paddingVertical: 4,
                          paddingHorizontal: 6,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.colors.glassBorder,
                          backgroundColor: index % 2 === 0 ? "#FFFFFF" : theme.colors.rowStripe
                        }}
                      >
                        <Text style={{ ...labelStyle, width: 104, color: theme.colors.textPrimary }}>{truncate(row.unitName, 16)}</Text>
                        <Text style={{ ...labelStyle, width: 56, textAlign: "right", color: theme.colors.textPrimary }}>{row.presentActive}</Text>
                        <Text style={{ ...labelStyle, width: 50, textAlign: "right", color: theme.colors.textPrimary }}>{row.leading}</Text>
                        <Text style={{ ...labelStyle, width: 62, textAlign: "right", color: theme.colors.textPrimary }}>{row.refused}</Text>
                        <Text style={{ ...labelStyle, width: 62, textAlign: "right", color: theme.colors.textPrimary }}>{row.noShow}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            ) : null}
          </View>

          <View style={{ width: 192 }}>
            {sections.barriersSummary ? (
              <View style={cardStyle}>
                <SectionHeading theme={theme} title="Top Barriers" />
                {barrierRows.map((row, index) => (
                  <View
                    key={`${row.label}-${index}`}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 4,
                      borderBottomWidth: index === barrierRows.length - 1 ? 0 : 1,
                      borderBottomColor: theme.colors.glassBorder
                    }}
                  >
                    <Text style={{ ...labelStyle, width: 130, color: theme.colors.textPrimary }}>{truncate(row.label, 18)}</Text>
                    <Text style={{ ...labelStyle, width: 30, textAlign: "right", color: theme.colors.textPrimary }}>{row.count}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={cardStyle}>
            <SectionHeading theme={theme} title="Totals" />
            <Text style={labelStyle}>Attendance: {data.attendance.length}</Text>
            <Text style={labelStyle}>Supportive: {supportiveTotal}</Text>
            <Text style={labelStyle}>
              Total Attended Residents: {monthlyParticipation.totalResidentsInCurrentMonthThatHaveAttended}
            </Text>
            <Text style={labelStyle}>Residents participated: {monthlyParticipation.residentsParticipated}</Text>
            <Text style={labelStyle}>Participation %: {monthlyParticipation.participationPercent.toFixed(1)}%</Text>
            <Text style={labelStyle}>Average daily %: {monthlyParticipation.averageDailyPercent.toFixed(1)}%</Text>
            <Text style={labelStyle}>Refused: {data.attendanceCounts.refused}</Text>
            <Text style={labelStyle}>No Show: {data.attendanceCounts.noShow}</Text>
            {sections.oneToOneTotals ? <Text style={labelStyle}>1:1 notes: {data.oneToOneTotal}</Text> : null}
            <Text style={labelStyle}>Engagement scale max: {engagementScaleMax}</Text>
          </View>
          </View>
        </View>

        {sections.notableOutcomes ? (
          <View style={cardStyle}>
            <SectionHeading theme={theme} title="Notable Resident Outcomes" />
            {outcomeRows.length === 0 ? (
              <Text style={labelStyle}>No notable outcomes documented for this month.</Text>
            ) : (
              outcomeRows.map((row, index) => (
                <View
                  key={`${row.resident}-${index}`}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.glassBorder,
                    borderRadius: 8,
                    backgroundColor: theme.colors.glassFillStrong,
                    padding: 7,
                    marginBottom: index === outcomeRows.length - 1 ? 0 : 5
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text
                      style={{
                        fontFamily: PDF_DISPLAY_FONT,
                        fontSize: 8.3,
                        lineHeight: 1.2,
                        color: theme.colors.textSecondary
                      }}
                    >
                      {truncate(row.resident, 34)}
                    </Text>
                    <Text style={labelStyle}>{row.createdAt.toLocaleDateString()}</Text>
                  </View>
                  <Text style={{ ...labelStyle, fontSize: 9, lineHeight: 1.3, color: theme.colors.textPrimary }}>
                    {truncate(row.narrative, 260)}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        <Footer theme={theme} generatedAt={generatedAt} includeMeta={includeFooterMeta ?? true} />
      </Page>
    </Document>
  );
}

export async function generateReportPdf(
  data: MonthlyReportPdfData,
  theme: ReportThemeTokens = defaultReportTheme,
  options?: {
    facilityName?: string;
    generatedAt?: string;
    engagementWeights?: {
      present: number;
      active: number;
      leading: number;
    };
    includeSections?: {
      topPrograms?: boolean;
      attendanceTrends?: boolean;
      engagementAvg?: boolean;
      barriersSummary?: boolean;
      oneToOneTotals?: boolean;
      notableOutcomes?: boolean;
      unitHeatmap?: boolean;
    };
    paperSize?: "LETTER" | "A4";
    margins?: "NORMAL" | "NARROW" | "WIDE";
    includeFooterMeta?: boolean;
  }
) {
  const generatedAt = options?.generatedAt ?? formatTimestamp(new Date());
  const facilityName = options?.facilityName ?? "My Facility";
  const doc = monthlyReportDocument({
    data,
    theme,
    facilityName,
    generatedAt,
    engagementWeights: options?.engagementWeights,
    includeSections: options?.includeSections,
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

  throw new Error("Failed to generate PDF bytes.");
}
