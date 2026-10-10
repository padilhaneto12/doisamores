/* Gestão & Precificação — módulo independente do painel principal. */
(() => {
  'use strict';

  const TABLES = Object.freeze({
    INSUMOS: 'insumos',
    COMPRAS: 'compras',
    ITENS_COMPRAS: 'itens_compras',
    RECEITAS: 'receitas',
    RECEITA_ITENS: 'receita_itens',
    EQUIPAMENTOS: 'equipamentos',
    RECEITA_ETAPAS: 'receita_etapas',
    CONFIG: 'configuracoes_gestao',
    ADMINS: 'gestao_admins'
  });

  const pad2 = (n) => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
  const currentMonth = () => todayStr().slice(0, 7);

  const state = {
    compraTodos: false,
    insumos: [], compras: [], itensCompras: [], receitas: [], receitaItens: [], equipamentos: [], receitaEtapas: [], produtos: [], config: {tarifa_kwh: 0},
    view: 'dashboard', compraMes: currentMonth(), selectedRecipeId: null,
    purchaseDraft: [], recipeDraft: [], recipeMargin: 60
  };

  const $ = (id) => document.getElementById(id);
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  const num = (v) => Number(v || 0);
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const money4 = (v) => Number(v || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:4});
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmtDate = (v) => v ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR') : '—';
  const toast = (msg, type='') => { const el=$('toast'); el.textContent=msg; el.className=`toast show ${type}`; clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.className='toast',3000); };

  function unitBase(unit) {
    const u = String(unit || '').toLowerCase().trim();
    if (['kg','quilo','quilo(s)'].includes(u)) return ['g',1000];
    if (['g','grama','gramas'].includes(u)) return ['g',1];
    if (['l','litro','litros'].includes(u)) return ['ml',1000];
    if (['ml','mililitro','mililitros'].includes(u)) return ['ml',1];
    return ['un',1];
  }

  function unitLabel(u) { return u === 'un' ? 'un.' : (String(u).toLowerCase() === 'l' ? 'L' : u); }

  function unitCostText(i) {
    const [base, f] = unitBase(i.unidade_compra);
    const q = num(i.quantidade_embalagem) * f;
    const per = q ? num(i.preco_compra) / q : 0;
    return base === 'un' ? `${money4(per)}/un.` : `${money4(per)}/${base} · ${money(per*1000)}/${base === 'g' ? 'kg' : 'L'}`;
  }
  function unitMismatch(ins, useUnit) { return !!ins && unitBase(ins.unidade_compra)[0] !== unitBase(useUnit || ins.unidade_compra)[0]; }
  function findInsumo(id) { return state.insumos.find(x => String(x.id) === String(id)); }
  function itemIssue(item) {
    const ins = findInsumo(item.insumo_id);
    if (!ins) return 'Insumo removido';
    if (unitMismatch(ins, item.unidade)) return `Unidade incompatível (insumo comprado em ${unitLabel(ins.unidade_compra)})`;
    if (!num(ins.preco_compra)) return 'Insumo sem preço';
    return '';
  }
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

  function costPerUse(insumo, quantity, useUnit) {
    if (!insumo || !num(insumo.quantidade_embalagem) || !num(insumo.preco_compra)) return 0;
    const [baseBuy, buyFactor] = unitBase(insumo.unidade_compra);
    const [baseUse, useFactor] = unitBase(useUnit || insumo.unidade_compra);
    if (baseBuy !== baseUse) return 0;
    const packageBaseQty = num(insumo.quantidade_embalagem) * buyFactor;
    const pricePerBase = num(insumo.preco_compra) / packageBaseQty;
    return num(quantity) * useFactor * pricePerBase;
  }

  function showAccessError(message) {
    const error = $('access-error');
    error.textContent = message;
    error.style.display = 'block';
  }

  async function signIn(event) {
    event.preventDefault();
    const button = $('btn-access');
    button.disabled = true;
    $('access-error').style.display = 'none';
    try {
      const {error} = await _supabase.auth.signInWithPassword({
        email: $('access-email').value.trim(),
        password: $('access-password').value
      });
      if (error) throw error;
      await start();
    } catch (error) {
      console.error('Erro ao entrar na Gestão:', error);
      showAccessError('Não foi possível entrar. Confira o e-mail e a senha e tente novamente.');
    } finally {
      button.disabled = false;
    }
  }

  async function signOut() {
    try {
      const {error} = await _supabase.auth.signOut();
      if (error) throw error;
      $('access-screen').classList.remove('hidden');
      $('app').classList.add('hidden');
      $('access-password').value = '';
      $('access-password').type = 'password';
      $('toggle-access-password').setAttribute('aria-label', 'Mostrar senha');
      $('toggle-access-password').setAttribute('aria-pressed', 'false');
      $('toggle-access-password i').classList.replace('fa-eye-slash', 'fa-eye');
    } catch (error) {
      console.error('Erro ao sair da Gestão:', error);
      toast('Não foi possível encerrar a sessão. Tente novamente.', 'error');
    }
  }

  async function loadAll() {
    const [ins, comp, ci, rec, ri, eq, re, cfg, prod] = await Promise.all([
      db.from(TABLES.INSUMOS).select('*').order('nome'),
      db.from(TABLES.COMPRAS).select('*').order('data_compra',{ascending:false}),
      db.from(TABLES.ITENS_COMPRAS).select('*'),
      db.from(TABLES.RECEITAS).select('*').order('nome'),
      db.from(TABLES.RECEITA_ITENS).select('*'),
      db.from(TABLES.EQUIPAMENTOS).select('*').order('nome'),
      db.from(TABLES.RECEITA_ETAPAS).select('*').order('ordem'),
      db.from(TABLES.CONFIG).select('*').limit(1).maybeSingle(),
      db.from('produtos').select('id,name,categoria,price').order('name')
    ]);
    const errors = [ins,comp,ci,rec,ri,eq,re,cfg].filter(r=>r.error);
    if (errors.length) throw new Error('As tabelas de Gestão V4 ainda não foram configuradas no Supabase. Execute o arquivo supabase-gestao-v4.sql que acompanha esta versão.');
    state.insumos=ins.data||[]; state.compras=comp.data||[]; state.itensCompras=ci.data||[]; state.receitas=rec.data||[]; state.receitaItens=ri.data||[]; state.equipamentos=eq.data||[]; state.receitaEtapas=re.data||[]; state.config=cfg.data||{tarifa_kwh:0}; state.produtos=prod.data||[];
  }

  function navigate(view) {
    state.view=view;
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${view}`));
    document.querySelectorAll('.side-link[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    const meta={dashboard:['GESTÃO','Visão geral'],insumos:['CADASTRO','Insumos'],compras:['CONTROLE','Compras'],equipamentos:['ENERGIA','Equipamentos'],receitas:['PRODUÇÃO','Receitas'],precificacao:['ANÁLISE','Precificação']};
    $('view-eyebrow').textContent=meta[view][0]; $('view-title').textContent=meta[view][1];
    if(view==='dashboard') renderDashboard();
    if(view==='insumos') renderInsumos();
    if(view==='compras') renderCompras();
    if(view==='equipamentos') renderEquipamentos();
    if(view==='receitas') renderReceitas();
    if(view==='precificacao') renderPricing();
    $('sidebar').classList.remove('open');
  }

  function renderDashboard() {
    const month=state.compraMes;
    const purchases=state.compras.filter(c=>String(c.data_compra||'').slice(0,7)===month);
    const total=purchases.reduce((s,c)=>s+num(c.total),0);
    const ingredientCosts=[...state.insumos].filter(i=>num(i.preco_compra)>0).sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))).slice(0,6);
    $('view-dashboard').innerHTML=`
      <div class="page-intro"><div><span class="eyebrow">CONTROLE DE GESTÃO</span><h3>Visão geral</h3><p>Insumos, compras e custos de receitas — sem interferir no caixa ou nos pedidos.</p></div><div class="month-picker"><input class="input" type="month" id="dashboard-month" value="${month}"></div></div>
      <div class="stats">
        <div class="stat"><div class="label">Compras no mês</div><div class="value money">${money(total)}</div><div class="sub">Somente registros de compras</div></div>
        <div class="stat"><div class="label">Compras registradas</div><div class="value">${purchases.length}</div><div class="sub">No período selecionado</div></div>
        <div class="stat"><div class="label">Insumos cadastrados</div><div class="value">${state.insumos.length}</div><div class="sub">Base de custos</div></div>
        <div class="stat"><div class="label">Receitas</div><div class="value">${state.receitas.length}</div><div class="sub">Composição de produtos</div></div>
      </div>
      <div class="panel" style="margin-bottom:18px"><div class="panel-head"><div><h4>Compras de ${new Date(`${month}-02T12:00:00`).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h4><p>As compras ficam registradas independentemente das vendas.</p></div><button class="glass-btn primary" onclick="window.gestao.openPurchase()"><i class="fa-solid fa-plus"></i> Nova compra</button></div>${purchases.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Fornecedor</th><th>Observação</th><th>Total</th></tr></thead><tbody>${purchases.slice(0,8).map(c=>`<tr><td>${fmtDate(c.data_compra)}</td><td>${esc(c.fornecedor||'—')}</td><td>${esc(c.observacao||'—')}</td><td class="money"><strong>${money(c.total)}</strong></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><i class="fa-solid fa-basket-shopping"></i><div>Nenhuma compra registrada neste mês.</div></div>'}</div>
      <div class="panel"><div class="panel-head"><div><h4>Referência rápida de custos</h4><p>Últimos preços atualizados. Mudam sozinhos a cada compra registrada.</p></div><button class="glass-btn" onclick="window.gestao.navigate('precificacao')">Abrir precificação</button></div>${ingredientCosts.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Insumo</th><th>Embalagem</th><th>Preço</th><th>Custo base</th></tr></thead><tbody>${ingredientCosts.map(i=>`<tr><td><strong>${esc(i.nome)}</strong></td><td>${num(i.quantidade_embalagem)} ${unitLabel(i.unidade_compra)}</td><td class="money">${money(i.preco_compra)}</td><td class="money">${unitCostText(i)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Cadastre insumos para começar.</div>'}</div>`;
    $('dashboard-month').onchange=e=>{state.compraMes=e.target.value||currentMonth();renderDashboard();};
  }

  function renderInsumos() {
    $('view-insumos').innerHTML=`
      <div class="page-intro"><div><span class="eyebrow">BASE DE CUSTOS</span><h3>Insumos</h3><p>Cadastre o que você compra e o custo de cada embalagem. O estoque físico não é descontado pelas receitas.</p></div><button class="glass-btn primary" onclick="window.gestao.openIngredient()"><i class="fa-solid fa-plus"></i> Novo insumo</button></div>
      <div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Insumo</th><th>Categoria</th><th>Embalagem</th><th>Preço</th><th>Custo base</th><th>Fornecedor</th><th></th></tr></thead><tbody>${state.insumos.length?state.insumos.map(i=>{return `<tr><td><strong>${esc(i.nome)}</strong></td><td>${esc(i.categoria||'—')}</td><td>${num(i.quantidade_embalagem)} ${unitLabel(i.unidade_compra)}</td><td class="money">${money(i.preco_compra)}</td><td class="money">${unitCostText(i)}</td><td>${esc(i.fornecedor||'—')}</td><td><div class="actions"><button class="icon-btn" onclick="window.gestao.editIngredient('${i.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button><button class="icon-btn" onclick="window.gestao.deleteIngredient('${i.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button></div></td></tr>`}).join(''):'<tr><td colspan="7"><div class="empty">Nenhum insumo cadastrado.</div></td></tr>'}</tbody></table></div></div>`;
  }

  function renderCompras() {
    const month=state.compraMes;const all=state.compraTodos;const purchases=state.compras.filter(c=>all||String(c.data_compra||'').slice(0,7)===month);const total=purchases.reduce((s,c)=>s+num(c.total),0);
    $('view-compras').innerHTML=`<div class="page-intro"><div><span class="eyebrow">CONTROLE DE COMPRAS</span><h3>Compras</h3><p>Registre compras de insumos sem relacioná-las automaticamente às receitas ou ao caixa.</p></div><div class="actions"><label class="check"><input type="checkbox" id="purchase-all" ${all?'checked':''}> Todos os meses</label><input class="input" type="month" id="purchase-month" value="${month}" ${all?'disabled':''}><button class="glass-btn primary" onclick="window.gestao.openPurchase()"><i class="fa-solid fa-plus"></i> Registrar compra</button></div></div><div class="stats"><div class="stat"><div class="label">${all?'Total geral':'Total do mês'}</div><div class="value money">${money(total)}</div></div><div class="stat"><div class="label">Quantidade de compras</div><div class="value">${purchases.length}</div></div></div><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Fornecedor</th><th>Itens</th><th>Observação</th><th>Total</th><th></th></tr></thead><tbody>${purchases.length?purchases.map(c=>{const its=state.itensCompras.filter(i=>i.compra_id===c.id);return `<tr><td>${fmtDate(c.data_compra)}</td><td>${esc(c.fornecedor||'—')}</td><td><button class="glass-btn mini" onclick="window.gestao.viewPurchase('${c.id}')">${its.length} item(ns)</button></td><td>${esc(c.observacao||'—')}</td><td class="money"><strong>${money(c.total)}</strong></td><td><button class="icon-btn" onclick="window.gestao.deletePurchase('${c.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`}).join(''):'<tr><td colspan="6"><div class="empty">Nenhuma compra neste mês.</div></td></tr>'}</tbody></table></div></div>`;
    $('purchase-month').onchange=e=>{state.compraMes=e.target.value||currentMonth();renderCompras();};$('purchase-all').onchange=e=>{state.compraTodos=e.target.checked;renderCompras();};
  }

  function renderReceitas() {
    $('view-receitas').innerHTML=`<div class="page-intro"><div><span class="eyebrow">COMPOSIÇÃO</span><h3>Receitas</h3><p>Monte a receita de cada produto selecionando insumos e quantidades utilizadas.</p></div><button class="glass-btn primary" onclick="window.gestao.openRecipe()"><i class="fa-solid fa-plus"></i> Nova receita</button></div><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Receita</th><th>Produto vinculado</th><th>Rendimento</th><th>Custo da receita</th><th>Custo por unidade</th><th></th></tr></thead><tbody>${state.receitas.length?state.receitas.map(r=>{const cost=recipeCost(r.id);const per=num(r.rendimento)?cost/num(r.rendimento):cost;const prod=state.produtos.find(p=>String(p.id)===String(r.produto_id));return `<tr><td><strong>${esc(r.nome)}</strong>${state.receitaItens.some(i=>i.receita_id===r.id&&itemIssue(i))?' <span class="tag warn">⚠ revisar itens</span>':''}</td><td>${esc(prod?.name||'—')}</td><td>${num(r.rendimento)} ${esc(r.unidade_rendimento||'un.')}</td><td class="money">${money(cost)}</td><td class="money">${money(per)}</td><td><div class="actions"><button class="icon-btn" onclick="window.gestao.editRecipe('${r.id}')"><i class="fa-solid fa-pen"></i></button><button class="icon-btn" onclick="window.gestao.deleteRecipe('${r.id}')"><i class="fa-solid fa-trash"></i></button></div></td></tr>`}).join(''):'<tr><td colspan="6"><div class="empty">Nenhuma receita cadastrada.</div></td></tr>'}</tbody></table></div></div>`;
  }

  function energyCostForStage(stage){
    if(stage.modo === 'manual') return num(stage.custo_manual);
    const eq=state.equipamentos.find(x=>String(x.id)===String(stage.equipamento_id));
    if(!eq || !num(eq.potencia_w) || !num(stage.duracao_minutos) || !num(state.config.tarifa_kwh)) return 0;
    return (num(eq.potencia_w)/1000) * (num(stage.duracao_minutos)/60) * num(state.config.tarifa_kwh);
  }
  function recipeEnergy(id){
    return state.receitaEtapas.filter(x=>String(x.receita_id)===String(id)).reduce((s,x)=>s+energyCostForStage(x),0);
  }
  function recipeCost(id,draft=null){
    const r=state.receitas.find(x=>x.id===id)||{}; const items=draft||state.receitaItens.filter(i=>i.receita_id===id);
    const ingredients=items.reduce((s,item)=>{const ins=state.insumos.find(i=>String(i.id)===String(item.insumo_id));return s+costPerUse(ins,item.quantidade,item.unidade)},0);
    const energy=recipeEnergy(id); const extras=num(r.custo_embalagem)+num(r.custo_mao_obra)+num(r.custo_indiretos)+energy;
    const waste=1+(num(r.perda_percentual)/100); return (ingredients+extras)*waste;
  }

  function recipeBreakdown(id){
    const r=state.receitas.find(x=>x.id===id)||{};
    const lines=state.receitaItens.filter(i=>i.receita_id===id).map(item=>{const ins=findInsumo(item.insumo_id);return {item,ins,cost:costPerUse(ins,item.quantidade,item.unidade),issue:itemIssue(item)}});
    const ingredients=lines.reduce((t,l)=>t+l.cost,0); const pack=num(r.custo_embalagem),labor=num(r.custo_mao_obra),over=num(r.custo_indiretos),energy=recipeEnergy(id);
    const subtotal=ingredients+pack+labor+over+energy; const waste=subtotal*num(r.perda_percentual)/100; const total=subtotal+waste; const yieldQty=num(r.rendimento)||1;
    return {r,lines,ingredients,pack,labor,over,energy,waste,total,yieldQty,perUnit:total/yieldQty,stages:state.receitaEtapas.filter(x=>x.receita_id===id).sort((a,b)=>num(a.ordem)-num(b.ordem))};
  }

  function pricingResultHtml(b){
    const margin=num(state.recipeMargin); const price=margin>=100?0:b.perUnit/(1-margin/100); const profit=price-b.perUnit;
    const prod=state.produtos.find(p=>String(p.id)===String(b.r.produto_id)); const current=prod?num(prod.price):0; const curMargin=current>0?(current-b.perUnit)/current*100:null;
    const cmp=prod?`<div class="cost-line ${curMargin!==null&&curMargin<margin?'warn':''}"><span>Preço atual no cardápio<small class="muted"> · ${esc(prod.name)}</small></span><strong class="money">${money(current)}${curMargin!==null?` <small>(margem ${curMargin.toFixed(0)}%)</small>`:''}</strong></div>`:'';
    return `${cmp}<div class="price-highlight"><small>Preço sugerido por ${esc(b.r.unidade_rendimento==='un'||!b.r.unidade_rendimento?'unidade':b.r.unidade_rendimento)}</small><strong class="money">${money(price)}</strong><small style="margin-top:6px">Lucro bruto estimado: ${money(profit)} por unidade · ${money(profit*b.yieldQty)} por receita</small></div>`;
  }

  function renderPricing(){
    const recipes=state.receitas; const r=recipes.find(x=>x.id===state.selectedRecipeId)||recipes[0];
    if(!r){$('view-precificacao').innerHTML=`<div class="page-intro"><div><span class="eyebrow">CALCULADORA</span><h3>Precificação</h3><p>Primeiro crie uma receita.</p></div><button class="glass-btn primary" onclick="window.gestao.openRecipe()">Criar receita</button></div><div class="panel empty"><i class="fa-solid fa-calculator"></i><div>Cadastre uma receita para calcular custo, margem e preço sugerido.</div></div>`;return;}
    state.selectedRecipeId=r.id; const b=recipeBreakdown(r.id); const unitName=r.unidade_rendimento==='un'||!r.unidade_rendimento?'unidade':r.unidade_rendimento;
    const extra=(label,v)=>v>0?`<div class="cost-line"><span>${label}</span><strong class="money">${money(v)}</strong></div>`:'';
    const stages=b.stages.length?b.stages.map(s=>{const eq=state.equipamentos.find(e=>String(e.id)===String(s.equipamento_id));return `<div class="cost-line"><span>${esc(s.nome||eq?.nome||'Etapa')} <small class="muted">· ${s.modo==='manual'?'custo informado':`${num(s.duracao_minutos)} min`}</small></span><strong class="money">${money(energyCostForStage(s))}</strong></div>`}).join(''):'<div class="muted" style="padding:10px 0;font-size:.78rem">Nenhuma etapa de produção/energia cadastrada.</div>';
    $('view-precificacao').innerHTML=`<div class="page-intro"><div><span class="eyebrow">CALCULADORA DE PREÇO</span><h3>Precificação</h3><p>Ingredientes, energia, embalagem, mão de obra, perdas e rendimento.</p></div><select class="select" id="pricing-recipe" style="max-width:300px">${recipes.map(x=>`<option value="${x.id}" ${x.id===r.id?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></div>
      <div class="recipe-builder"><div class="panel"><div class="panel-head"><div><h4>${esc(r.nome)}</h4><p>${num(r.rendimento)} ${esc(r.unidade_rendimento||'un.')} por receita</p></div><button class="glass-btn" onclick="window.gestao.editRecipe('${r.id}')"><i class="fa-solid fa-pen"></i> Editar receita</button></div>
        ${b.lines.map(l=>`<div class="cost-line ${l.issue?'warn':''}"><span>${esc(l.ins?.nome||'Insumo removido')} <small class="muted">· ${num(l.item.quantidade)} ${unitLabel(l.item.unidade)}</small>${l.issue?`<small class="issue"> ⚠ ${esc(l.issue)}</small>`:''}</span><strong class="money">${money(l.cost)}</strong></div>`).join('')||'<div class="empty">Esta receita ainda não tem ingredientes.</div>'}
        <div class="section-label">ETAPAS DE PRODUÇÃO / ENERGIA</div>${stages}${extra('Embalagem',b.pack)}${extra('Mão de obra',b.labor)}${extra('Custos indiretos',b.over)}${extra('Energia estimada',b.energy)}${extra(`Perda / quebra (${num(r.perda_percentual)}%)`,b.waste)}
      </div>
      <div class="panel cost-card"><span class="eyebrow">RESULTADO</span><div class="cost-line"><span>Ingredientes</span><strong class="money">${money(b.ingredients)}</strong></div><div class="cost-line"><span>Energia</span><strong class="money">${money(b.energy)}</strong></div><div class="cost-line"><span>Custo total da receita</span><strong class="money">${money(b.total)}</strong></div><div class="cost-line"><span>Custo por ${esc(unitName)}</span><strong class="money">${money(b.perUnit)}</strong></div><div class="margin-row"><span>Margem desejada (%)</span><input class="input" type="number" min="0" max="95" step="1" id="pricing-margin" value="${num(state.recipeMargin)}"></div><div id="pricing-result">${pricingResultHtml(b)}</div><div style="margin-top:12px;color:var(--muted);font-size:.73rem;line-height:1.55">Preço = custo por unidade ÷ (1 − margem). A energia é uma estimativa baseada na potência do equipamento e no tempo informado.</div></div></div>`;
    $('pricing-recipe').onchange=e=>{state.selectedRecipeId=e.target.value;renderPricing()}; $('pricing-margin').oninput=e=>{state.recipeMargin=Math.min(95,Math.max(0,num(e.target.value)));$('pricing-result').innerHTML=pricingResultHtml(b)};
  }

  function openModal(title,body,eyebrow='GESTÃO'){ $('modal-title').textContent=title;$('modal-eyebrow').textContent=eyebrow;$('modal-body').innerHTML=body;$('modal').classList.remove('hidden'); }
  function closeModal(){ $('modal').classList.add('hidden'); }

  function ingredientForm(i={}){return `<div class="form-grid"><div class="field full"><label>Nome do insumo *</label><input class="input" id="f-name" value="${esc(i.nome||'')}" placeholder="Ex.: Chocolate ao leite"></div><div class="field"><label>Categoria</label><input class="input" id="f-cat" list="dl-categorias" autocomplete="off" value="${esc(i.categoria||'')}" placeholder="Chocolate, frutas..."></div><div class="field"><label>Fornecedor</label><input class="input" id="f-supplier" list="dl-fornecedores" autocomplete="off" value="${esc(i.fornecedor||'')}"></div><div class="field"><label>Quantidade da embalagem *</label><input class="input" id="f-pack" type="number" step="0.001" min="0" value="${num(i.quantidade_embalagem)||1}"></div><div class="field"><label>Unidade de compra *</label><select class="select" id="f-unit"><option value="kg" ${i.unidade_compra==='kg'?'selected':''}>kg</option><option value="g" ${i.unidade_compra==='g'?'selected':''}>g</option><option value="l" ${i.unidade_compra==='l'?'selected':''}>L</option><option value="ml" ${i.unidade_compra==='ml'?'selected':''}>ml</option><option value="un" ${!i.unidade_compra||i.unidade_compra==='un'?'selected':''}>un.</option></select></div><div class="field"><label>Preço da embalagem *</label><input class="input" id="f-price" type="number" step="0.01" min="0" value="${num(i.preco_compra)}"></div></div><div class="calc-preview" id="f-preview"></div>${datalists()}<div class="modal-actions"><button class="glass-btn" data-close-modal>Cancelar</button><button class="glass-btn primary" id="save-ingredient">Salvar insumo</button></div>`}
  function openIngredient(id=null){const i=state.insumos.find(x=>x.id===id)||{};openModal(id?'Editar insumo':'Novo insumo',ingredientForm(i),'INSUMOS');['f-pack','f-unit','f-price'].forEach(k=>{$(k).addEventListener('input',updateIngredientPreview);$(k).addEventListener('change',updateIngredientPreview)});updateIngredientPreview();$('save-ingredient').onclick=async()=>{const payload={nome:$('f-name').value.trim(),categoria:$('f-cat').value.trim(),fornecedor:$('f-supplier').value.trim(),quantidade_embalagem:num($('f-pack').value),unidade_compra:$('f-unit').value,preco_compra:num($('f-price').value),updated_at:new Date().toISOString()};if(!payload.nome||payload.quantidade_embalagem<=0){toast('Preencha nome e quantidade da embalagem.','error');return}const q=id?db.from(TABLES.INSUMOS).update(payload).eq('id',id):db.from(TABLES.INSUMOS).insert(payload);const {error}=await q;if(error){toast(error.message,'error');return}closeModal();await refresh();toast('Insumo salvo.','success')};}
  function updateIngredientPreview(){const el=$('f-preview');if(!el)return;const t={quantidade_embalagem:num($('f-pack').value),unidade_compra:$('f-unit').value,preco_compra:num($('f-price').value)};el.innerHTML=t.quantidade_embalagem>0&&t.preco_compra>0?`<span>Custo calculado</span><strong>${unitCostText(t)}</strong>`:'<span>Informe quantidade e preço para ver o custo por g, ml ou unidade.</span>'}
  async function editIngredient(id){openIngredient(id)}
  async function deleteIngredient(id){if(!confirm('Excluir este insumo? Receitas que o utilizam poderão ficar sem referência.'))return;const {error}=await db.from(TABLES.INSUMOS).delete().eq('id',id);if(error){toast('Não foi possível excluir. Verifique se ele está usado em uma receita.','error');return}await refresh();toast('Insumo excluído.','success')}

  function purchaseForm(){const first=state.insumos[0];return `<div class="form-grid"><div class="field"><label>Data *</label><input class="input" id="p-date" type="date" value="${todayStr()}"></div><div class="field"><label>Fornecedor</label><input class="input" id="p-supplier" list="dl-fornecedores" autocomplete="off"></div><div class="field full"><label>Observação</label><input class="input" id="p-note" placeholder="Ex.: compra semanal"></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin:24px 0 10px"><div><strong>Itens da compra</strong><div class="muted" style="font-size:.72rem">Quantidade em unidades de embalagem e valor pago no item.</div></div><button class="glass-btn" id="add-purchase-row"><i class="fa-solid fa-plus"></i> Adicionar item</button></div><div id="purchase-rows" class="purchase-items"></div><div class="cost-line total"><span>Total da compra</span><strong class="money" id="p-total-line">R$ 0,00</strong></div>${datalists()}<div class="modal-actions"><button class="glass-btn" data-close-modal>Cancelar</button><button class="glass-btn primary" id="save-purchase">Salvar compra</button></div>`}
  function addPurchaseRow(item={}){const wrap=$('purchase-rows');const row=document.createElement('div');row.className='purchase-row';row.innerHTML=`<div class="field"><label>Insumo</label><select class="select p-insumo">${state.insumos.map(i=>`<option value="${i.id}" ${String(i.id)===String(item.insumo_id)?'selected':''}>${esc(i.nome)} (${num(i.quantidade_embalagem)} ${unitLabel(i.unidade_compra)})</option>`).join('')}</select></div><div class="field"><label>Qtd.</label><input class="input p-qty" type="number" step="0.001" min="0" value="${num(item.quantidade)||1}"></div><div class="field"><label>Total pago</label><input class="input p-total" type="number" step="0.01" min="0" value="${num(item.total)||0}"></div><button class="remove-row" title="Remover"><i class="fa-solid fa-xmark"></i></button>`;row.querySelector('.remove-row').onclick=()=>{row.remove();updatePurchaseTotal()};wrap.appendChild(row);updatePurchaseTotal()}
  function updatePurchaseTotal(){const el=$('p-total-line');if(!el)return;el.textContent=money([...document.querySelectorAll('.purchase-row .p-total')].reduce((s,i)=>s+num(i.value),0))}
  function openPurchase(){if(!state.insumos.length){toast('Cadastre pelo menos um insumo antes de registrar uma compra.','error');navigate('insumos');return}openModal('Registrar compra',purchaseForm(),'COMPRAS');addPurchaseRow();$('add-purchase-row').onclick=()=>addPurchaseRow();$('purchase-rows').addEventListener('input',updatePurchaseTotal);$('save-purchase').onclick=savePurchase}
  async function savePurchase(){if(!$('p-date').value){toast('Informe a data da compra.','error');return}const rows=[...document.querySelectorAll('.purchase-row')];if(!rows.length){toast('Adicione pelo menos um item.','error');return}const items=rows.map(r=>({insumo_id:r.querySelector('.p-insumo').value,quantidade:num(r.querySelector('.p-qty').value),total:num(r.querySelector('.p-total').value)}));if(items.some(i=>!i.insumo_id||i.quantidade<=0||i.total<0)){toast('Revise os itens da compra.','error');return}const total=items.reduce((s,i)=>s+i.total,0);const {data:comp,error}=await db.from(TABLES.COMPRAS).insert({data_compra:$('p-date').value,fornecedor:$('p-supplier').value.trim(),observacao:$('p-note').value.trim(),total}).select().single();if(error){toast(error.message,'error');return}const payload=items.map(i=>({compra_id:comp.id,insumo_id:i.insumo_id,quantidade:i.quantidade,unidade:state.insumos.find(x=>x.id===i.insumo_id)?.unidade_compra||'un',preco_unitario:i.quantidade?i.total/i.quantidade:0,total:i.total}));const {error:ei}=await db.from(TABLES.ITENS_COMPRAS).insert(payload);if(ei){await db.from(TABLES.COMPRAS).delete().eq('id',comp.id);toast(ei.message,'error');return}const purchaseDate=$('p-date').value;let repriced=0;for(const item of items){const ins=findInsumo(item.insumo_id);if(!ins||item.quantidade<=0||item.total<=0)continue;if(purchaseDate<lastPurchaseDate(item.insumo_id))continue;const {error:eu}=await db.from(TABLES.INSUMOS).update({preco_compra:item.total/item.quantidade,updated_at:new Date().toISOString()}).eq('id',item.insumo_id);if(!eu)repriced++}closeModal();await refresh();state.compraMes=purchaseDate.slice(0,7);state.compraTodos=false;navigate('compras');toast(repriced?`Compra registrada. ${repriced} preço(s) de referência atualizado(s).`:'Compra registrada.','success')}
  function viewPurchase(id){const c=state.compras.find(x=>x.id===id);if(!c)return;const its=state.itensCompras.filter(i=>i.compra_id===id);openModal(`Compra de ${fmtDate(c.data_compra)}`,`<div class="muted" style="margin-bottom:14px">${esc(c.fornecedor||'Sem fornecedor')}${c.observacao?` · ${esc(c.observacao)}`:''}</div><div class="table-wrap"><table class="table" style="min-width:0"><thead><tr><th>Insumo</th><th>Qtd.</th><th>Preço por emb.</th><th>Total</th></tr></thead><tbody>${its.map(i=>{const ins=findInsumo(i.insumo_id);return `<tr><td><strong>${esc(ins?.nome||'Insumo removido')}</strong></td><td>${num(i.quantidade)} emb.</td><td class="money">${money(i.preco_unitario)}</td><td class="money">${money(i.total)}</td></tr>`}).join('')}</tbody></table></div><div class="cost-line total"><span>Total</span><strong class="money">${money(c.total)}</strong></div><div class="modal-actions"><button class="glass-btn" data-close-modal>Fechar</button></div>`,'COMPRAS')}
  async function deletePurchase(id){if(!confirm('Excluir esta compra e seus itens? O preço de referência dos insumos não será alterado.'))return;await db.from(TABLES.ITENS_COMPRAS).delete().eq('compra_id',id);const {error}=await db.from(TABLES.COMPRAS).delete().eq('id',id);if(error){toast(error.message,'error');return}await refresh();toast('Compra excluída.','success')}

  function recipeForm(r={}){
    const items=state.receitaItens.filter(x=>x.receita_id===r.id); const stages=state.receitaEtapas.filter(x=>x.receita_id===r.id).sort((a,b)=>num(a.ordem)-num(b.ordem));
    return `<div class="form-grid"><div class="field full"><label>Nome da receita *</label><input class="input" id="r-name" value="${esc(r.nome||'')}" placeholder="Ex.: Brigadeiro"></div><div class="field"><label>Produto do cardápio</label><select class="select" id="r-product"><option value="">Sem vínculo</option>${state.produtos.map(p=>`<option value="${p.id}" ${String(p.id)===String(r.produto_id)?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Rendimento</label><input class="input" id="r-yield" type="number" step="0.01" min="0.01" value="${num(r.rendimento)||1}"></div><div class="field"><label>Unidade do rendimento</label><select class="select" id="r-yield-unit"><option value="un" ${!r.unidade_rendimento||r.unidade_rendimento==='un'?'selected':''}>un.</option><option value="kg" ${r.unidade_rendimento==='kg'?'selected':''}>kg</option><option value="g" ${r.unidade_rendimento==='g'?'selected':''}>g</option><option value="L" ${r.unidade_rendimento==='L'?'selected':''}>L</option></select></div><div class="field"><label>Embalagem por receita</label><input class="input" id="r-pack-cost" type="number" step="0.01" min="0" value="${num(r.custo_embalagem)}"></div><div class="field"><label>Mão de obra por receita</label><input class="input" id="r-labor-cost" type="number" step="0.01" min="0" value="${num(r.custo_mao_obra)}"></div><div class="field"><label>Custos indiretos por receita</label><input class="input" id="r-overhead-cost" type="number" step="0.01" min="0" value="${num(r.custo_indiretos)}"></div><div class="field"><label>Perda / quebra (%)</label><input class="input" id="r-waste" type="number" step="0.1" min="0" max="100" value="${num(r.perda_percentual)}"></div><div class="field full"><label>Observação</label><textarea class="textarea" id="r-note">${esc(r.observacao||'')}</textarea></div></div>
      <div class="builder-section"><div class="section-head"><div><strong>Ingredientes</strong><div class="muted small">O custo é calculado pela quantidade utilizada.</div></div><button class="glass-btn" id="add-ingredient-row"><i class="fa-solid fa-plus"></i> Adicionar</button></div><div id="recipe-rows"></div></div>
      <div class="builder-section"><div class="section-head"><div><strong>Etapas de produção / energia</strong><div class="muted small">Para indução, micro-ondas, batedeira etc. Informe o tempo e o equipamento.</div></div><button class="glass-btn" id="add-stage-row"><i class="fa-solid fa-plus"></i> Adicionar etapa</button></div><div id="stage-rows"></div></div>
      <div class="modal-actions"><button class="glass-btn" data-close-modal>Cancelar</button><button class="glass-btn primary" id="save-recipe">Salvar receita</button></div>`;
  }
  function addRecipeRow(item={}){const wrap=$('recipe-rows');const row=document.createElement('div');row.className='ingredient-row';row.innerHTML=`<div class="field"><label>Insumo</label><select class="select r-insumo">${state.insumos.map(i=>`<option value="${i.id}" ${String(i.id)===String(item.insumo_id)?'selected':''}>${esc(i.nome)}</option>`).join('')}</select></div><div class="field"><label>Qtd.</label><input class="input r-qty" type="number" step="0.001" min="0" value="${num(item.quantidade)||0}"></div><div class="field"><label>Unidade</label><select class="select r-unit"><option value="g" ${item.unidade==='g'?'selected':''}>g</option><option value="kg" ${item.unidade==='kg'?'selected':''}>kg</option><option value="ml" ${item.unidade==='ml'?'selected':''}>ml</option><option value="L" ${item.unidade==='L'?'selected':''}>L</option><option value="un" ${!item.unidade||item.unidade==='un'?'selected':''}>un.</option></select></div><button class="remove-row" title="Remover"><i class="fa-solid fa-xmark"></i></button>`;row.querySelector('.remove-row').onclick=()=>row.remove();wrap.appendChild(row);row.querySelector('.r-insumo').addEventListener('change',()=>syncRowUnit(row));row.querySelector('.r-unit').addEventListener('change',()=>updateRowWarning(row));if(item.unidade)updateRowWarning(row);else syncRowUnit(row)}
  function rowInsumo(row){return findInsumo(row.querySelector('.r-insumo').value)}
  function syncRowUnit(row){const ins=rowInsumo(row);if(ins)row.querySelector('.r-unit').value=unitBase(ins.unidade_compra)[0];updateRowWarning(row)}
  function updateRowWarning(row){let w=row.querySelector('.row-warn');if(!w){w=document.createElement('div');w.className='row-warn';row.appendChild(w)}const ins=rowInsumo(row);const base=ins?unitBase(ins.unidade_compra)[0]:'';w.textContent=ins&&unitMismatch(ins,row.querySelector('.r-unit').value)?`⚠ Este insumo é comprado em ${unitLabel(ins.unidade_compra)}. Use ${base==='g'?'g ou kg':base==='ml'?'ml ou L':'un.'} na receita.`:''}
  function addStageRow(item={}){const wrap=$('stage-rows');const row=document.createElement('div');row.className='stage-row';row.innerHTML=`<div class="field"><label>Nome da etapa</label><input class="input s-name" value="${esc(item.nome||'')}" placeholder="Ex.: Fazer brigadeiro"></div><div class="field"><label>Equipamento</label><select class="select s-eq"><option value="">Sem equipamento</option>${state.equipamentos.map(e=>`<option value="${e.id}" ${String(e.id)===String(item.equipamento_id)?'selected':''}>${esc(e.nome)} · ${num(e.potencia_w)} W</option>`).join('')}</select></div><div class="field"><label>Modo</label><select class="select s-mode"><option value="power" ${item.modo!=='manual'?'selected':''}>Potência × tempo</option><option value="manual" ${item.modo==='manual'?'selected':''}>Custo informado</option></select></div><div class="field"><label>Tempo (min)</label><input class="input s-min" type="number" min="0" step="0.1" value="${num(item.duracao_minutos)}"></div><div class="field"><label>Custo manual (R$)</label><input class="input s-manual" type="number" min="0" step="0.01" value="${num(item.custo_manual)}"></div><button class="remove-row" title="Remover"><i class="fa-solid fa-xmark"></i></button>`;row.querySelector('.remove-row').onclick=()=>row.remove();wrap.appendChild(row)}
  function openRecipe(id=null){const r=state.receitas.find(x=>x.id===id)||{};openModal(id?'Editar receita':'Nova receita',recipeForm(r),'RECEITAS');const items=state.receitaItens.filter(x=>x.receita_id===id);(items.length?items:[{}]).forEach(addRecipeRow);const stages=state.receitaEtapas.filter(x=>x.receita_id===id).sort((a,b)=>num(a.ordem)-num(b.ordem));stages.forEach(addStageRow);$('add-ingredient-row').onclick=()=>addRecipeRow();$('add-stage-row').onclick=()=>addStageRow();$('save-recipe').onclick=()=>saveRecipe(id)}
  async function saveRecipe(id){
    const rows=[...document.querySelectorAll('.ingredient-row')]; const items=rows.map(r=>({insumo_id:r.querySelector('.r-insumo').value,quantidade:num(r.querySelector('.r-qty').value),unidade:r.querySelector('.r-unit').value})).filter(x=>x.insumo_id&&x.quantidade>0);
    const stages=[...document.querySelectorAll('.stage-row')].map((r,idx)=>({nome:r.querySelector('.s-name').value.trim()||`Etapa ${idx+1}`,equipamento_id:r.querySelector('.s-eq').value||null,modo:r.querySelector('.s-mode').value,duracao_minutos:num(r.querySelector('.s-min').value),custo_manual:num(r.querySelector('.s-manual').value),ordem:idx})).filter(x=>(x.modo==='manual'&&x.custo_manual>0)||(x.modo==='power'&&x.equipamento_id&&x.duracao_minutos>0));
    if(!$('r-name').value.trim()||!items.length){toast('Informe o nome e pelo menos um ingrediente.','error');return}
    const payload={nome:$('r-name').value.trim(),produto_id:$('r-product').value||null,rendimento:num($('r-yield').value)||1,unidade_rendimento:$('r-yield-unit').value,observacao:$('r-note').value.trim(),custo_embalagem:num($('r-pack-cost').value),custo_mao_obra:num($('r-labor-cost').value),custo_indiretos:num($('r-overhead-cost').value),perda_percentual:num($('r-waste').value),updated_at:new Date().toISOString()}; let recipeId=id;
    if(id){const {error}=await db.from(TABLES.RECEITAS).update(payload).eq('id',id);if(error){toast(error.message,'error');return}await db.from(TABLES.RECEITA_ITENS).delete().eq('receita_id',id);await db.from(TABLES.RECEITA_ETAPAS).delete().eq('receita_id',id)}else{const {data,error}=await db.from(TABLES.RECEITAS).insert(payload).select().single();if(error){toast(error.message,'error');return}recipeId=data.id}
    const {error:ei}=await db.from(TABLES.RECEITA_ITENS).insert(items.map(i=>({...i,receita_id:recipeId})));if(ei){toast(ei.message,'error');return}
    if(stages.length){const {error:es}=await db.from(TABLES.RECEITA_ETAPAS).insert(stages.map(x=>({...x,receita_id:recipeId})));if(es){toast(es.message,'error');return}}
    closeModal();state.selectedRecipeId=recipeId;await refresh();navigate('receitas');toast('Receita salva.','success')
  }
  async function editRecipe(id){openRecipe(id)}
  async function deleteRecipe(id){if(!confirm('Excluir esta receita?'))return;await db.from(TABLES.RECEITA_ITENS).delete().eq('receita_id',id);const {error}=await db.from(TABLES.RECEITAS).delete().eq('id',id);if(error){toast(error.message,'error');return}if(state.selectedRecipeId===id)state.selectedRecipeId=null;await refresh();toast('Receita excluída.','success')}

  function renderEquipamentos(){
    $('view-equipamentos').innerHTML=`<div class="page-intro"><div><span class="eyebrow">ENERGIA E EQUIPAMENTOS</span><h3>Equipamentos</h3><p>Cadastre a potência dos equipamentos usados na produção e a tarifa de energia.</p></div><div class="actions"><button class="glass-btn" onclick="window.gestao.openEnergySettings()"><i class="fa-solid fa-bolt"></i> Tarifa de energia</button><button class="glass-btn primary" onclick="window.gestao.openEquipment()"><i class="fa-solid fa-plus"></i> Novo equipamento</button></div></div>
      <div class="stats"><div class="stat"><div class="label">Tarifa configurada</div><div class="value money">${money(state.config.tarifa_kwh)}/kWh</div><div class="sub">Usada nas estimativas</div></div><div class="stat"><div class="label">Equipamentos</div><div class="value">${state.equipamentos.length}</div><div class="sub">Com potência cadastrada</div></div></div>
      <div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Equipamento</th><th>Tipo</th><th>Potência</th><th>Status</th><th></th></tr></thead><tbody>${state.equipamentos.length?state.equipamentos.map(e=>`<tr><td><strong>${esc(e.nome)}</strong></td><td>${esc(e.tipo||'—')}</td><td>${num(e.potencia_w)} W</td><td>${e.ativo===false?'<span class="tag warn">Inativo</span>':'<span class="tag">Ativo</span>'}</td><td><div class="actions"><button class="icon-btn" onclick="window.gestao.editEquipment('${e.id}')"><i class="fa-solid fa-pen"></i></button><button class="icon-btn" onclick="window.gestao.deleteEquipment('${e.id}')"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join(''):'<tr><td colspan="5"><div class="empty">Cadastre seu cooktop de indução, micro-ondas, batedeira etc.</div></td></tr>'}</tbody></table></div></div>`;
  }
  function equipmentForm(e={}){return `<div class="form-grid"><div class="field full"><label>Nome *</label><input class="input" id="e-name" value="${esc(e.nome||'')}" placeholder="Ex.: Cooktop de indução"></div><div class="field"><label>Tipo</label><input class="input" id="e-type" value="${esc(e.tipo||'')}" placeholder="Indução, micro-ondas..."></div><div class="field"><label>Potência (W) *</label><input class="input" id="e-power" type="number" min="0" step="1" value="${num(e.potencia_w)}"></div></div><div class="muted small" style="margin-top:12px">A potência nominal é usada como estimativa. O equipamento pode não consumir sua potência máxima continuamente.</div><div class="modal-actions"><button class="glass-btn" data-close-modal>Cancelar</button><button class="glass-btn primary" id="save-equipment">Salvar equipamento</button></div>`}
  function openEquipment(id=null){const e=state.equipamentos.find(x=>x.id===id)||{};openModal(id?'Editar equipamento':'Novo equipamento',equipmentForm(e),'EQUIPAMENTOS');$('save-equipment').onclick=async()=>{const payload={nome:$('e-name').value.trim(),tipo:$('e-type').value.trim(),potencia_w:num($('e-power').value),ativo:true};if(!payload.nome||payload.potencia_w<=0){toast('Informe nome e potência.','error');return}const q=id?db.from(TABLES.EQUIPAMENTOS).update(payload).eq('id',id):db.from(TABLES.EQUIPAMENTOS).insert(payload);const {error}=await q;if(error){toast(error.message,'error');return}closeModal();await refresh();toast('Equipamento salvo.','success')}}
  function editEquipment(id){openEquipment(id)}
  async function deleteEquipment(id){if(state.receitaEtapas.some(x=>String(x.equipamento_id)===String(id))){toast('Este equipamento está sendo usado em uma receita. Edite a receita antes de excluir.','error');return}if(!confirm('Excluir este equipamento?'))return;const {error}=await db.from(TABLES.EQUIPAMENTOS).delete().eq('id',id);if(error){toast(error.message,'error');return}await refresh();toast('Equipamento excluído.','success')}
  function openEnergySettings(){openModal('Tarifa de energia',`<div class="field"><label>Tarifa de energia (R$/kWh)</label><input class="input" id="cfg-kwh" type="number" min="0" step="0.0001" value="${num(state.config.tarifa_kwh)}"></div><p class="muted small" style="margin-top:12px">Informe o valor da sua conta de energia por kWh. A estimativa das receitas usa potência × tempo × tarifa.</p><div class="modal-actions"><button class="glass-btn" data-close-modal>Cancelar</button><button class="glass-btn primary" id="save-config">Salvar</button></div>`,'ENERGIA');$('save-config').onclick=async()=>{const val=num($('cfg-kwh').value);const {error}=await db.from(TABLES.CONFIG).upsert({chave:'energia',tarifa_kwh:val,updated_at:new Date().toISOString()},{onConflict:'chave'});if(error){toast(error.message,'error');return}closeModal();await refresh();toast('Tarifa de energia atualizada.','success')}}

  async function refresh(){try{await loadAll();navigate(state.view)}catch(e){console.error(e);toast(e.message,'error')}}

  async function start(){
    $('access-error').style.display = 'none';
    $('access-screen').classList.remove('hidden');
    $('app').classList.add('hidden');
    try {
      const {data, error} = await _supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) return;

      const {data: admin, error: adminError} = await db.from(TABLES.ADMINS)
        .select('user_id').eq('user_id', data.session.user.id).maybeSingle();
      if (adminError) {
        throw new Error('Não foi possível validar a permissão de administradora. Execute o arquivo supabase-gestao.sql no SQL Editor do Supabase.');
      }
      if (!admin) {
        const {error: signOutError} = await _supabase.auth.signOut();
        if (signOutError) throw signOutError;
        showAccessError('Esta conta não está autorizada a acessar a Gestão.');
        return;
      }

      $('access-screen').classList.add('hidden');
      $('app').classList.remove('hidden');
      await loadAll();
      navigate('dashboard');
    } catch(e) {
      console.error('Erro ao carregar a Gestão:', e);
      if (!$('app').classList.contains('hidden')) {
        $('view-dashboard').innerHTML = `<div class="panel empty"><i class="fa-solid fa-database"></i><div>${esc(e.message)}</div></div>`;
      } else {
        showAccessError(e.message);
      }
    }
  }

  document.querySelectorAll('.side-link[data-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
  $('mobile-menu').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  $('btn-refresh').addEventListener('click',refresh);
  $('btn-voltar').addEventListener('click',()=>window.location.href='index.html');
  $('access-form').addEventListener('submit',signIn);
  $('toggle-access-password').addEventListener('click',event=>{
    const button = event.currentTarget;
    const password = $('access-password');
    const isVisible = password.type === 'password';
    password.type = isVisible ? 'text' : 'password';
    button.setAttribute('aria-label', isVisible ? 'Ocultar senha' : 'Mostrar senha');
    button.setAttribute('aria-pressed', String(isVisible));
    button.querySelector('i').classList.toggle('fa-eye', !isVisible);
    button.querySelector('i').classList.toggle('fa-eye-slash', isVisible);
  });
  $('btn-logout').addEventListener('click',signOut);
  $('modal').addEventListener('click',e=>{if(e.target.id==='modal'||e.target.closest('[data-close-modal]'))closeModal()});

  window.gestao={navigate,openIngredient,editIngredient,deleteIngredient,openPurchase,viewPurchase,deletePurchase,openRecipe,editRecipe,deleteRecipe,openEquipment,editEquipment,deleteEquipment,openEnergySettings,closeModal};
  start();
})();
