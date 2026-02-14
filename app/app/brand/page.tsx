import { ActifyLogo } from "@/components/ActifyLogo";
import { CopySnippet } from "@/components/app/copy-snippet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const palette = [
  { name: "Primary Blue", hex: "#2563EB", swatch: "bg-actifyBlue" },
  { name: "Secondary Mint/Seafoam", hex: "#2DD4BF", swatch: "bg-actifyMint" },
  { name: "Accent Coral", hex: "#FB7185", swatch: "bg-actifyCoral" },
  { name: "Warm Background", hex: "#FFF7ED", swatch: "bg-actifyWarm" },
  { name: "Surface", hex: "#FFFFFF", swatch: "bg-white" },
  { name: "Text", hex: "#111827", swatch: "bg-[#111827]" },
  { name: "Borders", hex: "#E5E7EB", swatch: "bg-[#E5E7EB]" }
];

const gradients = [
  {
    name: "Brand",
    className: "bg-actify-brand",
    code: "linear-gradient(135deg, #2563EB 0%, #2DD4BF 100%)"
  },
  {
    name: "Hype",
    className: "bg-actify-hype",
    code: "linear-gradient(135deg, #2563EB 0%, #FB7185 100%)"
  },
  {
    name: "Warm Accent",
    className: "bg-actify-warm",
    code: "linear-gradient(135deg, #2DD4BF 0%, #FB7185 100%)"
  },
  {
    name: "Dashboard Background",
    className: "bg-actify-dashboard",
    code: "radial-gradient(900px circle at 20% 10%, rgba(45, 212, 191, 0.20), transparent 60%), radial-gradient(900px circle at 80% 20%, rgba(37, 99, 235, 0.18), transparent 55%), #FFF7ED"
  }
];

export default function BrandPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ACTIFY Brand Kit</CardTitle>
          <CardDescription>Reusable logo, palette, gradients, and UI starters for consistent product design.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Icon</p>
            <ActifyLogo variant="icon" size={80} />
          </div>
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Lockup</p>
            <ActifyLogo variant="lockup" size={52} />
          </div>
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Stacked</p>
            <ActifyLogo variant="stacked" size={58} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Palette</CardTitle>
          <CardDescription>Core Palette B swatches used by app tokens and components.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {palette.map((color) => (
            <div key={color.name} className="rounded-lg border bg-card p-3">
              <div className={`mb-3 h-14 rounded-md border ${color.swatch}`} />
              <p className="text-sm font-medium">{color.name}</p>
              <p className="text-xs text-muted-foreground">{color.hex}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gradients</CardTitle>
          <CardDescription>Use these for hero moments, highlights, and warm surfaces.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {gradients.map((gradient) => (
            <div key={gradient.name} className="space-y-3 rounded-lg border p-4">
              <div className={`h-20 rounded-md border ${gradient.className}`} />
              <p className="text-sm font-medium">{gradient.name}</p>
              <CopySnippet code={gradient.code} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>UI Examples</CardTitle>
          <CardDescription>Starter styles ready to reuse in flows and marketing surfaces.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button className="bg-actify-brand text-white hover:opacity-95">Primary CTA</Button>
            <Button variant="outline" className="border-actifyMint text-foreground hover:bg-actifyMint/10">
              Secondary Action
            </Button>
            <Badge className="border-0 bg-actify-warm px-3 py-1 text-foreground">Warm Accent Badge</Badge>
          </div>

          <div className="bg-actify-dashboard rounded-xl border p-5">
            <p className="mb-3 font-medium">Dashboard Preview</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border bg-white/90 p-4">
                <p className="text-sm font-medium">Engagement Today</p>
                <p className="text-2xl font-semibold text-actifyBlue">84%</p>
              </div>
              <div className="rounded-lg border bg-white/90 p-4">
                <p className="text-sm font-medium">Attendance Logged</p>
                <p className="text-2xl font-semibold text-actifyCoral">26</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
