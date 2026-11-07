import { request } from "./api";

export const UNIDADES = [
  { valor: "SAO_CARLOS", rotulo: "São Carlos" },
  { valor: "DESCALVADO", rotulo: "Descalvado" },
  { valor: "PORTO_FERREIRA", rotulo: "Porto Ferreira" },
  { valor: "SANTA_RITA_DO_PASSA_QUATRO", rotulo: "Santa Rita do Passa Quatro" },
];

export function criarTurma(turma) {
  return request("/api/v1/turmas", { method: "POST", body: turma });
}
