import { existsSync } from "node:fs";

import { Font } from "@react-pdf/renderer";

const DEFAULT_DISPLAY_FONT = "Helvetica-Bold";
const DEFAULT_BODY_FONT = "Helvetica";

let cachedDisplayFont: string | null = null;
let cachedBodyFont: string | null = null;

function getDisplayCandidatePaths() {
  const envPath = process.env.ACTIFY_PDF_DISPLAY_FONT?.trim();

  return [
    envPath
  ].filter((value): value is string => Boolean(value));
}

function getBodyCandidatePaths() {
  const envPath = process.env.ACTIFY_PDF_BODY_FONT?.trim();

  return [
    envPath
  ].filter((value): value is string => Boolean(value));
}

function resolveDisplayFontFamily() {
  if (cachedDisplayFont) return cachedDisplayFont;

  for (const path of getDisplayCandidatePaths()) {
    if (!existsSync(path)) continue;
    Font.register({ family: "ActifyPdfDisplay", src: path });
    cachedDisplayFont = "ActifyPdfDisplay";
    return cachedDisplayFont;
  }

  cachedDisplayFont = DEFAULT_DISPLAY_FONT;
  return cachedDisplayFont;
}

function resolveBodyFontFamily() {
  if (cachedBodyFont) return cachedBodyFont;

  for (const path of getBodyCandidatePaths()) {
    if (!existsSync(path)) continue;
    Font.register({ family: "ActifyPdfBody", src: path });
    cachedBodyFont = "ActifyPdfBody";
    return cachedBodyFont;
  }

  cachedBodyFont = DEFAULT_BODY_FONT;
  return cachedBodyFont;
}

export const PDF_DISPLAY_FONT = resolveDisplayFontFamily();
export const PDF_BODY_FONT = resolveBodyFontFamily();
