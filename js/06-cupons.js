  async function adicionarCupomAdmin() {
    const codigo = $('novo-cupom-codigo').value.trim().toUpperCase();
    const tipo = $('novo-cupom-tipo').value;
    const valor = parseFloat($('novo-cupom-valor').value);
    if (!codigo || isNaN(valor) || valor <= 0) { alert("Preencha cupom e valor válidos."); return; }

    const { error } = await db.from(DB_TABLES.CUPONS).upsert([{ codigo, tipo, valor }]);
    if (error) { alert("Erro: " + error.message); return; }
    $('novo-cupom-codigo').value = '';
    $('novo-cupom-valor').value = '';
    await carregarCuponsNuvem();
    carregarTabelaCuponsAdmin();
    alert(`Cupom "${codigo}" cadastrado!`);
  }

  async function deletarCupomAdmin(codigo) {
    if (!confirm(`Excluir cupom "${codigo}"?`)) return;
    await db.from(DB_TABLES.CUPONS).delete().eq('codigo', codigo);
    await carregarCuponsNuvem();
    carregarTabelaCuponsAdmin();
  }

  function carregarTabelaCuponsAdmin() {
    const tbody = $('admin-cupons-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const chaves = Object.keys(cuponsValidos);
    if (chaves.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--creme-dim);">Nenhum cupom.</td></tr>`; return; }

    chaves.forEach(codigo => {
      const c = cuponsValidos[codigo];
      tbody.innerHTML += `<tr><td><b>${codigo}</b></td><td>${c.tipo}</td><td>${c.valor}</td><td><button class="btn-sm btn-delete" onclick="deletarCupomAdmin('${codigo}')">Excluir</button></td></tr>`;
    });
  }

