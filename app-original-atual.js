/* Configurações centrais do sistema — ajuste aqui regras globais. */
const APP_CONFIG = Object.freeze({
  antecedenciaEncomendaDias: 1,
  whatsapp: '554299894838',
  moeda: 'BRL',
  locale: 'pt-BR'
});

const SUPABASE_URL = 'https://ecejppxklzrleumionqt.supabase.co'; 
  const SUPABASE_ANON_KEY = 'sb_publishable_BuvSH51vbG4ln9sUZm43RQ_qe9WOx1L'; 
  const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let produtosCardapio = [];
  let listaPedidos = [];
  let listaColetivos = [];
  let filtroOverviewAtual = 'todos';
  let filtroPedidosAtual = 'hoje'; 
  let dataEspecificaFiltro = '';
  let saboresCaixaTemp = {};
  let adminSaboresCaixaTemp = {};
  let coletivoSaboresCaixaTemp = {};
  let coletivoAlvoAtual = null;
  let pedidoEditandoTemp = null;
  let coletivoEditandoTemp = null;
  let pedidoDetalheAtualId = null;
  let coletivoDetalheAtualId = null;
  
  let cuponsValidos = {};
  let cupomAplicado = null;
  let apenasEncomendaAtivo = false;
  let listaAvaliadoresGoogle = [
    "Taisa Desplanches",
    "Patricia Santos",
    "Daniele Kovalczyk",
    "Carla Almeida",
    "Luana Vanin",
    "Vitória Caroline Gorte",
    "Mariana Meister Zavadzki",
    "Jessica Schemin"
  ];

  const googleReviews = [
    {
      author: "Taisa Desplanches",
      text: "Os doces de morango são maravilhosos! Muito bem feitos, com ingredientes de ótima qualidade, sabor delicioso e na medida certa de doce. O morango estava fresquinho e a apresentação é linda, tudo muito caprichado. Dá para perceber o cuidado em cada detalhe. Super recomendo! 🍓"
    },
    {
      author: "Daniele Kovalczyk",
      text: "Perfeita. Morangos do amor e cravejado deliciosos, entrega rápida e um capricho no envio. Super recomendo!!!"
    },
    {
      author: "Carla Almeida",
      text: "São os melhores em sabor, qualidade, beleza. Eu amo demais!!!"
    },
    {
      author: "Luana Vanin",
      text: "Melhor atendimento de PG, atendimento rápido, trás novidades, o sabor é surreal de bom, apesar de doces não é um doce enjoativo, o pudim com toda certeza ganhou meu coração, o MELHOR DE TODOS, vale a pena pedir."
    },
    {
      author: "Vitória Caroline Gorte",
      text: "Doces maravilhosos, brigadeiro no ponto certo e produtos de qualidade! Super indico."
    },
    {
      author: "Mariana Meister Zavadzki",
      text: "Uma delícia e o tamanho dos morangos são ótimos. O brigadeiro no ponto certinho. Maravilhoso!!!"
    },
    {
      author: "Jessica Schemin",
      text: "Espetinho de morango MARAVILHOSO! Muito capricho, muito fresco.. recomendo muito"
    }
  ];

  let currentReviewIndex = 0;

  function renderizarAvaliacaoAtual() {
    const textEl = document.getElementById('review-text-content');
    const authorEl = document.getElementById('review-author-name');
    const counterEl = document.getElementById('review-counter');
    if (!textEl || !authorEl) return;

    const review = googleReviews[currentReviewIndex];
    textEl.style.opacity = 0;
    setTimeout(() => {
      textEl.innerText = `“${review.text}”`;
      authorEl.innerText = `— ${review.author}`;
      if (counterEl) counterEl.innerText = `${currentReviewIndex + 1} / ${googleReviews.length}`;
      textEl.style.opacity = 1;
    }, 150);
  }

  function mudarAvaliacao(direcao) {
    currentReviewIndex += direcao;
    if (currentReviewIndex < 0) currentReviewIndex = googleReviews.length - 1;
    if (currentReviewIndex >= googleReviews.length) currentReviewIndex = 0;
    renderizarAvaliacaoAtual();
  }

  setInterval(() => {
    mudarAvaliacao(1);
  }, 7000);

  const imagensLocaisFallback = {
    'morango_amor': 'images/amor.jpeg',
    'maracuja_amor': 'images/maracuja.jpeg',
    'bombom_morango': 'images/bombom.jpeg',
    'morango_folhado': 'images/folhado.jpeg',
    'morango_brule': 'images/brule.jpeg',
    'morango_ninho_nutella': 'images/ninho.jpeg',
    'morango_brigadeiro': 'images/brigadeiro.jpeg',
    'espeto_ninho_nutella': 'images/espeto_nutella.jpeg',
    'espeto_brigadeiro_maracuja': 'images/espeto_maracuja.jpeg',
    'espeto_chocolate_branco': 'images/espeto_branco.jpeg',
    'espeto_brigadeiro_kinder': 'images/espeto_kinder.jpeg',
    'caixa_mista': 'images/caixa.jpeg'
  };

  let statusManualLoja = null;

  function formatarDataIsoLocal(dateObj) {
    const ano = dateObj.getFullYear();
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dateObj.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function obterDataMinimaEncomenda() {
    const hoje = new Date();
    if (!apenasEncomendaAtivo) {
      return formatarDataIsoLocal(hoje);
    }
    const dMin = new Date();
    dMin.setDate(dMin.getDate() + APP_CONFIG.antecedenciaEncomendaDias);
    return formatarDataIsoLocal(dMin);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await carregarModoEncomendaNuvem();
    
    const dataPadraoIso = obterDataMinimaEncomenda();

    const inputData = document.getElementById('order-date');
    if (inputData) {
      inputData.value = dataPadraoIso;
      inputData.min = dataPadraoIso;
      inputData.addEventListener('change', () => {
        const minPermitida = obterDataMinimaEncomenda();
        if (apenasEncomendaAtivo && inputData.value && inputData.value < minPermitida) {
          alert(`No modo apenas encomenda, os pedidos devem ser agendados com no mínimo ${APP_CONFIG.antecedenciaEncomendaDias} dia de antecedência.`);
          inputData.value = minPermitida;
        }
      });
    }
    const manualData = document.getElementById('manual-data');
    if (manualData) {
      manualData.value = dataPadraoIso;
      manualData.min = dataPadraoIso;
    }
    renderizarAvaliacaoAtual();
    carregarCardapioNuvem();
    carregarPedidosNuvem();
    carregarColetivosNuvem();
    carregarStatusLojaNuvem();
    carregarCuponsNuvem();
    carregarAvaliadoresNuvem();
  });

  function toggleAdminSidebarMobile() {
    const sidebar = document.getElementById('admin-sidebar-mobile');
    if (sidebar) {
      sidebar.classList.toggle('mobile-open');
    }
  }

  async function carregarStatusLojaNuvem() {
    const { data, error } = await _supabase.from('configuracoes').select('valor').eq('chave', 'status_loja_manual').single();
    if (!error && data) {
      if (data.valor === 'true') statusManualLoja = true;
      else if (data.valor === 'false') statusManualLoja = false;
      else statusManualLoja = null;
    }
    verificarFuncionamento();
  }

  async function carregarModoEncomendaNuvem() {
    const { data, error } = await _supabase.from('configuracoes').select('valor').eq('chave', 'apenas_encomenda').single();
    if (!error && data) {
      apenasEncomendaAtivo = (data.valor === 'true');
      atualizarDisplayEncomenda();
    }
  }

  async function carregarAvaliadoresNuvem() {
    const { data, error } = await _supabase.from('configuracoes').select('valor').eq('chave', 'avaliadores_google').single();
    if (!error && data && data.valor) {
      try {
        listaAvaliadoresGoogle = JSON.parse(data.valor);
      } catch(e) {
        listaAvaliadoresGoogle = data.valor.split('\n').map(s => s.trim()).filter(Boolean);
      }
    }
    const textarea = document.getElementById('input-lista-avaliadores');
    if (textarea) {
      textarea.value = listaAvaliadoresGoogle.join('\n');
    }
  }

  async function salvarListaAvaliadores() {
    const textarea = document.getElementById('input-lista-avaliadores');
    if (!textarea) return;
    const linhas = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
    listaAvaliadoresGoogle = linhas;
    const valorJson = JSON.stringify(linhas);

    const { error } = await _supabase.from('configuracoes').upsert([
      { chave: 'avaliadores_google', valor: valorJson }
    ]);

    if (error) {
      alert("Erro ao salvar lista de avaliadores: " + error.message);
      return;
    }
    alert("Lista de avaliadores do Google salva com sucesso!");
  }

  function verificarSeEValidador(nomeCliente) {
    if (!nomeCliente || listaAvaliadoresGoogle.length === 0) return false;
    const nomeNormalizado = nomeCliente.trim().toLowerCase();
    return listaAvaliadoresGoogle.some(avaliador => avaliador.trim().toLowerCase() === nomeNormalizado);
  }

  function atualizarDisplayEncomenda() {
    const dot = document.getElementById('admin-encomenda-dot');
    const label = document.getElementById('admin-encomenda-label');
    const btn = document.getElementById('btn-toggle-encomenda');

    if (dot && label && btn) {
      dot.style.background = apenasEncomendaAtivo ? '#2ecc71' : '#e74c3c';
      label.innerText = apenasEncomendaAtivo ? `Ativo (Encomendas a partir de ${APP_CONFIG.antecedenciaEncomendaDias} dia)` : "Desativado (Funcionamento normal)";
      btn.innerText = apenasEncomendaAtivo ? "Desativar Encomenda" : "Ativar Encomenda";
    }

    const novaDataMin = obterDataMinimaEncomenda();
    const inputData = document.getElementById('order-date');
    if (inputData) {
      inputData.min = novaDataMin;
      if (!inputData.value || inputData.value < novaDataMin) inputData.value = novaDataMin;
    }
    const manualData = document.getElementById('manual-data');
    if (manualData) {
      manualData.min = novaDataMin;
      if (!manualData.value || manualData.value < novaDataMin) manualData.value = novaDataMin;
    }
    const avisoTag = document.getElementById('encomenda-aviso-tag');
    if (avisoTag) {
      avisoTag.style.display = apenasEncomendaAtivo ? 'inline' : 'none';
    }
  }

  async function alternarModoEncomenda() {
    apenasEncomendaAtivo = !apenasEncomendaAtivo;
    let valorStr = String(apenasEncomendaAtivo);

    const { error } = await _supabase.from('configuracoes').update({ valor: valorStr }).eq('chave', 'apenas_encomenda');
    if (error) {
      alert("Erro ao atualizar o modo encomenda.");
      return;
    }

    atualizarDisplayEncomenda();
    alert(apenasEncomendaAtivo ? `Modo 'Apenas por Encomenda' ativado com sucesso! Agendamentos com antecedência mínima de ${APP_CONFIG.antecedenciaEncomendaDias} dia.` : "Modo normal restabelecido.");
  }

  function verificarFuncionamento() {
    const statusContainer = document.getElementById('status-loja');
    const statusText = document.getElementById('status-text');
    const adminLabel = document.getElementById('admin-status-label');
    const adminDot = document.getElementById('admin-status-dot');

    let estaAberto = false;
    if (statusManualLoja !== null) {
      estaAberto = statusManualLoja;
      if (adminLabel) adminLabel.innerText = estaAberto ? "Forçado: ABERTO" : "Forçado: FECHADO";
    } else {
      const agora = new Date();
      const diaSemana = agora.getDay();
      const horaDecimal = agora.getHours() + agora.getMinutes() / 60;
      const diaUtil = diaSemana !== 1; 
      const horarioUtil = horaDecimal >= 13.0 && horaDecimal < 20.0;
      estaAberto = diaUtil && horarioUtil;

      if (adminLabel) adminLabel.innerText = "Automático";
    }

    if (adminDot) adminDot.style.background = estaAberto ? "#2ecc71" : "#e74c3c";

    if (statusContainer && statusText) {
      if (estaAberto) {
        statusContainer.className = "status-loja aberto";
        statusText.innerText = "Aberto agora · Pedidos a todo vapor 🍓";
      } else {
        statusContainer.className = "status-loja fechado";
        statusText.innerText = "Fechado no momento · Deixem seu pedido agendado!";
      }
    }
  }

  async function alternarStatusLojaManual() {
    if (statusManualLoja === null) statusManualLoja = false; 
    else if (statusManualLoja === false) statusManualLoja = true;
    else statusManualLoja = null; 

    let valorStr = statusManualLoja === null ? 'null' : String(statusManualLoja);
    await _supabase.from('configuracoes').update({ valor: valorStr }).eq('chave', 'status_loja_manual');
    verificarFuncionamento();
  }

  async function carregarCardapioNuvem() {
    await carregarFestivalNuvem();
    await carregarSobremesasNuvem();
  }

  async function carregarFestivalNuvem() {
    const { data, error } = await _supabase.from('produtos').select('*').not('categoria', 'ilike', 'Docinho%').neq('categoria', 'sobremesa');
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
    const { data, error } = await _supabase.from('produtos').select('*').eq('categoria', 'sobremesa');
    if (error) return;

    data.sort((a, b) => a.name.localeCompare(b.name));
    renderizarSobremesas(data.map(p => ({ ...p, image: p.image_url || 'images/amor.jpeg' })));
  }

  async function carregarPedidosNuvem() {
    const { data, error } = await _supabase.from('pedidos').select('*');
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
    const { data, error } = await _supabase.from('pedidos_coletivos').select('*');
    if (!error && data) {
      listaColetivos = data;
      atualizarMetricasOverview();
    }
  }

  async function carregarCuponsNuvem() {
    const { data, error } = await _supabase.from('cupons').select('*');
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

    document.getElementById('stat-vendas-mes').innerText = faturamentoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('stat-vendas-dia').innerText = faturamentoDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('stat-ticket-medio').innerText = ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('stat-pedidos-pendentes').innerText = pedidosPendentes;
    const statColetivos = document.getElementById('stat-coletivos-total');
    if (statColetivos) statColetivos.innerText = listaColetivos.length;

    const ultimosContainer = document.getElementById('overview-ultimos-pedidos');
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

    const destaquesContainer = document.getElementById('overview-destaques-produtos');
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
      todos: document.getElementById('btn-filtro-ov-todos'),
      individuais: document.getElementById('btn-filtro-ov-indiv'),
      coletivos: document.getElementById('btn-filtro-ov-colet')
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
        const cardColetivo = document.getElementById(`coletivo-admin-${idPedido}`);
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
      const inputDataEspecifica = document.getElementById('filtro-data-especifica');
      if (inputDataEspecifica) {
        inputDataEspecifica.value = pedidoAlvo.dataAgendada;
        dataEspecificaFiltro = pedidoAlvo.dataAgendada;
        filtroPedidosAtual = '';
        document.getElementById('btn-filtro-hoje').classList.remove('active');
        document.getElementById('btn-filtro-anteriores').classList.remove('active');
        carregarListaPedidosAdmin();
      }
    }

    setTimeout(() => {
      const cardPedido = document.getElementById(`pedido-admin-${idPedido}`);
      if (cardPedido) {
        cardPedido.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardPedido.style.borderColor = 'var(--ouro)';
        setTimeout(() => { cardPedido.style.borderColor = ''; }, 2000);
      }
    }, 150);
  }

  async function atualizarEstoqueSupabase(itemId, novoValorVendidos) {
    await _supabase.from('produtos').update({ vendidos: novoValorVendidos }).eq('id', itemId);
  }

  async function atualizarNovidade(idProduto, valorCheckbox) {
    await _supabase.from('produtos').update({ eh_novidade: valorCheckbox }).eq('id', idProduto);
    await carregarCardapioNuvem();
  }

  function renderizarNovidades() {
    const grid = document.getElementById('novidades-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const itensNovidades = produtosCardapio.filter(p => p.eh_novidade);

    if (itensNovidades.length === 0) {
      document.getElementById('novidades').style.display = 'none';
      return;
    } else {
      document.getElementById('novidades').style.display = 'block';
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
    const container = document.getElementById('menu-categorias-container');
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
    const grid = document.getElementById('grid-sobremesas');
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
    if (totalPedido > 150) return 0;
    const bairro = document.getElementById('coletivo-bairro')?.value?.trim() || '';
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

  function buscarCEPColetivo() {
    const cep = document.getElementById('coletivo-cep')?.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(res => res.json())
      .then(data => {
        if (data.erro) { alert('CEP não encontrado.'); return; }
        document.getElementById('coletivo-rua').value = data.logradouro || '';
        document.getElementById('coletivo-bairro').value = data.bairro || '';
        calcularTaxaColetivo(data.bairro || '');
        document.getElementById('coletivo-numero').focus();
      })
      .catch(() => {
        alert('Não foi possível buscar o CEP.');
      });
  }

  function calcularTaxaColetivo(bairro) {
    const subtotal = obterTotalPedidoColetivo();
    if (subtotal > 150) {
      taxaEntregaColetivo = 0;
      const freteEl = document.getElementById('coletivo-frete-valor');
      if (freteEl) freteEl.innerText = 'Grátis';
      const totalEl = document.getElementById('coletivo-total-geral');
      if (totalEl) totalEl.innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const subtotalEl = document.getElementById('coletivo-subtotal');
      if (subtotalEl) subtotalEl.innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return 0;
    }

    let matched = false;
    for (const [b, t] of Object.entries(tabelaFrete)) {
      if (bairro.toLowerCase().includes(b.toLowerCase())) { taxaEntregaColetivo = t; matched = true; break; }
    }
    if (!matched) taxaEntregaColetivo = taxaPadrao;

    const freteEl = document.getElementById('coletivo-frete-valor');
    if (freteEl) freteEl.innerText = taxaEntregaColetivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const subtotalEl = document.getElementById('coletivo-subtotal');
    if (subtotalEl) subtotalEl.innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const totalEl = document.getElementById('coletivo-total-geral');
    if (totalEl) totalEl.innerText = (subtotal + taxaEntregaColetivo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return taxaEntregaColetivo;
  }

  function abrirModalPedidoColetivo() {
    colaboradoresColetivo = [];
    document.getElementById('coletivo-resp-nome').value = '';
    document.getElementById('coletivo-resp-zap').value = '';
    document.getElementById('coletivo-cep').value = '';
    document.getElementById('coletivo-rua').value = '';
    document.getElementById('coletivo-numero').value = '';
    document.getElementById('coletivo-complemento').value = '';
    document.getElementById('coletivo-bairro').value = '';
    taxaEntregaColetivo = 0;

    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 5);
    const dataMinimaIso = hoje.toISOString().split('T')[0];
    const dataInput = document.getElementById('coletivo-resp-data');
    if (dataInput) { 
      dataInput.min = dataMinimaIso; 
      dataInput.value = dataMinimaIso; 
    }

    adicionarNovoColaborador();
    document.getElementById('modal-pedido-coletivo').classList.add('open');
  }

  function fecharModalPedidoColetivo() { document.getElementById('modal-pedido-coletivo').classList.remove('open'); }

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
    const container = document.getElementById('coletivo-flavor-list-container');
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
    document.getElementById('coletivo-modal-overlay').classList.add('open');
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
    document.getElementById(`coletivo-qtd-sabor-${nomeSabor}`).innerText = coletivoSaboresCaixaTemp[nomeSabor];
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
    document.getElementById('coletivo-flavor-count-status').innerText = `Restantes: ${6 - totalAtual}`;
    document.getElementById('coletivo-flavor-price-preview').innerText = `Preço: R$ ${calcularColetivoPrecoCaixaTemp().toFixed(2)}`;
  }

  function fecharColetivoModalCaixa() {
    document.getElementById('coletivo-modal-overlay').classList.remove('open');
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
    document.getElementById('coletivo-modal-overlay').classList.remove('open');
    coletivoAlvoAtual = null;
    renderizarColaboradoresColetivo();
  }

  function renderizarColaboradoresColetivo() {
    const container = document.getElementById('coletivo-colaboradores-container');
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
      const el = document.getElementById(`collab-total-${collabIndex}`);
      if (el) el.innerText = totalCollab.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      totalGeral += totalCollab;
    });

    const subtotalEl = document.getElementById('coletivo-subtotal');
    if (subtotalEl) subtotalEl.innerText = totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const frete = calcularFreteColetivo(totalGeral);
    const freteEl = document.getElementById('coletivo-frete-valor');
    if (freteEl) freteEl.innerText = frete > 0 ? frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Grátis';

    const totalGeralEl = document.getElementById('coletivo-total-geral');
    if (totalGeralEl) totalGeralEl.innerText = (totalGeral + frete).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function confirmarPedidoColetivo() {
    const respNome = document.getElementById('coletivo-resp-nome').value.trim();
    const respZap = document.getElementById('coletivo-resp-zap').value.trim();
    const respData = document.getElementById('coletivo-resp-data').value;
    const cep = document.getElementById('coletivo-cep')?.value.trim() || '';
    const rua = document.getElementById('coletivo-rua')?.value.trim() || '';
    const numero = document.getElementById('coletivo-numero')?.value.trim() || '';
    const complemento = document.getElementById('coletivo-complemento')?.value.trim() || '';
    const bairro = document.getElementById('coletivo-bairro')?.value.trim() || '';

    if (!respNome || !respZap || !respData || !cep || !rua || !numero || !bairro) { alert('Preencha todos os dados do responsável e do endereço.'); return; }

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
      coletivoEditandoTemp.cep = cep;
      coletivoEditandoTemp.colaboradores = colaboradoresColetivo;
      coletivoEditandoTemp.total = totalFinal;
      coletivoEditandoTemp.frete = fretePedido;

      const { error } = await _supabase.from('pedidos_coletivos').update({
        responsavel_nome: respNome,
        responsavel_whatsapp: respZap,
        data_encomenda: dataFormatadaBr,
        endereco: enderecoCompleto,
        cep,
        colaboradores: colaboradoresColetivo,
        total: totalFinal,
        frete: fretePedido
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
      cep,
      colaboradores: colaboradoresColetivo,
      total: totalFinal,
      frete: fretePedido,
      status: 'aguardando',
      data: new Date().toLocaleDateString('pt-BR')
    };

    const { error } = await _supabase.from('pedidos_coletivos').insert([novoColetivoSupabase]);
    if (error) { alert("Erro: " + error.message); return; }

    fecharModalPedidoColetivo();
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

    window.open(`https://wa.me/${APP_CONFIG.whatsapp}?text=${encodeURIComponent(txt)}`, '_blank');
    carregarColetivosNuvem();
    atualizarMetricasOverview();
  }

  async function carregarListaColetivosAdmin() {
    await carregarColetivosNuvem();
    const container = document.getElementById('lista-coletivos-admin');
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
    document.getElementById('filtro-itens-coletivo').value = '';
    renderizarItensDetalhesColetivoModal();
    document.getElementById('modal-detalhes-coletivo').classList.add('open');
  }

  function renderizarItensDetalhesColetivoModal() {
    const col = listaColetivos.find(c => c.id_coletivo === coletivoDetalheAtualId);
    if (!col) return;
    
    document.getElementById('modal-detalhes-coletivo-titulo').innerText = `Pedido Coletivo: ${col.responsavel_nome}`;
    const container = document.getElementById('modal-detalhes-coletivo-itens-container');
    const filtro = document.getElementById('filtro-itens-coletivo').value.toLowerCase().trim();
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
    document.getElementById('modal-detalhes-coletivo').classList.remove('open');
    coletivoDetalheAtualId = null;
  }

  async function alternarItemFeitoColetivoModal(idColetivo, collabIdx, itemIdx, feitoStatus) {
    const col = listaColetivos.find(c => c.id_coletivo === idColetivo);
    if (col && col.colaboradores && col.colaboradores[collabIdx] && col.colaboradores[collabIdx].itens[itemIdx]) {
      col.colaboradores[collabIdx].itens[itemIdx].feito = feitoStatus;
      await _supabase.from('pedidos_coletivos').update({ colaboradores: col.colaboradores }).eq('id_coletivo', idColetivo);
      renderizarItensDetalhesColetivoModal();
    }
  }

  function abrirModalEditarColetivo(idColetivo) {
    const col = JSON.parse(JSON.stringify(listaColetivos.find(c => c.id_coletivo === idColetivo)));
    if (!col) return;

    coletivoEditandoTemp = col;
    colaboradoresColetivo = col.colaboradores || [];

    document.getElementById('coletivo-resp-nome').value = col.responsavel_nome || '';
    document.getElementById('coletivo-resp-zap').value = col.responsavel_whatsapp || '';
    document.getElementById('coletivo-cep').value = col.cep || '';
    document.getElementById('coletivo-rua').value = '';
    document.getElementById('coletivo-numero').value = '';
    document.getElementById('coletivo-complemento').value = '';
    document.getElementById('coletivo-bairro').value = '';

    if (col.endereco) {
      const enderecoTexto = String(col.endereco);
      const parteRua = enderecoTexto.split(',')[0]?.trim() || '';
      const parteNumero = enderecoTexto.split(',')[1]?.trim() || '';
      const parteBairro = enderecoTexto.split('-').pop()?.trim() || '';
      document.getElementById('coletivo-rua').value = parteRua || enderecoTexto;
      document.getElementById('coletivo-numero').value = parteNumero;
      document.getElementById('coletivo-bairro').value = parteBairro;
    }

    if (col.data_encomenda) {
      let p = col.data_encomenda.split('/');
      if (p.length === 3) {
        document.getElementById('coletivo-resp-data').value = `${p[2]}-${p[1]}-${p[0]}`;
      }
    }

    renderizarColaboradoresColetivo();
    document.getElementById('modal-pedido-coletivo').classList.add('open');
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

    window.open(`https://wa.me/${telefone ? telefone : ''}?text=${encodeURIComponent(txt)}`, '_blank');
  }

  async function alterarStatusColetivo(idColetivo, novoStatus) {
    const col = listaColetivos.find(c => c.id_coletivo === idColetivo);
    if (col) {
      col.status = novoStatus;
      await _supabase.from('pedidos_coletivos').update({ status: novoStatus }).eq('id_coletivo', idColetivo);
      carregarListaColetivosAdmin();
      atualizarMetricasOverview();
      if (col.responsavel_whatsapp) {
        let telefoneLimpo = col.responsavel_whatsapp.replace(/\D/g, '');
        if (!telefoneLimpo.startsWith('55')) telefoneLimpo = '55' + telefoneLimpo;
        const saudacao = col.responsavel_nome ? `Olá, *${col.responsavel_nome}*! ` : 'Olá! ';
        let msg = novoStatus === 'aguardando' 
          ? `${saudacao}Recebemos o seu Pedido Coletivo com sucesso. Assim que o pagamento for confirmado, ele entrará em produção! 🤎` 
          : (novoStatus === 'preparo' ? `Seu Pedido Coletivo entrou *Em Preparo* 🤎` : `Seu Pedido Coletivo está *Pronto*! ✨`);
        window.open(`https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    }
  }

  async function deletarColetivo(id) {
    if (!confirm("Excluir pedido coletivo?")) return;
    await _supabase.from('pedidos_coletivos').delete().eq('id_coletivo', id);
    carregarColetivosNuvem();
    carregarListaColetivosAdmin();
    atualizarMetricasOverview();
  }

  async function tentarEntrarAdmin() {
    const senhaDigitada = prompt("Senha do painel administrativo:");
    if (senhaDigitada === null) return;
    const { data, error } = await _supabase.from('configuracoes').select('valor').eq('chave', 'senha_admin').single();
    if (error || !data) { alert("Erro ao validar senha."); return; }
    if (senhaDigitada === data.valor) abrirAdmin();
    else alert("Senha incorreta!");
  }

  async function abrirAdmin() {
    const { data } = await _supabase.from('produtos').select('*').not('categoria', 'ilike', 'Docinho%');
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
    
    document.getElementById('admin-modal-overlay').classList.add('open');
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

    document.getElementById('admin-title-header').innerText = titulosHeader[aba] || 'Painel Admin';

    const indexMap = { 'overview': 1, 'estoque': 2, 'docinhos': 3, 'presentes': 4, 'pedidos': 5, 'coletivos': 6, 'manual': 7, 'cupons': 8, 'avaliadores': 9 };
    if (indexMap[aba]) {
      document.querySelector(`.admin-sidebar .admin-nav-btn:nth-child(${indexMap[aba]})`).classList.add('active');
    }
    document.getElementById(`aba-${aba}`).classList.add('active');

    const sidebar = document.getElementById('admin-sidebar-mobile');
    if (sidebar) sidebar.classList.remove('mobile-open');

    if (aba === 'overview') atualizarMetricasOverview();
    else if (aba === 'coletivos') carregarListaColetivosAdmin();
  }

  function toggleManualEntrega() {
    const tipo = document.getElementById('manual-recebimento').value;
    document.getElementById('manual-endereco-box').style.display = (tipo === 'Entrega') ? 'block' : 'none';
    if (tipo !== 'Entrega') document.getElementById('manual-taxa-entrega').value = "0.00";
    calcularTotalManual();
  }

  let caixasManuaisPendentes = [];

  function carregarTabelaManualAdmin() {
    caixasManuaisPendentes = [];
    const tbody = document.getElementById('manual-produtos-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const dataMinimaManual = obterDataMinimaEncomenda();
    const manualDataEl = document.getElementById('manual-data');
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
    const container = document.getElementById('admin-flavor-list-container');
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
    document.getElementById('admin-custom-modal-overlay').classList.add('open');
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
    document.getElementById(`admin-qtd-sabor-${nomeSabor}`).innerText = adminSaboresCaixaTemp[nomeSabor];
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
    document.getElementById('admin-flavor-count-status').innerText = `Restantes: ${6 - totalAtual}`;
    document.getElementById('admin-flavor-price-preview').innerText = `Preço: R$ ${calcularAdminPrecoCaixaTemp().toFixed(2)}`;
  }

  function fecharAdminModalCaixa() { document.getElementById('admin-custom-modal-overlay').classList.remove('open'); }

  function confirmarAdminCaixaMista() {
    let totalAtual = Object.values(adminSaboresCaixaTemp).reduce((a, b) => a + b, 0);
    if (totalAtual !== 6) { alert("⚠️ Escolha exatamente 6 sabores!"); return; }
    let obsSabores = Object.entries(adminSaboresCaixaTemp).filter(([nome, qtd]) => qtd > 0).map(([nome, qtd]) => `${qtd}x ${nome}`).join(', ');
    let precoCaixa = calcularAdminPrecoCaixaTemp();

    caixasManuaisPendentes.push({ name: 'Caixa Mista (6 Morangos)', price: precoCaixa, quantity: 1, obs: `Sabores: ${obsSabores}` });
    const indexCaixa = produtosCardapio.findIndex(p => p.id === 'caixa_mista');
    if (indexCaixa >= 0) {
      const input = document.getElementById(`manual-qtd-${indexCaixa}`);
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
        let input = document.getElementById(`manual-qtd-${index}`);
        let atual = parseInt(input.value) || 0;
        if (atual > 0) { input.value = atual - 1; if (caixasManuaisPendentes.length > 0) caixasManuaisPendentes.pop(); calcularTotalManual(); }
      }
      return;
    }
    const input = document.getElementById(`manual-qtd-${index}`);
    if (input) {
      let atual = parseInt(input.value) || 0;
      input.value = Math.max(0, atual + delta);
      calcularTotalManual();
    }
  }

  function calcularTotalManual() {
    let totalGeral = 0;
    produtosCardapio.forEach((prod, index) => {
      const input = document.getElementById(`manual-qtd-${index}`);
      const precoEl = document.getElementById(`manual-preco-${index}`);
      if (input && precoEl && prod.id !== 'caixa_mista') {
        totalGeral += (parseInt(input.value) || 0) * (parseFloat(precoEl.innerText) || 0);
      }
    });
    caixasManuaisPendentes.forEach(cx => { totalGeral += cx.price * cx.quantity; });
    if (document.getElementById('manual-recebimento').value === 'Entrega') {
      totalGeral += parseFloat(document.getElementById('manual-taxa-entrega').value) || 0;
    }
    document.getElementById('manual-total-preview').innerText = totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return totalGeral;
  }

  async function salvarPedidoManual() {
    const cliente = document.getElementById('manual-cliente').value.trim();
    const whatsapp = document.getElementById('manual-whatsapp').value.trim();
    const pagamento = document.getElementById('manual-pagamento').value;
    const recebimento = document.getElementById('manual-recebimento').value;
    const dataAgendada = document.getElementById('manual-data').value;
    const endereco = document.getElementById('manual-endereco').value.trim();
    const taxaEntregaManual = parseFloat(document.getElementById('manual-taxa-entrega').value) || 0;

    if (!cliente) { alert("Preencha o nome do cliente."); return; }
    if (recebimento === 'Entrega' && !endereco) { alert("Preencha o endereço de entrega."); return; }

    let itensManual = [];
    produtosCardapio.forEach((prod, index) => {
      const input = document.getElementById(`manual-qtd-${index}`);
      const precoEl = document.getElementById(`manual-preco-${index}`);
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

    const { error } = await _supabase.from('pedidos').insert([novoPedidoSupabase]);
    if (error) { alert("Erro: " + error.message); return; }

    alert("Pedido manual salvo com sucesso!");
    document.getElementById('manual-cliente').value = '';
    document.getElementById('manual-whatsapp').value = '';
    document.getElementById('manual-endereco').value = '';
    caixasManuaisPendentes = [];
    mudarAbaAdmin('pedidos');
  }

  function abrirModalDetalhesPedido(idPedido) {
    pedidoDetalheAtualId = idPedido;
    document.getElementById('filtro-itens-pedido').value = '';
    renderizarItensDetalhesPedidoModal();
    document.getElementById('modal-detalhes-pedido').classList.add('open');
  }

  function renderizarItensDetalhesPedidoModal() {
    const pedido = listaPedidos.find(p => p.id === pedidoDetalheAtualId);
    if (!pedido) return;
    
    document.getElementById('modal-detalhes-titulo').innerText = `Pedido: ${pedido.cliente}`;
    const container = document.getElementById('modal-detalhes-itens-container');
    const filtro = document.getElementById('filtro-itens-pedido').value.toLowerCase().trim();
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
    document.getElementById('modal-detalhes-pedido').classList.remove('open');
    pedidoDetalheAtualId = null;
  }

  async function alternarItemFeitoPedido(idPedido, itemIdx, feitoStatus) {
    const pedido = listaPedidos.find(p => p.id === idPedido);
    if (pedido && pedido.itens && pedido.itens[itemIdx]) {
      pedido.itens[itemIdx].feito = feitoStatus;
      await _supabase.from('pedidos').update({ itens: pedido.itens }).eq('id_pedido', idPedido);
      renderizarItensDetalhesPedidoModal();
    }
  }

  function abrirModalEditarPedido(idPedido) {
    const pedido = JSON.parse(JSON.stringify(listaPedidos.find(p => p.id === idPedido)));
    if (!pedido) return;

    pedidoEditandoTemp = pedido;
    document.getElementById('edit-pedido-id-alvo').value = pedido.id;
    document.getElementById('edit-pedido-cliente').value = pedido.cliente;
    document.getElementById('edit-pedido-zap').value = pedido.whatsapp || '';
    document.getElementById('edit-pedido-frete').value = pedido.frete !== undefined ? pedido.frete : 0;

    renderizarItensEdicaoPedido();
    document.getElementById('modal-editar-pedido').classList.add('open');
  }

  function fecharModalEditarPedido() {
    document.getElementById('modal-editar-pedido').classList.remove('open');
    pedidoEditandoTemp = null;
  }

  function renderizarItensEdicaoPedido() {
    const container = document.getElementById('edit-pedido-itens-container');
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

    const freteDigitado = parseFloat(document.getElementById('edit-pedido-frete').value) || 0;
    let totalComFrete = subtotalItens + freteDigitado;
    document.getElementById('edit-pedido-total-preview').innerText = totalComFrete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    const cliente = document.getElementById('edit-pedido-cliente').value.trim();
    const whatsapp = document.getElementById('edit-pedido-zap').value.trim();
    const novoFrete = parseFloat(document.getElementById('edit-pedido-frete').value) || 0;
    if (!cliente) { alert("Preencha o nome do cliente."); return; }

    let subtotalItens = pedidoEditandoTemp.itens.reduce((acc, i) => acc + ((i.price || 0) * (i.quantity || 1)), 0);
    let novoTotal = subtotalItens + novoFrete;

    pedidoEditandoTemp.cliente = cliente;
    pedidoEditandoTemp.whatsapp = whatsapp;
    pedidoEditandoTemp.frete = novoFrete;
    pedidoEditandoTemp.total = novoTotal;

    const { error } = await _supabase.from('pedidos').update({
      cliente: cliente,
      whatsapp: whatsapp,
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
    
    window.open(`https://wa.me/${telefone ? telefone : ''}?text=${encodeURIComponent(text)}`, '_blank');
  }

  function mudarFiltroPedidos(tipo) {
    filtroPedidosAtual = tipo;
    dataEspecificaFiltro = '';
    document.getElementById('filtro-data-especifica').value = '';
    document.getElementById('btn-filtro-hoje').classList.toggle('active', tipo === 'hoje');
    document.getElementById('btn-filtro-anteriores').classList.toggle('active', tipo === 'anteriores');
    carregarListaPedidosAdmin();
  }

  function filtrarPedidosPorDataEspecifica() {
    const val = document.getElementById('filtro-data-especifica').value;
    if (!val) return;
    dataEspecificaFiltro = val; 
    filtroPedidosAtual = '';
    document.getElementById('btn-filtro-hoje').classList.remove('active');
    document.getElementById('btn-filtro-anteriores').classList.remove('active');
    carregarListaPedidosAdmin();
  }

  function limparFiltroData() {
    document.getElementById('filtro-data-especifica').value = '';
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

    const printArea = document.getElementById('relatorio-print-area');
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

  async function adicionarCupomAdmin() {
    const codigo = document.getElementById('novo-cupom-codigo').value.trim().toUpperCase();
    const tipo = document.getElementById('novo-cupom-tipo').value;
    const valor = parseFloat(document.getElementById('novo-cupom-valor').value);
    if (!codigo || isNaN(valor) || valor <= 0) { alert("Preencha cupom e valor válidos."); return; }

    const { error } = await _supabase.from('cupons').upsert([{ codigo, tipo, valor }]);
    if (error) { alert("Erro: " + error.message); return; }
    document.getElementById('novo-cupom-codigo').value = '';
    document.getElementById('novo-cupom-valor').value = '';
    await carregarCuponsNuvem();
    carregarTabelaCuponsAdmin();
    alert(`Cupom "${codigo}" cadastrado!`);
  }

  async function deletarCupomAdmin(codigo) {
    if (!confirm(`Excluir cupom "${codigo}"?`)) return;
    await _supabase.from('cupons').delete().eq('codigo', codigo);
    await carregarCuponsNuvem();
    carregarTabelaCuponsAdmin();
  }

  function carregarTabelaCuponsAdmin() {
    const tbody = document.getElementById('admin-cupons-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const chaves = Object.keys(cuponsValidos);
    if (chaves.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--creme-dim);">Nenhum cupom.</td></tr>`; return; }

    chaves.forEach(codigo => {
      const c = cuponsValidos[codigo];
      tbody.innerHTML += `<tr><td><b>${codigo}</b></td><td>${c.tipo}</td><td>${c.valor}</td><td><button class="btn-sm btn-delete" onclick="deletarCupomAdmin('${codigo}')">Excluir</button></td></tr>`;
    });
  }

  async function carregarTabelaDocinhosAdmin() {
    const { data, error } = await _supabase.from('produtos').select('*').like('categoria', 'Docinho%');
    const tbody = document.getElementById('admin-docinhos-tbody');
    if (!tbody || error || !data) return;
    tbody.innerHTML = '';
    data.forEach((doc, idx) => {
      tbody.innerHTML += `
        <tr>
          <td><span style="color: var(--ouro); font-weight: bold; font-size: 0.8rem;">${doc.id}</span></td>
          <td><img src="${doc.image_url || 'images/amor.jpeg'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;"></td>
          <td><input type="file" id="edit-doc-foto-${idx}" accept="image/*" class="admin-input-txt" style="font-size: 0.7rem;"></td>
          <td><input type="text" id="edit-doc-name-${idx}" class="admin-input-txt" value="${doc.name}"></td>
          <td>${doc.categoria}</td>
          <td><input type="text" id="edit-doc-desc-${idx}" class="admin-input-txt" value="${doc.descricao || ''}"></td>
          <td><input type="number" step="0.01" id="edit-doc-price-${idx}" class="admin-input-qtd" value="${doc.price}" style="width:70px;"></td>
          <td><button class="btn-sm" onclick="salvarDocinhoLinha('${doc.id}', ${idx})">Salvar</button></td>
        </tr>
      `;
    });
  }

  async function carregarTabelaPresentesAdmin() {
    const { data, error } = await _supabase.from('produtos').select('*').or('categoria.ilike.pais,categoria.ilike.amor,categoria.ilike.Para Presentear');
    const tbody = document.getElementById('admin-presentes-tbody');
    if (!tbody || error || !data) return;
    tbody.innerHTML = '';
    data.forEach((pres, idx) => {
      tbody.innerHTML += `
        <tr>
          <td><span style="color: var(--ouro); font-weight: bold; font-size: 0.8rem;">${pres.id}</span></td>
          <td><img src="${pres.image_url || 'images/caixa.jpeg'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;"></td>
          <td><input type="file" id="edit-pres-foto-${idx}" accept="image/*" class="admin-input-txt" style="font-size: 0.7rem;"></td>
          <td><input type="text" id="edit-pres-name-${idx}" class="admin-input-txt" value="${pres.name}"></td>
          <td>
            <select id="edit-pres-cat-${idx}" class="admin-input-txt">
              <option value="pais" ${pres.categoria === 'pais' ? 'selected' : ''}>Pais</option>
              <option value="amor" ${pres.categoria === 'amor' ? 'selected' : ''}>Amor</option>
              <option value="Para Presentear" ${pres.categoria === 'Para Presentear' ? 'selected' : ''}>Presentear</option>
            </select>
          </td>
          <td><input type="text" id="edit-pres-desc-${idx}" class="admin-input-txt" value="${pres.descricao || ''}"></td>
          <td><input type="number" step="0.01" id="edit-pres-price-${idx}" class="admin-input-qtd" value="${pres.price}" style="width:70px;"></td>
          <td><button class="btn-sm" onclick="salvarPresenteLinha('${pres.id}', ${idx})">Salvar</button></td>
        </tr>
      `;
    });
  }

  async function inserirNovoPresenteAdmin() {
    const id = document.getElementById('pres-id').value.trim();
    const name = document.getElementById('pres-nome').value.trim();
    const price = parseFloat(document.getElementById('pres-preco').value);
    const categoria = document.getElementById('pres-categoria').value;
    const descricao = document.getElementById('pres-descricao').value.trim();
    const fileInput = document.getElementById('pres-foto');

    if (!id || !name || isNaN(price)) { alert("Preencha todos os campos."); return; }
    let imageUrl = '';
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const filePath = `pres_${Date.now()}_${file.name}`;
      const { error: uploadErr } = await _supabase.storage.from('produtos').upload(filePath, file);
      if (!uploadErr) {
        const { data } = _supabase.storage.from('produtos').getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      }
    }
    await _supabase.from('produtos').insert([{ id, name, price, limite: 999999, vendidos: 0, categoria, descricao, image_url: imageUrl }]);
    alert("Presente cadastrado!");
    carregarTabelaPresentesAdmin();
  }

  async function salvarPresenteLinha(id, idx) {
    const name = document.getElementById(`edit-pres-name-${idx}`).value.trim();
    const categoria = document.getElementById(`edit-pres-cat-${idx}`).value;
    const descricao = document.getElementById(`edit-pres-desc-${idx}`).value.trim();
    const price = parseFloat(document.getElementById(`edit-pres-price-${idx}`).value);
    const fileInput = document.getElementById(`edit-pres-foto-${idx}`);

    const { data: currentProd } = await _supabase.from('produtos').select('image_url').eq('id', id).single();
    let imageUrl = currentProd ? currentProd.image_url : '';

    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const fileName = `pres_${id}_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await _supabase.storage.from('produtos').upload(fileName, file);
      if (!uploadError) {
        const { data: publicUrlData } = _supabase.storage.from('produtos').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }
    }
    await _supabase.from('produtos').update({ name, categoria, descricao, price, image_url: imageUrl }).eq('id', id);
    alert("Presente atualizado!");
    carregarTabelaPresentesAdmin();
  }

  async function inserirNovoDocinho() {
    const id = document.getElementById('doc-id').value.trim();
    const name = document.getElementById('doc-nome').value.trim();
    const price = parseFloat(document.getElementById('doc-preco').value);
    const categoria = document.getElementById('doc-categoria').value;
    const descricao = document.getElementById('doc-descricao').value.trim();
    const fileInput = document.getElementById('doc-foto');

    if (!id || !name || isNaN(price)) { alert("Preencha os campos."); return; }
    let imageUrl = '';
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const filePath = `doc_${Date.now()}_${file.name}`;
      const { error: uploadErr } = await _supabase.storage.from('produtos').upload(filePath, file);
      if (!uploadErr) {
        const { data } = _supabase.storage.from('produtos').getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      }
    }
    await _supabase.from('produtos').insert([{ id, name, price, limite: 999999, vendidos: 0, categoria, descricao, image_url: imageUrl }]);
    alert("Docinho cadastrado!");
    carregarTabelaDocinhosAdmin();
  }

  async function salvarDocinhoLinha(id, idx) {
    const name = document.getElementById(`edit-doc-name-${idx}`).value.trim();
    const descricao = document.getElementById(`edit-doc-desc-${idx}`).value.trim();
    const price = parseFloat(document.getElementById(`edit-doc-price-${idx}`).value);
    const fileInput = document.getElementById(`edit-doc-foto-${idx}`);

    const { data: currentProd } = await _supabase.from('produtos').select('image_url').eq('id', id).single();
    let imageUrl = currentProd ? currentProd.image_url : '';

    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const fileName = `doc_${id}_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await _supabase.storage.from('produtos').upload(fileName, file);
      if (!uploadError) {
        const { data: publicUrlData } = _supabase.storage.from('produtos').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }
    }
    await _supabase.from('produtos').update({ name, descricao, price, image_url: imageUrl }).eq('id', id);
    alert("Docinho atualizado!");
    carregarTabelaDocinhosAdmin();
  }

  // MODAL DE CRIAÇÃO/EDIÇÃO DE PRODUTO
  function abrirModalNovoProduto() {
    document.getElementById('modal-produto-titulo').innerText = 'Adicionar Novo Produto';
    document.getElementById('form-prod-modo').value = 'novo';
    document.getElementById('form-prod-id-original').value = '';
    document.getElementById('form-prod-id').value = '';
    document.getElementById('form-prod-id').removeAttribute('readonly');
    document.getElementById('form-prod-nome').value = '';
    document.getElementById('form-prod-preco').value = '';
    document.getElementById('form-prod-categoria').value = 'Tradicionais';
    document.getElementById('form-prod-limite').value = '20';
    document.getElementById('form-prod-descricao').value = '';
    document.getElementById('form-prod-novidade').checked = false;
    document.getElementById('form-prod-foto').value = '';
    document.getElementById('modal-produto-form').classList.add('open');
  }

  function abrirModalEditarProduto(idProduto) {
    const prod = produtosCardapio.find(p => p.id === idProduto);
    if (!prod) return;

    document.getElementById('modal-produto-titulo').innerText = 'Editar Produto';
    document.getElementById('form-prod-modo').value = 'editar';
    document.getElementById('form-prod-id-original').value = prod.id;
    document.getElementById('form-prod-id').value = prod.id;
    document.getElementById('form-prod-id').setAttribute('readonly', true);
    document.getElementById('form-prod-nome').value = prod.name;
    document.getElementById('form-prod-preco').value = prod.price;
    document.getElementById('form-prod-categoria').value = prod.categoria || 'Tradicionais';
    document.getElementById('form-prod-limite').value = prod.limite;
    document.getElementById('form-prod-descricao').value = prod.descricao || '';
    document.getElementById('form-prod-novidade').checked = !!prod.eh_novidade;
    document.getElementById('form-prod-foto').value = '';
    document.getElementById('modal-produto-form').classList.add('open');
  }

  function fecharModalProdutoForm() {
    document.getElementById('modal-produto-form').classList.remove('open');
  }

  async function salvarProdutoModalForm() {
    const modo = document.getElementById('form-prod-modo').value;
    const idOriginal = document.getElementById('form-prod-id-original').value;
    const id = document.getElementById('form-prod-id').value.trim().toLowerCase().replace(/\s+/g, '_');
    const name = document.getElementById('form-prod-nome').value.trim();
    const price = parseFloat(document.getElementById('form-prod-preco').value);
    const limite = parseInt(document.getElementById('form-prod-limite').value);
    const categoria = document.getElementById('form-prod-categoria').value.trim();
    const descricao = document.getElementById('form-prod-descricao').value.trim();
    const ehNovidade = document.getElementById('form-prod-novidade').checked;
    const fileInput = document.getElementById('form-prod-foto');

    if (!id || !name || isNaN(price) || isNaN(limite)) {
      alert("Preencha todos os campos obrigatórios corretamente.");
      return;
    }

    let imageUrl = '';
    if (modo === 'editar') {
      const prodAntigo = produtosCardapio.find(p => p.id === idOriginal);
      imageUrl = prodAntigo ? (prodAntigo.image_url || prodAntigo.image) : '';
    }

    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const fileName = `${id}_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await _supabase.storage.from('produtos').upload(fileName, file);
      if (!uploadError) {
        const { data: publicUrlData } = _supabase.storage.from('produtos').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }
    }

    if (modo === 'novo') {
      const { error } = await _supabase.from('produtos').insert([{
        id, name, price, limite, vendidos: 0, categoria: categoria || 'Tradicionais', descricao, eh_novidade: ehNovidade, image_url: imageUrl
      }]);
      if (error) { alert("Erro ao cadastrar: " + error.message); return; }
      alert("Produto cadastrado com sucesso!");
    } else {
      const { error } = await _supabase.from('produtos').update({
        name, price, limite, categoria: categoria || 'Tradicionais', descricao, eh_novidade: ehNovidade, image_url: imageUrl
      }).eq('id', idOriginal);
      if (error) { alert("Erro ao atualizar: " + error.message); return; }
      alert("Produto atualizado com sucesso!");
    }

    fecharModalProdutoForm();
    await carregarCardapioNuvem();
    carregarTabelaAdmin();
  }

  async function deletarProduto(idProduto) {
    if (!confirm("Deseja realmente excluir este produto?")) return;
    await _supabase.from('produtos').delete().eq('id', idProduto);
    await carregarCardapioNuvem();
    carregarTabelaAdmin();
  }

  let filtroEstoqueAtual = '';

  function abrirModalSelecionarProdutoEdicao() {
    const modal = document.getElementById('modal-selecionar-produto-edicao');
    const input = document.getElementById('editar-produto-pesquisa');
    if (!modal || !input) return;

    modal.classList.add('open');
    input.value = '';
    renderizarResultadosProdutosEdicao('');
    setTimeout(() => input.focus(), 50);
  }

  function fecharModalSelecionarProdutoEdicao() {
    const modal = document.getElementById('modal-selecionar-produto-edicao');
    if (modal) modal.classList.remove('open');
  }

  function filtrarProdutosParaEdicao(valor) {
    renderizarResultadosProdutosEdicao(String(valor || '').trim().toLowerCase());
  }

  function renderizarResultadosProdutosEdicao(filtro = '') {
    const container = document.getElementById('editar-produto-resultados');
    if (!container) return;

    const termo = String(filtro || '').trim().toLowerCase();
    const resultados = produtosCardapio.filter(prod => {
      if (!termo) return true;
      const texto = `${prod.name} ${prod.id} ${prod.categoria || ''}`.toLowerCase();
      return texto.includes(termo);
    });

    if (!resultados.length) {
      container.innerHTML = `<div class="editar-produto-empty"><i class="fa-solid fa-box-open" style="font-size:1.5rem;color:var(--ouro);margin-bottom:8px;"></i><br>Nenhum produto encontrado.</div>`;
      return;
    }

    container.innerHTML = resultados.map(prod => `
      <button type="button" class="editar-produto-result" onclick="selecionarProdutoParaEdicao('${String(prod.id).replace(/'/g, "\\'")}')">
        <img src="${prod.image || 'images/amor.jpeg'}" alt="">
        <div class="editar-produto-result-info">
          <div class="editar-produto-result-name">${prod.name}</div>
          <div class="editar-produto-result-meta">${prod.id} · ${prod.categoria || 'Tradicionais'} · R$ ${Number(prod.price || 0).toFixed(2)}</div>
        </div>
        <span class="editar-produto-result-action"><i class="fa-solid fa-pen"></i> Editar</span>
      </button>
    `).join('');
  }

  function selecionarProdutoParaEdicao(idProduto) {
    const prod = produtosCardapio.find(p => p.id === idProduto);
    if (!prod) return;
    fecharModalSelecionarProdutoEdicao();
    abrirModalEditarProduto(prod.id);
  }

  function filtrarTabelaEstoque(valor) {
    filtroEstoqueAtual = String(valor || '').trim().toLowerCase();
    carregarTabelaAdmin(false);
  }

  function carregarTabelaAdmin(reiniciarFerramentas = true) {
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;

    const produtosFiltrados = produtosCardapio.filter(prod => {
      if (!filtroEstoqueAtual) return true;
      const texto = `${prod.name} ${prod.id} ${prod.categoria || ''}`.toLowerCase();
      return texto.includes(filtroEstoqueAtual);
    });

    tbody.innerHTML = '';

    produtosFiltrados.forEach(prod => {
      const disponivel = Math.max(0, (Number(prod.limite) || 0) - (Number(prod.vendidos) || 0));
      tbody.innerHTML += `
        <tr data-produto-id="${prod.id}" data-produto-busca="${String(`${prod.name} ${prod.id} ${prod.categoria || ''}`).toLowerCase()}">
          <td><img src="${prod.image}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;"></td>
          <td>
            <div style="font-weight: 600; color: var(--creme);">${prod.name}</div>
            <small style="color: var(--ouro);">${prod.id}</small>
          </td>
          <td>${prod.categoria || 'Tradicionais'}</td>
          <td>R$ ${Number(prod.price || 0).toFixed(2)}</td>
          <td><b>${prod.limite} un.</b></td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="number" id="repor-qtd-${prod.id}" class="admin-input-qtd" value="0" min="0" title="Quantidade para somar ao limite atual">
              <span style="font-size: 0.75rem; color: var(--creme-dim);">(soma ao atual)</span>
            </div>
          </td>
          <td><span style="color: #2ecc71; font-weight: bold; font-size: 0.95rem;">${disponivel} un.</span></td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button class="btn-sm btn-delete" onclick="deletarProduto('${prod.id}')" title="Excluir">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    });

    const contador = document.getElementById('estoque-result-count');
    if (contador) {
      contador.textContent = `${produtosFiltrados.length} de ${produtosCardapio.length} produto${produtosCardapio.length === 1 ? '' : 's'} exibido${produtosFiltrados.length === 1 ? '' : 's'}`;
    }
  }

  async function salvarTodosLimites() {
    if (!confirm("Deseja aplicar as reposições de estoque informadas somando aos limites atuais?")) return;
    
    for (const prod of produtosCardapio) {
      const reporInput = document.getElementById(`repor-qtd-${prod.id}`);
      if (reporInput) {
        let qtdSomar = parseInt(reporInput.value) || 0;
        if (qtdSomar > 0) {
          let novoLimite = (Number(prod.limite) || 0) + qtdSomar;
          await _supabase.from('produtos').update({ limite: novoLimite }).eq('id', prod.id);
        }
      }
    }
    await carregarCardapioNuvem();
    carregarTabelaAdmin();
    alert("Reposições de estoque aplicadas com sucesso!");
  }

  async function carregarListaPedidosAdmin() {
    await carregarPedidosNuvem();
    const container = document.getElementById('lista-pedidos-admin');
    if (!container) return;
    container.innerHTML = '';
    const hojeIso = new Date().toISOString().split('T')[0];

    const pedidosFiltrados = listaPedidos.filter(pedido => {
      const dataAgendadaPedido = pedido.dataAgendada || hojeIso;
      if (dataEspecificaFiltro) return dataAgendadaPedido === dataEspecificaFiltro;
      if (filtroPedidosAtual === 'hoje') return dataAgendadaPedido === hojeIso;
      else return dataAgendadaPedido < hojeIso;
    });

    if (pedidosFiltrados.length === 0) { container.innerHTML = `<p style="text-align:center; color:var(--creme-dim); padding: 20px;">Nenhum pedido encontrado.</p>`; return; }

    [...pedidosFiltrados].reverse().forEach((pedido) => {
      let itensStr = pedido.itens.map(i => `${i.quantity}x ${i.name} ${i.obs ? '('+i.obs+')' : ''}`).join(', ');
      if (pedido.frete > 0) itensStr += ` + Frete (R$ ${pedido.frete.toFixed(2)})`;
      let badgeClass = pedido.status === 'aguardando' ? 'status-aguardando' : (pedido.status === 'preparo' ? 'status-preparo' : 'status-pronto');
      let statusLabel = pedido.status === 'aguardando' ? 'Aguardando' : (pedido.status === 'preparo' ? 'Preparo' : 'Pronto');

      container.innerHTML += `
        <div class="pedido-card-admin" id="pedido-admin-${pedido.id}">
          <div class="pedido-info" style="flex: 1;">
            <h4>${pedido.cliente} (${pedido.whatsapp || 'N/A'}) - ${pedido.hora} <span class="badge-status ${badgeClass}">${statusLabel}</span></h4>
            <p><b>Data / Agendamento:</b> ${pedido.data}</p>
            <p><b>Itens:</b> ${itensStr}</p>
            <p><b>Total:</b> ${pedido.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${pedido.pagamento} / ${pedido.entrega})</p>
            <p style="color: var(--ouro);">📍 ${pedido.endereco || 'Retirada'}</p>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <button class="btn-sm" style="background: var(--ouro); color: var(--carvao);" onclick="abrirModalDetalhesPedido('${pedido.id}')">📦 Ver Itens / Check</button>
            <button class="btn-sm" style="background: #9b59b6; color: white;" onclick="abrirModalEditarPedido('${pedido.id}')">✏️ Editar</button>
            <button class="btn-sm" style="background: #25d366; color: white;" onclick="reenviarPedidoWhatsapp('${pedido.id}')">💬 Reenviar</button>
            <button class="btn-sm" style="background: #f39c12; color: #170a0d;" onclick="alterarStatusPedido('${pedido.id}', 'aguardando')">Aguardando</button>
            <button class="btn-sm" style="background: #3498db; color: white;" onclick="alterarStatusPedido('${pedido.id}', 'preparo')">Preparo</button>
            <button class="btn-sm" style="background: #2ecc71; color: #170a0d;" onclick="alterarStatusPedido('${pedido.id}', 'pronto')">Pronto</button>
            <button class="btn-sm btn-cancel" onclick="cancelarPedidoInteiro('${pedido.id}')">❌</button>
          </div>
        </div>
      `;
    });
  }

  async function alterarStatusPedido(idPedido, novoStatus) {
    const pedido = listaPedidos.find(p => p.id === idPedido);
    if (pedido) {
      pedido.status = novoStatus;
      await _supabase.from('pedidos').update({ status: novoStatus }).eq('id_pedido', idPedido);
      carregarListaPedidosAdmin();
      atualizarMetricasOverview();
      if (pedido.whatsapp) {
        let telefoneLimpo = pedido.whatsapp.replace(/\D/g, '');
        if (!telefoneLimpo.startsWith('55')) telefoneLimpo = '55' + telefoneLimpo;
        const saudacao = pedido.cliente ? `Olá, *${pedido.cliente}*! ` : 'Olá! ';
        let msg = novoStatus === 'aguardando' 
          ? `${saudacao}Recebemos o seu pedido com sucesso. Assim que o pagamento for confirmado, ele entrará em produção! 🤎` 
          : (novoStatus === 'preparo' ? `Seu pedido entrou *Em Preparo* 🤎` : `Seu pedido está *Pronto*! ✨`);
        window.open(`https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    }
  }

  async function cancelarPedidoInteiro(idPedido) {
    if (!confirm("Cancelar pedido?")) return;
    const index = listaPedidos.findIndex(p => p.id === idPedido);
    if (index > -1) {
      await _supabase.from('pedidos').delete().eq('id_pedido', idPedido);
      listaPedidos.splice(index, 1);
      carregarListaPedidosAdmin();
      atualizarMetricasOverview();
    }
  }

  function fecharAdmin() { document.getElementById('admin-modal-overlay').classList.remove('open'); }

  async function gerarRelatorioPDF() {
    await carregarPedidosNuvem();
    if (listaPedidos.length === 0) { alert("Nenhum pedido."); return; }
    let faturamento = 0;
    let linhas = '';
    [...listaPedidos].reverse().forEach((p, idx) => {
      faturamento += p.total;
      linhas += `<tr><td>#${idx + 1}</td><td>${p.cliente}</td><td>${p.itens.map(i=>i.quantity+'x '+i.name).join(', ')}</td><td><b>${p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></td></tr>`;
    });
    document.getElementById('relatorio-print-area').innerHTML = `<h2>Relatório Geral</h2><table class="print-table"><thead><tr><th>#</th><th>Cliente</th><th>Itens</th><th>Total</th></tr></thead><tbody>${linhas}</tbody></table><p><b>Total Faturado:</b> ${faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>`;
    window.print();
  }

  let cart = [];
  let taxaEntrega = 0;
  const tabelaFrete = { "Cará-Cará": 10.00, "Uvaranas": 12.00, "Centro": 15.00, "Oficinas": 12.00, "Estrela": 15.00, "Jardim Carvalho": 15.00, "Contorno": 18.00, "Nova Rússia": 15.00, "Neves": 15.00, "Olarias": 12.00, "Boa Vista": 20.00, "Órfãs": 15.00 };
  const taxaPadrao = 18.00;

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
    const orderDateInput = document.getElementById('order-date');
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
    const codigo = document.getElementById('coupon-code').value.trim().toUpperCase();
    const msgEl = document.getElementById('coupon-msg');
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
    const container = document.getElementById('flavor-list-container');
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
    document.getElementById('custom-modal-overlay').classList.add('open');
  }

  function mudarQtdSaborCaixa(sabor, delta) {
    let total = Object.values(saboresCaixaTemp).reduce((a, b) => a + b, 0);
    if (delta > 0) {
      if (total >= 6) { alert("⚠️ 6 morangos já atingidos!"); return; }
      saboresCaixaTemp[sabor]++;
    } else {
      if (saboresCaixaTemp[sabor] > 0) saboresCaixaTemp[sabor]--;
    }
    document.getElementById(`qtd-sabor-${sabor}`).innerText = saboresCaixaTemp[sabor];
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
    document.getElementById('flavor-count-status').innerText = `Restantes: ${6 - total}`;
    document.getElementById('flavor-price-preview').innerText = `Preço: R$ ${calcularPrecoCaixaTemp().toFixed(2)}`;
  }

  function fecharModalCaixa() { document.getElementById('custom-modal-overlay').classList.remove('open'); }

  function confirmarCaixaMista() {
    let total = Object.values(saboresCaixaTemp).reduce((a, b) => a + b, 0);
    if (total !== 6) { alert("⚠️ Escolha exatamente 6 sabores!"); return; }
    let obsSabores = Object.entries(saboresCaixaTemp).filter(([n, q]) => q > 0).map(([n, q]) => `${q}x ${n}`).join(', ');
    const prod = produtosCardapio.find(p => p.id === 'caixa_mista');
    
    cart.push({ id: prod.id, name: prod.name, price: calcularPrecoCaixaTemp(), quantity: 1, obs: `Sabores: ${obsSabores}`, saboresDetalhados: { ...saboresCaixaTemp }, feito: false });
    fecharModalCaixa();

    const dataMinimaCarrinho = obterDataMinimaEncomenda();
    const orderDateInput = document.getElementById('order-date');
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

  function toggleDeliveryForm() {
    const isEntrega = document.querySelector('input[name="delivery-option"]:checked').value === "Entrega";
    document.getElementById('address-container').style.display = isEntrega ? 'block' : 'none';
    document.getElementById('cart-delivery-row').style.display = isEntrega ? 'flex' : 'none';
    document.getElementById('opt-dinheiro').style.display = isEntrega ? 'none' : 'block';
    if (!isEntrega) taxaEntrega = 0;
    updateCartUI();
  }

  async function buscarCEP() {
    let cep = document.getElementById('cep').value.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (data.erro) { alert("CEP não encontrado."); return; }
        document.getElementById('rua').value = data.logradouro;
        document.getElementById('bairro').value = data.bairro;
        calcularTaxa(data.bairro);
        document.getElementById('numero').focus();
      } catch(e) {}
    }
  }

  function calcularTaxa(bairro) {
    let matched = false;
    for (const [b, t] of Object.entries(tabelaFrete)) {
      if (bairro.toLowerCase().includes(b.toLowerCase())) { taxaEntrega = t; matched = true; break; }
    }
    if (!matched) taxaEntrega = taxaPadrao;
    document.getElementById('cart-delivery-value').innerText = taxaEntrega.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    updateCartUI();
  }

  function updateCartUI() {
    const itemsContainer = document.getElementById('cart-items');
    if (!itemsContainer) return;
    itemsContainer.innerHTML = '';
    let subtotal = 0, totalItems = 0;

    if (cart.length === 0) {
      itemsContainer.innerHTML = '<p class="cart-empty">Carrinho vazio.</p>';
      document.getElementById('cart-form').style.display = 'none';
      document.getElementById('cart-coupon-section').style.display = 'none';
      taxaEntrega = 0; cupomAplicado = null;
    } else {
      document.getElementById('cart-form').style.display = 'block';
      document.getElementById('cart-coupon-section').style.display = 'block';
      cart.forEach((item, index) => {
        subtotal += item.price * item.quantity;
        totalItems += item.quantity;
        itemsContainer.innerHTML += `
          <div class="cart-item">
            <div class="cart-item-info">
              <h4>${item.name}</h4>
              ${item.obs ? `<small class="cart-item-obs">${item.obs}</small>` : ''}
              <div class="cart-item-price">${(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
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
      document.getElementById('cart-discount-row').style.display = 'flex';
      document.getElementById('cart-discount-value').innerText = `- ${desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
      document.getElementById('coupon-name-display').innerText = cupomAplicado.codigo;
    } else {
      document.getElementById('cart-discount-row').style.display = 'none';
    }

    let final = (subtotal - desconto) + taxaEntrega;
    document.getElementById('cart-subtotal-value').innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('cart-total-value').innerText = final.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const badge = document.getElementById('cart-badge');
    badge.innerText = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
  }

  function toggleCart(open) {
    document.getElementById('cart-sidebar').classList.toggle('open', open);
    document.getElementById('cart-overlay').classList.toggle('open', open);
  }

  function resetCart() {
    cart = []; taxaEntrega = 0; cupomAplicado = null;
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-whatsapp').value = '';
    const emailEl = document.getElementById('customer-email');
    if (emailEl) emailEl.value = '';
    document.getElementById('cart-items').style.display = 'block';
    document.getElementById('cart-form').style.display = 'block';
    document.getElementById('cart-footer').style.display = 'block';
    document.getElementById('cart-success').style.display = 'none';
    updateCartUI();
    toggleCart(false);
  }

  function checkoutWhatsapp() {
    const customerName = document.getElementById('customer-name').value.trim();
    const customerWhatsapp = document.getElementById('customer-whatsapp').value.trim();
    const orderDateInput = document.getElementById('order-date').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const deliveryOption = document.querySelector('input[name="delivery-option"]:checked').value;

    if (!customerName || !customerWhatsapp) { alert("Preencha nome e WhatsApp."); return; }
    if (cart.length === 0) { alert("Seu carrinho está vazio."); return; }

    if (deliveryOption === "Entrega") {
      const rua = document.getElementById('rua').value;
      const numero = document.getElementById('numero').value;
      if (!rua || !numero) { alert("Preencha endereço completo."); return; }
    }

    // Formatar data para exibição
    let dataExibicao = 'Hoje';
    if (orderDateInput) {
      const partes = orderDateInput.split('-');
      if (partes.length === 3) {
        dataExibicao = `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
    }

    // Calcular totais para exibição
    let subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    let desconto = cupomAplicado ? (cupomAplicado.tipo === 'percentual' ? (subtotal * cupomAplicado.valor)/100 : cupomAplicado.valor) : 0;
    if (desconto > subtotal) desconto = subtotal;
    const valorFinal = (subtotal - desconto) + taxaEntrega;

    // Preencher data agendada
    document.getElementById('confirm-data-valor').innerText = dataExibicao;

    // Preencher itens
    const itensHtml = cart.map(i => `
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
    document.getElementById('confirm-pedido-itens').innerHTML = itensHtml;

    // Desconto
    const descontoRow = document.getElementById('confirm-pedido-desconto');
    if (cupomAplicado && desconto > 0) {
      descontoRow.style.display = 'flex';
      document.getElementById('confirm-desconto-valor').innerText = `- ${desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    } else {
      descontoRow.style.display = 'none';
    }

    // Frete
    const freteRow = document.getElementById('confirm-pedido-frete');
    if (taxaEntrega > 0) {
      freteRow.style.display = 'flex';
      document.getElementById('confirm-frete-valor').innerText = taxaEntrega.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else {
      freteRow.style.display = 'none';
    }

    // Total
    document.getElementById('confirm-total-valor').innerText = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Entrega info
    let entregaInfo = `<b>👤 ${customerName}</b> · ${paymentMethod}`;
    if (deliveryOption === 'Entrega') {
      const rua = document.getElementById('rua').value;
      const numero = document.getElementById('numero').value;
      const bairro = document.getElementById('bairro').value;
      entregaInfo += `<br>🛵 Entrega: ${rua}, ${numero} - ${bairro}`;
    } else {
      entregaInfo += `<br>📍 Retirada no Local`;
    }
    document.getElementById('confirm-pedido-entrega').innerHTML = entregaInfo;

    // Abrir modal
    document.getElementById('modal-confirmar-pedido').classList.add('open');
  }

  function fecharModalConfirmacao() {
    document.getElementById('modal-confirmar-pedido').classList.remove('open');
  }

  async function confirmarEEnviarWhatsapp() {
    fecharModalConfirmacao();

    const customerName = document.getElementById('customer-name').value.trim();
    const customerWhatsapp = document.getElementById('customer-whatsapp').value.trim();
    const customerEmail = document.getElementById('customer-email') ? document.getElementById('customer-email').value.trim() : '';
    const orderDateInput = document.getElementById('order-date').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const deliveryOption = document.querySelector('input[name="delivery-option"]:checked').value;
    const deliveryObs = document.getElementById('delivery-obs').value.trim();

    let enderecoCompleto = "Retirada no Local";
    if (deliveryOption === "Entrega") {
      const rua = document.getElementById('rua').value;
      const numero = document.getElementById('numero').value;
      const bairro = document.getElementById('bairro').value;
      enderecoCompleto = `${rua}, ${numero} - ${bairro}`;
    }

    for (const item of cart) {
      const p = produtosCardapio.find(prod => prod.id === item.id);
      if (p) { p.vendidos += item.quantity; await atualizarEstoqueSupabase(p.id, p.vendidos); }
    }

    let subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
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
      itens: cart, 
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
    const { error } = await _supabase.from('pedidos').insert([novoPedido]);
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
          email: customerEmail,
          itens: cart,
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
    cart.forEach(i => { text += `- ${i.quantity}x ${i.name} ${i.obs ? '('+i.obs+')' : ''}\n`; });
    if (taxaEntrega > 0) text += `- Taxa de Entrega: R$ ${taxaEntrega.toFixed(2)}\n`;
    text += `\n*TOTAL: ${valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\nPagamento: ${paymentMethod}`;

    window.open(`https://wa.me/${APP_CONFIG.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
    document.getElementById('cart-items').style.display = 'none';
    document.getElementById('cart-form').style.display = 'none';
    document.getElementById('cart-footer').style.display = 'none';
    document.getElementById('cart-success').style.display = 'flex';
  }
