import { buscarTodasPaginas, request } from "./api";

export const MOTIVOS = [
  { valor: "COMPORTAMENTAL", rotulo: "Comportamental" },
  { valor: "FREQUENCIA", rotulo: "Frequência" },
  { valor: "APROVEITAMENTO", rotulo: "Aproveitamento" },
  { valor: "OUTROS", rotulo: "Outros" },
];

// Status do fluxo: AGUARDANDO_ACOMPANHAMENTO → EM_ANDAMENTO → FINALIZADO.
export const STATUS = [
  { valor: "AGUARDANDO_ACOMPANHAMENTO", rotulo: "Aguardando atendimento", curto: "Aguardando" },
  { valor: "EM_ANDAMENTO", rotulo: "Em andamento", curto: "Em andamento" },
  { valor: "FINALIZADO", rotulo: "Finalizada", curto: "Finalizada" },
];

export const VISIBILIDADES = [
  {
    valor: "COMPARTILHADO",
    rotulo: "Compartilhada",
    descricao: "Os professores com acesso à turma também podem ver esta solicitação.",
  },
  {
    valor: "PRIVADO",
    rotulo: "Privada",
    descricao: "Somente você e o Setor de Apoio podem ver esta solicitação.",
  },
];

export const LIMITE_UNIDADE_CURRICULAR = 100;
export const BUSCA_ALUNO_MINIMO = 3;

export function rotuloMotivo(valor) {
  return MOTIVOS.find((motivo) => motivo.valor === valor)?.rotulo ?? valor ?? "";
}

export function rotuloStatus(valor) {
  return STATUS.find((status) => status.valor === valor)?.rotulo ?? valor ?? "";
}

export function rotuloVisibilidade(valor) {
  return VISIBILIDADES.find((item) => item.valor === valor)?.rotulo ?? valor ?? "";
}

// GET /solicitacoes (paginado, mais recentes primeiro). Filtros: status, motivo,
// turmaId, alunoId, minhas, emAberto... Parâmetros vazios não são enviados.
export function listarSolicitacoes(filtros = {}, pagina = 0, tamanho = 10) {
  const query = new URLSearchParams({ page: pagina, size: tamanho, sort: "dataHora,DESC" });
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== "" && valor !== false) query.set(chave, valor);
  }
  return request(`/api/v1/solicitacoes?${query}`);
}

// Todas as páginas (usado para montar a lista de solicitações associáveis a uma ocorrência).
export function listarTodasSolicitacoes(filtros = {}) {
  return buscarTodasPaginas("/api/v1/solicitacoes", { ...filtros, sort: "dataHora,DESC" });
}

// Detalhe com histórico de status e feedback.
export function buscarSolicitacao(id) {
  return request(`/api/v1/solicitacoes/${id}`);
}

// SolicitacaoRequest: { vinculoAcademicoId, unidadeCurricular?, motivo, descricao, visibilidade?, atendenteId? }
export function criarSolicitacao(solicitacao) {
  return request("/api/v1/solicitacoes", { method: "POST", body: solicitacao });
}

// Nome (mín. 3 caracteres) ou matrícula. Devolve só dados mínimos (AlunoSolicitacaoResumo).
export function buscarAlunosParaSolicitacao(busca) {
  return request(`/api/v1/solicitacoes/alunos?${new URLSearchParams({ busca })}`);
}

// Funcionárias do setor de apoio que podem atender.
export function listarAtendentes() {
  return request("/api/v1/solicitacoes/atendentes");
}
