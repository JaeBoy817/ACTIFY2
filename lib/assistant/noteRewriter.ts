export type NoteRewriteType = "progress" | "one_to_one";
export type NoteRewriteStyle = "professional" | "shorter" | "detailed";
export type RewriteStrength = "standard" | "strong";

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

export type RewriteDiffResult = {
  isMeaningfullyDifferent: boolean;
  similarity: number;
  reason: "identical" | "near-identical" | "meaningful";
};

type NoteRewriteOptions = {
  excludeResponseId?: string;
  strength?: RewriteStrength;
};

type PhraseRule = {
  pattern: RegExp;
  replacements: string[];
  scope?: "all" | NoteRewriteType;
};

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
  "shorter",
  "more detailed",
  "expand"
];

const NORMALIZATION_MAP: Array<[RegExp, string]> = [
  [/\bdidnt\b/gi, "didn't"],
  [/\bdont\b/gi, "don't"],
  [/\bwont\b/gi, "won't"],
  [/\bcant\b/gi, "can't"],
  [/\bim\b/gi, "I'm"],
  [/\s+/g, " "]
];

const PHRASE_RULES: PhraseRule[] = [
  { pattern: /\bcame to\b/gi, replacements: ["attended", "participated in"], scope: "all" },
  { pattern: /\bdid pretty good\b/gi, replacements: ["participated well", "demonstrated good participation"], scope: "all" },
  { pattern: /\bjoined in\b/gi, replacements: ["engaged in", "participated in"], scope: "all" },
  { pattern: /\bplayed some\b/gi, replacements: ["participated", "participated intermittently"], scope: "all" },
  { pattern: /\btalked with\b/gi, replacements: ["engaged in conversation with", "interacted with"], scope: "all" },
  {
    pattern: /\btalked about (his|her|their) family\b/gi,
    replacements: ["engaged in conversation regarding $1 family", "discussed family topics"],
    scope: "all"
  },
  {
    pattern: /\btalked about (his|her|their) kids\b/gi,
    replacements: ["engaged in conversation regarding $1 children", "discussed family and children"],
    scope: "all"
  },
  {
    pattern: /\btalked to other residents\b/gi,
    replacements: ["interacted socially with peers", "engaged in social interaction with peers"],
    scope: "all"
  },
  {
    pattern: /\btalking to other residents\b/gi,
    replacements: ["interacting socially with peers", "engaging in social interaction with peers"],
    scope: "all"
  },
  {
    pattern: /\bneeded a little encouragement\b/gi,
    replacements: ["required initial encouragement to engage", "participated with initial encouragement"],
    scope: "all"
  },
  {
    pattern: /\bneeded encouragement\b/gi,
    replacements: ["participated with encouragement", "required encouragement to engage"],
    scope: "all"
  },
  {
    pattern: /\bgot more into it later\b/gi,
    replacements: ["engagement increased as the activity progressed", "became more engaged as the session continued"],
    scope: "all"
  },
  {
    pattern:
      /\b(participated with initial encouragement|required initial encouragement to engage) at first but (engagement increased as the activity progressed|became more engaged as the session continued)\b/gi,
    replacements: [
      "required initial encouragement to engage; engagement increased as the session progressed",
      "initial participation required encouragement, with improved engagement as the activity continued"
    ],
    scope: "all"
  },
  { pattern: /\bwas smiling\b/gi, replacements: ["was observed smiling", "was noted smiling"], scope: "all" },
  { pattern: /\bwas laughing\b/gi, replacements: ["was observed laughing", "was noted laughing"], scope: "all" },
  { pattern: /\bseemed calm\b/gi, replacements: ["appeared calm", "presented with a calm affect"], scope: "all" },
  {
    pattern: /\bin a good mood\b/gi,
    replacements: ["presented with a pleasant mood", "appeared to be in a pleasant mood"],
    scope: "all"
  },
  {
    pattern: /\bdidn'?t want to come out\b/gi,
    replacements: ["declined group participation", "preferred to remain in room and declined group participation"],
    scope: "all"
  },
  {
    pattern: /\bdidn'?t want group\b/gi,
    replacements: ["declined group participation", "was not interested in group participation at that time"],
    scope: "all"
  },
  {
    pattern: /\bdidn'?t want to do it\b/gi,
    replacements: ["was initially hesitant to engage", "showed initial hesitation with participation"],
    scope: "all"
  },
  {
    pattern: /\bstayed for a little bit\b/gi,
    replacements: ["attended for a portion of the activity", "remained for part of the session"],
    scope: "all"
  },
  {
    pattern: /\bleft early\b/gi,
    replacements: ["departed the activity before completion", "left prior to activity completion"],
    scope: "all"
  },
  {
    pattern: /\bwatched for a while\b/gi,
    replacements: ["observed the activity for a portion of the session", "remained observant for part of the activity"],
    scope: "all"
  },
  {
    pattern: /\bmostly watched\b/gi,
    replacements: ["observed much of the activity with limited active participation", "primarily observed the activity with limited direct participation"],
    scope: "all"
  },
  {
    pattern: /\bclapped some\b/gi,
    replacements: ["participated by clapping along", "clapped along during portions of the session"],
    scope: "all"
  },
  {
    pattern: /\bstayed the whole time\b/gi,
    replacements: ["remained for the duration of the activity", "stayed for the full session"],
    scope: "all"
  },
  {
    pattern: /\bdidn'?t want to stay long\b/gi,
    replacements: ["chose not to remain for the full activity", "did not remain for the full session"],
    scope: "all"
  },
  {
    pattern: /\bgot upset\b/gi,
    replacements: ["appeared upset", "became upset during the interaction"],
    scope: "all"
  },
  { pattern: /\bliked it\b/gi, replacements: ["responded positively", "tolerated the activity well"], scope: "all" },
  { pattern: /\bdidn'?t really say much\b/gi, replacements: ["was quiet but attentive", "remained quiet with attentive participation"], scope: "all" },
  { pattern: /\bneeded help\b/gi, replacements: ["required assistance", "required support"], scope: "all" },
  { pattern: /\bneeded cues\b/gi, replacements: ["required cueing", "required verbal cueing"], scope: "all" },
  { pattern: /\blooked at magazines\b/gi, replacements: ["looked through magazines", "reviewed magazines"], scope: "all" },
  {
    pattern: /\blooked at (a |the )?puzzle book\b/gi,
    replacements: ["looked through a puzzle book", "reviewed a puzzle book"],
    scope: "all"
  },
  {
    pattern: /\bwe talked about family\b/gi,
    replacements: ["resident engaged in conversation regarding family", "discussion included family topics"],
    scope: "all"
  },
  {
    pattern: /\bresident came to bingo\b/gi,
    replacements: ["resident attended bingo group", "resident participated in bingo group"],
    scope: "progress"
  },
  {
    pattern: /\bparticipated in group\b/gi,
    replacements: ["participated in the scheduled group activity", "engaged in the planned group activity"],
    scope: "progress"
  },
  {
    pattern: /\bsat with others\b/gi,
    replacements: ["remained seated with peers during the session", "sat with peers during the activity"],
    scope: "progress"
  },
  {
    pattern: /\bwatched and listened\b/gi,
    replacements: ["remained attentive and observant during the activity", "observed and listened throughout much of the session"],
    scope: "progress"
  },
  {
    pattern: /\bmet with resident in room\b/gi,
    replacements: ["met with resident 1:1 in room", "completed 1:1 room visit with resident"],
    scope: "one_to_one"
  },
  {
    pattern: /\bvisited resident in room\b/gi,
    replacements: ["completed 1:1 room visit with resident", "met with resident 1:1 in room"],
    scope: "one_to_one"
  },
  {
    pattern: /\bmet with resident in room because\b/gi,
    replacements: ["met with resident 1:1 in room after", "completed 1:1 room visit with resident after"],
    scope: "one_to_one"
  },
  {
    pattern: /\btalked with resident\b/gi,
    replacements: ["engaged resident in 1:1 conversation", "completed 1:1 conversation with resident"],
    scope: "one_to_one"
  },
  {
    pattern: /\bresident was calm\b/gi,
    replacements: ["resident appeared calm throughout the interaction", "resident remained calm during the visit"],
    scope: "one_to_one"
  },
  {
    pattern: /\bresident enjoyed the visit\b/gi,
    replacements: ["resident responded positively to the interaction", "resident tolerated the visit well"],
    scope: "one_to_one"
  }
];

const STRONG_PASS_RULES: PhraseRule[] = [
  {
    pattern: /\bparticipated\b/gi,
    replacements: ["engaged", "participated"],
    scope: "all"
  },
  {
    pattern: /\bcalm\b/gi,
    replacements: ["calm and receptive", "calm"],
    scope: "all"
  },
  {
    pattern: /\bhelped\b/gi,
    replacements: ["supported", "assisted"],
    scope: "all"
  }
];

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[\t\u00A0]/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function normalizeForDiff(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  let output = value;
  for (const [pattern, replacement] of NORMALIZATION_MAP) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

export function normalizeNoteInput(input: string) {
  const normalized = normalizeContractions(normalizeWhitespace(input));

  const lineCollapsed = normalized
    .replace(/ ?\n ?/g, ". ")
    .replace(/\s+\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();

  return lineCollapsed;
}

export function cleanNoteText(input: string) {
  return normalizeNoteInput(input);
}

export function splitNoteIntoSentences(input: string) {
  return input
    .split(/(?<=[.!?])\s+|;\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function tokenizeToBigrams(value: string) {
  const normalized = normalizeForDiff(value);
  if (normalized.length < 2) return new Set<string>();
  const grams = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    grams.add(normalized.slice(index, index + 2));
  }
  return grams;
}

function diceSimilarity(a: string, b: string) {
  const setA = tokenizeToBigrams(a);
  const setB = tokenizeToBigrams(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  setA.forEach((gram) => {
    if (setB.has(gram)) intersection += 1;
  });

  return (2 * intersection) / (setA.size + setB.size);
}

function tokenizeWords(value: string) {
  return normalizeForDiff(value).split(" ").filter(Boolean);
}

function jaccardSimilarity(a: string, b: string) {
  const wordsA = new Set(tokenizeWords(a));
  const wordsB = new Set(tokenizeWords(b));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  wordsA.forEach((word) => {
    if (wordsB.has(word)) intersection += 1;
  });
  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

export function validateRewriteDifference(original: string, rewritten: string): RewriteDiffResult {
  const normalizedOriginal = normalizeForDiff(original);
  const normalizedRewritten = normalizeForDiff(rewritten);

  if (!normalizedRewritten || normalizedOriginal === normalizedRewritten) {
    return { isMeaningfullyDifferent: false, similarity: 1, reason: "identical" };
  }

  const similarity = diceSimilarity(normalizedOriginal, normalizedRewritten);
  const lexicalSimilarity = jaccardSimilarity(normalizedOriginal, normalizedRewritten);
  const originalTokens = normalizedOriginal.split(" ").filter(Boolean).length;
  const rewrittenTokens = normalizedRewritten.split(" ").filter(Boolean).length;
  const tokenDelta = Math.abs(originalTokens - rewrittenTokens);
  const changeRatio = Math.max(0, 1 - lexicalSimilarity);

  const tooSimilar =
    similarity > 0.9 ||
    (similarity > 0.84 && tokenDelta <= 3) ||
    (similarity > 0.78 && lexicalSimilarity > 0.84 && tokenDelta <= 4) ||
    (similarity > 0.74 && changeRatio < 0.18);

  return {
    isMeaningfullyDifferent: !tooSimilar,
    similarity,
    reason: tooSimilar ? "near-identical" : "meaningful"
  };
}

function findStyleFromPrompt(normalizedPrompt: string): NoteRewriteStyle {
  if (normalizedPrompt.includes("shorter") || normalizedPrompt.includes("short") || normalizedPrompt.includes("brief")) {
    return "shorter";
  }

  if (normalizedPrompt.includes("more detailed") || normalizedPrompt.includes("expand") || normalizedPrompt.includes("detailed")) {
    return "detailed";
  }

  return "professional";
}

function findNoteTypeFromPrompt(normalizedPrompt: string): NoteRewriteType | "unknown" {
  const oneToOneSignals = ["1:1", "one to one", "one-to-one", "room visit", "bedside", "in room"];
  const progressSignals = ["progress note", "group note", "activity note", "group participation"];

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
  if (quoted.length >= 12) return quoted;

  if (normalized.includes("\n")) {
    const [head, ...rest] = normalized.split("\n");
    const trailing = rest.join(" ").trim();
    if (REWRITE_TRIGGERS.some((trigger) => head.toLowerCase().includes(trigger)) && trailing.length >= 12) {
      return trailing;
    }
  }

  const stripped = stripRewriteCommand(normalized);
  if (stripped.length >= 12) return stripped;

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
  const variants = [0, 1, 2, 3];
  if (!options?.excludeResponseId) {
    return variants[Math.floor(Math.random() * variants.length)];
  }

  const match = options.excludeResponseId.match(/-v(\d+)-/);
  const previous = match ? Number(match[1]) : -1;
  const pool = variants.filter((variant) => variant !== previous);
  return pool[Math.floor(Math.random() * pool.length)] ?? variants[0];
}

function ruleAppliesToType(rule: PhraseRule, noteType: NoteRewriteType) {
  return !rule.scope || rule.scope === "all" || rule.scope === noteType;
}

function applyPhraseRules(input: string, noteType: NoteRewriteType, variant: number, strength: RewriteStrength) {
  const ruleSet = strength === "strong" ? [...PHRASE_RULES, ...STRONG_PASS_RULES] : PHRASE_RULES;

  let output = input;
  ruleSet.forEach((rule, index) => {
    if (!ruleAppliesToType(rule, noteType)) return;
    const replacement = rule.replacements[(variant + index) % rule.replacements.length];
    output = output.replace(rule.pattern, replacement);
  });

  return output;
}

function styleSentence(sentence: string, style: NoteRewriteStyle) {
  let output = sentence;

  if (style === "shorter") {
    output = output
      .replace(/\bthroughout the (activity|session|interaction)\b/gi, "throughout")
      .replace(/\bwas observed to\b/gi, "was")
      .replace(/\bwas noted to\b/gi, "was");
  }

  if (style === "detailed") {
    output = output
      .replace(/\bappeared calm\b/gi, "appeared calm and receptive")
      .replace(/\bresponded positively\b/gi, "responded positively and remained engaged")
      .replace(/\brequired encouragement\b/gi, "required initial encouragement to engage");
  }

  return output;
}

function applyContextualRewrite(sentence: string, noteType: NoteRewriteType) {
  const trimmed = normalizeWhitespace(sentence);
  const lower = trimmed.toLowerCase().replace(/[.!?]+$/, "");
  if (!trimmed) return trimmed;

  if (/^(calm|pleasant|cooperative|quiet)$/.test(lower)) {
    return noteType === "one_to_one"
      ? "Resident appeared calm throughout the interaction."
      : "Resident appeared calm during the session.";
  }

  if (noteType === "one_to_one") {
    if (/^(she|he|resident)\s+didn'?t want group$/.test(lower)) {
      return "Resident declined group participation.";
    }
    if (/^talked about /.test(lower)) {
      const topic = trimmed.replace(/^talked about /i, "").replace(/[.!?]+$/, "");
      return `Resident engaged in conversation regarding ${topic}.`;
    }
    if (/^looked at /.test(lower)) {
      const topic = trimmed.replace(/^looked at /i, "").replace(/[.!?]+$/, "");
      return `Resident looked through ${topic} during the visit.`;
    }
  }

  if (noteType === "progress") {
    if (/^needed (a little )?encouragement$/.test(lower)) {
      return "Resident required encouragement to engage.";
    }
    if (/^smiled( and .+)?$/.test(lower)) {
      const detail = trimmed.replace(/^smiled( and)?/i, "").replace(/[.!?]+$/, "").trim();
      if (detail) {
        return `Resident was observed smiling and ${detail}.`;
      }
      return "Resident was observed smiling during the activity.";
    }
    if (/^smiled$/.test(lower)) {
      return "Resident was observed smiling during the activity.";
    }
  }

  return trimmed;
}

export function transformSentence(
  sentence: string,
  noteType: NoteRewriteType,
  options?: {
    style?: NoteRewriteStyle;
    variant?: number;
    strength?: RewriteStrength;
  }
) {
  const style = options?.style ?? "professional";
  const variant = options?.variant ?? 0;
  const strength = options?.strength ?? "standard";

  let output = applyContextualRewrite(sentence, noteType);
  output = applyPhraseRules(output, noteType, variant, strength);

  output = output
    .replace(/\bwe talked about\b/gi, "resident engaged in conversation regarding")
    .replace(/\bwe talked\b/gi, "resident engaged in conversation")
    .replace(/\bwe looked at\b/gi, "resident looked through")
    .replace(/\bwe discussed\b/gi, "resident engaged in discussion regarding")
    .replace(/^we\s+/i, "Resident and staff ")
    .replace(/\bresident did\b/gi, "resident participated")
    .replace(/\s{2,}/g, " ")
    .trim();

  output = styleSentence(output, style);
  output = titleCaseFirst(output);
  output = ensureSentencePunctuation(output);

  return output;
}

function sentencePriority(sentence: string, noteType: NoteRewriteType) {
  const value = sentence.toLowerCase();

  if (noteType === "progress") {
    if (value.includes("attended") || value.includes("scheduled group")) return 0;
    if (value.includes("encouragement") || value.includes("cueing")) return 1;
    if (value.includes("smiling") || value.includes("interacted") || value.includes("mood")) return 2;
    if (value.includes("follow-up")) return 4;
    return 3;
  }

  if (value.includes("1:1") || value.includes("room visit") || value.includes("declined group participation")) return 0;
  if (value.includes("engaged") || value.includes("conversation")) return 1;
  if (value.includes("calm") || value.includes("mood") || value.includes("receptive")) return 2;
  if (value.includes("follow-up")) return 4;
  return 3;
}

function dedupeSentences(sentences: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const sentence of sentences) {
    const key = normalizeForDiff(sentence);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(sentence);
  }

  return output;
}

function capSentences(sentences: string[], style: NoteRewriteStyle) {
  if (style === "shorter") return sentences.slice(0, 2);
  if (style === "detailed") return sentences.slice(0, 5);
  return sentences.slice(0, 4);
}

function inferActivityContext(original: string) {
  const lower = original.toLowerCase();
  if (lower.includes("bingo")) return "bingo group";
  if (lower.includes("music")) return "music activity";
  if (lower.includes("trivia")) return "trivia activity";
  if (lower.includes("craft")) return "craft activity";
  if (lower.includes("group")) return "scheduled group activity";
  return "the scheduled activity";
}

function buildStructuredFallback(original: string, noteType: NoteRewriteType, style: NoteRewriteStyle) {
  const lower = original.toLowerCase();

  if (noteType === "progress") {
    const activity = inferActivityContext(original);
    const line1 = `Resident attended ${activity} and participated as tolerated.`;
    const line2 = lower.includes("encourag")
      ? "Resident required initial encouragement to engage."
      : "Participation level was monitored throughout the session.";
    const line3 = lower.includes("smil") || lower.includes("talk")
      ? "Resident was observed smiling and interacting socially with peers during the activity."
      : lower.includes("upset")
        ? "Resident appeared upset and chose not to remain for the full activity."
        : "Resident response was documented during the activity period.";

    const lines = style === "shorter" ? [line1, line2] : [line1, line2, line3];
    return lines.join(" ");
  }

  const line1 = lower.includes("declined") || lower.includes("didn't want")
    ? "Completed 1:1 room visit after resident declined group participation."
    : "Completed 1:1 interaction with resident in room setting.";
  const line2 = lower.includes("family")
    ? "Resident engaged in conversation regarding family during the visit."
    : "Resident engaged in conversation and individualized activity support during the interaction.";
  const line3 = lower.includes("calm")
    ? "Resident appeared calm throughout the interaction."
    : "Resident response remained stable during the visit.";

  const lines = style === "shorter" ? [line1, line2] : [line1, line2, line3];
  return lines.join(" ");
}

function runRewritePass(
  input: string,
  noteType: NoteRewriteType,
  style: NoteRewriteStyle,
  variant: number,
  strength: RewriteStrength
) {
  const normalized = normalizeNoteInput(input);
  const sourceSentences = splitNoteIntoSentences(normalized);

  const transformed = sourceSentences.map((sentence, index) =>
    transformSentence(sentence, noteType, {
      style,
      variant: variant + index,
      strength
    })
  );

  const ordered = [...transformed].sort((left, right) => sentencePriority(left, noteType) - sentencePriority(right, noteType));
  const deduped = dedupeSentences(ordered);
  const capped = capSentences(deduped, style);

  const merged = capped.join(" ").trim();
  if (!merged) {
    return buildStructuredFallback(normalized, noteType, style);
  }

  return merged;
}

export function rewriteNoteText(
  input: string,
  noteType: NoteRewriteType,
  style: NoteRewriteStyle = "professional",
  options?: NoteRewriteOptions
): NoteRewriteResult {
  const normalized = normalizeNoteInput(input);
  const words = normalizeForDiff(normalized).split(" ").filter(Boolean);

  if (words.length < 3) {
    throw new Error(
      "Add a little more detail so Actify can create a stronger rewrite. Include what the resident attended, participation level, mood, response, or any support provided."
    );
  }

  const baseVariant = getVariant({ excludeResponseId: options?.excludeResponseId });
  const preferredStrength = options?.strength ?? "standard";

  let rewritten = runRewritePass(normalized, noteType, style, baseVariant, preferredStrength);
  let diff = validateRewriteDifference(normalized, rewritten);

  if (!diff.isMeaningfullyDifferent) {
    rewritten = runRewritePass(normalized, noteType, style, baseVariant + 1, "strong");
    diff = validateRewriteDifference(normalized, rewritten);
  }

  if (!diff.isMeaningfullyDifferent) {
    rewritten = buildStructuredFallback(normalized, noteType, style);
    diff = validateRewriteDifference(normalized, rewritten);
  }

  const finalStrength: RewriteStrength = diff.isMeaningfullyDifferent ? (preferredStrength === "strong" ? "strong" : "standard") : "strong";

  return {
    note: rewritten,
    variant: baseVariant,
    responseId: `rewrite-${noteType}-${style}-v${baseVariant}-s${finalStrength}`
  };
}

function rewriteByType(
  input: string,
  noteType: NoteRewriteType,
  style: NoteRewriteStyle,
  options?: NoteRewriteOptions
): NoteRewriteResult {
  return rewriteNoteText(input, noteType, style, options);
}

export function rewordProgressNote(input: string, style: NoteRewriteStyle = "professional", options?: NoteRewriteOptions) {
  return rewriteByType(input, "progress", style, options);
}

export function rewordOneToOneNote(input: string, style: NoteRewriteStyle = "professional", options?: NoteRewriteOptions) {
  return rewriteByType(input, "one_to_one", style, options);
}
