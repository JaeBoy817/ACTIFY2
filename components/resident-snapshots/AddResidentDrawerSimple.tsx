import { AddResidentDrawer } from "@/components/resident-snapshots/AddResidentDrawer";
import type { ResidentSnapshot, ResidentSnapshotFormValue } from "@/components/resident-snapshots/types";

export function AddResidentDrawerSimple(props: {
  open: boolean;
  mode: "create" | "edit";
  resident: ResidentSnapshot | null;
  onClose: () => void;
  onSave: (value: ResidentSnapshotFormValue) => Promise<void>;
  onSaveAndAskActify?: (value: ResidentSnapshotFormValue) => Promise<void>;
  isSaving: boolean;
}) {
  return <AddResidentDrawer {...props} />;
}
