'use client';
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { Modal, Field, Input, Select, exportCSV } from "@/components/admin/crud";
import { toast } from "sonner";
import { useNotifications } from "@/components/admin/NotificationProvider";

type Row = Record<string, string>;
const presets = {
  Patients: { headers: ["MRN", "Name", "Visits"], rows: [["MRN-10234", "Aisha B.", "12"], ["MRN-10235", "John D.", "5"], ["MRN-10236", "Maria K.", "8"]] },
  Revenue:  { headers: ["Period", "Gross", "Net"], rows: [["Jan", "184000", "152000"], ["Feb", "201000", "168000"], ["Mar", "224000", "188000"]] },
  Lab:      { headers: ["Test", "Volume", "Avg TAT"], rows: [["CBC", "412", "1.4h"], ["Lipid", "201", "2.8h"], ["MRI", "44", "26h"]] },
  Pharmacy: { headers: ["SKU", "Sold", "Revenue"], rows: [["MED-0001", "1240", "$3720"], ["MED-0002", "318", "$2862"]] },
};

const Reports = () => {
  const { push } = useNotifications();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<keyof typeof presets | null>(null);

  const handleBuild = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setActive(fd.get("type") as keyof typeof presets);
    setOpen(false);
    push({ title: `${fd.get("type")} report generated`, tone: "ok" });
  };
  const data = active ? presets[active] : null;

  return (
    <AdminLayout title="Reports Management" subtitle="Operational, clinical & financial">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.keys(presets).map(k => (
          <button key={k} onClick={() => { setActive(k as never); toast.info(`${k} loaded`); }}
            className="rounded-2xl bg-card border border-border/60 p-5 text-left shadow-soft hover:shadow-card transition">
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">REPORT</p>
            <p className="font-display text-xl text-primary mt-1">{k}</p>
            <p className="text-xs text-muted-foreground mt-2">Click to preview</p>
          </button>
        ))}
      </div>

      <Card className="p-5">
        <SectionTitle title="Report Builder" action={<Btn onClick={() => setOpen(true)}>+ New Report</Btn>} />
        {!data && <p className="text-sm text-muted-foreground">Select a tile above or build a new report.</p>}
        {data && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-primary">{active}</p>
              <Btn variant="outline" onClick={() => exportCSV(data.rows.map(r => Object.fromEntries(data.headers.map((h, i) => [h, r[i]]))) as Row[], `${active}.csv`)}>Export CSV</Btn>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] tracking-widest text-muted-foreground"><tr>{data.headers.map(h => <th key={h} className="py-2">{h}</th>)}</tr></thead>
              <tbody>{data.rows.map((r, i) => <tr key={i} className="border-t border-border/40">{r.map((c, j) => <td key={j} className="py-2">{c}</td>)}</tr>)}</tbody>
            </table>
          </>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Build report"
        footer={<><Btn variant="outline" onClick={() => setOpen(false)}>Cancel</Btn>
          <button form="rb-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Generate</button></>}>
        <form id="rb-form" onSubmit={handleBuild}>
          <Field label="Type"><Select name="type">{Object.keys(presets).map(k => <option key={k}>{k}</option>)}</Select></Field>
          <Field label="From"><Input name="from" type="date" /></Field>
          <Field label="To"><Input name="to" type="date" /></Field>
        </form>
      </Modal>
    </AdminLayout>
  );
};
export default Reports;
