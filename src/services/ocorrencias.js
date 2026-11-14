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
