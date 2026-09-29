-- 0113_journal_status_workflow_values.sql
-- The statuses of a voucher's approval workflow, beside draft and posted:
-- pending (waiting for approval), approved, rejected and cancelled.
--
-- On their own: a new enum value cannot be used in the transaction that adds
-- it, and 0114, which uses them, is one transaction. The rules for moving
-- between them are there.

alter type public.journal_status add value if not exists 'pending';
alter type public.journal_status add value if not exists 'approved';
alter type public.journal_status add value if not exists 'rejected';
alter type public.journal_status add value if not exists 'cancelled';
