/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

import { loadActifyLogoDataUri } from "@/lib/branding/logo-data";

export const runtime = "nodejs";
export const size = {
  width: 180,
  height: 180
};
export const contentType = "image/png";

export default async function AppleIcon() {
  const logoDataUri = await loadActifyLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 38,
          background: "linear-gradient(135deg, #2563EB 0%, #2DD4BF 100%)"
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.16)",
            border: "1px solid rgba(255,255,255,0.46)"
          }}
        >
          {logoDataUri ? (
            <img
              src={logoDataUri}
              width={88}
              height={88}
              alt="ACTIFY"
              style={{
                objectFit: "contain"
              }}
            />
          ) : (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: 64,
                fontWeight: 800,
                background: "rgba(255,255,255,0.2)"
              }}
            >
              A
            </div>
          )}
        </div>
      </div>
    ),
    size
  );
}
