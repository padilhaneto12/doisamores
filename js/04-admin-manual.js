
  async function tentarEntrarAdmin() {
    const senhaDigitada = prompt("Senha do painel administrativo:");
    if (senhaDigitada === null) return;
    const { data, error } = await db.from(DB_TABLES.CONFIGURACOES).select('valor').eq('chave', 'senha_admin').single();
    if (error || !data) { alert("Erro ao validar senha."); return; }
    if (senhaDigitada === data.valor) abrirAdmin();
    else alert("Senha incorreta!");
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
    await carregarAvaliadoresNuvem();
    
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
      'cupons': 'Cupons de Desconto',
      'avaliadores': 'Avaliadores Google'
    };

    $('admin-title-header').innerText = titulosHeader[aba] || 'Painel Admin';

    const indexMap = { 'overview': 1, 'estoque': 2, 'docinhos': 3, 'presentes': 4, 'pedidos': 5, 'coletivos': 6, 'manual': 7, 'cupons': 8, 'avaliadores': 9 };
    if (indexMap[aba]) {
      document.querySelector(`.admin-sidebar .admin-nav-btn:nth-child(${indexMap[aba]})`).classList.add('active');
    }
    $(`aba-${aba}`).classList.add('active');

    const sidebar = $('admin-sidebar-mobile');
    if (sidebar) sidebar.classList.remove('mobile-open');

    if (aba === 'overview') atualizarMetricasOverview();
    else if (aba === 'coletivos') carregarListaColetivosAdmin();
  }

  function toggleManualEntrega() {
    const tipo = $('manual-recebimento').value;
    $('manual-endereco-box').style.display = (tipo === 'Entrega') ? 'block' : 'none';
    if (tipo !== 'Entrega') $('manual-taxa-entrega').value = "0.00";
    calcularTotalManual();
  }

  let caixasManuaisPendentes = [];

  function carregarTabelaManualAdmin() {
    caixasManuaisPendentes = [];
    const tbody = $('manual-produtos-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const dataMinimaManual = obterDataMinimaEncomenda();
    const manualDataEl = $('manual-data');
    if (manualDataEl) {
      manualDataEl.min = dataMinimaManual;
      manualDataEl.value = dataMinimaManual;
    }

    produtosCardapio.forEach((prod, index) => {
      const precoExibicao = prod.id === 'caixa_mista' ? 55.00 : prod.price;
      const isCaixa = prod.id === 'caixa_mista';
      
      tbody.innerHTML += `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--creme);">${prod.name}</div>
            <small style="color: var(--creme-dim);">${prod.id}</small>
          </td>
          <td>R$ <span id="manual-preco-${index}">${precoExibicao.toFixed(2)}</span></td>
          <td style="text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <button class="cart-btn-qty" type="button" onclick="mudarQtdManual(${index}, -1)">-</button>
              <input type="number" id="manual-qtd-${index}" class="admin-input-qtd" value="0" min="0" ${isCaixa ? 'readonly style="background:rgba(201,151,74,0.1); color:var(--ouro);"' : 'oninput="calcularTotalManual()"'}>
              <button class="cart-btn-qty" type="button" onclick="mudarQtdManual(${index}, 1)">+</button>
            </div>
            ${isCaixa ? '<br><small style="color:var(--ouro); font-size:0.7rem; cursor:pointer;" onclick="abrirAdminModalCaixa()">+ Configurar Caixa</small>' : ''}
          </td>
        </tr>
      `;
    });
    calcularTotalManual();
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

    caixasManuaisPendentes.push({ name: 'Caixa Mista (6 Morangos)', price: precoCaixa, quantity: 1, obs: `Sabores: ${obsSabores}` });
    const indexCaixa = produtosCardapio.findIndex(p => p.id === 'caixa_mista');
    if (indexCaixa >= 0) {
      const input = $(`manual-qtd-${indexCaixa}`);
      if (input) input.value = parseInt(input.value || 0) + 1;
    }
    fecharAdminModalCaixa();
    calcularTotalManual();
  }

  function mudarQtdManual(index, delta) {
    const prod = produtosCardapio[index];
    if (prod.id === 'caixa_mista') {
      if (delta > 0) abrirAdminModalCaixa();
      else {
        let input = $(`manual-qtd-${index}`);
        let atual = parseInt(input.value) || 0;
        if (atual > 0) { input.value = atual - 1; if (caixasManuaisPendentes.length > 0) caixasManuaisPendentes.pop(); calcularTotalManual(); }
      }
      return;
    }
    const input = $(`manual-qtd-${index}`);
    if (input) {
      let atual = parseInt(input.value) || 0;
      input.value = Math.max(0, atual + delta);
      calcularTotalManual();
    }
  }

  function calcularTotalManual() {
    let totalGeral = 0;
    produtosCardapio.forEach((prod, index) => {
      const input = $(`manual-qtd-${index}`);
      const precoEl = $(`manual-preco-${index}`);
      if (input && precoEl && prod.id !== 'caixa_mista') {
        totalGeral += (parseInt(input.value) || 0) * (parseFloat(precoEl.innerText) || 0);
      }
    });
    caixasManuaisPendentes.forEach(cx => { totalGeral += cx.price * cx.quantity; });
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
    if (recebimento === 'Entrega' && !endereco) { alert("Preencha o endereço de entrega."); return; }

    let itensManual = [];
    produtosCardapio.forEach((prod, index) => {
      const input = $(`manual-qtd-${index}`);
      const precoEl = $(`manual-preco-${index}`);
      if (input && precoEl) {
        let qtd = parseInt(input.value) || 0;
        if (qtd > 0 && prod.id !== 'caixa_mista') {
          itensManual.push({ id: prod.id, name: prod.name, price: parseFloat(precoEl.innerText) || 0, quantity: qtd, obs: '', feito: false });
        }
      }
    });
    caixasManuaisPendentes.forEach(cx => itensManual.push({ ...cx, feito: false }));

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
    caixasManuaisPendentes = [];
    mudarAbaAdmin('pedidos');
  }

