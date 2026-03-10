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
      className={`${marketingFont.className} relative min-h-screen overflow-hidden text-zinc-900`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(243,240,233,0.72)_0%,rgba(243,240,233,0.58)_100%),radial-gradient(900px_circle_at_4%_4%,rgba(250,204,21,0.18),transparent_48%),radial-gradient(900px_circle_at_96%_6%,rgba(37,99,235,0.1),transparent_42%)]"
      />
      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 pb-10 md:px-8">
        <MarketingNavBar />
        <main>{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
