"use client";

type AssistantGreetingProps = {
  name: string | null;
};

function getGreetingPeriod() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export function AssistantGreeting({ name }: AssistantGreetingProps) {
  const period = getGreetingPeriod();
  const salutation = name ? `Good ${period}, ${name}` : `Good ${period}`;

  return (
    <div className="space-y-1 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{salutation}</h1>
      <p className="text-[1.42rem] font-medium leading-tight text-slate-800 sm:text-[1.7rem]">
        What can Actify help you plan{" "}
        <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent">today?</span>
      </p>
    </div>
  );
}

