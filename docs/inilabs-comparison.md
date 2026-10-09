# What iNiLabs has that we don't

Compared on 9 Oct 2026 against the demo at https://demo.hospital.inilabs.xyz/
(one hospital, nine logins). I read every menu page as Admin and the menu of
each other role. I did not create or save anything there.

## Roles

They have 9 logins. We have 4 real panels (super admin, hospital admin, doctor,
patient). Our `hr_admin`, `finance_admin`, `lab_admin` and `pharmacy_admin`
exist, but they all open the same admin panel.

| Their role | What that person does there | Us |
|---|---|---|
| Admin | Everything | Have it |
| Doctor | Patients, prescriptions, admissions, operation theatre, own leave | Have it, minus the missing modules below |
| Patient | Appointments, prescriptions, bills, test results, medicine bought | Have it |
| Accountant | Income, expense, bills, payroll, inventory, reports | Partly: `finance_admin`, no own panel |
| Pharmacist | Medicines, purchases, sales, stock | Partly: `pharmacy_admin`, no own panel |
| Pathologist | Tests and results, blood bank | Partly: `lab_admin`, no own panel |
| Radiologist | Same screens as Pathologist | Missing |
| Receptionist | Register patients, book, admit, discharge, beds, ambulance calls | **Missing** |
| Biller | Make bills, take payments, sell medicine at the counter | **Missing** |

Also missing: nurses and doctor assistants are only records with us. They
cannot log in.

They also have a permission screen: per role, tick Add / Edit / Delete / View
for each feature.

## Missing modules

- **Operation theatre**: book an operation with lead and assistant doctors.
- **Blood bank**: donors, and blood stock by group and bag.
- **Ambulance**: the vehicles, and a log of each call with driver and charge.
- **TPA / insurance companies**: list them, tag a patient's visit, report by TPA.
- **Inpatient instructions**: daily doctor orders for an admitted patient.
- **Physical condition**: a quick height / weight / BP record per visit.
- **Events**: a hospital calendar, shown on the public site too.

## Pharmacy

Ours is one stock list (name, SKU, stock, reorder level). They also have:

- Buying medicine from a supplier, with batch number and expiry date
- Selling medicine to a patient, with payment and balance due
- Damaged and expired stock
- Warehouses, manufacturers, units, buy and sell price

## Billing and payments

- Bill items picked from a price list (category, label, discount)
- A separate "take payment" step, so a bill can be part-paid
- Online payment: Stripe and Razorpay
- Fee taken at the moment of booking an appointment
- Patient credit limit

## Staff

- Hourly pay grades and overtime rate
- Leave days allowed per role per year
- Staff ID cards to print
- Any staff member can apply for leave from their own login

## Other small things

- Video consultation through Zoom
- Take the patient's photo with the webcam at registration
- Email settings (SMTP) per hospital
- A menu builder for the public site
- 20 ready reports, each with its own filters
- Visitor count on the dashboard

## Not sure

I only matched these by name in our code, so check before trusting them:

- Birth and death: we print certificates. They keep a register. May be enough.
- Inventory: they have check-in / check-out of items to staff. Our Assets and
  Procurement may already cover it.

## Where we are ahead

Many hospitals on one platform, packages and platform billing, double-entry
accounts, procurement and work orders, audit log, Bangla, doctor community,
and a far better public site and booking flow. Their UI is old.
