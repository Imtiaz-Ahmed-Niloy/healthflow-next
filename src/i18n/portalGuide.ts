import type { Locale } from "./config";

/**
 * The doctor panel's manual, in both languages.
 *
 * Prose rather than interface labels, so it lives here beside patientGuide.ts
 * instead of in the message files; the page keeps the icons and the layout.
 *
 * The rule for this text: if it is written here, it works. Anything asked for
 * often enough to be worth mentioning but not built yet is named in "Not here
 * yet", where it cannot be mistaken for a feature.
 */

export type GuideFeature = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tips: string[];
};

export type PortalGuideText = {
  kicker: string;
  title: string;
  intro: string;
  startReading: string;
  walkthroughsKicker: string;
  walkthroughsTitle: string;
  expandHint: string;
  stepByStep: string;
  worthKnowing: string;
  notYetKicker: string;
  notYetTitle: string;
  notYetIntro: string;
  faqKicker: string;
  faqTitle: string;
  faqIntro: string;
  sections: GuideFeature[];
  quickTips: { id: string; t: string; d: string }[];
  notYet: string[];
  faqs: { q: string; a: string }[];
};

const EN: PortalGuideText = {
  kicker: "DOCTOR PANEL · USER GUIDE",
  title: "How your panel works",
  intro: "Every screen you have — queue, prescriptions, your patients, your schedule and the doctors' community — and what each one actually does. If it is written here, it works; what is not built yet is listed at the end rather than described as though it were.",
  startReading: "Start reading",
  walkthroughsKicker: "FEATURE WALK-THROUGHS",
  walkthroughsTitle: "Panel features",
  expandHint: "Click a card to expand the step-by-step guide.",
  stepByStep: "STEP-BY-STEP",
  worthKnowing: "WORTH KNOWING",
  notYetKicker: "NOT HERE YET",
  notYetTitle: "What the panel does not do",
  notYetIntro: "Written down so you do not go looking. These are the things doctors ask for that are not built — if one of them is blocking you, tell your hospital's administrator so it can be prioritised.",
  faqKicker: "FAQ",
  faqTitle: "Common questions",
  faqIntro: "Answers for what the panel actually does today.",
  sections: [
    {
      id: "queue",
      title: "Patient Queue",
      summary: "Today's list, in the order you will see them — and where a consultation starts.",
      steps: [
        "Open Queue. It shows today's appointments booked with you, soonest first, with how long each patient has been waiting.",
        "The tiles above the list are real counts: seen, remaining, and the average wait so far today.",
        "Filter by priority — High, Standard or Routine — using the buttons over the list. The priority is set when the appointment is booked.",
        "Someone arriving without an appointment goes in through Add Walk-in Patient: the name is the only thing required — date of birth, phone and reason for visit are all optional — and it creates the patient and today's appointment together.",
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
      title: "Schedule",
      summary: "Your appointments by month and by day, past and upcoming.",
      steps: [
        "Move between months with the arrows; pick a day to see that day's list beside the calendar.",
        "Each entry shows the time, the patient, the reason and whether the visit is scheduled, completed or cancelled.",
        "Open a scheduled visit to go straight into the consultation for it.",
      ],
      tips: [
        "Schedule shows your appointments; it is not where availability is set. A hospital sets your hours there; your own chamber's hours are on My Chambers.",
        "Days with appointments are marked on the calendar, so an empty week is visible at a glance.",
      ],
    },
    {
      id: "chambers",
      title: "My Chambers",
      summary: "Your own practice: where patients book you outside any hospital.",
      steps: [
        "Open My Chambers and press Add chamber. Give it a name, the address, the phone patients should call, your fee and your hours.",
        "It is taking bookings as soon as you save. Patients find you on HealthFlow and book you there, inside the hours you set.",
        "Those patients come into your Queue, Schedule and Directory with everyone else's, labelled with the chamber. Consult and prescribe exactly as at a hospital — the prescription prints the chamber's name, address and phone.",
        "Edit changes the details, fee or hours at any time. Close to bookings takes it off the list; appointments already booked stay, and Reopen puts it back.",
      ],
      tips: [
        "You can have more than one chamber, each with its own fee and hours.",
        "A hospital's fee and hours for you are the hospital's to set. Your chamber's are yours.",
      ],
    },
    {
      id: "community",
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
  ],
  quickTips: [
    { id: "printing", t: "Printing", d: "Print from the prescription itself. The page you are looking at is the page that prints — there is no separate export step." },
    { id: "medicines", t: "Medicines you use", d: "The picker's default list is your own most-prescribed, counted as you prescribe. It gets better without you maintaining it." },
    { id: "walkins", t: "Walk-ins", d: "Add Walk-in Patient in the Queue registers the patient and books today's visit in one step." },
    { id: "privacy", t: "What others can see", d: "Your patients, charts and queue are your hospital's alone. Only the Community feed reaches beyond it." },
  ],
  notYet: [
    "Setting your hours at a hospital — the hospital sets them. (Your own chamber's hours are yours, on My Chambers.)",
    "Requesting leave. Ask your hospital's admin; HR keeps leave in the admin panel, not here.",
    "Video consultation. The telehealth page is not connected to anything yet.",
    "Sending a prescription to a patient by SMS or email. It prints; the patient portal shows their own records separately.",
    "Editing another doctor's community post, or seeing who reacted to yours by name.",
  ],
  faqs: [
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
      a: "Queue → Add Walk-in Patient. The name is the only required field; date of birth, phone and reason are optional. It creates the patient record and today's appointment together, and they appear in your queue immediately.",
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
  ],
};

const BN: PortalGuideText = {
  kicker: "ডাক্তার প্যানেল · ব্যবহারবিধি",
  title: "আপনার প্যানেল যেভাবে কাজ করে",
  intro: "আপনার প্রতিটি স্ক্রিন — সারি, প্রেসক্রিপশন, আপনার রোগী, আপনার সময়সূচি আর ডাক্তারদের কমিউনিটি — এবং কোনটি আসলে কী করে। এখানে যা লেখা আছে তা কাজ করে; যা এখনো তৈরি হয়নি তা শেষে আলাদা করে লেখা আছে, আছে বলে দেখানো হয়নি।",
  startReading: "পড়া শুরু করুন",
  walkthroughsKicker: "ফিচারের ধাপে ধাপে বর্ণনা",
  walkthroughsTitle: "প্যানেলের ফিচার",
  expandHint: "ধাপে ধাপে দেখতে একটি কার্ডে চাপ দিন।",
  stepByStep: "ধাপে ধাপে",
  worthKnowing: "জেনে রাখা ভালো",
  notYetKicker: "এখনো নেই",
  notYetTitle: "প্যানেল যা করে না",
  notYetIntro: "লিখে রাখা হলো যাতে আপনি খুঁজে সময় নষ্ট না করেন। ডাক্তাররা যেসব চান কিন্তু এখনো তৈরি হয়নি, সেগুলোই এখানে — কোনোটি আপনার কাজে বাধা দিলে আপনার হাসপাতালের অ্যাডমিনকে জানান, যাতে সেটিকে অগ্রাধিকার দেওয়া যায়।",
  faqKicker: "সাধারণ প্রশ্ন",
  faqTitle: "প্রায়ই যা জিজ্ঞাসা করা হয়",
  faqIntro: "প্যানেল আজ আসলে যা করে, তার উত্তর।",
  sections: [
    {
      id: "queue",
      title: "রোগীর সারি",
      summary: "আজ যাঁদের দেখবেন, যে ক্রমে দেখবেন — আর এখান থেকেই পরামর্শ শুরু হয়।",
      steps: [
        "সারি খুলুন। আপনার সাথে বুক করা আজকের অ্যাপয়েন্টমেন্টগুলো আগে-পরে অনুযায়ী দেখা যায়, সাথে কে কতক্ষণ অপেক্ষা করছেন।",
        "তালিকার উপরের ঘরগুলো সত্যিকারের সংখ্যা: দেখা হয়েছে, বাকি আছে, আর আজ পর্যন্ত গড় অপেক্ষা।",
        "তালিকার উপরের বোতাম দিয়ে অগ্রাধিকার অনুযায়ী ফিল্টার করুন — উচ্চ, সাধারণ বা রুটিন। অগ্রাধিকার ঠিক হয় অ্যাপয়েন্টমেন্ট বুক করার সময়।",
        "অ্যাপয়েন্টমেন্ট ছাড়া কেউ এলে ওয়াক-ইন রোগী যোগ করুন দিয়ে যোগ করুন: শুধু নামটাই বাধ্যতামূলক — জন্মতারিখ, ফোন ও আসার কারণ ঐচ্ছিক — এবং এটি রোগী ও আজকের অ্যাপয়েন্টমেন্ট দুটোই একসাথে তৈরি করে।",
        "পরামর্শ শুরু চাপলে ওই ভিজিটের প্রেসক্রিপশন প্যাড খোলে। সেখানে যা লিখবেন সবই ওই অ্যাপয়েন্টমেন্টের সাথে যুক্ত থাকে।",
        "নিচের আজ দেখা হয়েছে অংশে আপনি যাঁদের শেষ করেছেন তাঁরা থাকেন — একটি খুললে চার্টটি আবার পড়া যায়।",
      ],
      tips: [
        "সারিটি শুধু আপনার। এখানে কেবল আপনার সাথে করা অ্যাপয়েন্টমেন্টই থাকে, হাসপাতালের পুরো দিন নয়।",
        "যে রোগীর পরামর্শ শুরু হয়ে গেছে তিনি অপেক্ষায় না দেখিয়ে পরামর্শে দেখান, তাই আপনি ট্যাব ছেড়ে গিয়ে আবার ফিরে আসতে পারেন।",
      ],
    },
    {
      id: "prescription",
      title: "প্রেসক্রিপশন",
      summary: "পরামর্শটি নিজেই: সমস্যা, পরীক্ষা, রোগনির্ণয়, ওষুধ ও পরামর্শ।",
      steps: [
        "সারির পরামর্শ শুরু থেকে, অথবা আজ দেখা হয়েছে-র কোনো ভিজিট থেকে এখানে আসা যায়। এটি সবসময় একটি অ্যাপয়েন্টমেন্টের।",
        "যে অংশগুলো দরকার সেগুলো পূরণ করুন — প্রধান সমস্যা, পরীক্ষা, পরীক্ষা-নিরীক্ষা, রোগনির্ণয়, পরামর্শ। প্রতিটিতে যত খুশি লাইন দেওয়া যায়, আর ফাঁকা অংশ প্রিন্টেই আসে না।",
        "রক্তচাপ ভিজিটের সাথে রাখা হয়; উচ্চতা ও ওজন আসে রোগীর রেকর্ড থেকে।",
        "ওষুধ যোগ করুন ডোজ, সেবনবিধি, দিন এবং খাবারের আগে না পরে তা দিয়ে। পিকার আপনার নিজের ইতিহাস থেকে গুনে সবচেয়ে বেশি দেওয়া ওষুধগুলো দেখায়, কারও টাইপ করা তালিকা নয়।",
        "প্রিন্ট ও জমা চাপলে প্রেসক্রিপশন প্রিন্ট হয় এবং ভিজিটটি সম্পন্ন চিহ্নিত হয়।",
        "সম্পন্ন কোনো ভিজিট আবার খুললে আপনার লেখা সবকিছু দেখা যায়। বদলে আবার সংরক্ষণ করুন — চার্টটি চলমান, তালাবদ্ধ কোনো কপি নয়।",
      ],
      tips: [
        "আপনি যা লেখেন তা লেখার সাথে সাথেই এই ব্রাউজারে রাখা থাকে, তাই পরামর্শের মাঝখানে রিলোড বা বিদ্যুৎ চলে গেলেও হারায় না। প্রিন্ট ও জমা দিলে তা রোগীর রেকর্ডে যায়।",
        "স্ক্রিনে যা দেখছেন সেটিই প্রিন্ট হয়। প্রিন্ট স্টাইলশিট প্যানেলের বাকি অংশ লুকিয়ে দেয়, আলাদা করে পেজ বানায় না।",
        "ওষুধের তালিকা প্রতিটি ডাক্তার ও প্রতিটি ডোজ আলাদা করে মনে রাখে: একই ওষুধের 20mg আর 40mg আলাদা, ইচ্ছে করেই।",
      ],
    },
    {
      id: "directory",
      title: "রোগী তালিকা",
      summary: "আপনি যাঁদের দেখেছেন, আর তাঁদের সম্পর্কে আপনি যা লিখেছেন।",
      steps: [
        "নাম, ফোন বা এমআরএন দিয়ে খুঁজুন।",
        "কোনো রোগী খুললে আপনার সাথে তাঁর ভিজিটের ইতিহাস দেখা যায়: প্রতিটি পরামর্শের সমস্যা, রোগনির্ণয় ও ওষুধ।",
        "রোগগুলো তাঁর ভিজিটগুলোর রোগনির্ণয় থেকে জড়ো করা — এটি আপনার লেখারই সারাংশ, আলাদা করে রাখার মতো কোনো তালিকা নয়।",
        "নজর দরকার মানে একটিই নির্দিষ্ট বিষয়: এই রোগীর একটি আসন্ন অ্যাপয়েন্টমেন্ট উচ্চ অগ্রাধিকার হিসেবে চিহ্নিত। এটি কোনো ঝুঁকির স্কোর নয়।",
      ],
      tips: [
        "এটি আপনার নিজের তালিকা। যাঁর সাথে আপনার কখনো অ্যাপয়েন্টমেন্ট হয়নি, তিনি এখানে আসবেন না — হাসপাতালে নিবন্ধিত থাকলেও নয়।",
        "যে মাপগুলো দেখানো হয় সেগুলোই সিস্টেম রাখে — রক্তচাপ, উচ্চতা ও ওজন। হৃদস্পন্দন বা SpO2 কোথাও রাখা হয় না, তাই দেখানোও হয় না।",
      ],
    },
    {
      id: "schedule",
      title: "সময়সূচি",
      summary: "মাস ও দিন ধরে আপনার অ্যাপয়েন্টমেন্ট, আগের ও আসন্ন।",
      steps: [
        "তীর চিহ্ন দিয়ে মাস বদলান; কোনো দিনে চাপ দিলে ক্যালেন্ডারের পাশে সেদিনের তালিকা দেখা যায়।",
        "প্রতিটি সারিতে সময়, রোগী, কারণ এবং ভিজিটটি নির্ধারিত, সম্পন্ন না বাতিল তা দেখা যায়।",
        "নির্ধারিত কোনো ভিজিট খুললে সরাসরি সেটির পরামর্শে চলে যাওয়া যায়।",
      ],
      tips: [
        "সময়সূচিতে আপনার অ্যাপয়েন্টমেন্ট দেখা যায়; এখানে আপনার সময় ঠিক করা হয় না। হাসপাতালে আপনার সময় হাসপাতাল ঠিক করে; নিজের চেম্বারের সময় আমার চেম্বার পেজে।",
        "যেসব দিনে অ্যাপয়েন্টমেন্ট আছে সেগুলো ক্যালেন্ডারে চিহ্নিত থাকে, তাই ফাঁকা সপ্তাহ এক নজরেই বোঝা যায়।",
      ],
    },
    {
      id: "chambers",
      title: "আমার চেম্বার",
      summary: "আপনার নিজের প্র্যাকটিস: হাসপাতালের বাইরে রোগীরা যেখানে আপনাকে বুক করেন।",
      steps: [
        "আমার চেম্বার খুলে চেম্বার যোগ করুন চাপুন। নাম, ঠিকানা, রোগীরা যে নম্বরে ফোন করবেন, আপনার ফি ও সময় দিন।",
        "সংরক্ষণ করার সাথে সাথেই এটি বুকিং নিতে শুরু করে। রোগীরা হেলথফ্লোতে আপনাকে খুঁজে আপনার দেওয়া সময়ের মধ্যে বুক করেন।",
        "সেই রোগীরা বাকিদের সাথেই আপনার সারি, সময়সূচি ও রোগী তালিকায় আসেন, চেম্বারের নামসহ। হাসপাতালের মতোই পরামর্শ ও প্রেসক্রিপশন দিন — প্রেসক্রিপশনে চেম্বারের নাম, ঠিকানা ও ফোন ছাপা হয়।",
        "সম্পাদনা দিয়ে যেকোনো সময় তথ্য, ফি বা সময় বদলান। বুকিং বন্ধ করুন দিলে এটি তালিকা থেকে সরে যায়; আগে বুক করা অ্যাপয়েন্টমেন্ট থাকে, আর আবার চালু করুন দিলে ফিরে আসে।",
      ],
      tips: [
        "আপনার একাধিক চেম্বার থাকতে পারে, প্রতিটির নিজের ফি ও সময়সহ।",
        "হাসপাতালে আপনার ফি ও সময় হাসপাতালের ঠিক করার বিষয়। চেম্বারেরটি আপনার।",
      ],
    },
    {
      id: "community",
      title: "কমিউনিটি",
      summary: "হেলথফ্লোর ডাক্তারদের সাথে প্রশ্ন করুন, উত্তর দিন, কেস নিয়ে আলোচনা করুন।",
      steps: [
        "উপরের ঘরে লিখুন আর বেছে নিন এটি কী: আলোচনা, প্রশ্ন, কেস স্টাডি বা ভাবনা।",
        "সর্বোচ্চ চারটি ছবি যোগ করুন — ইসিজি, এক্স-রে, চার্টের ছবি। এগুলো অ্যাপের ভেতর দিয়ে না গিয়ে সরাসরি স্টোরেজে আপলোড হয়।",
        "লাইক, ভালোবাসা বা অন্তর্দৃষ্টিপূর্ণ দিয়ে প্রতিক্রিয়া জানান। প্রতি পোস্টে প্রতি ডাক্তারের একটি প্রতিক্রিয়া: একই বোতাম আবার চাপলে সেটি উঠে যায়, অন্যটি চাপলে বদলে যায়।",
        "সাধারণভাবে মন্তব্য করুন, অথবা আপনি কী করতেন তা বললে পরামর্শ হিসেবে দিন ব্যবহার করুন — ওই উত্তরগুলো আলাদা করে চিহ্নিত থাকে।",
        "নিজের পোস্ট যেকোনো সময় সরাতে পারেন।",
      ],
      tips: [
        "ফিডে প্ল্যাটফর্মের সব ডাক্তার আছেন, শুধু আপনার হাসপাতালের নয়, আর প্রত্যেকের নামের পাশে তাঁর হাসপাতাল দেখা যায়।",
        "পোস্ট যার কথা বলে তা পোস্টের সাথে যায় না: রোগী, অ্যাপয়েন্টমেন্ট ও প্রেসক্রিপশন আপনার হাসপাতালের ভেতরেই থাকে। কেস নিয়ে লিখুন, রোগীর পরিচয় নিয়ে নয়।",
      ],
    },
    {
      id: "account",
      title: "আপনার অ্যাকাউন্ট",
      summary: "আপনি কীভাবে সাইন ইন করেন, আর কে কী বদলাতে পারে।",
      steps: [
        "আপনার প্রোফাইল অনুমোদিত হলে হাসপাতালের অ্যাডমিন আপনার লগইন তৈরি করেন — ডাক্তারদের জন্য নিজে সাইন আপ করার সুযোগ নেই।",
        "পাসওয়ার্ড ভুলে গেছেন? সাইন-ইন পেজে পাসওয়ার্ড ভুলে গেছেন ব্যবহার করুন; রিসেট লিংক আপনার নিবন্ধিত ঠিকানায় যাবে।",
        "পাসওয়ার্ড কখনো না পেলে হাসপাতালের অ্যাডমিন হসপিটাল ম্যানেজমেন্ট থেকে তা দেখে দিতে বা রিসেট করে দিতে পারেন।",
        "তারিখ, সময় ও মুদ্রা প্ল্যাটফর্মের সেটিংস অনুযায়ী চলে, যদি না আপনি সেটিংসে নিজের পছন্দ ঠিক করেন।",
      ],
      tips: [
        "ভাগ করা কম্পিউটারে সাইন আউট করুন। একটি সেশন যে ব্রাউজারে খোলা হয়েছে সেটিরই।",
        "পোস্ট ও প্রেসক্রিপশনে আপনার নাম, ছবি ও বিশেষজ্ঞতা আসে আপনার ডাক্তার প্রোফাইল থেকে — ঠিক করাতে হাসপাতালের অ্যাডমিনকে বলুন।",
      ],
    },
  ],
  quickTips: [
    { id: "printing", t: "প্রিন্ট", d: "প্রেসক্রিপশন থেকেই প্রিন্ট করুন। আপনি যে পেজটি দেখছেন সেটিই প্রিন্ট হয় — আলাদা কোনো এক্সপোর্ট ধাপ নেই।" },
    { id: "medicines", t: "আপনার ওষুধ", d: "পিকারের ডিফল্ট তালিকা আপনার নিজের সবচেয়ে বেশি দেওয়া ওষুধ, আপনি দেওয়ার সাথে সাথেই গোনা হয়। আপনাকে কিছু করতে হয় না, তালিকাটি নিজেই ভালো হয়।" },
    { id: "walkins", t: "ওয়াক-ইন", d: "সারিতে ওয়াক-ইন রোগী যোগ করুন এক ধাপেই রোগীকে নিবন্ধন করে আজকের ভিজিট বুক করে দেয়।" },
    { id: "privacy", t: "অন্যরা কী দেখতে পায়", d: "আপনার রোগী, চার্ট ও সারি কেবল আপনার হাসপাতালের। শুধু কমিউনিটি ফিডই এর বাইরে যায়।" },
  ],
  notYet: [
    "হাসপাতালে নিজের সময় ঠিক করা — সেটি হাসপাতাল ঠিক করে। (নিজের চেম্বারের সময় আপনারই, আমার চেম্বার পেজে।)",
    "ছুটির আবেদন। হাসপাতালের অ্যাডমিনকে বলুন; ছুটি এইচআর অ্যাডমিন প্যানেলে রাখে, এখানে নয়।",
    "ভিডিও পরামর্শ। টেলিহেলথ পেজটি এখনো কিছুর সাথে যুক্ত নয়।",
    "রোগীকে এসএমএস বা ইমেইলে প্রেসক্রিপশন পাঠানো। এটি প্রিন্ট হয়; রোগী তাঁর নিজের প্যানেলে আলাদাভাবে রেকর্ড দেখেন।",
    "অন্য ডাক্তারের কমিউনিটি পোস্ট সম্পাদনা, অথবা আপনার পোস্টে কে কে প্রতিক্রিয়া দিয়েছেন তা নাম ধরে দেখা।",
  ],
  faqs: [
    {
      q: "জমা দেওয়ার পর কি প্রেসক্রিপশন বদলানো যায়?",
      a: "হ্যাঁ। আজ দেখা হয়েছে বা সময়সূচি থেকে ভিজিটটি আবার খুলুন, যা দরকার বদলে সংরক্ষণ করুন। চার্টটি চলমান — তালাবদ্ধ কোনো কপি নেই, আলাদা সংশোধনের ধাপও নেই। প্রতিটি পরিবর্তন প্ল্যাটফর্মের অডিট রেকর্ডে থাকে।",
    },
    {
      q: "আমার তালিকায় একজন রোগীকে দেখতে পাচ্ছি না কেন?",
      a: "তালিকাটি আপনার নিজের অ্যাপয়েন্টমেন্ট থেকে তৈরি, তাই আপনার সাথে ভিজিট বুক হলেই রোগী সেখানে আসেন। তিনি হাসপাতালে নতুন হলে আগে রিসেপশন বা হাসপাতালের অ্যাডমিন নিবন্ধন করেন; ভিজিটটি অন্য ডাক্তারের সাথে হলে তিনি সেই ডাক্তারের তালিকায় থাকবেন, আপনার নয়।",
    },
    {
      q: "কেউ অ্যাপয়েন্টমেন্ট ছাড়া চলে এসেছেন। কী করব?",
      a: "সারি → ওয়াক-ইন রোগী যোগ করুন। শুধু নামটাই বাধ্যতামূলক; জন্মতারিখ, ফোন ও কারণ ঐচ্ছিক। এটি রোগীর রেকর্ড ও আজকের অ্যাপয়েন্টমেন্ট একসাথে তৈরি করে, আর তিনি সাথে সাথেই আপনার সারিতে আসেন।",
    },
    {
      q: "কমিউনিটিতে আমি যা লিখি তা কারা দেখতে পায়?",
      a: "যেকোনো হাসপাতালের হেলথফ্লোর সব ডাক্তার, আর আপনার নিজের হাসপাতালের অ্যাডমিন। আর কেউ নয় — অন্য হাসপাতালের অ্যাডমিন নয়, নার্স নয়, রোগীও নয়। ওষুধ নিয়ে লিখুন, মানুষটিকে নিয়ে নয়: রোগীর পরিচয় বোঝা যায় এমন কিছু পোস্টে দেবেন না।",
    },
    {
      q: "কোনো দিন ছুটি হিসেবে বন্ধ করব কীভাবে?",
      a: "এখান থেকে এখনো নয়। হাসপাতালের অ্যাডমিন ছুটি পরিচালনা করেন, আর অ্যাডমিন প্যানেলে সেটি মাথায় রেখেই অ্যাপয়েন্টমেন্ট বুক হয়। সময়সূচিতে আপনি দেখতে পান কী কী বুক হয়েছে।",
    },
    {
      q: "প্যানেলে সময় বা তারিখের ফরম্যাট ভুল দেখাচ্ছে।",
      a: "এগুলো আসে প্ল্যাটফর্মের ডিফল্ট থেকে, যা সুপার অ্যাডমিন ঠিক করেন, আর সেটিংসে আপনি নিজে কিছু বেছে নিলে সেটি থেকে। আপনারটি প্ল্যাটফর্মেরটির উপরে থাকে।",
    },
  ],
};

export const portalGuideText = (locale: Locale): PortalGuideText => (locale === "bn" ? BN : EN);
