-- Sistema Controle de Producao e Diario de Obra - V7
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.obras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  nome text not null,
  cliente text,
  endereco text,
  responsavel text,
  data_inicio date,
  prazo_dias integer,
  status text not null default 'em_andamento' check (status in ('planejada', 'em_andamento', 'pausada', 'concluida')),
  created_at timestamptz not null default now()
);

create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  nome text not null,
  categoria text,
  unidade text not null default 'un',
  qtd_prevista numeric(14,2) not null default 0,
  dias_previstos integer not null default 1,
  relacionamento_tipo text check (relacionamento_tipo is null or relacionamento_tipo in ('predecessor', 'sucessor', 'mesmo_tempo')),
  servico_relacionado_id uuid references public.servicos(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Atualizacoes para bancos ja existentes
alter table public.servicos add column if not exists dias_previstos integer not null default 1;
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

create table if not exists public.membros_equipe (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  nome text not null,
  funcao text not null,
  tipo text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.diarios (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  data date not null,
  clima text,
  horario_inicio time,
  horario_termino time,
  equipe_resumo text,
  servicos_executados text,
  ocorrencias text,
  visitas text,
  observacoes text,
  responsavel_lancamento text,
  created_at timestamptz not null default now()
);

create table if not exists public.producoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  diario_id uuid references public.diarios(id) on delete set null,
  servico_id uuid not null references public.servicos(id) on delete cascade,
  local_execucao text,
  quantidade numeric(14,2) not null default 0,
  pessoas numeric(10,2) not null default 1,
  horas numeric(10,2) not null default 8,
  observacoes text,
  data date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.materiais (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  diario_id uuid references public.diarios(id) on delete set null,
  data date not null,
  material text not null,
  unidade text not null default 'un',
  quantidade numeric(14,2) not null default 0,
  fornecedor text,
  nota_fiscal text,
  destino text,
  created_at timestamptz not null default now()
);

create table if not exists public.fotos_diario (
  id uuid primary key default gen_random_uuid(),
  diario_id uuid not null references public.diarios(id) on delete cascade,
  url text not null,
  descricao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_obras_user on public.obras(user_id);
create index if not exists idx_servicos_obra on public.servicos(obra_id);
create index if not exists idx_diarios_obra_data on public.diarios(obra_id, data desc);
create index if not exists idx_producoes_obra_data on public.producoes(obra_id, data desc);
create index if not exists idx_materiais_obra_data on public.materiais(obra_id, data desc);

alter table public.obras enable row level security;
alter table public.servicos enable row level security;
alter table public.membros_equipe enable row level security;
alter table public.diarios enable row level security;
alter table public.producoes enable row level security;
alter table public.materiais enable row level security;
alter table public.fotos_diario enable row level security;

-- O usuário acessa somente as próprias obras.
drop policy if exists "obras_select_own" on public.obras;
create policy "obras_select_own" on public.obras
for select using (auth.uid() = user_id);

drop policy if exists "obras_insert_own" on public.obras;
create policy "obras_insert_own" on public.obras
for insert with check (auth.uid() = user_id);

drop policy if exists "obras_update_own" on public.obras;
create policy "obras_update_own" on public.obras
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "obras_delete_own" on public.obras;
create policy "obras_delete_own" on public.obras
for delete using (auth.uid() = user_id);

-- Serviços
drop policy if exists "servicos_select_by_obra" on public.servicos;
create policy "servicos_select_by_obra" on public.servicos
for select using (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()));

drop policy if exists "servicos_insert_by_obra" on public.servicos;
create policy "servicos_insert_by_obra" on public.servicos
for insert with check (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()));

drop policy if exists "servicos_update_by_obra" on public.servicos;
create policy "servicos_update_by_obra" on public.servicos
for update using (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()))
with check (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()));

drop policy if exists "servicos_delete_by_obra" on public.servicos;
create policy "servicos_delete_by_obra" on public.servicos
for delete using (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()));

-- Equipe
drop policy if exists "equipe_all_by_obra" on public.membros_equipe;
create policy "equipe_all_by_obra" on public.membros_equipe
for all using (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()))
with check (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()));

-- Diários
drop policy if exists "diarios_all_by_obra" on public.diarios;
create policy "diarios_all_by_obra" on public.diarios
for all using (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()))
with check (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()));

-- Produções
drop policy if exists "producoes_all_by_obra" on public.producoes;
create policy "producoes_all_by_obra" on public.producoes
for all using (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()))
with check (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()));

-- Materiais
drop policy if exists "materiais_all_by_obra" on public.materiais;
create policy "materiais_all_by_obra" on public.materiais
for all using (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()))
with check (exists (select 1 from public.obras o where o.id = obra_id and o.user_id = auth.uid()));

-- Fotos vinculadas ao diário
drop policy if exists "fotos_all_by_diario" on public.fotos_diario;
create policy "fotos_all_by_diario" on public.fotos_diario
for all using (
  exists (
    select 1
    from public.diarios d
    join public.obras o on o.id = d.obra_id
    where d.id = diario_id and o.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.diarios d
    join public.obras o on o.id = d.obra_id
    where d.id = diario_id and o.user_id = auth.uid()
  )
);
