import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  useFooterContent,
  type FooterContent,
  type FooterColumn,
  type FooterLink,
} from "@/data/footerContent";

const FooterEditor = () => {
  const { content, save, reset } = useFooterContent();
  const [draft, setDraft] = useState<FooterContent>(content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(content);
    setDirty(false);
  }, [content]);

  const update = (patch: Partial<FooterContent>) => {
    setDraft(d => ({ ...d, ...patch }));
    setDirty(true);
  };

  const updateColumn = (i: number, patch: Partial<FooterColumn>) => {
    setDraft(d => {
      const cols = [...d.columns];
      cols[i] = { ...cols[i], ...patch };
      return { ...d, columns: cols };
    });
    setDirty(true);
  };

  const updateLink = (ci: number, li: number, patch: Partial<FooterLink>) => {
    setDraft(d => {
      const cols = [...d.columns];
      const links = [...cols[ci].links];
      links[li] = { ...links[li], ...patch };
      cols[ci] = { ...cols[ci], links };
      return { ...d, columns: cols };
    });
    setDirty(true);
  };

  const addColumn = () => {
    setDraft(d => ({
      ...d,
      columns: [...d.columns, { title: "New Column", links: [] }],
    }));
    setDirty(true);
  };

  const removeColumn = (i: number) => {
    setDraft(d => ({ ...d, columns: d.columns.filter((_, idx) => idx !== i) }));
    setDirty(true);
  };

  const addLink = (ci: number) => {
    setDraft(d => {
      const cols = [...d.columns];
      cols[ci] = {
        ...cols[ci],
        links: [...cols[ci].links, { label: "New Link", to: "/" }],
      };
      return { ...d, columns: cols };
    });
    setDirty(true);
  };

  const removeLink = (ci: number, li: number) => {
    setDraft(d => {
      const cols = [...d.columns];
      cols[ci] = {
        ...cols[ci],
        links: cols[ci].links.filter((_, idx) => idx !== li),
      };
      return { ...d, columns: cols };
    });
    setDirty(true);
  };

  const onSave = () => {
    save(draft);
    setDirty(false);
    toast.success("Footer updated");
  };
  const onReset = () => {
    reset();
    toast.success("Restored defaults");
  };

  return (
    <Card className="p-5 mt-4">
      <SectionTitle
        title="Site Footer"
        action={
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={onReset}>
              <span className="inline-flex items-center gap-1">
                <RotateCcw className="h-4 w-4" /> Reset
              </span>
            </Btn>
            <Btn onClick={onSave} className={dirty ? "" : "opacity-60"}>
              <span className="inline-flex items-center gap-1">
                <Save className="h-4 w-4" /> Save
              </span>
            </Btn>
          </div>
        }
      />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Brand</Label>
          <Input value={draft.brand} onChange={e => update({ brand: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Rights / Copyright line</Label>
          <Input value={draft.rights} onChange={e => update({ rights: e.target.value })} />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Tagline</Label>
          <Textarea
            rows={2}
            value={draft.tagline}
            onChange={e => update({ tagline: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Newsletter title</Label>
          <Input
            value={draft.newsletterTitle}
            onChange={e => update({ newsletterTitle: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Newsletter placeholder</Label>
          <Input
            value={draft.newsletterPlaceholder}
            onChange={e => update({ newsletterPlaceholder: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-primary">Link Columns</h4>
          <Btn variant="ghost" onClick={addColumn}>
            <span className="inline-flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Column
            </span>
          </Btn>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {draft.columns.map((col, ci) => (
            <div key={ci} className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={col.title}
                  onChange={e => updateColumn(ci, { title: e.target.value })}
                  placeholder="Column title"
                />
                <Btn variant="ghost" onClick={() => removeColumn(ci)}>
                  <Trash2 className="h-4 w-4" />
                </Btn>
              </div>
              <div className="space-y-2">
                {col.links.map((lnk, li) => (
                  <div key={li} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      value={lnk.label}
                      onChange={e => updateLink(ci, li, { label: e.target.value })}
                      placeholder="Label"
                    />
                    <Input
                      className="flex-1"
                      value={lnk.to}
                      onChange={e => updateLink(ci, li, { to: e.target.value })}
                      placeholder="/path"
                    />
                    <Btn variant="ghost" onClick={() => removeLink(ci, li)}>
                      <Trash2 className="h-4 w-4" />
                    </Btn>
                  </div>
                ))}
                <Btn variant="ghost" onClick={() => addLink(ci)}>
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Add link
                  </span>
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-primary mb-2">Social Links</h4>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Twitter URL</Label>
            <Input
              value={draft.social.twitter}
              onChange={e => update({ social: { ...draft.social, twitter: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Facebook URL</Label>
            <Input
              value={draft.social.facebook}
              onChange={e => update({ social: { ...draft.social, facebook: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Instagram URL</Label>
            <Input
              value={draft.social.instagram}
              onChange={e => update({ social: { ...draft.social, instagram: e.target.value } })}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FooterEditor;
