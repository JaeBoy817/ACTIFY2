/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

import { loadActifyLogoDataUri } from "@/lib/branding/logo-data";

export const runtime = "nodejs";
export const contentType = "image/png";

export function generateImageMetadata() {
  return [
    {
      id: "32",
      size: { width: 32, height: 32 },
      contentType: "image/png"
    },
    {
      id: "512",
      size: { width: 512, height: 512 },
      contentType: "image/png"
    }
  ];
}

export default async function Icon({ id }: { id?: string }) {
  const iconSize = id === "512" ? 512 : 32;
  const logoDataUri = await loadActifyLogoDataUri();
  const logoSize = Math.round(iconSize * (iconSize <= 64 ? 0.68 : 0.56));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: Math.round(iconSize * 0.2),
          background: "linear-gradient(135deg, #2563EB 0%, #2DD4BF 100%)"
        }}
      >
        {logoDataUri ? (
          <img
            src={logoDataUri}
            width={logoSize}
            height={logoSize}
            alt="ACTIFY"
            style={{
              objectFit: "contain"
            }}
          />
        ) : (
          <div
            style={{
              width: logoSize,
              height: logoSize,
              borderRadius: Math.round(logoSize * 0.22),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: Math.round(iconSize * 0.46),
              fontWeight: 800,
              background: "rgba(255,255,255,0.22)"
            }}
          >
            A
          </div>
        )}
      </div>
    ),
    {
      width: iconSize,
      height: iconSize
    }
  );
}
