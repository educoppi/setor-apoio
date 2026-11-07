import { request } from "./api";

export function listarCursos({ somenteAtivos = false } = {}) {
  return request(`/api/v1/cursos?somenteAtivos=${somenteAtivos}`);
}
