import "server-only";

import { readFile } from "fs/promises";
import path from "path";

type LogoCandidate = {
  fileName: string;
  mimeType: "image/png" | "image/svg+xml";
};

const logoCandidates: LogoCandidate[] = [
  { fileName: "actify-logo.png", mimeType: "image/png" },
  { fileName: "actify-logo.svg", mimeType: "image/svg+xml" }
];

export async function loadActifyLogoDataUri() {
  const publicDir = path.join(process.cwd(), "public");

  for (const candidate of logoCandidates) {
    try {
      const file = await readFile(path.join(publicDir, candidate.fileName));
      return `data:${candidate.mimeType};base64,${file.toString("base64")}`;
    } catch {
      continue;
    }
  }

  // TODO: Add /public/actify-logo.png or /public/actify-logo.svg to render the real ACTIFY mark in generated images.
  return null;
}

