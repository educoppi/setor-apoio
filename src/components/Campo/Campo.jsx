import "./Campo.css";

// Rótulo + controle (input/select/textarea) + dica/erro, com os atributos de
// acessibilidade ligados. `variante="destaque"` é o estilo dos campos do topo.
export default function Campo({
  id,
  rotulo,
  obrigatorio = false,
  erro,
  dica,
  as: Controle = "input",
  variante = "padrao",
  className = "",
  children,
  ...props
}) {
  const erroId = `${id}-erro`;
  const dicaId = `${id}-dica`;
  const descritores = [erro && erroId, dica && dicaId].filter(Boolean).join(" ") || undefined;
  const classes = [
    "campo",
    `campo--${variante}`,
    Controle === "select" && "campo--select",
    erro && "campo--invalido",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
        {obrigatorio && (
          <span className="campo__obrigatorio" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>

      <Controle
        id={id}
        className="campo__controle"
        aria-invalid={erro ? true : undefined}
        aria-required={obrigatorio || undefined}
        aria-describedby={descritores}
        {...props}
      >
        {children}
      </Controle>

      {dica && (
        <p id={dicaId} className="campo__dica">
          {dica}
        </p>
      )}
      {erro && (
        <p id={erroId} className="campo__erro">
          {erro}
        </p>
      )}
    </div>
  );
}
