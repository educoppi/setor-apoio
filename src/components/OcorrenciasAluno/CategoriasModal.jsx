import { useMemo, useState } from "react";
import Modal from "../Modal/Modal";
import { atualizarCategoria, criarCategoria, LIMITE_NOME_CATEGORIA } from "../../services/ocorrencias";
import "./CategoriasModal.css";

function normalizar(texto = "") {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function ordenar(lista) {
  return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

// Linha de uma categoria: marcar/desmarcar e, em modo de edição, renomear ou (des)ativar.
function LinhaCategoria({ categoria, marcada, podeMarcar, emEdicao, ocupado, onAlternar, onEditar, onCancelarEdicao, onSalvar, onReativar }) {
  const [nome, setNome] = useState(categoria.nome);
  const [ativa, setAtiva] = useState(categoria.ativo !== false);
  const [erro, setErro] = useState("");

  if (emEdicao) {
    async function salvar(event) {
      event?.preventDefault();
      const limpo = nome.trim();
      if (!limpo) return setErro("Informe o nome.");
      if (limpo.length > LIMITE_NOME_CATEGORIA) return setErro(`Máximo de ${LIMITE_NOME_CATEGORIA} caracteres.`);
      const resultado = await onSalvar(categoria, { nome: limpo, ativo: ativa });
      if (resultado) setErro(resultado);
    }
    return (
      <li className="categorias__item categorias__item--edicao">
        {/* Sem <form>: o modal fica dentro do formulário da ficha. Enter salva. */}
        <div className="categorias__edicao" onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && (e.preventDefault(), salvar())}>
          <label className="categorias__rotulo-oculto" htmlFor={`categoria-nome-${categoria.id}`}>
            Nome da categoria
          </label>
          <input
            id={`categoria-nome-${categoria.id}`}
            className="categorias__input"
            value={nome}
            maxLength={LIMITE_NOME_CATEGORIA}
            onChange={(e) => {
              setNome(e.target.value);
              setErro("");
            }}
            disabled={ocupado}
            autoFocus
          />
          <label className="categorias__ativa">
            <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} disabled={ocupado} />
            Ativa
          </label>
          <div className="categorias__edicao-acoes">
            <button type="button" className="categorias__link" onClick={onCancelarEdicao} disabled={ocupado}>
              Cancelar
            </button>
            <button type="button" className="categorias__salvar" onClick={salvar} disabled={ocupado}>
              {ocupado ? "Salvando..." : "Salvar"}
            </button>
          </div>
          {!ativa && categoria.ativo !== false && (
            <p className="categorias__dica">Categorias inativas deixam de aparecer para novas ocorrências; as ocorrências antigas não mudam.</p>
          )}
          {erro && <p className="campo__erro">{erro}</p>}
        </div>
      </li>
    );
  }

  const inativa = categoria.ativo === false;
  return (
    <li className={`categorias__item${marcada ? " categorias__item--marcada" : ""}${inativa ? " categorias__item--inativa" : ""}`}>
      <label className="categorias__opcao">
        <input type="checkbox" checked={marcada} onChange={() => onAlternar(categoria.id)} disabled={!podeMarcar || ocupado} />
        <span>{categoria.nome}</span>
      </label>
      <div className="categorias__item-acoes">
        {inativa && (
          <button type="button" className="categorias__link" onClick={() => onReativar(categoria)} disabled={ocupado}>
            Reativar
          </button>
        )}
        <button type="button" className="categorias__link" onClick={() => onEditar(categoria.id)} disabled={ocupado} aria-label={`Editar a categoria ${categoria.nome}`}>
          Editar
        </button>
      </div>
    </li>
  );
}

// Modal da categoria da ocorrência: escolhe as categorias (marcadores),
// cria novas (POST /categorias) e edita as existentes (PUT /categorias/{id}).
// Criações e edições valem na hora; a seleção só vai para a ocorrência em "Usar".
export default function CategoriasModal({ categorias, selecionadas, onCategoriasChange, onAplicar, onFechar, onNaoAutenticado }) {
  const [marcadas, setMarcadas] = useState(() => new Set(selecionadas));
  const [busca, setBusca] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [ocupadoId, setOcupadoId] = useState(null);
  const [novoNome, setNovoNome] = useState("");
  const [erroNovo, setErroNovo] = useState("");
  const [criando, setCriando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  const termo = normalizar(busca);
  const { ativas, inativas } = useMemo(() => {
    const filtradas = ordenar(categorias).filter((c) => !termo || normalizar(c.nome).includes(termo));
    return { ativas: filtradas.filter((c) => c.ativo !== false), inativas: filtradas.filter((c) => c.ativo === false) };
  }, [categorias, termo]);

  const ocupado = criando || ocupadoId !== null;
  const alterouSelecao = marcadas.size !== selecionadas.length || selecionadas.some((id) => !marcadas.has(id));

  function tentarFechar() {
    if (ocupado) return;
    if (alterouSelecao && !window.confirm("Descartar a seleção de categorias?")) return;
    onFechar();
  }

  function alternar(id) {
    setMarcadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function substituir(categoria) {
    onCategoriasChange(categorias.map((c) => (c.id === categoria.id ? categoria : c)));
  }

  function erroDaApi(error) {
    if (onNaoAutenticado?.(error)) return null;
    if (error.status === 409) return "Já existe uma categoria com esse nome.";
    return error.campos?.find((c) => c.campo === "nome")?.mensagem ?? error.message;
  }

  async function handleCriar(event) {
    event?.preventDefault();
    if (criando) return;
    const nome = novoNome.trim();
    if (!nome) return setErroNovo("Informe o nome da nova categoria.");
    if (nome.length > LIMITE_NOME_CATEGORIA) return setErroNovo(`Máximo de ${LIMITE_NOME_CATEGORIA} caracteres.`);
    const existente = categorias.find((c) => normalizar(c.nome) === normalizar(nome));
    if (existente) {
      return setErroNovo(
        existente.ativo === false
          ? `“${existente.nome}” já existe, mas está inativa. Reative-a na lista de inativas.`
          : `“${existente.nome}” já existe. Marque-a na lista.`,
      );
    }
    setCriando(true);
    setErroNovo("");
    setMensagem(null);
    try {
      const criada = await criarCategoria(nome);
      onCategoriasChange([...categorias, criada]);
      setMarcadas((atual) => new Set(atual).add(criada.id));
      setNovoNome("");
      setBusca("");
      setMensagem({ tipo: "sucesso", texto: `Categoria “${criada.nome}” criada e marcada.` });
    } catch (error) {
      const texto = erroDaApi(error);
      if (texto) setErroNovo(texto);
    } finally {
      setCriando(false);
    }
  }

  // Devolve uma mensagem de erro (string) para a linha, ou nada em caso de sucesso.
  async function handleSalvar(categoria, dados) {
    const repetida = categorias.find((c) => c.id !== categoria.id && normalizar(c.nome) === normalizar(dados.nome));
    if (repetida) return `Já existe a categoria “${repetida.nome}”.`;
    setOcupadoId(categoria.id);
    setMensagem(null);
    try {
      const atualizada = await atualizarCategoria(categoria.id, dados);
      substituir(atualizada);
      setEditandoId(null);
      const desativou = categoria.ativo !== false && atualizada.ativo === false;
      if (desativou && marcadas.has(categoria.id)) {
        setMarcadas((atual) => {
          const proximo = new Set(atual);
          proximo.delete(categoria.id);
          return proximo;
        });
      }
      setMensagem({
        tipo: "sucesso",
        texto: desativou
          ? `“${atualizada.nome}” foi desativada${marcadas.has(categoria.id) ? " e desmarcada desta ocorrência" : ""}.`
          : `Categoria “${atualizada.nome}” atualizada.`,
      });
      return null;
    } catch (error) {
      return erroDaApi(error) ?? "";
    } finally {
      setOcupadoId(null);
    }
  }

  async function handleReativar(categoria) {
    setOcupadoId(categoria.id);
    setMensagem(null);
    try {
      const atualizada = await atualizarCategoria(categoria.id, { nome: categoria.nome, ativo: true });
      substituir(atualizada);
      setMensagem({ tipo: "sucesso", texto: `“${atualizada.nome}” foi reativada.` });
    } catch (error) {
      const texto = erroDaApi(error);
      if (texto) setMensagem({ tipo: "erro", texto });
    } finally {
      setOcupadoId(null);
    }
  }

  const linha = (categoria) => (
    <LinhaCategoria
      key={`${categoria.id}-${categoria.nome}-${categoria.ativo}`}
      categoria={categoria}
      marcada={marcadas.has(categoria.id)}
      // Inativas só podem ser desmarcadas (caso já estivessem na ocorrência).
      podeMarcar={categoria.ativo !== false || marcadas.has(categoria.id)}
      emEdicao={editandoId === categoria.id}
      ocupado={ocupadoId === categoria.id}
      onAlternar={alternar}
      onEditar={(id) => {
        setMensagem(null);
        setEditandoId(id);
      }}
      onCancelarEdicao={() => setEditandoId(null)}
      onSalvar={handleSalvar}
      onReativar={handleReativar}
    />
  );

  return (
    <Modal titulo="Categorias" subtitulo="Marque as categorias desta ocorrência" largura={620} onFechar={tentarFechar}>
      {/* Enter em qualquer campo não pode enviar o formulário da ficha (submissão implícita). */}
      <div className="categorias" onKeyDown={(e) => e.key === "Enter" && e.target.tagName === "INPUT" && e.preventDefault()}>
        <label className="categorias__rotulo-oculto" htmlFor="categorias-busca">
          Buscar categoria
        </label>
        <input
          id="categorias-busca"
          className="categorias__input categorias__busca"
          type="search"
          placeholder="Buscar categoria..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoComplete="off"
        />

        {mensagem && (
          <p className={`modal__aviso modal__aviso--${mensagem.tipo}`} role={mensagem.tipo === "erro" ? "alert" : "status"}>
            {mensagem.texto}
          </p>
        )}

        <div className="categorias__lista-area">
          {ativas.length === 0 ? (
            <p className="categorias__vazio">
              {termo ? "Nenhuma categoria ativa com esse nome." : "Nenhuma categoria ativa. Crie a primeira abaixo."}
            </p>
          ) : (
            <ul className="categorias__lista">{ativas.map(linha)}</ul>
          )}

          {inativas.length > 0 && (
            <details className="categorias__inativas" open={Boolean(termo) || inativas.some((c) => marcadas.has(c.id)) || undefined}>
              <summary>Inativas ({inativas.length})</summary>
              <ul className="categorias__lista">{inativas.map(linha)}</ul>
            </details>
          )}
        </div>

        <div className="categorias__nova">
          <label className="categorias__nova-rotulo" htmlFor="categorias-nova">
            Nova categoria
          </label>
          <div className="categorias__nova-linha">
            <input
              id="categorias-nova"
              className="categorias__input"
              placeholder="Ex.: Saúde mental/emocional"
              value={novoNome}
              maxLength={LIMITE_NOME_CATEGORIA}
              onChange={(e) => {
                setNovoNome(e.target.value);
                setErroNovo("");
              }}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleCriar(e)}
              disabled={criando}
            />
            <button type="button" className="categorias__criar" onClick={handleCriar} disabled={criando || !novoNome.trim()}>
              {criando ? "Criando..." : "+ Criar"}
            </button>
          </div>
          {erroNovo && <p className="campo__erro">{erroNovo}</p>}
        </div>

        <div className="modal__acoes">
          <button type="button" className="modal__botao modal__botao--secundario" onClick={tentarFechar} disabled={ocupado}>
            Cancelar
          </button>
          <button type="button" className="modal__botao" onClick={() => onAplicar([...marcadas])} disabled={ocupado}>
            {marcadas.size === 0 ? "Usar nenhuma" : marcadas.size === 1 ? "Usar 1 categoria" : `Usar ${marcadas.size} categorias`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
