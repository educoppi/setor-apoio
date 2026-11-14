import { useLayoutEffect, useRef } from "react";
import "./InformacoesQualitativas.css";

// Texto longo e sem limite pequeno de caracteres. A altura acompanha o conteúdo
// até o `max-height` do CSS; a partir daí a rolagem passa a ser interna.
export default function InformacoesQualitativas({ id, valor, onChange, ativa, somenteLeitura }) {
  const textareaRef = useRef(null);

  // Recalcula quando o texto muda e quando a aba volta a ficar visível
  // (em um painel oculto o scrollHeight é 0).
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !ativa) return;
    const bordas = textarea.offsetHeight - textarea.clientHeight;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight + bordas}px`;
  }, [valor, ativa]);

  const caracteres = valor.length;

  return (
    <div className="info-qualitativas">
      <label className="info-qualitativas__rotulo" htmlFor={id}>
        Informações qualitativas
      </label>
      <textarea
        ref={textareaRef}
        id={id}
        name="infoQualitativa"
        className="info-qualitativas__texto"
        placeholder="Insira as informações qualitativas..."
        value={valor}
        onChange={onChange}
        readOnly={somenteLeitura}
        aria-describedby={`${id}-contador`}
      />
      <p id={`${id}-contador`} className="info-qualitativas__contador">
        {caracteres.toLocaleString("pt-BR")} {caracteres === 1 ? "caractere" : "caracteres"} · opcional
      </p>
    </div>
  );
}
