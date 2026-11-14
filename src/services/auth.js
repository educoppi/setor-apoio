import { request, setToken } from "./api";

const USUARIO_KEY = "setor-apoio:usuario";

export function getUsuario() {
  try {
    return JSON.parse(localStorage.getItem(USUARIO_KEY));
  } catch {
    return null;
  }
}

function setUsuario(usuario) {
  if (usuario) localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  else localStorage.removeItem(USUARIO_KEY);
}

export async function login(nif, senha) {
  const dados = await request("/api/v1/auth/login", {
    method: "POST",
    body: { nif, senha },
    auth: false,
  });
  setToken(dados.accessToken);
  setUsuario(dados.usuario);
  return dados.usuario;
}

export async function buscarUsuarioLogado() {
  const usuario = await request("/api/v1/auth/me");
  setUsuario(usuario);
  return usuario;
}

export function logout() {
  setToken(null);
  setUsuario(null);
}

// PUT /auth/senha: { senhaAtual, novaSenha (8 a 72 caracteres) } → 204.
export function alterarMinhaSenha(senhaAtual, novaSenha) {
  return request("/api/v1/auth/senha", { method: "PUT", body: { senhaAtual, novaSenha }, manterSessaoEm401: true });
}
