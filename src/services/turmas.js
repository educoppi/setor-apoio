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

const TAMANHO_PAGINA = 100;

// A API é paginada (Spring Page): percorre todas as páginas e devolve só o `content`.
export async function listarTurmas() {
  const turmas = [];
  let pagina = 0;
  let totalPaginas;

  do {
    const dados = await request(
      `/api/v1/turmas?page=${pagina}&size=${TAMANHO_PAGINA}&sort=nome,ASC`,
    );
    turmas.push(...(dados?.content ?? []));
    totalPaginas = dados?.page?.totalPages ?? 1;
    pagina += 1;
  } while (pagina < totalPaginas);

  return turmas;
}
