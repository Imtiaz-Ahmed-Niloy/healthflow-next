"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { StateBlock, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Card, Pill, SectionTitle } from "@/components/admin/ui";
import { Field, Input } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import { useSession } from "@/lib/auth/useSession";
import { PERMISSIONS, type PharmacyProfile } from "@/lib/pharmacy";
import { supabase } from "@/lib/supabase/client";
import { useRoleLabel } from "@/i18n/useRoleLabel";
import { usePharmacyProfileQuery, useSavePharmacyProfileMutation } from "@/redux/api/pharmacy";

const Details = ({ profile }: { profile: PharmacyProfile }) => {
  const t = useTranslations("pharmacy.profile");
  const tc = useTranslations("pharmacy.common");
  const ts = useTranslations("pharmacy.staff");
  const tr = useTranslations("pharmacyNav.staffRoles");
  const describe = usePharmacyError();
  const roleLabel = useRoleLabel();
  const { formatDate } = useFormatters();
  const { refresh } = useSession();
  const [save, { isLoading }] = useSavePharmacyProfileMutation();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [changing, setChanging] = useState(false);

  const me = profile.pharmacy;
  const held = PERMISSIONS.filter(permission => me?.can[permission]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await save({ full_name: String(form.get("full_name") ?? ""), phone: String(form.get("phone") ?? "") || null }).unwrap();
      toast.success(t("saved"));
      // The name in the top bar comes from the session; read it again.
      refresh();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  // Straight to Supabase Auth from the browser: a new password is never sent to our own server.
  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== again) { toast.error(t("mismatch")); return; }
    if (password.length < 8) { toast.error(t("tooShort")); return; }
    setChanging(true);
    const { error } = await supabase.auth.updateUser({ password });
    setChanging(false);
    if (error) { toast.error(error.message); return; }
    setPassword(""); setAgain("");
    toast.success(t("passwordChanged"));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
      <Card className="p-5">
        <SectionTitle title={t("details")} />
        <form onSubmit={submit}>
          <Field label={tc("name")} required><Input name="full_name" defaultValue={profile.full_name ?? ""} required maxLength={200} /></Field>
          <Field label={tc("phone")}><Input name="phone" type="tel" defaultValue={profile.phone ?? ""} maxLength={40} /></Field>
          <Field label={tc("email")} hint={t("emailHint")}><Input value={profile.email ?? ""} readOnly disabled /></Field>
          <div className="flex justify-end">
            <Btn type="submit" disabled={isLoading}><UserRound className="h-4 w-4" /> {isLoading ? tc("saving") : tc("save")}</Btn>
          </div>
        </form>
      </Card>

      <div className="space-y-6">
        <Card className="p-5">
          <SectionTitle title={t("access")} />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{ts("role")}</dt>
              <dd className="font-semibold text-primary">{me?.staff_role ? tr(me.staff_role) : roleLabel(profile.role as Parameters<typeof roleLabel>[0])}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("since")}</dt><dd>{formatDate(profile.created_at)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{ts("pin")}</dt>
              <dd><Pill tone={me?.has_pin ? "ok" : undefined}>{me?.has_pin ? ts("pinSet") : ts("pinNone")}</Pill></dd></div>
          </dl>
          <p className="mt-4 mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary"><ShieldCheck className="h-4 w-4" /> {ts("permissions")}</p>
          {held.length === 0 ? (
            <p className="text-sm text-muted-foreground">{ts("sellOnly")}</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {held.map(permission => <li key={permission}><Pill tone="info">{ts(`perms.${permission}`)}</Pill></li>)}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">{t("accessHint")}</p>
        </Card>

        <Card className="p-5">
          <SectionTitle title={t("password")} />
          <form onSubmit={changePassword}>
            <Field label={t("newPassword")} required>
              <Input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </Field>
            <Field label={t("repeatPassword")} required>
              <Input type="password" autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)} required minLength={8} />
            </Field>
            <div className="flex justify-end">
              <Btn type="submit" variant="outline" disabled={changing}><KeyRound className="h-4 w-4" /> {changing ? tc("saving") : t("changePassword")}</Btn>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

const Page = () => {
  const t = useTranslations("pharmacy.profile");
  const { data, isLoading, error, refetch } = usePharmacyProfileQuery();

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")}>
      {data?.data
        ? <Details key={`${data.data.full_name}-${data.data.phone}`} profile={data.data} />
        : <StateBlock loading={isLoading} error={error} onRetry={refetch} rows={4} />}
    </PharmacyLayout>
  );
};

export default Page;
