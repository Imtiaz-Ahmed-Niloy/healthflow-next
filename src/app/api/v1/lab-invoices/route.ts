import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const requireHospitalStaff = async () => {
  const auth = await getAuthContext();
  if (!auth) return { error: fail("Not signed in", 401) } as const;
  const allowed = ["super_admin", "hospital_admin", "finance_admin", "doctor", "lab_admin"];
  if (!auth.role || !allowed.includes(auth.role)) {
    return { error: fail("You do not have permission to manage Lab & Test invoices", 403) } as const;
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

  // 1. Fetch Hospital Info from tenants
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, kind, contact_phone, contact_email, address, location, tagline, logo_url")
    .eq("id", tenantId)
    .maybeSingle();

  // 2. Fetch Active Lab Tests (Test Catalogue from http://localhost:3000/admin/lab)
  const { data: labTests } = await supabase
    .from("lab_tests")
    .select("id, name, category, price, turnaround, sample, prep, description, status")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  // 3. Fetch Doctors for Referring Physician Selection
  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, name, specialty, consultation_fee")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  // 4. Fetch Lab Invoices from finance_invoices
  const { data: rawInvoices, error: invError } = await supabase
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
      )
    `)
    .eq("tenant_id", tenantId)
    .eq("kind", "receivable")
    .ilike("reference", "LAB-%")
    .order("created_at", { ascending: false })
    .limit(300);

  if (invError) {
    return fail(invError.message, 500);
  }

  let totalBilled = 0;
  let totalCollected = 0;
  let totalDue = 0;

  const formattedInvoices = (rawInvoices ?? []).map((inv: any) => {
    const amt = Number(inv.amount || 0);
    const isPaid = Boolean(inv.paid_at);
    totalBilled += amt;
    if (isPaid) {
      totalCollected += amt;
    } else {
      totalDue += amt;
    }

    const patient = inv.patients || null;
    const testLines = Array.isArray(inv.line_items) ? inv.line_items : [];

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
      line_items: testLines,
      patient: patient
        ? {
            id: patient.id,
            name: patient.full_name,
            mrn: patient.mrn,
            phone: patient.phone,
            gender: patient.gender,
            date_of_birth: patient.date_of_birth,
          }
        : {
            name: inv.party,
            mrn: null,
            phone: null,
            gender: null,
            date_of_birth: null,
          },
      doctor_name:
        testLines.find((l: any) => l.doctor_name)?.doctor_name ||
        "Inhouse Pathology Consultant",
    };
  });

  return json({
    data: {
      invoices: formattedInvoices,
      tests: labTests ?? [],
      doctors: doctors ?? [],
      hospital: tenant ?? null,
      summary: {
        total_billed: totalBilled,
        total_collected: totalCollected,
        total_due: totalDue,
        count: formattedInvoices.length,
        catalog_tests_count: labTests?.length ?? 0,
      },
    },
  });
};

const labLineItemSchema = z.object({
  test_id: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1, "Test name is required"),
  category: z.string().optional().default("Diagnostic Investigation"),
  sample: z.string().optional().nullable(),
  turnaround: z.string().optional().nullable(),
  quantity: z.coerce.number().min(1).default(1),
  rate: z.coerce.number().min(0).default(0),
  amount: z.coerce.number().min(0).default(0),
  doctor_name: z.string().optional().nullable(),
});

const createLabInvoiceSchema = z.object({
  patient_id: z.string().uuid().optional().nullable(),
  party: z.string().trim().min(1, "Patient name is required"),
  phone: z.string().trim().optional().nullable(),
  mrn: z.string().trim().optional().nullable(),
  age: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  doctor_id: z.string().uuid().optional().nullable(),
  doctor_name: z.string().trim().optional().nullable(),
  amount: z.coerce.number().min(0, "Total amount cannot be negative"),
  discount: z.coerce.number().min(0).default(0),
  line_items: z.array(labLineItemSchema).min(1, "At least one diagnostic test is required"),
  paid: z.boolean().default(true),
  payment_method: z.string().optional().default("cash"),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const POST = async (request: Request) => {
  const guard = await requireHospitalStaff();
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createLabInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid invoice details", 422);
  }

  const {
    patient_id,
    party,
    amount,
    doctor_id,
    doctor_name,
    line_items,
    paid,
    due_date,
    notes,
  } = parsed.data;

  const supabase = await createServerSupabase();
  const tenantId = guard.tenantId;

  // Generate Unique Diagnostic Reference: LAB-YYMMDD-XXXX
  const dateSegment = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const reference = `LAB-${dateSegment}-${randomSuffix}`;

  const testNamesSummary = line_items.map((li) => li.description).join(", ");
  const description = notes?.trim()
    ? `Lab Bill: ${testNamesSummary} (${notes.trim()})`
    : `Diagnostic Lab Bill · ${testNamesSummary}`;

  // Stamp doctor_name into line items if present
  const stampedLineItems = line_items.map((li) => ({
    ...li,
    doctor_name: doctor_name || li.doctor_name || null,
  }));

  // 1. Insert into finance_invoices
  const { data: invData, error: invError } = await supabase
    .from("finance_invoices")
    .insert({
      tenant_id: tenantId,
      reference,
      party,
      kind: "receivable",
      amount,
      due_date: due_date || new Date().toISOString().slice(0, 10),
      paid_at: paid ? new Date().toISOString() : null,
      patient_id: patient_id || null,
      description,
      line_items: stampedLineItems,
    })
    .select()
    .single();

  if (invError) {
    return fail(invError.message, 500);
  }

  // 2. If patient is linked, create corresponding lab_orders for the lab queue & technicians
  if (patient_id) {
    const ordersToInsert = line_items.map((li, idx) => ({
      tenant_id: tenantId,
      reference: `L-${Math.floor(1000 + Math.random() * 9000)}-${idx + 1}`,
      patient_id,
      lab_test_id: li.test_id || null,
      test_name: li.description,
      doctor_id: doctor_id || null,
      status: "pending" as const,
    }));

    // Non-blocking insert into lab_orders
    void supabase.from("lab_orders").insert(ordersToInsert);
  }

  return json({ data: invData });
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

  const { data, error } = await supabase
    .from("finance_invoices")
    .update({
      paid_at: paid ? new Date().toISOString() : null,
    })
    .eq("id", invoice_id)
    .eq("tenant_id", guard.tenantId)
    .select()
    .single();

  if (error) {
    return fail(error.message, 500);
  }

  return json({ data });
};

