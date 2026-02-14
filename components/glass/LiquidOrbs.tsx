import { cn } from "@/lib/utils";

interface LiquidOrbsProps {
  className?: string;
}

export function LiquidOrbs({ className }: LiquidOrbsProps) {
  return (
    <div aria-hidden className={cn("actify-orbs-layer", className)}>
      <div className="actify-orb orb-drift actify-orb-blue" />
      <div className="actify-orb orb-drift actify-orb-mint" />
      <div className="actify-orb orb-drift actify-orb-coral" />
    </div>
  );
}
