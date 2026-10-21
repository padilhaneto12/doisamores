  async function carregarCardapioNuvem() {
    await carregarFestivalNuvem();
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
              const statusPedido = String(p.status || 'aguardando');
              const statusClasse = statusPedido === 'pronto' ? 'pronto' : 'aguardando';
              return `
                <div class="ov-row${ehColetivo ? ' coletivo' : ''}" onclick="irParaPedidoNoAdmin('${p.id}')" title="Clique para abrir este pedido">
                  <div class="ov-avatar"><i class="fa-solid ${ehColetivo ? 'fa-user-group' : 'fa-user'}"></i></div>
                  <div class="ov-info">
                    <b>${p.cliente}</b>
                    <small>${ehColetivo ? 'Pedido Coletivo · ' : ''}${dataExibicao}${horaExibicao}</small>
                  </div>
                  <div class="ov-side">
                    <span class="ov-total">${Number(p.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <span class="ov-status ${statusClasse}"><i></i>${statusPedido}</span>
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
          <div class="ov-row destaque">
            <img class="ov-avatar" src="${prod.image}" alt="">
            <div class="ov-info"><b>${prod.name}</b></div>
            <span class="ov-vendidos">Vendidos: <strong>${prod.vendidos}</strong></span>
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
      btn.classList.toggle('ativo', ativo);
      btn.removeAttribute('style');
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

  /* ---------- Carrossel de Novidades (estilo coverflow) ---------- */
  let novidadesIdx = 0;
  let novidadesTimer = null;
  let novidadesTotal = 0;
  const NOVIDADES_INTERVALO_MS = 4500;

  function novidadesOffset(i) {
    const n = novidadesTotal;
    const meio = Math.floor(n / 2);
    return ((i - novidadesIdx + n + meio) % n) - meio;
  }

  function novidadesAtualizar() {
    const stage = $('novidades-grid');
    if (!stage) return;
    stage.querySelectorAll('.nv-card').forEach((card, i) => {
      const o = novidadesOffset(i);
      card.dataset.o = String(o);
      card.setAttribute('aria-hidden', o === 0 ? 'false' : 'true');
      card.querySelectorAll('button').forEach(b => { b.tabIndex = o === 0 ? 0 : -1; });
    });
    stage.querySelectorAll('.nv-dot').forEach((d, i) => {
      const ativo = i === novidadesIdx;
      d.classList.toggle('ativo', ativo);
      d.setAttribute('aria-current', ativo ? 'true' : 'false');
    });
  }

  function novidadesIr(destino) {
    if (novidadesTotal < 2) return;
    novidadesIdx = ((destino % novidadesTotal) + novidadesTotal) % novidadesTotal;
    novidadesAtualizar();
  }

  function novidadesParar() { clearInterval(novidadesTimer); novidadesTimer = null; }
  function novidadesIniciar() {
    novidadesParar();
    if (novidadesTotal < 2) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    novidadesTimer = setInterval(() => { if (!document.hidden) novidadesIr(novidadesIdx + 1); }, NOVIDADES_INTERVALO_MS);
  }

  function novidadesLigarEventos(root) {
    const stage = root.querySelector('.nv-stage');
    root.querySelector('.nv-prev')?.addEventListener('click', () => { novidadesIr(novidadesIdx - 1); novidadesIniciar(); });
    root.querySelector('.nv-next')?.addEventListener('click', () => { novidadesIr(novidadesIdx + 1); novidadesIniciar(); });
    root.querySelectorAll('.nv-dot').forEach((d, i) => d.addEventListener('click', () => { novidadesIr(i); novidadesIniciar(); }));

    let inicioX = null, arrastou = false;
    stage.addEventListener('pointerdown', e => { inicioX = e.clientX; arrastou = false; });
    stage.addEventListener('pointerup', e => {
      if (inicioX === null) return;
      const dx = e.clientX - inicioX; inicioX = null;
      if (Math.abs(dx) > 45) { arrastou = true; novidadesIr(novidadesIdx + (dx < 0 ? 1 : -1)); novidadesIniciar(); }
    });
    stage.addEventListener('pointercancel', () => { inicioX = null; });
    stage.addEventListener('click', e => {
      if (arrastou) { arrastou = false; return; }
      if (e.target.closest('.nv-order')) return;
      const card = e.target.closest('.nv-card');
      if (!card) return;
      const o = Number(card.dataset.o);
      if (o !== 0) { novidadesIr(novidadesIdx + o); novidadesIniciar(); }
    });
    root.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { novidadesIr(novidadesIdx - 1); novidadesIniciar(); }
      if (e.key === 'ArrowRight') { novidadesIr(novidadesIdx + 1); novidadesIniciar(); }
    });
    root.addEventListener('mouseenter', novidadesParar);
    root.addEventListener('mouseleave', novidadesIniciar);
    root.addEventListener('focusin', novidadesParar);
    root.addEventListener('focusout', novidadesIniciar);
    root.addEventListener('touchstart', novidadesParar, {passive: true});
    root.addEventListener('touchend', novidadesIniciar, {passive: true});
  }

  function renderizarNovidades() {
    const grid = $('novidades-grid');
    if (!grid) return;
    novidadesParar();
    const itensNovidades = produtosCardapio.filter(p => p.eh_novidade);

    if (itensNovidades.length === 0) {
      grid.innerHTML = '';
      $('novidades').style.display = 'none';
      return;
    }
    $('novidades').style.display = 'block';

    novidadesTotal = itensNovidades.length;
    if (novidadesIdx >= novidadesTotal) novidadesIdx = 0;

    const cards = itensNovidades.map(prod => {
      const estoqueRestante = prod.limite - prod.vendidos;
      const esgotado = estoqueRestante <= 0;
      const priceFormatted = prod.id === 'caixa_mista' ? 'R$ 55 ou R$ 65' : prod.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return `
        <article class="nv-card ${esgotado ? 'esgotado-card' : ''}" data-o="9">
          <img class="nv-img" src="${prod.image}" alt="${prod.name}" loading="lazy" draggable="false">
          <span class="tag-novidade">Novidade</span>
          <div class="nv-info">
            <h3>${prod.name}</h3>
            <div class="item-price">${priceFormatted}</div>
            <button class="nv-order" type="button" onclick="addToCart('${prod.id}')" ${esgotado ? 'disabled' : ''}>
              ${esgotado ? 'Esgotado' : (prod.id === 'caixa_mista' ? 'Montar Caixa +' : 'Adicionar ao carrinho +')}
            </button>
          </div>
        </article>`;
    }).join('');

    const multiplos = novidadesTotal > 1;
    grid.innerHTML = `
      <div class="nv-stage" tabindex="0" role="group" aria-roledescription="carrossel" aria-label="Novidades do Festival">${cards}</div>
      ${multiplos ? `
      <button class="nv-arrow nv-prev" type="button" aria-label="Novidade anterior"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="nv-arrow nv-next" type="button" aria-label="Próxima novidade"><i class="fa-solid fa-chevron-right"></i></button>
      <div class="nv-dots">${itensNovidades.map((p, i) => `<button class="nv-dot" type="button" aria-label="Ir para ${p.name}"></button>`).join('')}</div>` : ''}`;

    novidadesLigarEventos(grid);
    novidadesAtualizar();
    novidadesIniciar();
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

  let colaboradoresColetivo = [];
  let taxaEntregaColetivo = 0;
  let pedidoColetivoManual = false;
