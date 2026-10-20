
  async function tentarEntrarAdmin() {
    const overlay = $('admin-login-overlay');
    $('admin-login-error').textContent = '';
    $('admin-login-error').hidden = true;
    try {
      const {data, error} = await _supabase.auth.getSession();
      if (error) throw error;
      if (data.session && await isGestaoAdmin(data.session.user.id)) {
        await abrirAdmin();
        return;
      }
      $('admin-login-email').value = data.session?.user.email || '';
      overlay.classList.add('open');
      $('admin-login-email').focus();
    } catch (error) {
      console.error('Erro ao verificar acesso administrativo:', error);
      $('admin-login-error').textContent = 'Não foi possível verificar o acesso. Tente novamente.';
      $('admin-login-error').hidden = false;
      overlay.classList.add('open');
    }
  }

  async function isGestaoAdmin(userId) {
    const {data, error} = await db.from('gestao_admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  function fecharLoginAdmin() {
    $('admin-login-overlay').classList.remove('open');
    $('admin-login-password').value = '';
  }

  async function entrarAdminComEmail(event) {
    event.preventDefault();
    const button = $('admin-login-submit');
    const errorMessage = $('admin-login-error');
    button.disabled = true;
    errorMessage.hidden = true;
    try {
      const {data, error} = await _supabase.auth.signInWithPassword({
        email: $('admin-login-email').value.trim(),
        password: $('admin-login-password').value
      });
      if (error) throw error;
      if (!data.user || !await isGestaoAdmin(data.user.id)) {
        const {error: signOutError} = await _supabase.auth.signOut();
        if (signOutError) console.error('Erro ao encerrar sessão sem permissão administrativa:', signOutError);
        errorMessage.textContent = 'Esta conta não tem permissão para acessar o painel.';
        errorMessage.hidden = false;
        return;
      }
      fecharLoginAdmin();
      await abrirAdmin();
    } catch (error) {
      console.error('Erro ao entrar no painel administrativo:', error);
      errorMessage.textContent = 'Não foi possível entrar. Confira o e-mail e a senha e tente novamente.';
      errorMessage.hidden = false;
    } finally {
      button.disabled = false;
    }
  }

  function abrirGestao() {
    localStorage.setItem('dois_amores_gestao_acesso', String(Date.now()));
    window.location.href = 'gestao.html';
  }

  async function abrirAdmin() {
    const { data } = await db.from(DB_TABLES.PRODUTOS).select('*').not('categoria', 'ilike', 'Docinho%');
    if (data) {
      produtosCardapio = data.map(p => ({
        ...p, categoria: p.categoria === 'festival' ? 'Tradicionais' : p.categoria,
        image: p.image_url || imagensLocaisFallback[p.id] || 'images/amor.jpeg'
      }));
    }
    await carregarPedidosNuvem();
    await carregarColetivosNuvem();
    await carregarStatusLojaNuvem();
    await carregarModoEncomendaNuvem();
    await carregarCuponsNuvem();
    
    atualizarMetricasOverview();
    carregarTabelaAdmin();
    carregarTabelaCuponsAdmin();
    carregarListaPedidosAdmin();
    carregarListaColetivosAdmin();
    carregarTabelaManualAdmin();
    carregarTabelaDocinhosAdmin();
    carregarTabelaPresentesAdmin();
    
    $('admin-modal-overlay').classList.add('open');
  }

  $('admin-login-form').addEventListener('submit', entrarAdminComEmail);
  $('admin-login-cancel').addEventListener('click', fecharLoginAdmin);
  $('admin-login-close').addEventListener('click', fecharLoginAdmin);
  $('admin-login-overlay').addEventListener('click', event => {
    if (event.target === $('admin-login-overlay')) fecharLoginAdmin();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('admin-login-overlay').classList.contains('open')) fecharLoginAdmin();
  });

  function mudarAbaAdmin(aba) {
    document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.remove('active'));

    const titulosHeader = {
      'overview': 'Visão Geral de Vendas',
      'estoque': 'Estoque & Cardápio',
      'docinhos': 'Gestão de Docinhos 🍬',
      'presentes': 'Gestão de Presentes 🎁',
      'pedidos': 'Lista de Pedidos',
      'coletivos': 'Pedidos Coletivos',
      'manual': 'Novo Pedido Manual',
      'cupons': 'Cupons de Desconto'
    };

    $('admin-title-header').innerText = titulosHeader[aba] || 'Painel Admin';

    const indexMap = { 'overview': 1, 'estoque': 2, 'docinhos': 3, 'presentes': 4, 'pedidos': 5, 'coletivos': 6, 'manual': 7, 'cupons': 8 };
    if (indexMap[aba]) {
      document.querySelector(`.admin-sidebar .admin-nav-btn:nth-child(${indexMap[aba]})`).classList.add('active');
    }
    $(`aba-${aba}`).classList.add('active');

    const sidebar = $('admin-sidebar-mobile');
    if (sidebar) sidebar.classList.remove('mobile-open');

    if (aba === 'overview') atualizarMetricasOverview();
    else if (aba === 'coletivos') carregarListaColetivosAdmin();
  }

  function selecionarTipoPedidoManual(tipo) {
    const coletivo = tipo === 'coletivo';
    $('manual-type-individual').classList.toggle('active', !coletivo);
    $('manual-type-coletivo').classList.toggle('active', coletivo);
    $('manual-individual-form').hidden = coletivo;
    if (coletivo) abrirPedidoColetivoManual();
  }

  function toggleManualEntrega() {
    const tipo = $('manual-recebimento').value;
    $('manual-endereco-box').style.display = (tipo === 'Entrega') ? 'block' : 'none';
    if (tipo !== 'Entrega') $('manual-taxa-entrega').value = "0.00";
    calcularTotalManual();
  }

  let itensManuaisSelecionados = [];

  function escaparHtmlManual(valor) {
    return String(valor ?? '').replace(/[&<>'"]/g, caractere => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[caractere]));
  }

  function carregarTabelaManualAdmin() {
    itensManuaisSelecionados = [];
    const lista = $('manual-itens-lista');
    if (!lista) return;
    lista.innerHTML = '<p class="manual-products-empty">Nenhum produto adicionado.</p>';
    $('manual-produto-pesquisa').value = '';
    renderizarOpcoesProdutosManual();

    const dataMinimaManual = obterDataMinimaEncomenda();
    const manualDataEl = $('manual-data');
    if (manualDataEl) {
      manualDataEl.min = dataMinimaManual;
      manualDataEl.value = dataMinimaManual;
    }

    calcularTotalManual();
  }

  function renderizarOpcoesProdutosManual() {
    const select = $('manual-produto-select');
    if (!select) return;
    const pesquisa = $('manual-produto-pesquisa').value.trim().toLocaleLowerCase('pt-BR');
    const produtos = produtosCardapio.filter(prod => `${prod.name} ${prod.id}`.toLocaleLowerCase('pt-BR').includes(pesquisa));
    select.innerHTML = '<option value="">Selecione um produto...</option>' + produtos.map(prod => {
      const preco = prod.id === 'caixa_mista' ? 'R$ 55,00 / 65,00' : `R$ ${Number(prod.price || 0).toFixed(2)}`;
      return `<option value="${escaparHtmlManual(prod.id)}">${escaparHtmlManual(prod.name)} (${preco})</option>`;
    }).join('');
    select.disabled = produtos.length === 0;
    if (produtos.length === 0) select.innerHTML = '<option value="">Nenhum produto encontrado</option>';
  }

  function filtrarProdutosManual() { renderizarOpcoesProdutosManual(); }

  function adicionarProdutoManual() {
    const produtoId = $('manual-produto-select').value;
    if (!produtoId) { alert('Selecione um produto para adicionar.'); return; }
    if (produtoId === 'caixa_mista') {
      abrirAdminModalCaixa();
      return;
    }
    const produto = produtosCardapio.find(prod => String(prod.id) === produtoId);
    if (!produto) { alert('O produto selecionado não está mais disponível. Atualize o painel e tente novamente.'); return; }
    itensManuaisSelecionados.push({id: produto.id, name: produto.name, price: Number(produto.price) || 0, quantity: 1, obs: '', feito: false});
    $('manual-produto-select').value = '';
    renderizarItensManuais();
  }

  function renderizarItensManuais() {
    const lista = $('manual-itens-lista');
    if (!lista) return;
    if (!itensManuaisSelecionados.length) {
      lista.innerHTML = '<p class="manual-products-empty">Nenhum produto adicionado.</p>';
      calcularTotalManual();
      return;
    }
    lista.innerHTML = itensManuaisSelecionados.map((item, index) => `
      <div class="manual-product-row">
        <div class="manual-product-name"><strong>${escaparHtmlManual(item.name)}</strong>${item.obs ? `<small>${escaparHtmlManual(item.obs)}</small>` : ''}</div>
        <span class="manual-product-price">R$ ${Number(item.price).toFixed(2)}</span>
        <div class="manual-product-quantity">
          <button class="cart-btn-qty" type="button" aria-label="Diminuir quantidade" onclick="mudarQtdItemManual(${index}, -1)">−</button>
          <input class="admin-input-qtd" type="number" min="1" step="1" value="${Number(item.quantity)}" aria-label="Quantidade de ${escaparHtmlManual(item.name)}" onchange="definirQtdItemManual(${index}, this.value)">
          <button class="cart-btn-qty" type="button" aria-label="Aumentar quantidade" onclick="mudarQtdItemManual(${index}, 1)">+</button>
        </div>
        <strong class="manual-product-subtotal">R$ ${(Number(item.price) * Number(item.quantity)).toFixed(2)}</strong>
        <button class="btn-sm btn-delete" type="button" aria-label="Remover ${escaparHtmlManual(item.name)}" onclick="removerItemManual(${index})"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `).join('');
    calcularTotalManual();
  }

  function mudarQtdItemManual(index, delta) {
    const item = itensManuaisSelecionados[index];
    if (!item) return;
    item.quantity = Math.max(1, (parseInt(item.quantity, 10) || 1) + delta);
    renderizarItensManuais();
  }

  function definirQtdItemManual(index, quantidade) {
    const item = itensManuaisSelecionados[index];
    if (!item) return;
    item.quantity = Math.max(1, parseInt(quantidade, 10) || 1);
    renderizarItensManuais();
  }

  function removerItemManual(index) {
    itensManuaisSelecionados.splice(index, 1);
    renderizarItensManuais();
  }

  function abrirAdminModalCaixa() {
    adminSaboresCaixaTemp = {};
    const container = $('admin-flavor-list-container');
    container.innerHTML = '';

    const saboresDisponiveis = obterProdutosValidosFestival().filter(p => !p.id.startsWith('espeto_') && p.id !== 'caixa_mista');
    saboresDisponiveis.forEach(sab => {
      adminSaboresCaixaTemp[sab.name] = 0;
      const tagGourmet = sab.price > 10 ? ' <span style="color:var(--ouro); font-size:0.75rem; font-weight:bold;">(Gourmet)</span>' : '';
      container.innerHTML += `
        <div class="flavor-option-row">
          <span>${sab.name}${tagGourmet} <small>(R$ ${sab.price.toFixed(2)})</small></span>
          <div class="flavor-counter">
            <button class="flavor-btn" type="button" onclick="adminMudarQtdSaborCaixa('${sab.name}', -1)">-</button>
            <span id="admin-qtd-sabor-${sab.name}" style="width: 24px; text-align: center; font-weight: bold;">0</span>
            <button class="flavor-btn" type="button" onclick="adminMudarQtdSaborCaixa('${sab.name}', 1)">+</button>
          </div>
        </div>
      `;
    });
    atualizarAdminStatusModalCaixa();
    $('admin-custom-modal-overlay').classList.add('open');
  }

  function adminMudarQtdSaborCaixa(nomeSabor, delta) {
    let totalAtual = Object.values(adminSaboresCaixaTemp).reduce((a, b) => a + b, 0);
    let valorAtualSabor = adminSaboresCaixaTemp[nomeSabor];
    if (delta > 0) {
      if (totalAtual >= 6) { alert("⚠️ 6 morangos já atingidos!"); return; }
      adminSaboresCaixaTemp[nomeSabor] = valorAtualSabor + 1;
    } else {
      if (valorAtualSabor > 0) adminSaboresCaixaTemp[nomeSabor] = valorAtualSabor - 1;
    }
    $(`admin-qtd-sabor-${nomeSabor}`).innerText = adminSaboresCaixaTemp[nomeSabor];
    atualizarAdminStatusModalCaixa();
  }

  function calcularAdminPrecoCaixaTemp() {
    let temGourmet = false;
    for (const [nomeSabor, qtd] of Object.entries(adminSaboresCaixaTemp)) {
      if (qtd > 0) {
        const prod = produtosCardapio.find(p => p.name.toLowerCase() === nomeSabor.toLowerCase());
        if (prod && prod.price > 10) { temGourmet = true; break; }
      }
    }
    return temGourmet ? 65.00 : 55.00;
  }

  function atualizarAdminStatusModalCaixa() {
    let totalAtual = Object.values(adminSaboresCaixaTemp).reduce((a, b) => a + b, 0);
    $('admin-flavor-count-status').innerText = `Restantes: ${6 - totalAtual}`;
    $('admin-flavor-price-preview').innerText = `Preço: R$ ${calcularAdminPrecoCaixaTemp().toFixed(2)}`;
  }

  function fecharAdminModalCaixa() { $('admin-custom-modal-overlay').classList.remove('open'); }

  function confirmarAdminCaixaMista() {
    let totalAtual = Object.values(adminSaboresCaixaTemp).reduce((a, b) => a + b, 0);
    if (totalAtual !== 6) { alert("⚠️ Escolha exatamente 6 sabores!"); return; }
    let obsSabores = Object.entries(adminSaboresCaixaTemp).filter(([nome, qtd]) => qtd > 0).map(([nome, qtd]) => `${qtd}x ${nome}`).join(', ');
    let precoCaixa = calcularAdminPrecoCaixaTemp();

    itensManuaisSelecionados.push({id: 'caixa_mista', name: 'Caixa Mista (6 Morangos)', price: precoCaixa, quantity: 1, obs: `Sabores: ${obsSabores}`, feito: false});
    fecharAdminModalCaixa();
    $('manual-produto-select').value = '';
    renderizarItensManuais();
  }

  function calcularTotalManual() {
    let totalGeral = itensManuaisSelecionados.reduce((soma, item) => soma + Number(item.price) * Number(item.quantity), 0);
    if ($('manual-recebimento').value === 'Entrega') {
      totalGeral += parseFloat($('manual-taxa-entrega').value) || 0;
    }
    $('manual-total-preview').innerText = totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return totalGeral;
  }

  async function salvarPedidoManual() {
    const cliente = $('manual-cliente').value.trim();
    const whatsapp = $('manual-whatsapp').value.trim();
    const pagamento = $('manual-pagamento').value;
    const recebimento = $('manual-recebimento').value;
    const dataAgendada = $('manual-data').value;
    const endereco = $('manual-endereco').value.trim();
    const taxaEntregaManual = parseFloat($('manual-taxa-entrega').value) || 0;

    if (!cliente) { alert("Preencha o nome do cliente."); return; }
    if (!itensManuaisSelecionados.length) { alert("Adicione pelo menos um produto ao pedido."); return; }
    if (recebimento === 'Entrega' && !endereco) { alert("Preencha o endereço de entrega."); return; }

    const itensManual = itensManuaisSelecionados.map(item => ({...item, feito: false}));

    let totalGeral = calcularTotalManual();
    const pedidoId = 'ped_' + Date.now();
    
    let dataFormatadaBr = new Date().toLocaleDateString('pt-BR');
    if (dataAgendada) {
      let partes = dataAgendada.split('-');
      if (partes.length === 3) dataFormatadaBr = `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let enderecoFinal = recebimento === 'Entrega' ? `${endereco}` : 'Retirada no Local';
    let obsEntregaFinal = 'Pedido lançado via Painel Admin';
    if (verificarSeEValidador(cliente)) obsEntregaFinal += ' | *ENVIAR DOCINHOS CORTESIA';

    const novoPedidoSupabase = {
      id_pedido: pedidoId, data: dataFormatadaBr, hora: horaAtual, cliente: cliente,
      whatsapp: whatsapp, itens: itensManual, total: totalGeral, pagamento: pagamento,
      entrega: recebimento, obs_entrega: obsEntregaFinal, status: 'aguardando',
      data_agendada: dataAgendada || null, endereco: enderecoFinal, frete: taxaEntregaManual
    };

    const { error } = await db.from(DB_TABLES.PEDIDOS).insert([novoPedidoSupabase]);
    if (error) { alert("Erro: " + error.message); return; }

    alert("Pedido manual salvo com sucesso!");
    $('manual-cliente').value = '';
    $('manual-whatsapp').value = '';
    $('manual-endereco').value = '';
    itensManuaisSelecionados = [];
    renderizarOpcoesProdutosManual();
    renderizarItensManuais();
    mudarAbaAdmin('pedidos');
  }

  if (new URLSearchParams(window.location.search).get('abrirAdmin') === '1') {
    window.addEventListener('load', () => {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
      tentarEntrarAdmin();
    }, {once: true});
  }
