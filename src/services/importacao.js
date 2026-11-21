import { request } from "./api";

// Regras do POST /importacao/alunos (descrição do Swagger).
export const COLUNAS_OBRIGATORIAS = ["cpf", "nome", "data_nascimento", "matricula"];
export const COLUNAS_OPCIONAIS = ["email", "celular", "cep", "rua", "numero", "bairro", "cidade"];
export const MODELO_CSV = "/modelo-importacao-alunos.csv"; // servido pela pasta public/

// Importa alunos de um CSV para a turma. Multipart com o campo `arquivo`.
// Devolve RelatorioImportacao: { totalLinhas, criados, atualizados, erros: [{ linha, motivo }] }.
// Alunos com o mesmo CPF são atualizados; linhas com erro não impedem as demais.
export function importarAlunos(turmaId, arquivo) {
  const dados = new FormData();
  dados.append("arquivo", arquivo);
  return request(`/api/v1/importacao/alunos?turmaId=${encodeURIComponent(turmaId)}`, {
    method: "POST",
    body: dados,
  });
}

// Leitura local só para conferência antes do envio: separador, cabeçalho e
// primeiras linhas. Quem valida de verdade é a API.
export function analisarCsv(texto) {
  const semBom = texto.replace(/^\uFEFF/, "");
  const linhas = semBom.split(/\r?\n/).filter((linha) => linha.trim() !== "");
  if (linhas.length === 0) return { vazio: true };

  const primeira = linhas[0];
  const separador = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
  const dividir = (linha) => linha.split(separador).map((valor) => valor.trim().replace(/^"(.*)"$/, "$1"));
  const cabecalho = dividir(primeira).map((coluna) => coluna.toLowerCase());

  return {
    vazio: false,
    separador,
    cabecalho,
    faltando: COLUNAS_OBRIGATORIAS.filter((coluna) => !cabecalho.includes(coluna)),
    desconhecidas: cabecalho.filter(
      (coluna) => coluna && !COLUNAS_OBRIGATORIAS.includes(coluna) && !COLUNAS_OPCIONAIS.includes(coluna),
    ),
    totalLinhas: linhas.length - 1,
    amostra: linhas.slice(1, 6).map(dividir),
    // Caractere de substituição = o arquivo provavelmente não está em UTF-8 (acentos se perdem).
    suspeitaCodificacao: semBom.includes("\uFFFD"),
  };
}
