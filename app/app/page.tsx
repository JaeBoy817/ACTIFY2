import { AssistantChat } from "@/components/assistant/AssistantChat";

export default function AppHomePage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-9.25rem)] w-full max-w-5xl flex-col">
      <AssistantChat />
    </section>
  );
}
