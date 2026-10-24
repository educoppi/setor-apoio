import logoSenai from "../../assets/logo-senai-preto.png";
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

export default function Header({ nome = "", temNotificacao = false }) {
  const inicial = nome.trim().charAt(0).toUpperCase();

  return (
    <header className="header">
      <div className="header__marca">
        <img className="header__logo" src={logoSenai} alt="SENAI" />
        <span className="header__divisor" aria-hidden="true" />
        <h2 className="header__titulo">SETOR DE APOIO</h2>
      </div>

      <div className="header__acoes">
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

        <button className="header__avatar" type="button" aria-label="Menu do usuário">
          {inicial}
        </button>
      </div>
    </header>
  );
}