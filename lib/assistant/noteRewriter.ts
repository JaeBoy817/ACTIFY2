export type NoteRewriteType = "progress" | "one_to_one";
export type NoteRewriteStyle = "professional" | "shorter" | "detailed";

export type NoteRewriteIntent = {
  isRewriteIntent: boolean;
  noteType: NoteRewriteType | "unknown";
  style: NoteRewriteStyle;
  noteText: string;
};

export type NoteRewriteResult = {
  note: string;
  responseId: string;
  variant: number;
};

type PhraseRule = {
  pattern: RegExp;
  replacements: string[];
};

const COMMON_RULES: PhraseRule[] = [
  {
    pattern: /\bdidn'?t want to come out\b/gi,
    replacements: ["declined group participation", "preferred to remain in room and declined group participation"]
  },
  {
    pattern: /\bdidn'?t really want to do it\b/gi,
    replacements: ["was initially hesitant to engage", "showed initial hesitation with participation"]
  },
  {
    pattern: /\bdid pretty good\b/gi,
    replacements: ["participated well", "demonstrated good participation"]
  },
  {
    pattern: /\btalked with other residents\b/gi,
    replacements: ["interacted socially with peers", "engaged in social interaction with peers"]
  },
  {
    pattern: /\bneeded (a |some )?encouragement\b/gi,
    replacements: ["participated with encouragement", "required verbal encouragement to engage"]
  },
  {
    pattern: /\bseemed calm\b/gi,
    replacements: ["appeared calm", "presented with a calm affect"]
  },
  {
    pattern: /\bwas in a good mood\b/gi,
    replacements: ["presented with a pleasant mood", "appeared to be in a pleasant mood"]
  },
  {
    pattern: /\bstayed for a little bit\b/gi,
    replacements: ["attended for a portion of the activity", "remained for part of the session"]
  },
  {
    pattern: /\blooked at magazines\b/gi,
    replacements: ["reviewed magazines", "looked through magazines"]
  },
  {
    pattern: /\bwe talked about\b/gi,
    replacements: ["resident engaged in conversation regarding", "discussion included"]
  },
  {
    pattern: /\bcame to\b/gi,
    replacements: ["attended", "participated in"]
  },
  {
    pattern: /\bplayed some\b/gi,
    replacements: ["participated intermittently", "participated during portions of the activity"]
  }
];

const PROGRESS_RULES: PhraseRule[] = [
  {
    pattern: /\bwas smiling and talking to other residents\b/gi,
    replacements: [
      "was observed smiling and interacting socially with peers",
      "was noted to smile and engage in conversation with peers"
    ]
  }
];

const ONE_TO_ONE_RULES: PhraseRule[] = [
  {
    pattern: /\bmet with resident\b/gi,
    replacements: ["met with resident 1:1", "completed a 1:1 visit with resident"]
  },
  {
    pattern: /\bin room\b/gi,
    replacements: ["in the resident's room", "at bedside in the resident's room"]
  },
  {
    pattern: /\bwith me\b/gi,
    replacements: ["with activity staff", "during the 1:1 visit"]
  }
];

const REWRITE_TRIGGERS = [
  "reword",
  "rewrite",
  "clean up",
  "cleanup",
  "polish",
  "professional",
  "pcc",
  "documentation",
  "make this shorter",
  "make this more detailed"
];

function normalizeWhitespace(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\t/g, " ").replace(/[ ]{2,}/g, " ").trim();
}

function titleCaseFirst(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function ensureSentencePunctuation(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function normalizeContractions(value: string) {
  return value
    .replace(/\bdidnt\b/gi, "didn't")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bwont\b/gi, "won't")
    .replace(/\bdont\b/gi, "don't");
}

export function cleanNoteText(input: string) {
  const normalized = normalizeContractions(normalizeWhitespace(input));
  return normalized
    .replace(/ ?\n ?/g, ". ")
    .replace(/\s+\./g, ".")
    .replace(/\.{2,}/g, ".")
    .trim();
}

function splitIntoSentences(input: string) {
  return input
    .split(/(?<=[.!?])\s+|;\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function applyRules(input: string, rules: PhraseRule[], variant: number) {
  let output = input;
  rules.forEach((rule, index) => {
    const replacement = rule.replacements[(variant + index) % rule.replacements.length];
    output = output.replace(rule.pattern, replacement);
  });
  return output;
}

function simplifyForShortStyle(value: string) {
  return value
    .replace(/\bthroughout the (activity|session|interaction)\b/gi, "throughout")
    .replace(/\bwith (initial )?encouragement\b/gi, "with encouragement")
    .replace(/\bwas observed to\b/gi, "was")
    .replace(/\bwas noted to\b/gi, "was");
}

function expandForDetailedStyle(value: string) {
  return value
    .replace(/\bparticipated well\b/gi, "participated well and remained engaged")
    .replace(/\bappeared calm\b/gi, "appeared calm and receptive")
    .replace(/\binteracted socially with peers\b/gi, "interacted socially with peers when prompted");
}

function findStyleFromPrompt(normalizedPrompt: string): NoteRewriteStyle {
  if (
    normalizedPrompt.includes("shorter") ||
    normalizedPrompt.includes("short version") ||
    normalizedPrompt.includes("brief")
  ) {
    return "shorter";
  }

  if (
    normalizedPrompt.includes("more detailed") ||
    normalizedPrompt.includes("expand") ||
    normalizedPrompt.includes("detailed")
  ) {
    return "detailed";
  }

  return "professional";
}

function findNoteTypeFromPrompt(normalizedPrompt: string): NoteRewriteType | "unknown" {
  const oneToOneSignals = ["1:1", "one to one", "one-to-one", "room visit", "bedside"];
  const progressSignals = ["progress note", "group note", "activity note"];

  if (oneToOneSignals.some((signal) => normalizedPrompt.includes(signal))) return "one_to_one";
  if (progressSignals.some((signal) => normalizedPrompt.includes(signal))) return "progress";
  return "unknown";
}

function extractQuotedNote(prompt: string) {
  const quoteMatch = prompt.match(/["“]([^"”]+)["”]/);
  return quoteMatch?.[1]?.trim() ?? "";
}

function stripRewriteCommand(prompt: string) {
  return prompt
    .replace(
      /^(please\s+)?(reword|rewrite|clean up|cleanup|polish|make this|turn this|help me rewrite)\s+(this\s+)?(note|progress note|1:1 note|one-to-one note)?\s*:?\s*/i,
      ""
    )
    .trim();
}

function extractNoteText(prompt: string) {
  const normalized = prompt.trim();
  if (!normalized) return "";

  const quoted = extractQuotedNote(normalized);
  if (quoted.length >= 15) return quoted;

  if (normalized.includes("\n")) {
    const [head, ...rest] = normalized.split("\n");
    const trailing = rest.join(" ").trim();
    if (REWRITE_TRIGGERS.some((trigger) => head.toLowerCase().includes(trigger)) && trailing.length >= 15) {
      return trailing;
    }
  }

  const stripped = stripRewriteCommand(normalized);
  if (stripped.length >= 15) return stripped;

  return "";
}

export function detectNoteRewriteIntent(prompt: string): NoteRewriteIntent {
  const normalizedPrompt = prompt.toLowerCase().trim();
  const isRewriteIntent = REWRITE_TRIGGERS.some((trigger) => normalizedPrompt.includes(trigger));
  const noteText = extractNoteText(prompt);

  return {
    isRewriteIntent,
    noteType: findNoteTypeFromPrompt(normalizedPrompt),
    style: findStyleFromPrompt(normalizedPrompt),
    noteText
  };
}

function getVariant(options?: { excludeResponseId?: string }) {
  const variants = [0, 1, 2];
  if (!options?.excludeResponseId) {
    return variants[Math.floor(Math.random() * variants.length)];
  }

  const match = options.excludeResponseId.match(/-v(\d+)$/);
  const previous = match ? Number(match[1]) : -1;
  const pool = variants.filter((variant) => variant !== previous);
  return pool[Math.floor(Math.random() * pool.length)] ?? variants[0];
}

function rewriteSentences(
  input: string,
  noteType: NoteRewriteType,
  style: NoteRewriteStyle,
  variant: number
) {
  const cleaned = cleanNoteText(input);
  const sourceSentences = splitIntoSentences(cleaned);
  const rules = noteType === "progress" ? [...COMMON_RULES, ...PROGRESS_RULES] : [...COMMON_RULES, ...ONE_TO_ONE_RULES];

  const rewritten = sourceSentences.map((sentence, index) => {
    let output = applyRules(sentence, rules, variant + index);
    output = output.replace(/\bresident came to\b/gi, "Resident attended");
    output = output.replace(/\bresident did\b/gi, "Resident");
    output = output.replace(/\bwe\b/gi, "Activity staff");
    output = output.replace(/\s{2,}/g, " ").trim();

    if (style === "shorter") output = simplifyForShortStyle(output);
    if (style === "detailed") output = expandForDetailedStyle(output);

    output = titleCaseFirst(output);
    return ensureSentencePunctuation(output);
  });

  if (style === "shorter") {
    return rewritten.slice(0, Math.max(2, Math.min(3, rewritten.length)));
  }

  if (style === "detailed") {
    return rewritten.slice(0, Math.min(5, rewritten.length));
  }

  return rewritten.slice(0, Math.min(4, rewritten.length));
}

function formatPccStyleNote(input: string, noteType: NoteRewriteType, style: NoteRewriteStyle, variant: number) {
  const rewrittenSentences = rewriteSentences(input, noteType, style, variant);

  if (rewrittenSentences.length === 0) return "";

  if (noteType === "progress" && style !== "shorter") {
    return rewrittenSentences.join(" ");
  }

  return rewrittenSentences.join(" ");
}

function buildResponseId(noteType: NoteRewriteType, style: NoteRewriteStyle, variant: number) {
  return `rewrite-${noteType}-${style}-v${variant}`;
}

function rewriteByType(
  input: string,
  noteType: NoteRewriteType,
  style: NoteRewriteStyle,
  options?: { excludeResponseId?: string }
): NoteRewriteResult {
  const cleaned = cleanNoteText(input);
  if (cleaned.length < 20) {
    throw new Error("Add a little more detail so Actify can rewrite it clearly.");
  }

  const variant = getVariant(options);
  const note = formatPccStyleNote(cleaned, noteType, style, variant);

  return {
    note,
    variant,
    responseId: buildResponseId(noteType, style, variant)
  };
}

export function rewordProgressNote(
  input: string,
  style: NoteRewriteStyle = "professional",
  options?: { excludeResponseId?: string }
) {
  return rewriteByType(input, "progress", style, options);
}

export function rewordOneToOneNote(
  input: string,
  style: NoteRewriteStyle = "professional",
  options?: { excludeResponseId?: string }
) {
  return rewriteByType(input, "one_to_one", style, options);
}
