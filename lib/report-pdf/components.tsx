import React from "react";
import {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View
} from "@react-pdf/renderer";
import { type Style } from "@react-pdf/types";

import { PDF_BODY_FONT, PDF_DISPLAY_FONT } from "./fonts";
import { type ReportThemeTokens } from "./ReportTheme";

type StyleLike = Style | Style[];

function truncateText(value: string | number | null | undefined, max = 60) {
  if (value === null || value === undefined) return "-";
  const text = String(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

const baseStyles = StyleSheet.create({
  footerRow: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 7
  }
});

export function ReportTheme({
  theme,
  children,
  style
}: {
  theme: ReportThemeTokens;
  children: React.ReactNode;
  style?: StyleLike;
}) {
  const styleList = Array.isArray(style) ? style : style ? [style] : [];
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.background
        },
        ...styleList
      ]}
    >
      {children}
    </View>
  );
}

export function GlassCard({
  id,
  theme,
  children,
  style,
  padding = 12
}: {
  id: string;
  theme: ReportThemeTokens;
  children: React.ReactNode;
  style?: StyleLike;
  padding?: number;
}) {
  const styleList = Array.isArray(style) ? style : style ? [style] : [];
  return (
    <View
      style={[
        {
          position: "relative",
          overflow: "hidden",
          borderRadius: theme.radius.small,
          borderWidth: 1,
          borderColor: theme.colors.glassBorder,
          backgroundColor: theme.colors.glassFill,
          padding,
          marginBottom: theme.spacing.sm
        },
        ...styleList
      ]}
    >
      <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`${id}-glass-sheen`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.colors.sheenStart} stopOpacity={0.42} />
            <Stop offset="0.55" stopColor={theme.colors.sheenEnd} stopOpacity={0.14} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          <RadialGradient id={`${id}-glass-bloom`} cx="0.1" cy="0.1" r="0.95">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${id}-glass-sheen)`} />
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${id}-glass-bloom)`} />
      </Svg>
      <View
        style={{
          position: "absolute",
          top: 1,
          left: 1,
          right: 1,
          bottom: 1,
          borderRadius: theme.radius.small - 1,
          borderWidth: 1,
          borderColor: theme.colors.glassInnerBorder
        }}
      />
      <View style={{ position: "relative", zIndex: 2 }}>{children}</View>
    </View>
  );
}

export function GlassPill({
  theme,
  label,
  tone = "neutral",
  style
}: {
  theme: ReportThemeTokens;
  label: string;
  tone?: "neutral" | "blue" | "mint" | "coral";
  style?: StyleLike;
}) {
  const styleList = Array.isArray(style) ? style : style ? [style] : [];
  const toneMap: Record<string, { bg: string; text: string; border: string }> = {
    neutral: {
      bg: "#F8FAFC",
      text: theme.colors.textPrimary,
      border: theme.colors.glassBorder
    },
    blue: {
      bg: "#DBEAFE",
      text: theme.colors.accentBlue,
      border: "#BFDBFE"
    },
    mint: {
      bg: "#CCFBF1",
      text: "#0F766E",
      border: "#99F6E4"
    },
    coral: {
      bg: "#FFE4E6",
      text: "#BE123C",
      border: "#FDA4AF"
    }
  };
  const currentTone = toneMap[tone];

  return (
    <Text
      style={[
        {
          borderRadius: 999,
          borderWidth: 1,
          borderColor: currentTone.border,
          backgroundColor: currentTone.bg,
          color: currentTone.text,
          fontFamily: PDF_DISPLAY_FONT,
          fontSize: 8.4,
          paddingVertical: 2,
          paddingHorizontal: 8
        },
        ...styleList
      ]}
    >
      {label}
    </Text>
  );
}

export function MetricTile({
  id,
  theme,
  label,
  value,
  detail,
  tone = "neutral"
}: {
  id: string;
  theme: ReportThemeTokens;
  label: string;
  value: string | number;
  detail: string;
  tone?: "neutral" | "blue" | "mint" | "coral";
}) {
  const toneFill: Record<string, string> = {
    neutral: "#F8FAFC",
    blue: "#EFF6FF",
    mint: "#F0FDFA",
    coral: "#FFF1F2"
  };

  return (
    <GlassCard
      id={id}
      theme={theme}
      padding={10}
      style={{
        width: "48.4%",
        marginBottom: theme.spacing.sm,
        backgroundColor: toneFill[tone]
      }}
    >
      <Text
        style={{
          fontFamily: PDF_DISPLAY_FONT,
          fontSize: 8,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: theme.colors.textMuted
        }}
      >
        {label}
      </Text>
      <Text style={{ marginTop: 4, fontFamily: PDF_DISPLAY_FONT, fontSize: 16.5, fontWeight: 700, color: theme.colors.textPrimary }}>{value}</Text>
      <Text style={{ marginTop: 2, fontFamily: PDF_BODY_FONT, fontSize: 8.6, color: theme.colors.textSecondary, lineHeight: 11 }}>{detail}</Text>
    </GlassCard>
  );
}

export function SectionHeader({
  theme,
  title,
  subtitle,
  rightNode
}: {
  theme: ReportThemeTokens;
  title: string;
  subtitle?: string;
  rightNode?: React.ReactNode;
}) {
  return (
    <View
      style={{
        marginBottom: theme.spacing.sm,
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between"
      }}
    >
      <View style={{ flexShrink: 1, paddingRight: 10 }}>
        <Text style={{ fontFamily: PDF_DISPLAY_FONT, fontSize: theme.typography.section, fontWeight: 700, color: theme.colors.textPrimary }}>{title}</Text>
        {subtitle ? (
          <Text style={{ marginTop: 2, fontFamily: PDF_BODY_FONT, fontSize: 8.8, lineHeight: 11, color: theme.colors.textSecondary }}>{subtitle}</Text>
        ) : null}
      </View>
      {rightNode ? <View>{rightNode}</View> : null}
    </View>
  );
}

export interface DataTableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  width?: number;
  truncate?: number;
}

export function DataTable({
  theme,
  columns,
  rows,
  emptyText = "No rows",
  style
}: {
  theme: ReportThemeTokens;
  columns: DataTableColumn[];
  rows: Array<Record<string, string | number | null | undefined>>;
  emptyText?: string;
  style?: StyleLike;
}) {
  const styleList = Array.isArray(style) ? style : style ? [style] : [];
  const totalWeight = columns.reduce((sum, column) => sum + (column.width ?? 1), 0);

  return (
    <View style={styleList}>
      <View
        style={{
          borderRadius: theme.radius.small,
          borderWidth: 1,
          borderColor: theme.colors.glassBorder,
          overflow: "hidden"
        }}
      >
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.glassBorder,
            backgroundColor: theme.colors.tableHeader,
            paddingVertical: 6,
            paddingHorizontal: 8
          }}
        >
          {columns.map((column) => (
            <Text
              key={column.key}
              style={{
                flex: (column.width ?? 1) / totalWeight,
                textAlign: column.align ?? "left",
                fontFamily: PDF_DISPLAY_FONT,
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: theme.colors.textSecondary,
                paddingHorizontal: 2
              }}
            >
              {column.label}
            </Text>
          ))}
        </View>

        {rows.length === 0 ? (
          <View style={{ padding: 10 }}>
            <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 9, color: theme.colors.textMuted }}>{emptyText}</Text>
          </View>
        ) : (
          rows.map((row, index) => (
            <View
              key={`row-${index}`}
              style={{
                flexDirection: "row",
                paddingVertical: 6,
                paddingHorizontal: 8,
                backgroundColor: index % 2 === 0 ? "#FFFFFF" : theme.colors.rowStripe,
                borderBottomWidth: index === rows.length - 1 ? 0 : 1,
                borderBottomColor: theme.colors.glassBorder
              }}
            >
              {columns.map((column) => (
                <Text
                  key={`${index}-${column.key}`}
                  style={{
                    flex: (column.width ?? 1) / totalWeight,
                    textAlign: column.align ?? "left",
                    fontFamily: PDF_BODY_FONT,
                    fontSize: theme.typography.table,
                    color: theme.colors.textPrimary,
                    lineHeight: 12.5,
                    paddingHorizontal: 2
                  }}
                >
                  {truncateText(row[column.key], column.truncate ?? (column.align === "left" ? 44 : 20))}
                </Text>
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

export function MiniChartFrame({
  theme,
  title,
  subtitle,
  items
}: {
  theme: ReportThemeTokens;
  title: string;
  subtitle?: string;
  items: Array<{ label: string; value: number; percent: number; color: string }>;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <GlassCard id={`mini-chart-${title.toLowerCase().replace(/\s+/g, "-")}`} theme={theme}>
      <SectionHeader theme={theme} title={title} subtitle={subtitle} />
      {items.length === 0 ? (
        <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 9, color: theme.colors.textMuted }}>No chart data available.</Text>
      ) : (
        items.map((item, idx) => {
          const width = item.value === 0 ? 0 : Math.max((item.value / max) * 100, 7);
          return (
            <View key={`${item.label}-${idx}`} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 8.8, color: theme.colors.textSecondary }}>{item.label}</Text>
                <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 8.8, color: theme.colors.textMuted }}>{item.value} ({item.percent.toFixed(1)}%)</Text>
              </View>
              <View
                style={{
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: "#EFF6FF",
                  borderWidth: 1,
                  borderColor: "#BFDBFE",
                  overflow: "hidden"
                }}
              >
                <View style={{ height: 7, width: `${width}%`, borderRadius: 999, backgroundColor: item.color }} />
              </View>
            </View>
          );
        })
      )}
    </GlassCard>
  );
}

export function FooterMeta({
  theme,
  generatedAt,
  facilityName,
  monthLabel
}: {
  theme: ReportThemeTokens;
  generatedAt: string;
  facilityName: string;
  monthLabel: string;
}) {
  return (
    <View
      fixed
      style={[
        baseStyles.footerRow,
        {
          borderTopColor: "#E5E7EB"
        }
      ]}
    >
      <Text style={{ fontFamily: PDF_BODY_FONT, fontSize: 8, color: theme.colors.textMuted }}>
        {facilityName} - {monthLabel} - Generated {generatedAt}
      </Text>
      <Text
        style={{ fontFamily: PDF_BODY_FONT, fontSize: 8, color: theme.colors.textMuted }}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}
