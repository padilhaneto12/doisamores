/* Utilitários compartilhados — V2.3
 * Mantém as funções globais existentes e reduz repetição entre módulos.
 */
function $(id) {
  return document.getElementById(id);
}

function abrirWhatsApp(numero, mensagem) {
  const telefone = String(numero || '').replace(/\D/g, '');
  const texto = String(mensagem || '');
  window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`, '_blank');
}
