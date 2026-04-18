"use client";

export function AssistantOrb() {
  return (
    <div className="assistant-orb-wrap relative h-20 w-20" aria-hidden>
      <span className="assistant-orb-halo absolute inset-[-16px] rounded-full" />
      <span className="assistant-orb absolute inset-0 rounded-full" />
      <span className="assistant-orb-core absolute inset-[22%] rounded-full" />
    </div>
  );
}

