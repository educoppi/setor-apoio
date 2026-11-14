import { Link, useNavigate } from "react-router-dom";
import logoSenai from "../../assets/logo-senai-preto.png";
import { ROLE_ADMIN } from "../../services/usuarios";
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

// `role` vem do usuário logado: administradores veem o atalho para as
// ferramentas do administrador no lugar do sino de notificações.
export default function Header({ nome = "", role, temNotificacao = false }) {
  const navigate = useNavigate();
  const inicial = nome.trim().charAt(0).toUpperCase();
  const admin = role === ROLE_ADMIN;

  return (
    <header className="header">
      <Link className="header__marca" to="/home" aria-label="SENAI Setor de Apoio — página inicial">
        <img className="header__logo" src={logoSenai} alt="" />
        <span className="header__divisor" aria-hidden="true" />
        <span className="header__titulo">SETOR DE APOIO</span>
      </Link>

      <div className="header__acoes">
        {admin ? (
          <button
            className="header__admin"
            type="button"
            onClick={() => navigate("/admin/usuarios")}
          >
            Ferramentas do Administrador
          </button>
        ) : (
        <button
          className="header__sino"
          type="button"
          aria-label={
            temNotificacao ? "Notificações (há novas)" : "Notificações"
          }
        >
          <IconeSino />
          {temNotificacao && <span className="header__sino-ponto" />}
        </button>
        )}

        <button className="header__avatar" type="button" aria-label="Menu do usuário">
          {inicial}
        </button>
      </div>
    </header>
  );
}