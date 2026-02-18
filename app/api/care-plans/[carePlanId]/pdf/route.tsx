import { auth } from "@clerk/nextjs/server";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf
} from "@react-pdf/renderer";

import { prisma } from "@/lib/prisma";
import { focusAreaLabel } from "@/lib/care-plans/enums";
import { computeCarePlanDisplayStatus, displayStatusLabel } from "@/lib/care-plans/status";

export const runtime = "nodejs";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toTitle(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatFrequency(frequency: string, custom: string | null) {
  if (frequency === "THREE_PER_WEEK") return "3x per week";
  if (frequency === "CUSTOM") return custom?.trim() || "Custom";
  return toTitle(frequency);
}

type Tone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

function statusTone(label: string): Tone {
  if (label === "Overdue") {
    return { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5", textColor: "#B91C1C" };
  }
  if (label === "Due Soon") {
    return { backgroundColor: "#FEF3C7", borderColor: "#FCD34D", textColor: "#92400E" };
  }
  if (label === "Active") {
    return { backgroundColor: "#DCFCE7", borderColor: "#86EFAC", textColor: "#166534" };
  }
  if (label === "No Plan") {
    return { backgroundColor: "#FFEDD5", borderColor: "#FDBA74", textColor: "#9A3412" };
  }
  if (label === "Archived") {
    return { backgroundColor: "#EDE9FE", borderColor: "#C4B5FD", textColor: "#5B21B6" };
  }
  return { backgroundColor: "#E2E8F0", borderColor: "#CBD5E1", textColor: "#334155" };
}

function reviewTone(result: "IMPROVED" | "NO_CHANGE" | "DECLINED"): Tone {
  if (result === "IMPROVED") {
    return { backgroundColor: "#DCFCE7", borderColor: "#86EFAC", textColor: "#166534" };
  }
  if (result === "DECLINED") {
    return { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5", textColor: "#B91C1C" };
  }
  return { backgroundColor: "#E2E8F0", borderColor: "#CBD5E1", textColor: "#334155" };
}

function adaptationTags(input: {
  bedBoundFriendly: boolean;
  dementiaFriendly: boolean;
  lowVisionFriendly: boolean;
  hardOfHearingFriendly: boolean;
}) {
  const tags: string[] = [];
  if (input.bedBoundFriendly) tags.push("Bed-bound");
  if (input.dementiaFriendly) tags.push("Dementia");
  if (input.lowVisionFriendly) tags.push("Low vision");
  if (input.hardOfHearingFriendly) tags.push("HOH");
  return tags;
}

const styles = StyleSheet.create({
  page: {
    padding: 22,
    fontSize: 10,
    color: "#0F172A",
    backgroundColor: "#F5F7FB"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBE5F3",
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }
  },
  headerAccent: {
    height: 6,
    backgroundColor: "#2563EB",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12
  },
  headerBody: {
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  kicker: {
    fontSize: 8,
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 2
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0F172A"
  },
  subtitle: {
    fontSize: 9,
    color: "#475569",
    marginTop: 2
  },
  generatedAt: {
    fontSize: 8,
    color: "#64748B",
    marginTop: 2
  },
  pillRow: {
    flexDirection: "row",
    marginTop: 8
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 6
  },
  pillText: {
    fontSize: 8,
    fontWeight: 700
  },
  summaryGrid: {
    flexDirection: "row",
    marginHorizontal: -4
  },
  summaryCell: {
    width: "25%",
    paddingHorizontal: 4
  },
  summaryInner: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBE5F3",
    borderRadius: 10,
    minHeight: 68,
    padding: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }
  },
  summaryHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  iconCircle: {
    width: 18,
    height: 18,
    borderRadius: 999,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  iconText: {
    fontSize: 8,
    fontWeight: 700
  },
  summaryLabel: {
    fontSize: 8,
    color: "#64748B"
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: 700,
    color: "#0F172A",
    lineHeight: 1.35
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBE5F3",
    borderRadius: 12,
    marginBottom: 10,
    padding: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0F172A"
  },
  sectionHeaderSub: {
    fontSize: 8,
    color: "#64748B",
    marginTop: 1
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 5,
    marginBottom: 5
  },
  chipText: {
    fontSize: 8,
    fontWeight: 600
  },
  itemBlock: {
    borderWidth: 1,
    borderColor: "#E4ECF7",
    backgroundColor: "#F8FBFF",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6
  },
  itemTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#0F172A"
  },
  itemSub: {
    marginTop: 2,
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.35
  },
  rowSplit: {
    flexDirection: "row",
    gap: 8
  },
  half: {
    width: "50%"
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: "#E4ECF7",
    backgroundColor: "#F8FBFF",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6
  },
  reviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  reviewDate: {
    fontSize: 9,
    fontWeight: 700,
    color: "#0F172A"
  },
  reviewMeta: {
    marginTop: 2,
    fontSize: 8,
    color: "#64748B"
  },
  reviewNote: {
    marginTop: 4,
    fontSize: 8,
    color: "#334155",
    lineHeight: 1.35
  },
  smallMuted: {
    fontSize: 8,
    color: "#64748B"
  }
});

export async function GET(
  _request: Request,
  { params }: { params: { carePlanId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { facilityId: true }
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const carePlan = await prisma.carePlan.findFirst({
    where: {
      id: params.carePlanId,
      resident: {
        facilityId: user.facilityId
      }
    },
    include: {
      resident: {
        select: {
          firstName: true,
          lastName: true,
          room: true
        }
      },
      goals: true,
      interventions: {
        orderBy: [{ type: "asc" }, { order: "asc" }]
      },
      reviews: {
        orderBy: { reviewDate: "desc" },
        take: 3
      }
    }
  });

  if (!carePlan) {
    return Response.json({ error: "Care plan not found" }, { status: 404 });
  }

  const status = displayStatusLabel(
    computeCarePlanDisplayStatus({
      hasPlan: true,
      archived: carePlan.status === "ARCHIVED",
      nextReviewDate: carePlan.nextReviewDate
    })
  );

  const focusAreas = toStringArray(carePlan.focusAreas).map((item) => focusAreaLabel(item));
  const barriers = toStringArray(carePlan.barriers);
  const supports = toStringArray(carePlan.supports);

  const groupedInterventions = {
    GROUP: carePlan.interventions.filter((item) => item.type === "GROUP"),
    ONE_TO_ONE: carePlan.interventions.filter((item) => item.type === "ONE_TO_ONE"),
    INDEPENDENT: carePlan.interventions.filter((item) => item.type === "INDEPENDENT")
  };

  const statusToneValue = statusTone(status);
  const generatedAt = formatDate(new Date());

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.card}>
          <View style={styles.headerAccent} />
          <View style={styles.headerBody}>
            <View style={styles.headerTopRow}>
              <View>
                <Text style={styles.kicker}>ACTIFY · CARE PLAN OVERVIEW</Text>
                <Text style={styles.title}>
                  {carePlan.resident.firstName} {carePlan.resident.lastName} · Room {carePlan.resident.room}
                </Text>
                <Text style={styles.subtitle}>
                  Modern care-plan snapshot with focus, goals, interventions, and review outcomes.
                </Text>
              </View>
              <Text style={styles.generatedAt}>Generated: {generatedAt}</Text>
            </View>
            <View style={styles.pillRow}>
              <View style={[styles.pill, { backgroundColor: statusToneValue.backgroundColor, borderColor: statusToneValue.borderColor }]}>
                <Text style={[styles.pillText, { color: statusToneValue.textColor }]}>{status}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: "#E0E7FF", borderColor: "#A5B4FC" }]}>
                <Text style={[styles.pillText, { color: "#3730A3" }]}>
                  {toTitle(carePlan.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCell}>
            <View style={styles.summaryInner}>
              <View style={styles.summaryHead}>
                <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE", borderColor: "#93C5FD" }]}>
                  <Text style={[styles.iconText, { color: "#1D4ED8" }]}>F</Text>
                </View>
                <Text style={styles.summaryLabel}>Primary Focus</Text>
              </View>
              <Text style={styles.summaryValue}>{focusAreas[0] || "Not set"}</Text>
            </View>
          </View>
          <View style={styles.summaryCell}>
            <View style={styles.summaryInner}>
              <View style={styles.summaryHead}>
                <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }]}>
                  <Text style={[styles.iconText, { color: "#166534" }]}>R</Text>
                </View>
                <Text style={styles.summaryLabel}>Frequency</Text>
              </View>
              <Text style={styles.summaryValue}>{formatFrequency(carePlan.frequency, carePlan.frequencyCustom)}</Text>
            </View>
          </View>
          <View style={styles.summaryCell}>
            <View style={styles.summaryInner}>
              <View style={styles.summaryHead}>
                <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" }]}>
                  <Text style={[styles.iconText, { color: "#92400E" }]}>N</Text>
                </View>
                <Text style={styles.summaryLabel}>Next Review</Text>
              </View>
              <Text style={styles.summaryValue}>{formatDate(carePlan.nextReviewDate)}</Text>
            </View>
          </View>
          <View style={styles.summaryCell}>
            <View style={styles.summaryInner}>
              <View style={styles.summaryHead}>
                <View style={[styles.iconCircle, { backgroundColor: "#EDE9FE", borderColor: "#C4B5FD" }]}>
                  <Text style={[styles.iconText, { color: "#5B21B6" }]}>L</Text>
                </View>
                <Text style={styles.summaryLabel}>Latest Review</Text>
              </View>
              <Text style={styles.summaryValue}>
                {carePlan.reviews[0] ? formatDate(carePlan.reviews[0].reviewDate) : "No review yet"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rowSplit}>
          <View style={[styles.sectionCard, styles.half]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE", borderColor: "#93C5FD" }]}>
                <Text style={[styles.iconText, { color: "#1D4ED8" }]}>F</Text>
              </View>
              <View>
                <Text style={styles.sectionHeaderTitle}>Focus Areas</Text>
                <Text style={styles.sectionHeaderSub}>Core engagement directions</Text>
              </View>
            </View>
            <View style={styles.chipWrap}>
              {focusAreas.length === 0 ? <Text style={styles.smallMuted}>No focus areas selected.</Text> : null}
              {focusAreas.map((item, idx) => {
                const chipStyle =
                  idx % 3 === 0
                    ? { backgroundColor: "#DBEAFE", borderColor: "#93C5FD", textColor: "#1D4ED8" }
                    : idx % 3 === 1
                      ? { backgroundColor: "#DCFCE7", borderColor: "#86EFAC", textColor: "#166534" }
                      : { backgroundColor: "#FCE7F3", borderColor: "#F9A8D4", textColor: "#9D174D" };
                return (
                  <View key={item} style={[styles.chip, { backgroundColor: chipStyle.backgroundColor, borderColor: chipStyle.borderColor }]}>
                    <Text style={[styles.chipText, { color: chipStyle.textColor }]}>{item}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.sectionCard, styles.half]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }]}>
                <Text style={[styles.iconText, { color: "#166534" }]}>G</Text>
              </View>
              <View>
                <Text style={styles.sectionHeaderTitle}>Goals</Text>
                <Text style={styles.sectionHeaderSub}>Measurable baseline-to-target goals</Text>
              </View>
            </View>
            {carePlan.goals.length === 0 ? <Text style={styles.smallMuted}>No goals documented.</Text> : null}
            {carePlan.goals.map((goal) => (
              <View key={goal.id} style={styles.itemBlock}>
                <Text style={styles.itemTitle}>{goal.customText || goal.templateKey || "Goal"}</Text>
                <Text style={styles.itemSub}>
                  Baseline: {toTitle(goal.baseline)} · Target: {toTitle(goal.target)} · Timeframe: {goal.timeframeDays} days
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#EDE9FE", borderColor: "#C4B5FD" }]}>
              <Text style={[styles.iconText, { color: "#5B21B6" }]}>I</Text>
            </View>
            <View>
              <Text style={styles.sectionHeaderTitle}>Interventions</Text>
              <Text style={styles.sectionHeaderSub}>Grouped by delivery type with adaptations</Text>
            </View>
          </View>

          <Text style={[styles.itemTitle, { marginBottom: 4 }]}>Group</Text>
          {groupedInterventions.GROUP.length === 0 ? <Text style={[styles.smallMuted, { marginBottom: 6 }]}>No group interventions.</Text> : null}
          {groupedInterventions.GROUP.map((item) => (
            <View key={item.id} style={styles.itemBlock}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSub}>
                {adaptationTags(item).length ? `Adaptations: ${adaptationTags(item).join(", ")}` : "Standard setup"}
              </Text>
            </View>
          ))}

          <Text style={[styles.itemTitle, { marginBottom: 4, marginTop: 2 }]}>1:1</Text>
          {groupedInterventions.ONE_TO_ONE.length === 0 ? <Text style={[styles.smallMuted, { marginBottom: 6 }]}>No 1:1 interventions.</Text> : null}
          {groupedInterventions.ONE_TO_ONE.map((item) => (
            <View key={item.id} style={styles.itemBlock}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSub}>
                {adaptationTags(item).length ? `Adaptations: ${adaptationTags(item).join(", ")}` : "Standard setup"}
              </Text>
            </View>
          ))}

          <Text style={[styles.itemTitle, { marginBottom: 4, marginTop: 2 }]}>Independent</Text>
          {groupedInterventions.INDEPENDENT.length === 0 ? <Text style={[styles.smallMuted, { marginBottom: 2 }]}>No independent interventions.</Text> : null}
          {groupedInterventions.INDEPENDENT.map((item) => (
            <View key={item.id} style={styles.itemBlock}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSub}>
                {adaptationTags(item).length ? `Adaptations: ${adaptationTags(item).join(", ")}` : "Standard setup"}
              </Text>
            </View>
          ))}
        </View>

        {barriers.length > 0 || supports.length > 0 ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#FFE4E6", borderColor: "#FDA4AF" }]}>
                <Text style={[styles.iconText, { color: "#BE123C" }]}>C</Text>
              </View>
              <View>
                <Text style={styles.sectionHeaderTitle}>Context: Barriers & Supports</Text>
                <Text style={styles.sectionHeaderSub}>Important care context for participation planning</Text>
              </View>
            </View>
            {barriers.length > 0 ? (
              <View style={[styles.itemBlock, { marginBottom: 6 }]}>
                <Text style={styles.itemTitle}>Barriers</Text>
                <Text style={styles.itemSub}>{barriers.join(", ")}</Text>
              </View>
            ) : null}
            {supports.length > 0 ? (
              <View style={styles.itemBlock}>
                <Text style={styles.itemTitle}>Supports</Text>
                <Text style={styles.itemSub}>{supports.join(", ")}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#CCFBF1", borderColor: "#5EEAD4" }]}>
              <Text style={[styles.iconText, { color: "#115E59" }]}>R</Text>
            </View>
            <View>
              <Text style={styles.sectionHeaderTitle}>Latest Reviews</Text>
              <Text style={styles.sectionHeaderSub}>Up to 3 most recent review outcomes</Text>
            </View>
          </View>
          {carePlan.reviews.length === 0 ? <Text style={styles.smallMuted}>No reviews yet.</Text> : null}
          {carePlan.reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewTop}>
                <Text style={styles.reviewDate}>{formatDate(review.reviewDate)}</Text>
                <View
                  style={[
                    styles.pill,
                    {
                      marginRight: 0,
                      backgroundColor: reviewTone(review.result).backgroundColor,
                      borderColor: reviewTone(review.result).borderColor
                    }
                  ]}
                >
                  <Text style={[styles.pillText, { color: reviewTone(review.result).textColor }]}>{toTitle(review.result)}</Text>
                </View>
              </View>
              <Text style={styles.reviewMeta}>
                Participation: {toTitle(review.participation)} · Response: {toTitle(review.response)}
              </Text>
              <Text style={styles.reviewNote}>
                {review.note ? review.note.slice(0, 220) : "No note provided."}
              </Text>
              <Text style={[styles.reviewMeta, { marginTop: 3 }]}>
                Next review: {formatDate(review.nextReviewDateAfter)}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const arrayBuffer = await blob.arrayBuffer();

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="care-plan-${carePlan.resident.lastName.toLowerCase()}-${carePlan.id}.pdf"`
    }
  });
}
