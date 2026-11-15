-- ============================================================
-- RG Cave · Perfil do colaborador (14/11/2026)
-- Indicadores do ano, ata de 1:1, teste de perfil ligado ao colaborador
-- e liberações de correção do Lançamento do dia.
-- Rodar no Supabase das plataformas (irwvagffrguiljaxrzmd), SQL Editor.
-- Pode rodar mais de uma vez: só cria o que ainda não existe.
-- ============================================================

-- 1. Indicadores do ano (um registro por treinador, ano e mês)
create table if not exists cave_treinador_indicadores (
  treinador_id text not null,
  ano int not null,
  mes int not null,
  primary key (treinador_id, ano, mes)
);
alter table cave_treinador_indicadores add column if not exists academia_id text;
alter table cave_treinador_indicadores add column if not exists carteira numeric;
alter table cave_treinador_indicadores add column if not exists exp_realizadas numeric;
alter table cave_treinador_indicadores add column if not exists exp_convertidas numeric;
alter table cave_treinador_indicadores add column if not exists cons_leads numeric;
alter table cave_treinador_indicadores add column if not exists cons_alunos numeric;
alter table cave_treinador_indicadores add column if not exists aval_tec numeric;
alter table cave_treinador_indicadores add column if not exists a_renovar numeric;
alter table cave_treinador_indicadores add column if not exists renovados numeric;
alter table cave_treinador_indicadores add column if not exists alunos_novos numeric;
alter table cave_treinador_indicadores add column if not exists rev_agendadas numeric;
alter table cave_treinador_indicadores add column if not exists rev_realizadas numeric;
alter table cave_treinador_indicadores add column if not exists updated_at bigint;

-- 2. Ata curta de 1:1 (usa a tabela de registros que já existe; os registros antigos continuam valendo)
alter table cave_treinador_registros add column if not exists conduzido_por text;
alter table cave_treinador_registros add column if not exists acao text;
alter table cave_treinador_registros add column if not exists acao_prazo text;
alter table cave_treinador_registros add column if not exists acao_status text;
alter table cave_treinador_registros add column if not exists combinados jsonb default '[]';
alter table cave_treinador_registros add column if not exists medir text;
alter table cave_treinador_registros add column if not exists proxima_reuniao text;

-- 3. Teste de perfil ligado ao colaborador (candidatos continuam com pessoa_tipo vazio)
alter table cave_pessoas_testes add column if not exists academia_id text;
alter table cave_pessoas_testes add column if not exists pessoa_tipo text;
alter table cave_pessoas_testes add column if not exists pessoa_id text;
alter table cave_pessoas_testes add column if not exists liberado boolean default false;
create index if not exists cave_pessoas_testes_pessoa_idx on cave_pessoas_testes (pessoa_tipo, pessoa_id, created_at desc);

-- 4. Liberações de correção do Lançamento do dia (o gestor libera um dia que já passou)
create table if not exists cave_diario_liberacoes (
  id uuid primary key default gen_random_uuid(),
  academia_id text,
  treinador_email text not null,
  treinador_nome text,
  data text not null,
  liberado_por text,
  usado boolean default false,
  usado_em text,
  created_at timestamptz not null default now()
);
create index if not exists cave_diario_liberacoes_email_idx on cave_diario_liberacoes (treinador_email, usado);

-- 5. Acesso: mesmo padrão das demais tabelas cave_
alter table cave_treinador_indicadores disable row level security;
alter table cave_diario_liberacoes disable row level security;

-- Atualiza o cache do Supabase para enxergar as colunas novas na hora
notify pgrst, 'reload schema';

-- ============================================================
-- Calendário de lançamentos (14/11/2026, parte 2)
-- Funcionamento da academia (dias e horários) + feriados e folgas
-- ============================================================
alter table cave_academias add column if not exists funcionamento jsonb;

create table if not exists cave_diario_calendario (
  id uuid primary key default gen_random_uuid(),
  academia_id text not null,
  data text not null,
  tipo text not null,            -- 'feriado' (academia toda) ou 'folga' (um treinador)
  treinador_email text,          -- vazio quando é feriado
  treinador_nome text,
  marcado_por text,
  created_at timestamptz not null default now()
);
create index if not exists cave_diario_calendario_idx on cave_diario_calendario (academia_id, data);
alter table cave_diario_calendario disable row level security;

notify pgrst, 'reload schema';
