-- Atualizacao V8 - Sistema Controle de Obra
-- Garante que as colunas de relacionamento entre servicos existam.
-- Pode ser executado mais de uma vez sem apagar dados.

alter table public.servicos
  add column if not exists relacionamento_tipo text,
  add column if not exists servico_relacionado_id uuid references public.servicos(id) on delete set null;

alter table public.servicos
  drop constraint if exists servicos_relacionamento_tipo_check;

alter table public.servicos
  add constraint servicos_relacionamento_tipo_check
  check (relacionamento_tipo is null or relacionamento_tipo in ('predecessor', 'sucessor', 'mesmo_tempo'));
