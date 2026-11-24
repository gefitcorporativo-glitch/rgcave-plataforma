-- RG Cave | Hub de Pessoas: cadastro de candidatos (processo seletivo)
-- Rodar no Supabase "plataformas" (irwvagffrguiljaxrzmd), o mesmo do Hub. Pode rodar de novo sem problema.

create table if not exists cave_candidatos (
  id uuid primary key default gen_random_uuid(),
  academia_id text not null,
  nome text not null,
  idade int,
  area text,
  instagram text,
  observacoes text,
  status text not null default 'novo',
  criado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cave_candidatos_academia_idx on cave_candidatos (academia_id, created_at desc);

-- Liga a resposta do teste (DISC) ao candidato cadastrado
alter table cave_pessoas_testes add column if not exists candidato_id text;
create index if not exists cave_pessoas_testes_cand_idx on cave_pessoas_testes (candidato_id);

-- Mesmo padrão das demais tabelas cave_
alter table cave_candidatos disable row level security;
notify pgrst, 'reload schema';
