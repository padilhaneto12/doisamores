# Dois Amores — Gestão: Insumos & Compras (V5)

A página `gestao.html` (acessível pelo botão **Insumos & Compras** do painel administrativo) agora tem somente duas áreas:

- **Insumos** — cadastro com a mesma estrutura do app Doce Custo, no visual do site.
- **Compras** — registro de compras por mês, independente de vendas/caixa.

Foram removidas da tela: Visão geral, Equipamentos, Receitas e Precificação. As tabelas de receitas/equipamentos continuam no banco (nenhum dado é apagado).

## Insumos (igual ao app Doce Custo)

- Busca por nome, com contador "X de Y".
- Lista com quantidade, unidade, preço da embalagem e **pílula ▲/▼ com a variação** em relação ao preço anterior.
- Custo calculado por g, ml ou unidade (e por kg/L).
- **Aproveitamentos**: um insumo comprado pode gerar partes diferentes (ex.: bandeja de morangos → grandes e pequenos), com rendimento estimado e custo por peça.
- **Histórico de preços** (últimos 5 no formulário), atualizado ao editar o preço e a cada compra registrada.
- Campos extras do site, opcionais: categoria e fornecedor.
- Unidades: g, kg, ml, L, un.
- Não é possível excluir insumos que já aparecem em compras registradas.

## Compras

- Registro de compra com vários itens; o preço de referência de cada insumo passa a ser (valor pago ÷ nº de embalagens).
- Em cada compra, o preço por embalagem pode ser ajustado ao valor realmente pago ao fornecedor. O preço atual do insumo é apenas sugerido; cada compra mantém seu próprio preço e total registrados, sem alterar compras anteriores.
- Compras registradas podem ser editadas pela lista ou pelo detalhe. A edição atualiza os dados e itens daquela compra, mas não altera o preço de referência dos insumos.
- Compra com data anterior à última compra do insumo não sobrescreve o preço de referência.
- Botão **Novo insumo** dentro do registro de compra, para cadastrar um insumo sem sair da tela.
- Filtro por mês ou "Todos os meses" e detalhe dos itens.

## Banco de dados (Supabase)

- Instalação nova: execute `supabase-gestao.sql`.
- Já usava a Gestão: execute `supabase-gestao-v5.sql` (adiciona `aproveitamentos` e `historico_precos` em `insumos`, sem apagar nada).

Se o script v5 ainda não foi executado, o site continua salvando insumos normalmente, mas avisa que aproveitamentos e histórico só funcionam depois da migração.

## Acesso

Entrada por e-mail e senha de uma conta do Supabase Auth autorizada como administradora.

1. No Supabase, crie a conta em **Authentication → Users** e copie o UUID.
2. No SQL Editor (depois de executar `supabase-gestao.sql`):

```sql
insert into public.gestao_admins (user_id)
values ('UUID-DA-CONTA-AUTORIZADA')
on conflict (user_id) do nothing;
```

Para revogar: `delete from public.gestao_admins where user_id = 'UUID-DA-CONTA-AUTORIZADA';`

O acesso direto a `gestao.html` não concede permissão: as tabelas são protegidas por RLS no banco.
