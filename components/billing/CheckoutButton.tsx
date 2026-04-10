"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/use-toast";

export function CheckoutButton({
  endpoint = "/api/stripe/create-checkout-session",
  className
}: {
  endpoint?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleCheckout() {
    setIsLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST"
      });

      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        toast({
          title: "Unable to start checkout",
          description: payload.error ?? "Please try again in a moment.",
          variant: "destructive"
        });
        return;
      }

      window.location.assign(payload.url);
    } catch (error) {
      console.error("[billing][checkout-button]", error);
      toast({
        title: "Unable to start checkout",
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
      onClick={handleCheckout}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-1.5 h-4 w-4" />}
      {isLoading ? "Redirecting to Checkout..." : "Continue to Checkout"}
    </Button>
  );
}
