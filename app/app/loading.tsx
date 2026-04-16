export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 rounded-[2rem] border border-slate-200/80 bg-white/75 p-5 shadow-[0_25px_52px_-40px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200/80" />
        <div className="h-7 w-80 max-w-full animate-pulse rounded-full bg-slate-200/80" />
      </div>
      <div className="rounded-[1.7rem] border border-slate-200/85 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 shadow-inner shadow-slate-100/70 sm:p-5">
        <div className="mb-3 h-11 w-full animate-pulse rounded-2xl bg-slate-200/80" />
        <div className="space-y-3">
          <div className="ml-auto h-14 w-2/3 animate-pulse rounded-2xl bg-indigo-100/80" />
          <div className="h-28 w-[90%] animate-pulse rounded-3xl bg-slate-100/90" />
          <div className="ml-auto h-12 w-1/2 animate-pulse rounded-2xl bg-indigo-100/80" />
          <div className="h-24 w-[82%] animate-pulse rounded-3xl bg-slate-100/90" />
        </div>
      </div>

      <div className="h-20 animate-pulse rounded-[1.5rem] border border-slate-200/80 bg-white" />
      <div className="h-14 animate-pulse rounded-[1.25rem] border border-slate-200/80 bg-white" />
    </div>
  );
}
