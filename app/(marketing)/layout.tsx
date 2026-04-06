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
      className={`${marketingFont.className} relative min-h-screen overflow-x-clip bg-[#060b16] text-slate-100`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_2%_-8%,rgba(56,189,248,0.17),transparent_46%),radial-gradient(1200px_circle_at_98%_0%,rgba(139,92,246,0.16),transparent_42%),radial-gradient(1000px_circle_at_50%_120%,rgba(236,72,153,0.14),transparent_46%),linear-gradient(180deg,rgba(6,11,22,0.98)_0%,rgba(6,11,22,1)_100%)]"
      />
      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-4 pb-12 md:px-8">
        <MarketingNavBar />
        <main className="pt-2">{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
