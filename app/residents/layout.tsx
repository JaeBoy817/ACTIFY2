import { SafeWorkspaceShell } from "@/components/workspace/SafeWorkspaceShell";

export default async function ResidentsLayout({ children }: { children: React.ReactNode }) {
  return <SafeWorkspaceShell label="/residents">{children}</SafeWorkspaceShell>;
}
