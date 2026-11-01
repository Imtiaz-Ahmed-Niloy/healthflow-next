"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, Chips, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { useFormatters } from "@/lib/appSettings";
import {
  Heart, Droplet, UserPlus, CheckCircle2, AlertTriangle,
  Calendar, Plus, Phone, Clock, Archive,
} from "lucide-react";

type BloodInventory = {
  id: string;
  bag_number: string;
  blood_group: string;
  component: string;
  donor_id?: string | null;
  collected_date: string;
  expiry_date: string;
  volume_ml: number;
  status: "available" | "reserved" | "transfused" | "discarded" | "expired";
  storage_location: string;
};

type BloodDonor = {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  last_donation_date?: string | null;
  eligible: boolean;
  notes?: string | null;
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export default function BloodBank() {
  const { formatDate } = useFormatters();
  const { push } = useNotifications();

  const inventoryCrud = useResourceCrud<BloodInventory>("blood-inventory");
  const donorCrud = useResourceCrud<BloodDonor>("blood-donors");

  const [tab, setTab] = useState<"inventory" | "donors">("inventory");
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");

  const [addBag, setAddBag] = useState(false);
  const [addDonor, setAddDonor] = useState(false);

  // Form draft for bag
  const [bagNumber, setBagNumber] = useState("");
  const [bagGroup, setBagGroup] = useState("A+");
  const [component, setComponent] = useState("whole_blood");
  const [collectedDate, setCollectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [volume, setVolume] = useState("450");
  const [storage, setStorage] = useState("Blood Bank Refrigerator 1");

  // Form draft for donor
  const [donorName, setDonorName] = useState("");
  const [donorGroup, setDonorGroup] = useState("O+");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorAge, setDonorAge] = useState("28");
  const [donorGender, setDonorGender] = useState("male");

  const bags = inventoryCrud.items;
  const donors = donorCrud.items;

  // Compute counts per group
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    BLOOD_GROUPS.forEach((g) => (counts[g] = 0));
    bags.forEach((b) => {
      if (b.status === "available" && counts[b.blood_group] !== undefined) {
        counts[b.blood_group]++;
      }
    });
    return counts;
  }, [bags]);

  const availableBags = bags.filter((b) => b.status === "available").length;

  const filteredBags = useMemo(() => {
    return bags.filter((b) => {
      if (groupFilter !== "all" && b.blood_group !== groupFilter) return false;
      if (!q) return true;
      const term = q.toLowerCase();
      return b.bag_number.toLowerCase().includes(term) || b.blood_group.toLowerCase().includes(term);
    });
  }, [bags, groupFilter, q]);

  const filteredDonors = useMemo(() => {
    if (!q) return donors;
    const term = q.toLowerCase();
    return donors.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.phone.toLowerCase().includes(term) ||
        d.blood_group.toLowerCase().includes(term)
    );
  }, [donors, q]);

  const handleCreateBag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bagNumber) return;

    const ok = await inventoryCrud.create({
      bag_number: bagNumber.trim().toUpperCase(),
      blood_group: bagGroup,
      component,
      collected_date: collectedDate,
      expiry_date: expiryDate,
      volume_ml: Number(volume || 450),
      status: "available",
      storage_location: storage,
    } as any);

    if (ok) {
      push({ title: `Blood Bag ${bagNumber} Stored in Inventory`, tone: "ok" });
      setAddBag(false);
      setBagNumber("");
    }
  };

  const handleCreateDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName || !donorPhone) return;

    const ok = await donorCrud.create({
      name: donorName.trim(),
      blood_group: donorGroup,
      phone: donorPhone.trim(),
      age: Number(donorAge || 25),
      gender: donorGender,
      eligible: true,
      last_donation_date: new Date().toISOString().slice(0, 10),
    } as any);

    if (ok) {
      push({ title: `Donor ${donorName} Registered`, tone: "ok" });
      setAddDonor(false);
      setDonorName("");
      setDonorPhone("");
    }
  };

  const handleBagStatus = async (id: string, newStatus: BloodInventory["status"]) => {
    await inventoryCrud.update(id, { status: newStatus } as any);
    push({ title: `Blood unit marked as ${newStatus}`, tone: "info" });
  };

  const bagCols: Column<BloodInventory>[] = [
    {
      key: "bag_number",
      label: "Bag Number",
      sortable: true,
      accessor: (r) => r.bag_number,
      render: (r) => <span className="font-mono text-xs font-bold text-primary">{r.bag_number}</span>,
    },
    {
      key: "blood_group",
      label: "Group",
      sortable: true,
      accessor: (r) => r.blood_group,
      render: (r) => (
        <span className="font-bold text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
          {r.blood_group}
        </span>
      ),
    },
    {
      key: "component",
      label: "Component",
      render: (r) => <span className="capitalize text-xs font-medium text-foreground">{r.component.replace(/_/g, " ")}</span>,
    },
    {
      key: "volume_ml",
      label: "Volume",
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.volume_ml} mL</span>,
    },
    {
      key: "expiry_date",
      label: "Expires",
      sortable: true,
      accessor: (r) => r.expiry_date,
      render: (r) => {
        const isExpiringSoon = new Date(r.expiry_date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
        return (
          <span className={`text-xs font-mono font-medium ${isExpiringSoon ? "text-rose-600 font-bold" : "text-muted-foreground"}`}>
            {formatDate(r.expiry_date)}
          </span>
        );
      },
    },
    {
      key: "storage_location",
      label: "Storage",
      render: (r) => <span className="text-xs text-muted-foreground">{r.storage_location}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Pill tone={r.status === "available" ? "ok" : r.status === "reserved" ? "warn" : "default"}>
          {r.status}
        </Pill>
      ),
    },
  ];

  const donorCols: Column<BloodDonor>[] = [
    {
      key: "name",
      label: "Donor Name",
      sortable: true,
      accessor: (r) => r.name,
      render: (r) => <span className="font-bold text-xs text-foreground">{r.name}</span>,
    },
    {
      key: "blood_group",
      label: "Blood Group",
      render: (r) => (
        <span className="font-bold text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
          {r.blood_group}
        </span>
      ),
    },
    {
      key: "phone",
      label: "Phone Contact",
      render: (r) => <span className="font-mono text-xs text-primary">{r.phone}</span>,
    },
    {
      key: "age",
      label: "Age / Gender",
      render: (r) => <span className="text-xs text-muted-foreground">{r.age ? `${r.age} yrs` : "—"} • {r.gender || ""}</span>,
    },
    {
      key: "last_donation_date",
      label: "Last Donated",
      render: (r) => <span className="text-xs font-mono text-muted-foreground">{r.last_donation_date ? formatDate(r.last_donation_date) : "First time"}</span>,
    },
    {
      key: "eligible",
      label: "Eligibility",
      render: (r) => <Pill tone={r.eligible ? "ok" : "bad"}>{r.eligible ? "Eligible" : "Deferred"}</Pill>,
    },
  ];

  return (
    <AdminLayout title="Blood Bank Management" subtitle="Donor Registry, Testing & Transfusion Inventory">
      <div className="space-y-6">
        {/* Blood Groups Live Gauge */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {BLOOD_GROUPS.map((group) => {
            const count = groupCounts[group] || 0;
            return (
              <div
                key={group}
                onClick={() => setGroupFilter(groupFilter === group ? "all" : group)}
                className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                  groupFilter === group
                    ? "bg-red-600 text-white border-red-700 shadow-md scale-105"
                    : "bg-card border-border/70 hover:border-red-300"
                }`}
              >
                <div className="flex items-center justify-center gap-1 font-bold text-base">
                  <Droplet className={`w-4 h-4 ${groupFilter === group ? "text-white" : "text-red-600"}`} />
                  <span>{group}</span>
                </div>
                <p className={`text-xl font-bold font-mono mt-1 ${groupFilter === group ? "text-white" : "text-foreground"}`}>
                  {count}
                </p>
                <span className={`text-[10px] ${groupFilter === group ? "text-red-100" : "text-muted-foreground"}`}>
                  Bags Ready
                </span>
              </div>
            );
          })}
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-border/70 pb-1">
          <button
            type="button"
            onClick={() => setTab("inventory")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              tab === "inventory" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Blood Inventory ({bags.length} Units)
          </button>
          <button
            type="button"
            onClick={() => setTab("donors")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              tab === "donors" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Registered Donors ({donors.length})
          </button>
        </div>

        {tab === "inventory" && (
          <Card className="p-5">
            <Toolbar
              search={q}
              onSearch={setQ}
              onAdd={() => setAddBag(true)}
              addLabel="Add Blood Unit"
              onExport={() => exportCSV(filteredBags as never, "blood-inventory.csv")}
            />

            <DataTable<BloodInventory>
              rows={filteredBags}
              columns={bagCols}
              empty="No blood units in stock for this filter."
              actions={(r) => (
                <RowActions
                  extra={
                    r.status === "available" ? (
                      <Btn variant="primary" onClick={() => handleBagStatus(r.id, "transfused")} className="text-xs py-1 px-2.5">
                        Issue Unit
                      </Btn>
                    ) : null
                  }
                />
              )}
            />
          </Card>
        )}

        {tab === "donors" && (
          <Card className="p-5">
            <Toolbar
              search={q}
              onSearch={setQ}
              onAdd={() => setAddDonor(true)}
              addLabel="Register Donor"
              onExport={() => exportCSV(filteredDonors as never, "blood-donors.csv")}
            />

            <DataTable<BloodDonor>
              rows={filteredDonors}
              columns={donorCols}
              empty="No blood donors registered yet."
            />
          </Card>
        )}

        {/* Add Bag Modal */}
        <Modal open={addBag} onClose={() => setAddBag(false)} title="Add Blood Bag to Inventory" size="md">
          <form onSubmit={handleCreateBag} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Bag Number / Barcode *</label>
              <input
                type="text"
                value={bagNumber}
                onChange={(e) => setBagNumber(e.target.value)}
                placeholder="e.g. BB-2026-A104"
                className="w-full bg-card border border-border/70 rounded-lg p-2 font-mono uppercase"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Blood Group *</label>
                <select
                  value={bagGroup}
                  onChange={(e) => setBagGroup(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2 font-bold text-red-700"
                >
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Component</label>
                <select
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2"
                >
                  <option value="whole_blood">Whole Blood</option>
                  <option value="rbc">Packed Red Blood Cells (PRBC)</option>
                  <option value="platelets">Platelet Concentrate</option>
                  <option value="plasma">Fresh Frozen Plasma (FFP)</option>
                  <option value="cryoprecipitate">Cryoprecipitate</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Collection Date</label>
                <input
                  type="date"
                  value={collectedDate}
                  onChange={(e) => setCollectedDate(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2 font-bold text-rose-600"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Volume (mL)</label>
                <input
                  type="number"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Storage Location</label>
                <input
                  type="text"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex justify-end gap-2">
              <Btn type="button" variant="outline" onClick={() => setAddBag(false)} className="text-xs">
                Cancel
              </Btn>
              <Btn type="submit" variant="primary" className="text-xs">
                Save Blood Unit
              </Btn>
            </div>
          </form>
        </Modal>

        {/* Add Donor Modal */}
        <Modal open={addDonor} onClose={() => setAddDonor(false)} title="Register Blood Donor" size="md">
          <form onSubmit={handleCreateDonor} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Donor Name *</label>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-card border border-border/70 rounded-lg p-2 font-medium"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Blood Group *</label>
                <select
                  value={donorGroup}
                  onChange={(e) => setDonorGroup(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2 font-bold text-red-700"
                >
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={donorPhone}
                  onChange={(e) => setDonorPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-card border border-border/70 rounded-lg p-2 font-mono"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Age</label>
                <input
                  type="number"
                  value={donorAge}
                  onChange={(e) => setDonorAge(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Gender</label>
                <select
                  value={donorGender}
                  onChange={(e) => setDonorGender(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex justify-end gap-2">
              <Btn type="button" variant="outline" onClick={() => setAddDonor(false)} className="text-xs">
                Cancel
              </Btn>
              <Btn type="submit" variant="primary" className="text-xs">
                Register Donor
              </Btn>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
