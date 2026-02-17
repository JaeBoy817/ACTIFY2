import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";
import { AmbientGradientDrift } from "@/components/ambient/AmbientGradientDrift";
import { Toaster } from "@/components/ui/toaster";
import { clerkPublishableKey, isClerkConfigured } from "@/lib/clerk-config";

function getMetadataBase() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "ACTIFY",
    template: "%s | ACTIFY"
  },
  description: "Documentation that doesn't feel like paperwork.",
  openGraph: {
    title: "ACTIFY",
    description: "Documentation that doesn't feel like paperwork.",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ACTIFY preview image"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "ACTIFY",
    description: "Documentation that doesn't feel like paperwork.",
    images: ["/twitter-image"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const bodyContent = (
    <>
      {children}
      <Toaster />
    </>
  );

  return (
    <html lang="en">
      <body data-ambient="default" className="relative min-h-screen font-[var(--font-sans)]">
        <AmbientGradientDrift />
        <div className="relative z-10 min-h-screen">
          {isClerkConfigured ? <ClerkProvider publishableKey={clerkPublishableKey}>{bodyContent}</ClerkProvider> : bodyContent}
        </div>
      </body>
    </html>
  );
}
