  function abrirModalDetalhesPedido(idPedido) {
    pedidoDetalheAtualId = idPedido;
    $('filtro-itens-pedido').value = '';
    renderizarItensDetalhesPedidoModal();
    $('modal-detalhes-pedido').classList.add('open');
  }

  function renderizarItensDetalhesPedidoModal() {
    const pedido = listaPedidos.find(p => p.id === pedidoDetalheAtualId);
    if (!pedido) return;
    
    $('modal-detalhes-titulo').innerText = `Pedido: ${pedido.cliente}`;
    const container = $('modal-detalhes-itens-container');
    const filtro = $('filtro-itens-pedido').value.toLowerCase().trim();
    container.innerHTML = '';

    let itensRenderizados = 0;

    pedido.itens.forEach((item, itemIdx) => {
      const textoBusca = `${item.name} ${item.obs || ''}`.toLowerCase();
      if (!filtro || textoBusca.includes(filtro)) {
        itensRenderizados++;
        const estaFeito = item.feito === true;
        const precoUnit = item.price || 0;
        container.innerHTML += `
          <div style="display: flex; justify-content: space-between; align-items: center; background: ${estaFeito ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255,255,255,0.03)'}; border: 1px solid var(--line); padding: 12px; border-radius: 10px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <input type="checkbox" ${estaFeito ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #2ecc71; cursor: pointer;" onchange="alternarItemFeitoPedido('${pedido.id}', ${itemIdx}, this.checked)">
              <div>
                <div style="font-weight: 600; color: var(--creme);">${item.quantity}x ${item.name}</div>
                ${item.obs ? `<small style="color: var(--ouro);">${item.obs}</small>` : ''}
              </div>
            </div>
            <span style="color: var(--ouro); font-weight: bold; font-size: 0.9rem;">R$ ${(precoUnit * item.quantity).toFixed(2)}</span>
          </div>
        `;
      }
    });

    if (pedido.frete > 0) {
      container.innerHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(201,151,74,0.05); border: 1px solid var(--line); padding: 10px 12px; border-radius: 10px; margin-top: 8px;">
          <span style="font-weight: 600; color: var(--ouro);">Taxa de Frete / Entrega</span>
          <span style="color: var(--ouro); font-weight: bold; font-size: 0.9rem;">R$ ${pedido.frete.toFixed(2)}</span>
        </div>
      `;
    }

    if (itensRenderizados === 0 && pedido.frete === 0) {
      container.innerHTML = `<p style="text-align: center; color: var(--creme-dim); padding: 20px;">Nenhum item encontrado com esse filtro.</p>`;
    }
  }

  function filtrarItensDetalhesPedido() {
    renderizarItensDetalhesPedidoModal();
  }

  function fecharModalDetalhesPedido() {
    $('modal-detalhes-pedido').classList.remove('open');
    pedidoDetalheAtualId = null;
  }

  function formatarDataParaInput(data) {
    const valor = String(data || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
    const dataBr = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return dataBr ? `${dataBr[3]}-${dataBr[2]}-${dataBr[1]}` : '';
  }

  async function alternarItemFeitoPedido(idPedido, itemIdx, feitoStatus) {
    const pedido = listaPedidos.find(p => p.id === idPedido);
    if (pedido && pedido.itens && pedido.itens[itemIdx]) {
      pedido.itens[itemIdx].feito = feitoStatus;
      await db.from(DB_TABLES.PEDIDOS).update({ itens: pedido.itens }).eq('id_pedido', idPedido);
      renderizarItensDetalhesPedidoModal();
    }
  }

  function abrirModalEditarPedido(idPedido) {
    const pedido = JSON.parse(JSON.stringify(listaPedidos.find(p => p.id === idPedido)));
    if (!pedido) return;

    pedidoEditandoTemp = pedido;
    $('edit-pedido-id-alvo').value = pedido.id;
    $('edit-pedido-cliente').value = pedido.cliente;
    $('edit-pedido-zap').value = pedido.whatsapp || '';
    $('edit-pedido-data-agendada').value = formatarDataParaInput(pedido.dataAgendada);
    $('edit-pedido-frete').value = pedido.frete !== undefined ? pedido.frete : 0;

    renderizarItensEdicaoPedido();
    $('modal-editar-pedido').classList.add('open');
  }

  function fecharModalEditarPedido() {
    $('modal-editar-pedido').classList.remove('open');
    pedidoEditandoTemp = null;
  }

  function renderizarItensEdicaoPedido() {
    const container = $('edit-pedido-itens-container');
    if (!container || !pedidoEditandoTemp) return;
    container.innerHTML = '';
    const produtosFestival = obterProdutosValidosFestival();

    let subtotalItens = 0;

    pedidoEditandoTemp.itens.forEach((item, idx) => {
      subtotalItens += (item.price || 0) * (item.quantity || 1);
      container.innerHTML += `
        <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--line); border-radius: 10px; padding: 12px; margin-bottom: 8px;">
          <div style="display: grid; grid-template-columns: 2fr 1fr 70px 40px; gap: 8px; align-items: center; margin-bottom: 6px;">
            <select class="cart-input" style="padding: 6px; font-size: 0.85rem;" onchange="atualizarItemEdicao(${idx}, 'id', this.value)">
              ${produtosFestival.map(p => `<option value="${p.id}" ${p.id === item.id ? 'selected' : ''}>${p.name} (R$ ${p.price.toFixed(2)})</option>`).join('')}
            </select>
            <input type="number" class="admin-input-qtd" style="padding: 6px; width: 100%;" value="${item.quantity}" min="1" oninput="atualizarItemEdicao(${idx}, 'quantity', this.value)">
            <span style="color: var(--ouro); font-weight: bold; font-size: 0.85rem;">R$ ${((item.price || 0) * item.quantity).toFixed(2)}</span>
            <button class="btn-sm btn-delete" type="button" onclick="removerItemEdicao(${idx})">×</button>
          </div>
          <input type="text" class="cart-input" style="padding: 6px; font-size: 0.8rem;" placeholder="Observação ou sabor..." value="${item.obs || ''}" oninput="atualizarItemEdicao(${idx}, 'obs', this.value)">
        </div>
      `;
    });

    const freteDigitado = parseFloat($('edit-pedido-frete').value) || 0;
    let totalComFrete = subtotalItens + freteDigitado;
    $('edit-pedido-total-preview').innerText = totalComFrete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function adicionarItemEdicaoPedido() {
    if (!pedidoEditandoTemp) return;
    const produtosFestival = obterProdutosValidosFestival();
    const primeiro = produtosFestival[0] || produtosCardapio[0];
    pedidoEditandoTemp.itens.push({
      id: primeiro.id, name: primeiro.name, price: primeiro.price, quantity: 1, obs: '', feito: false
    });
    renderizarItensEdicaoPedido();
  }

  function removerItemEdicao(idx) {
    if (!pedidoEditandoTemp) return;
    if (pedidoEditandoTemp.itens.length === 1) { alert("O pedido deve ter ao menos 1 item."); return; }
    pedidoEditandoTemp.itens.splice(idx, 1);
    renderizarItensEdicaoPedido();
  }

  function atualizarItemEdicao(idx, campo, valor) {
    if (!pedidoEditandoTemp) return;
    if (campo === 'id') {
      const prod = produtosCardapio.find(p => p.id === valor);
      if (prod) {
        pedidoEditandoTemp.itens[idx].id = prod.id;
        pedidoEditandoTemp.itens[idx].name = prod.name;
        pedidoEditandoTemp.itens[idx].price = prod.price;
      }
    } else if (campo === 'quantity') {
      pedidoEditandoTemp.itens[idx].quantity = parseInt(valor) || 1;
    } else if (campo === 'obs') {
      pedidoEditandoTemp.itens[idx].obs = valor;
    }
    renderizarItensEdicaoPedido();
  }

  async function salvarEdicaoPedido() {
    if (!pedidoEditandoTemp) return;
    const cliente = $('edit-pedido-cliente').value.trim();
    const whatsapp = $('edit-pedido-zap').value.trim();
    const dataAgendada = $('edit-pedido-data-agendada').value;
    const novoFrete = parseFloat($('edit-pedido-frete').value) || 0;
    if (!cliente) { alert("Preencha o nome do cliente."); return; }

    let subtotalItens = pedidoEditandoTemp.itens.reduce((acc, i) => acc + ((i.price || 0) * (i.quantity || 1)), 0);
    let novoTotal = subtotalItens + novoFrete;

    pedidoEditandoTemp.cliente = cliente;
    pedidoEditandoTemp.whatsapp = whatsapp;
    pedidoEditandoTemp.dataAgendada = dataAgendada;
    pedidoEditandoTemp.frete = novoFrete;
    pedidoEditandoTemp.total = novoTotal;

    const { error } = await db.from(DB_TABLES.PEDIDOS).update({
      cliente: cliente,
      whatsapp: whatsapp,
      data_agendada: dataAgendada || null,
      frete: novoFrete,
      itens: pedidoEditandoTemp.itens,
      total: novoTotal
    }).eq('id_pedido', pedidoEditandoTemp.id);

    if (error) { alert("Erro ao atualizar: " + error.message); return; }

    alert("Pedido atualizado com sucesso!");
    fecharModalEditarPedido();
    carregarListaPedidosAdmin();
    atualizarMetricasOverview();
  }

  function reenviarPedidoWhatsapp(idPedido) {
    const pedido = listaPedidos.find(p => p.id === idPedido);
    if (!pedido) return;
    let text = `Olá, *${pedido.cliente}*! Passando para atualizar sobre o seu pedido na Dois Amores Doceria:\n\n`;
    pedido.itens.forEach(i => { text += `- ${i.quantity}x ${i.name} ${i.obs ? '('+i.obs+')' : ''}\n`; });
    if (pedido.frete > 0) text += `- Taxa de Frete/Entrega: R$ ${pedido.frete.toFixed(2)}\n`;
    text += `\n*TOTAL: ${pedido.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\nStatus: *${pedido.status.toUpperCase()}*`;

    let telefone = pedido.whatsapp ? pedido.whatsapp.replace(/\D/g, '') : '';
    if (!telefone.startsWith('55') && telefone.length >= 10) telefone = '55' + telefone;
    
    abrirWhatsApp(telefone, text);
  }

  function mudarFiltroPedidos(tipo) {
    filtroPedidosAtual = tipo;
    dataEspecificaFiltro = '';
    $('filtro-data-especifica').value = '';
    $('btn-filtro-hoje').classList.toggle('active', tipo === 'hoje');
    $('btn-filtro-anteriores').classList.toggle('active', tipo === 'anteriores');
    carregarListaPedidosAdmin();
  }

  function filtrarPedidosPorDataEspecifica() {
    const val = $('filtro-data-especifica').value;
    if (!val) return;
    dataEspecificaFiltro = val; 
    filtroPedidosAtual = '';
    $('btn-filtro-hoje').classList.remove('active');
    $('btn-filtro-anteriores').classList.remove('active');
    carregarListaPedidosAdmin();
  }

  function limparFiltroData() {
    $('filtro-data-especifica').value = '';
    dataEspecificaFiltro = '';
    mudarFiltroPedidos('hoje');
  }

  async function gerarRelatorioSaidaSabores() {
    await carregarPedidosNuvem();
    const hojeIso = new Date().toISOString().split('T')[0];
    const pedidosFiltrados = listaPedidos.filter(pedido => {
      const dataAgendadaPedido = pedido.dataAgendada || hojeIso;
      if (dataEspecificaFiltro) return dataAgendadaPedido === dataEspecificaFiltro;
      if (filtroPedidosAtual === 'hoje') return dataAgendadaPedido === hojeIso;
      else return dataAgendadaPedido < hojeIso;
    });

    if (pedidosFiltrados.length === 0) { alert("Nenhum pedido no filtro atual."); return; }

    let contagemSabores = {};
    let contagemSaboresCaixa = {};

    pedidosFiltrados.forEach(pedido => {
      if (pedido.itens && Array.isArray(pedido.itens)) {
        pedido.itens.forEach(item => {
          if (item.id === 'taxa_entrega') return;
          contagemSabores[item.name] = (contagemSabores[item.name] || 0) + (item.quantity || 1);
          if (item.obs && item.obs.includes('Sabores:')) {
            let partesObs = item.obs.split('Sabores:');
            let pedacosSabores = partesObs[1].split(',');
            pedacosSabores.forEach(p => {
              let match = p.trim().match(/(\d+)x\s+(.+)/);
              if (match) {
                let q = parseInt(match[1]) * (item.quantity || 1);
                let s = match[2].trim();
                contagemSaboresCaixa[s] = (contagemSaboresCaixa[s] || 0) + q;
              }
            });
          }
        });
      }
    });

    let linhasTabelaProdutos = '';
    let totalItensGeral = 0;
    for (const [nome, qtd] of Object.entries(contagemSabores)) {
      totalItensGeral += qtd;
      linhasTabelaProdutos += `<tr><td>${nome}</td><td style="text-align:center;"><b>${qtd}</b></td></tr>`;
    }

    let linhasTabelaCaixas = '';
    for (const [sabor, qtd] of Object.entries(contagemSaboresCaixa)) {
      linhasTabelaCaixas += `<tr><td>${sabor}</td><td style="text-align:center;"><b>${qtd}</b></td></tr>`;
    }

    const printArea = $('relatorio-print-area');
    printArea.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #2a0f14;">Dois Amores Doceria</h2>
        <p style="margin: 5px 0; font-size: 14px; color: #555;">Relatório de Saída por Sabores</p>
      </div>
      <h3 style="color: #2a0f14; border-bottom: 2px solid #ddd; padding-bottom: 5px;">Produtos Principais</h3>
      <table class="print-table"><thead><tr><th>Produto</th><th style="text-align:center;">Qtd</th></tr></thead><tbody>${linhasTabelaProdutos}</tbody></table>
      ${Object.keys(contagemSaboresCaixa).length > 0 ? `
        <h3 style="color: #2a0f14; border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-top: 20px;">Morangos nas Caixas Mistas</h3>
        <table class="print-table"><thead><tr><th>Sabor</th><th style="text-align:center;">Qtd</th></tr></thead><tbody>${linhasTabelaCaixas}</tbody></table>
      ` : ''}
      <div style="margin-top: 20px; text-align: right;"><p><b>Total de Itens:</b> ${totalItensGeral}</p></div>
    `;
    window.print();
  }
