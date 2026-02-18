import { redirect } from "next/navigation";

export default function LegacyBudgetPageRedirect() {
  redirect("/app/dashboard/budget-stock");
}
