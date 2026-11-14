import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Abas from "../../components/Abas/Abas";
import DashboardPainel from "../../components/Dashboard/DashboardPainel";
import Campo from "../../components/Campo/Campo";
import Header from "../../components/Header/Header";
import UsuarioModal from "../../components/UsuarioModal/UsuarioModal";
import { getToken } from "../../services/api";
import { buscarUsuarioLogado, getUsuario, logout } from "../../services/auth";
import {
  CARGOS,
  ehAdministrador,
  listarUsuarios,
  rotuloCargo,
  rotuloRole,
  ROLES,
} from "../../services/usuarios";
import "./AdminUsuarios.css";

const SITUACOES = [
  { valor: "", rotulo: "Todos" },
  { valor: "ativos", rotulo: "Somente ativos" },
  { valor: "inativos", rotulo: "Somente inativos" },
];

// Mesma regra da busca da API: ignora acentos e maiúsculas, procura no nome e no NIF.
function normalizar(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function IconeVoltar() {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ABAS = [
  { id: "dashboard", rotulo: "Dashboard" },
  { id: "usuarios", rotulo: "Gerenciamento de usuários" },
];
const ID_ABAS = "ferramentas-admin";

// Ferramentas do administrador, em duas abas:
// - Dashboard (padrão): estatísticas de GET /solicitacoes/painel;
// - Gerenciamento de usuários: lista todos os usuários e abre a edição de cada um.
// A aba fica na URL (?aba=usuarios) para sobreviver a recarregamentos.
export default function AdminUsuarios() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaAtiva = ABAS.some((a) => a.id === searchParams.get("aba")) ? searchParams.get("aba") : "dashboard";
  const [usuarioLogado, setUsuarioLogado] = useState(getUsuario);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [mensagem, setMensagem] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroRole, setFiltroRole] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");

  // null = modal fechado; "novo" = criação; número = id do usuário em edição.
  const [modal, setModal] = useState(null);

  const admin = ehAdministrador(usuarioLogado);

  const tratarNaoAutenticado = useCallback(
    (error) => {
      if (error.status !== 401) return false;
      logout();
      navigate("/", { replace: true });
      return true;
    },
    [navigate],
  );

  // Confirma o perfil com a API: o usuário salvo localmente pode estar desatualizado.
  useEffect(() => {
    if (!getToken()) return;
    buscarUsuarioLogado().then(setUsuarioLogado).catch(tratarNaoAutenticado);
  }, [tratarNaoAutenticado]);

  useEffect(() => {
    if (!getToken() || !admin) return undefined;
    let ativo = true;
    listarUsuarios()
      .then((lista) => {
        if (!ativo) return;
        setUsuarios(lista);
        setErro("");
      })
      .catch((error) => {
        if (!ativo || tratarNaoAutenticado(error)) return;
        setErro(error.message);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [admin, tentativa, tratarNaoAutenticado]);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return usuarios.filter((usuario) => {
      if (termo && !normalizar(usuario.nome).includes(termo) && !normalizar(usuario.nif).includes(termo)) {
        return false;
      }
      if (filtroRole && usuario.role !== filtroRole) return false;
      if (filtroCargo && usuario.cargo !== filtroCargo) return false;
      if (filtroSituacao === "ativos" && !usuario.ativo) return false;
      if (filtroSituacao === "inativos" && usuario.ativo) return false;
      return true;
    });
  }, [usuarios, busca, filtroRole, filtroCargo, filtroSituacao]);

  const fecharModal = useCallback(() => setModal(null), []);

  if (!getToken()) return <Navigate to="/" replace />;

  const totalAtivos = usuarios.filter((usuario) => usuario.ativo).length;
  const usuarioEmEdicao = typeof modal === "number" ? usuarios.find((u) => u.id === modal) : null;
  const filtrando = Boolean(busca.trim() || filtroRole || filtroCargo || filtroSituacao);

  function handleTentarNovamente() {
    setCarregando(true);
    setErro("");
    setTentativa((valor) => valor + 1);
  }

  function handleLimparFiltros() {
    setBusca("");
    setFiltroRole("");
    setFiltroCargo("");
    setFiltroSituacao("");
  }

  function handleNovo() {
    setMensagem("");
    setModal("novo");
  }

  function handleEditar(usuario) {
    setMensagem("");
    setModal(usuario.id);
  }

  function handleCriado(usuario) {
    setUsuarios((atual) =>
      [...atual, usuario].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    );
    setModal(null);
    setMensagem(`Usuário ${usuario.nome} criado com sucesso. O login é o NIF ${usuario.nif}.`);
  }

  function handleAtualizado(usuario) {
    setUsuarios((atual) => atual.map((item) => (item.id === usuario.id ? usuario : item)));
    // Se o administrador editou a si mesmo, o perfil pode ter mudado.
    if (usuario.id === usuarioLogado?.id) {
      buscarUsuarioLogado().then(setUsuarioLogado).catch(tratarNaoAutenticado);
    }
  }

  return (
    <div className="admin">
      <Header nome={usuarioLogado?.nome ?? ""} role={usuarioLogado?.role} />

      <main className="admin__conteudo">
        <div className="admin__topo">
          <button
            type="button"
            className="admin__voltar"
            onClick={() => navigate("/home")}
            aria-label="Voltar para a página inicial"
          >
            <IconeVoltar />
          </button>
          <div>
            <h1 className="admin__titulo">Ferramentas do Administrador</h1>
            <p className="admin__subtitulo">
              {abaAtiva === "dashboard"
                ? "Visão geral das solicitações recebidas pelo Setor de Apoio."
                : "Usuários do sistema: perfis de acesso, cargos, senhas e situação."}
            </p>
          </div>
        </div>

        {!admin ? (
          <p className="admin__aviso admin__aviso--erro" role="alert">
            Acesso restrito a administradores.
          </p>
        ) : (
          <>
            <div className="admin__abas">
              <Abas
                idBase={ID_ABAS}
                abas={ABAS}
                ativa={abaAtiva}
                onSelecionar={(id) => setSearchParams(id === "dashboard" ? {} : { aba: id }, { replace: true })}
                rotulo="Ferramentas do administrador"
              />
            </div>

            <div
              id={`${ID_ABAS}-painel-dashboard`}
              role="tabpanel"
              aria-labelledby={`${ID_ABAS}-aba-dashboard`}
              hidden={abaAtiva !== "dashboard"}
              className="admin__painel"
            >
              {abaAtiva === "dashboard" && <DashboardPainel onNaoAutenticado={tratarNaoAutenticado} />}
            </div>

            <div
              id={`${ID_ABAS}-painel-usuarios`}
              role="tabpanel"
              aria-labelledby={`${ID_ABAS}-aba-usuarios`}
              hidden={abaAtiva !== "usuarios"}
              className="admin__painel"
            >
            <div className="admin__barra">
              <div className="admin__filtros">
                <Campo
                  id="admin-busca"
                  className="admin__busca"
                  rotulo="Buscar"
                  type="search"
                  placeholder="Nome ou NIF"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  autoComplete="off"
                />
                <Campo
                  id="admin-role"
                  as="select"
                  rotulo="Perfil"
                  value={filtroRole}
                  onChange={(event) => setFiltroRole(event.target.value)}
                >
                  <option value="">Todos</option>
                  {ROLES.map((role) => (
                    <option key={role.valor} value={role.valor}>
                      {role.rotulo}
                    </option>
                  ))}
                </Campo>
                <Campo
                  id="admin-cargo"
                  as="select"
                  rotulo="Cargo"
                  value={filtroCargo}
                  onChange={(event) => setFiltroCargo(event.target.value)}
                >
                  <option value="">Todos</option>
                  {CARGOS.map((cargo) => (
                    <option key={cargo.valor} value={cargo.valor}>
                      {cargo.rotulo}
                    </option>
                  ))}
                </Campo>
                <Campo
                  id="admin-situacao"
                  as="select"
                  rotulo="Situação"
                  value={filtroSituacao}
                  onChange={(event) => setFiltroSituacao(event.target.value)}
                >
                  {SITUACOES.map((situacao) => (
                    <option key={situacao.valor} value={situacao.valor}>
                      {situacao.rotulo}
                    </option>
                  ))}
                </Campo>
              </div>

              <button className="admin__novo" type="button" onClick={handleNovo}>
                + USUÁRIO
              </button>
            </div>

            {mensagem && (
              <p className="admin__aviso admin__aviso--sucesso" role="status">
                {mensagem}
              </p>
            )}

            {carregando && <p className="admin__aviso">Carregando usuários...</p>}

            {erro && (
              <div className="admin__aviso admin__aviso--erro admin__aviso--acao" role="alert">
                <span>Não foi possível carregar os usuários: {erro}</span>
                <button type="button" onClick={handleTentarNovamente}>
                  Tentar novamente
                </button>
              </div>
            )}

            {!carregando && !erro && (
              <>
                <p className="admin__resumo" aria-live="polite">
                  {filtrando
                    ? `${filtrados.length} de ${usuarios.length} usuários`
                    : `${usuarios.length} usuários · ${totalAtivos} ativos`}
                  {filtrando && (
                    <button type="button" className="admin__limpar" onClick={handleLimparFiltros}>
                      Limpar filtros
                    </button>
                  )}
                </p>

                {filtrados.length === 0 ? (
                  <p className="admin__aviso">
                    {usuarios.length === 0 ? "Nenhum usuário cadastrado." : "Nenhum usuário encontrado com esses filtros."}
                  </p>
                ) : (
                  <div className="admin__tabela-area">
                    <table className="admin__tabela">
                      <thead>
                        <tr>
                          <th scope="col">Usuário</th>
                          <th scope="col">NIF</th>
                          <th scope="col">Perfil</th>
                          <th scope="col">Cargo</th>
                          <th scope="col">Situação</th>
                          <th scope="col">
                            <span className="admin__sr">Ações</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtrados.map((usuario) => (
                          <tr
                            key={usuario.id}
                            className={usuario.ativo ? "" : "admin__linha--inativa"}
                            onClick={() => handleEditar(usuario)}
                          >
                            <td data-rotulo="Usuário">
                              <div className="admin__usuario">
                                <span className="admin__avatar" aria-hidden="true">
                                  {usuario.nome?.trim().charAt(0).toUpperCase()}
                                </span>
                                <span className="admin__usuario-textos">
                                  <span className="admin__nome">
                                    {usuario.nome}
                                    {usuario.id === usuarioLogado?.id && (
                                      <span className="admin__voce">você</span>
                                    )}
                                  </span>
                                  <span className="admin__email">{usuario.email || "Sem e-mail"}</span>
                                </span>
                              </div>
                            </td>
                            <td data-rotulo="NIF">{usuario.nif}</td>
                            <td data-rotulo="Perfil">
                              <span className={`admin__selo admin__selo--${usuario.role?.toLowerCase()}`}>
                                {rotuloRole(usuario.role)}
                              </span>
                            </td>
                            <td data-rotulo="Cargo">{rotuloCargo(usuario.cargo)}</td>
                            <td data-rotulo="Situação">
                              <span className={`admin__situacao admin__situacao--${usuario.ativo ? "ativo" : "inativo"}`}>
                                {usuario.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </td>
                            <td className="admin__acoes">
                              <button
                                type="button"
                                className="admin__editar"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleEditar(usuario);
                                }}
                                aria-label={`Editar ${usuario.nome}`}
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            </div>
          </>
        )}
      </main>

      {modal === "novo" && (
        <UsuarioModal
          usuario={null}
          onFechar={fecharModal}
          onCriado={handleCriado}
          onNaoAutenticado={tratarNaoAutenticado}
        />
      )}
      {usuarioEmEdicao && (
        <UsuarioModal
          key={usuarioEmEdicao.id}
          usuario={usuarioEmEdicao}
          ehVoceMesmo={usuarioEmEdicao.id === usuarioLogado?.id}
          onFechar={fecharModal}
          onAtualizado={handleAtualizado}
          onNaoAutenticado={tratarNaoAutenticado}
        />
      )}
    </div>
  );
}
