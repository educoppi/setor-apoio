const TOKEN_KEY = "setor-apoio:token";

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

export async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
    if (response.status === 401 && auth) setToken(null);
    throw new ApiError(
      dados?.detail || dados?.title || mensagemPadrao(response.status),
      response.status,
      Array.isArray(dados?.campos) ? dados.campos : [],
    );
  }

  return dados;
}
