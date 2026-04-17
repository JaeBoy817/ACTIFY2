import localFont from "next/font/local";

import { MarketingFooter } from "@/components/marketing/Footer";
import { MarketingNavBar } from "@/components/marketing/NavBar";

const marketingFont = localFont({
  src: [
    {
      path: "../fonts/inter-latin-400.woff2",
      weight: "400",
      style: "normal"
    },
    {
      path: "../fonts/inter-latin-600.woff2",
      weight: "600",
      style: "normal"
    }
  ],
  display: "swap"
});

export const dynamic = "force-static";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-ambient="marketing"
      className={`${marketingFont.className} relative min-h-screen overflow-x-clip bg-[#e8eaee] text-slate-900`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_8%_-6%,rgba(148,163,184,0.26),transparent_48%),radial-gradient(1000px_circle_at_95%_0%,rgba(186,230,253,0.5),transparent_44%),linear-gradient(180deg,rgba(248,250,252,0.68)_0%,rgba(235,238,243,0.96)_100%)]"
      />
      <div className="relative z-10 mx-auto w-full max-w-[1260px] px-4 pb-10 md:px-8 lg:px-10">
        <MarketingNavBar />
        <main className="pt-3 md:pt-4">{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
