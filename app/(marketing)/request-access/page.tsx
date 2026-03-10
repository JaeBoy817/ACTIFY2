import Link from "next/link";
import { ArrowLeft, Building2, ClipboardList, Mail, ShieldCheck, UserCheck } from "lucide-react";

export default function RequestAccessPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,#253865_0%,#111827_44%,#0b0f16_100%)] text-zinc-100">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-8 md:py-14">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/sign-in" className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
          <span className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
            Access Request
          </span>
        </div>

        <section className="rounded-[2rem] border border-zinc-700 bg-[linear-gradient(165deg,#121826_0%,#0d111b_60%,#090c13_100%)] p-7 shadow-[0_34px_70px_-42px_rgba(0,0,0,0.9)] md:p-10">
          <h1 className="font-[var(--font-display)] text-4xl leading-[1.03] text-white md:text-6xl">Request Actify access</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">
            New accounts are provisioned by facility administrators. Submit your request details and our team will route approval to the right contact.
          </p>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">How approval works</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-200">
                <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />Request is verified against facility records.</li>
                <li className="flex items-start gap-2"><UserCheck className="mt-0.5 h-4 w-4 text-blue-300" />Administrator confirms role and permissions.</li>
                <li className="flex items-start gap-2"><ClipboardList className="mt-0.5 h-4 w-4 text-violet-300" />You receive sign-in confirmation by email.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Include in your request</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-200">
                <li className="flex items-start gap-2"><Building2 className="mt-0.5 h-4 w-4 text-amber-300" />Facility name and location</li>
                <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 text-rose-300" />Work email and job title</li>
                <li className="flex items-start gap-2"><UserCheck className="mt-0.5 h-4 w-4 text-cyan-300" />Manager or admin approver name</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-[#f6f2e9] p-6 text-zinc-900">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Submit request</p>
            <h2 className="mt-1 text-2xl font-bold text-zinc-950">Email access request</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Send your request to support. We typically respond within one business day.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="mailto:actifysupport@gmail.com?subject=Actify%20Access%20Request&body=Name:%0AWork%20Email:%0AFacility:%0ARole:%0AApproving%20Manager:%0A"
                className="inline-flex items-center gap-2 rounded-xl border border-yellow-500 bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400"
              >
                <Mail className="h-4 w-4" />
                Email Access Request
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
