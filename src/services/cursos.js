import { request } from "./api";

// Enum `modalidade` do curso, na ordem usada nas telas.
export const MODALIDADES_CURSO = [
  { valor: "CT", rotulo: "Curso Técnico" },
  { valor: "CAI", rotulo: "Curso de Aprendizagem Industrial" },
  { valor: "CST", rotulo: "Curso Superior de Tecnologia" },
];

export const LIMITE_NOME_CURSO = 100;

export function rotuloModalidade(valor) {
  return MODALIDADES_CURSO.find((m) => m.valor === valor)?.rotulo ?? valor ?? "";
}

export function listarCursos({ somenteAtivos = false } = {}) {
  return request(`/api/v1/cursos?somenteAtivos=${somenteAtivos}`);
}

// CursoRequest: { nome, modalidade, ativo?, responsavelId? }
export function criarCurso(curso) {
  return request("/api/v1/cursos", { method: "POST", body: curso });
}

export function atualizarCurso(id, curso) {
  return request(`/api/v1/cursos/${id}`, { method: "PUT", body: curso });
}

// A API devolve 409 se o curso tiver turmas; nesse caso, o caminho é desativá-lo.
export function excluirCurso(id) {
  return request(`/api/v1/cursos/${id}`, { method: "DELETE" });
}
