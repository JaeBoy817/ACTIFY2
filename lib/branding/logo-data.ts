import "server-only";

import { readFile } from "fs/promises";
import path from "path";

import { ACTIFY_LOGO_FILE_CANDIDATES } from "@/lib/branding/constants";

export async function loadActifyLogoDataUri() {
  const publicDir = path.join(process.cwd(), "public");

  for (const candidate of ACTIFY_LOGO_FILE_CANDIDATES) {
    try {
      const file = await readFile(path.join(publicDir, candidate.fileName));
      return `data:${candidate.mimeType};base64,${file.toString("base64")}`;
    } catch {
      continue;
    }
  }

  return null;
}
