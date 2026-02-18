"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CarePlanTemplate } from "@/lib/care-plans/templates";

type ResidentOption = {
  id: string;
  name: string;
  room: string;
  unitName: string | null;
};

export function TemplatePickerModal({
  residents,
  templates
}: {
  residents: ResidentOption[];
  templates: CarePlanTemplate[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [residentId, setResidentId] = useState("");
  const [templateKey, setTemplateKey] = useState("none");

  const filteredResidents = useMemo(() => {
    const token = search.trim().toLowerCase();
    if (!token) return residents;
    return residents.filter((resident) => {
      return resident.name.toLowerCase().includes(token) || resident.room.toLowerCase().includes(token);
    });
  }, [residents, search]);

  function handleContinue() {
    if (!residentId) return;
    const query = templateKey !== "none" ? `?template=${encodeURIComponent(templateKey)}` : "";
    router.push(`/app/residents/${residentId}/care-plan/new${query}`);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="glass-panel-strong border-white/20 text-black shadow-lg shadow-actifyBlue/20 hover:bg-white/20 hover:text-black hover:shadow-xl hover:shadow-actifyBlue/25">
          Create Care Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Care Plan</DialogTitle>
          <DialogDescription>Select resident and optional template to prefill the wizard.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Resident
            <Input
              className="mt-1"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search resident or room"
            />
          </label>
          <Select value={residentId} onValueChange={setResidentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select resident" />
            </SelectTrigger>
            <SelectContent>
              {filteredResidents.map((resident) => (
                <SelectItem key={resident.id} value={resident.id}>
                  {resident.name} · Room {resident.room}
                  {resident.unitName ? ` · ${resident.unitName}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="text-sm font-medium text-foreground">
            Template (optional)
            <Select value={templateKey} onValueChange={setTemplateKey}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="No template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.key} value={template.key}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={!residentId}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
