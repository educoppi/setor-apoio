import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CIDADES_SP } from "../../data/cidadesSP";
import "../Campo/Campo.css";
import "./CampoCidade.css";

const LIMITE_OPCOES = 60;

function normalizar(texto = "") {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

const CIDADES_NORMALIZADAS = CIDADES_SP.map((cidade) => ({ ...cidade, chave: normalizar(cidade.nome) }));

// Filtra mantendo a ordem por distância; nomes que começam com o termo vêm antes.
function filtrar(termo) {
  const t = normalizar(termo);
  if (!t) return CIDADES_NORMALIZADAS;
  const comecam = [];
  const contem = [];
  for (const cidade of CIDADES_NORMALIZADAS) {
    if (cidade.chave.startsWith(t)) comecam.push(cidade);
    else if (cidade.chave.includes(t)) contem.push(cidade);
  }
  return [...comecam, ...contem];
}

function cidadeDaLista(nome) {
  const chave = normalizar(nome);
  return CIDADES_NORMALIZADAS.find((cidade) => cidade.chave === chave) ?? null;
}

// Campo de cidade com busca (padrão combobox): municípios de SP do mais próximo
// ao mais distante de São Carlos. Só aceita uma cidade da lista; um valor antigo
// que não esteja nela é mantido até ser trocado.
export default function CampoCidade({
  id,
  rotulo = "Cidade",
  valor,
  onChange,
  onBlur,
  erro,
  dica,
  obrigatorio = false,
  somenteLeitura = false,
  variante = "destaque",
  className = "",
}) {
  const listaId = useId();
  const raizRef = useRef(null);
  const listaRef = useRef(null);
  const [texto, setTexto] = useState(valor ?? "");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [digitou, setDigitou] = useState(false);

  // Valor trocado por fora (ex.: ficha carregada, edição cancelada).
  const [valorAnterior, setValorAnterior] = useState(valor);
  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    setTexto(valor ?? "");
  }

  // Ao abrir sem digitar, mostra a lista toda (a partir das mais próximas).
  const opcoes = useMemo(() => filtrar(digitou ? texto : ""), [texto, digitou]);
  const visiveis = opcoes.slice(0, LIMITE_OPCOES);

  useEffect(() => {
    if (!aberto) return;
    listaRef.current?.querySelector(`[data-indice="${ativo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ativo, aberto]);

  function abrir() {
    if (somenteLeitura) return;
    setAberto(true);
    setAtivo(0);
  }

  function escolher(cidade) {
    setTexto(cidade.nome);
    setDigitou(false);
    setAberto(false);
    if (cidade.nome !== valor) onChange(cidade.nome);
  }

  // Ao sair: aceita o texto se for exatamente uma cidade; senão volta ao último valor.
  function confirmarTexto() {
    const encontrada = cidadeDaLista(texto);
    if (encontrada) {
      if (encontrada.nome !== valor) onChange(encontrada.nome);
      setTexto(encontrada.nome);
    } else if (!texto.trim()) {
      if (valor) onChange("");
      setTexto("");
    } else {
      setTexto(valor ?? "");
    }
    setDigitou(false);
  }

  function handleBlur(event) {
    if (raizRef.current?.contains(event.relatedTarget)) return;
    setAberto(false);
    confirmarTexto();
    onBlur?.({ target: { name: "cidade" } });
  }

  function handleKeyDown(event) {
    if (somenteLeitura) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!aberto) abrir();
        else setAtivo((i) => Math.min(i + 1, visiveis.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setAtivo((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        // Nunca envia o formulário da ficha a partir deste campo.
        event.preventDefault();
        if (aberto && visiveis[ativo]) escolher(visiveis[ativo]);
        break;
      case "Escape":
        if (aberto) {
          event.preventDefault();
          setAberto(false);
          setTexto(valor ?? "");
          setDigitou(false);
        }
        break;
      case "Tab":
        if (aberto && digitou && visiveis[ativo]) escolher(visiveis[ativo]);
        break;
      default:
    }
  }

  const erroId = `${id}-erro`;
  const dicaId = `${id}-dica`;
  const descritores = [erro && erroId, dica && dicaId].filter(Boolean).join(" ") || undefined;
  const classes = ["campo", `campo--${variante}`, "campo-cidade", erro && "campo--invalido", className].filter(Boolean).join(" ");
  const ativoId = aberto && visiveis[ativo] ? `${listaId}-${ativo}` : undefined;

  return (
    <div className={classes} ref={raizRef}>
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
        {obrigatorio && (
          <span className="campo__obrigatorio" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>

      <div className="campo-cidade__caixa">
        <input
          id={id}
          name="cidade"
          className="campo__controle campo-cidade__input"
          type="text"
          role="combobox"
          autoComplete="off"
          placeholder="CIDADE"
          value={texto}
          readOnly={somenteLeitura}
          aria-autocomplete="list"
          aria-expanded={aberto}
          aria-controls={listaId}
          aria-activedescendant={ativoId}
          aria-invalid={erro ? true : undefined}
          aria-required={obrigatorio || undefined}
          aria-describedby={descritores}
          onChange={(event) => {
            setTexto(event.target.value);
            setDigitou(true);
            setAberto(true);
            setAtivo(0);
          }}
          onFocus={(event) => {
            if (!somenteLeitura) event.target.select();
          }}
          onClick={() => (aberto ? null : abrir())}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {!somenteLeitura && (
          <button
            type="button"
            className="campo-cidade__seta"
            tabIndex={-1}
            aria-label={aberto ? "Fechar lista de cidades" : "Abrir lista de cidades"}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (aberto) setAberto(false);
              else {
                abrir();
                document.getElementById(id)?.focus();
              }
            }}
          />
        )}

        {aberto && (
          <ul ref={listaRef} id={listaId} className="campo-cidade__lista" role="listbox" aria-label="Cidades de São Paulo">
            {visiveis.length === 0 && (
              <li className="campo-cidade__vazio" role="presentation">
                Nenhuma cidade de SP com “{texto.trim()}”.
              </li>
            )}
            {visiveis.map((cidade, indice) => (
              <li
                key={cidade.nome}
                id={`${listaId}-${indice}`}
                data-indice={indice}
                role="option"
                aria-selected={indice === ativo}
                className={`campo-cidade__opcao${indice === ativo ? " campo-cidade__opcao--ativa" : ""}${cidade.nome === valor ? " campo-cidade__opcao--escolhida" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setAtivo(indice)}
                onClick={() => escolher(cidade)}
              >
                <span className="campo-cidade__nome">{cidade.nome}</span>
              </li>
            ))}
            {opcoes.length > visiveis.length && (
              <li className="campo-cidade__mais" role="presentation">
                + {opcoes.length - visiveis.length} cidades. Digite para filtrar.
              </li>
            )}
          </ul>
        )}
      </div>

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
