import { CuesRequired, MoodAffect, ParticipationLevel, ProgressNoteType, ResponseType } from "@prisma/client";

type NarrativeInput = {
  residentName: string;
  room: string;
  noteType: ProgressNoteType;
  participationLevel: ParticipationLevel;
  moodAffect: MoodAffect;
  cuesRequired: CuesRequired;
  response: ResponseType;
  activityTitle?: string | null;
  quickPhrases?: string[];
  followUp?: string;
};

const cuesMap: Record<CuesRequired, string> = {
  NONE: "without cues",
  VERBAL: "with verbal cueing",
  VISUAL: "with visual prompts",
  HAND_OVER_HAND: "with hand-over-hand support"
};

const participationMap: Record<ParticipationLevel, string> = {
  MINIMAL: "minimal participation",
  MODERATE: "moderate participation",
  HIGH: "active participation"
};

export function generateNarrative(input: NarrativeInput) {
  const activityPhrase = input.activityTitle
    ? `during ${input.activityTitle}`
    : input.noteType === ProgressNoteType.ONE_TO_ONE
      ? "during a 1:1 interaction"
      : "during group programming";

  const phraseBlock = input.quickPhrases?.length ? ` ${input.quickPhrases.join(" ")}` : "";
  const follow = input.followUp ? ` Follow-up: ${input.followUp}` : "";

  return `${input.residentName} (Room ${input.room}) was observed ${activityPhrase}. Mood/affect was ${input.moodAffect.toLowerCase()} with ${participationMap[input.participationLevel]}. Resident responded ${input.response.toLowerCase()} and engaged ${cuesMap[input.cuesRequired]}.${phraseBlock}${follow}`.trim();
}
