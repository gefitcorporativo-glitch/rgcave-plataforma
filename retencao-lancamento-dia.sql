-- ============================================================
-- Área do Treinador · Lançamento do dia (14/11/2026)
-- Rodar no Supabase do APP PLANNER (xpvedihpejivnkssryhc), SQL Editor.
-- NÃO é o Supabase das plataformas. Pode rodar mais de uma vez.
-- Só acrescenta colunas no diário que já existe; o RLS não é alterado.
-- ============================================================
alter table diario_treinador add column if not exists consultorias_leads int default 0;
alter table diario_treinador add column if not exists consultorias_alunos int default 0;
alter table diario_treinador add column if not exists pedido_correcao text;

-- "inseridos_carteira" passa a ser mostrado como "Planners iniciados"
-- (alunos novos, alunos antigos ou mudança de carteira). A coluna continua a mesma.

notify pgrst, 'reload schema';
