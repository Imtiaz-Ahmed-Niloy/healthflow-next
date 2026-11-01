import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const requireHospitalStaff = async () => {
  const auth = await getAuthContext();
  if (!auth) return { error: fail("Not signed in", 401) } as const;
  const allowed = ["super_admin", "hospital_admin", "finance_admin", "doctor"];
  if (!auth.role || !allowed.includes(auth.role)) {
    return { error: fail("You do not have permission to manage OPD invoices", 403) } as const;
  }
  const tenantId = auth.tenantId;
  if (!tenantId) {
    return { error: fail("Your account is not attached to a hospital", 409) } as const;
  }
  return { auth, tenantId } as const;
};

export const GET = async (_request: Request) => {
  const guard = await requireHospitalStaff();
  if ("error" in guard) return guard.error;

  const supabase = await createServerSupabase();
  const tenantId = guard.tenantId;

  // 1. Fetch Hospital Info
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, kind, contact_phone, address, logo_url")
    .eq("id", tenantId)
    .maybeSingle();

  // 2. Fetch Hospital Doctors for Consultation Selection
  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, name, specialty, consultation_fee")
    .eq("tenant_id", tenantId)
    .order("name");

  // 3. Fetch Invoices (OPD invoices: receivable, no admission_id or OPD reference)
  const query = supabase
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
      admission_id,
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
      ),
      appointments (
        id,
        scheduled_date,
        scheduled_time,
        doctor_id,
        doctors (
          id,
          name,
          specialty,
          consultation_fee
        )
      )
    `)
    .eq("tenant_id", tenantId)
    .eq("kind", "receivable")
    .is("admission_id", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: invoices, error: invError } = await query;

  if (invError) {
    return fail(invError.message, 500);
  }

  let totalBilled = 0;
  let totalCollected = 0;
  let totalDue = 0;

  const formattedInvoices = (invoices ?? []).map((inv: Record<string, any>) => {
    const amt = Number(inv.amount || 0);
    const isPaid = Boolean(inv.paid_at);
    totalBilled += amt;
    if (isPaid) {
      totalCollected += amt;
    } else {
      totalDue += amt;
    }

    const docName =
      inv.appointments?.doctors?.name ||
      inv.line_items?.find((l: { doctor_name?: string }) => l.doctor_name)?.doctor_name ||
      "Consultant Physician";

    return {
      id: inv.id,
      reference: inv.reference,
      party: inv.party,
      amount: amt,
      due_date: inv.due_date,
      paid_at: inv.paid_at,
      is_paid: isPaid,
      created_at: inv.created_at,
      description: inv.description,
      line_items: inv.line_items || [],
      facility_name: tenant?.name || "HealthFlow Hospital",
      facility_kind: tenant?.kind || "hospital",
      patient: inv.patients || null,
      appointment: inv.appointments || null,
      doctor_name: docName,
    };
  });

  return json({
    data: {
      invoices: formattedInvoices,
      doctors: doctors ?? [],
      hospital: tenant ?? null,
      summary: {
        total_billed: totalBilled,
        total_collected: totalCollected,
        total_due: totalDue,
        count: formattedInvoices.length,
      },
    },
  });
};

const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  category: z.string().optional(),
});

const createInvoiceSchema = z.object({
  patient_id: z.string().uuid().optional().nullable(),
  party: z.string().trim().min(1, "Patient name is required"),
  amount: z.coerce.number().min(0, "Invoice amount cannot be negative"),
  description: z.string().trim().optional().nullable(),
  line_items: z.array(lineItemSchema).default([]),
  paid: z.boolean().default(true),
  payment_method: z.string().optional().default("cash"),
  appointment_id: z.string().uuid().optional().nullable(),
  doctor_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

export const POST = async (request: Request) => {
  const guard = await requireHospitalStaff();
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid invoice details", 422);
  }

  const {
    patient_id,
    party,
    amount,
    description,
    line_items,
    paid,
    payment_method: _paymentMethod,
    appointment_id,
    due_date,
  } = parsed.data;

  const supabase = await createServerSupabase();

  const summaryText =
    description?.trim() ||
    (line_items.length > 0
      ? line_items.map((li) => `${li.description} (x${li.quantity})`).join(", ")
      : `OPD Service for ${party}`);

  // Call the official create_opd_invoice security-definer function
  const { data: invoiceData, error: rpcError } = await (supabase as any).rpc("create_opd_invoice", {
    p_tenant_id: guard.tenantId,
    p_patient_id: patient_id ?? undefined,
    p_party: party,
    p_amount: amount,
    p_description: summaryText,
    p_line_items: line_items,
    p_paid: paid,
    p_appointment_id: appointment_id ?? undefined,
    p_due_date: due_date || new Date().toISOString().slice(0, 10),
  });

  if (rpcError) {
    return fail(rpcError.message, 500);
  }

  return json({ data: invoiceData });
};

const updateInvoiceSchema = z.object({
  invoice_id: z.string().uuid("Invoice ID is required"),
  paid: z.boolean(),
});

export const PATCH = async (request: Request) => {
  const guard = await requireHospitalStaff();
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = updateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid update payload", 422);
  }

  const { invoice_id, paid } = parsed.data;
  const supabase = await createServerSupabase();

  const { data: updated, error: updateError } = await supabase
    .from("finance_invoices")
    .update({
      paid_at: paid ? new Date().toISOString() : null,
    })
    .eq("id", invoice_id)
    .eq("tenant_id", guard.tenantId)
    .select()
    .single();

  if (updateError) {
    return fail(updateError.message, 500);
  }

  return json({ data: updated });
};
