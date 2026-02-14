import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="mb-3 text-center font-[var(--font-display)] text-4xl text-primary">Simple access for every facility</h1>
      <p className="mb-10 text-center text-muted-foreground">ACTIFY gives your team full access from day one.</p>

      <Card className="border-primary/30 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl text-primary">Full Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-5xl font-semibold">Included</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Progress notes + templates + attendance + monthly exports</li>
            <li>Attendance analytics, goals tracking, resident assessments</li>
            <li>Inventory, prize cart, volunteer log, and council tracker</li>
          </ul>
        </CardContent>
        <CardFooter>
          <div className="w-full space-y-2">
            <Button asChild className="w-full" size="lg">
              <Link href="/sign-up">Start free</Link>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
