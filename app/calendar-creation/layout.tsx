import { SafeWorkspaceShell } from "@/components/workspace/SafeWorkspaceShell";

export default async function CalendarCreationLayout({ children }: { children: React.ReactNode }) {
  return <SafeWorkspaceShell label="/calendar-creation">{children}</SafeWorkspaceShell>;
}
