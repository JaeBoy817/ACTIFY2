"use client";

import { useEffect, useState } from "react";
import { Playfair_Display } from "next/font/google";
import { Quote } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap"
});

const BOOST_QUOTES = [
  "You’re not “just doing activities” you’re building quality of life.",
  "Small moments count. You create a lot of them.",
  "You bring the spark that shifts the whole day.",
  "Your consistency is someone’s comfort.",
  "You’re allowed to feel proud of your work.",
  "Even one smile is a win.",
  "You make this building feel human.",
  "Your presence is part of the care plan.",
  "You’re doing more than you think.",
  "You don’t need perfect to make impact.",
  "You turn ordinary days into something worth getting up for.",
  "Your patience is powerful.",
  "You’re a professional joy-builder.",
  "You’re making memories, not just filling time.",
  "You’re showing up, and that matters.",
  "Today’s effort is tomorrow’s trust.",
  "You can’t do everything, but you do so much.",
  "Your kindness has measurable outcomes.",
  "You’re the reason someone participates again.",
  "You bring warmth to routines.",
  "You’re allowed to take up space in the care team.",
  "Your work is skilled work.",
  "You create belonging.",
  "You’re doing the work that people remember.",
  "Your energy changes rooms.",
  "You are not behind. You are building.",
  "You’re stronger than the chaos.",
  "You’re leading with heart and structure.",
  "Your creativity is clinical in its own way.",
  "One good interaction can reframe a whole day.",
  "You’re not “too much” you’re exactly what the role needs.",
  "Your calm is contagious.",
  "You’re allowed to celebrate small wins loudly.",
  "You’re doing meaningful work on hard days.",
  "You make engagement feel safe.",
  "You’re the bridge between care and joy.",
  "You’re not failing, you’re adapting.",
  "You notice people. That’s rare.",
  "You’re building trust one activity at a time.",
  "Your empathy is a strength, not a liability.",
  "You’re not alone in this.",
  "You can reset and still succeed.",
  "You don’t have to earn rest.",
  "Progress counts even when it’s quiet.",
  "You’re allowed to be proud and tired.",
  "Your best looks different each day, and that’s okay.",
  "You can lead without carrying everything.",
  "You’re doing your job even when it’s unseen.",
  "You can’t pour from an empty cup, and that’s not a weakness.",
  "You’re not behind, you’re in motion.",
  "Your work is dignity in action.",
  "You bring hope with a clipboard.",
  "You are a difference-maker with a schedule.",
  "You’re allowed to say “I did enough today.”",
  "You’re not “extra” you’re essential.",
  "You make people feel like people.",
  "Your effort shows, even when nobody says it.",
  "Your leadership is louder than your title.",
  "You are doing important work with limited resources.",
  "You’re turning challenges into care.",
  "Your creativity is a tool, not a luxury.",
  "You’re building a culture, not just a calendar.",
  "Your kindness is professional, not accidental.",
  "You handle chaos with compassion.",
  "You’re the reason some residents still laugh.",
  "You’re making a facility feel like a community.",
  "You are allowed to be new at things and still be great.",
  "You’re doing brave work in small ways.",
  "Your attention is a gift.",
  "You’re planting good days.",
  "You don’t have to do it all to do it well.",
  "Your work has ripple effects.",
  "You’re building routine and joy at the same time.",
  "You’re more capable than the stress says you are.",
  "You’re allowed to ask for help.",
  "You’re allowed to have boundaries and still care deeply.",
  "Your “simple” activities aren’t simple to the people who need them.",
  "You’re not behind, you’re balancing.",
  "You bring meaning into the minutes.",
  "You are doing what matters.",
  "You’re leading with compassion and competence.",
  "You create connection on purpose.",
  "You’re doing work that can’t be automated.",
  "Your care shows in the details.",
  "You’re a safe person in a hard season for others.",
  "You’re doing the best you can with what you have.",
  "Your effort is enough for today.",
  "You’re allowed to start fresh at any time.",
  "You are not your unfinished to-do list.",
  "You’re making the day feel lighter for someone.",
  "You don’t need permission to be proud.",
  "You’re doing impact work, not background work.",
  "You’re building confidence in residents by modeling it yourself.",
  "You’re the heartbeat of the building.",
  "You are seen, even when you feel invisible.",
  "You make hard places softer.",
  "Your presence matters more than perfection.",
  "You are doing meaningful work in real time.",
  "You’re the reason someone feels included today.",
  "You’re exactly who your residents needed on this shift."
] as const;

type DailyBoostQuoteProps = {
  className?: string;
};

export function DailyBoostQuote({ className }: DailyBoostQuoteProps) {
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    const randomQuote = BOOST_QUOTES[Math.floor(Math.random() * BOOST_QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  return (
    <section aria-labelledby="daily-boost-title" className={cn("space-y-3", className)}>
      <div>
        <h2 id="daily-boost-title" className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground/85">
          Daily Boost
        </h2>
        <p className="mt-1 text-xs text-foreground/65">A quick reminder for Activity Directors.</p>
      </div>

      <GlassCard
        variant="dense"
        className={cn(
          "rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm dark:border-white/15 dark:bg-white/5",
          "transition-opacity duration-300",
          quote ? "opacity-100" : "opacity-95"
        )}
        tabIndex={0}
      >
        {quote ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-actifyBlue/15 text-actifyBlue"
              >
                <Quote className="h-3.5 w-3.5" />
              </span>
              <blockquote className={cn(playfair.className, "text-lg leading-relaxed text-foreground/95")}>
                “{quote}”
              </blockquote>
            </div>

            <div className="flex flex-wrap items-center gap-2 pl-10">
              <Badge variant="outline" className="border-white/60 bg-white/55 text-[11px] text-foreground/80 dark:bg-white/10">
                For Activity Directors
              </Badge>
              <span className="text-[11px] uppercase tracking-[0.08em] text-foreground/55">ACTIFY</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2" aria-live="polite" aria-label="Loading daily boost quote">
            <div className="h-4 w-40 rounded bg-white/60 dark:bg-white/10" />
            <div className="h-4 w-full rounded bg-white/55 dark:bg-white/10" />
            <div className="h-4 w-[88%] rounded bg-white/50 dark:bg-white/10" />
          </div>
        )}
      </GlassCard>
    </section>
  );
}
