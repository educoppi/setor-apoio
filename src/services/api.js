const TOKEN_KEY = "setor-apoio:token";

// Endereço real da API (o mesmo alvo do proxy do Vite). As chamadas continuam
// relativas (/api/...); este valor só é usado para gerar links absolutos que
// ficam gravados no banco, como a `fotoUrl` do aluno.
export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status, campos = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.campos = campos;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function mensagemPadrao(status) {
  if (status === 401) return "Sessão expirada ou não autenticada. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para realizar esta ação.";
  if (status === 404) return "Recurso não encontrado.";
  if (status >= 500) return "Erro no servidor. Tente novamente mais tarde.";
  return "Não foi possível concluir a requisição.";
}

// `manterSessaoEm401`: não apaga o token num 401 (ex.: senha atual incorreta
// na troca de senha não deve derrubar a sessão).
export async function request(path, { method = "GET", body, auth = true, manterSessaoEm401 = false } = {}) {
  // FormData (upload de arquivos) vai como multipart: o navegador define o Content-Type.
  const multipart = body instanceof FormData;
  const headers = { Accept: "application/json" };
  if (body !== undefined && !multipart) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined || multipart ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.", 0);
  }

  const texto = await response.text();
  let dados = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth && !manterSessaoEm401) setToken(null);
    throw new ApiError(
      dados?.detail || dados?.title || mensagemPadrao(response.status),
      response.status,
      Array.isArray(dados?.campos) ? dados.campos : [],
    );
  }

  return dados;
}

const TAMANHO_PAGINA = 100;

// Listagens paginadas (Spring PagedModel: { content, page }): percorre todas as
// páginas e devolve só os itens. `parametros` vira a query string.
export async function buscarTodasPaginas(caminho, parametros = {}) {
  const itens = [];
  let pagina = 0;
  let totalPaginas;

  do {
    const query = new URLSearchParams({ ...parametros, page: pagina, size: TAMANHO_PAGINA });
    const dados = await request(`${caminho}?${query}`);
    itens.push(...(dados?.content ?? []));
    totalPaginas = dados?.page?.totalPages ?? 1;
    pagina += 1;
  } while (pagina < totalPaginas);

  return itens;
}

// Download binário autenticado (ex.: GET /imagens/{nome}, que exige o token).
export async function requestBlob(path) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, { headers });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.", 0);
  }
  if (!response.ok) throw new ApiError(mensagemPadrao(response.status), response.status);
  return response.blob();
}
