import { AssistantWorkspace } from "@/components/assistant-dashboard/AssistantWorkspace";
import type { ResidentSnapshot } from "@/components/assistant-dashboard/types";
import { ensureUserAndFacility } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FALLBACK_RESIDENT_SNAPSHOTS: ResidentSnapshot[] = [
  {
    id: "fallback-martha-hill",
    name: "Martha Hill",
    room: "101A",
    interests: ["Gospel music", "Bingo", "Gardening"],
    dislikes: ["Loud morning groups"],
    favoriteTopics: ["Church choir", "Grandkids", "Spring flowers"],
    participationStyle: "Moderate in groups, stronger in afternoon 1:1 visits",
    limitations: ["Fatigues early morning"],
    suggestedMatches: ["Afternoon music social", "Bedside hymn singalong"]
  },
  {
    id: "fallback-james-carter",
    name: "James Carter",
    room: "102B",
    interests: ["Card games", "Sports highlights", "Coffee chats"],
    dislikes: ["Crowded spaces"],
    favoriteTopics: ["Baseball", "Military service"],
    participationStyle: "Prefers small-group or one-to-one",
    limitations: ["Declines long seated sessions"],
    suggestedMatches: ["Small table cards", "Sports trivia rounds"]
  },
  {
    id: "fallback-louise-bryant",
    name: "Louise Bryant",
    room: "110C",
    interests: ["Crafts", "Devotional readings", "Classic movies"],
    dislikes: ["Fast-paced games"],
    favoriteTopics: ["Family recipes", "Faith community"],
    participationStyle: "High engagement with guided prompts",
    limitations: ["Needs visual cues"],
    suggestedMatches: ["Guided craft station", "Quiet devotional group"]
  },
  {
    id: "fallback-harold-dean",
    name: "Harold Dean",
    room: "118B",
    interests: ["Word puzzles", "History discussions", "Big band music"],
    dislikes: ["Noisy backgrounds"],
    favoriteTopics: ["Travel stories", "Local history"],
    participationStyle: "Best in calm, structured sessions",
    limitations: ["Hearing support needed"],
    suggestedMatches: ["Printed puzzle corner", "Music memory quiz"]
  },
  {
    id: "fallback-eleanor-price",
    name: "Eleanor Price",
    room: "214A",
    interests: ["Sensory activities", "Photo albums", "Poetry"],
    dislikes: ["Long transitions"],
    favoriteTopics: ["Pets", "Nature scenes"],
    participationStyle: "Responds well to short, soothing visits",
    limitations: ["Limited endurance"],
    suggestedMatches: ["Sensory basket rounds", "Photo reminiscence"]
  }
];

function parseList(value: string | null | undefined) {
  if (!value) return [];

  return value
    .split(/[,;|]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function firstNameFromFullName(name: string | null | undefined) {
  if (!name) return "there";
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

function deriveFromResident(
  resident: {
    id: string;
    firstName: string;
    lastName: string;
    room: string;
    preferences: string | null;
    tags: string | null;
    notes: string | null;
    safetyNotes: string | null;
    bestTimesOfDay: string | null;
  },
  fallback: ResidentSnapshot
): ResidentSnapshot {
  const interests = [...parseList(resident.preferences), ...parseList(resident.tags)].slice(0, 4);
  const limitations = [...parseList(resident.safetyNotes), ...parseList(resident.bestTimesOfDay)].slice(0, 3);
  const topicSeed = parseList(resident.notes);

  return {
    id: resident.id,
    name: `${resident.firstName} ${resident.lastName}`.trim(),
    room: resident.room,
    interests: interests.length ? interests : fallback.interests,
    dislikes: fallback.dislikes,
    favoriteTopics: topicSeed.length ? topicSeed : fallback.favoriteTopics,
    participationStyle: fallback.participationStyle,
    limitations: limitations.length ? limitations : fallback.limitations,
    suggestedMatches: fallback.suggestedMatches
  };
}

async function getResidentSnapshots(facilityId: string): Promise<ResidentSnapshot[]> {
  try {
    const residents = await prisma.resident.findMany({
      where: {
        facilityId,
        isActive: true
      },
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      take: 6,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        preferences: true,
        tags: true,
        notes: true,
        safetyNotes: true,
        bestTimesOfDay: true
      }
    });

    if (!residents.length) {
      return FALLBACK_RESIDENT_SNAPSHOTS;
    }

    return residents.map((resident, index) =>
      deriveFromResident(resident, FALLBACK_RESIDENT_SNAPSHOTS[index % FALLBACK_RESIDENT_SNAPSHOTS.length])
    );
  } catch (error) {
    console.error("[app-home] resident snapshot fallback", error);
    return FALLBACK_RESIDENT_SNAPSHOTS;
  }
}

export default async function AppHomePage() {
  const user = await ensureUserAndFacility();
  const residents = await getResidentSnapshots(user.facilityId);
  const firstName = firstNameFromFullName(user.name);

  return (
    <div className="min-h-[calc(100vh-8.5rem)]">
      <AssistantWorkspace firstName={firstName} residents={residents} />
    </div>
  );
}
