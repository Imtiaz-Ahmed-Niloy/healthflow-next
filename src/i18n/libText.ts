import type { Locale } from "./config";

/**
 * The words the plain helper libraries put into sentences — weekday names,
 * "Closed", a booking refused for its day or hour — in each language.
 *
 * These libraries (src/lib/availability.ts, hours.ts, timezone.ts) run on
 * the server too, where there is no hook to read the language from, so they
 * take a `locale` argument (English when left out) and look their words up
 * here. A screen passes useLocale(); an API route passes getLocale().
 */

type Words = {
  monthsShort: readonly string[];
  daysShort: readonly string[];
  daysLong: readonly string[];
  /** "on Sundays" — the plural English uses for a repeating day. */
  daysOn: readonly string[];
  am: string;
  pm: string;
  midnight: string;
  allDay: string;
  everyDay: string;
  noDaysNow: string;
  notTakingAppointments: string;
  closed: string;
  open24: string;
  theDoctor: string;
  notTakingNow: (doctor: string) => string;
  offDay: (doctor: string, day: string, days: string) => string;
  outsideHours: (doctor: string, from: string, to: string, day: string | null) => string;
  datePassed: string;
  timePassed: string;
};

const WORDS: Record<Locale, Words> = {
  en: {
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    daysLong: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    daysOn: ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"],
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    allDay: "all day",
    everyDay: "every day",
    noDaysNow: "no days at the moment",
    notTakingAppointments: "Not taking appointments",
    closed: "Closed",
    open24: "Open 24 hours",
    theDoctor: "The doctor",
    notTakingNow: doctor => `${doctor} isn't taking appointments at the moment.`,
    offDay: (doctor, day, days) => `${doctor} doesn't see patients on ${day}. Available ${days}.`,
    outsideHours: (doctor, from, to, day) =>
      `${doctor} sees patients between ${from} and ${to}${day ? ` on ${day}` : ""}.`,
    datePassed: "That date has already passed. Pick today or a later date.",
    timePassed: "That time has already passed. Pick a later time.",
  },
  bn: {
    monthsShort: ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"],
    daysShort: ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"],
    daysLong: ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"],
    daysOn: ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"],
    am: "AM",
    pm: "PM",
    midnight: "মধ্যরাত",
    allDay: "সারাদিন",
    everyDay: "প্রতিদিন",
    noDaysNow: "এই মুহূর্তে কোনো দিন নেই",
    notTakingAppointments: "অ্যাপয়েন্টমেন্ট নিচ্ছেন না",
    closed: "বন্ধ",
    open24: "২৪ ঘণ্টা খোলা",
    theDoctor: "ডাক্তার",
    notTakingNow: doctor => `${doctor} এই মুহূর্তে অ্যাপয়েন্টমেন্ট নিচ্ছেন না।`,
    offDay: (doctor, day, days) => `${doctor} ${day} রোগী দেখেন না। যেদিন পাওয়া যাবে: ${days}।`,
    outsideHours: (doctor, from, to, day) =>
      `${doctor} ${day ? `${day} ` : ""}${from} থেকে ${to} পর্যন্ত রোগী দেখেন।`,
    datePassed: "এই তারিখ পার হয়ে গেছে। আজ বা পরের কোনো তারিখ বেছে নিন।",
    timePassed: "এই সময় পার হয়ে গেছে। পরের কোনো সময় বেছে নিন।",
  },
};

export const libWords = (locale: Locale = "en"): Words => WORDS[locale] ?? WORDS.en;

/**
 * The few words the plain CRUD helpers put in a toast.
 *
 * Same reason as above: useCrud and exportCSV are functions, not components,
 * so they read the language from the cookie (clientLocale()) and look the
 * words up here rather than calling a hook.
 */
type CrudWords = {
  created: string;
  updated: string;
  deleted: string;
  removedCount: (n: number) => string;
  reset: string;
  nothingToExport: string;
  exported: string;
};

const CRUD_WORDS: Record<Locale, CrudWords> = {
  en: {
    created: "Created",
    updated: "Updated",
    deleted: "Deleted",
    removedCount: n => `${n} removed`,
    reset: "Reset to defaults",
    nothingToExport: "Nothing to export",
    exported: "Exported CSV",
  },
  bn: {
    created: "তৈরি হয়েছে",
    updated: "হালনাগাদ হয়েছে",
    deleted: "মুছে ফেলা হয়েছে",
    removedCount: n => `${n}টি সরানো হয়েছে`,
    reset: "ডিফল্টে ফেরানো হয়েছে",
    nothingToExport: "রপ্তানি করার কিছু নেই",
    exported: "সিএসভি রপ্তানি হয়েছে",
  },
};

export const crudWords = (locale: Locale = "en"): CrudWords => CRUD_WORDS[locale] ?? CRUD_WORDS.en;

/**
 * The printed payslip's own words (src/lib/payroll.ts).
 *
 * Printing opens a blank window and writes HTML into it, outside React, so
 * the language is read from the cookie and the words come from here.
 */
type PayslipWords = {
  tabTitle: (empId: string, period: string) => string;
  heading: (period: string) => string;
  employee: string;
  employeeId: string;
  department: string;
  designation: string;
  run: string;
  generated: string;
  earnings: string;
  basic: string;
  houseRent: string;
  medical: string;
  transport: string;
  gross: string;
  deductions: string;
  pf: string;
  tax: string;
  loan: string;
  total: string;
  netPayable: string;
  footer: (year: number, company: string) => string;
};

const PAYSLIP_WORDS: Record<Locale, PayslipWords> = {
  en: {
    tabTitle: (empId, period) => `Payslip ${empId} ${period}`,
    heading: period => `Payslip · ${period}`,
    employee: "Employee",
    employeeId: "Employee ID",
    department: "Department",
    designation: "Designation",
    run: "Run",
    generated: "Generated",
    earnings: "Earnings",
    basic: "Basic",
    houseRent: "House Rent",
    medical: "Medical",
    transport: "Transport",
    gross: "Gross",
    deductions: "Deductions",
    pf: "Provident Fund",
    tax: "Income Tax",
    loan: "Loan / Advance",
    total: "Total",
    netPayable: "Net Payable",
    footer: (year, company) => `Computer-generated payslip · ${year} ${company}`,
  },
  bn: {
    tabTitle: (empId, period) => `পে-স্লিপ ${empId} ${period}`,
    heading: period => `পে-স্লিপ · ${period}`,
    employee: "কর্মী",
    employeeId: "কর্মী আইডি",
    department: "বিভাগ",
    designation: "পদবি",
    run: "রান",
    generated: "তৈরি",
    earnings: "আয়",
    basic: "মূল বেতন",
    houseRent: "বাড়িভাড়া",
    medical: "চিকিৎসা ভাতা",
    transport: "যাতায়াত ভাতা",
    gross: "মোট",
    deductions: "কর্তন",
    pf: "প্রভিডেন্ট ফান্ড",
    tax: "আয়কর",
    loan: "ঋণ / অগ্রিম",
    total: "মোট",
    netPayable: "নিট প্রদেয়",
    footer: (year, company) => `কম্পিউটারে তৈরি পে-স্লিপ · ${year} ${company}`,
  },
};

export const payslipWords = (locale: Locale = "en"): PayslipWords => PAYSLIP_WORDS[locale] ?? PAYSLIP_WORDS.en;
