import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoSenai from "../../assets/logo-senai-preto.png";
import MenuUsuario from "../MenuUsuario/MenuUsuario";
import { listarSolicitacoes } from "../../services/solicitacoes";
import { ROLE_ADMIN, ROLE_SOLICITANTE } from "../../services/usuarios";
import "./Header.css";

function IconeSino() {
  return (
    <svg
      className="header__sino-icone"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function IconeOcorrencias() {
  return (
    <svg
      className="header__sino-icone"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M9 2.5h6v3H9z" />
      <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" />
    </svg>
  );
}

// `role` vem do usuário logado:
// - administrador: atalho para as ferramentas do administrador;
// - solicitante: sem sino (acompanha tudo na própria área de solicitações);
// - demais (operacional): sino que leva às solicitações recebidas pelo setor.
// Administrador e operacional também têm o atalho para todas as ocorrências.
export default function Header({ nome = "", role }) {
  const navigate = useNavigate();
  const admin = role === ROLE_ADMIN;
  const solicitante = role === ROLE_SOLICITANTE;
  const mostraSino = Boolean(role) && !admin && !solicitante;
  const mostraOcorrencias = Boolean(role) && !solicitante;

  // O ponto vermelho indica que há solicitações aguardando atendimento.
  const [aguardando, setAguardando] = useState(0);
  useEffect(() => {
    if (!mostraSino) return undefined;
    let ativo = true;
    listarSolicitacoes({ status: "AGUARDANDO_ACOMPANHAMENTO" }, 0, 1)
      .then((dados) => ativo && setAguardando(dados?.page?.totalElements ?? 0))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [mostraSino]);
  const temNotificacao = aguardando > 0;

  return (
    <header className="header">
      <Link className="header__marca" to="/home" aria-label="SENAI Setor de Apoio — página inicial">
        <img className="header__logo" src={logoSenai} alt="" />
        <span className="header__divisor" aria-hidden="true" />
        <span className="header__titulo">SETOR DE APOIO</span>
      </Link>

      <div className="header__acoes">
        {mostraOcorrencias && (
          <button
            className="header__sino header__ocorrencias"
            type="button"
            onClick={() => navigate("/ocorrencias")}
            title="Todas as ocorrências"
            aria-label="Todas as ocorrências"
          >
            <IconeOcorrencias />
          </button>
        )}

        {admin ? (
          <button
            className="header__admin"
            type="button"
            onClick={() => navigate("/admin")}
          >
            Ferramentas do Administrador
          </button>
        ) : !mostraSino ? null : (
        <button
          className="header__sino"
          type="button"
          onClick={() => navigate("/atendimentos")}
          title="Solicitações recebidas"
          aria-label={
            temNotificacao
              ? `Solicitações recebidas (${aguardando} aguardando atendimento)`
              : "Solicitações recebidas"
          }
        >
          <IconeSino />
          {temNotificacao && <span className="header__sino-ponto" />}
        </button>
        )}

        <MenuUsuario nome={nome} role={role} />
      </div>
    </header>
  );
}