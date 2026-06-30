import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Modal } from "./crud";
import { adminNav } from "./AdminLayout";
import { superNav } from "@/components/super/SuperLayout";

export const CommandPalette = ({ open, onClose, scope }: { open: boolean; onClose: () => void; scope: "admin" | "super" }) => {
  const [q, setQ] = useState("");
  const router = useRouter();
  const items = (scope === "admin" ? adminNav : superNav).filter(i => i.label.toLowerCase().includes(q.toLowerCase()));
  const handleClose = () => {
    setQ("");
    onClose();
  };
  return (
    <Modal open={open} onClose={handleClose} title="Quick navigate" size="md">
      <div className="flex items-center gap-2 bg-muted/40 rounded-full px-4 py-2 mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} className="bg-transparent outline-none text-sm flex-1" placeholder="Jump to…" />
      </div>
      <ul className="space-y-1 max-h-80 overflow-y-auto">
        {items.map(i => (
          <li key={`${i.to}-${i.label}`}>
            <button onClick={() => { setQ(""); router.push(i.to); onClose(); }}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-sm font-semibold text-primary">
              <i.icon className="h-4 w-4" /> {i.label}
              <span className="ml-auto text-[10px] text-muted-foreground font-mono">{i.to}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
};
