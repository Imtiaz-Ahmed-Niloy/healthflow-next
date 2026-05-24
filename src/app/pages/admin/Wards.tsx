'use client';
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { useCrud, Modal, Field, Input, Select, Chips, statusTone, ConfirmDialog } from "@/components/admin/crud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { Bed } from "lucide-react";

type BedRow = { id: string; ward: string; number: string; type: string; patient: string; status: string };
const seed: BedRow[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `w1-${i}`, ward: "Ward 3B", number: `301-${i + 1}`, type: "General", patient: i % 3 === 0 ? "Aisha B." : i % 3 === 1 ? "" : "John D.", status: i % 3 === 0 ? "Occupied" : i % 3 === 1 ? "Available" : "Occupied" })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `icu-${i}`, ward: "ICU", number: `ICU-${i + 1}`, type: "ICU", patient: i % 2 === 0 ? "Robert L." : "", status: i % 2 === 0 ? "Occupied" : "Available" })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `mat-${i}`, ward: "Maternity", number: `MAT-${i + 1}`, type: "Cabin", patient: "", status: "Cleaning" })),
];

const Wards = () => {
  const crud = useCrud<BedRow>("beds", seed);
  const { push } = useNotifications();
  const [filter, setFilter] = useState<"all" | "Occupied" | "Available" | "Cleaning">("all");
  const [edit, setEdit] = useState<BedRow | null>(null);
  const [add, setAdd] = useState(false);
  const [del, setDel] = useState<string | null>(null);

  const wards = Array.from(new Set(crud.items.map(b => b.ward)));
  const list = filter === "all" ? crud.items : crud.items.filter(b => b.status === filter);
  const occupied = crud.items.filter(b => b.status === "Occupied").length;
  const available = crud.items.filter(b => b.status === "Available").length;

  return (
    <AdminLayout title="Ward / Bed / Cabin Management" subtitle="Live bed status with admit/discharge workflows">
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4"><p className="text-[10px] tracking-widest font-bold text-muted-foreground">TOTAL BEDS</p><p className="font-display text-2xl text-primary mt-1">{crud.items.length}</p></Card>
        <Card className="p-4"><p className="text-[10px] tracking-widest font-bold text-muted-foreground">OCCUPIED</p><p className="font-display text-2xl text-destructive mt-1">{occupied}</p></Card>
        <Card className="p-4"><p className="text-[10px] tracking-widest font-bold text-muted-foreground">AVAILABLE</p><p className="font-display text-2xl text-primary-glow mt-1">{available}</p></Card>
      </div>

      <Card className="p-5 mb-6">
        <SectionTitle title="Floor Map" action={<div className="flex items-center gap-2">
          <Chips value={filter} onChange={(v) => setFilter(v as never)} options={[{ value: "all", label: "All" }, { value: "Available", label: "Available" }, { value: "Occupied", label: "Occupied" }, { value: "Cleaning", label: "Cleaning" }]} />
          <Btn onClick={() => setAdd(true)}>+ Add Bed</Btn>
        </div>} />
        {wards.map(w => (
          <div key={w} className="mb-5">
            <p className="text-sm font-semibold text-primary mb-2">{w}</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
              {list.filter(b => b.ward === w).map(b => (
                <button key={b.id} onClick={() => setEdit(b)}
                  className={`aspect-square rounded-xl border-2 grid place-items-center text-[10px] font-bold p-1
                    ${b.status === "Occupied" ? "bg-destructive/10 border-destructive/40 text-destructive" :
                      b.status === "Available" ? "bg-accent/30 border-accent text-accent-foreground" :
                      "bg-yellow-100 border-yellow-300 text-yellow-800"}`}>
                  <Bed className="h-4 w-4" />
                  <span className="mt-0.5">{b.number}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </Card>

      <Modal open={!!edit || add} onClose={() => { setEdit(null); setAdd(false); }}
        title={edit ? `Bed ${edit.number}` : "Add bed"}
        footer={<>
          {edit && <button onClick={() => { setDel(edit.id); }} className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive">Delete</button>}
          <Btn variant="outline" onClick={() => { setEdit(null); setAdd(false); }}>Cancel</Btn>
          <Btn onClick={() => {}} className="hidden">.</Btn>
          <button form="bed-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button>
        </>}>
        <form id="bed-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const data = { ward: String(fd.get("ward")), number: String(fd.get("number")), type: String(fd.get("type")), patient: String(fd.get("patient")), status: String(fd.get("status")) };
          if (edit) {
            crud.update(edit.id, data);
            if (data.status === "Occupied" && edit.status !== "Occupied") push({ title: `Patient admitted to ${data.ward} bed ${data.number}`, tone: "info" });
            if (data.status === "Available" && edit.status === "Occupied") push({ title: `Discharge from ${data.ward} bed ${data.number}`, tone: "ok" });
          } else crud.create(data);
          setEdit(null); setAdd(false);
        }}>
          <Field label="Ward"><Select name="ward" defaultValue={edit?.ward}>{wards.concat(["ICU", "Ward 3B", "Maternity"]).filter((v, i, a) => a.indexOf(v) === i).map(w => <option key={w}>{w}</option>)}</Select></Field>
          <Field label="Bed Number"><Input name="number" defaultValue={edit?.number} required /></Field>
          <Field label="Type"><Select name="type" defaultValue={edit?.type}><option>General</option><option>ICU</option><option>Cabin</option></Select></Field>
          <Field label="Patient (if occupied)"><Input name="patient" defaultValue={edit?.patient} /></Field>
          <Field label="Status"><Select name="status" defaultValue={edit?.status}><option>Available</option><option>Occupied</option><option>Cleaning</option></Select></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) crud.remove(del); setEdit(null); }} />
    </AdminLayout>
  );
};
export default Wards;
