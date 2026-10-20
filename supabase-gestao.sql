-- Dois Amores — Gestão: Insumos & Compras (V5)
-- Mantém compras separadas do faturamento/caixa. As tabelas de receitas/equipamentos
-- permanecem para não perder dados, mas a tela de Gestão usa apenas insumos e compras.

create extension if not exists pgcrypto;

-- Tabelas existentes (compatibilidade)
create table if not exists public.insumos (
  id uuid primary key default gen_random_uuid(), nome text not null, categoria text, fornecedor text,
  unidade_compra text not null default 'kg', quantidade_embalagem numeric(14,4) not null default 1,
  preco_compra numeric(14,2) not null default 0, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  aproveitamentos jsonb not null default '[]'::jsonb,
  historico_precos jsonb not null default '[]'::jsonb
);
-- V5: instalações antigas recebem as colunas novas do cadastro de insumos.
alter table public.insumos
  add column if not exists aproveitamentos jsonb not null default '[]'::jsonb,
  add column if not exists historico_precos jsonb not null default '[]'::jsonb;
create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(), data_compra date not null default current_date,
  fornecedor text, observacao text, total numeric(14,2) not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.itens_compras (
  id uuid primary key default gen_random_uuid(), compra_id uuid not null references public.compras(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete restrict, quantidade numeric(14,4) not null default 0,
  unidade text not null default 'un', preco_unitario numeric(14,4) not null default 0,
  total numeric(14,2) not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.receitas (
  id uuid primary key default gen_random_uuid(), nome text not null, produto_id text,
  rendimento numeric(14,4) not null default 1, unidade_rendimento text not null default 'un', observacao text,
  custo_embalagem numeric(14,2) not null default 0, custo_mao_obra numeric(14,2) not null default 0,
  custo_indiretos numeric(14,2) not null default 0, perda_percentual numeric(6,2) not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.receita_itens (
  id uuid primary key default gen_random_uuid(), receita_id uuid not null references public.receitas(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete restrict, quantidade numeric(14,4) not null default 0,
  unidade text not null default 'g', created_at timestamptz not null default now()
);

-- V4: equipamentos usados nas etapas de produção.
create table if not exists public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text,
  potencia_w numeric(12,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- V4: etapas permitem várias fontes de consumo numa mesma receita.
create table if not exists public.receita_etapas (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references public.receitas(id) on delete cascade,
  nome text not null default 'Etapa',
  equipamento_id uuid references public.equipamentos(id) on delete restrict,
  modo text not null default 'power' check (modo in ('power','manual')),
  duracao_minutos numeric(12,2) not null default 0,
  custo_manual numeric(14,2) not null default 0,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

-- Uma linha guarda a configuração geral da energia.
create table if not exists public.configuracoes_gestao (
  chave text primary key,
  tarifa_kwh numeric(14,4) not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.configuracoes_gestao(chave, tarifa_kwh)
values ('energia', 0)
on conflict (chave) do nothing;

create table if not exists public.gestao_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_compras_data on public.compras(data_compra);
create index if not exists idx_itens_compras_compra on public.itens_compras(compra_id);
create index if not exists idx_itens_compras_insumo on public.itens_compras(insumo_id);
create index if not exists idx_receita_itens_receita on public.receita_itens(receita_id);
create index if not exists idx_receita_itens_insumo on public.receita_itens(insumo_id);
create index if not exists idx_receita_etapas_receita on public.receita_etapas(receita_id);
create index if not exists idx_receita_etapas_equipamento on public.receita_etapas(equipamento_id);

alter table public.gestao_admins enable row level security;
alter table public.insumos enable row level security;
alter table public.compras enable row level security;
alter table public.itens_compras enable row level security;
alter table public.receitas enable row level security;
alter table public.receita_itens enable row level security;
alter table public.equipamentos enable row level security;
alter table public.receita_etapas enable row level security;
alter table public.configuracoes_gestao enable row level security;

do $$
declare policy_row record;
begin
  for policy_row in select schemaname,tablename,policyname from pg_policies
    where schemaname='public' and tablename in ('gestao_admins','insumos','compras','itens_compras','receitas','receita_itens','equipamentos','receita_etapas','configuracoes_gestao')
  loop execute format('drop policy %I on %I.%I',policy_row.policyname,policy_row.schemaname,policy_row.tablename); end loop;
end $$;

revoke all on table public.gestao_admins, public.insumos, public.compras, public.itens_compras,
  public.receitas, public.receita_itens, public.equipamentos, public.receita_etapas, public.configuracoes_gestao from anon;
revoke all on table public.gestao_admins from authenticated;
grant select on table public.gestao_admins to authenticated;
grant select,insert,update,delete on table public.insumos,public.compras,public.itens_compras,public.receitas,
  public.receita_itens,public.equipamentos,public.receita_etapas,public.configuracoes_gestao to authenticated;

create policy "gestao_admins_read_self" on public.gestao_admins for select to authenticated
using (user_id=(select auth.uid()));

create policy "gestao_insumos_admin" on public.insumos for all to authenticated
using (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())))
with check (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())));
create policy "gestao_compras_admin" on public.compras for all to authenticated
using (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())))
with check (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())));
create policy "gestao_itens_compras_admin" on public.itens_compras for all to authenticated
using (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())))
with check (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())));
create policy "gestao_receitas_admin" on public.receitas for all to authenticated
using (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())))
with check (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())));
create policy "gestao_receita_itens_admin" on public.receita_itens for all to authenticated
using (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())))
with check (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())));
create policy "gestao_equipamentos_admin" on public.equipamentos for all to authenticated
using (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())))
with check (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())));
create policy "gestao_receita_etapas_admin" on public.receita_etapas for all to authenticated
using (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())))
with check (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())));
create policy "gestao_config_admin" on public.configuracoes_gestao for all to authenticated
using (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())))
with check (exists(select 1 from public.gestao_admins where user_id=(select auth.uid())));

-- Importante: compras continuam independentes do caixa/faturamento.
