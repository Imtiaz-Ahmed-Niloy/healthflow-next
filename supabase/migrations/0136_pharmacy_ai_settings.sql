-- 0136_pharmacy_ai_settings.sql
-- The pharmacy's AI screens: which of the features a hospital has switched
-- on, and how cautious the interaction checker is.
--
-- There is no key here. The model is called from the server with a key held
-- in the server's own environment (ANTHROPIC_API_KEY); a key typed into a
-- settings form would sit in a table every pharmacy login can read.
--
-- Two of the four need no model at all: the stock predictions and the expiry
-- plan are arithmetic over the hospital's own sales and batches. The
-- assistant and the interaction checker send pharmacy data to the model, so
-- each can be switched off on its own.
alter table public.pharmacy_settings
  add column ai_assistant         boolean not null default true,
  add column ai_interactions      boolean not null default true,
  add column ai_predictions       boolean not null default true,
  add column ai_expiry            boolean not null default true,
  -- The mildest interaction worth interrupting a sale for.
  add column ai_interaction_level text not null default 'moderate'
    constraint pharmacy_settings_ai_level_check
    check (ai_interaction_level in ('minor', 'moderate', 'major', 'severe'));

update public.roles
   set pages = pages || array['/pharmacy/ai', '/pharmacy/ai-assistant', '/pharmacy/ai-settings']
 where role = 'pharmacy_admin' and tenant_id is null
   and not pages @> array['/pharmacy/ai'];
