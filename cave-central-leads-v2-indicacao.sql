-- Rodar UMA vez no SQL Editor (depois do cave-central-leads.sql). Não apaga dados.
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
