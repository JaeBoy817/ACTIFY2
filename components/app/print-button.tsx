"use client";

import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button type="button" className="no-print" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
