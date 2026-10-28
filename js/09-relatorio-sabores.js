/* Relatório por Sabor e Período
 * Filtra pedidos (individuais e coletivos) por intervalo de datas e por sabor,
 * somando a quantidade de cada sabor. Sabores vêm de duas fontes:
 *  - nome do produto (ex.: "Morango do Amor")
 *  - sabores dentro das caixas mistas (obs "Sabores: 2x Ninho, 1x Nutella")
 */
let relatorioSaboresUltimo = null;

function relEscapeHtml(texto) {
  return String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function relNormalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Aceita "yyyy-mm-dd" ou "dd/mm/yyyy" e devolve "yyyy-mm-dd" (ou '' se inválida).
function relDataParaIso(valor) {
  const v = String(valor || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
}

function relDataBr(iso) {
  const [a, m, d] = String(iso).split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

// Lê "Sabores: 2x Ninho, 1x Nutella" e devolve [{ sabor, qtd }].
function relExtrairSaboresCaixa(obs) {
  const texto = String(obs || '');
  if (!texto.includes('Sabores:')) return [];
  const resultado = [];
  texto.split('Sabores:')[1].split(',').forEach(parte => {
    const m = parte.trim().match(/^(\d+)\s*x\s+(.+)$/i);
    if (m) resultado.push({ sabor: m[2].trim(), qtd: parseInt(m[1], 10) });
  });
  return resultado;
}

// Junta pedidos individuais e coletivos no mesmo formato (como o painel já faz na visão geral).
function relObterPedidosUnificados() {
  const pedidos = listaPedidos.map(p => ({
    origem: 'individual', cliente: p.cliente, itens: p.itens || [],
    dataEntrega: relDataParaIso(p.dataAgendada), dataPedido: relDataParaIso(p.data)
  }));

  (listaColetivos || []).forEach(col => {
    const itens = [];
    (col.colaboradores || []).forEach(c => {
      (c.itens || []).forEach(i => {
        const prod = produtosCardapio.find(p => p.id === i.produtoId);
        itens.push({
          id: i.produtoId,
          name: prod ? prod.name : 'Item Coletivo',
          quantity: parseInt(i.quantidade, 10) || 1,
          obs: i.obs || c.obs || ''
        });
      });
    });
    pedidos.push({
      origem: 'coletivo', cliente: col.responsavel_nome, itens,
      dataEntrega: relDataParaIso(col.data_encomenda), dataPedido: relDataParaIso(col.data)
    });
  });
  return pedidos;
}

function abrirModalRelatorioSabores() {
  const hoje = new Date();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (!$('rel-data-inicio').value) $('rel-data-inicio').value = iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  if (!$('rel-data-fim').value) $('rel-data-fim').value = iso(hoje);
  $('modal-relatorio-sabores').classList.add('open');
  gerarRelatorioSaboresPeriodo();
}

function fecharModalRelatorioSabores() {
  $('modal-relatorio-sabores').classList.remove('open');
}

function definirPeriodoRelatorioRapido(tipo) {
  const hoje = new Date();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let ini = new Date(hoje), fim = new Date(hoje);
  if (tipo === '7d') ini.setDate(hoje.getDate() - 6);
  else if (tipo === '30d') ini.setDate(hoje.getDate() - 29);
  else if (tipo === 'mes') ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  else if (tipo === 'mes-anterior') {
    ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  }
  $('rel-data-inicio').value = iso(ini);
  $('rel-data-fim').value = iso(fim);
  gerarRelatorioSaboresPeriodo();
}

async function gerarRelatorioSaboresPeriodo() {
  const inicio = $('rel-data-inicio').value;
  const fim = $('rel-data-fim').value;
  const resultado = $('rel-resultado');

  if (!inicio || !fim) { resultado.innerHTML = '<p class="rel-vazio">Escolha a data inicial e a final.</p>'; return; }
  if (inicio > fim) { resultado.innerHTML = '<p class="rel-vazio">A data inicial não pode ser depois da final.</p>'; return; }

  resultado.innerHTML = '<p class="rel-vazio">Carregando pedidos...</p>';
  await Promise.all([carregarPedidosNuvem(), carregarColetivosNuvem()]);

  const campoData = $('rel-base-data').value; // 'dataEntrega' | 'dataPedido'
  const incluirColetivos = $('rel-incluir-coletivos').checked;
  const buscaSabor = relNormalizar($('rel-filtro-sabor').value);

  const contagem = {}; // chave normalizada -> { sabor, qtd }
  let pedidosNoPeriodo = 0;

  relObterPedidosUnificados().forEach(pedido => {
    if (pedido.origem === 'coletivo' && !incluirColetivos) return;
    // Sem data de entrega, cai para a data em que o pedido foi feito.
    const data = pedido[campoData] || pedido.dataPedido || pedido.dataEntrega;
    if (!data || data < inicio || data > fim) return;
    pedidosNoPeriodo++;

    pedido.itens.forEach(item => {
      if (item.id === 'taxa_entrega') return;
      const qtdItem = parseInt(item.quantity, 10) || 1;
      const caixa = relExtrairSaboresCaixa(item.obs);

      if (caixa.length > 0) {
        // Caixa mista: conta cada sabor da caixa (a caixa em si não entra como "sabor").
        caixa.forEach(({ sabor, qtd }) => relSomar(contagem, sabor, qtd * qtdItem));
      } else {
        relSomar(contagem, item.name || 'Sem nome', qtdItem);
      }
    });
  });

  const linhas = Object.values(contagem)
    .filter(l => !buscaSabor || relNormalizar(l.sabor).includes(buscaSabor))
    .sort((a, b) => b.qtd - a.qtd || a.sabor.localeCompare(b.sabor, 'pt-BR'));

  const total = linhas.reduce((s, l) => s + l.qtd, 0);
  relatorioSaboresUltimo = { inicio, fim, linhas, total, pedidosNoPeriodo, filtro: $('rel-filtro-sabor').value.trim() };

  // Sugestões do campo de sabor: tudo que existe no período, sem o filtro aplicado.
  $('rel-lista-sabores').innerHTML = Object.values(contagem)
    .sort((a, b) => a.sabor.localeCompare(b.sabor, 'pt-BR'))
    .map(l => `<option value="${relEscapeHtml(l.sabor)}"></option>`).join('');

  if (linhas.length === 0) {
    resultado.innerHTML = `<p class="rel-vazio">Nenhum sabor encontrado entre ${relDataBr(inicio)} e ${relDataBr(fim)}${buscaSabor ? ' com esse filtro' : ''}.</p>`;
    return;
  }

  resultado.innerHTML = `
    <p class="rel-resumo">${pedidosNoPeriodo} pedido(s) · <b>${total}</b> unidade(s) · ${linhas.length} sabor(es)</p>
    <table class="rel-tabela">
      <thead><tr><th>Sabor</th><th style="text-align:center;">Quantidade</th><th style="text-align:center;">% do total</th></tr></thead>
      <tbody>
        ${linhas.map(l => `<tr><td>${relEscapeHtml(l.sabor)}</td><td style="text-align:center;"><b>${l.qtd}</b></td><td style="text-align:center;">${((l.qtd / total) * 100).toFixed(1).replace('.', ',')}%</td></tr>`).join('')}
      </tbody>
    </table>`;
}

function relSomar(contagem, sabor, qtd) {
  const chave = relNormalizar(sabor);
  if (!chave) return;
  if (!contagem[chave]) contagem[chave] = { sabor: String(sabor).trim(), qtd: 0 };
  contagem[chave].qtd += qtd;
}

function imprimirRelatorioSaboresPeriodo() {
  const r = relatorioSaboresUltimo;
  if (!r || r.linhas.length === 0) { alert('Gere um relatório com resultados antes de imprimir.'); return; }
  $('relatorio-print-area').innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <h2 style="margin:0; color:#2a0f14;">Dois Amores Doceria</h2>
      <p style="margin:5px 0; font-size:14px; color:#555;">Relatório por Sabor — ${relDataBr(r.inicio)} a ${relDataBr(r.fim)}${r.filtro ? ` · filtro: ${relEscapeHtml(r.filtro)}` : ''}</p>
    </div>
    <table class="print-table">
      <thead><tr><th>Sabor</th><th style="text-align:center;">Qtd</th></tr></thead>
      <tbody>${r.linhas.map(l => `<tr><td>${relEscapeHtml(l.sabor)}</td><td style="text-align:center;"><b>${l.qtd}</b></td></tr>`).join('')}</tbody>
    </table>
    <div style="margin-top:20px; text-align:right;"><p><b>Total:</b> ${r.total} unidade(s) em ${r.pedidosNoPeriodo} pedido(s)</p></div>`;
  window.print();
}

function baixarCsvRelatorioSabores() {
  const r = relatorioSaboresUltimo;
  if (!r || r.linhas.length === 0) { alert('Gere um relatório com resultados antes de baixar.'); return; }
  const aspas = v => `"${String(v).replace(/"/g, '""')}"`;
  const csv = ['Sabor;Quantidade', ...r.linhas.map(l => `${aspas(l.sabor)};${l.qtd}`), `${aspas('TOTAL')};${r.total}`].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio-sabores_${r.inicio}_a_${r.fim}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
