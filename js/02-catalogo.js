  async function carregarCardapioNuvem() {
    await carregarFestivalNuvem();
    await carregarSobremesasNuvem();
  }

  async function carregarFestivalNuvem() {
    const { data, error } = await db.from(DB_TABLES.PRODUTOS).select('*').not('categoria', 'ilike', 'Docinho%').neq('categoria', 'sobremesa');
    if (error) return;

    data.sort((a, b) => a.name.localeCompare(b.name));

    produtosCardapio = data.map(p => ({
      ...p,
      categoria: p.categoria === 'festival' ? 'Tradicionais' : p.categoria,
      image: p.image_url || imagensLocaisFallback[p.id] || 'images/amor.jpeg'
    }));

    renderizarNovidades();
    renderizarMenuCategorizado();
  }

  async function carregarSobremesasNuvem() {
    const { data, error } = await db.from(DB_TABLES.PRODUTOS).select('*').eq('categoria', 'sobremesa');
    if (error) return;

    data.sort((a, b) => a.name.localeCompare(b.name));
    renderizarSobremesas(data.map(p => ({ ...p, image: p.image_url || 'images/amor.jpeg' })));
  }

  async function carregarPedidosNuvem() {
    const { data, error } = await db.from(DB_TABLES.PEDIDOS).select('*');
    if (!error && data) {
      listaPedidos = data.map(p => ({
        id: p.id_pedido, data: p.data || '', hora: p.hora, cliente: p.cliente,
        whatsapp: p.whatsapp || '', email: p.email || '', itens: p.itens, total: p.total, pagamento: p.pagamento,
        entrega: p.entrega, obsEntrega: p.obs_entrega, status: p.status,
        dataAgendada: p.data_agendada || '', endereco: p.endereco || '', frete: p.frete !== undefined ? Number(p.frete) : 0
      }));
      atualizarMetricasOverview();
    }
  }

  async function carregarColetivosNuvem() {
    const { data, error } = await db.from(DB_TABLES.PEDIDOS_COLETIVOS).select('*');
    if (!error && data) {
      listaColetivos = data;
      atualizarMetricasOverview();
    }
  }

  async function carregarCuponsNuvem() {
    const { data, error } = await db.from(DB_TABLES.CUPONS).select('*');
    if (!error && data) {
      cuponsValidos = {};
      data.forEach(c => { cuponsValidos[c.codigo] = { tipo: c.tipo, valor: Number(c.valor) }; });
    }
  }

  function atualizarMetricasOverview() {
    let faturamentoMes = 0;
    let faturamentoDia = 0;
    let todosOsPedidosOverview = [...listaPedidos];
    
    listaColetivos.forEach(col => {
      let itensCollabFormatados = [];
      if (col.colaboradores && Array.isArray(col.colaboradores)) {
        col.colaboradores.forEach(c => {
          c.itens.forEach(i => {
            const prod = produtosCardapio.find(p => p.id === i.produtoId);
            const precoItem = i.precoPersonalizado !== undefined ? Number(i.precoPersonalizado) : (prod ? prod.price : 0);
            itensCollabFormatados.push({
              name: (prod ? prod.name : 'Item Coletivo') + ` (${c.name || c.nome})`,
              price: precoItem,
              quantity: parseInt(i.quantidade) || 1,
              obs: i.obs || c.obs || ''
            });
          });
        });
      }

      let dataAgendadaColetivo = '';
      if (col.data_encomenda) {
        const partesDataColetivo = String(col.data_encomenda).split('/');
        if (partesDataColetivo.length === 3) {
          dataAgendadaColetivo = `${partesDataColetivo[2]}-${partesDataColetivo[1]}-${partesDataColetivo[0]}`;
        }
      }

      todosOsPedidosOverview.push({
        id: col.id_coletivo, data: col.data || new Date().toLocaleDateString('pt-BR'),
        hora: '', cliente: `${col.responsavel_nome} (Coletivo 👥)`,
        whatsapp: col.responsavel_whatsapp, itens: itensCollabFormatados,
        total: Number(col.total) || 0, pagamento: 'Combinado Coletivo',
        entrega: 'Entrega Coletiva', status: col.status || 'aguardando',
        dataAgendada: dataAgendadaColetivo, endereco: col.endereco
      });
    });

    let totalPedidos = todosOsPedidosOverview.length;
    let somaTotalValores = 0;
    let pedidosPendentes = 0;
    
    const hojeObj = new Date();
    const hojeStr = hojeObj.toLocaleDateString('pt-BR');
    const mesAtual = hojeObj.getMonth();
    const anoAtual = hojeObj.getFullYear();

    todosOsPedidosOverview.forEach(p => {
      let valor = Number(p.total) || 0;
      somaTotalValores += valor;
      if (p.status === 'aguardando' || p.status === 'preparo') pedidosPendentes++;
      
      let dataStrParaValidar = p.dataAgendada || p.data;
      if (dataStrParaValidar) {
        let dMes, dAno;
        if (dataStrParaValidar.includes('-')) {
          let partesIso = dataStrParaValidar.split('-');
          dAno = parseInt(partesIso[0]);
          dMes = parseInt(partesIso[1]) - 1;
        } else if (dataStrParaValidar.includes('/')) {
          let partesBr = dataStrParaValidar.split('/');
          if (partesBr.length === 3) {
            dMes = parseInt(partesBr[1]) - 1;
            dAno = parseInt(partesBr[2]);
          }
        }
        if (dMes === mesAtual && dAno === anoAtual) {
          faturamentoMes += valor;
        }
      }

      if (p.data === hojeStr || p.dataAgendada === hojeObj.toISOString().split('T')[0]) {
        faturamentoDia += valor;
      }
    });

    let ticketMedio = totalPedidos > 0 ? (somaTotalValores / totalPedidos) : 0;

    $('stat-vendas-mes').innerText = faturamentoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    $('stat-vendas-dia').innerText = faturamentoDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    $('stat-ticket-medio').innerText = ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    $('stat-pedidos-pendentes').innerText = pedidosPendentes;
    const statColetivos = $('stat-coletivos-total');
    if (statColetivos) statColetivos.innerText = listaColetivos.length;

    const ultimosContainer = $('overview-ultimos-pedidos');
    if (ultimosContainer) {
      if (todosOsPedidosOverview.length === 0) {
        ultimosContainer.innerHTML = `<p style="color: var(--creme-dim); font-style: italic; font-size: 0.9rem;">Nenhum pedido registrado ainda.</p>`;
      } else {
        const pedidosParaExibir = filtroOverviewAtual === 'coletivos'
          ? todosOsPedidosOverview.filter(p => String(p.id || '').startsWith('collab_'))
          : filtroOverviewAtual === 'individuais'
            ? todosOsPedidosOverview.filter(p => !String(p.id || '').startsWith('collab_'))
            : todosOsPedidosOverview;

        let ordenados = [...pedidosParaExibir].sort((a, b) => {
          const dataA = String(a.dataAgendada || a.data || '');
          const dataB = String(b.dataAgendada || b.data || '');
          if (dataA !== dataB) return dataB.localeCompare(dataA);
          return String(b.id || '').localeCompare(String(a.id || ''));
        });
        let ultimos = ordenados.slice(0, 4);

        ultimosContainer.innerHTML = ultimos.length === 0
          ? `<p style="color: var(--creme-dim); font-style: italic; font-size: 0.9rem;">Nenhum pedido encontrado neste filtro.</p>`
          : ultimos.map(p => {
              const ehColetivo = String(p.id || '').startsWith('collab_');
              const dataExibicao = p.dataAgendada || p.data || '';
              const horaExibicao = p.hora ? ` às ${p.hora}` : '';
              return `
                <div onclick="irParaPedidoNoAdmin('${p.id}')" style="background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: 10px; border: 1px solid ${ehColetivo ? 'rgba(201,151,74,0.45)' : 'var(--line)'}; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: border-color 0.2s;" title="Clique para abrir este pedido">
                  <div>
                    <b style="color: var(--creme); font-size: 0.9rem;">${p.cliente}</b>
                    <div style="font-size: 0.78rem; color: var(--creme-dim);">
                      ${ehColetivo ? '👥 Pedido Coletivo · ' : ''}${dataExibicao}${horaExibicao}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <span style="color: var(--ouro); font-weight: bold; font-size: 0.9rem;">${Number(p.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <div style="font-size: 0.72rem; text-transform: uppercase; color: ${p.status === 'pronto' ? '#2ecc71' : '#f39c12'}; font-weight: bold;">${p.status || 'aguardando'}</div>
                  </div>
                </div>
              `;
            }).join('');
      }
    }

    const destaquesContainer = $('overview-destaques-produtos');
    if (destaquesContainer) {
      const contadorVendasAcumulado = {};
      todosOsPedidosOverview.forEach(p => {
        if (p.itens && Array.isArray(p.itens)) {
          p.itens.forEach(item => {
            if (item.id === 'taxa_entrega') return;
            let nomeItemLimpo = item.name.split(' (')[0].trim();
            contadorVendasAcumulado[nomeItemLimpo] = (contadorVendasAcumulado[nomeItemLimpo] || 0) + (item.quantity || 1);
          });
        }
      });

      const listaRanked = produtosCardapio.map(prod => {
        let vendasHistoricas = (prod.vendidos || 0) + (contadorVendasAcumulado[prod.name] || 0);
        return { name: prod.name, image: prod.image, vendidos: vendasHistoricas };
      });

      listaRanked.sort((a, b) => b.vendidos - a.vendidos);
      let topProdutos = listaRanked.slice(0, 4);

      if (topProdutos.length === 0 || topProdutos.every(p => p.vendidos === 0)) {
        destaquesContainer.innerHTML = `<p style="color: var(--creme-dim); font-style: italic; font-size: 0.9rem;">Nenhuma venda registrada ainda.</p>`;
      } else {
        destaquesContainer.innerHTML = topProdutos.map(prod => `
          <div style="background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--line); margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${prod.image}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;">
              <span style="color: var(--creme); font-size: 0.88rem; font-weight: 600;">${prod.name}</span>
            </div>
            <span style="color: var(--ouro); font-size: 0.82rem; font-weight: bold;">Vendidos: ${prod.vendidos}</span>
          </div>
        `).join('');
      }
    }
  }

  function filtrarOverviewTipo(tipo) {
    filtroOverviewAtual = tipo;

    const botoes = {
      todos: $('btn-filtro-ov-todos'),
      individuais: $('btn-filtro-ov-indiv'),
      coletivos: $('btn-filtro-ov-colet')
    };

    Object.entries(botoes).forEach(([chave, btn]) => {
      if (!btn) return;
      const ativo = chave === tipo;
      btn.style.background = ativo ? 'var(--ouro)' : 'rgba(255,255,255,0.08)';
      btn.style.color = ativo ? 'var(--carvao)' : 'var(--creme)';
      btn.style.fontWeight = ativo ? 'bold' : 'normal';
    });

    atualizarMetricasOverview();
  }

  function irParaPedidoNoAdmin(idPedido) {
    const ehColetivo = String(idPedido || '').startsWith('collab_');

    if (ehColetivo) {
      mudarAbaAdmin('coletivos');
      setTimeout(() => {
        const cardColetivo = $(`coletivo-admin-${idPedido}`);
        if (cardColetivo) {
          cardColetivo.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cardColetivo.style.borderColor = 'var(--ouro)';
          setTimeout(() => { cardColetivo.style.borderColor = ''; }, 2000);
        }
      }, 150);
      return;
    }

    const pedidoAlvo = listaPedidos.find(p => p.id === idPedido);
    mudarAbaAdmin('pedidos');
    
    if (pedidoAlvo && pedidoAlvo.dataAgendada) {
      const inputDataEspecifica = $('filtro-data-especifica');
      if (inputDataEspecifica) {
        inputDataEspecifica.value = pedidoAlvo.dataAgendada;
        dataEspecificaFiltro = pedidoAlvo.dataAgendada;
        filtroPedidosAtual = '';
        $('btn-filtro-hoje').classList.remove('active');
        $('btn-filtro-anteriores').classList.remove('active');
        carregarListaPedidosAdmin();
      }
    }

    setTimeout(() => {
      const cardPedido = $(`pedido-admin-${idPedido}`);
      if (cardPedido) {
        cardPedido.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardPedido.style.borderColor = 'var(--ouro)';
        setTimeout(() => { cardPedido.style.borderColor = ''; }, 2000);
      }
    }, 150);
  }

  async function atualizarEstoqueSupabase(itemId, novoValorVendidos) {
    await db.from(DB_TABLES.PRODUTOS).update({ vendidos: novoValorVendidos }).eq('id', itemId);
  }

  async function atualizarNovidade(idProduto, valorCheckbox) {
    await db.from(DB_TABLES.PRODUTOS).update({ eh_novidade: valorCheckbox }).eq('id', idProduto);
    await carregarCardapioNuvem();
  }

  function renderizarNovidades() {
    const grid = $('novidades-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const itensNovidades = produtosCardapio.filter(p => p.eh_novidade);

    if (itensNovidades.length === 0) {
      $('novidades').style.display = 'none';
      return;
    } else {
      $('novidades').style.display = 'block';
    }

    itensNovidades.forEach(prod => {
      const estoqueRestante = prod.limite - prod.vendidos;
      const esgotado = estoqueRestante <= 0;
      const priceFormatted = prod.id === 'caixa_mista' ? 'R$ 55 ou R$ 65' : prod.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      grid.innerHTML += `
        <div class="item-card ${esgotado ? 'esgotado-card' : ''}">
          <span class="tag-novidade">Novidade</span>
          <div>
            <div class="item-photo"><img src="${prod.image}" alt="${prod.name}"></div>
            <h3>${prod.name}</h3>
          </div>
          <div>
            <div class="item-price">${priceFormatted}</div>
            <button class="item-order" onclick="addToCart('${prod.id}')" ${esgotado ? 'disabled' : ''}>
              ${esgotado ? 'Esgotado' : (prod.id === 'caixa_mista' ? 'Montar Caixa +' : 'Adicionar ao carrinho +')}
            </button>
          </div>
        </div>
      `;
    });
  }

  function renderizarMenuCategorizado() {
    const container = $('menu-categorias-container');
    if (!container) return;
    container.innerHTML = '';
    const ordemCategorias = ['Cravejados', 'Tradicionais', 'Sabor Sobremesas', 'Crocantes', 'Gourmets', 'Espetos'];
    
    ordemCategorias.forEach(catNome => {
      const produtosDaCategoria = produtosCardapio.filter(p => (p.categoria || '').toLowerCase() === catNome.toLowerCase());
      
      if (produtosDaCategoria.length > 0) {
        let iconeCat = 'fa-utensils';
        if (catNome === 'Cravejados') iconeCat = 'fa-gem';
        else if (catNome === 'Tradicionais') iconeCat = 'fa-heart';
        else if (catNome === 'Sabor Sobremesas') iconeCat = 'fa-cake-candles';
        else if (catNome === 'Crocantes') iconeCat = 'fa-cookie';
        else if (catNome === 'Gourmets') iconeCat = 'fa-star';
        else if (catNome === 'Espetos') iconeCat = 'fa-wand-magic-sparkles';

        let htmlGridItens = '';
        produtosDaCategoria.forEach(prod => {
          const estoqueRestante = prod.limite - prod.vendidos;
          const esgotado = estoqueRestante <= 0;
          const priceFormatted = prod.id === 'caixa_mista' ? 'R$ 55 ou R$ 65' : prod.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const tagHtml = prod.eh_novidade ? '<span class="tag-novidade">Novidade</span>' : '';

          htmlGridItens += `
            <div class="item-card ${esgotado ? 'esgotado-card' : ''}">
              ${tagHtml}
              <div>
                <div class="item-photo"><img src="${prod.image}" alt="${prod.name}"></div>
                <h3>${prod.name}</h3>
              </div>
              <div>
                <div class="item-price">${priceFormatted}</div>
                <button class="item-order" onclick="addToCart('${prod.id}')" ${esgotado ? 'disabled' : ''}>
                  ${esgotado ? 'Esgotado' : (prod.id === 'caixa_mista' ? 'Montar Caixa +' : 'Adicionar ao carrinho +')}
                </button>
              </div>
            </div>
          `;
        });

        container.innerHTML += `
          <h3 class="menu-category-title"><i class="fa-solid ${iconeCat}"></i> ${catNome}</h3>
          <div class="menu-grid">${htmlGridItens}</div>
        `;
      }
    });
  }

  function renderizarSobremesas(listaSobremesas) {
    const grid = $('grid-sobremesas');
    if (!grid) return;
    grid.innerHTML = '';
    if (listaSobremesas.length === 0) return;

    listaSobremesas.forEach(prod => {
      const estoqueRestante = prod.limite - prod.vendidos;
      const esgotado = estoqueRestante <= 0;
      const priceFormatted = prod.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const tagHtml = prod.eh_novidade ? '<span class="tag-novidade">Novidade</span>' : '';

      grid.innerHTML += `
        <div class="item-card ${esgotado ? 'esgotado-card' : ''}">
          ${tagHtml}
          <div>
            <div class="item-photo"><img src="${prod.image}" alt="${prod.name}"></div>
            <h3>${prod.name}</h3>
          </div>
          <div>
            <div class="item-price">${priceFormatted}</div>
            <button class="item-order" onclick="addToCart('${prod.id}')" ${esgotado ? 'disabled' : ''}>
              ${esgotado ? 'Esgotado' : 'Adicionar ao carrinho +'}
            </button>
          </div>
        </div>
      `;
    });
  }

  let colaboradoresColetivo = [];
  let taxaEntregaColetivo = 0;
  let pedidoColetivoManual = false;
