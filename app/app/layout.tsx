import { SafeWorkspaceShell } from "@/components/workspace/SafeWorkspaceShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return <SafeWorkspaceShell label="/app">{children}</SafeWorkspaceShell>;
}
