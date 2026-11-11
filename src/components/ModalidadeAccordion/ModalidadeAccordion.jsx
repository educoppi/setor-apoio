import { useId, useState } from "react";
import "./ModalidadeAccordion.css";

function IconeSeta() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
      <path
        d="M6 15l6-6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ModalidadeAccordion({ titulo, turmas }) {
  const [aberto, setAberto] = useState(false);
  const painelId = useId();

  return (
    <section className={`modalidade${aberto ? " modalidade--aberta" : ""}`}>
      <button
        type="button"
        className="modalidade__cabecalho"
        aria-expanded={aberto}
        aria-controls={painelId}
        onClick={() => setAberto((valor) => !valor)}
      >
        <span className="modalidade__titulo">{titulo}</span>
        <span className="modalidade__seta">
          <IconeSeta />
        </span>
      </button>

      <div id={painelId} className="modalidade__painel" role="region" inert={!aberto}>
        <ul className="modalidade__turmas">
          {turmas.map((turma, indice) => (
            <li
              key={turma.id}
              className="modalidade__turma"
              style={{ backgroundColor: turma.cor, "--indice": indice }}
              title={turma.nome}
            >
              {turma.nome}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
