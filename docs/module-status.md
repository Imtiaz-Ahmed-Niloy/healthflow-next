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
| ✅ | Payroll — runs, payslips and salary settings | HF-67 |
| ❌ | Laboratory — tests are real, the rest is not | HF-66 |
| ❌ | Wards & Cabins | HF-47 |
| ❌ | Vendors — table exists, page not wired to it | HF-61 |
| ✅ | Finance | HF-70 |
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

**12 of 25 done.**

---

## Doctor Portal

| | | Ticket |
|---|---|---|
| ✅ | Schedule | HF-59 |
| ✅ | Prescription | HF-57, HF-58, HF-74 |
| ✅ | Patient Queue | HF-56 |
| ✅ | Directory | HF-60 |
| ✅ | User Guide — static help text, nothing to save | — |
| ❌ | Community — posts live in component state, so they vanish on refresh | — |

**5 of 6 done.**

Three of these were missing from this file entirely until now. **Community** is
the worst of the demo pages: it does not even use localStorage, so a post is
gone the moment the page reloads. It has no ticket.

**Medical Dictionary** (`/portal/medical-dictionary`) is built — a static
glossary of 25 terms with search and filtering — but is **hidden from the menu**
for now, so it is not counted above. The page and route are still there; putting
it back is one line in `PortalLayout.tsx`.

---

## Patient Portal

| | | Ticket |
|---|---|---|
| ✅ | Dashboard | — |
| ✅ | Find Doctors | HF-49 |
| ✅ | Appointments | HF-52, HF-55 |
| ❌ | Medical Records | — |
| ❌ | Billing | — |
| ❌ | Profile | — |
| ❌ | Tutorial | — |

**3 of 7 done.**

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

This list used to name four tickets in **QA** whose pages were suspected of
still reading part of their data locally. Three of the four were checked and
were wrong — **HF-56** (Patient Queue), **HF-60** (Directory) and **HF-52**
(Patient Appointments) each fetch a real API, hold no localStorage at all, and
scope by the signed-in doctor or patient rather than by tenant alone. They are
marked done above.

What misled the check for HF-56 was `src/data/queue.ts` — the three hardcoded
patients the ticket replaced, still sitting in the tree, imported by nothing.
It has been deleted, along with `src/data/useCmsHero.ts`, which was dead the
same way.

**HF-66** (Laboratory) is the one that was right: `/admin/lab` still runs on
`useCrud("lab-tests", seed)` with a second `storeKey: "lab-catalog"`. It is
marked ❌ above and is genuinely unfinished.

**13 menu items have no ticket at all** — mostly Super Admin settings screens
and the patient portal's inner pages. Nobody is working on those.

---

## The short answer

**33 of 67 pages are on real data.** The public site is nearly finished; the
hospital admin panel is the bulk of what is left.

Everything marked ❌ still works when you click it — it shows demo data that
does not save. Nothing is broken, it just is not real yet.
