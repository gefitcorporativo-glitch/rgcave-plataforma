-- RG Cave · Central de Leads · ocultar leads (31/10/2026)
-- Rodar no SQL Editor do Supabase. Só acrescenta um campo: não altera nem apaga nenhum lead.
alter table cave_leads add column if not exists oculto boolean default false;
