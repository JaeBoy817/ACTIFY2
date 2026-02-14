import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { clerkPublishableKey, isClerkConfigured } from "@/lib/clerk-config";

export const metadata: Metadata = {
  title: "ACTIFY",
  description: "Documentation that doesn't feel like paperwork."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const body = (
    <>
      {children}
      <Toaster />
    </>
  );

  return (
    <html lang="en">
      <body className="min-h-screen font-[var(--font-sans)]">
        {isClerkConfigured ? <ClerkProvider publishableKey={clerkPublishableKey}>{body}</ClerkProvider> : body}
      </body>
    </html>
  );
}
