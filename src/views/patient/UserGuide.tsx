"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Calendar, ChevronDown, CreditCard, FileText, HelpCircle, LayoutGrid, Search, User, Users, X,
} from "lucide-react";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";

/**
 * The patient portal, explained page by page.
 *
 * Written from the screens themselves, not from a feature list: every step
 * names a button that exists and every rule is one the page or its API
 * enforces. The tutorial this replaced described telehealth calls, online
 * payment, auto-pay, refill requests and a vitals tracker — none of which the
 * portal has. When a screen changes, the section for it changes with it.
 */

type Block =
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: { term: string; text: string }[] }
  | { kind: "text"; text: string }
  | { kind: "note"; text: string };

type Topic = { title: string; blocks: Block[] };

type Section = {
  id: string;
  title: string;
  summary: string;
  icon: typeof User;
  link?: { href: string; label: string };
  topics: Topic[];
};

const SECTIONS: Section[] = [
  {
    id: "getting-around",
    title: "Getting around",
    summary: "The sidebar takes you to each part of the portal. The bar along the top holds your account.",
    icon: LayoutGrid,
    link: { href: "/patient/dashboard", label: "Open Dashboard" },
    topics: [
      {
        title: "The sidebar",
        blocks: [
          {
            kind: "list",
            items: [
              { term: "Dashboard", text: "Your next three appointments, and shortcuts to book one or find a doctor." },
              { term: "Appointments", text: "Every visit you have booked, with a calendar. Reschedule or cancel from here." },
              { term: "Find Doctors", text: "Search doctors across HealthFlow hospitals and book a visit." },
              { term: "Billing", text: "Invoices your hospitals have raised, and what is still unpaid." },
              { term: "Medical Records", text: "Completed visits, prescriptions, and documents you upload yourself." },
              { term: "My Profile", text: "Your details, identity document, emergency contact and medical history." },
              { term: "User Guide", text: "This page." },
            ],
          },
        ],
      },
      {
        title: "The top bar",
        blocks: [
          {
            kind: "list",
            items: [
              { term: "Clock", text: "The hospitals' time and date. Bookings and \"today\" follow this clock, not your phone or computer." },
              { term: "EN / BN", text: "Switch the portal between English and বাংলা." },
              { term: "Person icon", text: "Opens My Profile." },
              { term: "Sign Out", text: "Ends your session on this device." },
            ],
          },
        ],
      },
      {
        title: "One account for every hospital",
        blocks: [
          {
            kind: "text",
            text: "Your HealthFlow account belongs to you, not to a hospital. The first time you book a doctor at a hospital, that hospital opens a patient record for you, starting from the details on your profile. My Profile lists every hospital you are registered at, with the patient ID each one gave you.",
          },
          {
            kind: "note",
            text: "Been to a hospital before as a walk-in? Put the same phone number on your profile before you book there. The hospital finds your existing record by that number and joins it to your account, so your history comes with you.",
          },
        ],
      },
    ],
  },
  {
    id: "profile",
    title: "Your profile",
    summary: "Keep your details, identity and medical history up to date. Hospitals start from them when you first book.",
    icon: User,
    link: { href: "/patient/profile", label: "Open My Profile" },
    topics: [
      {
        title: "Personal details",
        blocks: [
          {
            kind: "steps",
            items: [
              "Open My Profile. The General tab opens first.",
              "Click Edit on Personal Details.",
              "Update your name, date of birth, gender, marital status, NID or passport number, phone and address.",
              "Click Save.",
            ],
          },
          { kind: "note", text: "Your email is the address you sign in with, so it can't be changed here." },
        ],
      },
      {
        title: "Profile picture",
        blocks: [
          {
            kind: "text",
            text: "Click the pencil on your picture and choose an image: PNG, JPG, WebP, AVIF or SVG, up to 5 MB.",
          },
        ],
      },
      {
        title: "Verifying your identity",
        blocks: [
          {
            kind: "steps",
            items: [
              "Under Identity document, choose National ID (NID), Passport or Birth certificate.",
              "Upload a photo or PDF of it, up to 10 MB.",
              "It shows as Being checked until a reviewer looks at it.",
              "Once it's verified, a badge appears beside your name. If it's rejected, the reviewer's note says why, and you can upload it again.",
            ],
          },
          {
            kind: "note",
            text: "If you are ever brought in unable to speak for yourself, a verified document lets the hospital know who you are. Changing the document number sends it back for review.",
          },
        ],
      },
      {
        title: "Emergency contact",
        blocks: [
          {
            kind: "steps",
            items: [
              "Click Edit on Emergency Contact.",
              "Add their name, relationship to you, phone, and optionally an email and address.",
              "Click Save. You can upload an identity document for them underneath.",
            ],
          },
        ],
      },
      {
        title: "Medical history",
        blocks: [
          {
            kind: "list",
            items: [
              { term: "Vitals", text: "On the Clinical tab, click Edit to set your blood group, height and weight." },
              { term: "Allergies", text: "Anything you react to: drugs, food or materials." },
              { term: "Ongoing conditions", text: "Long-term conditions you are managing." },
              { term: "Current medication", text: "What you take regularly, including medicines bought over the counter." },
              { term: "Past procedures", text: "Operations and procedures you have had." },
            ],
          },
          {
            kind: "text",
            text: "Click Add on a list, type a name and an optional detail, then Add again. The bin icon removes an entry.",
          },
          {
            kind: "note",
            text: "A hospital copies these details when you first book there. Changes you make later show on your profile, but don't rewrite the record that hospital already holds.",
          },
        ],
      },
      {
        title: "Insurance and Family",
        blocks: [{ kind: "text", text: "These two tabs aren't available yet." }],
      },
    ],
  },
  {
    id: "booking",
    title: "Finding a doctor and booking",
    summary: "Search doctors by name, specialty or place, and book a time within their hours.",
    icon: Users,
    link: { href: "/patient/find-doctors", label: "Open Find Doctors" },
    topics: [
      {
        title: "Finding a doctor",
        blocks: [
          {
            kind: "steps",
            items: [
              "Open Find Doctors, or click Book Appointment on the Dashboard.",
              "Type a doctor's name, a specialty or a location into the search box, or pick a specialty below it.",
              "Each card shows the doctor's rating, when they see patients and their hospital.",
              "Click a doctor's name or photo to read their full profile.",
            ],
          },
        ],
      },
      {
        title: "Booking an appointment",
        blocks: [
          {
            kind: "steps",
            items: [
              "Click Book Appointment on the doctor's card.",
              "Pick a date and a time. The form shows the days and hours the doctor sees patients.",
              "Add a reason for the visit if you like. The doctor can read it.",
              "Click Confirm Booking. You're taken to Appointments, where the new visit is listed.",
            ],
          },
          {
            kind: "note",
            text: "A date that has passed, or a time outside the doctor's hours, can't be booked. The message under the fields says what to change. If someone takes the slot just before you, you'll be asked to pick another time.",
          },
        ],
      },
    ],
  },
  {
    id: "appointments",
    title: "Managing appointments",
    summary: "See every visit you've booked, move one to a new time, or cancel it.",
    icon: Calendar,
    link: { href: "/patient/appointments", label: "Open Appointments" },
    topics: [
      {
        title: "Your appointments",
        blocks: [
          {
            kind: "list",
            items: [
              { term: "Upcoming", text: "Visits you've booked that haven't been completed yet." },
              { term: "Past", text: "Visits the hospital has marked as completed." },
              { term: "Cancelled", text: "Visits you or the hospital cancelled." },
            ],
          },
          {
            kind: "note",
            text: "A visit stays under Upcoming until the hospital completes it. Then it moves to Past, and the doctor's notes and prescription appear in Medical Records.",
          },
        ],
      },
      {
        title: "Rescheduling",
        blocks: [
          {
            kind: "steps",
            items: [
              "Click Reschedule on an upcoming appointment.",
              "Pick a new date and time. It has to fall within the same doctor's hours.",
              "Click Save New Time.",
            ],
          },
        ],
      },
      {
        title: "Cancelling",
        blocks: [
          {
            kind: "text",
            text: "Click Cancel on an upcoming appointment. It is cancelled straight away, with no confirmation step, so check it's the right one first. To see that doctor again, book a new appointment.",
          },
        ],
      },
      {
        title: "The calendar",
        blocks: [
          {
            kind: "text",
            text: "Days with an appointment are ringed and today is filled in. Click a day to see how many appointments it has, and use the arrows to change month.",
          },
        ],
      },
    ],
  },
  {
    id: "records",
    title: "Medical records",
    summary: "Everything your doctors recorded at completed visits, plus your own paperwork.",
    icon: FileText,
    link: { href: "/patient/medical-records", label: "Open Medical Records" },
    topics: [
      {
        title: "Your latest visit",
        blocks: [
          {
            kind: "list",
            items: [
              { term: "Prescription", text: "The same prescription sheet your doctor printed, ready to print or save." },
              { term: "Full Report", text: "Complaints, examination, investigations, diagnosis, advice, medicines, notes and blood pressure." },
              { term: "Activity timeline", text: "Your four most recent visits, with the doctor and hospital." },
            ],
          },
        ],
      },
      {
        title: "Medicines and past visits",
        blocks: [
          {
            kind: "list",
            items: [
              { term: "Medicine History", text: "Everything you've been prescribed, newest first. Click View all for the full list." },
              { term: "Visit History", text: "Every completed visit. Filter to visits with a prescription or a diagnosis, and click Prescription on any row to open its sheet." },
            ],
          },
        ],
      },
      {
        title: "Adding your own documents",
        blocks: [
          {
            kind: "steps",
            items: [
              "Under Documents, choose what it is: prescription, test or lab report, X-ray or scan, discharge summary, vaccination record, insurance, or other.",
              "Give it a title, and the date printed on it if you know it.",
              "Upload a photo or PDF, up to 10 MB.",
              "Filter the list by type. The bin icon removes a document.",
            ],
          },
          {
            kind: "note",
            text: "Use this for reports from before HealthFlow, or from other clinics. You can add documents before your first visit, and only you can open them.",
          },
        ],
      },
    ],
  },
  {
    id: "billing",
    title: "Billing",
    summary: "Invoices from your hospitals, what's still owed, and how to settle it.",
    icon: CreditCard,
    link: { href: "/patient/billing", label: "Open Billing" },
    topics: [
      {
        title: "Where your bills come from",
        blocks: [
          {
            kind: "list",
            items: [
              { term: "Consultation", text: "Raised when a visit is completed, for the doctor's consultation fee." },
              { term: "Hospital stay", text: "Raised when you're discharged: each day in a bed or cabin, plus nursing care." },
              { term: "Other", text: "Anything the hospital's billing desk adds by hand." },
            ],
          },
          { kind: "text", text: "Bills raised by a visit or a discharge are due a week after they're raised." },
        ],
      },
      {
        title: "Reading your bills",
        blocks: [
          {
            kind: "list",
            items: [
              { term: "Total outstanding balance", text: "Everything you haven't paid yet, across all your hospitals." },
              { term: "Last Payment and Upcoming Due", text: "The most recent bill you settled, and the next one falling due." },
              { term: "Status", text: "Unpaid, Overdue once the due date has passed, or Paid." },
              { term: "Eye icon", text: "For a hospital stay, lists each charge with its days, daily rate and amount." },
            ],
          },
        ],
      },
      {
        title: "Paying a bill",
        blocks: [
          {
            kind: "text",
            text: "Online payment isn't available yet. Pay at the hospital's billing desk. Once they mark the invoice paid, it shows as Paid here.",
          },
        ],
      },
    ],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "I went to my appointment, but it still shows as upcoming.",
    a: "The hospital marks a visit as completed. Until it does, the visit stays under Upcoming. Once it's completed, it moves to Past and its notes and prescription appear in Medical Records.",
  },
  {
    q: "The booking form won't accept the time I want.",
    a: "Times are limited to the days and hours the doctor sees patients, and can't be in the past. The form follows the hospitals' clock in the top bar, which may differ from your device.",
  },
  {
    q: "My records from an earlier hospital visit are missing.",
    a: "A walk-in record joins your account when you book online at that hospital with the same phone number on your profile. Add the number under My Profile, then book.",
  },
  {
    q: "A bill looks wrong.",
    a: "Contact that hospital's billing desk. Only the hospital can change an invoice or mark it paid.",
  },
  {
    q: "Can I change my email address?",
    a: "Not from the portal. It's the address you sign in with.",
  },
  {
    q: "Where are the prescriptions my doctor gave me?",
    a: "In Medical Records. Click Prescription on your latest visit, or on any visit under Visit History.",
  },
];

/** Every word a topic shows, for the search box. */
const topicText = (t: Topic) =>
  [
    t.title,
    ...t.blocks.flatMap(b =>
      b.kind === "list" ? b.items.flatMap(i => [i.term, i.text])
        : b.kind === "steps" ? b.items
          : [b.text]),
  ].join(" ").toLowerCase();

const BlockView = ({ block }: { block: Block }) => {
  if (block.kind === "steps") {
    return (
      <ol className="space-y-2.5">
        {block.items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm text-foreground/80 leading-relaxed">
            <span className="h-6 w-6 shrink-0 rounded-full bg-chip text-primary text-xs font-bold grid place-items-center">{i + 1}</span>
            <span className="pt-0.5">{item}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (block.kind === "list") {
    return (
      <dl className="divide-y divide-border/50 rounded-2xl border border-border/50 overflow-hidden">
        {block.items.map(item => (
          <div key={item.term} className="grid sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 px-4 py-3 bg-card">
            <dt className="text-sm font-semibold text-primary">{item.term}</dt>
            <dd className="text-sm text-foreground/75 leading-relaxed">{item.text}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (block.kind === "note") {
    return (
      <p className="rounded-2xl bg-chip/50 border border-border/40 px-4 py-3 text-sm text-foreground/80 leading-relaxed">
        {block.text}
      </p>
    );
  }
  return <p className="text-sm text-foreground/80 leading-relaxed">{block.text}</p>;
};

const UserGuide = () => {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // A section shows when its own title or summary matches (all its topics),
  // or when any topic in it does (only those topics).
  const visible = useMemo(() => {
    if (!q) return SECTIONS;
    return SECTIONS.flatMap(s => {
      if (`${s.title} ${s.summary}`.toLowerCase().includes(q)) return [s];
      const topics = s.topics.filter(t => topicText(t).includes(q));
      return topics.length ? [{ ...s, topics }] : [];
    });
  }, [q]);

  const faq = useMemo(
    () => (q ? FAQ.filter(f => `${f.q} ${f.a}`.toLowerCase().includes(q)) : FAQ),
    [q],
  );

  const nothing = visible.length === 0 && faq.length === 0;

  return (
    <PatientPortalLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-5xl text-primary">User Guide</h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
          How to use your patient portal, page by page: booking doctors, managing visits, reading your records and paying bills.
        </p>

        <div className="mt-6 relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search the guide, e.g. reschedule, prescription, invoice"
            aria-label="Search the guide"
            className="w-full rounded-full bg-card border border-border pl-11 pr-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-glow"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-chip grid place-items-center">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="mt-10 grid lg:grid-cols-[220px_1fr] gap-10 items-start">
          {/* Contents. Anchors, so a section can be linked to directly. */}
          <nav aria-label="Guide contents" className="hidden lg:block sticky top-6">
            <ul className="space-y-1">
              {visible.map(s => (
                <li key={s.id}>
                  <a href={`#${s.id}`}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-foreground/70 hover:bg-card hover:text-primary transition-colors">
                    <s.icon className="h-4 w-4" /> {s.title}
                  </a>
                </li>
              ))}
              {faq.length > 0 && (
                <li>
                  <a href="#questions"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-foreground/70 hover:bg-card hover:text-primary transition-colors">
                    <HelpCircle className="h-4 w-4" /> Questions
                  </a>
                </li>
              )}
            </ul>
          </nav>

          <div className="space-y-8 min-w-0">
            {nothing && (
              <div className="rounded-3xl border border-dashed border-border/60 p-10 text-center">
                <p className="font-display text-xl text-primary">Nothing matches &ldquo;{query}&rdquo;</p>
                <p className="text-sm text-muted-foreground mt-2">Try a single word, like booking, bill or profile.</p>
              </div>
            )}

            {visible.map(s => (
              <section key={s.id} id={s.id} className="scroll-mt-6 rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-chip grid place-items-center text-primary">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display text-2xl text-primary">{s.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{s.summary}</p>
                    </div>
                  </div>
                  {s.link && (
                    <Link href={s.link.href}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-chip transition-colors">
                      {s.link.label} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>

                <div className="mt-6 space-y-7">
                  {s.topics.map(t => (
                    <div key={t.title}>
                      <h3 className="font-semibold text-primary">{t.title}</h3>
                      <div className="mt-3 space-y-3">
                        {t.blocks.map((b, i) => <BlockView key={i} block={b} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {faq.length > 0 && (
              <section id="questions" className="scroll-mt-6 rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-chip grid place-items-center text-primary">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl text-primary">Questions</h2>
                    <p className="text-sm text-muted-foreground mt-1">Things patients often run into.</p>
                  </div>
                </div>
                <div className="mt-6 divide-y divide-border/50">
                  {faq.map(f => (
                    <details key={f.q} className="group py-4">
                      <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-sm font-semibold text-primary">
                        {f.q}
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 text-sm text-foreground/75 leading-relaxed">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </PatientPortalLayout>
  );
};

export default UserGuide;
