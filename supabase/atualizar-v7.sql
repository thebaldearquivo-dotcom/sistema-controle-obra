-- Atualizacao V7 - Sequencia de servicos no cronograma fisico
-- Execute este arquivo no SQL Editor do Supabase antes de usar a V7.

alter table public.servicos add column if not exists relacionamento_tipo text;
alter table public.servicos add column if not exists servico_relacionado_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'servicos_relacionamento_tipo_check') then
    alter table public.servicos add constraint servicos_relacionamento_tipo_check
    check (relacionamento_tipo is null or relacionamento_tipo in ('predecessor', 'sucessor', 'mesmo_tempo'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'servicos_servico_relacionado_id_fkey') then
    alter table public.servicos add constraint servicos_servico_relacionado_id_fkey
    foreign key (servico_relacionado_id) references public.servicos(id) on delete set null;
  end if;
end $$;
