import { buscarTodasPaginas, request } from "./api";

export const UNIDADES = [
  { valor: "SAO_CARLOS", rotulo: "São Carlos" },
  { valor: "DESCALVADO", rotulo: "Descalvado" },
  { valor: "PORTO_FERREIRA", rotulo: "Porto Ferreira" },
  { valor: "SANTA_RITA_DO_PASSA_QUATRO", rotulo: "Santa Rita do Passa Quatro" },
];

export const LIMITE_NOME_TURMA = 100;

export function rotuloUnidade(valor) {
  return UNIDADES.find((unidade) => unidade.valor === valor)?.rotulo ?? valor ?? "";
}

// TurmaRequest: { cursoId, nome, unidade?, dataInicio, dataPrevFim, ativo? }
export function criarTurma(turma) {
  return request("/api/v1/turmas", { method: "POST", body: turma });
}

export function atualizarTurma(id, turma) {
  return request(`/api/v1/turmas/${id}`, { method: "PUT", body: turma });
}

// Professores, coordenação... vinculados à turma: veem as solicitações COMPARTILHADAS dela.
export function listarUsuariosDaTurma(id) {
  return request(`/api/v1/turmas/${id}/usuarios`);
}

export function vincularUsuarios(id, usuarioIds) {
  return request(`/api/v1/turmas/${id}/usuarios`, { method: "POST", body: { usuarioIds } });
}

export function desvincularUsuario(id, usuarioId) {
  return request(`/api/v1/turmas/${id}/usuarios/${usuarioId}`, { method: "DELETE" });
}

// Turmas vinculadas ao usuário logado (professores veem as solicitações compartilhadas delas).
export function listarMinhasTurmas() {
  return request("/api/v1/usuarios/me/turmas");
}

// A API é paginada (Spring Page): percorre todas as páginas e devolve só o `content`.
export function listarTurmas() {
  return buscarTodasPaginas("/api/v1/turmas", { sort: "nome,ASC" });
}
