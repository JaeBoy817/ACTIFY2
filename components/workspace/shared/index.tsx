"use client";

import { ChevronDown, MoreHorizontal, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h1>
      {children}
    </div>
  );
}

export function PageSubheader({ text }: { text: string }) {
  return <p className="mt-2 text-sm text-slate-600 sm:text-base">{text}</p>;
}

export function SummaryStatCard({
  label,
  value,
  context,
  icon: Icon,
  active,
  onClick
}: {
  label: string;
  value: string | number;
  context?: string;
  icon?: LucideIcon;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-white/85 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200",
        active ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-200"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-slate-400" aria-hidden /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {context ? <p className="mt-1 text-xs text-slate-600">{context}</p> : null}
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block w-full">
      <span className="sr-only">Search</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
      />
    </label>
  );
}

export function FilterChips<T extends string>({
  options,
  selected,
  onToggle
}: {
  options: Array<{ key: T; label: string }>;
  selected: T[];
  onToggle: (key: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option.key);
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onToggle(option.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200",
              active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SortDropdown<T extends string>({
  options,
  value,
  onChange,
  label = "Sort"
}: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="bg-transparent text-sm text-slate-700 focus-visible:outline-none"
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function EmptyStateCard({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

export function ActionButton({
  children,
  tone = "primary",
  onClick,
  disabled,
  type = "button"
}: {
  children: React.ReactNode;
  tone?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" && "border border-teal-300 bg-teal-600 text-white hover:bg-teal-700",
        tone === "secondary" && "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        tone === "ghost" && "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100"
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

export function TagChip({ label }: { label: string }) {
  return <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">{label}</span>;
}

export function StatusBadge({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "warning" | "danger" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
        tone === "default" && "border-slate-200 bg-slate-100 text-slate-700",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "danger" && "border-rose-200 bg-rose-50 text-rose-700"
      )}
    >
      {label}
    </span>
  );
}

export function AIShortcutButton({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-left transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
    >
      <p className="text-sm font-semibold text-teal-800">{label}</p>
      <p className="mt-0.5 text-xs text-teal-700">{description}</p>
    </button>
  );
}

export function DrawerShell({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25 backdrop-blur-[1px]">
      <section className="h-full w-full max-w-2xl border-l border-slate-200 bg-slate-50 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <IconButton icon={MoreHorizontal} label="Close" onClick={onClose} />
        </header>
        <div className="h-[calc(100%-57px)] overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}

export function ModalShell({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <IconButton icon={MoreHorizontal} label="Close" onClick={onClose} />
        </header>
        <div className="max-h-[75vh] overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}

export function StepperHeader({ steps, activeStep }: { steps: string[]; activeStep: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      {steps.map((step, index) => (
        <div key={step} className="space-y-1">
          <div className={cn("h-1 rounded-full", index + 1 <= activeStep ? "bg-teal-400" : "bg-slate-200")} />
          <p className={cn("text-[11px]", index + 1 <= activeStep ? "text-slate-700" : "text-slate-400")}>{step}</p>
        </div>
      ))}
    </div>
  );
}

export function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function SaveBar({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-0 mt-4 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">{children}</div>;
}

export function StickyActionBar({ children }: { children: React.ReactNode }) {
  return <div className="sticky top-[5.75rem] z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">{children}</div>;
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200/80", className)} />;
}

export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <ModalShell open={open} title={title} onClose={onClose}>
      <p className="text-sm text-slate-600">{description}</p>
      <div className="mt-4 flex justify-end gap-2">
        <ActionButton tone="secondary" onClick={onClose}>
          Cancel
        </ActionButton>
        <ActionButton onClick={onConfirm}>{confirmLabel}</ActionButton>
      </div>
    </ModalShell>
  );
}

export function SideDetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      {children}
    </aside>
  );
}

export function EntityCard({ children, selected, onClick }: { children: React.ReactNode; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        selected ? "border-teal-300 ring-2 ring-teal-100" : "border-slate-200"
      )}
    >
      {children}
    </button>
  );
}

export function NotesBlock({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={4}
      placeholder={placeholder}
      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
    />
  );
}

export function QuickActionMenu({
  label,
  actions
}: {
  label: string;
  actions: Array<{ id: string; label: string; onClick: () => void }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
      >
        {label}
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
