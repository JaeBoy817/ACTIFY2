"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/lib/use-toast";

interface CopySnippetProps {
  code: string;
}

export function CopySnippet({ code }: CopySnippetProps) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Copied",
        description: "CSS snippet copied to clipboard."
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Select and copy the snippet manually.",
        variant: "destructive"
      });
    }
  }

  return (
    <div className="space-y-2">
      <pre className="overflow-x-auto rounded-md border bg-background p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        Copy CSS
      </Button>
    </div>
  );
}
