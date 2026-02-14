"use client";

import { useState } from "react";
import { PartyPopper } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { toast } from "@/lib/use-toast";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type Particle = {
  id: number;
  dx: number;
  dy: number;
  rotate: number;
  color: string;
};

const confettiColors = ["#2563EB", "#2DD4BF", "#FB7185", "#9BB5F5", "#7BE6D8"];

export function MilestoneAction() {
  const [burst, setBurst] = useState<Particle[]>([]);
  const reducedMotion = useReducedMotion();

  function celebrate() {
    toast({
      title: "Milestone achieved",
      description: "Great momentum. Keep this engagement streak going."
    });

    if (reducedMotion) return;

    const particles: Particle[] = Array.from({ length: 14 }).map((_, index) => ({
      id: Date.now() + index,
      dx: (Math.random() - 0.5) * 150,
      dy: -40 - Math.random() * 120,
      rotate: (Math.random() - 0.5) * 280,
      color: confettiColors[index % confettiColors.length]
    }));

    setBurst(particles);
    window.setTimeout(() => setBurst([]), 860);
  }

  return (
    <div className="relative inline-flex">
      <GlassButton type="button" variant="dense" size="sm" onClick={celebrate}>
        <PartyPopper className="mr-1.5 h-4 w-4" />
        Mark streak achieved
      </GlassButton>

      {burst.map((particle) => (
        <span
          key={particle.id}
          aria-hidden
          className="confetti-particle"
          style={
            {
              "--confetti-dx": `${particle.dx}px`,
              "--confetti-dy": `${particle.dy}px`,
              "--confetti-rot": `${particle.rotate}deg`,
              "--confetti-color": particle.color
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
