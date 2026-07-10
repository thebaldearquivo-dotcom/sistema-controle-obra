-- Atualizacao V4 - Sistema Controle de Obra
-- Execute no Supabase se o banco ja foi criado em uma versao anterior.

alter table public.servicos
add column if not exists dias_previstos integer not null default 1;

update public.servicos
set dias_previstos = 1
where dias_previstos is null;
