import { useRef } from "react";
import "./Abas.css";

// Lista de abas acessível (padrão WAI-ARIA Tabs). Os painéis ficam com quem usa
// o componente, ligados por `${idBase}-painel-${aba.id}` / `${idBase}-aba-${aba.id}`.
export default function Abas({ idBase, abas, ativa, onSelecionar, rotulo }) {
  const botoes = useRef({});

  function handleKeyDown(event) {
    const indice = abas.findIndex((aba) => aba.id === ativa);
    const destinos = {
      ArrowRight: (indice + 1) % abas.length,
      ArrowLeft: (indice - 1 + abas.length) % abas.length,
      Home: 0,
      End: abas.length - 1,
    };
    if (!(event.key in destinos)) return;

    event.preventDefault();
    const proxima = abas[destinos[event.key]];
    onSelecionar(proxima.id);
    botoes.current[proxima.id]?.focus();
  }

  return (
    <div className="abas" role="tablist" aria-label={rotulo} onKeyDown={handleKeyDown}>
      {abas.map((aba) => {
        const selecionada = aba.id === ativa;
        return (
          <button
            key={aba.id}
            ref={(elemento) => {
              botoes.current[aba.id] = elemento;
            }}
            type="button"
            role="tab"
            id={`${idBase}-aba-${aba.id}`}
            className={`abas__aba${selecionada ? " abas__aba--ativa" : ""}`}
            aria-selected={selecionada}
            aria-controls={`${idBase}-painel-${aba.id}`}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => onSelecionar(aba.id)}
          >
            {aba.rotulo}
            {aba.alerta > 0 && (
              <span className="abas__alerta" aria-label={`${aba.alerta} campo(s) com erro`}>
                {aba.alerta}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
