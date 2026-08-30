# Where we are

Every menu item, by panel.

**✅** = on real data, saves, survives a refresh, isolated per hospital
**❌** = still on demo data, or only half wired

Last checked: 30 Aug 2026

---

## Super Admin

| | | Ticket |
|---|---|---|
| ✅ | Dashboard | HF-36 |
| ✅ | Hospitals | HF-35 |
| ✅ | Roles & Permissions | HF-40 |
| ✅ | Contact Messages | HF-65 |
| ✅ | CMS — page editors, the page list and blog articles all save for real | HF-33 |
| ❌ | Support Tickets | HF-69 |
| ❌ | Packages — redirects to CMS, not a real page | HF-41 |
| ❌ | Announcements | HF-76 |
| ❌ | Billing | — |
| ❌ | Whitelisting | — |
| ❌ | System Logs | — |
| ❌ | Global Settings | — |
| ❌ | Integrations | — |
| ❌ | Preferences | — |
| ❌ | Onboarding — redirects, not a real page | — |

**5 of 15 done.**

---

## Hospital Admin

| | | Ticket |
|---|---|---|
| ✅ | Dashboard | HF-48 |
| ✅ | Doctors | HF-38 |
| ✅ | Doctor Assistants | HF-39 |
| ✅ | Nurses | HF-42 |
| ✅ | Support Staff | HF-43 |
| ✅ | Patients | HF-45 |
| ✅ | Appointments | HF-46 |
| ✅ | Pharmacy | HF-63 |
| ✅ | Assets | HF-62 |
| ✅ | Onboarding / Employees | HF-68 |
| ❌ | Payroll — runs are real, payslips are not | HF-67 |
| ❌ | Laboratory — tests are real, the rest is not | HF-66 |
| ❌ | Wards & Cabins | HF-47 |
| ❌ | Vendors — table exists, page not wired to it | HF-61 |
| ❌ | Finance | HF-70 |
| ❌ | Procurement | HF-71 |
| ❌ | Administration | HF-72 |
| ❌ | Personal Files — waiting on file storage | HF-64 |
| ❌ | Attendance — staff list is real, clock-ins are not | — |
| ❌ | Accounts | — |
| ❌ | HR | — |
| ❌ | Hospital Profile | — |
| ❌ | Reports | — |
| ❌ | Notifications | — |
| ❌ | Settings | — |

**10 of 25 done.**

---

## Doctor Portal

| | | Ticket |
|---|---|---|
| ✅ | Schedule | HF-59 |
| ✅ | Prescription | HF-57, HF-58, HF-74 |
| ❌ | Patient Queue | HF-56 |
| ❌ | Directory | HF-60 |

**2 of 4 done.**

---

## Patient Portal

| | | Ticket |
|---|---|---|
| ✅ | Dashboard | — |
| ✅ | Find Doctors | HF-49 |
| ❌ | Appointments | HF-52, HF-55 |
| ❌ | Medical Records | — |
| ❌ | Billing | — |
| ❌ | Profile | — |
| ❌ | Tutorial | — |

**2 of 7 done.**

---

## Landing (public site)

| | | Ticket |
|---|---|---|
| ✅ | Home | HF-33, HF-54 |
| ✅ | Features | HF-33 |
| ✅ | Pricing | HF-33 |
| ✅ | About | HF-33 |
| ✅ | Contact | HF-33, HF-65 |
| ✅ | Blog | HF-33 |
| ✅ | Hospitals | HF-35 |
| ✅ | Doctors | HF-44 |
| ❌ | Lab Tests | — |
| ❌ | Telehealth | — |
| ❌ | Help Centre | — |
| ❌ | Career | — |
| ❌ | Reserve a Room | — |
| ❌ | Terms / Privacy / Cookies / Data Use | — |

**8 of 14 done.**

---

## Not a menu item, but done

| | | Ticket |
|---|---|---|
| ✅ | Login and access control | HF-31 |
| ✅ | Doctor logins created with the doctor | HF-32 |
| ✅ | Hospital admin login: view / reset password | HF-73 |
| ✅ | Removed doctor loses access | HF-75 |
| ✅ | Ward, bed, cabin and admission backend | HF-37 |
| ✅ | Booking creates a real appointment | HF-50, HF-51, HF-53 |
| ✅ | Site title, favicon, brand constants | HF-34 |

---

## Worth checking

Four tickets sit in **QA** but the page still reads part of its data locally:
**HF-56** (Patient Queue), **HF-60** (Directory), **HF-52** (Patient
Appointments), **HF-66** (Laboratory). Either the ticket covered less than the
whole page, or it moved to QA early. Worth confirming before anyone reports
them as finished.

**13 menu items have no ticket at all** — mostly Super Admin settings screens
and the patient portal's inner pages. Nobody is working on those.

---

## The short answer

**27 of 65 pages are on real data.** The public site is nearly finished; the
hospital admin panel is the bulk of what is left.

Everything marked ❌ still works when you click it — it shows demo data that
does not save. Nothing is broken, it just is not real yet.
