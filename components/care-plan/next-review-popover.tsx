"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

interface NextReviewPopoverProps {
  currentDate?: Date | null;
  setNextReviewDateAction: (formData: FormData) => Promise<void>;
}

export function NextReviewPopover({ currentDate, setNextReviewDateAction }: NextReviewPopoverProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(currentDate ?? undefined);
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();

  React.useEffect(() => {
    setSelectedDate(currentDate ?? undefined);
  }, [currentDate]);

  const onSave = () => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("nextReviewAt", selectedDate ? selectedDate.toISOString() : "");
        await setNextReviewDateAction(formData);
      toast({ title: "Next check-in date updated" });
        setOpen(false);
      } catch {
        toast({ title: "Could not update next check-in date", variant: "destructive" });
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-start", !selectedDate && "text-muted-foreground")}> 
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "PPP") : "Set Next Check-In Date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => setSelectedDate(date ?? undefined)}
          numberOfMonths={1}
          initialFocus
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)}>Clear</Button>
          <Button type="button" size="sm" onClick={onSave} disabled={isPending}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
