import { buscarTodasPaginas, request } from "./api";

// `cidade` do aluno é texto livre na API (ex.: "São Carlos"); não confundir com
// a `unidade` da turma, que é um enum. O valor enviado segue o formato do exemplo
// do contrato; o rótulo é só para exibição.
export const CIDADES = [
  { valor: "São Carlos", rotulo: "SÃO CARLOS" },
  { valor: "Descalvado", rotulo: "DESCALVADO" },
  { valor: "Santa Rita do Passa Quatro", rotulo: "SANTA RITA DO PASSA QUATRO" },
];

// Valores do enum `situacaoProfissional` do AlunoRequest.
export const SITUACOES_PROFISSIONAIS = [
  { valor: "EMPREGADO", rotulo: "Empregado" },
  { valor: "DESEMPREGADO", rotulo: "Desempregado" },
  { valor: "JOVEM_APRENDIZ", rotulo: "Jovem aprendiz" },
  { valor: "ESTAGIARIO", rotulo: "Estagiário" },
];

export const SITUACAO_VINCULO_INICIAL = "EM_ANDAMENTO";

// Rótulos do enum `situacao` do vínculo (matrícula).
export const SITUACOES_VINCULO = {
  EM_ANDAMENTO: "Em andamento",
  TRANCADO: "Trancado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  EVADIDO: "Evadido",
};

// GET /alunos?turmaId= devolve AlunoResumo (id, nome, fotoUrl, vinculos...), paginado.
export function listarAlunosDaTurma(turmaId) {
  return buscarTodasPaginas("/api/v1/alunos", { turmaId, sort: "nome,ASC" });
}

// Ficha completa (AlunoResponse, já com os vínculos).
export function buscarAluno(id) {
  return request(`/api/v1/alunos/${id}`);
}

// PUT substitui a ficha inteira (AlunoRequest): campos omitidos ficam vazios.
// Vínculos não fazem parte do corpo e não são alterados.
export function atualizarAluno(id, aluno) {
  return request(`/api/v1/alunos/${id}`, { method: "PUT", body: aluno });
}

// POST /alunos cria só a ficha (AlunoRequest não tem `vinculos`).
// id, createdAt e updatedAt são gerados pelo backend.
export function criarAluno(aluno) {
  return request("/api/v1/alunos", { method: "POST", body: aluno });
}

// A matrícula em uma turma é um recurso separado: POST /alunos/{id}/vinculos
// com { matricula, turmaId, situacao } (VinculoRequest).
export function adicionarVinculo(alunoId, vinculo) {
  return request(`/api/v1/alunos/${alunoId}/vinculos`, { method: "POST", body: vinculo });
}
