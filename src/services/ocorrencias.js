import { buscarTodasPaginas, request } from "./api";

// Enum `origem` da ocorrência: de onde a situação chegou ao Setor de Apoio.
export const ORIGENS = [
  { valor: "CORPO_DOCENTE", rotulo: "Corpo docente" },
  { valor: "PROPRIO_ALUNO", rotulo: "Próprio aluno" },
  { valor: "CORPO_DISCENTE", rotulo: "Corpo discente" },
  { valor: "EMPRESA", rotulo: "Empresa" },
  { valor: "FAMILIA", rotulo: "Família" },
  { valor: "OUTROS", rotulo: "Outros" },
];

export const MAX_IMAGENS_OCORRENCIA = 5;

export function rotuloOrigem(valor) {
  return ORIGENS.find((origem) => origem.valor === valor)?.rotulo ?? valor ?? "";
}

// Histórico do aluno, mais recentes primeiro.
export function listarOcorrenciasDoAluno(alunoId) {
  return buscarTodasPaginas(`/api/v1/alunos/${alunoId}/ocorrencias`, { sort: "dataHora,DESC" });
}

// OcorrenciaRequest: { alunoId, descricao, origem, categoriaIds (≥1), imagens? (≤5), solicitacaoIds? }
// O responsável é o usuário logado.
export function criarOcorrencia(ocorrencia) {
  return request("/api/v1/ocorrencias", { method: "POST", body: ocorrencia });
}

// OcorrenciaUpdateRequest: `imagens` substitui a lista; `solicitacaoIds` só acrescenta.
// Somente o autor ou um administrador.
export function atualizarOcorrencia(id, ocorrencia) {
  return request(`/api/v1/ocorrencias/${id}`, { method: "PUT", body: ocorrencia });
}

// Exclusão lógica. Somente o autor ou um administrador.
export function excluirOcorrencia(id) {
  return request(`/api/v1/ocorrencias/${id}`, { method: "DELETE" });
}

export function listarCategorias({ somenteAtivas = true } = {}) {
  return request(`/api/v1/categorias?somenteAtivas=${somenteAtivas}`);
}

export const LIMITE_NOME_CATEGORIA = 50;

// CategoriaRequest: { nome (até 50), ativo? (padrão true) }.
export function criarCategoria(nome) {
  return request("/api/v1/categorias", { method: "POST", body: { nome, ativo: true } });
}

// Renomeia, desativa ou reativa a categoria.
export function atualizarCategoria(id, { nome, ativo }) {
  return request(`/api/v1/categorias/${id}`, { method: "PUT", body: { nome, ativo } });
}

// GET /ocorrencias (paginado, mais recentes primeiro). Filtros opcionais:
// alunoId, categoriaId, origem, de e ate (AAAA-MM-DD). Vazios não são enviados.
// Disponível para o Setor de Apoio (operacional) e administradores.
export function listarOcorrencias(filtros = {}, pagina = 0, tamanho = 10, ordem = "dataHora,DESC") {
  const query = new URLSearchParams({ page: pagina, size: tamanho, sort: ordem });
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== "") query.set(chave, valor);
  }
  return request(`/api/v1/ocorrencias?${query}`);
}
