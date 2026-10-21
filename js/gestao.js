/* Gestão — Insumos & Compras.
   Cadastro de insumos com a mesma estrutura do app Doce Custo (busca, variação de preço,
   aproveitamentos, histórico e custo calculado) e visual do site Dois Amores. */
(() => {
  'use strict';

  const TABLES = Object.freeze({
    INSUMOS: 'insumos',
    COMPRAS: 'compras',
    ITENS_COMPRAS: 'itens_compras',
    ADMINS: 'gestao_admins'
  });

  const pad2 = (n) => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
  const currentMonth = () => todayStr().slice(0, 7);

  const state = {
    view: 'insumos',
    insumos: [], compras: [], itensCompras: [],
    busca: '', compraMes: currentMonth(), compraTodos: false
  };

  const $ = (id) => document.getElementById(id);
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const money4 = (v) => Number(v || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4});
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const rid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const esc = (v = '') => String(v).replace(/[&<>'"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[c]));
  const fmtDate = (v) => v ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—';
  const toast = (msg, type = '') => { const el = $('toast'); el.textContent = msg; el.className = `toast show ${type}`; clearTimeout(toast.timer); toast.timer = setTimeout(() => el.className = 'toast', 3600); };

  /* ---------- unidades e custo (mesma lógica do app Doce Custo) ---------- */
  const UNIT_OPTIONS = [['g', 'g'], ['kg', 'kg'], ['ml', 'ml'], ['l', 'L'], ['un', 'un']];
  function unitBase(unit) {
    const u = String(unit || '').toLowerCase().trim();
    if (['kg', 'quilo', 'quilo(s)'].includes(u)) return ['g', 1000];
    if (['g', 'grama', 'gramas'].includes(u)) return ['g', 1];
    if (['l', 'litro', 'litros'].includes(u)) return ['ml', 1000];
    if (['ml', 'mililitro', 'mililitros'].includes(u)) return ['ml', 1];
    return ['un', 1];
  }
  const unitLabel = (u) => { const k = String(u || '').toLowerCase(); return k === 'l' ? 'L' : (k === 'un' ? 'un' : k); };
  const unitOptionsHtml = (sel) => UNIT_OPTIONS.map(([v, l]) => `<option value="${v}" ${String(sel || '').toLowerCase() === v ? 'selected' : ''}>${l}</option>`).join('');

  // Formato neutro (qtd/un/preco) usado nos cálculos, igual ao do app.
  const asApp = (i) => ({qtd: num(i.quantidade_embalagem), un: i.unidade_compra, preco: num(i.preco_compra), aproveitamentos: Array.isArray(i.aproveitamentos) ? i.aproveitamentos : []});
  const uc = (n) => { const [b, f] = unitBase(n.un); return {b, p: n.qtd > 0 ? n.preco / (n.qtd * f) : 0}; };

  function normalizeAproveitamento(a) {
    if (!a || typeof a !== 'object') return null;
    const nome = String(a.nome || a.name || '').trim();
    if (!nome) return null;
    const quantidade = Number(a.quantidade ?? a.qtd ?? 0);
    const pesoMedio = Number(a.pesoMedio ?? a.peso ?? 0);
    return {id: String(a.id || rid()), nome, quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 0, pesoMedio: Number.isFinite(pesoMedio) && pesoMedio > 0 ? pesoMedio : 0};
  }
  function calcAproveitamentoResumo(n) {
    const itens = (Array.isArray(n.aproveitamentos) ? n.aproveitamentos : []).map(normalizeAproveitamento).filter(Boolean);
    const estimatedYield = itens.reduce((s, a) => s + (Number(a.quantidade) || 0) * (Number(a.pesoMedio) || 0), 0);
    const totalPrice = Number(n.preco) || 0, {b, p} = uc(n);
    const massPackage = b === 'g' && Number(n.qtd) > 0;
    const totalYield = massPackage ? Number(n.qtd) * (unitBase(n.un)[1]) : estimatedYield;
    const custoPorGrama = massPackage ? p : (totalYield > 0 ? totalPrice / totalYield : 0);
    const countScale = massPackage && estimatedYield > 0 ? totalYield / estimatedYield : 1;
    return {
      itens: itens.map(a => { const quantidade = (Number(a.quantidade) || 0) * countScale, pesoTotal = quantidade * (Number(a.pesoMedio) || 0); return {...a, quantidade, pesoTotal, custoUnitario: (Number(a.pesoMedio) || 0) * custoPorGrama}; }),
      totalYield, totalPrice, custoPorGrama
    };
  }
  function ctext(n) {
    if (Array.isArray(n.aproveitamentos) && n.aproveitamentos.length) {
      const r = calcAproveitamentoResumo(n);
      return r.itens.length ? `${money4(r.custoPorGrama)}/g · ${money(r.totalPrice)} / ${r.totalYield.toFixed(0)} g` : `${money4(n.preco || 0)} / ${n.un || 'un'}`;
    }
    const {b, p} = uc(n);
    return b === 'un' ? `${money4(p)}/un` : `${money4(p)}/${b} · ${money(p * 1000)}/${b === 'g' ? 'kg' : 'L'}`;
  }

  /* ---------- histórico de preços (pílula ▲▼) ---------- */
  const histOf = (i) => (Array.isArray(i.historico_precos) ? i.historico_precos : []).filter(h => h && Number.isFinite(Number(h.p)));
  function priceChange(i) { const h = histOf(i); return h.length > 1 && num(h[h.length - 2].p) > 0 ? num(h[h.length - 1].p) / num(h[h.length - 2].p) - 1 : null; }
  function pricePill(i) {
    const c = priceChange(i);
    if (c === null || c === 0) return '';
    return `<span class="pl ${c > 0 ? 'up' : 'down'}" title="Variação em relação ao preço anterior">${c > 0 ? '▲' : '▼'} ${Math.abs(c * 100).toFixed(1).replace('.', ',')}%</span>`;
  }
  function nextHistory(insumo, newPrice, date) {
    const h = histOf(insumo).map(x => ({d: x.d || null, p: num(x.p)}));
    if (!h.length && num(insumo.preco_compra) > 0) h.push({d: insumo.updated_at ? String(insumo.updated_at).slice(0, 10) : null, p: num(insumo.preco_compra)});
    if (!h.length || h[h.length - 1].p !== newPrice) h.push({d: date, p: newPrice});
    return h.slice(-30);
  }

  const findInsumo = (id) => state.insumos.find(x => String(x.id) === String(id));
  function lastPurchaseDate(insumoId) {
    let last = '';
    state.itensCompras.forEach(it => {
      if (String(it.insumo_id) !== String(insumoId)) return;
      const c = state.compras.find(x => x.id === it.compra_id);
      if (c && String(c.data_compra) > last) last = String(c.data_compra);
    });
    return last;
  }
  function datalists() {
    const uniq = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const opts = (list) => list.map(v => `<option value="${esc(v)}">`).join('');
    return `<datalist id="dl-categorias">${opts(uniq(state.insumos.map(i => i.categoria)))}</datalist><datalist id="dl-fornecedores">${opts(uniq(state.insumos.map(i => i.fornecedor).concat(state.compras.map(c => c.fornecedor))))}</datalist>`;
  }

  /* ---------- acesso ---------- */
  function showAccessError(message) { const error = $('access-error'); error.textContent = message; error.style.display = 'block'; }

  async function signIn(event) {
    event.preventDefault();
    const button = $('btn-access');
    button.disabled = true;
    $('access-error').style.display = 'none';
    try {
      const {error} = await _supabase.auth.signInWithPassword({email: $('access-email').value.trim(), password: $('access-password').value});
      if (error) throw error;
      await start();
    } catch (error) {
      console.error('Erro ao entrar na Gestão:', error);
      showAccessError('Não foi possível entrar. Confira o e-mail e a senha e tente novamente.');
    } finally { button.disabled = false; }
  }

  async function loadAll() {
    const [ins, comp, ci] = await Promise.all([
      db.from(TABLES.INSUMOS).select('*').order('nome'),
      db.from(TABLES.COMPRAS).select('*').order('data_compra', {ascending: false}),
      db.from(TABLES.ITENS_COMPRAS).select('*')
    ]);
    if ([ins, comp, ci].some(r => r.error)) throw new Error('As tabelas de Gestão ainda não foram configuradas no Supabase. Execute o arquivo supabase-gestao.sql (e, se já usava a Gestão antes, o supabase-gestao-v5.sql).');
    state.insumos = ins.data || []; state.compras = comp.data || []; state.itensCompras = ci.data || [];
  }

  function navigate(view) {
    if (!['insumos', 'compras'].includes(view)) view = 'insumos';
    state.view = view;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
    document.querySelectorAll('.side-link[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    const meta = {insumos: ['CADASTRO', 'Insumos'], compras: ['CONTROLE', 'Compras']};
    $('view-eyebrow').textContent = meta[view][0]; $('view-title').textContent = meta[view][1];
    if (view === 'insumos') renderInsumos();
    if (view === 'compras') renderCompras();
    $('sidebar').classList.remove('open');
  }

  /* ---------- INSUMOS ---------- */
  function insumoRowHtml(i) {
    const hasAp = Array.isArray(i.aproveitamentos) && i.aproveitamentos.length > 0;
    const extra = [i.categoria, i.fornecedor].filter(Boolean).map(esc).join(' · ');
    return `<div class="ins-row"><div><b>${esc(i.nome)}${hasAp ? '<span class="tag ap">aproveitamentos</span>' : ''}</b><small>${num(i.quantidade_embalagem)} ${unitLabel(i.unidade_compra)} · ${money(i.preco_compra)}${pricePill(i)}</small>${extra ? `<small>${extra}</small>` : ''}</div><div class="ins-cost">${ctext(asApp(i))}</div><div class="ins-acts"><button type="button" onclick="window.gestao.editIngredient('${i.id}')" title="Editar" aria-label="Editar"><i class="fa-solid fa-pen" aria-hidden="true"></i></button><button type="button" class="danger" onclick="window.gestao.deleteIngredient('${i.id}')" title="Excluir" aria-label="Excluir"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></div></div>`;
  }
  function filteredInsumos() {
    const q = state.busca.trim().toLowerCase();
    return state.insumos.filter(i => !q || [i.nome, i.categoria, i.fornecedor].some(v => String(v || '').toLowerCase().includes(q)));
  }
  function insumosListHtml() {
    const arr = filteredInsumos(); const q = state.busca.trim();
    return {count: `${arr.length} de ${state.insumos.length}`, html: arr.length ? arr.map(insumoRowHtml).join('') : `<div class="empty-dash">${q ? 'Nenhum insumo encontrado.' : 'Nenhum insumo ainda. Cadastre o primeiro para começar.'}</div>`};
  }
  function renderInsumos() {
    const l = insumosListHtml();
    $('view-insumos').innerHTML = `
      <div class="page-intro"><div><span class="eyebrow">BASE DE CUSTOS</span><h3>Insumos</h3><p>O que você compra e quanto custa cada embalagem.</p></div><button class="glass-btn primary" type="button" onclick="window.gestao.openIngredient()"><i class="fa-solid fa-plus"></i> Novo insumo</button></div>
      <div class="searchbar"><input class="input" id="busca-insumo" type="search" placeholder="Buscar insumo..." aria-label="Buscar insumo" value="${esc(state.busca)}"><span class="count" id="ins-count">${l.count}</span></div>
      <div class="list" id="ins-list">${l.html}</div>`;
    $('busca-insumo').addEventListener('input', (e) => {
      state.busca = e.target.value;
      const r = insumosListHtml(); $('ins-list').innerHTML = r.html; $('ins-count').textContent = r.count;
    });
  }

  function renderAproveitamentoSummary(n) {
    const items = Array.isArray(n.aproveitamentos) ? n.aproveitamentos.map(normalizeAproveitamento).filter(Boolean) : [];
    if (!items.length) return '<p class="muted small">Adicione os aproveitamentos para ver o resumo.</p>';
    const r = calcAproveitamentoResumo({...n, aproveitamentos: items});
    const detalhes = r.itens.map(a => `<div class="cost-line"><span>${esc(a.nome)} <small class="muted">${a.quantidade.toLocaleString('pt-BR', {maximumFractionDigits: 1})} × ${a.pesoMedio} g = ${a.pesoTotal.toFixed(0)} g</small></span><strong class="money">${money(a.custoUnitario)}</strong></div>`).join('');
    return `<div class="price-highlight"><small>Rendimento estimado</small><strong>${r.totalYield.toFixed(0)} g</strong><small>Custo da compra ${money(r.totalPrice)} · ${money4(r.custoPorGrama)}/g</small></div><div class="ap-box" style="margin-top:12px"><h4>Custos calculados</h4>${detalhes}<div class="cost-line total"><span>Total</span><strong>${r.totalYield.toFixed(0)} g</strong></div></div>`;
  }
  function apRowHtml(a = {}) {
    return `<div class="ap-row" data-ap-id="${esc(a.id || rid())}"><input class="input ap-nome" value="${esc(a.nome || '')}" placeholder="Nome do aproveitamento"><input class="input ap-quantidade" type="number" inputmode="decimal" step="any" min="0" value="${a.quantidade || ''}" placeholder="Qtd."><input class="input ap-peso" type="number" inputmode="decimal" step="any" min="0" value="${a.pesoMedio || ''}" placeholder="g"><button type="button" class="remove-row" data-act="rm-ap" aria-label="Remover aproveitamento"><i class="fa-solid fa-xmark"></i></button></div>`;
  }
  function apEditorHtml(items) {
    const rows = (items && items.length ? items : [{}]).map(apRowHtml).join('');
    return `<div class="ap-box"><h4>Aproveitamentos</h4><p>O aproveitamento permite transformar um insumo comprado em diferentes unidades ou partes utilizadas nas receitas. Exemplo: uma bandeja de morangos pode gerar morangos grandes e pequenos.</p><div class="ap-head"><span>Nome</span><span>Qtd.</span><span>Peso médio</span><span></span></div><div id="ap-list">${rows}</div><button class="glass-btn mini" type="button" data-act="add-ap"><i class="fa-solid fa-plus"></i> Adicionar aproveitamento</button><div class="ap-summary" id="ap-summary"></div></div>`;
  }
  const HELP_AP = 'O aproveitamento permite transformar um insumo comprado em diferentes unidades ou partes utilizadas nas receitas. Exemplo: uma bandeja de morangos pode gerar morangos grandes e pequenos.';

  function ingredientForm(i = {}) {
    const hasAp = Array.isArray(i.aproveitamentos) && i.aproveitamentos.length > 0;
    const hist = histOf(i);
    return `<div class="ins-form">
      <div class="form-grid"><div class="field full"><label class="lbl" for="f-name">Nome</label><input class="input" id="f-name" value="${esc(i.nome || '')}" placeholder="Ex.: Chocolate ao leite"></div></div>
      <div class="form-grid"><div class="field"><label class="lbl" for="f-pack">Quantidade da embalagem</label><input class="input" id="f-pack" type="number" inputmode="decimal" step="any" min="0" value="${i.quantidade_embalagem ? num(i.quantidade_embalagem) : ''}"></div><div class="field"><label class="lbl" for="f-unit">Unidade</label><select class="select" id="f-unit">${unitOptionsHtml(i.unidade_compra || 'g')}</select></div></div>
      <div class="form-grid"><div class="field full"><label class="lbl" for="f-price">Preço pago na embalagem (R$)</label><input class="input" id="f-price" type="number" inputmode="decimal" step="any" min="0" value="${i.preco_compra !== undefined ? num(i.preco_compra) : ''}"></div></div>
      <div class="form-grid"><div class="field"><label class="lbl" for="f-cat">Categoria <span class="muted">(opcional)</span></label><input class="input" id="f-cat" list="dl-categorias" autocomplete="off" value="${esc(i.categoria || '')}" placeholder="Chocolate, frutas..."></div><div class="field"><label class="lbl" for="f-supplier">Fornecedor <span class="muted">(opcional)</span></label><input class="input" id="f-supplier" list="dl-fornecedores" autocomplete="off" value="${esc(i.fornecedor || '')}"></div></div>
      <label class="ap-toggle"><span class="term-help">Este insumo possui diferentes aproveitamentos<span class="help-tip" data-tip="${esc(HELP_AP)}" aria-label="O que significa aproveitamento?" role="button" tabindex="0">i</span></span><input id="f-has-ap" type="checkbox" ${hasAp ? 'checked' : ''}></label>
      <div id="ap-wrap" ${hasAp ? '' : 'hidden'}>${apEditorHtml(i.aproveitamentos)}</div>
      <div class="calc-preview" id="f-preview"></div>
      ${hist.length > 1 ? `<p class="hist-line">Histórico: ${hist.slice(-5).map(h => `${h.d ? fmtDate(h.d) : 'antes'} ${money(h.p)}`).join(' · ')}</p>` : ''}
      ${datalists()}
      <div class="modal-actions"><button class="glass-btn" type="button" data-close-modal>Cancelar</button><button class="glass-btn primary" type="button" id="save-ingredient" style="width:auto">Salvar</button></div></div>`;
  }
  function readApRows() {
    return [...document.querySelectorAll('#ap-list .ap-row')].map(row => ({id: row.dataset.apId || rid(), nome: row.querySelector('.ap-nome').value.trim(), quantidade: num(row.querySelector('.ap-quantidade').value), pesoMedio: num(row.querySelector('.ap-peso').value)}));
  }
  function currentFormInsumo() { return {qtd: num($('f-pack').value), un: $('f-unit').value, preco: num($('f-price').value)}; }
  function updateIngredientPreview() {
    const el = $('f-preview'); if (!el) return;
    const n = currentFormInsumo();
    el.innerHTML = n.qtd > 0 && n.preco > 0 ? `<span>Custo calculado</span><strong>${ctext(n)}</strong>` : '<span>Informe quantidade e preço para ver o custo por g, ml ou unidade.</span>';
  }
  function updateApPreview() {
    const wrap = $('ap-wrap'), box = $('ap-summary'); if (!wrap || !box) return;
    wrap.hidden = !$('f-has-ap').checked;
    if (!wrap.hidden) box.innerHTML = renderAproveitamentoSummary({...currentFormInsumo(), aproveitamentos: readApRows()});
  }

  function openModal(title, body, eyebrow = 'GESTÃO') { $('modal-title').textContent = title; $('modal-eyebrow').textContent = eyebrow; $('modal-body').innerHTML = body; $('modal').classList.remove('hidden'); }
  function closeModal() { $('modal').classList.add('hidden'); $('modal-body').innerHTML = ''; }

  function openIngredient(id = null) {
    const i = id ? (findInsumo(id) || {}) : {};
    openModal(id ? 'Editar insumo' : 'Novo insumo', ingredientForm(i), 'INSUMOS');
    updateIngredientPreview(); updateApPreview();
    $('save-ingredient').onclick = () => saveIngredient(id);
    setTimeout(() => { const f = $('f-name'); if (f && !id) f.focus(); }, 60);
  }

  const MISSING_COL = /aproveitamentos|historico_precos/i;
  async function writeInsumo(payload, id) {
    const run = (p) => id ? db.from(TABLES.INSUMOS).update(p).eq('id', id) : db.from(TABLES.INSUMOS).insert(p).select().single();
    let res = await run(payload);
    if (res.error && MISSING_COL.test(res.error.message || '')) {
      const {aproveitamentos, historico_precos, ...basic} = payload;
      res = await run(basic);
      if (!res.error) res.legacy = true;
    }
    return res;
  }
  async function saveIngredient(id) {
    const atual = id ? findInsumo(id) : null;
    const nome = $('f-name').value.trim(), qtd = num($('f-pack').value), preco = num($('f-price').value);
    if (!nome || !(qtd > 0)) { toast('Preencha o nome e a quantidade.', 'error'); return; }
    if (preco < 0) { toast('O preço não pode ser negativo.', 'error'); return; }
    let aproveitamentos = [];
    if ($('f-has-ap').checked) {
      aproveitamentos = readApRows().filter(a => a.nome && a.quantidade > 0 && a.pesoMedio > 0);
      if (!aproveitamentos.length) { toast('Adicione pelo menos um aproveitamento válido.', 'error'); return; }
    }
    const base = atual ? {...atual} : {preco_compra: undefined, historico_precos: []};
    const hist = histOf(base).map(h => ({d: h.d || null, p: num(h.p)}));
    if (atual && num(atual.preco_compra) !== preco) { if (!hist.length && num(atual.preco_compra) > 0) hist.push({d: atual.updated_at ? String(atual.updated_at).slice(0, 10) : null, p: num(atual.preco_compra)}); hist.push({d: todayStr(), p: preco}); }
    else if (!hist.length) hist.push({d: todayStr(), p: preco});
    const payload = {nome, categoria: $('f-cat').value.trim(), fornecedor: $('f-supplier').value.trim(), quantidade_embalagem: qtd, unidade_compra: $('f-unit').value, preco_compra: preco, aproveitamentos, historico_precos: hist.slice(-30), updated_at: new Date().toISOString()};
    const btn = $('save-ingredient'); btn.disabled = true;
    const {error, legacy} = await writeInsumo(payload, id);
    btn.disabled = false;
    if (error) { toast(error.message, 'error'); return; }
    closeModal(); await refresh();
    if (legacy) toast('Insumo salvo, mas aproveitamentos e histórico exigem executar o supabase-gestao-v5.sql no Supabase.', 'error'); else toast('Insumo salvo.', 'success');
  }
  function editIngredient(id) { openIngredient(id); }
  async function deleteIngredient(id) {
    const usado = state.itensCompras.some(it => String(it.insumo_id) === String(id));
    if (usado) { toast('Este insumo está em compras registradas e não pode ser excluído.', 'error'); return; }
    if (!confirm('Excluir este insumo?')) return;
    const {error} = await db.from(TABLES.INSUMOS).delete().eq('id', id);
    if (error) { toast('Não foi possível excluir. O insumo pode estar em uso em outro registro.', 'error'); return; }
    await refresh(); toast('Insumo excluído.', 'success');
  }

  /* ---------- COMPRAS ---------- */
  function renderCompras() {
    const month = state.compraMes, all = state.compraTodos;
    const purchases = state.compras.filter(c => all || String(c.data_compra || '').slice(0, 7) === month);
    const total = purchases.reduce((s, c) => s + num(c.total), 0);
    $('view-compras').innerHTML = `<div class="page-intro"><div><span class="eyebrow">CONTROLE DE COMPRAS</span><h3>Compras</h3><p>Registre as compras de insumos. O preço de referência de cada insumo é atualizado automaticamente.</p></div><div class="actions"><label class="check"><input type="checkbox" id="purchase-all" ${all ? 'checked' : ''}> Todos os meses</label><input class="input" type="month" id="purchase-month" value="${month}" ${all ? 'disabled' : ''} style="width:auto"><button class="glass-btn primary" type="button" onclick="window.gestao.openPurchase()"><i class="fa-solid fa-plus"></i> Registrar compra</button></div></div>
      <div class="stats" style="grid-template-columns:repeat(2,1fr)"><div class="stat"><div class="label">${all ? 'Total geral' : 'Total do mês'}</div><div class="value money">${money(total)}</div></div><div class="stat"><div class="label">Quantidade de compras</div><div class="value">${purchases.length}</div></div></div>
      <div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Fornecedor</th><th>Itens</th><th>Observação</th><th>Total</th><th></th></tr></thead><tbody>${purchases.length ? purchases.map(c => { const its = state.itensCompras.filter(i => i.compra_id === c.id); return `<tr><td>${fmtDate(c.data_compra)}</td><td>${esc(c.fornecedor || '—')}</td><td><button class="glass-btn mini" type="button" onclick="window.gestao.viewPurchase('${c.id}')">${its.length} item(ns)</button></td><td>${esc(c.observacao || '—')}</td><td class="money"><strong>${money(c.total)}</strong></td><td><button class="icon-btn" type="button" aria-label="Editar compra" title="Editar compra" onclick="window.gestao.editPurchase('${c.id}')"><i class="fa-solid fa-pen"></i></button><button class="icon-btn" type="button" aria-label="Excluir compra" onclick="window.gestao.deletePurchase('${c.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`; }).join('') : '<tr><td colspan="6"><div class="empty">Nenhuma compra neste período.</div></td></tr>'}</tbody></table></div></div>`;
    $('purchase-month').onchange = e => { state.compraMes = e.target.value || currentMonth(); renderCompras(); };
    $('purchase-all').onchange = e => { state.compraTodos = e.target.checked; renderCompras(); };
  }

  function insumoOptionsHtml(selected) {
    return state.insumos.map(i => `<option value="${i.id}" ${String(i.id) === String(selected) ? 'selected' : ''}>${esc(i.nome)} (${num(i.quantidade_embalagem)} ${unitLabel(i.unidade_compra)})</option>`).join('');
  }
  function purchaseForm(purchase) {
    return `<div class="form-grid"><div class="field"><label>Data *</label><input class="input" id="p-date" type="date" value="${esc(purchase?.data_compra || todayStr())}"></div><div class="field"><label>Fornecedor</label><input class="input" id="p-supplier" list="dl-fornecedores" autocomplete="off" value="${esc(purchase?.fornecedor || '')}"></div><div class="field full"><label>Observação</label><input class="input" id="p-note" placeholder="Ex.: compra semanal" value="${esc(purchase?.observacao || '')}"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:24px 0 10px"><div><strong>Itens da compra</strong><div class="muted small">O preço do cadastro é sugerido; ajuste para informar o valor pago nesta compra.</div></div><div class="actions"><button class="glass-btn mini" type="button" id="toggle-inline-ins"><i class="fa-solid fa-plus"></i> Novo insumo</button><button class="glass-btn" type="button" id="add-purchase-row"><i class="fa-solid fa-plus"></i> Adicionar item</button></div></div>
      <div class="inline-new" id="inline-ins" hidden><h4>Novo insumo</h4><div class="form-grid"><div class="field full"><label>Nome</label><input class="input" id="ni-name" placeholder="Ex.: Chocolate ao leite"></div><div class="field"><label>Quantidade da embalagem</label><input class="input" id="ni-pack" type="number" inputmode="decimal" step="any" min="0" placeholder="Ex.: 500"></div><div class="field"><label>Unidade</label><select class="select" id="ni-unit">${unitOptionsHtml('g')}</select></div><div class="field full"><label>Preço pago na embalagem (R$)</label><input class="input" id="ni-price" type="number" inputmode="decimal" step="any" min="0" placeholder="Ex.: 12,50"></div></div><div class="modal-actions"><button class="glass-btn" type="button" id="cancel-inline-ins">Cancelar</button><button class="glass-btn primary" type="button" id="save-inline-ins" style="width:auto">Criar e adicionar</button></div></div>
      <div id="purchase-rows" class="purchase-items"></div><div class="cost-line total"><span>Total da compra</span><strong class="money" id="p-total-line">R$ 0,00</strong></div>${datalists()}
      <div class="modal-actions"><button class="glass-btn" type="button" data-close-modal>Cancelar</button><button class="glass-btn primary" type="button" id="save-purchase" style="width:auto">Salvar compra</button></div>`;
  }
  function addPurchaseRow(item = {}) {
    const wrap = $('purchase-rows'); const row = document.createElement('div'); row.className = 'purchase-row';
    row.dataset.itemId = item.id || '';
    row.innerHTML = `<div class="field"><label>Insumo</label><select class="select p-insumo">${insumoOptionsHtml(item.insumo_id)}</select></div><div class="field"><label>Qtd.</label><input class="input p-qty" type="number" step="0.001" min="0" value="${item.quantidade !== undefined ? num(item.quantidade) : 1}"></div><div class="field"><label>Preço/emb. (R$)</label><input class="input p-price" type="number" step="0.0001" min="0" value="0.00" aria-label="Preço pago por embalagem"></div><div class="field"><label>Total (R$)</label><input class="input p-total" type="number" step="0.01" value="0.00" readonly aria-label="Total calculado do item"></div><button type="button" class="remove-row" title="Remover" aria-label="Remover item"><i class="fa-solid fa-xmark"></i></button>`;
    row.querySelector('.remove-row').onclick = () => { row.remove(); updatePurchaseTotal(); };
    wrap.appendChild(row);
    if (item.preco_unitario !== undefined) row.querySelector('.p-price').value = String(num(item.preco_unitario));
    updatePurchaseRow(row, item.preco_unitario === undefined); return row;
  }
  function updatePurchaseRow(row, resetPrice = false) {
    const insumo = findInsumo(row.querySelector('.p-insumo').value);
    const priceInput = row.querySelector('.p-price');
    if (resetPrice) priceInput.value = insumo ? num(insumo.preco_compra).toFixed(2) : '0.00';
    const preco = num(priceInput.value);
    const quantidade = num(row.querySelector('.p-qty').value);
    row.querySelector('.p-total').value = (Math.round(quantidade * preco * 100) / 100).toFixed(2);
  }
  function updatePurchaseTotal() { const el = $('p-total-line'); if (!el) return; el.textContent = money([...document.querySelectorAll('.purchase-row .p-total')].reduce((s, i) => s + num(i.value), 0)); }
  function openPurchase() {
    openPurchaseForm(null);
  }
  function editPurchase(id) {
    const purchase = state.compras.find(c => c.id === id);
    if (!purchase) { toast('Compra não encontrada.', 'error'); return; }
    openPurchaseForm(purchase);
  }
  function openPurchaseForm(purchase) {
    const items = purchase ? state.itensCompras.filter(i => i.compra_id === purchase.id) : [];
    openModal(purchase ? 'Editar compra' : 'Registrar compra', purchaseForm(purchase), 'COMPRAS');
    if (purchase) items.forEach(addPurchaseRow);
    else if (state.insumos.length) addPurchaseRow(); else { $('inline-ins').hidden = false; }
    $('add-purchase-row').onclick = () => { if (!state.insumos.length) { toast('Crie um insumo primeiro.', 'error'); $('inline-ins').hidden = false; return; } addPurchaseRow(); };
    $('purchase-rows').addEventListener('input', event => {
      if (event.target.matches('.p-qty, .p-price')) updatePurchaseRow(event.target.closest('.purchase-row'));
      updatePurchaseTotal();
    });
    $('purchase-rows').addEventListener('change', event => {
      if (event.target.matches('.p-insumo')) updatePurchaseRow(event.target.closest('.purchase-row'), true);
      updatePurchaseTotal();
    });
    $('toggle-inline-ins').onclick = () => { $('inline-ins').hidden = !$('inline-ins').hidden; };
    $('cancel-inline-ins').onclick = () => { $('inline-ins').hidden = true; };
    $('save-inline-ins').onclick = saveInlineInsumo;
    $('save-purchase').onclick = () => savePurchase(purchase);
  }
  async function saveInlineInsumo() {
    const nome = $('ni-name').value.trim(), qtd = num($('ni-pack').value), preco = num($('ni-price').value);
    if (!nome || !(qtd > 0) || preco < 0 || $('ni-price').value === '') { toast('Informe o nome, a quantidade e o preço pago na embalagem.', 'error'); return; }
    const payload = {nome, categoria: '', fornecedor: '', quantidade_embalagem: qtd, unidade_compra: $('ni-unit').value, preco_compra: preco, aproveitamentos: [], historico_precos: [{d: todayStr(), p: preco}], updated_at: new Date().toISOString()};
    const btn = $('save-inline-ins'); btn.disabled = true;
    const {data, error} = await writeInsumo(payload, null);
    btn.disabled = false;
    if (error || !data) { toast(error ? error.message : 'Não foi possível criar o insumo.', 'error'); return; }
    state.insumos = [...state.insumos, data].sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    document.querySelectorAll('.purchase-row .p-insumo').forEach(sel => { const v = sel.value; sel.innerHTML = insumoOptionsHtml(v); sel.value = v; });
    const empty = [...document.querySelectorAll('.purchase-row')].find(r => !r.querySelector('.p-insumo').value);
    const row = empty || addPurchaseRow(); row.querySelector('.p-insumo').value = data.id; updatePurchaseRow(row, true);
    ['ni-name', 'ni-pack', 'ni-price'].forEach(k => $(k).value = ''); $('inline-ins').hidden = true; updatePurchaseTotal();
    toast('Insumo criado e adicionado à compra.', 'success');
  }
  async function savePurchase(purchase = null) {
    if (!$('p-date').value) { toast('Informe a data da compra.', 'error'); return; }
    const rows = [...document.querySelectorAll('.purchase-row')];
    if (!rows.length) { toast('Adicione pelo menos um item.', 'error'); return; }
    if (rows.some(r => !r.querySelector('.p-price').value.trim())) { toast('Informe o preço por embalagem de cada item.', 'error'); return; }
    const items = rows.map(r => {
      const insumo_id = r.querySelector('.p-insumo').value, quantidade = num(r.querySelector('.p-qty').value);
      const priceInput = r.querySelector('.p-price');
      const preco_unitario = num(priceInput.value);
      return {id: r.dataset.itemId || null, insumo_id, quantidade, preco_unitario, total: Math.round(quantidade * preco_unitario * 100) / 100};
    });
    if (items.some(i => !i.insumo_id || i.quantidade <= 0 || i.preco_unitario < 0)) { toast('Revise os itens da compra.', 'error'); return; }
    const btn = $('save-purchase'); btn.disabled = true;
    const purchaseDate = $('p-date').value; const total = items.reduce((s, i) => s + i.total, 0);
    if (purchase) {
      const updatedPurchase = {data_compra: purchaseDate, fornecedor: $('p-supplier').value.trim(), observacao: $('p-note').value.trim(), total};
      const {error: ec} = await db.from(TABLES.COMPRAS).update(updatedPurchase).eq('id', purchase.id);
      if (ec) { btn.disabled = false; toast(ec.message, 'error'); return; }
      const payload = items.map(i => ({...(i.id ? {id: i.id} : {}), compra_id: purchase.id, insumo_id: i.insumo_id, quantidade: i.quantidade, unidade: findInsumo(i.insumo_id)?.unidade_compra || 'un', preco_unitario: i.preco_unitario, total: i.total}));
      const {error: ei} = await db.from(TABLES.ITENS_COMPRAS).upsert(payload);
      if (ei) {
        const {error: rollbackError} = await db.from(TABLES.COMPRAS).update({data_compra: purchase.data_compra, fornecedor: purchase.fornecedor, observacao: purchase.observacao, total: purchase.total}).eq('id', purchase.id);
        btn.disabled = false;
        toast(rollbackError ? `${ei.message} Também não foi possível restaurar os dados da compra: ${rollbackError.message}` : ei.message, 'error');
        return;
      }
      const retainedIds = items.map(i => i.id).filter(Boolean);
      const removedIds = state.itensCompras.filter(i => i.compra_id === purchase.id && !retainedIds.includes(i.id)).map(i => i.id);
      if (removedIds.length) {
        const {error: er} = await db.from(TABLES.ITENS_COMPRAS).delete().in('id', removedIds);
        if (er) { btn.disabled = false; closeModal(); await refresh(); toast(`Compra atualizada, mas alguns itens removidos não puderam ser excluídos: ${er.message}`, 'error'); return; }
      }
      btn.disabled = false; closeModal(); await refresh();
      state.compraMes = purchaseDate.slice(0, 7); state.compraTodos = false; navigate('compras');
      toast('Compra atualizada. O preço de referência dos insumos não foi alterado.', 'success');
      return;
    }
    const {data: comp, error} = await db.from(TABLES.COMPRAS).insert({data_compra: purchaseDate, fornecedor: $('p-supplier').value.trim(), observacao: $('p-note').value.trim(), total}).select().single();
    if (error) { btn.disabled = false; toast(error.message, 'error'); return; }
    const payload = items.map(i => ({compra_id: comp.id, insumo_id: i.insumo_id, quantidade: i.quantidade, unidade: findInsumo(i.insumo_id)?.unidade_compra || 'un', preco_unitario: i.preco_unitario, total: i.total}));
    const {error: ei} = await db.from(TABLES.ITENS_COMPRAS).insert(payload);
    if (ei) { await db.from(TABLES.COMPRAS).delete().eq('id', comp.id); btn.disabled = false; toast(ei.message, 'error'); return; }
    let repriced = 0;
    for (const item of items) {
      const ins = findInsumo(item.insumo_id);
      if (!ins || item.quantidade <= 0 || item.total <= 0) continue;
      if (purchaseDate < lastPurchaseDate(item.insumo_id)) continue; // compra antiga não sobrescreve o preço de referência
      const novo = item.preco_unitario;
      const upd = {preco_compra: novo, updated_at: new Date().toISOString(), historico_precos: nextHistory(ins, novo, purchaseDate)};
      let {error: eu} = await db.from(TABLES.INSUMOS).update(upd).eq('id', item.insumo_id);
      if (eu && MISSING_COL.test(eu.message || '')) { const {historico_precos, ...basic} = upd; ({error: eu} = await db.from(TABLES.INSUMOS).update(basic).eq('id', item.insumo_id)); }
      if (!eu) { repriced++; ins.preco_compra = novo; }
    }
    btn.disabled = false; closeModal(); await refresh();
    state.compraMes = purchaseDate.slice(0, 7); state.compraTodos = false; navigate('compras');
    toast(repriced ? `Compra registrada. ${repriced} preço(s) de referência atualizado(s).` : 'Compra registrada.', 'success');
  }
  function viewPurchase(id) {
    const c = state.compras.find(x => x.id === id); if (!c) return;
    const its = state.itensCompras.filter(i => i.compra_id === id);
    openModal(`Compra de ${fmtDate(c.data_compra)}`, `<div class="muted" style="margin-bottom:14px">${esc(c.fornecedor || 'Sem fornecedor')}${c.observacao ? ` · ${esc(c.observacao)}` : ''}</div><div class="table-wrap"><table class="table" style="min-width:0"><thead><tr><th>Insumo</th><th>Qtd.</th><th>Preço por emb.</th><th>Total</th></tr></thead><tbody>${its.map(i => { const ins = findInsumo(i.insumo_id); return `<tr><td><strong>${esc(ins?.nome || 'Insumo removido')}</strong></td><td>${num(i.quantidade)} emb.</td><td class="money">${money(i.preco_unitario)}</td><td class="money">${money(i.total)}</td></tr>`; }).join('')}</tbody></table></div><div class="cost-line total"><span>Total</span><strong class="money">${money(c.total)}</strong></div><div class="modal-actions"><button class="glass-btn" type="button" data-close-modal>Fechar</button><button class="glass-btn primary" type="button" onclick="window.gestao.editPurchase('${c.id}')">Editar compra</button></div>`, 'COMPRAS');
  }
  async function deletePurchase(id) {
    if (!confirm('Excluir esta compra e seus itens? O preço de referência dos insumos não será alterado.')) return;
    await db.from(TABLES.ITENS_COMPRAS).delete().eq('compra_id', id);
    const {error} = await db.from(TABLES.COMPRAS).delete().eq('id', id);
    if (error) { toast(error.message, 'error'); return; }
    await refresh(); toast('Compra excluída.', 'success');
  }

  async function refresh() { try { await loadAll(); navigate(state.view); } catch (e) { console.error(e); toast(e.message, 'error'); } }

  async function start() {
    $('access-error').style.display = 'none';
    $('access-screen').classList.remove('hidden');
    $('app').classList.add('hidden');
    try {
      const {data, error} = await _supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) return;
      const {data: admin, error: adminError} = await db.from(TABLES.ADMINS).select('user_id').eq('user_id', data.session.user.id).maybeSingle();
      if (adminError) throw new Error('Não foi possível validar a permissão de administradora. Execute o arquivo supabase-gestao.sql no SQL Editor do Supabase.');
      if (!admin) {
        const {error: signOutError} = await _supabase.auth.signOut();
        if (signOutError) throw signOutError;
        showAccessError('Esta conta não está autorizada a acessar a Gestão.');
        return;
      }
      $('access-screen').classList.add('hidden');
      $('app').classList.remove('hidden');
      await loadAll();
      navigate('insumos');
    } catch (e) {
      console.error('Erro ao carregar a Gestão:', e);
      if (!$('app').classList.contains('hidden')) $('view-insumos').innerHTML = `<div class="panel empty"><i class="fa-solid fa-database"></i><div>${esc(e.message)}</div></div>`;
      else showAccessError(e.message);
    }
  }

  document.querySelectorAll('.side-link[data-view]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.view)));
  $('mobile-menu').addEventListener('click', () => $('sidebar').classList.toggle('open'));
  $('btn-refresh').addEventListener('click', refresh);
  $('btn-voltar').addEventListener('click', () => window.location.href = 'index.html?abrirAdmin=1');
  $('access-form').addEventListener('submit', signIn);
  $('toggle-access-password').addEventListener('click', event => {
    const button = event.currentTarget, password = $('access-password'), isVisible = password.type === 'password';
    password.type = isVisible ? 'text' : 'password';
    button.setAttribute('aria-label', isVisible ? 'Ocultar senha' : 'Mostrar senha');
    button.setAttribute('aria-pressed', String(isVisible));
    button.querySelector('i').classList.toggle('fa-eye', !isVisible);
    button.querySelector('i').classList.toggle('fa-eye-slash', isVisible);
  });
  // Modal: fechar, dicas e eventos do formulário de insumo (delegados, valem para botões criados depois)
  $('modal').addEventListener('click', e => {
    if (e.target.id === 'modal' || e.target.closest('[data-close-modal]')) { closeModal(); return; }
    const tip = e.target.closest('.help-tip'); if (tip) { toast(tip.dataset.tip); return; }
    const act = e.target.closest('[data-act]'); if (!act) return;
    if (act.dataset.act === 'add-ap') { $('ap-list').insertAdjacentHTML('beforeend', apRowHtml()); updateApPreview(); }
    if (act.dataset.act === 'rm-ap') { const row = act.closest('.ap-row'); if (row) row.remove(); updateApPreview(); }
  });
  $('modal').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.help-tip')) { e.preventDefault(); toast(e.target.dataset.tip); } });
  const onFormInput = (e) => {
    const t = e.target;
    if (['f-pack', 'f-unit', 'f-price'].includes(t.id)) { updateIngredientPreview(); updateApPreview(); }
    else if (t.id === 'f-has-ap' || t.classList.contains('ap-nome') || t.classList.contains('ap-quantidade') || t.classList.contains('ap-peso')) updateApPreview();
  };
  $('modal').addEventListener('input', onFormInput);
  $('modal').addEventListener('change', onFormInput);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').classList.contains('hidden')) closeModal(); });

  window.gestao = {navigate, openIngredient, editIngredient, deleteIngredient, openPurchase, editPurchase, viewPurchase, deletePurchase, closeModal};
  start();
})();
