import { type LucideIcon } from "lucide-react";

type FeaturePillarCardProps = {
  title: string;
  description: string;
  points: readonly string[];
  icon: LucideIcon;
  accentClassName: string;
};

export function FeaturePillarCard({ title, description, points, icon: Icon, accentClassName }: FeaturePillarCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.38)] transition duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_30px_70px_-42px_rgba(15,23,42,0.42)]">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${accentClassName}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
