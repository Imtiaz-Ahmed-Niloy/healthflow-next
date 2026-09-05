import { CERTIFICATE_TYPES } from "@/server/resources/certificates";

/**
 * What each kind of certificate actually says.
 *
 * Every type used to print the same document: a title, the recipient's name,
 * and one free-text box. That is not what these are. A birth record carries a
 * time and a weight and two parents; a cause-of-death certificate carries a
 * sequence of conditions and the interval each ran for; a salary certificate
 * carries a period and a figure. Ten documents were being rendered as one.
 *
 * The shape below is read twice — once to build the form and once to lay out
 * the printed page — so a field cannot exist on one and be missing from the
 * other. Adding a field to a certificate is adding a line here.
 *
 * Field names are the keys inside `certificates.fields` (0072), which is a
 * jsonb object rather than columns: they are per-type by definition, and forty
 * mostly-null columns on one table is the shape this avoids.
 */

export type CertType = (typeof CERTIFICATE_TYPES)[number];

export type CertFieldType = "text" | "date" | "time" | "number" | "textarea" | "select";

export type CertField = {
  /** Key inside `fields`. snake_case, like a column. */
  name: string;
  label: string;
  type: CertFieldType;
  /** For `select` only. */
  options?: string[];
  /** Spans the row, in the form and on the page. */
  wide?: boolean;
  hint?: string;
};

export type CertSection = {
  title: string;
  fields: CertField[];
};

export type CertFormat = {
  /**
   * The line printed under the recipient's name. The old document said "This
   * is to certify that" for all ten, which reads as a form letter on a
   * document about a death.
   */
  attestation: string;
  /** Who signs it, printed under the signature rule. */
  signatory: string;
  sections: CertSection[];
};

const SEX = ["Male", "Female", "Other"];
const YES_NO = ["Yes", "No"];

export const CERTIFICATE_FORMATS: Record<CertType, CertFormat> = {
  /**
   * The hospital's record of a live birth — the document that feeds civil
   * registration rather than replacing it. Grouped the way the standard birth
   * worksheet is: the child, then each parent, then who attended.
   */
  birth: {
    attestation: "This is to certify that a live birth was recorded at this hospital as follows.",
    signatory: "Attending Physician",
    sections: [
      {
        title: "The child",
        fields: [
          { name: "date_of_birth", label: "Date of birth", type: "date" },
          { name: "time_of_birth", label: "Time of birth", type: "time" },
          { name: "sex", label: "Sex", type: "select", options: SEX },
          { name: "weight_kg", label: "Weight at birth (kg)", type: "number" },
          { name: "delivery_type", label: "Type of delivery", type: "select", options: ["Normal", "Caesarean section", "Assisted"] },
          { name: "place_of_birth", label: "Place of birth", type: "text" },
        ],
      },
      {
        title: "Parents",
        fields: [
          { name: "mother_name", label: "Mother's name", type: "text" },
          { name: "mother_nationality", label: "Mother's nationality", type: "text" },
          { name: "father_name", label: "Father's name", type: "text" },
          { name: "father_nationality", label: "Father's nationality", type: "text" },
          { name: "permanent_address", label: "Permanent address", type: "textarea", wide: true },
        ],
      },
    ],
  },

  /**
   * The medical certificate of cause of death, in the WHO shape: Part I is the
   * sequence that led to death, written from the immediate cause downward to
   * the underlying one, each with the interval it ran for; Part II is what
   * contributed without being part of that sequence.
   *
   * The order of the lines is the point of the form — a doctor reading it must
   * be able to follow (a) back to (c) — so they are separate fields rather
   * than one box.
   */
  death: {
    attestation: "This is to certify the death and its cause, as recorded at this hospital.",
    signatory: "Certifying Physician",
    sections: [
      {
        title: "The death",
        fields: [
          { name: "date_of_death", label: "Date of death", type: "date" },
          { name: "time_of_death", label: "Time of death", type: "time" },
          { name: "age_at_death", label: "Age at death", type: "text" },
          { name: "sex", label: "Sex", type: "select", options: SEX },
          { name: "place_of_death", label: "Place of death", type: "text" },
        ],
      },
      {
        title: "Part I — sequence of conditions leading directly to death",
        fields: [
          { name: "cause_a", label: "(a) Immediate cause", type: "text", wide: true },
          { name: "interval_a", label: "Interval between onset and death", type: "text" },
          { name: "cause_b", label: "(b) Due to, or as a consequence of", type: "text", wide: true },
          { name: "interval_b", label: "Interval", type: "text" },
          { name: "cause_c", label: "(c) Due to, or as a consequence of", type: "text", wide: true },
          { name: "interval_c", label: "Interval", type: "text" },
        ],
      },
      {
        title: "Part II — other contributing conditions",
        fields: [
          { name: "contributing_conditions", label: "Conditions contributing to death but not in the sequence above", type: "textarea", wide: true },
        ],
      },
    ],
  },

  medical_fitness: {
    attestation: "This is to certify that the person named above was examined at this hospital and found as follows.",
    signatory: "Examining Physician",
    sections: [
      {
        title: "Examination",
        fields: [
          { name: "examination_date", label: "Date of examination", type: "date" },
          { name: "age", label: "Age", type: "text" },
          { name: "sex", label: "Sex", type: "select", options: SEX },
          { name: "purpose", label: "Purpose", type: "text", hint: "Employment, travel, study" },
        ],
      },
      {
        title: "Findings",
        fields: [
          { name: "height_cm", label: "Height (cm)", type: "number" },
          { name: "weight_kg", label: "Weight (kg)", type: "number" },
          { name: "blood_pressure", label: "Blood pressure", type: "text" },
          { name: "vision", label: "Vision", type: "text" },
          { name: "findings", label: "Clinical findings", type: "textarea", wide: true },
        ],
      },
      {
        title: "Opinion",
        fields: [
          { name: "fitness_opinion", label: "Opinion", type: "select", options: ["Fit", "Fit with restrictions", "Temporarily unfit", "Unfit"] },
          { name: "restrictions", label: "Restrictions, if any", type: "text" },
          { name: "valid_until", label: "Valid until", type: "date" },
        ],
      },
    ],
  },

  discharge: {
    attestation: "This is to certify that the person named above was admitted to and discharged from this hospital as follows.",
    signatory: "Consultant",
    sections: [
      {
        title: "Admission",
        fields: [
          { name: "admission_date", label: "Date of admission", type: "date" },
          { name: "discharge_date", label: "Date of discharge", type: "date" },
          { name: "ward_bed", label: "Ward / bed", type: "text" },
          { name: "consultant", label: "Consultant in charge", type: "text" },
        ],
      },
      {
        title: "Clinical",
        fields: [
          { name: "diagnosis", label: "Final diagnosis", type: "textarea", wide: true },
          { name: "procedures", label: "Procedures performed", type: "textarea", wide: true },
          { name: "treatment_summary", label: "Course in hospital", type: "textarea", wide: true },
          { name: "condition_on_discharge", label: "Condition on discharge", type: "select", options: ["Recovered", "Improved", "Unchanged", "Referred", "Left against medical advice"] },
        ],
      },
      {
        title: "After discharge",
        fields: [
          { name: "medications_advised", label: "Medication advised", type: "textarea", wide: true },
          { name: "follow_up_on", label: "Follow up on", type: "date" },
        ],
      },
    ],
  },

  vaccination: {
    attestation: "This is to certify that the person named above received the vaccination recorded below.",
    signatory: "Administering Officer",
    sections: [
      {
        title: "Vaccine",
        fields: [
          { name: "vaccine_name", label: "Vaccine", type: "text" },
          { name: "manufacturer", label: "Manufacturer", type: "text" },
          { name: "batch_no", label: "Batch / lot number", type: "text" },
          { name: "dose_number", label: "Dose", type: "text", hint: "1st, 2nd, booster" },
        ],
      },
      {
        title: "Administration",
        fields: [
          { name: "date_administered", label: "Date administered", type: "date" },
          { name: "site_route", label: "Site and route", type: "text", hint: "Left deltoid, intramuscular" },
          { name: "next_due_on", label: "Next dose due", type: "date" },
          { name: "adverse_events", label: "Adverse events observed", type: "textarea", wide: true },
        ],
      },
    ],
  },

  disability: {
    attestation: "This is to certify that the person named above was assessed at this hospital and found to have the disability recorded below.",
    signatory: "Assessment Board",
    sections: [
      {
        title: "Assessment",
        fields: [
          { name: "assessment_date", label: "Date of assessment", type: "date" },
          { name: "disability_type", label: "Type of disability", type: "text" },
          { name: "severity", label: "Severity", type: "select", options: ["Mild", "Moderate", "Severe", "Profound"] },
          { name: "percentage", label: "Assessed percentage (%)", type: "number" },
          { name: "diagnosis", label: "Clinical basis", type: "textarea", wide: true },
        ],
      },
      {
        title: "Validity",
        fields: [
          { name: "permanent", label: "Permanent", type: "select", options: YES_NO },
          { name: "valid_until", label: "Valid until, if not permanent", type: "date" },
          { name: "recommendations", label: "Recommendations", type: "textarea", wide: true },
        ],
      },
    ],
  },

  experience: {
    attestation: "This is to certify that the person named above was employed at this hospital as recorded below.",
    signatory: "Head of Human Resources",
    sections: [
      {
        title: "Employment",
        fields: [
          { name: "designation", label: "Designation", type: "text" },
          { name: "department", label: "Department", type: "text" },
          { name: "employment_from", label: "From", type: "date" },
          { name: "employment_to", label: "To", type: "date" },
          { name: "employment_type", label: "Type", type: "select", options: ["Full time", "Part time", "Contract", "Locum"] },
        ],
      },
      {
        title: "Record",
        fields: [
          { name: "responsibilities", label: "Responsibilities held", type: "textarea", wide: true },
          { name: "conduct", label: "Conduct", type: "select", options: ["Excellent", "Good", "Satisfactory"] },
        ],
      },
    ],
  },

  noc: {
    attestation: "This hospital has no objection to the person named above proceeding as recorded below.",
    signatory: "Head of Human Resources",
    sections: [
      {
        title: "Employment",
        fields: [
          { name: "designation", label: "Designation", type: "text" },
          { name: "department", label: "Department", type: "text" },
          { name: "employment_from", label: "Employed since", type: "date" },
        ],
      },
      {
        title: "No objection",
        fields: [
          { name: "purpose", label: "Issued for the purpose of", type: "text", wide: true, hint: "Higher study, travel, second employment" },
          { name: "valid_until", label: "Valid until", type: "date" },
          { name: "conditions", label: "Conditions", type: "textarea", wide: true },
        ],
      },
    ],
  },

  relieving: {
    attestation: "This is to certify that the person named above has been relieved of their duties at this hospital as recorded below.",
    signatory: "Head of Human Resources",
    sections: [
      {
        title: "Employment",
        fields: [
          { name: "designation", label: "Designation", type: "text" },
          { name: "department", label: "Department", type: "text" },
          { name: "date_of_joining", label: "Date of joining", type: "date" },
          { name: "date_of_relieving", label: "Date of relieving", type: "date" },
        ],
      },
      {
        title: "Separation",
        fields: [
          { name: "reason", label: "Reason for separation", type: "select", options: ["Resignation", "End of contract", "Retirement", "Transfer", "Termination"] },
          { name: "notice_served", label: "Notice period served", type: "select", options: YES_NO },
          { name: "dues_cleared", label: "Dues cleared", type: "select", options: YES_NO },
          { name: "remarks", label: "Remarks", type: "textarea", wide: true },
        ],
      },
    ],
  },

  salary: {
    attestation: "This is to certify that the person named above draws the salary recorded below from this hospital.",
    signatory: "Head of Finance",
    sections: [
      {
        title: "Employment",
        fields: [
          { name: "designation", label: "Designation", type: "text" },
          { name: "department", label: "Department", type: "text" },
          { name: "employee_no", label: "Employee number", type: "text" },
          { name: "date_of_joining", label: "Date of joining", type: "date" },
        ],
      },
      {
        title: "Period",
        fields: [
          { name: "period_from", label: "From", type: "date" },
          { name: "period_to", label: "To", type: "date" },
          { name: "payment_mode", label: "Paid by", type: "select", options: ["Bank transfer", "Cheque", "Cash"] },
        ],
      },
      {
        title: "Salary",
        fields: [
          { name: "basic_salary", label: "Basic", type: "number" },
          { name: "allowances", label: "Allowances", type: "number" },
          { name: "deductions", label: "Deductions", type: "number" },
          { name: "gross_salary", label: "Gross", type: "number" },
          { name: "net_salary", label: "Net", type: "number" },
        ],
      },
    ],
  },
};

/** Every field of a type, flattened — for reading a saved row back. */
export const fieldsOf = (type: CertType): CertField[] =>
  CERTIFICATE_FORMATS[type].sections.flatMap(s => s.fields);
