"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, FileText, Users, BookUser, Calendar, ChevronDown, Lightbulb,
  ShieldCheck, Printer, MessagesSquare, Pill, CircleDashed,
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";

/**
 * The doctor panel's manual.
 *
 * It is static text and stays that way — a guide is content, not data — but
 * every line of it now describes something the panel actually does. What was
 * here before was a well-built shell around instructions for a different
 * product: scanning a patient's portal QR, sending prescriptions by SMS,
 * dragging queue cards to reorder them, saving prescription templates,
 * blocking leave so "HR is notified automatically", pressing Ctrl+K to jump to
 * any patient, amending a sent prescription within 24 hours, and a five-minute
 * video tutorial that was a YouTube link to Rick Astley.
 *
 * None of that exists. A manual that describes features the product does not
 * have is worse than no manual: it sends a doctor looking for a button that
 * was never built, and it teaches them not to trust the rest of the page.
 *
 * So the rule for this file: if it is written here, it works. Anything asked
 * for often enough to be worth mentioning but not built yet is named in "Not
 * here yet" at the bottom, where it cannot be mistaken for a feature.
 */

const sections = [
  {
    id: "queue",
    icon: Users,
    title: "Patient Queue",
    summary: "Today's list, in the order you will see them — and where a consultation starts.",
    steps: [
      "Open Queue. It shows today's appointments booked with you, soonest first, with how long each patient has been waiting.",
      "The tiles above the list are real counts: seen, remaining, and the average wait so far today.",
      "Filter by priority — High, Standard or Routine — using the buttons over the list. The priority is set when the appointment is booked.",
      "Someone arriving without an appointment goes in through Add Walk-in Patient: a name and a reason is enough, and it creates the patient and today's appointment together.",
      "Start Consult opens the prescription pad for that visit. Everything you write there is attached to that appointment.",
      "Seen Today, underneath, is what you have already completed — open one to read the chart back.",
    ],
    tips: [
      "The queue is yours alone. It is filtered to appointments with you, not the hospital's whole day.",
      "A patient already in consultation shows as In Consult rather than as waiting, so you can leave and come back to the tab.",
    ],
  },
  {
    id: "prescription",
    icon: FileText,
    title: "Prescription",
    summary: "The consultation itself: complaints, examination, diagnosis, medicines and advice.",
    steps: [
      "Reach it from Queue's Start Consult, or from a visit in Seen Today. It always belongs to one appointment.",
      "Fill the sections you need — chief complaints, examination, investigation, diagnosis, advice. Each one takes as many lines as you want, and blank sections simply do not print.",
      "Blood pressure is recorded on the visit; height and weight come from the patient's record.",
      "Add a medicine with its dose, frequency, days and whether it is before or after meals. The picker offers what you prescribe most often, counted from your own history rather than a list someone typed.",
      "Print & Submit prints the prescription and marks the visit completed.",
      "Reopening a completed visit shows everything you wrote. Change it and save again — the chart is the current one, not a locked copy.",
    ],
    tips: [
      "What you type is kept in this browser as you go, so a reload or a power cut mid-consultation does not lose it. It reaches the patient's record when you Print & Submit.",
      "What you see on screen is what prints. The print stylesheet hides the rest of the panel rather than rebuilding the page.",
      "The medicine list learns per doctor and per dose: 20mg and 40mg of the same drug are remembered separately, on purpose.",
    ],
  },
  {
    id: "directory",
    icon: BookUser,
    title: "Patient Directory",
    summary: "Every patient you have seen, with what you recorded about them.",
    steps: [
      "Search by name, phone or MRN.",
      "Open a patient for their visit history with you: complaints, diagnoses and medicines from each consultation.",
      "Conditions are gathered from the diagnoses across their visits — it is a summary of what you wrote, not a separate list to maintain.",
      "Requires Action means one narrow, checkable thing: this patient has an upcoming appointment marked high priority. It is not a risk score.",
    ],
    tips: [
      "It is your own list. A patient who has never had an appointment with you will not appear, even if the hospital has them registered.",
      "Vitals shown are the ones the system actually stores — blood pressure, height and weight. Heart rate and SpO2 are not recorded anywhere, so they are not shown.",
    ],
  },
  {
    id: "schedule",
    icon: Calendar,
    title: "Schedule",
    summary: "Your appointments by month and by day, past and upcoming.",
    steps: [
      "Move between months with the arrows; pick a day to see that day's list beside the calendar.",
      "Each entry shows the time, the patient, the reason and whether the visit is scheduled, completed or cancelled.",
      "Open a scheduled visit to go straight into the consultation for it.",
    ],
    tips: [
      "Schedule shows your appointments; it is not where availability is set. See Not here yet.",
      "Days with appointments are marked on the calendar, so an empty week is visible at a glance.",
    ],
  },
  {
    id: "community",
    icon: MessagesSquare,
    title: "Community",
    summary: "Ask, answer and discuss cases with doctors across HealthFlow.",
    steps: [
      "Write in the box at the top and choose what it is: Discussion, Question, Case Study or Thought.",
      "Attach up to four images — an ECG strip, an X-ray, a chart photo. They upload straight to storage rather than through the app.",
      "React with Like, Love or Insightful. One reaction per post per doctor: pressing the same one again takes it back, a different one changes it.",
      "Comment normally, or use Post as suggestion when you are saying what you would do — those replies are marked so they read differently from agreement.",
      "You can remove your own post at any time.",
    ],
    tips: [
      "The feed is every doctor on the platform, not only your hospital, and each author's hospital is shown beside their name.",
      "Nothing a post refers to travels with it: patients, appointments and prescriptions stay inside your own hospital. Write about the case, not the patient's identity.",
    ],
  },
  {
    id: "account",
    icon: ShieldCheck,
    title: "Your account",
    summary: "How you sign in, and who can change what.",
    steps: [
      "Your login is created by your hospital's administrator when your profile is approved — there is no self sign-up for doctors.",
      "Forgot your password? Use Forgot Password on the sign-in page; the reset link goes to your registered address.",
      "If you never received a password, your hospital admin can read it back or reset it for you from Hospital Management.",
      "Dates, times and currency follow the platform's settings unless you set your own under Settings.",
    ],
    tips: [
      "Sign out on shared workstations. A session belongs to the browser it was opened in.",
      "Your name, photo and specialty on posts and prescriptions come from your doctor profile — ask your hospital admin to correct them.",
    ],
  },
];

const quickTips = [
  {
    icon: Printer,
    t: "Printing",
    d: "Print from the prescription itself. The page you are looking at is the page that prints — there is no separate export step.",
  },
  {
    icon: Pill,
    t: "Medicines you use",
    d: "The picker's default list is your own most-prescribed, counted as you prescribe. It gets better without you maintaining it.",
  },
  {
    icon: Users,
    t: "Walk-ins",
    d: "Add Walk-in Patient in the Queue registers the patient and books today's visit in one step.",
  },
  {
    icon: ShieldCheck,
    t: "What others can see",
    d: "Your patients, charts and queue are your hospital's alone. Only the Community feed reaches beyond it.",
  },
];

/**
 * Said plainly, and kept short. Every line here is something a doctor is
 * likely to go looking for; naming them is what stops the rest of the guide
 * from being read as a promise.
 */
const notYet = [
  "Setting your own availability or consulting hours — bookings are made by the hospital, and Schedule shows them rather than shaping them.",
  "Requesting leave. Ask your hospital's admin; HR keeps leave in the admin panel, not here.",
  "Video consultation. The telehealth page is not connected to anything yet.",
  "Sending a prescription to a patient by SMS or email. It prints; the patient portal shows their own records separately.",
  "Editing another doctor's community post, or seeing who reacted to yours by name.",
];

const faqs = [
  {
    q: "Can I change a prescription after I have submitted it?",
    a: "Yes. Open the visit again from Seen Today or from Schedule, change what you need and save. The chart is the live one — there is no locked copy and no separate amendment step. Every change is recorded in the platform's audit trail.",
  },
  {
    q: "Why can I not see a patient in my directory?",
    a: "The directory is built from your own appointments, so a patient appears once they have had a visit booked with you. If they are new to the hospital, reception or the hospital admin registers them first; if the visit was with a colleague, they will be in that doctor's directory, not yours.",
  },
  {
    q: "Someone walked in without an appointment. What do I do?",
    a: "Queue → Add Walk-in Patient. A name and the reason for the visit is enough: it creates the patient record and today's appointment together, and they appear in your queue immediately.",
  },
  {
    q: "Who can see what I post in the Community?",
    a: "Every doctor on HealthFlow, at any hospital, and your own hospital's administrator. Nobody else — not other hospitals' admins, not nurses, not patients. Post about the medicine, not about the person: nothing that identifies a patient should go in a post.",
  },
  {
    q: "How do I block a day off?",
    a: "Not from here yet. Your hospital's admin manages leave, and appointments are booked around it in the admin panel. Schedule shows you what has been booked.",
  },
  {
    q: "The panel is showing the wrong time or date format.",
    a: "Those come from the platform's defaults, which a super admin sets, and from your own choice under Settings if you have made one. Yours wins over the platform's.",
  },
];

const UserGuide = () => {
  const [open, setOpen] = useState<string | null>("queue");
  const [faqOpen, setFaqOpen] = useState(0);

  return (
    <PortalLayout>
      <div className="max-w-6xl mx-auto space-y-10">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-10 shadow-soft"
        >
          <span className="inline-flex rounded-full bg-surface-dark-foreground/15 px-3 py-1 text-[10px] font-bold tracking-widest">
            DOCTOR PANEL · USER GUIDE
          </span>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">How your panel works</h1>
          <p className="mt-3 text-sm opacity-80 max-w-2xl">
            Every screen you have — queue, prescriptions, your patients, your schedule and the
            doctors&apos; community — and what each one actually does. If it is written here, it
            works; what is not built yet is listed at the end rather than described as though it
            were.
          </p>
          <div className="mt-6">
            <a
              href="#sections"
              className="inline-flex items-center gap-2 rounded-full bg-accent text-primary px-5 py-2.5 text-xs font-semibold hover:bg-accent/80 transition-colors"
            >
              <BookOpen className="h-4 w-4" /> Start reading
            </a>
          </div>
        </motion.section>

        <section id="sections" className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">
                FEATURE WALK-THROUGHS
              </span>
              <h2 className="mt-3 font-display text-3xl text-primary">Panel features</h2>
            </div>
            <p className="text-xs text-muted-foreground hidden md:block">
              Click a card to expand the step-by-step guide.
            </p>
          </div>

          <div className="grid gap-4">
            {sections.map((s) => {
              const isOpen = open === s.id;
              return (
                <div key={s.id} className="rounded-3xl bg-card border border-border/60 shadow-soft overflow-hidden">
                  <button
                    onClick={() => setOpen(isOpen ? null : s.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-4 p-6 text-left"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-chip flex items-center justify-center text-primary">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-xl text-primary">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{s.summary}</p>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="grid md:grid-cols-2 gap-6 px-6 pb-6">
                          <div>
                            <h4 className="text-[10px] tracking-widest font-bold text-primary-glow">STEP-BY-STEP</h4>
                            <ol className="mt-3 space-y-2">
                              {s.steps.map((step, i) => (
                                <li key={i} className="flex gap-3 text-sm text-foreground/80">
                                  <span className="h-6 w-6 shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                                    {i + 1}
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                          <div className="rounded-2xl bg-muted/40 p-5 border border-border/50">
                            <h4 className="text-[10px] tracking-widest font-bold text-primary-glow">WORTH KNOWING</h4>
                            <ul className="mt-3 space-y-2">
                              {s.tips.map((tip, i) => (
                                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                                  <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-accent shrink-0" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          {quickTips.map((t) => (
            <div key={t.t} className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft">
              <div className="h-10 w-10 rounded-xl bg-chip flex items-center justify-center text-primary">
                <t.icon className="h-4 w-4" />
              </div>
              <h4 className="mt-3 font-semibold text-primary text-sm">{t.t}</h4>
              <p className="text-xs text-muted-foreground mt-1">{t.d}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl bg-card border border-border/60 shadow-soft p-8">
          <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">
            NOT HERE YET
          </span>
          <h2 className="mt-3 font-display text-3xl text-primary">What the panel does not do</h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-2xl">
            Written down so you do not go looking. These are the things doctors ask for that are
            not built — if one of them is blocking you, tell your hospital&apos;s administrator so
            it can be prioritised.
          </p>
          <ul className="mt-5 grid md:grid-cols-2 gap-3">
            {notYet.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-foreground/80">
                <CircleDashed className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid md:grid-cols-[1fr_2fr] gap-8 pb-6">
          <div>
            <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">
              FAQ
            </span>
            <h2 className="mt-3 font-display text-3xl text-primary">Common questions</h2>
            <p className="text-xs text-muted-foreground mt-2">
              Answers for what the panel actually does today.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={f.q} className="rounded-2xl bg-muted/40 border border-border/60 overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}
                  aria-expanded={faqOpen === i}
                  className="w-full flex items-center justify-between gap-3 p-5 text-left"
                >
                  <span className="font-semibold text-primary text-sm">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 text-primary shrink-0 transition-transform ${faqOpen === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {faqOpen === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="px-5 pb-5 text-xs text-muted-foreground">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PortalLayout>
  );
};

export default UserGuide;
