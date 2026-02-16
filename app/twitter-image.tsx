/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

import { loadActifyLogoDataUri } from "@/lib/branding/logo-data";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default async function TwitterImage() {
  const logoDataUri = await loadActifyLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#FFF7ED",
          backgroundImage:
            "radial-gradient(900px circle at 8% 0%, rgba(45,212,191,0.22), transparent 50%), radial-gradient(900px circle at 98% 0%, rgba(37,99,235,0.2), transparent 56%)",
          padding: 44
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 30,
            border: "1px solid #E5E7EB",
            background: "rgba(255,255,255,0.92)",
            padding: 42
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div style={{ color: "#111827", fontSize: 26, fontWeight: 800, letterSpacing: 0.8 }}>ACTIFY</div>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #2563EB 0%, #2DD4BF 100%)"
              }}
            >
              {logoDataUri ? (
                <img src={logoDataUri} width={40} height={40} alt="ACTIFY" style={{ objectFit: "contain" }} />
              ) : (
                <div style={{ color: "#FFFFFF", fontSize: 34, fontWeight: 800 }}>A</div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#111827", fontSize: 66, lineHeight: 1.06, fontWeight: 800, maxWidth: 920 }}>
              Documentation that does not feel like paperwork.
            </div>
            <div style={{ marginTop: 18, color: "#374151", fontSize: 30, fontWeight: 600 }}>
              Plan, run, and document activities in one workflow.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "#111827",
              fontSize: 20,
              fontWeight: 600
            }}
          >
            <div
              style={{
                borderRadius: 999,
                border: "1px solid #E5E7EB",
                background: "rgba(255,255,255,0.94)",
                padding: "10px 16px"
              }}
            >
              Progress notes
            </div>
            <div
              style={{
                borderRadius: 999,
                border: "1px solid #E5E7EB",
                background: "rgba(255,255,255,0.94)",
                padding: "10px 16px"
              }}
            >
              Attendance + barriers
            </div>
            <div
              style={{
                borderRadius: 999,
                border: "1px solid #E5E7EB",
                background: "rgba(255,255,255,0.94)",
                padding: "10px 16px"
              }}
            >
              Monthly reports
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
