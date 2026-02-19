"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { normalizeResidentStatusForImport } from "@/lib/residents/types";
import { useToast } from "@/lib/use-toast";

type ParsedRow = {
  firstName: string;
  lastName: string;
  room: string;
  status: string;
  notes?: string;
};

function parseCsvInput(input: string): ParsedRow[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const hasHeader = /^first\s*,\s*last\s*,\s*room\s*,\s*status/i.test(lines[0]);
  const content = hasHeader ? lines.slice(1) : lines;

  return content.map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    const [firstName = "", lastName = "", room = "", status = "", ...noteCells] = cells;
    return {
      firstName,
      lastName,
      room,
      status,
      notes: noteCells.join(", ").trim() || undefined
    };
  });
}

export function ImportResidentsModal({
  open,
  onOpenChange,
  onImport
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: ParsedRow[]) => Promise<void>;
}) {
  const { toast } = useToast();
  const [csvText, setCsvText] = useState("");
  const [isPending, startTransition] = useTransition();

  const parsedRows = useMemo(() => parseCsvInput(csvText), [csvText]);
  const validRows = useMemo(
    () =>
      parsedRows.filter((row) => {
        if (!row.firstName || !row.lastName || !row.room || !row.status) return false;
        return normalizeResidentStatusForImport(row.status) != null;
      }),
    [parsedRows]
  );

  const invalidRows = parsedRows.length - validRows.length;

  function handleConfirmImport() {
    if (validRows.length === 0) {
      toast({
        title: "No valid rows to import",
        description: "Use format: First, Last, Room, Status, Notes",
        variant: "destructive"
      });
      return;
    }

    startTransition(async () => {
      try {
        await onImport(validRows);
        toast({ title: "Residents imported" });
        setCsvText("");
        onOpenChange(false);
      } catch (error) {
        toast({
          title: "Could not import residents",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Residents</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Paste CSV with columns: <code>First,Last,Room,Status,Notes</code>.
          </p>
          <Textarea
            rows={8}
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            placeholder="First,Last,Room,Status,Notes"
            className="shadow-lg shadow-black/10"
          />
          <div className="rounded-xl border border-white/30 bg-white/60 p-3 shadow-lg shadow-black/10">
            <p className="text-xs text-foreground/70">
              Preview: {validRows.length} valid row(s)
              {invalidRows > 0 ? ` • ${invalidRows} invalid row(s)` : ""}
            </p>
            <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-white/20 bg-white/65">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First</TableHead>
                    <TableHead>Last</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validRows.slice(0, 25).map((row, index) => (
                    <TableRow key={`${row.firstName}-${row.lastName}-${row.room}-${index}`}>
                      <TableCell>{row.firstName}</TableCell>
                      <TableCell>{row.lastName}</TableCell>
                      <TableCell>{row.room}</TableCell>
                      <TableCell>{row.status}</TableCell>
                    </TableRow>
                  ))}
                  {validRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground">
                        No valid rows parsed yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirmImport} disabled={isPending} className="shadow-lg shadow-actifyBlue/25">
            Confirm Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
