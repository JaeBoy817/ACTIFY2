export const ACTIFY_LOGO_ALT = "Actify logo";
export const ACTIFY_LOGO_WIDTH = 623;
export const ACTIFY_LOGO_HEIGHT = 465;
export const ACTIFY_LOGO_ASPECT_RATIO = ACTIFY_LOGO_WIDTH / ACTIFY_LOGO_HEIGHT;

export const ACTIFY_LOGO_SRC = "/branding/actify-logo.png";
export const ACTIFY_LOGO_SRC_2X = "/branding/actify-logo@2x.png";
export const ACTIFY_LOGO_SRC_4X = "/branding/actify-logo@4x.png";

export const ACTIFY_LOGO_FILE_CANDIDATES: Array<{
  fileName: string;
  mimeType: "image/png" | "image/svg+xml";
}> = [
  { fileName: "branding/actify-logo.png", mimeType: "image/png" },
  { fileName: "branding/actify-logo@2x.png", mimeType: "image/png" },
  { fileName: "branding/actify-logo@4x.png", mimeType: "image/png" }
];
