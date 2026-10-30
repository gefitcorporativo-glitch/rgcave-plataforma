-- ============================================================
-- RG CAVE GYM · CENTRAL DE LEADS (módulo M3)
-- Rodar UMA vez no SQL Editor do Supabase. Seguro rodar de novo (não apaga dados).
-- Tabelas: cave_lead_campanhas (links de captação) e cave_leads (todos os leads).
-- ============================================================

create table if not exists cave_lead_campanhas (
  id uuid primary key default gen_random_uuid(),
  academia_id text references cave_academias(id),
  slug text unique not null,              -- vai no link: captura.html?c=slug
  nome text not null,                     -- nome interno da campanha
  origem text default 'evento',           -- trafego_pago | whatsapp_organico | instagram_organico | evento | parceria | indicacao | site | outro
  titulo text,                            -- título da página de captura
  subtitulo text,
  info text,                              -- linha de data/local/horário
  capa_url text,                          -- imagem de capa (arquivo no repositório ou URL)
  cor text,                               -- cor de destaque da página (hex)
  sorteio boolean default false,          -- mostra o texto do sorteio e libera a lista para imprimir
  perguntas jsonb default '{"idade":true,"treina":true,"parado":true}'::jsonb,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists cave_leads (
  id uuid primary key default gen_random_uuid(),
  academia_id text references cave_academias(id),
  campanha_id uuid references cave_lead_campanhas(id) on delete set null,
  campanha_slug text,
  nome text not null,
  whatsapp text,
  whatsapp_norm text,                     -- só dígitos, para achar duplicados
  idade int,
  treina text,                            -- academia | aluno | por_conta | nao_treina
  tempo_parado text,                      -- menos_6m | 6_12m | mais_1a | nunca
  respostas jsonb default '{}'::jsonb,    -- perguntas extras de cada campanha
  origem text default 'outro',
  utm_source text, utm_medium text, utm_campaign text, utm_content text,
  pagina text,
  consultora_id text,
  status text default 'novo',             -- novo | contatado | agendado | experiencia | convertido | perdido
  observacoes text,
  consentimento boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists cave_leads_acad_idx on cave_leads (academia_id, created_at desc);
create index if not exists cave_leads_camp_idx on cave_leads (campanha_id);
create index if not exists cave_leads_wpp_idx on cave_leads (whatsapp_norm);

-- Mesmo padrão das demais tabelas da plataforma (segurança por usuário ainda pendente: ver ROADMAP).

-- ---------- Indicação digital (v2, 30/10/2026) ----------
alter table cave_leads add column if not exists codigo text;               -- código do lead para convidar amigos: NOME[SIGLA]1234
alter table cave_leads add column if not exists indicado_por_codigo text;  -- código de quem indicou
alter table cave_leads add column if not exists indicado_por_lead uuid;    -- lead de quem indicou
alter table cave_leads add column if not exists indicado_por_nome text;
create unique index if not exists cave_leads_codigo_uidx on cave_leads (codigo) where codigo is not null;
create index if not exists cave_leads_indicador_idx on cave_leads (indicado_por_codigo);

alter table cave_lead_campanhas add column if not exists indicacao boolean default false;      -- liga o "convide até 5 amigos"
alter table cave_lead_campanhas add column if not exists codigo_sigla text;                    -- vai entre colchetes no código
alter table cave_lead_campanhas add column if not exists indicacao_limite timestamptz;         -- até quando a indicação vale chance extra no sorteio
alter table cave_lead_campanhas add column if not exists presentes jsonb;                      -- lista de presentes para o convidado
alter table cave_lead_campanhas add column if not exists convite_img text;                     -- arte usada no compartilhar
alter table cave_lead_campanhas add column if not exists evento_titulo text;
alter table cave_lead_campanhas add column if not exists evento_texto text;
alter table cave_lead_campanhas add column if not exists evento_mapa text;
alter table cave_lead_campanhas add column if not exists evento_fim timestamptz;               -- depois disso some a faixa "acontecendo agora"
alter table cave_lead_campanhas add column if not exists oferta_ativa boolean default false;
alter table cave_lead_campanhas add column if not exists oferta_titulo text;
alter table cave_lead_campanhas add column if not exists oferta_texto text;
alter table cave_lead_campanhas add column if not exists oferta_mensagem text;                 -- mensagem pronta do WhatsApp ({evento} vira o nome)
alter table cave_lead_campanhas add column if not exists whatsapp_academia text;

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

alter table cave_lead_campanhas disable row level security;
alter table cave_leads disable row level security;

-- Link do evento Aulão Rosa (31/10/2026)
insert into cave_lead_campanhas (academia_id, slug, nome, origem, titulo, subtitulo, info, capa_url, cor, sorteio)
values ('7c1e5a3b-2d84-4f6a-9b10-3e8a5d7c9f42', 'aulao-rosa', 'Aulão Rosa 31/10', 'evento',
        'Aulão Rosa · Movimento RG Cave', 'Leva menos de 1 minuto e você já concorre aos prêmios.',
        'Sábado, 31/10 · Parcão · 17h às 19h', 'aulao-rosa-capa.jpg', '#E6007E', true)
on conflict (slug) do nothing;

-- Indicação digital do Aulão Rosa
update cave_lead_campanhas set
  indicacao = true, codigo_sigla = 'ROSA', indicacao_limite = '2026-10-31 18:45:00-03',
  presentes = '["Mapeamento completo de 15 áreas da sua saúde, feito pelo celular em menos de 3 minutos", "Consultoria com treinador especialista", "Uma Experiência na Cave Gym para treinar e alcançar resultados em poucos dias"]'::jsonb,
  convite_img = 'aulao-rosa-convite.jpg',
  evento_titulo = 'O Aulão Rosa está acontecendo agora', evento_texto = 'Parcão · sábado, 31/10 · até as 19h. Venha participar!',
  evento_mapa = 'https://www.google.com/maps/search/?api=1&query=Parc%C3%A3o+Uruguaiana+RS', evento_fim = '2026-10-31 19:00:00-03',
  oferta_ativa = true, oferta_titulo = 'Você desbloqueou uma condição super exclusiva',
  oferta_texto = 'Até 50% de desconto no Desafio de 21 dias, com avaliação tecnológica, consultoria com especialista e mapeamento completo da saúde. Vagas super limitadas: reserve agora a sua.',
  oferta_mensagem = 'Olá! Vim do cadastro do {evento} e quero garantir minha vaga com até 50% de desconto no Desafio de 21 dias.'
where slug = 'aulao-rosa';

