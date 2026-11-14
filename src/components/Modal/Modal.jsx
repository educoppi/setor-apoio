import { useEffect, useId, useLayoutEffect, useRef } from "react";
import "./Modal.css";

// Casca de modal no padrão do sistema (cantos arredondados, título com linha
// vermelha). Esc e clique no fundo chamam `onFechar`, que decide se fecha.
export default function Modal({ titulo, subtitulo, largura = 680, onFechar, children }) {
  const tituloId = useId();
  const caixaRef = useRef(null);
  const onFecharRef = useRef(onFechar);
  useLayoutEffect(() => {
    onFecharRef.current = onFechar;
  });

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onFecharRef.current?.();
    }
    const focoAnterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    // Foca o primeiro campo (ou a própria caixa) ao abrir.
    const primeiro = caixaRef.current?.querySelector(
      "input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
    );
    (primeiro ?? caixaRef.current)?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus?.();
    };
  }, []);

  function handleFundoMouseDown(event) {
    if (event.target === event.currentTarget) onFecharRef.current?.();
  }

  return (
    <div className="modal__fundo" onMouseDown={handleFundoMouseDown}>
      <section
        ref={caixaRef}
        className="modal"
        style={{ maxWidth: largura }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
      >
        <h2 className="modal__titulo" id={tituloId}>
          {titulo}
        </h2>
        <hr className="modal__linha" />
        {subtitulo && <p className="modal__subtitulo">{subtitulo}</p>}
        {children}
      </section>
    </div>
  );
}
