import { LoadingSkeleton } from "@/components/assistant-dashboard/LoadingSkeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <LoadingSkeleton className="h-4 w-40" />
        <LoadingSkeleton className="h-8 w-72" />
        <LoadingSkeleton className="h-4 w-[28rem] max-w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(260px,1fr)_minmax(560px,1.55fr)_minmax(260px,1fr)] xl:grid-rows-[auto_auto]">
        <LoadingSkeleton className="order-1 h-[36rem] rounded-[2rem] xl:col-start-2 xl:row-span-2" />
        <LoadingSkeleton className="order-2 h-[31rem] rounded-[2rem] xl:col-start-1 xl:row-start-1" />
        <LoadingSkeleton className="order-3 h-[31rem] rounded-[2rem] xl:col-start-3 xl:row-start-1" />
        <LoadingSkeleton className="order-4 h-[30rem] rounded-[2rem] xl:col-start-1 xl:row-start-2" />
        <LoadingSkeleton className="order-5 h-[30rem] rounded-[2rem] xl:col-start-3 xl:row-start-2" />
      </div>
    </div>
  );
}
