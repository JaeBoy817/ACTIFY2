import localFont from "next/font/local";

import { AmbientBackdrop } from "@/components/marketing/AmbientBackdrop";
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
      className={`${marketingFont.className} relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F3F0FF]/70 via-[#F8F0FC]/60 to-[#FFF0F6]/70`}
    >
      <AmbientBackdrop />
      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 pb-10 md:px-8">
        <MarketingNavBar />
        <main>{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
