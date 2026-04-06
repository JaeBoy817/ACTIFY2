import Link from "next/link";
import { Building2, Clock3, Mail, MessagesSquare, Phone, UserCheck } from "lucide-react";

export const dynamic = "force-static";

const CONTACT_CARDS = [
  {
    title: "General Support",
    detail: "actifysupport@gmail.com",
    helper: "For onboarding, workflow questions, and platform support.",
    icon: Mail,
    accent: "text-cyan-200"
  },
  {
    title: "Product & Partnerships",
    detail: "partnerships@actify.app",
    helper: "For implementation planning and facility-level collaboration.",
    icon: MessagesSquare,
    accent: "text-violet-200"
  }
] as const;

export default function ContactPage() {
  return (
    <div className="pb-10 pt-6 md:pb-14 md:pt-8">
      <section className="rounded-[2rem] border border-slate-700/70 bg-[linear-gradient(180deg,#090e19_0%,#080c14_100%)] p-5 shadow-[0_30px_120px_-45px_rgba(9,93,255,0.45)] md:p-8">
        <header className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/85">Contact / Demo</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.02] text-white md:text-6xl">
            Talk with the Actify team.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300 md:text-lg">
            Reach out for support, onboarding guidance, implementation planning, or a live product walkthrough.
          </p>
        </header>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-3">
            {CONTACT_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">{card.title}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{card.detail}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{card.helper}</p>
                    </div>
                    <Icon className={"h-5 w-5 " + card.accent} />
                  </div>
                </article>
              );
            })}
          </div>

          <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/85">Request Access</p>
            <h2 className="mt-2 text-2xl font-black text-white">Start your Actify onboarding</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              If your facility is ready to evaluate Actify, request a demo and we&apos;ll help map the best setup for your activity team.
            </p>
            <div className="mt-4 grid gap-2">
              {["Facility name and location", "Role and team structure", "Primary workflow goals"].map((item) => (
                <p key={item} className="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                  <UserCheck className="h-4 w-4 text-emerald-300" />
                  {item}
                </p>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/request-access"
                className="inline-flex h-11 items-center rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-500/80 to-blue-600/80 px-5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Request Demo
              </Link>
              <a
                href="mailto:actifysupport@gmail.com?subject=Actify%20Support%20Request"
                className="inline-flex h-11 items-center rounded-full border border-slate-500 bg-slate-900/85 px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-300"
              >
                Email Support
              </a>
            </div>
          </article>
        </div>

        <section className="mt-8 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              <Clock3 className="h-4 w-4 text-amber-200" />
              Hours
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">Monday-Friday, 8:00 AM-5:00 PM (ET)</p>
          </article>
          <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              <Building2 className="h-4 w-4 text-cyan-200" />
              Facility Focus
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">SNFs, assisted living, and long-term care activity departments.</p>
          </article>
          <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              <Phone className="h-4 w-4 text-violet-200" />
              Live Walkthroughs
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">Demo sessions available by request through the access form.</p>
          </article>
        </section>
      </section>
    </div>
  );
}
