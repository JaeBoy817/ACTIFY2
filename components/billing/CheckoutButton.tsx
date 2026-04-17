"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/use-toast";

type CheckoutPlan = "monthly" | "annual";

export function CheckoutButton({
  endpoint = "/api/stripe/checkout",
  plan = "monthly",
  label = "Continue to Checkout",
  loadingLabel = "Redirecting to Checkout...",
  redirectToSignInOnUnauthorized = false,
  signInRedirectPath,
  className
}: {
  endpoint?: string;
  plan?: CheckoutPlan;
  label?: string;
  loadingLabel?: string;
  redirectToSignInOnUnauthorized?: boolean;
  signInRedirectPath?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleCheckout() {
    setIsLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          plan
        })
      });

      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (response.status === 401) {
        toast({
          title: "Sign in required",
          description: payload.error ?? "You need to sign in before subscribing.",
          variant: "destructive"
        });
        if (redirectToSignInOnUnauthorized) {
          const redirectPath =
            signInRedirectPath ??
            `${window.location.pathname}${window.location.search}${window.location.hash}`;
          const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`;
          window.location.assign(signInUrl);
        }
        return;
      }

      if (!response.ok || !payload.url) {
        toast({
          title: "Unable to start checkout",
          description: payload.error ?? "We couldn't start checkout right now. Please try again.",
          variant: "destructive"
        });
        return;
      }

      window.location.assign(payload.url);
    } catch (error) {
      console.error("[billing][checkout-button]", error);
      toast({
        title: "Unable to start checkout",
        description: "We couldn't start checkout right now. Please try again.",
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
      {isLoading ? loadingLabel : label}
    </Button>
  );
}
