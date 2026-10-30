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
alter table cave_lead_campanhas disable row level security;
alter table cave_leads disable row level security;

-- Link do evento Aulão Rosa (31/10/2026)
insert into cave_lead_campanhas (academia_id, slug, nome, origem, titulo, subtitulo, info, capa_url, cor, sorteio)
values ('7c1e5a3b-2d84-4f6a-9b10-3e8a5d7c9f42', 'aulao-rosa', 'Aulão Rosa 31/10', 'evento',
        'Aulão Rosa · Movimento RG Cave', 'Leva menos de 1 minuto e você já concorre aos prêmios.',
        'Sábado, 31/10 · Parcão · 17h às 19h', 'aulao-rosa-capa.jpg', '#E6007E', true)
on conflict (slug) do nothing;

