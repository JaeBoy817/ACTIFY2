/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

import { loadActifyLogoDataUri } from "@/lib/branding/logo-data";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoDataUri = await loadActifyLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#FFF7ED",
          padding: 46
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
            backgroundColor: "#FFFFFF",
            backgroundImage:
              "radial-gradient(860px circle at 8% -12%, rgba(45,212,191,0.24), transparent 56%), radial-gradient(840px circle at 100% -10%, rgba(37,99,235,0.2), transparent 52%)",
            padding: 44
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div
              style={{
                color: "#111827",
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 1
              }}
            >
              ACTIFY
            </div>
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #2563EB 0%, #2DD4BF 100%)",
                border: "1px solid rgba(17,24,39,0.08)"
              }}
            >
              {logoDataUri ? (
                <img
                  src={logoDataUri}
                  width={46}
                  height={46}
                  alt="ACTIFY"
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <div style={{ color: "#FFFFFF", fontSize: 38, fontWeight: 800 }}>A</div>
              )}
            </div>
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div
              style={{
                color: "#111827",
                fontSize: 68,
                lineHeight: 1.05,
                fontWeight: 800,
                maxWidth: 900
              }}
            >
              Documentation that does not feel like paperwork.
            </div>
            <div
              style={{
                marginTop: 20,
                color: "#374151",
                fontSize: 32,
                fontWeight: 600
              }}
            >
              Built for SNF, ALF, and Memory Care Activity Directors.
            </div>
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              gap: 14
            }}
          >
            {["Progress notes", "Calendar + attendance", "Monthly reporting"].map((item) => (
              <div
                key={item}
                style={{
                  borderRadius: 999,
                  border: "1px solid #E5E7EB",
                  color: "#111827",
                  background: "rgba(255,255,255,0.88)",
                  padding: "10px 16px",
                  fontSize: 20,
                  fontWeight: 600
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
