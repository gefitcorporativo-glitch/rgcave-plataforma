-- Rodar UMA vez no SQL Editor. Cria a pasta de imagens das campanhas. Não apaga dados.
-- ---------- Artes da campanha (v3, 30/10/2026) ----------
alter table cave_lead_campanhas add column if not exists capa_convidado text;   -- capa da página de quem chega por indicação

-- Pasta pública de imagens das campanhas (Supabase Storage), até 2 MB por imagem
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campanhas', 'campanhas', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='campanhas_envio') then
    create policy campanhas_envio on storage.objects for insert to anon, authenticated with check (bucket_id = 'campanhas');
  end if;
end $$;

