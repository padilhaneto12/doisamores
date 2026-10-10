/* Configurações centrais do sistema — ajuste aqui regras globais. */
const APP_CONFIG = Object.freeze({
  antecedenciaEncomendaDias: 1,
  whatsapp: '554299894838',
  moeda: 'BRL',
  locale: 'pt-BR'
});



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
    const textEl = $('review-text-content');
    const authorEl = $('review-author-name');
    const counterEl = $('review-counter');
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

    const inputData = $('order-date');
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
    const manualData = $('manual-data');
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
    const sidebar = $('admin-sidebar-mobile');
    if (sidebar) {
      sidebar.classList.toggle('mobile-open');
    }
  }

  async function carregarStatusLojaNuvem() {
    const { data, error } = await db.from(DB_TABLES.CONFIGURACOES).select('valor').eq('chave', 'status_loja_manual').single();
    if (!error && data) {
      if (data.valor === 'true') statusManualLoja = true;
      else if (data.valor === 'false') statusManualLoja = false;
      else statusManualLoja = null;
    }
    verificarFuncionamento();
  }

  async function carregarModoEncomendaNuvem() {
    const { data, error } = await db.from(DB_TABLES.CONFIGURACOES).select('valor').eq('chave', 'apenas_encomenda').single();
    if (!error && data) {
      apenasEncomendaAtivo = (data.valor === 'true');
      atualizarDisplayEncomenda();
    }
  }

  async function carregarAvaliadoresNuvem() {
    const { data, error } = await db.from(DB_TABLES.CONFIGURACOES).select('valor').eq('chave', 'avaliadores_google').single();
    if (!error && data && data.valor) {
      try {
        listaAvaliadoresGoogle = JSON.parse(data.valor);
      } catch(e) {
        listaAvaliadoresGoogle = data.valor.split('\n').map(s => s.trim()).filter(Boolean);
      }
    }
    const textarea = $('input-lista-avaliadores');
    if (textarea) {
      textarea.value = listaAvaliadoresGoogle.join('\n');
    }
  }

  async function salvarListaAvaliadores() {
    const textarea = $('input-lista-avaliadores');
    if (!textarea) return;
    const linhas = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
    listaAvaliadoresGoogle = linhas;
    const valorJson = JSON.stringify(linhas);

    const { error } = await db.from(DB_TABLES.CONFIGURACOES).upsert([
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
    const dot = $('admin-encomenda-dot');
    const label = $('admin-encomenda-label');
    const btn = $('btn-toggle-encomenda');

    if (dot && label && btn) {
      dot.style.background = apenasEncomendaAtivo ? '#2ecc71' : '#e74c3c';
      label.innerText = apenasEncomendaAtivo ? `Ativo (Encomendas a partir de ${APP_CONFIG.antecedenciaEncomendaDias} dia)` : "Desativado (Funcionamento normal)";
      btn.innerText = apenasEncomendaAtivo ? "Desativar Encomenda" : "Ativar Encomenda";
    }

    const novaDataMin = obterDataMinimaEncomenda();
    const inputData = $('order-date');
    if (inputData) {
      inputData.min = novaDataMin;
      if (!inputData.value || inputData.value < novaDataMin) inputData.value = novaDataMin;
    }
    const manualData = $('manual-data');
    if (manualData) {
      manualData.min = novaDataMin;
      if (!manualData.value || manualData.value < novaDataMin) manualData.value = novaDataMin;
    }
    const avisoTag = $('encomenda-aviso-tag');
    if (avisoTag) {
      avisoTag.style.display = apenasEncomendaAtivo ? 'inline' : 'none';
    }
  }

  async function alternarModoEncomenda() {
    apenasEncomendaAtivo = !apenasEncomendaAtivo;
    let valorStr = String(apenasEncomendaAtivo);

    const { error } = await db.from(DB_TABLES.CONFIGURACOES).update({ valor: valorStr }).eq('chave', 'apenas_encomenda');
    if (error) {
      alert("Erro ao atualizar o modo encomenda.");
      return;
    }

    atualizarDisplayEncomenda();
    alert(apenasEncomendaAtivo ? `Modo 'Apenas por Encomenda' ativado com sucesso! Agendamentos com antecedência mínima de ${APP_CONFIG.antecedenciaEncomendaDias} dia.` : "Modo normal restabelecido.");
  }

  function verificarFuncionamento() {
    const statusContainer = $('status-loja');
    const statusText = $('status-text');
    const adminLabel = $('admin-status-label');
    const adminDot = $('admin-status-dot');

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
    await db.from(DB_TABLES.CONFIGURACOES).update({ valor: valorStr }).eq('chave', 'status_loja_manual');
    verificarFuncionamento();
  }

