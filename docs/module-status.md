# Where we are

Every menu item, by panel, **in the order the menu itself lists them** — so
this file can be read side by side with the sidebar without hunting. The order
comes from `superNav` in `src/components/super/SuperLayout.tsx`, `adminNav` in
`src/components/admin/AdminLayout.tsx`, and the two portal layouts.

**✅** = on real data, saves, survives a refresh, isolated per hospital
**❌** = still on demo data, or only half wired

Last checked: 3 Sep 2026

---

## Super Admin

| | | Ticket |
|---|---|---|
| ✅ | Dashboard | HF-36 |
| ✅ | Hospital Management — logo uploads, structured opening hours, licence scans | HF-35 |
| ✅ | User Role Management — custom roles belong to a hospital | HF-40 |
| ✅ | Package Management — plans, offers and per-hospital assignments | HF-41 |
| ✅ | Log Reports — every write, from a database trigger | — |
| ❌ | Whitelisting | — |
| ✅ | Billing — monthly usage invoices per hospital | — |
| ✅ | CMS Management — page editors, the page list and blog articles all save | HF-33 |
| ✅ | Announcements | HF-76 |
| ✅ | Advertisements — promotional cards, placed per page | — |
| ✅ | Contact Messages | HF-65 |
| ✅ | Support Tickets | HF-69 |
| ❌ | Integrations | — |
| ✅ | Global Settings — platform defaults and the maintenance notice | — |
| ❌ | Preferences | — |

**12 of 15 done.**

`/super/onboarding` is not on this list any more because it is not on the menu:
Hospital Management lists every hospital and `pending` is the queue, so the
route redirects there. It used to be counted as an unbuilt page, which made the
panel look one page further behind than it is.

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
| ❌ | Wards & Beds | HF-47 |
| ❌ | Admissions — the backend is built (HF-37); the page still reads localStorage | HF-37 |
| ✅ | Laboratory — catalogue and requests | HF-66 |
| ✅ | Pharmacy | HF-63 |
| ✅ | Hospital Profile | HF-85 |
| ✅ | HR Dashboard — headcount, attendance, leave decisions, last payroll run | — |
| ✅ | Employees | HF-68 |
| ✅ | Personal Files — PDFs in R2, opened through an expiring link | HF-64 |
| ✅ | Attendance & Leave — clock-ins, leave and holidays | HF-84 |
| ✅ | Payroll — runs, payslips and salary settings | HF-67 |
| ✅ | Accounts — double-entry ledger, vouchers, trial balance, P&L, balance sheet | — |
| ✅ | Invoices & AR/AP | HF-70 |
| ✅ | Financial Reports — six reports counted from real rows, with CSV | — |
| ✅ | Assets | HF-62 |
| ✅ | Procurement | HF-71 |
| ✅ | Vendors | HF-61 |
| ✅ | Reports — the same page as Financial Reports, listed twice in the menu | — |
| ❌ | Notifications | — |
| ✅ | Administration | HF-72 |
| ❌ | Settings | — |

**22 of 26 done.**

27 menu entries, 26 pages: `adminNav` points both **Financial Reports** and
**Reports** at `/admin/reports`. **Admissions** was missing from this file
entirely until now — it is a menu item, and it is not built.

---

## Doctor Portal

| | | Ticket |
|---|---|---|
| ✅ | Prescription | HF-57, HF-58, HF-74 |
| ✅ | Patient Queue | HF-56 |
| ✅ | Patient Directory | HF-60 |
| ✅ | Schedule | HF-59 |
| ✅ | Community — posts, comments and reactions, across every hospital | — |
| ✅ | User Guide — static help text, nothing to save | — |

**6 of 6 done.**

Three of these were missing from this file entirely until recently.
**Community** was the worst of them — posts lived in component state, so one
survived until the next refresh — and is now on `community_posts`,
`community_comments` and `community_reactions` (0059). The feed reaches every
doctor on the platform (0060) — a colleague at another hospital is often
exactly who you want an answer from — while what a post refers to, patients and
appointments and prescriptions, stays tenant-scoped. A hospital admin still
sees and moderates only their own hospital's threads. It has no ticket.

**Medical Dictionary** (`/portal/medical-dictionary`) is built — a static
glossary of 25 terms with search and filtering — but is **hidden from the menu**
for now, so it is not counted above. The page and route are still there; putting
it back is one line in `PortalLayout.tsx`.

---

## Patient Portal

| | | Ticket |
|---|---|---|
| ✅ | Dashboard | — |
| ✅ | Appointments | HF-52, HF-55 |
| ✅ | Find Doctors | HF-49 |
| ✅ | Billing | HF-77 |
| ✅ | Medical Records | HF-78 |
| ✅ | My Profile — General and Clinical; three tabs deferred, see below | HF-79 |

**6 of 6 done.**

Profile's General and Clinical tabs are real. Its other three are deliberately
not: **Insurance** (HF-81) needs a decision on whether cover is one insurer or
a history of them, **Documents** waits on file storage like HF-64, and
**Family Management** (HF-82) is a consent question before it is a table. All
three say so on screen rather than accepting input that goes nowhere.

**Tutorial** is not on that menu and is not counted: like User Guide, it is a
static walkthrough of how to use the portal, so there is no data behind it to
make real.

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
| ✅ | Image uploads: presigned PUT straight to Cloudflare R2 | — |
| ✅ | Licence PDFs, served through an authenticated link that expires | — |
| ✅ | Operating hours as structured data, not a sentence | — |
| ✅ | Hospital rows link into packages, roles and billing | — |

---

## What is still local

Four hospital-admin pages are not on the API. They divide into two kinds, and
the difference matters when picking one up:

- **`/admin/wards` and `/admin/admissions`** call `useCrud` directly, so what
  you type is saved — to that browser's localStorage. The tables behind both
  already exist (HF-37); these two are a rewiring job, not a schema job.
- **`/admin/notifications` and `/admin/settings`** hold static demo arrays and
  save nothing at all. Both need a decision about what the page is for before
  they need a table.

**13 menu items have no ticket at all** — mostly Super Admin settings screens
and the finance and system pages above. Nobody is working on those.

---

## The short answer

**54 of 67 pages are on real data.** The public site is nearly finished; the
hospital admin panel is the bulk of what is left.

Everything marked ❌ still works when you click it — it shows demo data that
does not save. Nothing is broken, it just is not real yet.
