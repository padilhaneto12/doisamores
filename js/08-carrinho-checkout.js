
  function addToCart(productId) {
    const produto = produtosCardapio.find(p => p.id === productId);
    if (!produto) return;
    if (productId === 'caixa_mista') { abrirModalCaixaMista(); return; }

    const item = cart.find(i => i.id === productId && !i.obs);
    const qtd = item ? item.quantity : 0;
    if (produto.limite - (produto.vendidos + qtd) <= 0) { alert("Limite atingido!"); return; }

    if (item) item.quantity++;
    else cart.push({ id: produto.id, name: produto.name, price: produto.price, quantity: 1, obs: '', feito: false });
    
    const dataMinimaCarrinho = obterDataMinimaEncomenda();
    const orderDateInput = $('order-date');
    if (orderDateInput) {
      orderDateInput.min = dataMinimaCarrinho;
      if (!orderDateInput.value || orderDateInput.value < dataMinimaCarrinho) {
        orderDateInput.value = dataMinimaCarrinho;
      }
    }

    updateCartUI();
    toggleCart(true);
  }

  async function aplicarCupom() {
    const codigo = $('coupon-code').value.trim().toUpperCase();
    const msgEl = $('coupon-msg');
    if (!codigo) return;
    await carregarCuponsNuvem();
    if (cuponsValidos[codigo]) {
      cupomAplicado = { codigo, ...cuponsValidos[codigo] };
      msgEl.style.display = 'block'; msgEl.style.color = '#2ecc71'; msgEl.innerText = `Cupom aplicado!`;
    } else {
      cupomAplicado = null;
      msgEl.style.display = 'block'; msgEl.style.color = '#e74c3c'; msgEl.innerText = `Cupom inválido.`;
    }
    updateCartUI();
  }

  function abrirModalCaixaMista() {
    saboresCaixaTemp = {};
    const container = $('flavor-list-container');
    container.innerHTML = '';
    const sabores = obterProdutosValidosFestival().filter(p => !p.id.startsWith('espeto_') && p.id !== 'caixa_mista');
    
    sabores.forEach(sab => {
      saboresCaixaTemp[sab.name] = 0;
      const tagGourmet = sab.price > 10 ? ' <span style="color:var(--ouro); font-size:0.75rem; font-weight:bold;">(Gourmet)</span>' : '';
      container.innerHTML += `
        <div class="flavor-option-row">
          <span>${sab.name}${tagGourmet} <small>(R$ ${sab.price.toFixed(2)})</small></span>
          <div class="flavor-counter">
            <button class="flavor-btn" onclick="mudarQtdSaborCaixa('${sab.name}', -1)">-</button>
            <span id="qtd-sabor-${sab.name}" style="width: 24px; text-align: center; font-weight: bold;">0</span>
            <button class="flavor-btn" onclick="mudarQtdSaborCaixa('${sab.name}', 1)">+</button>
          </div>
        </div>
      `;
    });
    atualizarStatusModalCaixa();
    $('custom-modal-overlay').classList.add('open');
  }

  function mudarQtdSaborCaixa(sabor, delta) {
    let total = Object.values(saboresCaixaTemp).reduce((a, b) => a + b, 0);
    if (delta > 0) {
      if (total >= 6) { alert("⚠️ 6 morangos já atingidos!"); return; }
      saboresCaixaTemp[sabor]++;
    } else {
      if (saboresCaixaTemp[sabor] > 0) saboresCaixaTemp[sabor]--;
    }
    $(`qtd-sabor-${sabor}`).innerText = saboresCaixaTemp[sabor];
    atualizarStatusModalCaixa();
  }

  function calcularPrecoCaixaTemp() {
    let temGourmet = false;
    for (const [nome, qtd] of Object.entries(saboresCaixaTemp)) {
      if (qtd > 0) {
        const p = produtosCardapio.find(prod => prod.name.toLowerCase() === nome.toLowerCase());
        if (p && p.price > 10) { temGourmet = true; break; }
      }
    }
    return temGourmet ? 65.00 : 55.00;
  }

  function atualizarStatusModalCaixa() {
    let total = Object.values(saboresCaixaTemp).reduce((a, b) => a + b, 0);
    $('flavor-count-status').innerText = `Restantes: ${6 - total}`;
    $('flavor-price-preview').innerText = `Preço: R$ ${calcularPrecoCaixaTemp().toFixed(2)}`;
  }

  function fecharModalCaixa() { $('custom-modal-overlay').classList.remove('open'); }

  function confirmarCaixaMista() {
    let total = Object.values(saboresCaixaTemp).reduce((a, b) => a + b, 0);
    if (total !== 6) { alert("⚠️ Escolha exatamente 6 sabores!"); return; }
    let obsSabores = Object.entries(saboresCaixaTemp).filter(([n, q]) => q > 0).map(([n, q]) => `${q}x ${n}`).join(', ');
    const prod = produtosCardapio.find(p => p.id === 'caixa_mista');
    
    cart.push({ id: prod.id, name: prod.name, price: calcularPrecoCaixaTemp(), quantity: 1, obs: `Sabores: ${obsSabores}`, saboresDetalhados: { ...saboresCaixaTemp }, feito: false });
    fecharModalCaixa();

    const dataMinimaCarrinho = obterDataMinimaEncomenda();
    const orderDateInput = $('order-date');
    if (orderDateInput) {
      orderDateInput.min = dataMinimaCarrinho;
      if (!orderDateInput.value || orderDateInput.value < dataMinimaCarrinho) {
        orderDateInput.value = dataMinimaCarrinho;
      }
    }

    updateCartUI();
    toggleCart(true);
  }

  function changeQuantity(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    updateCartUI();
  }

  function ehEspeto(item) {
    const produto = produtosCardapio.find(prod => prod.id === item.id);
    return !!produto && String(produto.categoria || '').toLowerCase() === 'espetos';
  }

  function contarEspetos(itens) {
    return itens.reduce((total, item) => total + (ehEspeto(item) ? item.quantity : 0), 0);
  }

  function obterItensComPrecoPromocional(itens) {
    const promocaoAtiva = contarEspetos(itens) > 1;

    return itens.map(item => {
      return { ...item, price: promocaoAtiva && ehEspeto(item) ? 16 : item.price };
    });
  }

  function toggleDeliveryForm() {
    const isEntrega = document.querySelector('input[name="delivery-option"]:checked').value === "Entrega";
    $('address-container').style.display = isEntrega ? 'block' : 'none';
    $('cart-delivery-row').style.display = isEntrega ? 'flex' : 'none';
    $('opt-dinheiro').style.display = isEntrega ? 'none' : 'block';
    if (!isEntrega) taxaEntrega = 0;
    updateCartUI();
  }

  async function buscarCEP() {
    let cep = $('cep').value.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (data.erro) { alert("CEP não encontrado."); return; }
        $('rua').value = data.logradouro;
        $('bairro').value = data.bairro;
        calcularTaxa(data.bairro);
        $('numero').focus();
      } catch(e) {}
    }
  }

  function calcularTaxa(bairro) {
    let matched = false;
    for (const [b, t] of Object.entries(tabelaFrete)) {
      if (bairro.toLowerCase().includes(b.toLowerCase())) { taxaEntrega = t; matched = true; break; }
    }
    if (!matched) taxaEntrega = taxaPadrao;
    $('cart-delivery-value').innerText = taxaEntrega.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    updateCartUI();
  }

  function updateCartUI() {
    const itemsContainer = $('cart-items');
    if (!itemsContainer) return;
    itemsContainer.innerHTML = '';
    let subtotal = 0, totalItems = 0;
    const itensComPreco = obterItensComPrecoPromocional(cart);
    const promocaoEspetosAtiva = contarEspetos(itensComPreco) > 1;

    if (cart.length === 0) {
      itemsContainer.innerHTML = '<p class="cart-empty">Carrinho vazio.</p>';
      $('cart-form').style.display = 'none';
      $('cart-coupon-section').style.display = 'none';
      taxaEntrega = 0; cupomAplicado = null;
    } else {
      $('cart-form').style.display = 'block';
      $('cart-coupon-section').style.display = 'block';
      itensComPreco.forEach((item, index) => {
        subtotal += item.price * item.quantity;
        totalItems += item.quantity;
        const promocaoEspeto = promocaoEspetosAtiva && ehEspeto(item);
        itemsContainer.innerHTML += `
          <div class="cart-item">
            <div class="cart-item-info">
              <h4>${item.name}</h4>
              ${item.obs ? `<small class="cart-item-obs">${item.obs}</small>` : ''}
              <div class="cart-item-price">${(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              ${promocaoEspeto ? '<small style="color:#2ecc71;">Promoção: R$ 16,00 cada</small>' : ''}
            </div>
            <div class="cart-item-controls">
              <button class="cart-btn-qty" onclick="changeQuantity(${index}, -1)">-</button>
              <span>${item.quantity}</span>
              <button class="cart-btn-qty" onclick="changeQuantity(${index}, 1)">+</button>
            </div>
          </div>
        `;
      });
    }

    let desconto = 0;
    if (cupomAplicado) {
      desconto = cupomAplicado.tipo === 'percentual' ? (subtotal * cupomAplicado.valor) / 100 : cupomAplicado.valor;
      if (desconto > subtotal) desconto = subtotal;
      $('cart-discount-row').style.display = 'flex';
      $('cart-discount-value').innerText = `- ${desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
      $('coupon-name-display').innerText = cupomAplicado.codigo;
    } else {
      $('cart-discount-row').style.display = 'none';
    }

    let final = (subtotal - desconto) + taxaEntrega;
    $('cart-subtotal-value').innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    $('cart-total-value').innerText = final.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const badge = $('cart-badge');
    badge.innerText = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
  }

  function toggleCart(open) {
    $('cart-sidebar').classList.toggle('open', open);
    $('cart-overlay').classList.toggle('open', open);
  }

  function resetCart() {
    cart = []; taxaEntrega = 0; cupomAplicado = null;
    $('customer-name').value = '';
    $('customer-whatsapp').value = '';
    $('cart-items').style.display = 'block';
    $('cart-form').style.display = 'block';
    $('cart-footer').style.display = 'block';
    $('cart-success').style.display = 'none';
    updateCartUI();
    toggleCart(false);
  }

  function checkoutWhatsapp() {
    const customerName = $('customer-name').value.trim();
    const customerWhatsapp = $('customer-whatsapp').value.trim();
    const orderDateInput = $('order-date').value;
    const paymentMethod = $('payment-method').value;
    const deliveryOptionEl = document.querySelector('input[name="delivery-option"]:checked');
    const deliveryOption = deliveryOptionEl ? deliveryOptionEl.value : 'Retirada';

    if (!customerName || !customerWhatsapp) { alert("Preencha nome e WhatsApp."); return; }
    if (cart.length === 0) { alert("Seu carrinho está vazio."); return; }

    if (deliveryOption === "Entrega") {
      const rua = $('rua').value;
      const numero = $('numero').value;
      if (!rua || !numero) { alert("Preencha endereço completo."); return; }
    }

    let dataExibicao = 'Hoje';
    if (orderDateInput) {
      const partes = orderDateInput.split('-');
      if (partes.length === 3) {
        dataExibicao = `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
    }

    const itensComPreco = obterItensComPrecoPromocional(cart);
    let subtotal = itensComPreco.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    let desconto = cupomAplicado ? (cupomAplicado.tipo === 'percentual' ? (subtotal * cupomAplicado.valor)/100 : cupomAplicado.valor) : 0;
    if (desconto > subtotal) desconto = subtotal;
    const valorFinal = (subtotal - desconto) + taxaEntrega;

    const confirmDataValor = $('confirm-data-valor');
    if (confirmDataValor) confirmDataValor.innerText = dataExibicao;

    const itensHtml = itensComPreco.map(i => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="color:var(--creme);font-size:0.9rem;">
          <span style="color:var(--ouro);font-weight:bold;">${i.quantity}x</span> ${i.name}
          ${i.obs ? `<div style="font-size:0.75rem;color:var(--creme-dim);margin-top:2px;">${i.obs}</div>` : ''}
        </div>
        <span style="color:var(--ouro);font-size:0.88rem;font-weight:600;white-space:nowrap;margin-left:10px;">
          ${(i.price * i.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>
    `).join('');
    const confirmPedidoItens = $('confirm-pedido-itens');
    if (confirmPedidoItens) confirmPedidoItens.innerHTML = itensHtml;

    const descontoRow = $('confirm-pedido-desconto');
    if (cupomAplicado && desconto > 0) {
      if (descontoRow) descontoRow.style.display = 'flex';
      const confirmDescontoValor = $('confirm-desconto-valor');
      if (confirmDescontoValor) confirmDescontoValor.innerText = `- ${desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    } else if (descontoRow) {
      descontoRow.style.display = 'none';
    }

    const freteRow = $('confirm-pedido-frete');
    if (taxaEntrega > 0) {
      if (freteRow) freteRow.style.display = 'flex';
      const confirmFreteValor = $('confirm-frete-valor');
      if (confirmFreteValor) confirmFreteValor.innerText = taxaEntrega.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else if (freteRow) {
      freteRow.style.display = 'none';
    }

    const confirmTotalValor = $('confirm-total-valor');
    if (confirmTotalValor) confirmTotalValor.innerText = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let entregaInfo = `<b>👤 ${customerName}</b> · ${paymentMethod}`;
    if (deliveryOption === 'Entrega') {
      const rua = $('rua').value;
      const numero = $('numero').value;
      const bairro = $('bairro').value;
      entregaInfo += `<br>🛵 Entrega: ${rua}, ${numero} - ${bairro}`;
    } else {
      entregaInfo += `<br>📍 Retirada no Local`;
    }
    const confirmEntrega = $('confirm-pedido-entrega');
    if (confirmEntrega) confirmEntrega.innerHTML = entregaInfo;

    const modalConfirmacao = $('modal-confirmar-pedido');
    if (modalConfirmacao) modalConfirmacao.classList.add('open');
  }

  function fecharModalConfirmacao() {
    const modalConfirmacao = $('modal-confirmar-pedido');
    if (modalConfirmacao) modalConfirmacao.classList.remove('open');
  }

  async function confirmarEEnviarWhatsapp() {
    fecharModalConfirmacao();

    const customerName = $('customer-name').value.trim();
    const customerWhatsapp = $('customer-whatsapp').value.trim();
    const orderDateInput = $('order-date').value;
    const paymentMethod = $('payment-method').value;
    const deliveryOption = document.querySelector('input[name="delivery-option"]:checked').value;
    const deliveryObs = $('delivery-obs').value.trim();

    let enderecoCompleto = "Retirada no Local";
    if (deliveryOption === "Entrega") {
      const rua = $('rua').value;
      const numero = $('numero').value;
      const bairro = $('bairro').value;
      enderecoCompleto = `${rua}, ${numero} - ${bairro}`;
    }

    for (const item of cart) {
      const p = produtosCardapio.find(prod => prod.id === item.id);
      if (p) { p.vendidos += item.quantity; await atualizarEstoqueSupabase(p.id, p.vendidos); }
    }

    const itensPedido = obterItensComPrecoPromocional(cart);
    let subtotal = itensPedido.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    let desconto = cupomAplicado ? (cupomAplicado.tipo === 'percentual' ? (subtotal * cupomAplicado.valor)/100 : cupomAplicado.valor) : 0;
    const valorFinal = (subtotal - desconto) + taxaEntrega;
    const pedidoId = 'ped_' + Date.now();

    let dataFormatadaBr = new Date().toLocaleDateString('pt-BR');
    if (orderDateInput) {
      const partes = orderDateInput.split('-');
      if (partes.length === 3) {
        dataFormatadaBr = `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
    }

    const novoPedido = {
      id_pedido: pedidoId, 
      data: dataFormatadaBr, 
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      cliente: customerName, 
      whatsapp: customerWhatsapp, 
      itens: itensPedido, 
      total: valorFinal,
      pagamento: paymentMethod, 
      entrega: deliveryOption, 
      obs_entrega: deliveryObs,
      status: 'aguardando', 
      endereco: enderecoCompleto, 
      frete: taxaEntrega,
      data_agendada: orderDateInput
    };

    // Salvar no Supabase
    const { error } = await db.from(DB_TABLES.PEDIDOS).insert([novoPedido]);
    if (error) {
      console.error("Erro ao salvar no Supabase:", error);
      alert("Houve um erro ao registrar o pedido no banco de dados: " + error.message);
      return;
    }

    // Enviar dados para o Webhook do Make
    try {
      await fetch('https://hook.us2.make.com/4lck6fxuqinr87pjf0cw4taz1er21ev1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_pedido: pedidoId,
          cliente: customerName,
          whatsapp: customerWhatsapp,
          itens: itensPedido,
          subtotal: subtotal,
          desconto: desconto,
          frete: taxaEntrega,
          total: valorFinal,
          pagamento: paymentMethod,
          entrega: deliveryOption,
          endereco: enderecoCompleto,
          data_agendada: orderDateInput,
          observacao: deliveryObs
        })
      });
    } catch (err) {
      console.error("Erro ao enviar para o Make Webhook:", err);
    }

    carregarCardapioNuvem();
    atualizarMetricasOverview();

    let text = `Oi! Sou *${customerName}* e fiz o pedido para o dia *${dataFormatadaBr}*:\n\n`;
    const promocaoEspetosAtiva = contarEspetos(itensPedido) > 1;
    itensPedido.forEach(i => {
      const infoPreco = promocaoEspetosAtiva && ehEspeto(i)
        ? ` — R$ 16,00 cada, total ${ (i.price * i.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }`
        : '';
      text += `- ${i.quantity}x ${i.name}${i.obs ? ' ('+i.obs+')' : ''}${infoPreco}\n`;
    });
    if (taxaEntrega > 0) text += `- Taxa de Entrega: R$ ${taxaEntrega.toFixed(2)}\n`;
    text += `\n*TOTAL: ${valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\nPagamento: ${paymentMethod}`;

    abrirWhatsApp(APP_CONFIG.whatsapp, text);
    $('cart-items').style.display = 'none';
    $('cart-form').style.display = 'none';
    $('cart-footer').style.display = 'none';
    $('cart-success').style.display = 'flex';
  }
