import type { Locale } from "./config";

/**
 * The patient portal's user guide, in both languages.
 *
 * It lives here rather than in the message files because it is prose, not
 * interface labels: whole topics of steps and notes, read once and never
 * interpolated. Same idea as libText.ts — the page keeps the structure (icons,
 * anchors, links) and asks this for the words.
 *
 * Written from the screens themselves: every step names a button that exists
 * and every rule is one the page or its API enforces. When a screen changes,
 * the section for it changes with it.
 */

export type GuideBlock =
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: { term: string; text: string }[] }
  | { kind: "text"; text: string }
  | { kind: "note"; text: string };

export type GuideTopic = { title: string; blocks: GuideBlock[] };

export type GuideSection = {
  id: string;
  title: string;
  summary: string;
  link?: { href: string; label: string };
  topics: GuideTopic[];
};

export type GuideText = {
  title: string;
  intro: string;
  searchPlaceholder: string;
  searchLabel: string;
  contents: string;
  questions: string;
  questionsBody: string;
  nothing: string;
  nothingHint: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
};

const EN: GuideText = {
  title: "User Guide",
  intro: "How to use your patient portal, page by page: booking doctors, managing visits, reading your records and paying bills.",
  searchPlaceholder: "Search the guide, e.g. reschedule, prescription, invoice",
  searchLabel: "Search the guide",
  contents: "Guide contents",
  questions: "Questions",
  questionsBody: "Things patients often run into.",
  nothing: "Nothing matches",
  nothingHint: "Try a single word, like booking, bill or profile.",
  sections: [
    {
      id: "getting-around",
      title: "Getting around",
      summary: "The sidebar takes you to each part of the portal. The bar along the top holds your account.",
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
            { kind: "text", text: "Click the pencil on your picture and choose an image: PNG, JPG, WebP, AVIF or SVG, up to 5 MB." },
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
            { kind: "text", text: "Click Add on a list, type a name and an optional detail, then Add again. The bin icon removes an entry." },
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
  ],
  faq: [
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
  ],
};

const BN: GuideText = {
  title: "ব্যবহারবিধি",
  intro: "আপনার রোগী প্যানেল কীভাবে ব্যবহার করবেন, পেজ ধরে ধরে: ডাক্তার বুক করা, ভিজিট পরিচালনা, রেকর্ড দেখা ও বিল পরিশোধ।",
  searchPlaceholder: "গাইডে খুঁজুন, যেমন: সময় বদলানো, প্রেসক্রিপশন, ইনভয়েস",
  searchLabel: "গাইডে খুঁজুন",
  contents: "গাইডের সূচি",
  questions: "প্রশ্ন",
  questionsBody: "রোগীরা প্রায়ই যেসব সমস্যায় পড়েন।",
  nothing: "কিছু মেলেনি",
  nothingHint: "একটি শব্দ দিয়ে চেষ্টা করুন, যেমন বুকিং, বিল বা প্রোফাইল।",
  sections: [
    {
      id: "getting-around",
      title: "পথ চেনা",
      summary: "পাশের মেনু থেকে প্যানেলের প্রতিটি অংশে যাওয়া যায়। উপরের বারে আপনার অ্যাকাউন্ট থাকে।",
      link: { href: "/patient/dashboard", label: "ড্যাশবোর্ড খুলুন" },
      topics: [
        {
          title: "পাশের মেনু",
          blocks: [
            {
              kind: "list",
              items: [
                { term: "ড্যাশবোর্ড", text: "আপনার পরের তিনটি অ্যাপয়েন্টমেন্ট, আর বুক করা বা ডাক্তার খোঁজার শর্টকাট।" },
                { term: "অ্যাপয়েন্টমেন্ট", text: "আপনার বুক করা সব ভিজিট, ক্যালেন্ডারসহ। এখান থেকেই সময় বদলান বা বাতিল করুন।" },
                { term: "ডাক্তার খুঁজুন", text: "হেলথফ্লোর হাসপাতালগুলোর ডাক্তার খুঁজে ভিজিট বুক করুন।" },
                { term: "বিলিং", text: "হাসপাতালগুলোর তৈরি ইনভয়েস, আর কতটা এখনো বাকি।" },
                { term: "মেডিক্যাল রেকর্ড", text: "সম্পন্ন ভিজিট, প্রেসক্রিপশন এবং আপনার নিজের আপলোড করা কাগজ।" },
                { term: "আমার প্রোফাইল", text: "আপনার তথ্য, পরিচয়পত্র, জরুরি যোগাযোগ ও রোগের ইতিহাস।" },
                { term: "ব্যবহারবিধি", text: "এই পেজটি।" },
              ],
            },
          ],
        },
        {
          title: "উপরের বার",
          blocks: [
            {
              kind: "list",
              items: [
                { term: "ঘড়ি", text: "হাসপাতালের সময় ও তারিখ। বুকিং আর \"আজ\" এই ঘড়ি ধরেই চলে, আপনার ফোন বা কম্পিউটারের নয়।" },
                { term: "EN / BN", text: "প্যানেলের ভাষা ইংরেজি ও বাংলার মধ্যে বদলান।" },
                { term: "ব্যক্তির আইকন", text: "আমার প্রোফাইল খোলে।" },
                { term: "সাইন আউট", text: "এই ডিভাইসে আপনার সেশন শেষ করে।" },
              ],
            },
          ],
        },
        {
          title: "সব হাসপাতালের জন্য একটাই অ্যাকাউন্ট",
          blocks: [
            {
              kind: "text",
              text: "আপনার হেলথফ্লো অ্যাকাউন্ট আপনার নিজের, কোনো হাসপাতালের নয়। কোনো হাসপাতালে প্রথমবার ডাক্তার বুক করলে সেই হাসপাতাল আপনার জন্য একটি রোগী-রেকর্ড খোলে, আপনার প্রোফাইলের তথ্য দিয়েই শুরু করে। আমার প্রোফাইলে আপনি কোন কোন হাসপাতালে নিবন্ধিত আর কে আপনাকে কোন রোগী আইডি দিয়েছে তা দেখা যায়।",
            },
            {
              kind: "note",
              text: "আগে কোনো হাসপাতালে সরাসরি গিয়ে চিকিৎসা নিয়েছেন? সেখানে বুক করার আগে প্রোফাইলে একই ফোন নম্বর দিন। হাসপাতাল ওই নম্বর দিয়ে আপনার পুরোনো রেকর্ড খুঁজে আপনার অ্যাকাউন্টের সাথে যুক্ত করবে, ফলে আপনার ইতিহাসও সাথে আসবে।",
            },
          ],
        },
      ],
    },
    {
      id: "profile",
      title: "আপনার প্রোফাইল",
      summary: "আপনার তথ্য, পরিচয় ও রোগের ইতিহাস হালনাগাদ রাখুন। প্রথমবার বুক করলে হাসপাতাল এখান থেকেই শুরু করে।",
      link: { href: "/patient/profile", label: "আমার প্রোফাইল খুলুন" },
      topics: [
        {
          title: "ব্যক্তিগত তথ্য",
          blocks: [
            {
              kind: "steps",
              items: [
                "আমার প্রোফাইল খুলুন। প্রথমে সাধারণ ট্যাব খোলে।",
                "ব্যক্তিগত তথ্যের পাশে সম্পাদনা চাপুন।",
                "নাম, জন্মতারিখ, লিঙ্গ, বৈবাহিক অবস্থা, এনআইডি বা পাসপোর্ট নম্বর, ফোন ও ঠিকানা হালনাগাদ করুন।",
                "সংরক্ষণ চাপুন।",
              ],
            },
            { kind: "note", text: "আপনার ইমেইল দিয়েই আপনি সাইন ইন করেন, তাই এখান থেকে সেটি বদলানো যায় না।" },
          ],
        },
        {
          title: "প্রোফাইল ছবি",
          blocks: [
            { kind: "text", text: "ছবির উপরের পেন্সিলে চাপ দিয়ে একটি ছবি বেছে নিন: PNG, JPG, WebP, AVIF বা SVG, সর্বোচ্চ 5 MB।" },
          ],
        },
        {
          title: "পরিচয় যাচাই",
          blocks: [
            {
              kind: "steps",
              items: [
                "পরিচয়পত্র অংশে জাতীয় পরিচয়পত্র (এনআইডি), পাসপোর্ট বা জন্মনিবন্ধন বেছে নিন।",
                "এর ছবি বা পিডিএফ আপলোড করুন, সর্বোচ্চ 10 MB।",
                "যাচাইকারী না দেখা পর্যন্ত এটি \"যাচাই চলছে\" দেখাবে।",
                "যাচাই হলে আপনার নামের পাশে একটি ব্যাজ আসবে। বাতিল হলে যাচাইকারীর নোটে কারণ লেখা থাকবে, আপনি আবার আপলোড করতে পারবেন।",
              ],
            },
            {
              kind: "note",
              text: "কখনো যদি আপনি নিজের কথা বলতে না পারা অবস্থায় হাসপাতালে আসেন, যাচাই করা কাগজ হাসপাতালকে জানাবে আপনি কে। কাগজের নম্বর বদলালে সেটি আবার যাচাইয়ে যায়।",
            },
          ],
        },
        {
          title: "জরুরি যোগাযোগ",
          blocks: [
            {
              kind: "steps",
              items: [
                "জরুরি যোগাযোগের পাশে সম্পাদনা চাপুন।",
                "তাঁর নাম, আপনার সাথে সম্পর্ক, ফোন এবং চাইলে ইমেইল ও ঠিকানা দিন।",
                "সংরক্ষণ চাপুন। নিচে তাঁর পরিচয়পত্রও আপলোড করতে পারবেন।",
              ],
            },
          ],
        },
        {
          title: "রোগের ইতিহাস",
          blocks: [
            {
              kind: "list",
              items: [
                { term: "শারীরিক মাপ", text: "ক্লিনিক্যাল ট্যাবে সম্পাদনা চেপে রক্তের গ্রুপ, উচ্চতা ও ওজন দিন।" },
                { term: "অ্যালার্জি", text: "যা কিছুতে আপনার প্রতিক্রিয়া হয়: ওষুধ, খাবার বা উপকরণ।" },
                { term: "চলমান রোগ", text: "যেসব দীর্ঘমেয়াদি রোগ নিয়ে আপনি চলছেন।" },
                { term: "চলমান ওষুধ", text: "নিয়মিত যা খান, দোকান থেকে কেনা ওষুধসহ।" },
                { term: "আগের অপারেশন", text: "আপনার যেসব অপারেশন বা প্রসিডিওর হয়েছে।" },
              ],
            },
            { kind: "text", text: "তালিকায় যোগ করুন চাপুন, একটি নাম ও চাইলে বিস্তারিত লিখে আবার যোগ করুন চাপুন। বিনের আইকনে এন্ট্রি মুছে যায়।" },
            {
              kind: "note",
              text: "কোনো হাসপাতালে প্রথমবার বুক করলে তারা এই তথ্যগুলো কপি করে নেয়। পরে আপনি যা বদলান তা আপনার প্রোফাইলে দেখা যায়, কিন্তু ওই হাসপাতালের কাছে থাকা রেকর্ড বদলায় না।",
            },
          ],
        },
        {
          title: "বিমা ও পরিবার",
          blocks: [{ kind: "text", text: "এই দুটি ট্যাব এখনো চালু হয়নি।" }],
        },
      ],
    },
    {
      id: "booking",
      title: "ডাক্তার খোঁজা ও বুক করা",
      summary: "নাম, বিশেষজ্ঞতা বা জায়গা দিয়ে ডাক্তার খুঁজুন, আর তাঁর সময়ের মধ্যে একটি সময় বুক করুন।",
      link: { href: "/patient/find-doctors", label: "ডাক্তার খুঁজুন পেজ খুলুন" },
      topics: [
        {
          title: "ডাক্তার খোঁজা",
          blocks: [
            {
              kind: "steps",
              items: [
                "ডাক্তার খুঁজুন খুলুন, অথবা ড্যাশবোর্ডে অ্যাপয়েন্টমেন্ট নিন চাপুন।",
                "খোঁজার ঘরে ডাক্তারের নাম, বিশেষজ্ঞতা বা এলাকা লিখুন, অথবা নিচ থেকে একটি বিশেষজ্ঞতা বেছে নিন।",
                "প্রতিটি কার্ডে ডাক্তারের রেটিং, কখন রোগী দেখেন এবং তাঁর হাসপাতাল দেখা যায়।",
                "পূর্ণ প্রোফাইল পড়তে ডাক্তারের নাম বা ছবিতে চাপুন।",
              ],
            },
          ],
        },
        {
          title: "অ্যাপয়েন্টমেন্ট বুক করা",
          blocks: [
            {
              kind: "steps",
              items: [
                "ডাক্তারের কার্ডে অ্যাপয়েন্টমেন্ট নিন চাপুন।",
                "একটি তারিখ ও সময় বেছে নিন। ফরমে ডাক্তার কোন দিন ও কোন সময়ে রোগী দেখেন তা লেখা থাকে।",
                "চাইলে ভিজিটের কারণ লিখুন। ডাক্তার তা পড়তে পারবেন।",
                "বুকিং নিশ্চিত করুন চাপুন। এরপর আপনাকে অ্যাপয়েন্টমেন্ট পেজে নেওয়া হবে, যেখানে নতুন ভিজিটটি থাকবে।",
              ],
            },
            {
              kind: "note",
              text: "পেরিয়ে যাওয়া তারিখ বা ডাক্তারের সময়ের বাইরের সময় বুক করা যায় না। ঘরের নিচের বার্তায় কী বদলাতে হবে তা লেখা থাকে। ঠিক আপনার আগে কেউ সময়টি নিয়ে নিলে আপনাকে অন্য সময় বাছতে বলা হবে।",
            },
          ],
        },
      ],
    },
    {
      id: "appointments",
      title: "অ্যাপয়েন্টমেন্ট পরিচালনা",
      summary: "আপনার বুক করা সব ভিজিট দেখুন, সময় বদলান বা বাতিল করুন।",
      link: { href: "/patient/appointments", label: "অ্যাপয়েন্টমেন্ট খুলুন" },
      topics: [
        {
          title: "আপনার অ্যাপয়েন্টমেন্ট",
          blocks: [
            {
              kind: "list",
              items: [
                { term: "আসন্ন", text: "আপনার বুক করা ভিজিট যেগুলো এখনো সম্পন্ন হয়নি।" },
                { term: "আগের", text: "হাসপাতাল যেগুলো সম্পন্ন হিসেবে চিহ্নিত করেছে।" },
                { term: "বাতিল", text: "আপনি বা হাসপাতাল যেগুলো বাতিল করেছে।" },
              ],
            },
            {
              kind: "note",
              text: "হাসপাতাল সম্পন্ন না করা পর্যন্ত ভিজিটটি আসন্ন-তেই থাকে। এরপর সেটি আগের-এ চলে যায়, আর ডাক্তারের নোট ও প্রেসক্রিপশন মেডিক্যাল রেকর্ডে দেখা যায়।",
            },
          ],
        },
        {
          title: "সময় বদলানো",
          blocks: [
            {
              kind: "steps",
              items: [
                "আসন্ন কোনো অ্যাপয়েন্টমেন্টে সময় বদলান চাপুন।",
                "নতুন তারিখ ও সময় বেছে নিন। এটি একই ডাক্তারের সময়ের মধ্যে হতে হবে।",
                "নতুন সময় সংরক্ষণ করুন চাপুন।",
              ],
            },
          ],
        },
        {
          title: "বাতিল করা",
          blocks: [
            {
              kind: "text",
              text: "আসন্ন কোনো অ্যাপয়েন্টমেন্টে বাতিল করুন চাপুন। কোনো নিশ্চিতকরণ ছাড়াই সাথে সাথে বাতিল হয়ে যায়, তাই আগে দেখে নিন এটিই ঠিক ভিজিট কিনা। ওই ডাক্তারকে আবার দেখাতে নতুন করে বুক করুন।",
            },
          ],
        },
        {
          title: "ক্যালেন্ডার",
          blocks: [
            {
              kind: "text",
              text: "যেসব দিনে অ্যাপয়েন্টমেন্ট আছে সেগুলোর চারপাশে বৃত্ত থাকে, আর আজকের দিনটি ভরাট থাকে। কোনো দিনে চাপ দিলে সেদিন কয়টি অ্যাপয়েন্টমেন্ট তা দেখা যায়; তীর চিহ্নে মাস বদলান।",
            },
          ],
        },
      ],
    },
    {
      id: "records",
      title: "মেডিক্যাল রেকর্ড",
      summary: "সম্পন্ন ভিজিটে ডাক্তাররা যা লিখেছেন তার সবকিছু, সাথে আপনার নিজের কাগজপত্র।",
      link: { href: "/patient/medical-records", label: "মেডিক্যাল রেকর্ড খুলুন" },
      topics: [
        {
          title: "আপনার সর্বশেষ ভিজিট",
          blocks: [
            {
              kind: "list",
              items: [
                { term: "প্রেসক্রিপশন", text: "ডাক্তার যে প্রেসক্রিপশনটি প্রিন্ট করেছিলেন ঠিক সেটিই, প্রিন্ট বা সংরক্ষণের জন্য প্রস্তুত।" },
                { term: "পূর্ণ রিপোর্ট", text: "সমস্যা, পরীক্ষায় পাওয়া, পরীক্ষা-নিরীক্ষা, রোগনির্ণয়, পরামর্শ, ওষুধ, নোট ও রক্তচাপ।" },
                { term: "কার্যক্রমের সময়রেখা", text: "আপনার সর্বশেষ চারটি ভিজিট, ডাক্তার ও হাসপাতালসহ।" },
              ],
            },
          ],
        },
        {
          title: "ওষুধ ও আগের ভিজিট",
          blocks: [
            {
              kind: "list",
              items: [
                { term: "ওষুধের ইতিহাস", text: "আপনাকে দেওয়া সব ওষুধ, নতুনগুলো আগে। পুরো তালিকা দেখতে সব দেখুন চাপুন।" },
                { term: "ভিজিটের ইতিহাস", text: "সব সম্পন্ন ভিজিট। প্রেসক্রিপশন বা রোগনির্ণয় আছে এমন ভিজিটে ফিল্টার করুন, আর যেকোনো সারিতে প্রেসক্রিপশন চেপে সেটির শিট খুলুন।" },
              ],
            },
          ],
        },
        {
          title: "নিজের কাগজ যোগ করা",
          blocks: [
            {
              kind: "steps",
              items: [
                "ডকুমেন্ট অংশে বেছে নিন এটি কী: প্রেসক্রিপশন, টেস্ট বা ল্যাব রিপোর্ট, এক্স-রে বা স্ক্যান, ডিসচার্জ সামারি, টিকার রেকর্ড, বিমা, বা অন্যান্য।",
                "একটি নাম দিন, আর কাগজে ছাপা তারিখ জানা থাকলে সেটিও দিন।",
                "একটি ছবি বা পিডিএফ আপলোড করুন, সর্বোচ্চ 10 MB।",
                "ধরন অনুযায়ী তালিকা ফিল্টার করুন। বিনের আইকনে কাগজটি মুছে যায়।",
              ],
            },
            {
              kind: "note",
              text: "হেলথফ্লোতে আসার আগের বা অন্য ক্লিনিকের রিপোর্টের জন্য এটি ব্যবহার করুন। প্রথম ভিজিটের আগেও কাগজ যোগ করতে পারেন, আর শুধু আপনিই সেগুলো খুলতে পারবেন।",
            },
          ],
        },
      ],
    },
    {
      id: "billing",
      title: "বিলিং",
      summary: "হাসপাতালগুলোর ইনভয়েস, কতটা বাকি আছে এবং কীভাবে পরিশোধ করবেন।",
      link: { href: "/patient/billing", label: "বিলিং খুলুন" },
      topics: [
        {
          title: "বিল কোথা থেকে আসে",
          blocks: [
            {
              kind: "list",
              items: [
                { term: "পরামর্শ", text: "ভিজিট সম্পন্ন হলে ডাক্তারের ফি বাবদ তৈরি হয়।" },
                { term: "হাসপাতালে থাকা", text: "ছাড়পত্রের সময় তৈরি হয়: বেড বা কেবিনে প্রতিদিনের খরচ, সাথে নার্সিং সেবা।" },
                { term: "অন্যান্য", text: "হাসপাতালের বিলিং ডেস্ক নিজে যা যোগ করে।" },
              ],
            },
            { kind: "text", text: "ভিজিট বা ছাড়পত্র থেকে তৈরি বিলের মেয়াদ তৈরির এক সপ্তাহ পর।" },
          ],
        },
        {
          title: "বিল পড়া",
          blocks: [
            {
              kind: "list",
              items: [
                { term: "মোট বকেয়া", text: "সব হাসপাতাল মিলিয়ে আপনার এখনো যা পরিশোধ করা হয়নি।" },
                { term: "শেষ পেমেন্ট ও আসন্ন বকেয়া", text: "সর্বশেষ যে বিলটি পরিশোধ করেছেন, আর পরের যেটির মেয়াদ আসছে।" },
                { term: "অবস্থা", text: "অপরিশোধিত, মেয়াদ পেরোলে মেয়াদোত্তীর্ণ, অথবা পরিশোধিত।" },
                { term: "চোখের আইকন", text: "হাসপাতালে থাকার বিলে প্রতিটি খরচ তার দিন, দৈনিক হার ও পরিমাণসহ দেখায়।" },
              ],
            },
          ],
        },
        {
          title: "বিল পরিশোধ",
          blocks: [
            {
              kind: "text",
              text: "অনলাইন পেমেন্ট এখনো চালু হয়নি। হাসপাতালের বিলিং ডেস্কে পরিশোধ করুন। তারা ইনভয়েসটি পরিশোধিত চিহ্নিত করলে এখানেও পরিশোধিত দেখাবে।",
            },
          ],
        },
      ],
    },
  ],
  faq: [
    {
      q: "আমি অ্যাপয়েন্টমেন্টে গিয়েছিলাম, কিন্তু এখনো আসন্ন দেখাচ্ছে।",
      a: "হাসপাতাল ভিজিটটিকে সম্পন্ন হিসেবে চিহ্নিত করে। তার আগে ভিজিটটি আসন্ন-তেই থাকে। সম্পন্ন হলে সেটি আগের-এ চলে যায় আর এর নোট ও প্রেসক্রিপশন মেডিক্যাল রেকর্ডে দেখা যায়।",
    },
    {
      q: "বুকিং ফরম আমার চাওয়া সময়টি নিচ্ছে না।",
      a: "ডাক্তার যেসব দিন ও সময়ে রোগী দেখেন কেবল সেই সময়েই বুক করা যায়, আর সময়টি অতীতে হতে পারে না। ফরমটি উপরের বারের হাসপাতালের ঘড়ি ধরে চলে, যা আপনার ডিভাইসের সময় থেকে আলাদা হতে পারে।",
    },
    {
      q: "আগের হাসপাতাল ভিজিটের রেকর্ড দেখতে পাচ্ছি না।",
      a: "প্রোফাইলে দেওয়া একই ফোন নম্বর দিয়ে ওই হাসপাতালে অনলাইনে বুক করলে আপনার পুরোনো রেকর্ড অ্যাকাউন্টের সাথে যুক্ত হয়। আমার প্রোফাইলে নম্বরটি দিন, তারপর বুক করুন।",
    },
    {
      q: "একটি বিল ভুল মনে হচ্ছে।",
      a: "ওই হাসপাতালের বিলিং ডেস্কে যোগাযোগ করুন। কেবল হাসপাতালই ইনভয়েস বদলাতে বা পরিশোধিত চিহ্নিত করতে পারে।",
    },
    {
      q: "আমি কি আমার ইমেইল বদলাতে পারি?",
      a: "প্যানেল থেকে নয়। এই ঠিকানা দিয়েই আপনি সাইন ইন করেন।",
    },
    {
      q: "ডাক্তারের দেওয়া প্রেসক্রিপশনগুলো কোথায়?",
      a: "মেডিক্যাল রেকর্ডে। সর্বশেষ ভিজিটে, অথবা ভিজিটের ইতিহাসের যেকোনো ভিজিটে প্রেসক্রিপশন চাপুন।",
    },
  ],
};

export const patientGuideText = (locale: Locale): GuideText => (locale === "bn" ? BN : EN);
