"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/use-toast";

export function ManageBillingButton({
  endpoint = "/api/stripe/customer-portal",
  disabled = false,
  className
}: {
  endpoint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleOpenPortal() {
    setIsLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST"
      });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        toast({
          title: "Unable to open billing portal",
          description: payload.error ?? "Please try again in a moment.",
          variant: "destructive"
        });
        return;
      }

      window.location.assign(payload.url);
    } catch (error) {
      console.error("[billing][portal-button]", error);
      toast({
        title: "Unable to open billing portal",
        description: "Please try again in a moment.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleOpenPortal}
      disabled={disabled || isLoading}
      className={className}
      variant="outline"
    >
      {isLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CreditCard className="mr-1.5 h-4 w-4" />}
      {isLoading ? "Opening Billing..." : "Manage Billing"}
    </Button>
  );
}
