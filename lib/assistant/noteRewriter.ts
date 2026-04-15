export type NoteRewriteType = "progress" | "one_to_one";
export type NoteRewriteStyle = "professional" | "shorter" | "detailed";
export type RewriteStrength = "standard" | "strong";

export type NoteRewriteIntent = {
  isRewriteIntent: boolean;
  noteType: NoteRewriteType | "unknown";
  style: NoteRewriteStyle;
  noteText: string;
};

export type ParsedRewriteRequest = {
  intent: "rewriteNote" | "none";
  noteType: NoteRewriteType | "unknown";
  rawNoteText: string;
  style: NoteRewriteStyle;
  wrapperText: string;
};

export type RewriteDiffResult = {
  isMeaningfullyDifferent: boolean;
  similarity: number;
  reason: "identical" | "near-identical" | "meaningful";
};

export type ExtractedNoteDetails = {
  location: string;
  reason: string;
  activitiesMentioned: string[];
  conversationTopics: string[];
  socialDetails: string[];
  participationDetails: string[];
  moodDetails: string[];
  durationDetails: string[];
  refusalDetails: string[];
  followupDetails: string[];
  equipmentDetails: string[];
  importantDetails: string[];
};

export type NotePreservationReport = {
  totalImportantDetailCount: number;
  preservedDetailCount: number;
  preservedDetails: string[];
  missingDetails: string[];
  preservationScore: number;
  genericPhrasesFound: string[];
  tooShortComparedToInput: boolean;
  passed: boolean;
};

export type NoteRewriteDebug = {
  extractedDetails: ExtractedNoteDetails;
  preservation: NotePreservationReport;
};

export type NoteRewriteResult = {
  note: string;
  responseId: string;
  variant: number;
  debug?: NoteRewriteDebug;
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

type DetailCategory =
  | "activitiesMentioned"
  | "conversationTopics"
  | "socialDetails"
  | "participationDetails"
  | "moodDetails"
  | "durationDetails"
  | "refusalDetails"
  | "followupDetails"
  | "equipmentDetails";

type DetailRule = {
  detail: string;
  category: DetailCategory;
  patterns: RegExp[];
};

const REWRITE_TRIGGERS = [
  "reword",
  "rewrite",
  "clean up",
  "cleanup",
  "polish",
  "make this sound more professional",
  "make this note sound more professional",
  "clean this up for pcc",
  "clean up this pcc note",
  "reword this note for documentation",
  "rewrite this note for documentation",
  "rewrite this 1:1 for pcc",
  "reword this 1:1 for pcc",
  "rewrite this progress note",
  "reword this progress note",
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

const GENERIC_BLOCKLIST = [
  "individualized activity support",
  "resident response remained stable",
  "participated appropriately",
  "engaged during the interaction",
  "tolerated intervention well",
  "supportive visit completed",
  "interaction occurred in room setting",
  "activity support provided",
  "appropriate participation noted"
] as const;

const DETAIL_RULES: DetailRule[] = [
  { detail: "bingo", category: "activitiesMentioned", patterns: [/\bbingo\b/i] },
  { detail: "music", category: "activitiesMentioned", patterns: [/\bmusic\b/i] },
  { detail: "cards", category: "activitiesMentioned", patterns: [/\bcards?\b/i, /card game/i] },
  { detail: "crosswords", category: "activitiesMentioned", patterns: [/\bcrosswords?\b/i] },
  { detail: "word searches", category: "activitiesMentioned", patterns: [/\bword searches?\b/i, /wordsearch/i] },
  { detail: "magazines", category: "activitiesMentioned", patterns: [/\bmagazines?\b/i] },
  { detail: "puzzle book", category: "activitiesMentioned", patterns: [/\bpuzzle book\b/i] },
  { detail: "nail painting", category: "activitiesMentioned", patterns: [/\bpaint(?:ed|ing)? nails?\b/i, /\bnail painting\b/i] },
  { detail: "coloring", category: "activitiesMentioned", patterns: [/\bcoloring\b/i] },
  { detail: "tv", category: "activitiesMentioned", patterns: [/\btv\b/i, /television/i] },
  { detail: "movies", category: "activitiesMentioned", patterns: [/\bmovies?\b/i] },
  { detail: "family", category: "conversationTopics", patterns: [/\bfamily\b/i] },
  { detail: "kids", category: "conversationTopics", patterns: [/\bkids?\b/i, /children/i] },
  { detail: "cars", category: "conversationTopics", patterns: [/\bcars?\b/i] },
  {
    detail: "talked with peers",
    category: "socialDetails",
    patterns: [/talk(ed|ing)? (to|with) other residents/i, /talk(ed|ing)? with peers/i, /interact(ed|ing)? with peers/i, /social/i]
  },
  {
    detail: "required initial encouragement",
    category: "participationDetails",
    patterns: [/needed a little encouragement/i, /initial encouragement/i]
  },
  {
    detail: "required encouragement",
    category: "participationDetails",
    patterns: [/needed encouragement/i, /required encouragement/i]
  },
  {
    detail: "engagement increased",
    category: "participationDetails",
    patterns: [/got more into it later/i, /more engaged/i, /engagement increased/i]
  },
  {
    detail: "clapped along",
    category: "participationDetails",
    patterns: [/clapped along/i, /clapped some/i]
  },
  {
    detail: "limited active participation",
    category: "participationDetails",
    patterns: [/mostly watched/i, /watched for a while/i, /limited participation/i]
  },
  { detail: "smiling", category: "moodDetails", patterns: [/\bsmil(ed|ing)\b/i] },
  { detail: "calm", category: "moodDetails", patterns: [/\bcalm\b/i] },
  { detail: "positive response", category: "moodDetails", patterns: [/\bwas positive\b/i, /\bresponded positively\b/i, /\bpositive throughout\b/i] },
  { detail: "agitated", category: "moodDetails", patterns: [/\bagitat(ed|ion)\b/i] },
  { detail: "upset", category: "moodDetails", patterns: [/\bupset\b/i] },
  {
    detail: "stayed the whole time",
    category: "durationDetails",
    patterns: [/stayed the whole time/i, /stayed for the full/i, /remained for the duration/i]
  },
  {
    detail: "left early",
    category: "durationDetails",
    patterns: [/left early/i, /didn'?t want to stay long/i, /did not remain for the full/i]
  },
  {
    detail: "declined group participation",
    category: "refusalDetails",
    patterns: [/didn'?t want to come out/i, /declined group/i, /didn'?t want group/i, /refused group/i]
  },
  {
    detail: "follow-up needed",
    category: "followupDetails",
    patterns: [/follow[- ]?up/i, /reassess/i, /check back/i]
  },
  {
    detail: "interested in participating again",
    category: "followupDetails",
    patterns: [/would like to .*again/i, /wants? to .*again/i, /interested in .*again/i, /asked to .*again/i]
  },
  {
    detail: "motorized wheelchair",
    category: "equipmentDetails",
    patterns: [/motorized wheelchair/i, /wheelchair/i]
  }
];

const PHRASE_RULES: PhraseRule[] = [
  { pattern: /\bcame to\b/gi, replacements: ["attended", "participated in"], scope: "all" },
  { pattern: /\bplayed some\b/gi, replacements: ["participated", "participated intermittently"], scope: "all" },
  {
    pattern: /\bneeded a little encouragement\b/gi,
    replacements: ["required initial encouragement to engage", "participated with initial encouragement"],
    scope: "all"
  },
  {
    pattern: /\bneeded encouragement\b/gi,
    replacements: ["required encouragement to engage", "participated with encouragement"],
    scope: "all"
  },
  {
    pattern: /\bgot more into it later\b/gi,
    replacements: ["engagement increased as the session progressed", "became more engaged as the activity continued"],
    scope: "all"
  },
  { pattern: /\bwas smiling\b/gi, replacements: ["was observed smiling", "was noted smiling"], scope: "all" },
  {
    pattern: /\btalking to other residents\b/gi,
    replacements: ["interacting socially with peers", "engaging socially with peers"],
    scope: "all"
  },
  {
    pattern: /\btalked to other residents\b/gi,
    replacements: ["interacted socially with peers", "engaged socially with peers"],
    scope: "all"
  },
  {
    pattern: /\bdidn'?t want to come out\b/gi,
    replacements: ["declined group participation", "preferred to remain in room and declined group participation"],
    scope: "all"
  },
  {
    pattern: /\bseemed calm\b/gi,
    replacements: ["appeared calm", "presented with a calm affect"],
    scope: "all"
  },
  {
    pattern: /\bresident came to bingo\b/gi,
    replacements: ["Resident attended bingo group", "Resident participated in bingo group"],
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
  }
];

const STRONG_PASS_RULES: PhraseRule[] = [
  { pattern: /\bcalm\b/gi, replacements: ["calm and receptive", "calm"], scope: "all" },
  {
    pattern: /\bmostly watched\b/gi,
    replacements: ["observed much of the activity with limited active participation", "primarily observed with limited direct participation"],
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

function pushUnique(list: string[], value: string) {
  const normalized = value.trim();
  if (!normalized) return;
  if (!list.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
    list.push(normalized);
  }
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

  return normalized
    .replace(/ ?\n ?/g, ". ")
    .replace(/\s+\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
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

function isRewriteCommandText(text: string) {
  const normalized = text.toLowerCase().trim();
  return REWRITE_TRIGGERS.some((trigger) => normalized.includes(trigger));
}

function detectDelimiterSplit(input: string) {
  const delimiterMatch = input.match(/^(.{0,180}?)(?:\:\s+|\s-\s|\n)([\s\S]+)$/);
  if (!delimiterMatch) return null;
  const wrapper = delimiterMatch[1]?.trim() ?? "";
  const body = delimiterMatch[2]?.trim() ?? "";
  if (!wrapper || !body) return null;
  if (!isRewriteCommandText(wrapper)) return null;
  return { wrapper, body };
}

function stripRewriteWrapper(input: string) {
  return input
    .replace(
      /^(please\s+)?(reword|rewrite|clean up|cleanup|polish|make this sound more professional|make this note sound more professional|make this more professional|clean this up for pcc|clean up this pcc note|reword this note for documentation|rewrite this note for documentation|reword this|rewrite this|clean this up|make this|turn this|help me rewrite)\s*/i,
      ""
    )
    .replace(/^(for\s+(pcc|documentation))\s*/i, "")
    .replace(/^(this\s+)?(1:1|one[- ]to[- ]one|one to one|progress)\s*(note)?\s*/i, "")
    .replace(/^(note|progress note|1:1 note|one-to-one note)\s*/i, "")
    .replace(/^(for\s+(pcc|documentation))\s*/i, "")
    .replace(/^[:\-]\s*/, "")
    .trim();
}

export function parseRewriteRequest(input: string): ParsedRewriteRequest {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const style = findStyleFromPrompt(lower);
  const noteType = findNoteTypeFromPrompt(lower);
  const hasRewriteIntent = isRewriteCommandText(lower);

  if (!trimmed || !hasRewriteIntent) {
    return {
      intent: "none",
      noteType,
      rawNoteText: "",
      style,
      wrapperText: ""
    };
  }

  const split = detectDelimiterSplit(trimmed);
  if (split) {
    return {
      intent: "rewriteNote",
      noteType: findNoteTypeFromPrompt(split.wrapper.toLowerCase()) !== "unknown" ? findNoteTypeFromPrompt(split.wrapper.toLowerCase()) : noteType,
      rawNoteText: split.body,
      style,
      wrapperText: split.wrapper
    };
  }

  const stripped = stripRewriteWrapper(trimmed);
  if (stripped.length > 0) {
    return {
      intent: "rewriteNote",
      noteType,
      rawNoteText: stripped,
      style,
      wrapperText: trimmed.slice(0, Math.max(0, trimmed.length - stripped.length)).trim()
    };
  }

  return {
    intent: "rewriteNote",
    noteType,
    rawNoteText: "",
    style,
    wrapperText: trimmed
  };
}

export function detectNoteRewriteIntent(prompt: string): NoteRewriteIntent {
  const parsed = parseRewriteRequest(prompt);
  return {
    isRewriteIntent: parsed.intent === "rewriteNote",
    noteType: parsed.noteType,
    style: parsed.style,
    noteText: parsed.rawNoteText
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

function detectLocation(normalized: string) {
  if (/in (his|her|the)?\s*room|room visit|bedside|at bedside/i.test(normalized)) {
    return "in room";
  }
  if (/dining room/i.test(normalized)) return "in dining room";
  if (/activity room/i.test(normalized)) return "in activity room";
  if (/hallway/i.test(normalized)) return "in hallway";
  if (/patio/i.test(normalized)) return "on patio";
  if (/bed[- ]bound/i.test(normalized)) return "bed-bound";
  if (/day room|dayroom/i.test(normalized)) return "in day room";
  return "";
}

function detectReason(normalized: string) {
  if (/didn'?t want to come out|didn'?t want group|declined group|refused group/i.test(normalized)) {
    return "declined group participation";
  }
  if (/motorized wheelchair.*(fixed|repair)|wheelchair.*(fixed|repair)|get up more/i.test(normalized)) {
    return "requested motorized wheelchair repair to support increased mobility";
  }

  const becauseMatch = normalized.match(/because\s+([^.]{4,120})/i);
  if (becauseMatch?.[1]) {
    return becauseMatch[1].trim();
  }

  return "";
}

function addMatchedDetail(output: ExtractedNoteDetails, rule: DetailRule, normalized: string) {
  if (!rule.patterns.some((pattern) => pattern.test(normalized))) return;

  if (rule.category === "activitiesMentioned") pushUnique(output.activitiesMentioned, rule.detail);
  if (rule.category === "conversationTopics") pushUnique(output.conversationTopics, rule.detail);
  if (rule.category === "socialDetails") pushUnique(output.socialDetails, rule.detail);
  if (rule.category === "participationDetails") pushUnique(output.participationDetails, rule.detail);
  if (rule.category === "moodDetails") pushUnique(output.moodDetails, rule.detail);
  if (rule.category === "durationDetails") pushUnique(output.durationDetails, rule.detail);
  if (rule.category === "refusalDetails") pushUnique(output.refusalDetails, rule.detail);
  if (rule.category === "followupDetails") pushUnique(output.followupDetails, rule.detail);
  if (rule.category === "equipmentDetails") pushUnique(output.equipmentDetails, rule.detail);
}

function inferConversationTopics(normalized: string, details: ExtractedNoteDetails) {
  const talkedAboutRegex = /talk(?:ed|ing)? about\s+([^.;]+?)(?=\s+and\s+(look|looked|review|reviewed|read|do|work)|[.;]|$)/gi;
  for (const match of normalized.matchAll(talkedAboutRegex)) {
    const rawTopic = match[1]?.trim();
    if (!rawTopic || rawTopic.length <= 2) continue;

    const topic = rawTopic.replace(/\s+and\s+(look|looked|review|reviewed|read|do|work).*$/i, "").trim();
    if (!topic) continue;

    if (/\bfamily\b/i.test(topic)) {
      pushUnique(details.conversationTopics, "family");
      continue;
    }
    if (/\bkids?\b|\bchildren\b/i.test(topic)) {
      pushUnique(details.conversationTopics, "kids");
      continue;
    }
    if (/\bcars?\b/i.test(topic)) {
      pushUnique(details.conversationTopics, "cars");
      continue;
    }

    pushUnique(details.conversationTopics, topic);
  }

  const conversationRegex = /conversation (?:about|regarding)\s+([^.,;]+)/gi;
  for (const match of normalized.matchAll(conversationRegex)) {
    const topic = match[1]?.trim();
    if (topic && topic.length > 2) pushUnique(details.conversationTopics, topic);
  }
}

function inferActivityNouns(normalized: string, details: ExtractedNoteDetails) {
  const lookedAtRegex = /look(?:ed|ing)? (?:at|through)\s+([^.,;]+)/gi;
  for (const match of normalized.matchAll(lookedAtRegex)) {
    const rawItem = match[1]?.trim();
    const item = rawItem?.replace(/\s+while\s+talking\s+about.*$/i, "").trim();
    if (item && item.length > 2) pushUnique(details.activitiesMentioned, item);
  }

  if (/\bpaint(?:ed|ing)? nails?\b|\bnail painting\b/i.test(normalized)) {
    pushUnique(details.activitiesMentioned, "nail painting");
  }
}

function flattenImportantDetails(details: ExtractedNoteDetails) {
  const all = [
    ...(details.location ? [details.location] : []),
    ...(details.reason ? [details.reason] : []),
    ...details.activitiesMentioned,
    ...details.conversationTopics,
    ...details.socialDetails,
    ...details.participationDetails,
    ...details.moodDetails,
    ...details.durationDetails,
    ...details.refusalDetails,
    ...details.followupDetails,
    ...details.equipmentDetails
  ];

  return Array.from(new Set(all.map((item) => item.trim()).filter(Boolean)));
}

export function extractNoteDetails(input: string): ExtractedNoteDetails {
  const normalized = normalizeNoteInput(input);

  const details: ExtractedNoteDetails = {
    location: detectLocation(normalized),
    reason: detectReason(normalized),
    activitiesMentioned: [],
    conversationTopics: [],
    socialDetails: [],
    participationDetails: [],
    moodDetails: [],
    durationDetails: [],
    refusalDetails: [],
    followupDetails: [],
    equipmentDetails: [],
    importantDetails: []
  };

  DETAIL_RULES.forEach((rule) => addMatchedDetail(details, rule, normalized));
  inferConversationTopics(normalized, details);
  inferActivityNouns(normalized, details);

  if (details.reason.toLowerCase().includes("declined group")) {
    pushUnique(details.refusalDetails, "declined group participation");
  }

  details.importantDetails = flattenImportantDetails(details);
  return details;
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
      .replace(/\brequired encouragement\b/gi, "required initial encouragement to engage");
  }

  return output;
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

  let output = normalizeWhitespace(sentence);
  output = applyPhraseRules(output, noteType, variant, strength);

  output = output
    .replace(/\bwe talked about\b/gi, "resident engaged in conversation regarding")
    .replace(/\bwe talked\b/gi, "resident engaged in conversation")
    .replace(/\bwe looked at\b/gi, "resident looked through")
    .replace(/\bwe discussed\b/gi, "resident engaged in discussion regarding")
    .replace(/^we\s+/i, "Resident and staff ")
    .replace(/\s{2,}/g, " ")
    .trim();

  output = styleSentence(output, style);
  output = titleCaseFirst(output);
  output = ensureSentencePunctuation(output);

  return output;
}

function joinWithAnd(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function formatActivityForProgress(activity: string) {
  const lower = activity.toLowerCase();
  if (lower.includes("bingo")) return "bingo group";
  if (lower.includes("music")) return "music activity";
  if (lower.includes("cards")) return "card activity";
  return activity;
}

function formatOneToOneLocation(location: string) {
  if (!location) return "in room";
  if (location.startsWith("in ")) return `in the ${location.replace(/^in\s+/i, "")}`;
  if (location.startsWith("on ")) return `on the ${location.replace(/^on\s+/i, "")}`;
  if (location === "bed-bound") return "at bedside";
  return location;
}

function removeEmptySentences(sentences: string[]) {
  return sentences.map((item) => ensureSentencePunctuation(titleCaseFirst(item))).filter(Boolean);
}

function capSentences(sentences: string[], style: NoteRewriteStyle) {
  if (style === "shorter") return sentences.slice(0, 2);
  if (style === "detailed") return sentences.slice(0, 5);
  return sentences.slice(0, 4);
}

export function buildProgressNoteFromDetails(details: ExtractedNoteDetails, style: NoteRewriteStyle) {
  const sentences: string[] = [];

  const primaryActivity = details.activitiesMentioned[0];
  const participation = details.participationDetails;
  const mood = details.moodDetails;
  const social = details.socialDetails;
  const duration = details.durationDetails;

  if (primaryActivity) {
    const activityName = formatActivityForProgress(primaryActivity);
    if (participation.includes("required initial encouragement") && participation.includes("engagement increased")) {
      sentences.push(
        `Resident attended ${activityName} and required initial encouragement to engage, with improved participation as the session progressed`
      );
    } else if (participation.length > 0) {
      sentences.push(`Resident attended ${activityName} and ${joinWithAnd(participation)}`);
    } else {
      sentences.push(`Resident attended ${activityName} and participated as tolerated`);
    }
  } else if (participation.length > 0) {
    sentences.push(`Resident participated in the scheduled activity and ${joinWithAnd(participation)}`);
  }

  const responseParts: string[] = [];
  if (mood.length > 0) {
    if (mood.includes("smiling")) {
      responseParts.push("was observed smiling");
    }
    if (mood.includes("calm")) {
      responseParts.push("appeared calm");
    }
    if (mood.includes("agitated")) {
      responseParts.push("appeared agitated at times");
    }
    if (mood.includes("upset")) {
      responseParts.push("appeared upset");
    }
  }

  if (social.length > 0) {
    responseParts.push("interacted socially with peers");
  }

  if (responseParts.length > 0) {
    sentences.push(`Resident ${joinWithAnd(responseParts)}`);
  }

  if (duration.length > 0) {
    if (duration.includes("stayed the whole time")) {
      sentences.push("Resident remained for the duration of the activity");
    } else if (duration.includes("left early")) {
      sentences.push("Resident left before activity completion");
    } else {
      sentences.push(`Duration noted: ${joinWithAnd(duration)}`);
    }
  }

  if (details.followupDetails.length > 0 && style !== "shorter") {
    sentences.push("Follow-up recommended based on resident response during today’s activity")
;  }

  return capSentences(removeEmptySentences(sentences), style).join(" ").trim();
}

export function buildOneToOneNoteFromDetails(details: ExtractedNoteDetails, style: NoteRewriteStyle) {
  const sentences: string[] = [];

  const location = formatOneToOneLocation(details.location || "in room");
  const hasDeclinedGroup =
    details.reason.toLowerCase().includes("declined group") || details.refusalDetails.includes("declined group participation");

  if (hasDeclinedGroup) {
    sentences.push(`Met with resident 1:1 ${location} after resident declined group participation`);
  } else if (details.reason) {
    sentences.push(`Met with resident 1:1 ${location} due to ${details.reason}`);
  } else {
    sentences.push(`Met with resident 1:1 ${location}`);
  }

  const actionParts: string[] = [];
  if (details.conversationTopics.length > 0) {
    actionParts.push(`engaged in conversation regarding ${joinWithAnd(details.conversationTopics)}`);
  }

  const activityItems = details.activitiesMentioned.filter((item) => !["bingo", "music", "cards"].includes(item.toLowerCase()));
  const passiveItems = activityItems.filter((item) =>
    /(magazine|puzzle|crossword|word search|book|tv|movie)/i.test(item.toLowerCase())
  );
  const activeItems = activityItems.filter((item) => !passiveItems.includes(item));

  if (activeItems.length > 0) {
    if (activeItems.some((item) => /nail painting|paint.*nail/i.test(item.toLowerCase()))) {
      actionParts.push("participated in nail painting");
    } else {
      actionParts.push(`participated in ${joinWithAnd(activeItems)}`);
    }
  }

  if (passiveItems.length > 0) {
    actionParts.push(`looked through ${joinWithAnd(passiveItems)}`);
  }

  if (details.equipmentDetails.length > 0) {
    actionParts.push(`shared concerns regarding ${joinWithAnd(details.equipmentDetails)}`);
  }

  if (actionParts.length > 0) {
    sentences.push(`Resident ${joinWithAnd(actionParts)} during the visit`);
  }

  if (details.participationDetails.length > 0) {
    sentences.push(`Participation details: ${joinWithAnd(details.participationDetails)}`);
  }

  if (details.moodDetails.length > 0) {
    if (details.moodDetails.includes("positive response")) {
      sentences.push("Resident responded positively to the interaction");
    }
    if (details.moodDetails.includes("calm")) {
      sentences.push("Resident appeared calm throughout the interaction");
    } else if (!details.moodDetails.includes("positive response")) {
      sentences.push(`Resident mood observed: ${joinWithAnd(details.moodDetails)}`);
    }
  }

  if (details.followupDetails.includes("interested in participating again")) {
    const repeatedActivity = activeItems.some((item) => /nail painting|paint.*nail/i.test(item.toLowerCase()))
      ? "nail painting"
      : activeItems[0] ?? details.activitiesMentioned[0] ?? "this activity";
    sentences.push(`Resident expressed interest in participating in ${repeatedActivity} again during future visits`);
  } else if (details.followupDetails.length > 0 && style !== "shorter") {
    sentences.push("Follow-up support will continue based on resident preference and response");
  }

  return capSentences(removeEmptySentences(sentences), style).join(" ").trim();
}

export function rewriteFromExtractedDetails(
  details: ExtractedNoteDetails,
  noteType: NoteRewriteType,
  style: NoteRewriteStyle,
  variant: number,
  strength: RewriteStrength
) {
  const detailBuilt =
    noteType === "progress"
      ? buildProgressNoteFromDetails(details, style)
      : buildOneToOneNoteFromDetails(details, style);

  if (!detailBuilt) return "";

  const transformed = splitNoteIntoSentences(detailBuilt)
    .map((sentence, index) =>
      transformSentence(sentence, noteType, {
        style,
        variant: variant + index,
        strength
      })
    )
    .join(" ")
    .trim();

  return transformed;
}

function rewriteFromSentencePass(input: string, noteType: NoteRewriteType, style: NoteRewriteStyle, variant: number, strength: RewriteStrength) {
  const transformed = splitNoteIntoSentences(input)
    .map((sentence, index) =>
      transformSentence(sentence, noteType, {
        style,
        variant: variant + index,
        strength
      })
    )
    .filter(Boolean);

  return capSentences(transformed, style).join(" ").trim();
}

function detectGenericPhrases(text: string) {
  const lower = text.toLowerCase();
  return GENERIC_BLOCKLIST.filter((phrase) => lower.includes(phrase));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getDetailPreservationPatterns(detail: string) {
  const lower = detail.toLowerCase();
  const patterns: RegExp[] = [new RegExp(`\\b${escapeRegex(lower)}\\b`, "i")];

  if (lower.includes("bingo")) patterns.push(/\bbingo\b/i);
  if (lower.includes("music")) patterns.push(/\bmusic\b/i);
  if (lower.includes("crossword")) patterns.push(/\bcrosswords?\b/i);
  if (lower.includes("word search")) patterns.push(/\bword searches?\b/i);
  if (lower.includes("magazine")) patterns.push(/\bmagazines?\b/i);
  if (lower.includes("puzzle")) patterns.push(/\bpuzzle book\b/i);
  if (lower.includes("family")) patterns.push(/\bfamily\b/i);
  if (lower.includes("kids") || lower.includes("children")) patterns.push(/\bkids?|children\b/i);
  if (lower.includes("cars")) patterns.push(/\bcars?\b/i);
  if (lower.includes("wheelchair")) patterns.push(/\bwheelchair\b/i);
  if (lower.includes("dining room")) patterns.push(/\bdining room\b/i);
  if (lower.includes("activity room")) patterns.push(/\bactivity room\b/i);
  if (lower.includes("hallway")) patterns.push(/\bhallway\b/i);
  if (lower.includes("patio")) patterns.push(/\bpatio\b/i);
  if (lower.includes("nail painting")) patterns.push(/\bnail painting\b|paint(ed|ing)? nails?/i);
  if (lower.includes("declined group")) patterns.push(/declined group participation|hesitant to engage in group|not interested in group/i);
  if (lower.includes("encouragement")) patterns.push(/encouragement/i);
  if (lower.includes("engagement increased")) patterns.push(/engagement increased|improved participation|more engaged/i);
  if (lower.includes("clapped along")) patterns.push(/clapp(ed|ing)\s+along|clapped some/i);
  if (lower.includes("smiling")) patterns.push(/smil(ed|ing)/i);
  if (lower.includes("positive response")) patterns.push(/responded positively|was positive|positive throughout/i);
  if (lower.includes("interested in participating again"))
    patterns.push(/would like to .*again|wants? to .*again|interested in .*again|expressed interest in participating.*again/i);
  if (lower.includes("calm")) patterns.push(/\bcalm\b/i);
  if (lower.includes("left early")) patterns.push(/left before|did not remain|departed/i);
  if (lower.includes("stayed the whole time")) patterns.push(/duration|full session|remained for the duration/i);
  if (lower.includes("talked with peers")) patterns.push(/peers|other residents|social/i);

  return patterns;
}

function isDetailPreserved(detail: string, rewritten: string) {
  return getDetailPreservationPatterns(detail).some((pattern) => pattern.test(rewritten));
}

export function validatePreservedDetails(
  originalInput: string,
  details: ExtractedNoteDetails,
  rewrittenOutput: string
): NotePreservationReport {
  const importantDetails = details.importantDetails;
  const preservedDetails = importantDetails.filter((detail) => isDetailPreserved(detail, rewrittenOutput));
  const missingDetails = importantDetails.filter((detail) => !preservedDetails.includes(detail));

  const totalImportantDetailCount = importantDetails.length;
  const preservedDetailCount = preservedDetails.length;

  const minRequired = totalImportantDetailCount >= 4 ? 3 : totalImportantDetailCount >= 2 ? 2 : totalImportantDetailCount >= 1 ? 1 : 0;
  const genericPhrasesFound = detectGenericPhrases(rewrittenOutput);
  const preservationScore = totalImportantDetailCount === 0 ? 1 : preservedDetailCount / totalImportantDetailCount;
  const originalWordCount = normalizeForDiff(originalInput).split(" ").filter(Boolean).length;
  const rewrittenWordCount = normalizeForDiff(rewrittenOutput).split(" ").filter(Boolean).length;
  const tooShortComparedToInput = originalWordCount >= 10 && rewrittenWordCount < Math.max(8, Math.floor(originalWordCount * 0.45));

  const passed =
    preservedDetailCount >= minRequired &&
    !tooShortComparedToInput &&
    !(genericPhrasesFound.length >= 2) &&
    !(genericPhrasesFound.length >= 1 && preservedDetailCount < Math.max(1, minRequired));

  return {
    totalImportantDetailCount,
    preservedDetailCount,
    preservedDetails,
    missingDetails,
    preservationScore,
    genericPhrasesFound,
    tooShortComparedToInput,
    passed
  };
}

function appendMissingDetailHints(note: string, missingDetails: string[], noteType: NoteRewriteType, style: NoteRewriteStyle) {
  if (missingDetails.length === 0) return note;

  const topMissing = missingDetails.slice(0, style === "shorter" ? 1 : 2);
  if (topMissing.length === 0) return note;

  const hintSentence =
    noteType === "progress"
      ? `Additional observed details included ${joinWithAnd(topMissing)}.`
      : `Visit details also included ${joinWithAnd(topMissing)}.`;

  return `${note} ${hintSentence}`.trim();
}

function selectBetterRewrite(a: string, aReport: NotePreservationReport, b: string, bReport: NotePreservationReport) {
  if (bReport.passed && !aReport.passed) return { note: b, report: bReport };
  if (aReport.passed && !bReport.passed) return { note: a, report: aReport };

  const aScore = aReport.preservationScore - aReport.genericPhrasesFound.length * 0.25;
  const bScore = bReport.preservationScore - bReport.genericPhrasesFound.length * 0.25;

  return bScore > aScore ? { note: b, report: bReport } : { note: a, report: aReport };
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

  const extractedDetails = extractNoteDetails(normalized);
  const baseVariant = getVariant({ excludeResponseId: options?.excludeResponseId });
  const preferredStrength = options?.strength ?? "standard";

  const candidateFromDetails = rewriteFromExtractedDetails(extractedDetails, noteType, style, baseVariant, preferredStrength);
  const detailCandidate = candidateFromDetails || rewriteFromSentencePass(normalized, noteType, style, baseVariant, preferredStrength);
  const detailDiff = validateRewriteDifference(normalized, detailCandidate);
  const detailReport = validatePreservedDetails(normalized, extractedDetails, detailCandidate);

  let selected = detailCandidate;
  let selectedReport = detailReport;

  if (!detailReport.passed || !detailDiff.isMeaningfullyDifferent) {
    const candidateStrong = rewriteFromExtractedDetails(extractedDetails, noteType, style, baseVariant + 1, "strong");
    const strongCandidate = candidateStrong || rewriteFromSentencePass(normalized, noteType, style, baseVariant + 1, "strong");
    const strongWithHints = appendMissingDetailHints(strongCandidate, detailReport.missingDetails, noteType, style);
    const strongReport = validatePreservedDetails(normalized, extractedDetails, strongWithHints);

    const picked = selectBetterRewrite(selected, selectedReport, strongWithHints, strongReport);
    selected = picked.note;
    selectedReport = picked.report;
  }

  if (!selectedReport.passed) {
    const sentencePass = rewriteFromSentencePass(normalized, noteType, style, baseVariant + 2, "strong");
    const sentenceWithHints = appendMissingDetailHints(sentencePass, selectedReport.missingDetails, noteType, style);
    const sentenceReport = validatePreservedDetails(normalized, extractedDetails, sentenceWithHints);
    const picked = selectBetterRewrite(selected, selectedReport, sentenceWithHints, sentenceReport);
    selected = picked.note;
    selectedReport = picked.report;
  }

  const finalDiff = validateRewriteDifference(normalized, selected);
  if (!finalDiff.isMeaningfullyDifferent && words.length >= 6) {
    selected = rewriteFromSentencePass(normalized, noteType, style, baseVariant + 3, "strong");
    selectedReport = validatePreservedDetails(normalized, extractedDetails, selected);
  }

  return {
    note: selected,
    variant: baseVariant,
    responseId: `rewrite-${noteType}-${style}-v${baseVariant}-s${preferredStrength}`,
    debug: {
      extractedDetails,
      preservation: selectedReport
    }
  };
}

function rewriteByType(input: string, noteType: NoteRewriteType, style: NoteRewriteStyle, options?: NoteRewriteOptions): NoteRewriteResult {
  return rewriteNoteText(input, noteType, style, options);
}

export function rewordProgressNote(input: string, style: NoteRewriteStyle = "professional", options?: NoteRewriteOptions) {
  return rewriteByType(input, "progress", style, options);
}

export function rewordOneToOneNote(input: string, style: NoteRewriteStyle = "professional", options?: NoteRewriteOptions) {
  return rewriteByType(input, "one_to_one", style, options);
}
