import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import useImagemProtegida from "../../hooks/useImagemProtegida";
import {
  atualizarOcorrencia,
  criarOcorrencia,
  excluirOcorrencia,
  listarCategorias,
  listarOcorrenciasDoAluno,
  MAX_IMAGENS_OCORRENCIA,
  ORIGENS,
  rotuloOrigem,
} from "../../services/ocorrencias";
import { enviarImagemRelativa, TIPOS_IMAGEM_ACEITOS, validarArquivoImagem } from "../../services/imagens";
import { listarTodasSolicitacoes, rotuloMotivo, rotuloStatus } from "../../services/solicitacoes";
import { ehAdministrador } from "../../services/usuarios";
import { formatarDataHora } from "../../utils/formatos";
import "../Solicitacoes/Solicitacoes.css";
import CategoriasModal from "./CategoriasModal";
import "./OcorrenciasAluno.css";

const EDITOR_VAZIO = { origem: "", categoriaIds: [], descricao: "", imagens: [], solicitacaoIds: [] };

function IconeVoltar() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeSeta() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Miniatura de imagem da API (exige token) ou de um arquivo local recém-escolhido.
function Miniatura({ url, preview, enviando, onRemover, onAbrir, rotulo }) {
  const protegida = useImagemProtegida(preview ? null : url);
  const src = preview ?? protegida;
  return (
    <figure className="ocorrencia__miniatura">
      {onAbrir && src ? (
        <button type="button" className="ocorrencia__miniatura-botao" onClick={() => onAbrir(src)} aria-label={`Ampliar ${rotulo}`}>
          <img src={src} alt="" />
        </button>
      ) : (
        <span className="ocorrencia__miniatura-botao">{src ? <img src={src} alt="" /> : <span className="ocorrencia__miniatura-vazia" />}</span>
      )}
      {enviando && <span className="ocorrencia__miniatura-enviando" aria-label="Enviando imagem" />}
      {onRemover && !enviando && (
        <button type="button" className="ocorrencia__miniatura-remover" onClick={onRemover} aria-label={`Remover ${rotulo}`}>
          ×
        </button>
      )}
    </figure>
  );
}

// Botão com painel suspenso de caixas de seleção (categorias, solicitações).
function SelecaoSuspensa({ id, rotulo, resumo, erro, children, desabilitado }) {
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    function handleFora(event) {
      if (!raizRef.current?.contains(event.target)) setAberto(false);
    }
    function handleEsc(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleFora);
    document.addEventListener("keydown", handleEsc, true);
    return () => {
      document.removeEventListener("mousedown", handleFora);
      document.removeEventListener("keydown", handleEsc, true);
    };
  }, [aberto]);

  return (
    <div className="ocorrencia__suspensa" ref={raizRef}>
      <button
        id={id}
        type="button"
        className={`ocorrencia__suspensa-botao${erro ? " ocorrencia__suspensa-botao--erro" : ""}`}
        aria-expanded={aberto}
        aria-controls={`${id}-painel`}
        onClick={() => setAberto((valor) => !valor)}
        disabled={desabilitado}
      >
        <span>{rotulo}</span>
        {resumo > 0 && <span className="ocorrencia__suspensa-contagem">{resumo}</span>}
        <IconeSeta />
      </button>
      {aberto && (
        <div id={`${id}-painel`} className="ocorrencia__suspensa-painel">
          {children}
        </div>
      )}
      {erro && <p className="campo__erro">{erro}</p>}
    </div>
  );
}

function CartaoOcorrencia({ ocorrencia: o, destacada, podeEditar, onEditar, onExcluir, excluindo, onAbrirImagem }) {
  const [expandida, setExpandida] = useState(false);
  const longa = (o.descricao ?? "").length > 280;
  return (
    <li id={`ocorrencia-${o.id}`} className={`ocorrencia__cartao${destacada ? " ocorrencia__cartao--destaque" : ""}`}>
      <div className="ocorrencia__cartao-topo">
        <div>
          <p className="ocorrencia__cartao-data">{formatarDataHora(o.dataHora)}</p>
          <p className="ocorrencia__cartao-autor">
            Registrada por {o.responsavel?.nome ?? "—"}
            {o.updatedAt && o.updatedAt !== o.dataHora && ` · editada em ${formatarDataHora(o.updatedAt)}`}
          </p>
        </div>
        {podeEditar && (
          <div className="ocorrencia__cartao-acoes">
            <button type="button" className="ocorrencia__botao-texto" onClick={() => onEditar(o)} disabled={excluindo}>
              Editar
            </button>
            <button type="button" className="ocorrencia__botao-texto ocorrencia__botao-texto--perigo" onClick={() => onExcluir(o)} disabled={excluindo}>
              {excluindo ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        )}
      </div>

      <div className="ocorrencia__tags">
        <span className="tag tag--escura">Origem: {rotuloOrigem(o.origem)}</span>
        {(o.categorias ?? []).map((categoria) => (
          <span key={categoria.id} className="tag">
            {categoria.nome}
          </span>
        ))}
      </div>

      <p className={`ocorrencia__descricao${longa && !expandida ? " ocorrencia__descricao--recolhida" : ""}`}>{o.descricao}</p>
      {longa && (
        <button type="button" className="ocorrencia__botao-texto" onClick={() => setExpandida((v) => !v)}>
          {expandida ? "Ver menos" : "Ver relato completo"}
        </button>
      )}

      {(o.imagens ?? []).length > 0 && (
        <div className="ocorrencia__miniaturas">
          {o.imagens.map((url, indice) => (
            <Miniatura key={url} url={url} rotulo={`imagem ${indice + 1}`} onAbrir={onAbrirImagem} />
          ))}
        </div>
      )}

      {(o.solicitacaoIds ?? []).length > 0 && (
        <p className="ocorrencia__vinculos">
          Reúne {o.solicitacaoIds.length === 1 ? "a solicitação" : "as solicitações"}{" "}
          {o.solicitacaoIds.map((id) => `#${id}`).join(", ")}
        </p>
      )}
    </li>
  );
}

// Aba "Ocorrências" da ficha: histórico de acompanhamento do aluno
// (GET /alunos/{id}/ocorrencias) e registro/edição (POST e PUT /ocorrencias).
// O botão SALVAR da barra da ficha chama `salvar()` pelo `ref`.
export default function OcorrenciasAluno({
  ref,
  aluno,
  usuario,
  habilitado,
  bloqueado,
  onEditorChange,
  onNaoAutenticado,
  novaComSolicitacao,
  onNovaComSolicitacaoAberta,
  destaqueId,
}) {
  const alunoId = aluno?.id;
  const admin = ehAdministrador(usuario);

  const [ocorrencias, setOcorrencias] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erroLista, setErroLista] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [mensagem, setMensagem] = useState("");
  const [excluindoId, setExcluindoId] = useState(null);
  const [imagemAmpliada, setImagemAmpliada] = useState(null);

  // Editor: null = fechado; { id: null } = nova; { id, original } = edição.
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EDITOR_VAZIO);
  const [erros, setErros] = useState({});
  const [erroEditor, setErroEditor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const [enviandoImagens, setEnviandoImagens] = useState(0);
  const inputImagemRef = useRef(null);

  const [categorias, setCategorias] = useState([]); // todas, ativas e inativas
  const [categoriasAberto, setCategoriasAberto] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(false);

  // Histórico do aluno.
  useEffect(() => {
    if (!alunoId) return undefined;
    let ativo = true;
    setCarregando(true);
    listarOcorrenciasDoAluno(alunoId)
      .then((lista) => {
        if (!ativo) return;
        setOcorrencias(lista);
        setErroLista("");
      })
      .catch((error) => {
        if (ativo && !onNaoAutenticado?.(error)) setErroLista(error.message);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [alunoId, recarga, onNaoAutenticado]);

  // Categorias (todas: o modal também reativa as inativas) e solicitações do
  // aluno ainda não finalizadas, ao abrir o editor.
  const editorAberto = Boolean(editor);
  useEffect(() => {
    if (!editorAberto || !alunoId) return undefined;
    let ativo = true;
    listarCategorias({ somenteAtivas: false })
      .then((lista) => ativo && setCategorias(lista ?? []))
      .catch((error) => ativo && !onNaoAutenticado?.(error) && setErroEditor(`Não foi possível carregar as categorias: ${error.message}`));
    setCarregandoSolicitacoes(true);
    listarTodasSolicitacoes({ alunoId, emAberto: true })
      .then((lista) => ativo && setSolicitacoes(lista))
      .catch((error) => onNaoAutenticado?.(error))
      .finally(() => ativo && setCarregandoSolicitacoes(false));
    return () => {
      ativo = false;
    };
  }, [editorAberto, alunoId, onNaoAutenticado]);

  useEffect(() => {
    onEditorChange?.({ aberto: editorAberto, salvando });
  }, [editorAberto, salvando, onEditorChange]);

  // Vindo de "Registrar ocorrência" nas solicitações recebidas: abre o
  // registro já com a solicitação associada (uma única vez).
  const pedidoAtendidoRef = useRef(false);
  useEffect(() => {
    if (!novaComSolicitacao || !habilitado || bloqueado || pedidoAtendidoRef.current) return;
    pedidoAtendidoRef.current = true;
    const solicitacaoId = Number(novaComSolicitacao);
    setMensagem("");
    setErros({});
    setErroEditor("");
    setEditor({ id: null, solicitacaoOrigem: solicitacaoId });
    setForm({ ...EDITOR_VAZIO, solicitacaoIds: [solicitacaoId] });
    onNovaComSolicitacaoAberta?.();
  }, [novaComSolicitacao, habilitado, bloqueado, onNovaComSolicitacaoAberta]);

  // Ocorrência pedida pela URL: rola até ela e destaca no histórico.
  useEffect(() => {
    if (!destaqueId || carregando || editorAberto) return;
    document.getElementById(`ocorrencia-${destaqueId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [destaqueId, carregando, editorAberto, ocorrencias]);

  // Libera as pré-visualizações locais ao sair.
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  });
  useEffect(
    () => () => {
      for (const imagem of formRef.current.imagens) if (imagem.preview) URL.revokeObjectURL(imagem.preview);
    },
    [],
  );

  const base = editor?.original
    ? {
        origem: editor.original.origem ?? "",
        categoriaIds: (editor.original.categorias ?? []).map((c) => c.id),
        descricao: editor.original.descricao ?? "",
        imagens: (editor.original.imagens ?? []).map((url) => ({ url })),
        solicitacaoIds: editor.original.solicitacaoIds ?? [],
      }
    : EDITOR_VAZIO;
  const alterado =
    editorAberto &&
    (form.origem !== base.origem ||
      form.descricao !== base.descricao ||
      JSON.stringify([...form.categoriaIds].sort()) !== JSON.stringify([...base.categoriaIds].sort()) ||
      JSON.stringify(form.imagens.map((i) => i.url)) !== JSON.stringify(base.imagens.map((i) => i.url)) ||
      form.solicitacaoIds.length !== base.solicitacaoIds.length);

  function abrirEditor(ocorrencia) {
    setMensagem("");
    setErros({});
    setErroEditor("");
    if (ocorrencia) {
      setEditor({ id: ocorrencia.id, original: ocorrencia });
      setForm({
        origem: ocorrencia.origem ?? "",
        categoriaIds: (ocorrencia.categorias ?? []).map((c) => c.id),
        descricao: ocorrencia.descricao ?? "",
        imagens: (ocorrencia.imagens ?? []).map((url) => ({ url })),
        solicitacaoIds: ocorrencia.solicitacaoIds ?? [],
      });
    } else {
      setEditor({ id: null });
      setForm(EDITOR_VAZIO);
    }
  }

  const fecharEditor = useCallback(() => {
    for (const imagem of formRef.current.imagens) if (imagem.preview) URL.revokeObjectURL(imagem.preview);
    setEditor(null);
    setForm(EDITOR_VAZIO);
    setErros({});
    setErroEditor("");
  }, []);

  function handleVoltarEditor() {
    if (salvando) return;
    if (alterado && !window.confirm("Descartar a ocorrência que está sendo registrada?")) return;
    fecharEditor();
  }

  function alternarLista(campo, id) {
    setForm((atual) => ({
      ...atual,
      [campo]: atual[campo].includes(id) ? atual[campo].filter((v) => v !== id) : [...atual[campo], id],
    }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  async function handleArquivos(event) {
    const arquivos = [...event.target.files];
    event.target.value = "";
    const vagas = MAX_IMAGENS_OCORRENCIA - form.imagens.length;
    if (arquivos.length > vagas) {
      setErros((atual) => ({ ...atual, imagens: `Limite de ${MAX_IMAGENS_OCORRENCIA} imagens por ocorrência.` }));
    } else {
      setErros((atual) => ({ ...atual, imagens: undefined }));
    }

    for (const arquivo of arquivos.slice(0, Math.max(vagas, 0))) {
      const problema = validarArquivoImagem(arquivo);
      if (problema) {
        setErros((atual) => ({ ...atual, imagens: `${arquivo.name}: ${problema}` }));
        continue;
      }
      const chave = `${Date.now()}-${Math.random()}`;
      const preview = URL.createObjectURL(arquivo);
      setForm((atual) => ({ ...atual, imagens: [...atual.imagens, { chave, preview, enviando: true }] }));
      setEnviandoImagens((n) => n + 1);
      try {
        const url = await enviarImagemRelativa(arquivo);
        setForm((atual) => ({
          ...atual,
          imagens: atual.imagens.map((img) => (img.chave === chave ? { ...img, url, enviando: false } : img)),
        }));
      } catch (error) {
        if (onNaoAutenticado?.(error)) return;
        URL.revokeObjectURL(preview);
        setForm((atual) => ({ ...atual, imagens: atual.imagens.filter((img) => img.chave !== chave) }));
        setErros((atual) => ({ ...atual, imagens: `Não foi possível enviar ${arquivo.name}: ${error.message}` }));
      } finally {
        setEnviandoImagens((n) => n - 1);
      }
    }
  }

  function removerImagem(alvo) {
    if (alvo.preview) URL.revokeObjectURL(alvo.preview);
    setForm((atual) => ({ ...atual, imagens: atual.imagens.filter((img) => img !== alvo) }));
    setErros((atual) => ({ ...atual, imagens: undefined }));
  }

  async function salvar() {
    if (!editor || salvandoRef.current) return;
    if (enviandoImagens > 0) {
      setErroEditor("Aguarde o envio das imagens terminar.");
      return;
    }
    const novos = {};
    if (!form.origem) novos.origem = "Selecione a origem.";
    if (form.categoriaIds.length === 0) novos.categoriaIds = "Selecione ao menos uma categoria.";
    if (!form.descricao.trim()) novos.descricao = "Conte o que aconteceu.";
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      const ids = { origem: "ocorrencia-origem", categoriaIds: "ocorrencia-categorias", descricao: "ocorrencia-descricao" };
      document.getElementById(ids[Object.keys(novos)[0]])?.focus();
      return;
    }

    const corpo = {
      descricao: form.descricao.trim(),
      origem: form.origem,
      categoriaIds: form.categoriaIds,
      imagens: form.imagens.map((img) => img.url).filter(Boolean),
      // No PUT a API mantém as já associadas (que podem até estar finalizadas):
      // envia só as novas.
      solicitacaoIds: editor.id
        ? form.solicitacaoIds.filter((id) => !base.solicitacaoIds.includes(id))
        : form.solicitacaoIds,
    };

    salvandoRef.current = true;
    setSalvando(true);
    setErroEditor("");
    try {
      if (editor.id) await atualizarOcorrencia(editor.id, corpo);
      else await criarOcorrencia({ ...corpo, alunoId });
      setMensagem(editor.id ? "Ocorrência atualizada." : "Ocorrência registrada no histórico do aluno.");
      fecharEditor();
      setRecarga((n) => n + 1);
    } catch (error) {
      if (onNaoAutenticado?.(error)) return;
      const daApi = {};
      for (const { campo, mensagem: texto } of error.campos ?? []) {
        if (campo in EDITOR_VAZIO) daApi[campo] = texto;
      }
      setErros(daApi);
      setErroEditor(error.status === 403 ? "Somente o autor da ocorrência ou um administrador pode alterá-la." : error.message);
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  }

  useImperativeHandle(ref, () => ({ salvar, temAlteracoes: () => alterado }));

  async function handleExcluir(ocorrencia) {
    if (!window.confirm(`Excluir a ocorrência de ${formatarDataHora(ocorrencia.dataHora)}? Ela deixará de aparecer no histórico do aluno.`)) return;
    setExcluindoId(ocorrencia.id);
    setMensagem("");
    try {
      await excluirOcorrencia(ocorrencia.id);
      setOcorrencias((atual) => atual.filter((o) => o.id !== ocorrencia.id));
      setMensagem("Ocorrência excluída.");
    } catch (error) {
      if (!onNaoAutenticado?.(error)) setErroLista(error.message);
    } finally {
      setExcluindoId(null);
    }
  }

  // ---------------------------------------------------------------- Editor
  if (editor) {
    const idAtual = editor.id;
    const jaAssociadas = new Set(base.solicitacaoIds);
    const candidatas = solicitacoes.filter((s) => !s.ocorrenciaId || s.ocorrenciaId === idAtual || jaAssociadas.has(s.id));
    const vinculadasOutra = solicitacoes.filter((s) => s.ocorrenciaId && s.ocorrenciaId !== idAtual && !jaAssociadas.has(s.id));
    // Categorias marcadas, na ordem da seleção; se ainda não carregaram, usa as da própria ocorrência.
    const categoriasSelecionadas = form.categoriaIds
      .map((id) => categorias.find((c) => c.id === id) ?? editor.original?.categorias?.find((c) => c.id === id))
      .filter(Boolean);

    return (
      <div className="ocorrencia-editor" aria-label={idAtual ? "Editar ocorrência" : "Registrar ocorrência"} role="group">
        <div className="ocorrencia-editor__linha">
          <button type="button" className="ocorrencia-editor__voltar" onClick={handleVoltarEditor} aria-label="Voltar ao histórico de ocorrências" disabled={salvando}>
            <IconeVoltar />
          </button>

          <div className="ocorrencia-editor__origem">
            <label className="ocorrencia-editor__rotulo-oculto" htmlFor="ocorrencia-origem">
              Origem da ocorrência
            </label>
            <select
              id="ocorrencia-origem"
              className={`ocorrencia-editor__titulo${form.origem ? "" : " ocorrencia-editor__titulo--vazio"}${erros.origem ? " ocorrencia-editor__campo--erro" : ""}`}
              value={form.origem}
              onChange={(event) => {
                setForm((atual) => ({ ...atual, origem: event.target.value }));
                setErros((atual) => ({ ...atual, origem: undefined }));
              }}
              disabled={salvando}
            >
              <option value="">ORIGEM DA OCORRÊNCIA...</option>
              {ORIGENS.map((origem) => (
                <option key={origem.valor} value={origem.valor}>
                  {origem.rotulo}
                </option>
              ))}
            </select>
            {erros.origem && <p className="campo__erro">{erros.origem}</p>}
          </div>

          <div className="ocorrencia-editor__anexar">
            <button
              type="button"
              className="ocorrencia-editor__botao-branco"
              onClick={() => inputImagemRef.current?.click()}
              disabled={salvando || form.imagens.length >= MAX_IMAGENS_OCORRENCIA}
            >
              ANEXAR IMAGENS
            </button>
            <span className="ocorrencia-editor__limite">
              {form.imagens.length}/{MAX_IMAGENS_OCORRENCIA} imagens
            </span>
            <input
              ref={inputImagemRef}
              type="file"
              accept={TIPOS_IMAGEM_ACEITOS.join(",")}
              multiple
              hidden
              onChange={handleArquivos}
            />
          </div>
        </div>

        <div className="ocorrencia-editor__seletores">
          {/* CATEGORIA abre o modal: selecionar, criar e editar categorias. */}
          <div className="ocorrencia__suspensa">
            <button
              id="ocorrencia-categorias"
              type="button"
              className={`ocorrencia__suspensa-botao ocorrencia__suspensa-botao--modal${erros.categoriaIds ? " ocorrencia__suspensa-botao--erro" : ""}`}
              aria-haspopup="dialog"
              onClick={() => setCategoriasAberto(true)}
              disabled={salvando}
            >
              <span>CATEGORIA</span>
              {form.categoriaIds.length > 0 && <span className="ocorrencia__suspensa-contagem">{form.categoriaIds.length}</span>}
            </button>
            {erros.categoriaIds && <p className="campo__erro">{erros.categoriaIds}</p>}
          </div>

          <SelecaoSuspensa id="ocorrencia-solicitacoes" rotulo="Associar à solicitação" resumo={form.solicitacaoIds.length} desabilitado={salvando}>
            {carregandoSolicitacoes && <p className="ocorrencia__suspensa-vazio">Carregando solicitações...</p>}
            {!carregandoSolicitacoes && candidatas.length === 0 && vinculadasOutra.length === 0 && (
              <p className="ocorrencia__suspensa-vazio">Este aluno não tem solicitações em aberto.</p>
            )}
            {candidatas.map((s) => {
              const fixa = jaAssociadas.has(s.id);
              return (
                <label key={s.id} className={`ocorrencia__opcao${fixa ? " ocorrencia__opcao--fixa" : ""}`}>
                  <input type="checkbox" checked={form.solicitacaoIds.includes(s.id)} disabled={fixa} onChange={() => alternarLista("solicitacaoIds", s.id)} />
                  <span>
                    <strong>
                      #{s.id} · {rotuloMotivo(s.motivo)}
                    </strong>
                    <small>
                      {s.solicitante?.nome}
                      {s.unidadeCurricular && ` · ${s.unidadeCurricular}`} · {rotuloStatus(s.status)}
                    </small>
                    {fixa && <small>Já associada (não pode ser removida).</small>}
                  </span>
                </label>
              );
            })}
            {vinculadasOutra.map((s) => (
              <label key={s.id} className="ocorrencia__opcao ocorrencia__opcao--fixa">
                <input type="checkbox" disabled checked={false} readOnly />
                <span>
                  <strong>
                    #{s.id} · {rotuloMotivo(s.motivo)}
                  </strong>
                  <small>Já vinculada a outra ocorrência.</small>
                </span>
              </label>
            ))}
            <p className="ocorrencia__suspensa-dica">Só aparecem solicitações deste aluno que ainda não foram finalizadas.</p>
          </SelecaoSuspensa>
        </div>

        {editor.solicitacaoOrigem && (
          <p className="ocorrencia-editor__origem-aviso">
            Registrando a partir da solicitação #{editor.solicitacaoOrigem}, que já está marcada em
            “Associar à solicitação”.
          </p>
        )}

        {(categoriasSelecionadas.length > 0 || form.solicitacaoIds.length > 0) && (
          <div className="ocorrencia__tags ocorrencia-editor__selecionados">
            {categoriasSelecionadas.map((c) => (
              <span key={`c${c.id}`} className="tag">
                {c.nome}
                {c.ativo === false && " (inativa)"}
              </span>
            ))}
            {form.solicitacaoIds.map((id) => (
              <span key={`s${id}`} className="tag tag--vermelha">
                Solicitação #{id}
              </span>
            ))}
          </div>
        )}

        <label className="ocorrencia-editor__rotulo-oculto" htmlFor="ocorrencia-descricao">
          Descrição da ocorrência
        </label>
        <textarea
          id="ocorrencia-descricao"
          className={`ocorrencia-editor__texto${erros.descricao ? " ocorrencia-editor__campo--erro" : ""}`}
          placeholder="Conte o que aconteceu..."
          value={form.descricao}
          onChange={(event) => {
            setForm((atual) => ({ ...atual, descricao: event.target.value }));
            setErros((atual) => ({ ...atual, descricao: undefined }));
          }}
          disabled={salvando}
        />
        {erros.descricao && <p className="campo__erro">{erros.descricao}</p>}

        {form.imagens.length > 0 && (
          <div className="ocorrencia__miniaturas">
            {form.imagens.map((imagem, indice) => (
              <Miniatura
                key={imagem.chave ?? imagem.url}
                url={imagem.url}
                preview={imagem.preview}
                enviando={imagem.enviando}
                rotulo={`imagem ${indice + 1}`}
                onRemover={salvando ? undefined : () => removerImagem(imagem)}
              />
            ))}
          </div>
        )}
        {erros.imagens && <p className="campo__erro">{erros.imagens}</p>}

        {erroEditor && (
          <p className="ficha__mensagem ficha__mensagem--erro ocorrencia-editor__erro" role="alert">
            {erroEditor}
          </p>
        )}
        <p className="ocorrencia-editor__dica">Clique em SALVAR, na barra acima, para gravar a ocorrência.</p>

        {categoriasAberto && (
          <CategoriasModal
            categorias={categorias}
            selecionadas={form.categoriaIds}
            onCategoriasChange={setCategorias}
            onAplicar={(ids) => {
              setForm((atual) => ({ ...atual, categoriaIds: ids }));
              setErros((atual) => ({ ...atual, categoriaIds: undefined }));
              setCategoriasAberto(false);
            }}
            onFechar={() => setCategoriasAberto(false)}
            onNaoAutenticado={onNaoAutenticado}
          />
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------- Lista
  return (
    <div className="ocorrencias-aluno">
      <div className="ocorrencias-aluno__cabecalho">
        <div>
          <h3 className="ocorrencias-aluno__titulo">Histórico de acompanhamento</h3>
          <p className="ocorrencias-aluno__subtitulo">Registros internos do Setor de Apoio sobre este aluno.</p>
        </div>
        <button type="button" className="ocorrencias-aluno__registrar" onClick={() => abrirEditor(null)} disabled={!habilitado || bloqueado}>
          + REGISTRAR
        </button>
      </div>

      {!habilitado && <p className="ocorrencias-aluno__aviso">Salve o cadastro do aluno para liberar o registro de ocorrências.</p>}
      {habilitado && bloqueado && (
        <p className="ocorrencias-aluno__aviso">Salve ou cancele a edição da ficha para registrar ocorrências.</p>
      )}

      {mensagem && (
        <p className="ficha__mensagem ficha__mensagem--sucesso" role="status">
          {mensagem}
        </p>
      )}

      {habilitado && carregando && <p className="ocorrencias-aluno__aviso">Carregando ocorrências...</p>}
      {habilitado && !carregando && erroLista && (
        <div className="ficha__mensagem ficha__mensagem--erro ocorrencias-aluno__erro" role="alert">
          <span>Não foi possível carregar as ocorrências: {erroLista}</span>
          <button type="button" onClick={() => setRecarga((n) => n + 1)}>
            Tentar novamente
          </button>
        </div>
      )}
      {habilitado && !carregando && !erroLista && ocorrencias.length === 0 && (
        <p className="ocorrencias-aluno__vazio">Nenhuma ocorrência registrada para este aluno.</p>
      )}
      {habilitado && !carregando && !erroLista && ocorrencias.length > 0 && (
        <ul className="ocorrencias-aluno__lista">
          {ocorrencias.map((ocorrencia) => (
            <CartaoOcorrencia
              key={ocorrencia.id}
              ocorrencia={ocorrencia}
              destacada={String(ocorrencia.id) === String(destaqueId)}
              podeEditar={!bloqueado && (admin || ocorrencia.responsavel?.id === usuario?.id)}
              onEditar={abrirEditor}
              onExcluir={handleExcluir}
              excluindo={excluindoId === ocorrencia.id}
              onAbrirImagem={setImagemAmpliada}
            />
          ))}
        </ul>
      )}

      {imagemAmpliada && (
        <div className="ocorrencia__ampliada" role="dialog" aria-modal="true" aria-label="Imagem ampliada" onMouseDown={() => setImagemAmpliada(null)}>
          <img src={imagemAmpliada} alt="" />
          <button type="button" className="ocorrencia__ampliada-fechar" onClick={() => setImagemAmpliada(null)} aria-label="Fechar imagem">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
