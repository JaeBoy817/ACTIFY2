import { FileText, Plus, UserRoundPen } from "lucide-react";
import Link from "next/link";

import { NotesSubNav } from "@/components/notes/NotesSubNav";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function NotesShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl border-white/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground/60">
              <FileText className="h-3.5 w-3.5 text-pink-600" />
              Notes Module
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-3xl text-foreground">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="shadow-lg shadow-black/20">
                <Plus className="mr-1.5 h-4 w-4" />
                New Note
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/app/notes/new?type=general">General Note</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/notes/new?type=1on1">
                  <UserRoundPen className="mr-2 h-4 w-4" />
                  1:1 Note
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4">
          <NotesSubNav />
        </div>
      </section>
      {children}
    </div>
  );
}
