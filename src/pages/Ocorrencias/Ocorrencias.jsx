import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Campo from "../../components/Campo/Campo";
import Header from "../../components/Header/Header";
import { buscarAlunosPorNome } from "../../services/alunos";
import { getToken } from "../../services/api";
import { getUsuario, logout } from "../../services/auth";
import { listarCategorias, listarOcorrencias, ORIGENS, rotuloOrigem } from "../../services/ocorrencias";
import { ehSolicitante } from "../../services/usuarios";
import { formatarDataHora } from "../../utils/formatos";
import "../Solicitacoes/Solicitacoes.css";
import "../Atendimentos/Atendimentos.css";
import "./Ocorrencias.css";

const TAMANHO_PAGINA = 12;
const BUSCA_MINIMA = 2;

const ORDENS = [
  { valor: "dataHora,DESC", rotulo: "Mais recentes primeiro" },
  { valor: "dataHora,ASC", rotulo: "Mais antigas primeiro" },
];

const FILTROS_VAZIOS = { categoriaId: "", origem: "", de: "", ate: "" };

// Ficha do aluno já na aba Ocorrências, com esta ocorrência em destaque;
// o voltar da ficha traz de volta para esta lista.
function caminhoFicha(ocorrencia) {
  const query = new URLSearchParams({ aba: "ocorrencias", ocorrencia: ocorrencia.id, origem: "ocorrencias" });
  return `/alunos/${ocorrencia.alunoId}?${query}`;
}

function CartaoOcorrencia({ ocorrencia: o, filtrandoAluno, onAbrir, onFiltrarAluno }) {
  const imagens = o.imagens?.length ?? 0;
  const solicitacoes = o.solicitacaoIds ?? [];
  return (
    <li className="atendimentos__item">
      <article className="atendimentos__cartao">
        <button type="button" className="atendimentos__cartao-corpo" onClick={() => onAbrir(o)}>
          <span className="solicitacoes__cartao-topo">
            <span className="solicitacoes__cartao-data">
              #{o.id} · {formatarDataHora(o.dataHora)}
            </span>
            <span className="tag tag--escura">Origem: {rotuloOrigem(o.origem)}</span>
          </span>
          <span className="solicitacoes__cartao-aluno">{o.alunoNome ?? `Aluno #${o.alunoId}`}</span>
          {(o.categorias ?? []).length > 0 && (
            <span className="solicitacoes__cartao-motivo">
              {o.categorias.map((categoria) => (
                <span key={categoria.id} className="tag">
                  {categoria.nome}
                </span>
              ))}
            </span>
          )}
          <span className="solicitacoes__cartao-descricao ocorrencias__descricao">{o.descricao}</span>
          <span className="solicitacoes__cartao-rodape">
            <span>Registrada por {o.responsavel?.nome ?? "—"}</span>
            <span className="ocorrencias__extras">
              {imagens > 0 && <span>{imagens === 1 ? "1 imagem" : `${imagens} imagens`}</span>}
              {solicitacoes.length > 0 && (
                <span>
                  {solicitacoes.length === 1 ? "Solicitação" : "Solicitações"} {solicitacoes.map((id) => `#${id}`).join(", ")}
                </span>
              )}
            </span>
          </span>
        </button>

        <div className="atendimentos__cartao-acoes">
          {filtrandoAluno ? (
            <span className="atendimentos__vinculo">Ocorrência deste aluno</span>
          ) : (
            <button type="button" className="ocorrencias__botao-texto" onClick={() => onFiltrarAluno(o)}>
              Ver só deste aluno
            </button>
          )}
          <button type="button" className="atendimentos__acao atendimentos__acao--secundaria" onClick={() => onAbrir(o)}>
            Abrir na ficha
          </button>
        </div>
      </article>
    </li>
  );
}

// Filtro de aluno: busca por nome (GET /alunos?busca=) e guarda o escolhido.
function FiltroAluno({ aluno, onEscolher, onNaoAutenticado }) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState(false);

  const termo = busca.trim();
  const buscaValida = termo.length >= BUSCA_MINIMA;

  useEffect(() => {
    if (!buscaValida || aluno) return undefined;
    let ativo = true;
    const espera = setTimeout(() => {
      setBuscando(true);
      buscarAlunosPorNome(termo)
        .then((dados) => ativo && setResultados(dados?.content ?? []))
        .catch((error) => {
          if (ativo && !onNaoAutenticado(error)) setResultados([]);
        })
        .finally(() => ativo && setBuscando(false));
    }, 300);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [termo, buscaValida, aluno, onNaoAutenticado]);

  function escolher(item) {
    onEscolher({ id: item.id, nome: item.nome });
    setBusca("");
    setResultados([]);
    setAberto(false);
  }

  if (aluno) {
    return (
      <div className="campo ocorrencias__aluno">
        <span className="campo__rotulo">Aluno</span>
        <span className="ocorrencias__aluno-escolhido">
          <span className="ocorrencias__aluno-nome">{aluno.nome}</span>
          <button
            type="button"
            className="ocorrencias__aluno-limpar"
            onClick={() => onEscolher(null)}
            aria-label={`Remover o filtro do aluno ${aluno.nome}`}
          >
            ×
          </button>
        </span>
      </div>
    );
  }

  const mostrarLista = aberto && buscaValida;

  return (
    <div
      className="ocorrencias__aluno"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setAberto(false)}
      onKeyDown={(e) => e.key === "Escape" && setAberto(false)}
    >
      <Campo
        id="ocorrencias-aluno"
        rotulo="Aluno"
        type="search"
        placeholder="Buscar pelo nome"
        value={busca}
        autoComplete="off"
        role="combobox"
        aria-expanded={mostrarLista}
        aria-controls="ocorrencias-aluno-lista"
        onChange={(e) => {
          setBusca(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
      />
      {mostrarLista && (
        <ul id="ocorrencias-aluno-lista" className="ocorrencias__aluno-lista" role="listbox" aria-label="Alunos encontrados">
          {buscando && resultados.length === 0 && <li className="ocorrencias__aluno-aviso">Buscando...</li>}
          {!buscando && resultados.length === 0 && <li className="ocorrencias__aluno-aviso">Nenhum aluno encontrado.</li>}
          {resultados.map((item) => (
            <li key={item.id} role="option" aria-selected="false">
              <button type="button" className="ocorrencias__aluno-opcao" onClick={() => escolher(item)}>
                {item.nome}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Todas as ocorrências registradas (GET /ocorrencias), para o Setor de Apoio
// e administradores. Solicitantes não veem o conteúdo das ocorrências.
export default function Ocorrencias() {
  const navigate = useNavigate();
  const [usuario] = useState(getUsuario);

  const [aluno, setAluno] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [ordem, setOrdem] = useState(ORDENS[0].valor);
  const [categorias, setCategorias] = useState([]);

  const [itens, setItens] = useState([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalItens, setTotalItens] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState("");
  const [recarga, setRecarga] = useState(0);

  const tratarNaoAutenticado = useCallback(
    (error) => {
      if (error.status !== 401) return false;
      logout();
      navigate("/", { replace: true });
      return true;
    },
    [navigate],
  );

  useEffect(() => {
    if (!getToken() || ehSolicitante(getUsuario())) return;
    // Inclui as inativas: ocorrências antigas podem usar categorias desativadas.
    listarCategorias({ somenteAtivas: false })
      .then((lista) =>
        setCategorias([...(lista ?? [])].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"))),
      )
      .catch(tratarNaoAutenticado);
  }, [tratarNaoAutenticado]);

  const periodoInvalido = Boolean(filtros.de && filtros.ate && filtros.de > filtros.ate);
  const parametros = { ...filtros, alunoId: aluno?.id ?? "" };
  const chave = JSON.stringify(parametros);

  useEffect(() => {
    if (!getToken() || ehSolicitante(getUsuario()) || periodoInvalido) return undefined;
    let ativo = true;
    listarOcorrencias(JSON.parse(chave), 0, TAMANHO_PAGINA, ordem)
      .then((dados) => {
        if (!ativo) return;
        setItens(dados?.content ?? []);
        setPagina(0);
        setTotalPaginas(dados?.page?.totalPages ?? 0);
        setTotalItens(dados?.page?.totalElements ?? 0);
        setErro("");
      })
      .catch((error) => {
        if (ativo && !tratarNaoAutenticado(error)) setErro(error.message);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [chave, ordem, recarga, periodoInvalido, tratarNaoAutenticado]);

  if (!getToken()) return <Navigate to="/" replace />;
  if (ehSolicitante(usuario)) return <Navigate to="/solicitacoes" replace />;

  function alterarFiltro(event) {
    const { name, value } = event.target;
    const proximos = { ...filtros, [name]: value };
    if (!(proximos.de && proximos.ate && proximos.de > proximos.ate)) setCarregando(true);
    setFiltros(proximos);
  }

  function escolherAluno(escolhido) {
    setCarregando(true);
    setAluno(escolhido);
  }

  function limparFiltros() {
    setCarregando(true);
    setAluno(null);
    setFiltros(FILTROS_VAZIOS);
  }

  function handleCarregarMais() {
    const proxima = pagina + 1;
    setCarregandoMais(true);
    listarOcorrencias(parametros, proxima, TAMANHO_PAGINA, ordem)
      .then((dados) => {
        setItens((atual) => [...atual, ...(dados?.content ?? [])]);
        setPagina(proxima);
        setTotalPaginas(dados?.page?.totalPages ?? 0);
      })
      .catch((error) => {
        if (!tratarNaoAutenticado(error)) setErro(error.message);
      })
      .finally(() => setCarregandoMais(false));
  }

  const filtrando = Boolean(aluno || Object.values(filtros).some(Boolean));

  return (
    <div className="solicitacoes">
      <Header nome={usuario?.nome ?? ""} role={usuario?.role} />

      <main className="solicitacoes__conteudo">
        <div className="atendimentos__topo">
          <button type="button" className="atendimentos__voltar" onClick={() => navigate("/home")} aria-label="Voltar para a página inicial">
            <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="solicitacoes__saudacao">Ocorrências</h1>
            <p className="atendimentos__subtitulo">
              Todos os registros de acompanhamento feitos pelo Setor de Apoio. Abra uma ocorrência para vê-la na ficha
              do aluno.
            </p>
          </div>
        </div>

        <div className="ocorrencias__filtros">
          <FiltroAluno aluno={aluno} onEscolher={escolherAluno} onNaoAutenticado={tratarNaoAutenticado} />
          <Campo id="ocorrencias-categoria" name="categoriaId" as="select" rotulo="Categoria" value={filtros.categoriaId} onChange={alterarFiltro}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
                {c.ativo === false ? " (inativa)" : ""}
              </option>
            ))}
          </Campo>
          <Campo id="ocorrencias-origem" name="origem" as="select" rotulo="Origem" value={filtros.origem} onChange={alterarFiltro}>
            <option value="">Todas</option>
            {ORIGENS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </Campo>
          <Campo id="ocorrencias-de" name="de" type="date" rotulo="De" value={filtros.de} max={filtros.ate || undefined} onChange={alterarFiltro} />
          <Campo
            id="ocorrencias-ate"
            name="ate"
            type="date"
            rotulo="Até"
            value={filtros.ate}
            min={filtros.de || undefined}
            onChange={alterarFiltro}
            erro={periodoInvalido ? "A data final é anterior à inicial." : undefined}
          />
          <Campo id="ocorrencias-ordem" as="select" rotulo="Ordenar" value={ordem} onChange={(e) => (setCarregando(true), setOrdem(e.target.value))}>
            {ORDENS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </Campo>
        </div>

        <div className="solicitacoes__lista-area" aria-busy={carregando || undefined}>
          {periodoInvalido && (
            <p className="solicitacoes__aviso ocorrencias__resumo">
              <span>Corrija o período para ver as ocorrências.</span>
              <button type="button" className="ocorrencias__botao-texto" onClick={limparFiltros}>
                Limpar filtros
              </button>
            </p>
          )}

          {!periodoInvalido && carregando && <p className="solicitacoes__aviso">Carregando ocorrências...</p>}

          {!periodoInvalido && !carregando && erro && (
            <div className="solicitacoes__aviso solicitacoes__aviso--erro" role="alert">
              <span>Não foi possível carregar as ocorrências: {erro}</span>
              <button
                type="button"
                onClick={() => {
                  setCarregando(true);
                  setErro("");
                  setRecarga((n) => n + 1);
                }}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!periodoInvalido && !carregando && !erro && itens.length === 0 && (
            <div className="solicitacoes__vazio">
              <p className="solicitacoes__vazio-titulo">
                {filtrando ? "Nenhuma ocorrência com esses filtros." : "Nenhuma ocorrência registrada."}
              </p>
              {filtrando && (
                <button type="button" className="ocorrencias__botao-texto" onClick={limparFiltros}>
                  Limpar filtros
                </button>
              )}
            </div>
          )}

          {!periodoInvalido && !carregando && !erro && itens.length > 0 && (
            <>
              <p className="solicitacoes__resumo ocorrencias__resumo">
                <span>{totalItens === 1 ? "1 ocorrência" : `${totalItens} ocorrências`}</span>
                {filtrando && (
                  <button type="button" className="ocorrencias__botao-texto" onClick={limparFiltros}>
                    Limpar filtros
                  </button>
                )}
              </p>
              <ul className="solicitacoes__lista">
                {itens.map((item) => (
                  <CartaoOcorrencia
                    key={item.id}
                    ocorrencia={item}
                    filtrandoAluno={Boolean(aluno)}
                    onAbrir={(o) => navigate(caminhoFicha(o))}
                    onFiltrarAluno={(o) => {
                      escolherAluno({ id: o.alunoId, nome: o.alunoNome ?? `Aluno #${o.alunoId}` });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                ))}
              </ul>
              {pagina + 1 < totalPaginas && (
                <button type="button" className="solicitacoes__mais" onClick={handleCarregarMais} disabled={carregandoMais}>
                  {carregandoMais ? "Carregando..." : "Carregar mais"}
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
