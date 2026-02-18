import { Boxes, CreditCard } from "lucide-react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TabSwitcher() {
  return (
    <TabsList className="grid w-[240px] grid-cols-2">
      <TabsTrigger value="stock" className="gap-1.5">
        <Boxes className="h-4 w-4" />
        Stock
      </TabsTrigger>
      <TabsTrigger value="budget" className="gap-1.5">
        <CreditCard className="h-4 w-4" />
        Budget
      </TabsTrigger>
    </TabsList>
  );
}
