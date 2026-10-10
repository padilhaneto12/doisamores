  async function carregarTabelaDocinhosAdmin() {
    const { data, error } = await db.from(DB_TABLES.PRODUTOS).select('*').like('categoria', 'Docinho%');
    const tbody = $('admin-docinhos-tbody');
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
    const { data, error } = await db.from(DB_TABLES.PRODUTOS).select('*').or('categoria.ilike.pais,categoria.ilike.amor,categoria.ilike.Para Presentear');
    const tbody = $('admin-presentes-tbody');
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
    const id = $('pres-id').value.trim();
    const name = $('pres-nome').value.trim();
    const price = parseFloat($('pres-preco').value);
    const categoria = $('pres-categoria').value;
    const descricao = $('pres-descricao').value.trim();
    const fileInput = $('pres-foto');

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
    await db.from(DB_TABLES.PRODUTOS).insert([{ id, name, price, limite: 999999, vendidos: 0, categoria, descricao, image_url: imageUrl }]);
    alert("Presente cadastrado!");
    carregarTabelaPresentesAdmin();
  }

  async function salvarPresenteLinha(id, idx) {
    const name = $(`edit-pres-name-${idx}`).value.trim();
    const categoria = $(`edit-pres-cat-${idx}`).value;
    const descricao = $(`edit-pres-desc-${idx}`).value.trim();
    const price = parseFloat($(`edit-pres-price-${idx}`).value);
    const fileInput = $(`edit-pres-foto-${idx}`);

    const { data: currentProd } = await db.from(DB_TABLES.PRODUTOS).select('image_url').eq('id', id).single();
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
    await db.from(DB_TABLES.PRODUTOS).update({ name, categoria, descricao, price, image_url: imageUrl }).eq('id', id);
    alert("Presente atualizado!");
    carregarTabelaPresentesAdmin();
  }

  async function inserirNovoDocinho() {
    const id = $('doc-id').value.trim();
    const name = $('doc-nome').value.trim();
    const price = parseFloat($('doc-preco').value);
    const categoria = $('doc-categoria').value;
    const descricao = $('doc-descricao').value.trim();
    const fileInput = $('doc-foto');

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
    await db.from(DB_TABLES.PRODUTOS).insert([{ id, name, price, limite: 999999, vendidos: 0, categoria, descricao, image_url: imageUrl }]);
    alert("Docinho cadastrado!");
    carregarTabelaDocinhosAdmin();
  }

  async function salvarDocinhoLinha(id, idx) {
    const name = $(`edit-doc-name-${idx}`).value.trim();
    const descricao = $(`edit-doc-desc-${idx}`).value.trim();
    const price = parseFloat($(`edit-doc-price-${idx}`).value);
    const fileInput = $(`edit-doc-foto-${idx}`);

    const { data: currentProd } = await db.from(DB_TABLES.PRODUTOS).select('image_url').eq('id', id).single();
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
    await db.from(DB_TABLES.PRODUTOS).update({ name, descricao, price, image_url: imageUrl }).eq('id', id);
    alert("Docinho atualizado!");
    carregarTabelaDocinhosAdmin();
  }

  // MODAL DE CRIAÇÃO/EDIÇÃO DE PRODUTO
  function abrirModalNovoProduto() {
    $('modal-produto-titulo').innerText = 'Adicionar Novo Produto';
    $('form-prod-modo').value = 'novo';
    $('form-prod-id-original').value = '';
    $('form-prod-id').value = '';
    $('form-prod-id').removeAttribute('readonly');
    $('form-prod-nome').value = '';
    $('form-prod-preco').value = '';
    $('form-prod-categoria').value = 'Tradicionais';
    $('form-prod-limite').value = '20';
    $('form-prod-descricao').value = '';
    $('form-prod-novidade').checked = false;
    $('form-prod-foto').value = '';
    $('modal-produto-form').classList.add('open');
  }

  function abrirModalEditarProduto(idProduto) {
    const prod = produtosCardapio.find(p => p.id === idProduto);
    if (!prod) return;

    $('modal-produto-titulo').innerText = 'Editar Produto';
    $('form-prod-modo').value = 'editar';
    $('form-prod-id-original').value = prod.id;
    $('form-prod-id').value = prod.id;
    $('form-prod-id').setAttribute('readonly', true);
    $('form-prod-nome').value = prod.name;
    $('form-prod-preco').value = prod.price;
    $('form-prod-categoria').value = prod.categoria || 'Tradicionais';
    $('form-prod-limite').value = prod.limite;
    $('form-prod-descricao').value = prod.descricao || '';
    $('form-prod-novidade').checked = !!prod.eh_novidade;
    $('form-prod-foto').value = '';
    $('modal-produto-form').classList.add('open');
  }

  function fecharModalProdutoForm() {
    $('modal-produto-form').classList.remove('open');
  }

  async function salvarProdutoModalForm() {
    const modo = $('form-prod-modo').value;
    const idOriginal = $('form-prod-id-original').value;
    const id = $('form-prod-id').value.trim().toLowerCase().replace(/\s+/g, '_');
    const name = $('form-prod-nome').value.trim();
    const price = parseFloat($('form-prod-preco').value);
    const limite = parseInt($('form-prod-limite').value);
    const categoria = $('form-prod-categoria').value.trim();
    const descricao = $('form-prod-descricao').value.trim();
    const ehNovidade = $('form-prod-novidade').checked;
    const fileInput = $('form-prod-foto');

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
      const { error } = await db.from(DB_TABLES.PRODUTOS).insert([{
        id, name, price, limite, vendidos: 0, categoria: categoria || 'Tradicionais', descricao, eh_novidade: ehNovidade, image_url: imageUrl
      }]);
      if (error) { alert("Erro ao cadastrar: " + error.message); return; }
      alert("Produto cadastrado com sucesso!");
    } else {
      const { error } = await db.from(DB_TABLES.PRODUTOS).update({
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
    await db.from(DB_TABLES.PRODUTOS).delete().eq('id', idProduto);
    await carregarCardapioNuvem();
    carregarTabelaAdmin();
  }

  async function esgotarProduto(idProduto) {
    const produto = produtosCardapio.find(prod => prod.id === idProduto);
    if (!produto) return;
    if (!confirm(`Deseja marcar "${produto.name}" como esgotado?`)) return;

    const { error } = await db.from(DB_TABLES.PRODUTOS)
      .update({ limite: Number(produto.vendidos) || 0 })
      .eq('id', idProduto);
    if (error) {
      alert("Erro ao esgotar produto: " + error.message);
      return;
    }

    await carregarCardapioNuvem();
    carregarTabelaAdmin();
  }

  let filtroEstoqueAtual = '';

  function abrirModalSelecionarProdutoEdicao() {
    const modal = $('modal-selecionar-produto-edicao');
    const input = $('editar-produto-pesquisa');
    if (!modal || !input) return;

    modal.classList.add('open');
    input.value = '';
    renderizarResultadosProdutosEdicao('');
    setTimeout(() => input.focus(), 50);
  }

  function fecharModalSelecionarProdutoEdicao() {
    const modal = $('modal-selecionar-produto-edicao');
    if (modal) modal.classList.remove('open');
  }

  function filtrarProdutosParaEdicao(valor) {
    renderizarResultadosProdutosEdicao(String(valor || '').trim().toLowerCase());
  }

  function renderizarResultadosProdutosEdicao(filtro = '') {
    const container = $('editar-produto-resultados');
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
    const tbody = $('admin-table-body');
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
              <button class="btn-sm" style="background: #8e1638; color: white;" onclick="esgotarProduto('${prod.id}')" title="Marcar como esgotado">Esgotar</button>
              <button class="btn-sm btn-delete" onclick="deletarProduto('${prod.id}')" title="Excluir">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    });

    const contador = $('estoque-result-count');
    if (contador) {
      contador.textContent = `${produtosFiltrados.length} de ${produtosCardapio.length} produto${produtosCardapio.length === 1 ? '' : 's'} exibido${produtosFiltrados.length === 1 ? '' : 's'}`;
    }
  }

  async function salvarTodosLimites() {
    if (!confirm("Deseja aplicar as reposições de estoque informadas somando aos limites atuais?")) return;
    
    for (const prod of produtosCardapio) {
      const reporInput = $(`repor-qtd-${prod.id}`);
      if (reporInput) {
        let qtdSomar = parseInt(reporInput.value) || 0;
        if (qtdSomar > 0) {
          let novoLimite = (Number(prod.limite) || 0) + qtdSomar;
          await db.from(DB_TABLES.PRODUTOS).update({ limite: novoLimite }).eq('id', prod.id);
        }
      }
    }
    await carregarCardapioNuvem();
    carregarTabelaAdmin();
    alert("Reposições de estoque aplicadas com sucesso!");
  }

  async function carregarListaPedidosAdmin() {
    await carregarPedidosNuvem();
    const container = $('lista-pedidos-admin');
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
      await db.from(DB_TABLES.PEDIDOS).update({ status: novoStatus }).eq('id_pedido', idPedido);
      carregarListaPedidosAdmin();
      atualizarMetricasOverview();
      if (pedido.whatsapp) {
        let telefoneLimpo = pedido.whatsapp.replace(/\D/g, '');
        if (!telefoneLimpo.startsWith('55')) telefoneLimpo = '55' + telefoneLimpo;
        const saudacao = pedido.cliente ? `Olá, *${pedido.cliente}*! ` : 'Olá! ';
        let msg = novoStatus === 'aguardando' 
          ? `${saudacao}Recebemos o seu pedido com sucesso. Assim que o pagamento for confirmado, ele entrará em produção! 🤎` 
          : (novoStatus === 'preparo' ? `Seu pedido entrou *Em Preparo* 🤎` : `Seu pedido está *Pronto*! ✨`);
        abrirWhatsApp(telefoneLimpo, msg);
      }
    }
  }

  async function cancelarPedidoInteiro(idPedido) {
    if (!confirm("Cancelar pedido?")) return;
    const index = listaPedidos.findIndex(p => p.id === idPedido);
    if (index > -1) {
      await db.from(DB_TABLES.PEDIDOS).delete().eq('id_pedido', idPedido);
      listaPedidos.splice(index, 1);
      carregarListaPedidosAdmin();
      atualizarMetricasOverview();
    }
  }

  function fecharAdmin() { $('admin-modal-overlay').classList.remove('open'); }

  function normalizarDataRelatorio(data) {
    const valor = String(data || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
    const dataBr = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return dataBr ? `${dataBr[3]}-${dataBr[2]}-${dataBr[1]}` : '';
  }

  function formatarDataRelatorio(data) {
    const dataIso = normalizarDataRelatorio(data);
    if (!dataIso) return 'Não informada';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  async function gerarRelatorioPDF() {
    await carregarPedidosNuvem();
    await carregarColetivosNuvem();
    const dataInicio = $('relatorio-data-inicio').value;
    const dataFim = $('relatorio-data-fim').value;
    if (dataInicio && dataFim && dataInicio > dataFim) {
      alert("A data inicial não pode ser posterior à data final.");
      return;
    }

    const pedidosRelatorio = [
      ...listaPedidos.map(p => ({
        tipo: 'Individual',
        dataAgendada: p.dataAgendada,
        cliente: p.cliente,
        itens: Array.isArray(p.itens) ? p.itens.map(i => `${i.quantity}x ${i.name}`).join(', ') : '',
        total: Number(p.total) || 0
      })),
      ...listaColetivos.map(col => ({
        tipo: 'Coletivo',
        dataAgendada: col.data_encomenda,
        cliente: `${col.responsavel_nome || 'Responsável'} (Pedido coletivo)`,
        itens: Array.isArray(col.colaboradores)
          ? col.colaboradores.flatMap(c => (Array.isArray(c.itens) ? c.itens : []).map(item => {
            const produto = produtosCardapio.find(p => p.id === item.produtoId);
            const nomeProduto = produto ? produto.name : 'Item coletivo';
            const nomeColaborador = c.name || c.nome || 'Participante';
            return `${item.quantidade}x ${nomeProduto} (${nomeColaborador})`;
          })).join(', ')
          : '',
        total: Number(col.total) || 0
      }))
    ];

    const pedidosFiltrados = pedidosRelatorio.filter(p => {
      const dataAgendada = normalizarDataRelatorio(p.dataAgendada);
      if (dataInicio && (!dataAgendada || dataAgendada < dataInicio)) return false;
      if (dataFim && (!dataAgendada || dataAgendada > dataFim)) return false;
      return true;
    });
    if (pedidosFiltrados.length === 0) { alert("Nenhum pedido encontrado no período selecionado."); return; }

    let faturamento = 0;
    let linhas = '';
    const pedidosOrdenados = [...pedidosFiltrados].sort((a, b) =>
      normalizarDataRelatorio(b.dataAgendada).localeCompare(normalizarDataRelatorio(a.dataAgendada))
    );
    pedidosOrdenados.forEach((p, idx) => {
      faturamento += p.total;
      linhas += `<tr><td>#${idx + 1}</td><td>${p.tipo}</td><td>${formatarDataRelatorio(p.dataAgendada)}</td><td>${p.cliente}</td><td>${p.itens}</td><td><b>${p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></td></tr>`;
    });
    const coletivosNoRelatorio = pedidosFiltrados.filter(p => p.tipo === 'Coletivo').length;
    const individuaisNoRelatorio = pedidosFiltrados.length - coletivosNoRelatorio;
    let periodo = '';
    if (dataInicio && dataFim) {
      periodo = `<p><b>Período:</b> ${formatarDataRelatorio(dataInicio)} a ${formatarDataRelatorio(dataFim)}</p>`;
    } else if (dataInicio) {
      periodo = `<p><b>A partir de:</b> ${formatarDataRelatorio(dataInicio)}</p>`;
    } else if (dataFim) {
      periodo = `<p><b>Até:</b> ${formatarDataRelatorio(dataFim)}</p>`;
    }
    $('relatorio-print-area').innerHTML = `<h2>Relatório Geral</h2>${periodo}<table class="print-table"><thead><tr><th>#</th><th>Tipo</th><th>Data agendada</th><th>Cliente / Responsável</th><th>Itens</th><th>Total</th></tr></thead><tbody>${linhas}</tbody></table><p><b>Total de pedidos:</b> ${pedidosFiltrados.length} (${individuaisNoRelatorio} individuais e ${coletivosNoRelatorio} coletivos)</p><p><b>Total Faturado:</b> ${faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>`;
    window.print();
  }

  let cart = [];
  let taxaEntrega = 0;
  const tabelaFrete = { "Cará-Cará": 10.00, "Uvaranas": 12.00, "Centro": 15.00, "Oficinas": 12.00, "Estrela": 15.00, "Jardim Carvalho": 15.00, "Contorno": 18.00, "Nova Rússia": 15.00, "Neves": 15.00, "Olarias": 12.00, "Boa Vista": 20.00, "Órfãs": 15.00 };
  const taxaPadrao = 18.00;
