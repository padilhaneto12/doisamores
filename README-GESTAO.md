# Dois Amores — V4 Gestão & Precificação

Esta versão adiciona uma página separada chamada `gestao.html`, acessível pelo menu do painel administrativo.

## O que foi incluído

- Cadastro de insumos e custo de embalagem.
- Registro de compras por mês.
- Compras independentes de vendas/caixa.
- Atualização do preço de referência do insumo quando uma nova compra é registrada.
- Cadastro de receitas.
- Vínculo opcional da receita a um produto já existente no cardápio.
- Ingredientes e quantidades por receita.
- Custos adicionais por receita: embalagem, mão de obra e custos indiretos.
- Percentual de perda/quebra.
- Cálculo de custo total e custo por unidade.
- Calculadora de margem e preço sugerido.
- Dashboard mensal de compras.

## Configuração do banco

Execute `supabase-gestao.sql` no SQL Editor do projeto Supabase para instalar ou atualizar as tabelas e políticas de acesso.

A página usa o mesmo Supabase do sistema atual e não altera a lógica de pedidos, estoque ou caixa.

## Acesso

O acesso é feito com e-mail e senha de uma conta do Supabase Auth previamente autorizada como administradora.
O acesso direto a `gestao.html` não concede permissão: as tabelas privadas também são protegidas por RLS no banco.

### Configurar uma administradora

1. No painel do Supabase, crie uma conta em **Authentication → Users** (ou use uma conta Auth existente) com o e-mail da administradora.
2. Copie o UUID dessa conta.
3. Depois de executar `supabase-gestao.sql`, autorize somente essa conta pelo SQL Editor:

```sql
insert into public.gestao_admins (user_id)
values ('UUID-DA-CONTA-AUTORIZADA')
on conflict (user_id) do nothing;
```

Repita os passos para cada administradora. Para revogar acesso, remova a conta autorizada:

```sql
delete from public.gestao_admins
where user_id = 'UUID-DA-CONTA-AUTORIZADA';
```

Ao atualizar uma instalação existente, execute novamente `supabase-gestao.sql` antes de acessar a página. O script substitui as políticas das tabelas de Gestão para remover regras antigas permissivas; até autorizar uma conta, ninguém terá acesso aos dados de Gestão.

## V4.2 — correções e acabamento

**Correções**
- O `gestao.js` travava ao carregar (`currentMonth` usada antes de ser declarada), então nenhum botão funcionava.
- Os botões "Cancelar" dos modais não fechavam (listener não era aplicado a botões criados depois).
- Datas e filtro mensal usavam UTC; no Brasil, à noite, a data virava o dia/mês seguinte. Agora usa o horário local.
- O campo de margem na Precificação perdia o foco a cada tecla digitada.

**Melhorias**
- Custo por g/ml/un. com precisão real (ex.: R$ 0,0380/g) e equivalente por kg/L, com pré-visualização ao cadastrar o insumo.
- Compra antiga (data anterior à última compra do insumo) não sobrescreve mais o preço de referência.
- Histórico de compras com "Todos os meses" e detalhe dos itens; total da compra calculado ao vivo.
- Receitas: a unidade acompanha o insumo escolhido e há aviso quando a unidade é incompatível (ex.: insumo em kg usado em "un.").
- Precificação mostra embalagem, mão de obra, indiretos e perda separados, lucro por unidade e por receita, e compara com o preço atual do produto no cardápio.
- Autocompletar de categoria e fornecedor.

**Regra do preço de referência:** ao registrar uma compra, o preço do insumo passa a ser (valor pago ÷ quantidade de embalagens) e todas as receitas refletem o novo custo automaticamente.


## V4.2 — Energia e etapas de produção

A Gestão & Precificação agora possui uma camada própria para energia e equipamentos:

- Cadastro de equipamentos com potência em watts.
- Tarifa de energia configurável em R$/kWh.
- Etapas de produção dentro de cada receita.
- Modo de cálculo por potência × tempo.
- Modo alternativo de custo manual.
- Uma receita pode ter várias etapas: cooktop de indução, micro-ondas, batedeira etc.
- O custo de energia entra no custo total e no preço sugerido.
- O cálculo é apresentado como **estimativa**, pois a potência nominal não significa consumo máximo contínuo.
- Compras continuam separadas de vendas/faturamento/caixa.

### Fórmula de energia

`kWh = (potência W ÷ 1000) × (tempo em minutos ÷ 60)`

`custo = kWh × tarifa R$/kWh`

Para instalar/atualizar o banco, execute `supabase-gestao.sql` no SQL Editor do Supabase.
