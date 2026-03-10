import { Command } from "lucide-react";

import { PremiumInputField } from "@/components/dashboard/v4/PremiumInputField";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";

export function DashboardSearchField() {
  return (
    <form action="/app/residents" className="flex w-full items-center gap-2">
      <PremiumInputField
        name="q"
        placeholder="Search residents, notes, activities, or rooms"
        shortcut="⌘K"
        className="flex-1"
      />
      <PremiumPillButton label="Search" tone="blue" buttonType="submit" />
      <PremiumPillButton label="Command" icon={Command} tone="neutral" href="/app" className="hidden lg:inline-flex" />
    </form>
  );
}
