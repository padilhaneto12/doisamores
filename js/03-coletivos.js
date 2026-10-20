  function obterTotalPedidoColetivo() {
    let totalGeral = 0;
    colaboradoresColetivo.forEach(collab => {
      collab.itens.forEach(item => {
        const prod = produtosCardapio.find(p => p.id === item.produtoId);
        const precoUnit = item.precoPersonalizado !== undefined ? item.precoPersonalizado : (prod ? prod.price : 0);
        totalGeral += precoUnit * (parseInt(item.quantidade) || 0);
      });
    });
    return totalGeral;
  }

  function calcularFreteColetivo(totalPedido) {
    if (totalPedido > 150) {
      taxaEntregaColetivo = 0;
      return 0;
    }
    const bairro = $('coletivo-bairro')?.value?.trim() || '';
    if (!bairro) return 0;

    let taxa = taxaPadrao;
    for (const [b, valor] of Object.entries(tabelaFrete)) {
      if (bairro.toLowerCase().includes(b.toLowerCase())) {
        taxa = valor;
        break;
      }
    }
    return taxa;
  }

  function obterDataMinimaColetivo() {
    const dataMinima = new Date();
    dataMinima.setHours(0, 0, 0, 0);
    dataMinima.setDate(dataMinima.getDate() + 2);
    const ano = dataMinima.getFullYear();
    const mes = String(dataMinima.getMonth() + 1).padStart(2, '0');
    const dia = String(dataMinima.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function formatarFreteColetivo(frete, subtotal) {
    if (subtotal > 150) return 'Grátis';
    if (!$('coletivo-bairro')?.value?.trim()) return 'Informe o CEP';
    return frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function buscarCEPColetivo() {
    const cep = $('coletivo-cep')?.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(res => res.json())
      .then(data => {
        if (data.erro) { alert('CEP não encontrado.'); return; }
        $('coletivo-rua').value = data.logradouro || '';
        $('coletivo-bairro').value = data.bairro || '';
        calcularTaxaColetivo(data.bairro || '');
        $('coletivo-numero').focus();
      })
      .catch(() => {
        alert('Não foi possível buscar o CEP.');
      });
  }

  function calcularTaxaColetivo(bairro) {
    const subtotal = obterTotalPedidoColetivo();
    if (subtotal > 150) {
      taxaEntregaColetivo = 0;
      const freteEl = $('coletivo-frete-valor');
      if (freteEl) freteEl.innerText = 'Grátis';
      const totalEl = $('coletivo-total-geral');
      if (totalEl) totalEl.innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const subtotalEl = $('coletivo-subtotal');
      if (subtotalEl) subtotalEl.innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return 0;
    }

    let matched = false;
    for (const [b, t] of Object.entries(tabelaFrete)) {
      if (bairro.toLowerCase().includes(b.toLowerCase())) { taxaEntregaColetivo = t; matched = true; break; }
    }
    if (!matched) taxaEntregaColetivo = taxaPadrao;

    const freteEl = $('coletivo-frete-valor');
    if (freteEl) freteEl.innerText = taxaEntregaColetivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const subtotalEl = $('coletivo-subtotal');
    if (subtotalEl) subtotalEl.innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const totalEl = $('coletivo-total-geral');
    if (totalEl) totalEl.innerText = (subtotal + taxaEntregaColetivo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return taxaEntregaColetivo;
  }

  function abrirModalPedidoColetivo() {
    pedidoColetivoManual = false;
    colaboradoresColetivo = [];
    $('coletivo-resp-nome').value = '';
    $('coletivo-resp-zap').value = '';
    $('coletivo-cep').value = '';
    $('coletivo-rua').value = '';
    $('coletivo-rua').readOnly = true;
    $('coletivo-numero').value = '';
    $('coletivo-complemento').value = '';
    $('coletivo-bairro').value = '';
    $('coletivo-bairro').readOnly = true;
    taxaEntregaColetivo = 0;

    const dataInput = $('coletivo-resp-data');
    if (dataInput) {
      const dataMinimaIso = obterDataMinimaColetivo();
      dataInput.min = dataMinimaIso;
      dataInput.value = dataMinimaIso;
    }

    adicionarNovoColaborador();
    $('modal-pedido-coletivo').classList.add('open');
  }

  function abrirPedidoColetivoManual() {
    abrirModalPedidoColetivo();
    pedidoColetivoManual = true;
    $('coletivo-rua').readOnly = false;
    $('coletivo-bairro').readOnly = false;
    $('coletivo-resp-data').min = '';
    const hoje = new Date();
    $('coletivo-resp-data').value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    $('modal-pedido-coletivo').querySelector('h3').innerHTML = '<i class="fa-solid fa-users"></i> Pedido Coletivo Manual';
    $('modal-pedido-coletivo').querySelector('p[style*="margin-bottom: 20px"]').textContent = 'Cadastre um pedido coletivo recebido por telefone ou balcão.';
    $('coletivo-resp-data').previousElementSibling.textContent = 'Data da Encomenda:';
    $('modal-pedido-coletivo').querySelector('button[onclick="confirmarPedidoColetivo()"]').textContent = 'Salvar Pedido Coletivo';
  }

  function fecharModalPedidoColetivo() {
    $('modal-pedido-coletivo').classList.remove('open');
    pedidoColetivoManual = false;
    $('manual-type-individual')?.classList.add('active');
    $('manual-type-coletivo')?.classList.remove('active');
    if ($('manual-individual-form')) $('manual-individual-form').hidden = false;
    $('modal-pedido-coletivo').querySelector('h3').innerHTML = '<i class="fa-solid fa-users"></i> Novo Pedido Coletivo';
    $('modal-pedido-coletivo').querySelector('p[style*="margin-bottom: 20px"]').textContent = 'Junte os pedidos do escritório ou grupo em uma única entrega! Antecedência mínima de 2 dias.';
    $('coletivo-resp-data').previousElementSibling.textContent = 'Data da Encomenda (Mínimo 2 dias):';
    $('modal-pedido-coletivo').querySelector('button[onclick="confirmarPedidoColetivo()"]').textContent = 'Confirmar e Enviar Pedido Coletivo 💬';
  }

  function obterProdutosValidosFestival() {
    return produtosCardapio.filter(p => {
      const cat = (p.categoria || '').toLowerCase();
      const nomeId = (p.id + ' ' + p.name).toLowerCase();
      return cat !== 'sobremesa' && !nomeId.includes('presente') && !nomeId.includes('buque') && !nomeId.includes('box');
    });
  }

  function adicionarNovoColaborador() {
    const produtosFestival = obterProdutosValidosFestival();
    const primeiroId = produtosFestival[0]?.id || produtosCardapio[0]?.id || '';
    colaboradoresColetivo.push({
      id: Date.now() + Math.random(), nome: '', obs: '',
      itens: [{ produtoId: primeiroId, quantidade: 1, obs: '', precoPersonalizado: undefined }]
    });
    renderizarColaboradoresColetivo();
  }

  function removerColaborador(index) {
    if (colaboradoresColetivo.length === 1) { alert("O pedido precisa ter ao menos um colaborador."); return; }
    colaboradoresColetivo.splice(index, 1);
    renderizarColaboradoresColetivo();
  }

  function adicionarItemColaborador(collabIndex) {
    const produtosFestival = obterProdutosValidosFestival();
    const primeiroId = produtosFestival[0]?.id || produtosCardapio[0]?.id || '';
    colaboradoresColetivo[collabIndex].itens.push({ produtoId: primeiroId, quantidade: 1, obs: '', precoPersonalizado: undefined });
    renderizarColaboradoresColetivo();
  }

  function removerItemColaborador(collabIndex, itemIndex) {
    if (colaboradoresColetivo[collabIndex].itens.length === 1) { alert("Cada colaborador deve ter ao menos 1 item."); return; }
    colaboradoresColetivo[collabIndex].itens.splice(itemIndex, 1);
    renderizarColaboradoresColetivo();
  }

  function atualizarColaboradorCampo(collabIndex, campo, valor) { colaboradoresColetivo[collabIndex][campo] = valor; }

  function atualizarItemCollab(collabIndex, itemIndex, campo, valor) {
    if (campo === 'produtoId' && valor === 'caixa_mista') { abrirColetivoModalCaixa(collabIndex, itemIndex); return; }
    colaboradoresColetivo[collabIndex].itens[itemIndex][campo] = valor;
    if (campo === 'produtoId') {
      colaboradoresColetivo[collabIndex].itens[itemIndex].precoPersonalizado = undefined;
      colaboradoresColetivo[collabIndex].itens[itemIndex].obs = '';
    }
    calcularTotaisColetivo();
  }

  function abrirColetivoModalCaixa(collabIndex, itemIndex) {
    coletivoAlvoAtual = { collabIndex, itemIndex };
    coletivoSaboresCaixaTemp = {};
    const container = $('coletivo-flavor-list-container');
    container.innerHTML = '';

    const saboresDisponiveis = obterProdutosValidosFestival().filter(p => !p.id.startsWith('espeto_') && p.id !== 'caixa_mista');
    saboresDisponiveis.forEach(sab => {
      coletivoSaboresCaixaTemp[sab.name] = 0;
      const tagGourmet = sab.price > 10 ? ' <span style="color:var(--ouro); font-size:0.75rem; font-weight:bold;">(Gourmet)</span>' : '';
      container.innerHTML += `
        <div class="flavor-option-row">
          <span>${sab.name}${tagGourmet} <small>(R$ ${sab.price.toFixed(2)})</small></span>
          <div class="flavor-counter">
            <button class="flavor-btn" type="button" onclick="coletivoMudarQtdSaborCaixa('${sab.name}', -1)">-</button>
            <span id="coletivo-qtd-sabor-${sab.name}" style="width: 24px; text-align: center; font-weight: bold;">0</span>
            <button class="flavor-btn" type="button" onclick="coletivoMudarQtdSaborCaixa('${sab.name}', 1)">+</button>
          </div>
        </div>
      `;
    });
    atualizarColetivoStatusModalCaixa();
    $('coletivo-modal-overlay').classList.add('open');
  }

  function coletivoMudarQtdSaborCaixa(nomeSabor, delta) {
    let totalAtual = Object.values(coletivoSaboresCaixaTemp).reduce((a, b) => a + b, 0);
    let valorAtualSabor = coletivoSaboresCaixaTemp[nomeSabor];
    if (delta > 0) {
      if (totalAtual >= 6) { alert("⚠️ 6 morangos já selecionados!"); return; }
      coletivoSaboresCaixaTemp[nomeSabor] = valorAtualSabor + 1;
    } else {
      if (valorAtualSabor > 0) coletivoSaboresCaixaTemp[nomeSabor] = valorAtualSabor - 1;
    }
    $(`coletivo-qtd-sabor-${nomeSabor}`).innerText = coletivoSaboresCaixaTemp[nomeSabor];
    atualizarColetivoStatusModalCaixa();
  }

  function calcularColetivoPrecoCaixaTemp() {
    let temGourmet = false;
    for (const [nomeSabor, qtd] of Object.entries(coletivoSaboresCaixaTemp)) {
      if (qtd > 0) {
        const prod = produtosCardapio.find(p => p.name.toLowerCase() === nomeSabor.toLowerCase());
        if (prod && prod.price > 10) { temGourmet = true; break; }
      }
    }
    return temGourmet ? 65.00 : 55.00;
  }

  function atualizarColetivoStatusModalCaixa() {
    let totalAtual = Object.values(coletivoSaboresCaixaTemp).reduce((a, b) => a + b, 0);
    $('coletivo-flavor-count-status').innerText = `Restantes: ${6 - totalAtual}`;
    $('coletivo-flavor-price-preview').innerText = `Preço: R$ ${calcularColetivoPrecoCaixaTemp().toFixed(2)}`;
  }

  function fecharColetivoModalCaixa() {
    $('coletivo-modal-overlay').classList.remove('open');
    if (coletivoAlvoAtual) { renderizarColaboradoresColetivo(); coletivoAlvoAtual = null; }
  }

  function confirmarColetivoCaixaMista() {
    let totalAtual = Object.values(coletivoSaboresCaixaTemp).reduce((a, b) => a + b, 0);
    if (totalAtual !== 6) { alert("⚠️ Escolha exatamente 6 sabores!"); return; }
    let obsSabores = Object.entries(coletivoSaboresCaixaTemp).filter(([nome, qtd]) => qtd > 0).map(([nome, qtd]) => `${qtd}x ${nome}`).join(', ');
    let precoCaixa = calcularColetivoPrecoCaixaTemp();

    if (coletivoAlvoAtual) {
      const { collabIndex, itemIndex } = coletivoAlvoAtual;
      colaboradoresColetivo[collabIndex].itens[itemIndex].produtoId = 'caixa_mista';
      colaboradoresColetivo[collabIndex].itens[itemIndex].obs = `Sabores: ${obsSabores}`;
      colaboradoresColetivo[collabIndex].itens[itemIndex].precoPersonalizado = precoCaixa;
    }
    $('coletivo-modal-overlay').classList.remove('open');
    coletivoAlvoAtual = null;
    renderizarColaboradoresColetivo();
  }

  function renderizarColaboradoresColetivo() {
    const container = $('coletivo-colaboradores-container');
    if (!container) return;
    container.innerHTML = '';
    const produtosFestival = obterProdutosValidosFestival();

    colaboradoresColetivo.forEach((collab, collabIndex) => {
      let itensHtml = '';
      let totalCollab = 0;

      collab.itens.forEach((item, itemIndex) => {
        const prod = produtosCardapio.find(p => p.id === item.produtoId);
        const precoUnit = item.precoPersonalizado !== undefined ? item.precoPersonalizado : (prod ? prod.price : 0);
        totalCollab += precoUnit * (parseInt(item.quantidade) || 0);

        itensHtml += `
          <div class="item-collab-row">
            <select class="cart-input" style="padding: 8px; font-size: 0.85rem;" onchange="atualizarItemCollab(${collabIndex}, ${itemIndex}, 'produtoId', this.value)">
              ${produtosFestival.map(p => `<option value="${p.id}" ${p.id === item.produtoId ? 'selected' : ''}>${p.name} (R$ ${p.price.toFixed(2)})</option>`).join('')}
              <option value="caixa_mista" ${item.produtoId === 'caixa_mista' ? 'selected' : ''}>Caixa Mista de Morangos (R$ 55/65)</option>
            </select>
            <input type="number" class="admin-input-qtd" style="padding: 6px; width: 100%;" value="${item.quantidade}" min="1" oninput="atualizarItemCollab(${collabIndex}, ${itemIndex}, 'quantidade', this.value)">
            <span style="color: var(--ouro); font-weight: bold; font-size: 0.85rem;">R$ ${(precoUnit * item.quantidade).toFixed(2)}</span>
            <button class="btn-sm btn-delete" type="button" onclick="removerItemColaborador(${collabIndex}, ${itemIndex})">×</button>
          </div>
          ${item.obs ? `<div style="font-size:0.75rem; color:var(--ouro); margin-bottom:6px;"><i class="fa-solid fa-check"> ${item.obs}</i></div>` : ''}
        `;
      });

      container.innerHTML += `
        <div class="colaborador-card">
          <div class="colaborador-header">
            <h4>Colaborador #${collabIndex + 1}</h4>
            ${colaboradoresColetivo.length > 1 ? `<button class="btn-sm btn-delete" type="button" onclick="removerColaborador(${collabIndex})">Remover</button>` : ''}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div>
              <label style="font-size: 0.72rem; color: var(--creme-dim);">Nome:</label>
              <input type="text" class="cart-input" style="padding: 8px;" placeholder="Nome" value="${collab.nome || collab.name || ''}" oninput="atualizarColaboradorCampo(${collabIndex}, 'nome', this.value)">
            </div>
            <div>
              <label style="font-size: 0.72rem; color: var(--creme-dim);">Observação:</label>
              <input type="text" class="cart-input" style="padding: 8px;" placeholder="Obs" value="${collab.obs || ''}" oninput="atualizarColaboradorCampo(${collabIndex}, 'obs', this.value)">
            </div>
          </div>
          <div style="margin-bottom: 8px;">${itensHtml}</div>
          <button class="btn-sm" type="button" onclick="adicionarItemColaborador(${collabIndex})" style="background: rgba(247,234,217,0.1); color: var(--creme); margin-bottom: 10px;">+ Adicionar item</button>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; border-top: 1px dashed var(--line); pt: 8px;">
            <span>Subtotal:</span>
            <span style="color: var(--ouro); font-weight: bold;" id="collab-total-${collabIndex}">R$ ${totalCollab.toFixed(2)}</span>
          </div>
        </div>
      `;
    });
    calcularTotaisColetivo();
  }

  function calcularTotaisColetivo() {
    let totalGeral = 0;
    colaboradoresColetivo.forEach((collab, collabIndex) => {
      let totalCollab = 0;
      collab.itens.forEach(item => {
        const prod = produtosCardapio.find(p => p.id === item.produtoId);
        const precoUnit = item.precoPersonalizado !== undefined ? item.precoPersonalizado : (prod ? prod.price : 0);
        totalCollab += precoUnit * (parseInt(item.quantidade) || 0);
      });
      const el = $(`collab-total-${collabIndex}`);
      if (el) el.innerText = totalCollab.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      totalGeral += totalCollab;
    });

    const subtotalEl = $('coletivo-subtotal');
    if (subtotalEl) subtotalEl.innerText = totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const frete = calcularFreteColetivo(totalGeral);
    const freteEl = $('coletivo-frete-valor');
    if (freteEl) freteEl.innerText = formatarFreteColetivo(frete, totalGeral);

    const totalGeralEl = $('coletivo-total-geral');
    if (totalGeralEl) totalGeralEl.innerText = (totalGeral + frete).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function confirmarPedidoColetivo() {
    const respNome = $('coletivo-resp-nome').value.trim();
    const respZap = $('coletivo-resp-zap').value.trim();
    const respData = $('coletivo-resp-data').value;
    const cep = $('coletivo-cep')?.value.trim() || '';
    const rua = $('coletivo-rua')?.value.trim() || '';
    const numero = $('coletivo-numero')?.value.trim() || '';
    const complemento = $('coletivo-complemento')?.value.trim() || '';
    const bairro = $('coletivo-bairro')?.value.trim() || '';

    if (!respNome || !respZap || !respData || (!pedidoColetivoManual && !coletivoEditandoTemp && !cep) || !rua || !numero || !bairro) { alert('Preencha todos os dados do responsável e do endereço.'); return; }
    if (!pedidoColetivoManual && !coletivoEditandoTemp && respData < obterDataMinimaColetivo()) {
      alert('Pedidos coletivos precisam ser feitos com pelo menos 2 dias de antecedência.');
      return;
    }

    const totalGeral = obterTotalPedidoColetivo();
    const fretePedido = calcularFreteColetivo(totalGeral);
    const totalFinal = totalGeral + fretePedido;
    const enderecoCompleto = `${rua}, ${numero}${complemento ? `, ${complemento}` : ''} - ${bairro}`;

    let partes = respData.split('-');
    let dataFormatadaBr = `${partes[2]}/${partes[1]}/${partes[0]}`;
    
    if (coletivoEditandoTemp) {
      coletivoEditandoTemp.responsavel_nome = respNome;
      coletivoEditandoTemp.responsavel_whatsapp = respZap;
      coletivoEditandoTemp.data_encomenda = dataFormatadaBr;
      coletivoEditandoTemp.endereco = enderecoCompleto;
      coletivoEditandoTemp.colaboradores = colaboradoresColetivo;
      coletivoEditandoTemp.total = totalFinal;

      const { error } = await db.from(DB_TABLES.PEDIDOS_COLETIVOS).update({
        responsavel_nome: respNome,
        responsavel_whatsapp: respZap,
        data_encomenda: dataFormatadaBr,
        endereco: enderecoCompleto,
        colaboradores: colaboradoresColetivo,
        total: totalFinal
      }).eq('id_coletivo', coletivoEditandoTemp.id_coletivo);

      if (error) { alert("Erro ao atualizar pedido coletivo: " + error.message); return; }
      alert("Pedido coletivo atualizado com sucesso!");
      coletivoEditandoTemp = null;
      fecharModalPedidoColetivo();
      carregarListaColetivosAdmin();
      atualizarMetricasOverview();
      return;
    }

    const coletivoId = 'collab_' + Date.now();
    const novoColetivoSupabase = {
      id_coletivo: coletivoId,
      responsavel_nome: respNome,
      responsavel_whatsapp: respZap,
      data_encomenda: dataFormatadaBr,
      endereco: enderecoCompleto,
      colaboradores: colaboradoresColetivo,
      total: totalFinal,
      status: 'aguardando',
      data: new Date().toLocaleDateString('pt-BR')
    };

    const { error } = await db.from(DB_TABLES.PEDIDOS_COLETIVOS).insert([novoColetivoSupabase]);
    if (error) { alert("Erro: " + error.message); return; }

    const manual = pedidoColetivoManual;
    fecharModalPedidoColetivo();
    if (manual) {
      await carregarListaColetivosAdmin();
      atualizarMetricasOverview();
      alert('Pedido coletivo manual salvo com sucesso!');
      return;
    }
    let txt = `Olá! Sou *${respNome}* e envio um *Pedido Coletivo*:\n\n📅 *Data:* ${dataFormatadaBr}\n📍 *Endereço:* ${enderecoCompleto}\n\n`;
    if (fretePedido > 0) txt += `🚚 *Frete:* ${fretePedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
    colaboradoresColetivo.forEach(c => {
      txt += `👤 *Colaborador: ${c.nome || c.name || 'Participante'}*:\n`;
      c.itens.forEach(i => {
        const p = produtosCardapio.find(prod => prod.id === i.produtoId);
        txt += `   - ${i.quantidade}x ${p ? p.name : ''} ${i.obs ? '('+i.obs+')' : ''}\n`;
      });
      txt += `\n`;
    });
    txt += `*TOTAL GERAL: ${totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*`;

    abrirWhatsApp(APP_CONFIG.whatsapp, txt);
    carregarColetivosNuvem();
    atualizarMetricasOverview();
  }

  async function carregarListaColetivosAdmin() {
    await carregarColetivosNuvem();
    const container = $('lista-coletivos-admin');
    if (!container) return;
    container.innerHTML = '';
    if (listaColetivos.length === 0) { container.innerHTML = `<p style="color: var(--creme-dim); font-style: italic;">Nenhum pedido coletivo.</p>`; return; }

    [...listaColetivos].reverse().forEach(col => {
      let collabDesc = '';
      if (col.colaboradores && Array.isArray(col.colaboradores)) {
        col.colaboradores.forEach(c => {
          let totalCollab = 0;
          let itensCollabStr = c.itens.map(i => {
            const p = produtosCardapio.find(prod => prod.id === i.produtoId);
            const precoUnit = i.precoPersonalizado !== undefined ? i.precoPersonalizado : (p ? p.price : 0);
            totalCollab += precoUnit * (parseInt(i.quantidade) || 1);
            return `${i.quantidade}x ${p ? p.name : ''} ${i.obs ? '('+i.obs+')' : ''}`;
          }).join(', ');

          collabDesc += `<div style="margin-top: 6px; border-left: 2px solid var(--ouro); padding-left: 8px;"><b>${c.name || c.nome || 'Colaborador'}</b>: ${itensCollabStr} <span style="color: var(--ouro); margin-left: 6px;">(Subtotal: ${totalCollab.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span></div>`;
        });
      }

      let badgeClass = col.status === 'aguardando' ? 'status-aguardando' : (col.status === 'preparo' ? 'status-preparo' : 'status-pronto');
      let statusLabel = col.status === 'aguardando' ? 'Aguardando' : (col.status === 'preparo' ? 'Preparo' : 'Pronto');

      container.innerHTML += `
        <div class="pedido-card-admin" id="coletivo-admin-${col.id_coletivo}">
          <div class="pedido-info" style="flex: 1;">
            <h4>👥 Responsável: ${col.responsavel_nome} (${col.responsavel_whatsapp}) <span class="badge-status ${badgeClass}">${statusLabel}</span></h4>
            <p>📅 <b>Data:</b> ${col.data_encomenda || 'N/A'}</p>
            <p>📍 <b>Endereço:</b> ${col.endereco}</p>
            <div style="margin-top: 8px; font-size: 0.85rem;">${collabDesc}</div>
            <p style="margin-top: 10px; color: var(--ouro); font-weight: bold;">Total: ${Number(col.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <button class="btn-sm" style="background: var(--ouro); color: var(--carvao);" onclick="abrirModalDetalhesColetivo('${col.id_coletivo}')">📦 Ver Itens / Check</button>
            <button class="btn-sm" style="background: #9b59b6; color: white;" onclick="abrirModalEditarColetivo('${col.id_coletivo}')">✏️ Editar</button>
            <button class="btn-sm" style="background: #25d366; color: white;" onclick="reenviarPedidoColetivoWhatsapp('${col.id_coletivo}')">💬 Reenviar</button>
            <button class="btn-sm" style="background: #f39c12; color: #170a0d;" onclick="alterarStatusColetivo('${col.id_coletivo}', 'aguardando')">Aguardando</button>
            <button class="btn-sm" style="background: #3498db; color: white;" onclick="alterarStatusColetivo('${col.id_coletivo}', 'preparo')">Preparo</button>
            <button class="btn-sm" style="background: #2ecc71; color: #170a0d;" onclick="alterarStatusColetivo('${col.id_coletivo}', 'pronto')">Pronto</button>
            <button class="btn-sm btn-delete" onclick="deletarColetivo('${col.id_coletivo}')">Excluir</button>
          </div>
        </div>
      `;
    });
  }

  function abrirModalDetalhesColetivo(idColetivo) {
    coletivoDetalheAtualId = idColetivo;
    $('filtro-itens-coletivo').value = '';
    renderizarItensDetalhesColetivoModal();
    $('modal-detalhes-coletivo').classList.add('open');
  }

  function renderizarItensDetalhesColetivoModal() {
    const col = listaColetivos.find(c => c.id_coletivo === coletivoDetalheAtualId);
    if (!col) return;
    
    $('modal-detalhes-coletivo-titulo').innerText = `Pedido Coletivo: ${col.responsavel_nome}`;
    const container = $('modal-detalhes-coletivo-itens-container');
    const filtro = $('filtro-itens-coletivo').value.toLowerCase().trim();
    container.innerHTML = '';

    let itensRenderizados = 0;

    if (col.colaboradores && Array.isArray(col.colaboradores)) {
      col.colaboradores.forEach((c, cIdx) => {
        const nomeCollab = c.name || c.nome || 'Colaborador';
        
        let htmlItensCollab = '';
        c.itens.forEach((i, iIdx) => {
          const prod = produtosCardapio.find(p => p.id === i.produtoId);
          const nomeItem = prod ? prod.name : 'Item';
          const textoBusca = `${nomeCollab} ${nomeItem} ${i.obs || ''}`.toLowerCase();

          if (!filtro || textoBusca.includes(filtro)) {
            itensRenderizados++;
            const precoUnit = i.precoPersonalizado !== undefined ? i.precoPersonalizado : (prod ? prod.price : 0);
            const estaFeito = i.feito === true;

            htmlItensCollab += `
              <div style="display: flex; justify-content: space-between; align-items: center; background: ${estaFeito ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255,255,255,0.03)'}; border: 1px solid var(--line); padding: 10px 12px; border-radius: 10px; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <input type="checkbox" ${estaFeito ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #2ecc71; cursor: pointer;" onchange="alternarItemFeitoColetivoModal('${col.id_coletivo}', ${cIdx}, ${iIdx}, this.checked)">
                  <div>
                    <div style="font-weight: 600; color: var(--creme); font-size: 0.9rem;">${i.quantidade}x ${nomeItem}</div>
                    ${i.obs ? `<small style="color: var(--ouro);">${i.obs}</small>` : ''}
                  </div>
                </div>
                <span style="color: var(--ouro); font-weight: bold; font-size: 0.85rem;">R$ ${(precoUnit * i.quantidade).toFixed(2)}</span>
              </div>
            `;
          }
        });

        if (htmlItensCollab) {
          container.innerHTML += `<div style="color: var(--ouro); font-weight: bold; margin: 10px 0 4px 0; font-size: 0.9rem;">👤 ${nomeCollab}</div>` + htmlItensCollab;
        }
      });
    }

    if (itensRenderizados === 0) {
      container.innerHTML = `<p style="text-align: center; color: var(--creme-dim); padding: 20px;">Nenhum item encontrado com esse filtro.</p>`;
    }
  }

  function filtrarItensDetalhesColetivo() {
    renderizarItensDetalhesColetivoModal();
  }

  function fecharModalDetalhesColetivo() {
    $('modal-detalhes-coletivo').classList.remove('open');
    coletivoDetalheAtualId = null;
  }

  async function alternarItemFeitoColetivoModal(idColetivo, collabIdx, itemIdx, feitoStatus) {
    const col = listaColetivos.find(c => c.id_coletivo === idColetivo);
    if (col && col.colaboradores && col.colaboradores[collabIdx] && col.colaboradores[collabIdx].itens[itemIdx]) {
      col.colaboradores[collabIdx].itens[itemIdx].feito = feitoStatus;
      await db.from(DB_TABLES.PEDIDOS_COLETIVOS).update({ colaboradores: col.colaboradores }).eq('id_coletivo', idColetivo);
      renderizarItensDetalhesColetivoModal();
    }
  }

  function abrirModalEditarColetivo(idColetivo) {
    const col = JSON.parse(JSON.stringify(listaColetivos.find(c => c.id_coletivo === idColetivo)));
    if (!col) return;

    coletivoEditandoTemp = col;
    colaboradoresColetivo = col.colaboradores || [];

    $('coletivo-resp-nome').value = col.responsavel_nome || '';
    $('coletivo-resp-zap').value = col.responsavel_whatsapp || '';
    $('coletivo-cep').value = '';
    $('coletivo-rua').value = '';
    $('coletivo-numero').value = '';
    $('coletivo-complemento').value = '';
    $('coletivo-bairro').value = '';

    if (col.endereco) {
      const enderecoTexto = String(col.endereco);
      const parteRua = enderecoTexto.split(',')[0]?.trim() || '';
      const parteNumero = enderecoTexto.split(',')[1]?.trim() || '';
      const parteBairro = enderecoTexto.split('-').pop()?.trim() || '';
      $('coletivo-rua').value = parteRua || enderecoTexto;
      $('coletivo-numero').value = parteNumero;
      $('coletivo-bairro').value = parteBairro;
    }

    if (col.data_encomenda) {
      let p = col.data_encomenda.split('/');
      if (p.length === 3) {
        $('coletivo-resp-data').value = `${p[2]}-${p[1]}-${p[0]}`;
      }
    }
    $('coletivo-resp-data').min = obterDataMinimaColetivo();

    renderizarColaboradoresColetivo();
    $('modal-pedido-coletivo').classList.add('open');
  }

  function reenviarPedidoColetivoWhatsapp(idColetivo) {
    const col = listaColetivos.find(c => c.id_coletivo === idColetivo);
    if (!col) return;

    let txt = `Olá! Passando para atualizar sobre o seu *Pedido Coletivo* (Resp: *${col.responsavel_nome}*):\n\n📅 *Data:* ${col.data_encomenda}\n📍 *Endereço:* ${col.endereco}\n\n`;
    if (col.colaboradores && Array.isArray(col.colaboradores)) {
      col.colaboradores.forEach(c => {
        txt += `👤 *Colaborador: ${c.name || c.nome || 'Participante'}*:\n`;
        c.itens.forEach(i => {
          const p = produtosCardapio.find(prod => prod.id === i.produtoId);
          txt += `   - ${i.quantidade}x ${p ? p.name : ''} ${i.obs ? '('+i.obs+')' : ''}\n`;
        });
        txt += `\n`;
      });
    }
    txt += `*TOTAL GERAL: ${Number(col.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\nStatus: *${col.status.toUpperCase()}*`;

    let telefone = col.responsavel_whatsapp ? col.responsavel_whatsapp.replace(/\D/g, '') : '';
    if (!telefone.startsWith('55') && telefone.length >= 10) telefone = '55' + telefone;

    abrirWhatsApp(telefone, txt);
  }

  async function alterarStatusColetivo(idColetivo, novoStatus) {
    const col = listaColetivos.find(c => c.id_coletivo === idColetivo);
    if (col) {
      col.status = novoStatus;
      await db.from(DB_TABLES.PEDIDOS_COLETIVOS).update({ status: novoStatus }).eq('id_coletivo', idColetivo);
      carregarListaColetivosAdmin();
      atualizarMetricasOverview();
      if (col.responsavel_whatsapp) {
        let telefoneLimpo = col.responsavel_whatsapp.replace(/\D/g, '');
        if (!telefoneLimpo.startsWith('55')) telefoneLimpo = '55' + telefoneLimpo;
        const saudacao = col.responsavel_nome ? `Olá, *${col.responsavel_nome}*! ` : 'Olá! ';
        let msg = novoStatus === 'aguardando' 
          ? `${saudacao}Recebemos o seu Pedido Coletivo com sucesso. Assim que o pagamento for confirmado, ele entrará em produção! 🤎` 
          : (novoStatus === 'preparo' ? `Seu Pedido Coletivo entrou *Em Preparo* 🤎` : `Seu Pedido Coletivo está *Pronto*! ✨`);
        abrirWhatsApp(telefoneLimpo, msg);
      }
    }
  }

  async function deletarColetivo(id) {
    if (!confirm("Excluir pedido coletivo?")) return;
    await db.from(DB_TABLES.PEDIDOS_COLETIVOS).delete().eq('id_coletivo', id);
    carregarColetivosNuvem();
    carregarListaColetivosAdmin();
    atualizarMetricasOverview();
  }
