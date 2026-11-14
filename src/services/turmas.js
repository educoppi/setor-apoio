import { buscarTodasPaginas, request } from "./api";

export const UNIDADES = [
  { valor: "SAO_CARLOS", rotulo: "São Carlos" },
  { valor: "DESCALVADO", rotulo: "Descalvado" },
  { valor: "PORTO_FERREIRA", rotulo: "Porto Ferreira" },
  { valor: "SANTA_RITA_DO_PASSA_QUATRO", rotulo: "Santa Rita do Passa Quatro" },
];

export function criarTurma(turma) {
  return request("/api/v1/turmas", { method: "POST", body: turma });
}

// Turmas vinculadas ao usuário logado (professores veem as solicitações compartilhadas delas).
export function listarMinhasTurmas() {
  return request("/api/v1/usuarios/me/turmas");
}

// A API é paginada (Spring Page): percorre todas as páginas e devolve só o `content`.
export function listarTurmas() {
  return buscarTodasPaginas("/api/v1/turmas", { sort: "nome,ASC" });
}
