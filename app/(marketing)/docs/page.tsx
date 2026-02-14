import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const docs = [
  {
    title: "Core Workflow",
    content: "Build schedules from templates, take attendance, and complete progress notes with reusable phrases."
  },
  {
    title: "Full Toolkit",
    content: "Track goals, barriers, engagement trends, inventory, prize sales, volunteer visits, and Resident Council outcomes."
  },
  {
    title: "Access",
    content: "Sign in with Clerk and use the full platform immediately with role-based access controls."
  }
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-[var(--font-display)] text-4xl text-primary">ACTIFY docs</h1>
      <p className="text-muted-foreground">A practical guide for teams who need to chart faster while keeping quality notes and engagement data.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {docs.map((doc) => (
          <Card key={doc.title}>
            <CardHeader>
              <CardTitle>{doc.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{doc.content}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
