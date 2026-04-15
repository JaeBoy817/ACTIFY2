import { rewordOneToOneNote, rewordProgressNote } from "@/lib/assistant/noteRewriter";

export const NOTE_REWRITER_DEMO_CASES = [
  {
    id: "progress-music",
    noteType: "progress" as const,
    input: "Resident came to music and clapped some. Smiled and stayed the whole time."
  },
  {
    id: "one-to-one-room",
    noteType: "one_to_one" as const,
    input: "Visited resident in room. She didnt want group. Talked about her kids and looked at puzzle book. Calm."
  },
  {
    id: "progress-bingo",
    noteType: "progress" as const,
    input: "Resident was at bingo but mostly watched. Needed encouragement."
  },
  {
    id: "progress-upset",
    noteType: "progress" as const,
    input: "Resident got upset and didnt want to stay long."
  }
];

export function getNoteRewriterDemoOutputs() {
  return NOTE_REWRITER_DEMO_CASES.map((demoCase) => {
    const rewritten =
      demoCase.noteType === "progress"
        ? rewordProgressNote(demoCase.input, "professional")
        : rewordOneToOneNote(demoCase.input, "professional");

    return {
      ...demoCase,
      output: rewritten.note
    };
  });
}

