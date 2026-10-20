-- Dois Amores — Gestão: Insumos & Compras (V5)
-- Migração para quem já usa a Gestão. Pode ser executada mais de uma vez.
-- Adiciona ao cadastro de insumos os mesmos recursos do app Doce Custo:
--   * aproveitamentos (ex.: uma bandeja de morangos gera morangos grandes e pequenos)
--   * histórico de preços (alimenta a pílula ▲/▼ de variação na lista de insumos)

alter table public.insumos
  add column if not exists aproveitamentos jsonb not null default '[]'::jsonb,
  add column if not exists historico_precos jsonb not null default '[]'::jsonb;

-- Semeia o histórico dos insumos existentes com o preço atual (uma vez).
update public.insumos
set historico_precos = jsonb_build_array(jsonb_build_object('d', to_char(coalesce(updated_at, created_at), 'YYYY-MM-DD'), 'p', preco_compra))
where historico_precos = '[]'::jsonb and preco_compra > 0;

-- Observação: as tabelas de receitas, equipamentos e etapas não são mais usadas pela tela
-- de Gestão, mas foram mantidas no banco para não apagar dados existentes.
