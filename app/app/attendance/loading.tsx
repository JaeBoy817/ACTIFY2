import { AttendanceDarkSkeleton } from "@/components/attendance/v3/AttendanceDarkSkeleton";

export default function AttendanceLoading() {
  return (
    <div className="-mx-2 -mt-4 min-h-[calc(100vh-5.5rem)] bg-transparent px-2 pb-6 pt-4 md:-mx-3 md:px-3">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#040814] px-3 pb-6 pt-4 md:px-5">
        <div className="space-y-4">
          <AttendanceDarkSkeleton className="h-32 rounded-[1.7rem]" />
          <AttendanceDarkSkeleton className="h-32 rounded-2xl" />
          <AttendanceDarkSkeleton className="h-[620px] rounded-[1.7rem]" />
        </div>
      </section>
    </div>
  );
}
