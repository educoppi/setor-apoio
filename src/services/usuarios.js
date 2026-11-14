import { buscarTodasPaginas, request } from "./api";

// Enum `role` (perfil de acesso). SOLICITANTE é o perfil de professores,
// coordenação, biblioteca etc. (descrição do POST /usuarios).
export const ROLES = [
  { valor: "ADMINISTRADOR", rotulo: "Administrador", descricao: "Acesso total, inclusive às ferramentas do administrador." },
  { valor: "OPERACIONAL", rotulo: "Operacional", descricao: "Equipe do setor de apoio: fichas, ocorrências e atendimentos." },
  { valor: "SOLICITANTE", rotulo: "Solicitante", descricao: "Professores, coordenação, biblioteca etc.: abrem solicitações." },
];

export const CARGOS = [
  { valor: "SETOR_APOIO", rotulo: "Setor de apoio" },
  { valor: "PROFESSOR", rotulo: "Professor(a)" },
  { valor: "COORDENADOR", rotulo: "Coordenador(a)" },
  { valor: "BIBLIOTECARIO", rotulo: "Bibliotecário(a)" },
  { valor: "SECRETARIA", rotulo: "Secretaria" },
  { valor: "OUTRO", rotulo: "Outro" },
];

export const ROLE_ADMIN = "ADMINISTRADOR";
export const ROLE_SOLICITANTE = "SOLICITANTE";

// Limites do UsuarioRequest / NovaSenhaRequest.
export const LIMITES_USUARIO = { nif: 20, nome: 100, email: 150, senhaMin: 8, senhaMax: 72 };

export function rotuloRole(valor) {
  return ROLES.find((role) => role.valor === valor)?.rotulo ?? valor ?? "";
}

export function rotuloCargo(valor) {
  return CARGOS.find((cargo) => cargo.valor === valor)?.rotulo ?? valor ?? "";
}

export function ehAdministrador(usuario) {
  return usuario?.role === ROLE_ADMIN;
}

// Solicitantes (professores, coordenação...) não acessam fichas nem ocorrências:
// a área deles é a de solicitações.
export function ehSolicitante(usuario) {
  return usuario?.role === ROLE_SOLICITANTE;
}

// Todos os usuários (GET /usuarios é paginado), em ordem alfabética.
export function listarUsuarios() {
  return buscarTodasPaginas("/api/v1/usuarios", { sort: "nome,ASC" });
}

// UsuarioRequest: { nif, nome, email?, senha, role, cargo }. O NIF é o login.
export function criarUsuario(usuario) {
  return request("/api/v1/usuarios", { method: "POST", body: usuario });
}

// UsuarioUpdateRequest: { nome, email?, role, cargo }. NIF e senha não mudam aqui.
export function atualizarUsuario(id, usuario) {
  return request(`/api/v1/usuarios/${id}`, { method: "PUT", body: usuario });
}

export function redefinirSenha(id, novaSenha) {
  return request(`/api/v1/usuarios/${id}/senha`, { method: "PATCH", body: { novaSenha } });
}

export function alterarAtivo(id, ativo) {
  return request(`/api/v1/usuarios/${id}/ativo`, { method: "PATCH", body: { ativo } });
}
