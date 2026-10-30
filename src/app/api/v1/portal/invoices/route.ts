import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import { myDoctorRows } from "@/server/portal/myDoctors";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/**
 * GET /api/v1/portal/invoices[?appointment=<id>]
 *
 * With `appointment`, only that visit's bill — at most one (0075's
 * one-visit-one-bill index): the auto-raised CON- bill, or the OPD invoice
 * that replaced it (0144). A submitted prescription asks this to decide
 * whether its button opens an invoice or creates one.
 */
export const GET = async (request: Request) => {
  const appointmentId = new URL(request.url).searchParams.get("appointment");
  if (appointmentId && !z.string().uuid().safeParse(appointmentId).success) {
    return fail("Invalid appointment id", 422);
  }

  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only doctors can access their OPD invoices", 403);

  const supabase = await createServerSupabase();

  let doctorProfiles;
  try {
    doctorProfiles = await myDoctorRows(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load doctor profile", 500);
  }

  if (!doctorProfiles.length) {
    return fail("No doctor profiles found for this account", 404);
  }

  const doctorIds = doctorProfiles.map((d) => d.id);
  const tenantIds = Array.from(new Set(doctorProfiles.map((d) => d.tenant_id)));

  // Fetch consultation fees and tenant details
  const { data: doctorsData } = await supabase
    .from("doctors")
    .select("id, name, tenant_id, consultation_fee")
    .in("id", doctorIds);

  const { data: tenantsData } = await supabase
    .from("tenants")
    .select("id, name, kind, contact_phone, address")
    .in("id", tenantIds);

  const tenantMap = new Map<string, any>();
  (tenantsData ?? []).forEach((t) => tenantMap.set(t.id, t));

  const workplaces = doctorProfiles.map((p) => {
    const docRow = (doctorsData ?? []).find((d) => d.id === p.id);
    const tenantRow = tenantMap.get(p.tenant_id);
    return {
      id: p.tenant_id,
      doctor_id: p.id,
      name: p.hospital_name,
      kind: tenantRow?.kind || "hospital",
      phone: tenantRow?.contact_phone || null,
      address: tenantRow?.address || null,
      consultation_fee: Number(docRow?.consultation_fee || 500),
    };
  });

  // Fetch invoices for these tenants (OPD invoices & consultation receivables)
  let invoiceQuery = supabase
    .from("finance_invoices")
    .select(`
      id,
      tenant_id,
      reference,
      party,
      kind,
      amount,
      due_date,
      paid_at,
      patient_id,
      appointment_id,
      description,
      line_items,
      created_at,
      patients (
        id,
        full_name,
        mrn,
        phone,
        gender,
        date_of_birth
      )
    `)
    .in("tenant_id", tenantIds)
    .eq("kind", "receivable");
  if (appointmentId) invoiceQuery = invoiceQuery.eq("appointment_id", appointmentId);

  const { data: invoices, error: invError } = await invoiceQuery
    .order("created_at", { ascending: false })
    .limit(150);

  if (invError) {
    return fail(invError.message, 500);
  }

  const rows = invoices ?? [];

  let totalBilled = 0;
  let totalCollected = 0;
  let totalDue = 0;

  const formattedInvoices = rows.map((inv: any) => {
    const amt = Number(inv.amount || 0);
    const isPaid = Boolean(inv.paid_at);
    const tenantInfo = tenantMap.get(inv.tenant_id);

    totalBilled += amt;
    if (isPaid) {
      totalCollected += amt;
    } else {
      totalDue += amt;
    }

    return {
      id: inv.id,
      reference: inv.reference,
      party: inv.party,
      amount: amt,
      due_date: inv.due_date,
      paid_at: inv.paid_at,
      is_paid: isPaid,
      created_at: inv.created_at,
      patient_id: inv.patient_id,
      appointment_id: inv.appointment_id,
      description: inv.description,
      line_items: Array.isArray(inv.line_items) ? inv.line_items : [],
      tenant_id: inv.tenant_id,
      facility_name: tenantInfo?.name || "Facility",
      facility_kind: tenantInfo?.kind || "hospital",
      patient: inv.patients || null,
    };
  });

  return json({
    data: {
      invoices: formattedInvoices,
      summary: {
        total_billed: totalBilled,
        total_collected: totalCollected,
        total_due: totalDue,
        count: formattedInvoices.length,
      },
      workplaces,
    },
  });
};

const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
});

const createInvoiceSchema = z.object({
  tenant_id: z.string().uuid("Workplace facility is required"),
  patient_id: z.string().uuid().optional().nullable(),
  party: z.string().trim().min(1, "Patient name is required"),
  amount: z.coerce.number().min(0, "Invoice amount cannot be negative"),
  description: z.string().trim().optional().nullable(),
  line_items: z.array(lineItemSchema).default([]),
  paid: z.boolean().default(false),
  payment_method: z.string().optional().default("cash"),
  appointment_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only doctors can create OPD invoices", 403);

  const body = await request.json().catch(() => null);
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid invoice details", 422);
  }

  const {
    tenant_id,
    patient_id,
    party,
    amount,
    description,
    line_items,
    paid,
    payment_method,
    appointment_id,
    due_date,
  } = parsed.data;

  const supabase = await createServerSupabase();

  // Verify that the doctor actually works at this facility
  const doctorProfiles = await myDoctorRows(supabase, auth.userId);
  const doctorHere = doctorProfiles.find((p) => p.tenant_id === tenant_id);
  if (!doctorHere) {
    return fail("You are not authorized to issue invoices for this facility", 403);
  }

  // Construct descriptive summary
  const items =
    description?.trim() ||
    (line_items.length > 0
      ? line_items.map((li) => `${li.description} (x${li.quantity})`).join(", ")
      : `OPD Service for ${party}`);
  // The patient reads this on their billing page with no other context, so it
  // says who and where — as a CON- bill's "Consultation with Dr. … on …" does.
  const summaryText = `${items} · ${doctorHere.name}, ${doctorHere.hospital_name}`;

  // Create invoice via the security-definer function
  const { data: invoiceData, error: rpcError } = await (supabase as any).rpc("create_opd_invoice", {
    p_tenant_id: tenant_id,
    p_patient_id: patient_id ?? undefined,
    p_party: party,
    p_amount: amount,
    p_description: summaryText,
    p_line_items: line_items,
    p_paid: paid,
    p_appointment_id: appointment_id ?? undefined,
    // Null, not the server's UTC date: the function takes it as the
    // platform's today (0145), which before 06:00 in Dhaka is a day later.
    p_due_date: due_date || null,
  });

  if (rpcError) {
    // P0001: the function refused it (already invoiced, already paid, wrong
    // facility's patient or visit) — the message says which.
    return fail(rpcError.message, rpcError.code === "42501" ? 403 : rpcError.code === "P0001" ? 409 : 500);
  }

  return json({ data: invoiceData }, 201);
};

export const PATCH = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only doctors can manage OPD invoices", 403);

  const body = (await request.json().catch(() => null)) as { invoice_id?: string; paid?: boolean } | null;
  if (!body?.invoice_id) return fail("Invoice ID is required", 422);

  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("finance_invoices")
    .update({
      paid_at: body.paid !== false ? new Date().toISOString() : null,
    })
    .eq("id", body.invoice_id);

  if (error) {
    return fail(error.message, 500);
  }

  return json({ data: { success: true } });
};
