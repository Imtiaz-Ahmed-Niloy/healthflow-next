-- 0138_pharmacy_standalone_tenants.sql
-- Standalone pharmacy entities:
-- Extends tenant_kind enum to include 'pharmacy', allowing pharmacies to operate
-- as independent facilities/tenants on HealthFlow rather than hospital subsidiaries.

alter type public.tenant_kind add value if not exists 'pharmacy';
