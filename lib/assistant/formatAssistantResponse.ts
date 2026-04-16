const DECORATIVE_DIVIDER_LINE = /^\s*(\*{3,}|\*\s*\*\s*\*)\s*$/;

export function formatAssistantResponse(raw: string): string {
  if (!raw) return "";

  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""));

  const cleanedLines = lines.filter((line) => !DECORATIVE_DIVIDER_LINE.test(line.trim()));

  const normalized = cleanedLines
    .join("\n")
    .replace(/^(#{1,6})([^\s#])/gm, "$1 $2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized || raw.trim();
}
