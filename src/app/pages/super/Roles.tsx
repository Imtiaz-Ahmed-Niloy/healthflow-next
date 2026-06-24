'use client';
import { useEffect, useMemo, useState } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { PANELS, DEFAULT_ROLES, type RoleDef } from "@/data/rolePages";
import { load, save, uid } from "@/lib/storage";

const STORAGE_KEY = "super:roles";

const Roles = () => {
  const [roles, setRoles] = useState<RoleDef[]>(() => load(STORAGE_KEY, DEFAULT_ROLES));
  const [editing, setEditing] = useState<RoleDef | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => { save(STORAGE_KEY, roles); }, [roles]);

  const upsert = (r: RoleDef) => {
    setRoles(prev => prev.some(x => x.id === r.id) ? prev.map(x => x.id === r.id ? r : x) : [...prev, r]);
    toast.success(`${r.name} saved`);
    setEditing(null);
  };
  const remove = (id: string) => {
    setRoles(prev => prev.filter(r => r.id !== id));
    toast.success("Role removed");
  };
  const newRole = (): RoleDef => ({ id: uid(), name: "New Role", scope: "Tenant", users: 0, pages: [] });

  const filtered = useMemo(
    () => roles.filter(r => r.name.toLowerCase().includes(query.toLowerCase())),
    [roles, query]
  );

  return (
    <SuperLayout title="User Role Management" subtitle="Assign panel pages to each role">
      <Card className="p-5">
        <SectionTitle
          title="Roles & Permissions"
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search roles" className="pl-9 w-56" />
              </div>
              <Btn onClick={() => setEditing(newRole())}><Plus className="h-4 w-4" /> New Role</Btn>
            </div>
          }
        />
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(r => (
            <div key={r.id} className="rounded-xl bg-muted/40 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-primary truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.users.toLocaleString()} users · {r.pages.length} pages
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Pill tone="info">{r.scope}</Pill>
                <Btn variant="ghost" onClick={() => setEditing({ ...r })}>
                  <Pencil className="h-4 w-4" /> Configure
                </Btn>
                <button
                  onClick={() => remove(r.id)}
                  className="p-2 rounded-full text-destructive hover:bg-destructive/10"
                  title="Delete role"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {editing && (
        <RoleEditor
          role={editing}
          onClose={() => setEditing(null)}
          onSave={upsert}
        />
      )}
    </SuperLayout>
  );
};

const RoleEditor = ({ role, onClose, onSave }: { role: RoleDef; onClose: () => void; onSave: (r: RoleDef) => void }) => {
  const [draft, setDraft] = useState<RoleDef>(role);
  const toggle = (path: string) =>
    setDraft(d => ({
      ...d,
      pages: d.pages.includes(path) ? d.pages.filter(p => p !== path) : [...d.pages, path],
    }));
  const togglePanel = (panelKey: string, on: boolean) => {
    const panelPaths = PANELS.find(p => p.key === panelKey)!.pages.map(p => p.path);
    setDraft(d => ({
      ...d,
      pages: on
        ? Array.from(new Set([...d.pages, ...panelPaths]))
        : d.pages.filter(p => !panelPaths.includes(p)),
    }));
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Configure Role
          </DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-3 gap-4 mt-2">
          <div>
            <Label>Role name</Label>
            <Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <Label>Scope</Label>
            <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v as RoleDef["scope"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Platform","Tenant","Clinical","Self"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Users</Label>
            <Input type="number" value={draft.users} onChange={e => setDraft({ ...draft, users: Number(e.target.value) || 0 })} />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-[11px] tracking-widest font-bold text-muted-foreground">PAGE ACCESS BY PANEL</p>
          {PANELS.map(panel => {
            const selectedCount = panel.pages.filter(p => draft.pages.includes(p.path)).length;
            const allOn = selectedCount === panel.pages.length;
            return (
              <div key={panel.key} className="rounded-xl border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between p-3 border-b border-border/60">
                  <div>
                    <p className="font-semibold text-primary">{panel.label}</p>
                    <p className="text-xs text-muted-foreground">{selectedCount} / {panel.pages.length} pages enabled</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <Checkbox checked={allOn} onCheckedChange={(v) => togglePanel(panel.key, !!v)} />
                    Select all
                  </label>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                  {panel.pages.map(page => {
                    const on = draft.pages.includes(page.path);
                    return (
                      <label key={page.path} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition ${on ? "bg-primary/10 text-primary" : "bg-card hover:bg-muted/50"}`}>
                        <Checkbox checked={on} onCheckedChange={() => toggle(page.path)} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{page.label}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{page.path}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-4">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave(draft)}>Save Role</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Roles;

