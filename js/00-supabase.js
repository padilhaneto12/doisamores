/* Camada central de acesso ao Supabase — V2.4. */
const SUPABASE_URL = 'https://ecejppxklzrleumionqt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BuvSH51vbG4ln9sUZm43RQ_qe9WOx1L';

const DB_TABLES = Object.freeze({
  CONFIGURACOES: 'configuracoes',
  PRODUTOS: 'produtos',
  PEDIDOS: 'pedidos',
  PEDIDOS_COLETIVOS: 'pedidos_coletivos',
  CUPONS: 'cupons'
});

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ponto único de entrada para consultas. Mantém a API do Supabase
// compatível com o código existente, sem mudar o comportamento das telas.
const db = Object.freeze({
  from: (table) => _supabase.from(table)
});
