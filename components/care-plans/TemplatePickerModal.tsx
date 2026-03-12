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
        <Button className="h-9 rounded-full border border-[#4a71ad] bg-[#244b86] px-4 text-xs font-semibold text-white shadow-[0_16px_28px_-20px_rgba(37,99,235,0.75)] hover:bg-[#2b5a9f]">
          Create Care Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl border border-[#2d446f] bg-[linear-gradient(180deg,#0d172c_0%,#0b1427_100%)] text-[#dce8ff] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-white">Create Care Plan</DialogTitle>
          <DialogDescription className="text-[#9fb8e2]">Select resident and optional template to prefill the wizard.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-sm font-medium text-[#dce8ff]">
            Resident
            <Input
              className="mt-1 border-[#345483] bg-[#10203b] text-[#dce8ff] placeholder:text-[#8ea9d6]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search resident or room"
            />
          </label>
          <Select value={residentId} onValueChange={setResidentId}>
            <SelectTrigger className="border-[#345483] bg-[#10203b] text-[#dce8ff]">
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

          <label className="text-sm font-medium text-[#dce8ff]">
            Template (optional)
            <Select value={templateKey} onValueChange={setTemplateKey}>
              <SelectTrigger className="mt-1 border-[#345483] bg-[#10203b] text-[#dce8ff]">
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
          <Button variant="outline" className="border-[#375787] bg-[#10203b] text-[#d6e5ff] hover:bg-[#14284a]" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="border border-[#4a71ad] bg-[#244b86] text-white hover:bg-[#2b5a9f]" onClick={handleContinue} disabled={!residentId}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
