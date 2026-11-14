import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Campo from "../../components/Campo/Campo";
import Header from "../../components/Header/Header";
import SeloStatus from "../../components/Solicitacoes/SeloStatus";
import SolicitacaoDetalheModal from "../../components/Solicitacoes/SolicitacaoDetalheModal";
import { getToken } from "../../services/api";
import { getUsuario, logout } from "../../services/auth";
import { listarAtendentes, listarSolicitacoes, MOTIVOS, rotuloMotivo, STATUS } from "../../services/solicitacoes";
import { listarTurmas } from "../../services/turmas";
import { ehSolicitante, rotuloCargo } from "../../services/usuarios";
import { formatarDataHora } from "../../utils/formatos";
import "../Solicitacoes/Solicitacoes.css";
import "./Atendimentos.css";

const TAMANHO_PAGINA = 12;

// Filtro de status: "aberto" = aguardando + em andamento (padrão).
const FILTROS_ABERTOS = [
  { id: "aberto", rotulo: "Em aberto" },
  { id: "AGUARDANDO_ACOMPANHAMENTO", rotulo: "Aguardando atendimento" },
  { id: "EM_ANDAMENTO", rotulo: "Em andamento" },
];
const FILTROS_FINALIZADAS = [
  { id: "FINALIZADO", rotulo: "Finalizadas" },
  { id: "todas", rotulo: "Todas" },
];

const ORDENS = [
  { valor: "dataHora,ASC", rotulo: "Mais antigas primeiro" },
  { valor: "dataHora,DESC", rotulo: "Mais recentes primeiro" },
];

function parametrosStatus(filtro) {
  if (filtro === "aberto") return { emAberto: true };
  if (filtro === "todas") return {};
  return { status: filtro };
}

function parametrosAtendente(valor, usuarioId) {
  if (valor === "minhas") return { atendenteId: usuarioId };
  if (valor === "sem") return { semAtendente: true };
  if (valor) return { atendenteId: valor };
  return {};
}

function diasDesde(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

// Caminho da ficha do aluno já na aba Ocorrências: abre a ocorrência associada
// ou inicia uma nova com esta solicitação marcada.
function caminhoOcorrencia(solicitacao) {
  const { aluno } = solicitacao;
  const query = new URLSearchParams({ aba: "ocorrencias", origem: "atendimentos" });
  if (aluno?.turmaId) query.set("turma", aluno.turmaId);
  if (solicitacao.ocorrenciaId) query.set("ocorrencia", solicitacao.ocorrenciaId);
  else query.set("novaOcorrencia", solicitacao.id);
  return `/alunos/${aluno?.alunoId}?${query}`;
}

// Só dá para associar solicitações não finalizadas (regra do POST /ocorrencias).
function acaoOcorrencia(solicitacao) {
  if (solicitacao.ocorrenciaId) return { rotulo: "Ver ocorrência", secundaria: true };
  if (solicitacao.status === "FINALIZADO") return null;
  return { rotulo: "Registrar ocorrência", secundaria: false };
}

function CartaoAtendimento({ solicitacao: s, onAbrir, onOcorrencia }) {
  const acao = acaoOcorrencia(s);
  const dias = diasDesde(s.dataHora);
  const parada = s.status !== "FINALIZADO" && dias >= 7;
  return (
    <li className="atendimentos__item">
      <article className={`atendimentos__cartao${parada ? " atendimentos__cartao--parada" : ""}`}>
        <button type="button" className="atendimentos__cartao-corpo" onClick={() => onAbrir(s)}>
          <span className="solicitacoes__cartao-topo">
            <SeloStatus status={s.status} />
            <span className="solicitacoes__cartao-data">
              #{s.id} · {formatarDataHora(s.dataHora)}
            </span>
            {s.status !== "FINALIZADO" && (
              <span className={`tag${parada ? " tag--vermelha" : ""}`}>
                {dias === 0 ? "Aberta hoje" : dias === 1 ? "Há 1 dia" : `Há ${dias} dias`}
              </span>
            )}
            {s.visibilidade === "PRIVADO" && <span className="tag tag--escura">Privada</span>}
          </span>
          <span className="solicitacoes__cartao-aluno">{s.aluno?.alunoNome}</span>
          <span className="solicitacoes__cartao-turma">
            {[s.aluno?.matricula && `Matrícula ${s.aluno.matricula}`, s.aluno?.turmaNome, s.aluno?.cursoNome]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="solicitacoes__cartao-motivo">
            <span className="tag">{rotuloMotivo(s.motivo)}</span>
            {s.unidadeCurricular && <span className="solicitacoes__cartao-uc">{s.unidadeCurricular}</span>}
          </span>
          <span className="solicitacoes__cartao-descricao">{s.descricao}</span>
          <span className="solicitacoes__cartao-rodape">
            <span>
              De {s.solicitante?.nome ?? "—"}
              {s.cargoSolicitante && ` (${rotuloCargo(s.cargoSolicitante)})`}
            </span>
            <span>{s.atendente ? `Atendente: ${s.atendente.nome}` : "Sem atendente"}</span>
          </span>
        </button>

        <div className="atendimentos__cartao-acoes">
          {s.ocorrenciaId ? (
            <span className="atendimentos__vinculo">Associada à ocorrência #{s.ocorrenciaId}</span>
          ) : (
            <span className="atendimentos__vinculo atendimentos__vinculo--sem">Sem ocorrência associada</span>
          )}
          {acao && (
            <button
              type="button"
              className={`atendimentos__acao${acao.secundaria ? " atendimentos__acao--secundaria" : ""}`}
              onClick={() => onOcorrencia(s)}
            >
              {acao.rotulo}
            </button>
          )}
        </div>
      </article>
    </li>
  );
}

// Solicitações recebidas pelo Setor de Apoio (acesso pelo sino do cabeçalho).
// Padrão: as em aberto (aguardando e em andamento); as finalizadas aparecem
// quando o usuário escolhe vê-las.
export default function Atendimentos() {
  const navigate = useNavigate();
  const [usuario] = useState(getUsuario);

  const [filtroStatus, setFiltroStatus] = useState("aberto");
  const [verFinalizadas, setVerFinalizadas] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [atendente, setAtendente] = useState("");
  const [ordem, setOrdem] = useState(ORDENS[0].valor);

  const [turmas, setTurmas] = useState([]);
  const [atendentes, setAtendentes] = useState([]);

  const [itens, setItens] = useState([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalItens, setTotalItens] = useState(0);
  const [contagens, setContagens] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [detalheId, setDetalheId] = useState(null);

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
    listarTurmas()
      .then(setTurmas)
      .catch(tratarNaoAutenticado);
    listarAtendentes()
      .then((lista) => setAtendentes(lista ?? []))
      .catch(tratarNaoAutenticado);
  }, [tratarNaoAutenticado]);

  // Filtros comuns à lista e às contagens.
  const filtrosBase = { motivo, turmaId, ...parametrosAtendente(atendente, usuario?.id) };
  const chave = JSON.stringify(filtrosBase);

  useEffect(() => {
    if (!getToken() || ehSolicitante(getUsuario())) return undefined;
    let ativo = true;
    listarSolicitacoes({ ...JSON.parse(chave), ...parametrosStatus(filtroStatus) }, 0, TAMANHO_PAGINA, ordem)
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
  }, [chave, filtroStatus, ordem, recarga, tratarNaoAutenticado]);

  useEffect(() => {
    if (!getToken() || ehSolicitante(getUsuario())) return undefined;
    let ativo = true;
    Promise.all(
      STATUS.map((item) =>
        listarSolicitacoes({ ...JSON.parse(chave), status: item.valor }, 0, 1).then((dados) => [
          item.valor,
          dados?.page?.totalElements ?? 0,
        ]),
      ),
    )
      .then((pares) => ativo && setContagens(Object.fromEntries(pares)))
      .catch(() => ativo && setContagens({}));
    return () => {
      ativo = false;
    };
  }, [chave, recarga]);

  const fecharDetalhe = useCallback(() => setDetalheId(null), []);
  // Depois de uma ação no detalhe, lista e contagens refletem o novo status.
  const recarregarLista = useCallback(() => setRecarga((n) => n + 1), []);

  if (!getToken()) return <Navigate to="/" replace />;
  // A fila do setor não é para solicitantes: eles têm a própria área.
  if (ehSolicitante(usuario)) return <Navigate to="/solicitacoes" replace />;

  const quantidade = (id) => {
    const ag = contagens.AGUARDANDO_ACOMPANHAMENTO;
    const an = contagens.EM_ANDAMENTO;
    const fi = contagens.FINALIZADO;
    if (ag === undefined) return undefined;
    if (id === "aberto") return ag + an;
    if (id === "todas") return ag + an + fi;
    return contagens[id];
  };

  function aplicar(setter) {
    return (valor) => {
      setCarregando(true);
      setter(valor);
    };
  }

  function handleVerFinalizadas(event) {
    const marcado = event.target.checked;
    setVerFinalizadas(marcado);
    if (!marcado && FILTROS_FINALIZADAS.some((f) => f.id === filtroStatus)) aplicar(setFiltroStatus)("aberto");
  }

  function handleCarregarMais() {
    const proxima = pagina + 1;
    setCarregandoMais(true);
    listarSolicitacoes({ ...filtrosBase, ...parametrosStatus(filtroStatus) }, proxima, TAMANHO_PAGINA, ordem)
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

  function handleOcorrencia(solicitacao) {
    navigate(caminhoOcorrencia(solicitacao));
  }

  const filtrosStatus = verFinalizadas ? [...FILTROS_ABERTOS, ...FILTROS_FINALIZADAS] : FILTROS_ABERTOS;
  const filtrando = Boolean(motivo || turmaId || atendente);

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
            <h1 className="solicitacoes__saudacao">Solicitações recebidas</h1>
            <p className="atendimentos__subtitulo">
              Demandas enviadas pelos professores ao Setor de Apoio. Registre uma ocorrência para documentar o
              acompanhamento de cada caso.
            </p>
          </div>
        </div>

        <div className="solicitacoes__barra atendimentos__barra">
          <div className="solicitacoes__status" role="group" aria-label="Filtrar por status">
            {filtrosStatus.map((item) => {
              const total = quantidade(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filtroStatus === item.id}
                  className={`solicitacoes__filtro-status${filtroStatus === item.id ? " solicitacoes__filtro-status--ativo" : ""}`}
                  onClick={() => filtroStatus !== item.id && aplicar(setFiltroStatus)(item.id)}
                >
                  {item.rotulo}
                  {total !== undefined && <span className="solicitacoes__contagem">{total}</span>}
                </button>
              );
            })}
          </div>

          <label className="atendimentos__alternar">
            <input type="checkbox" checked={verFinalizadas} onChange={handleVerFinalizadas} />
            <span className="atendimentos__alternar-trilho" aria-hidden="true" />
            Ver finalizadas
          </label>
        </div>

        <div className="atendimentos__filtros">
          <Campo id="atend-atendente" as="select" rotulo="Atendente" value={atendente} onChange={(e) => aplicar(setAtendente)(e.target.value)}>
            <option value="">Todas</option>
            <option value="minhas">Atribuídas a mim</option>
            <option value="sem">Sem atendente</option>
            {atendentes
              .filter((a) => a.id !== usuario?.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
          </Campo>
          <Campo id="atend-motivo" as="select" rotulo="Motivo" value={motivo} onChange={(e) => aplicar(setMotivo)(e.target.value)}>
            <option value="">Todos</option>
            {MOTIVOS.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </Campo>
          <Campo id="atend-turma" as="select" rotulo="Turma" value={turmaId} onChange={(e) => aplicar(setTurmaId)(e.target.value)}>
            <option value="">Todas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} — {t.cursoNome}
              </option>
            ))}
          </Campo>
          <Campo id="atend-ordem" as="select" rotulo="Ordenar" value={ordem} onChange={(e) => aplicar(setOrdem)(e.target.value)}>
            {ORDENS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </Campo>
        </div>

        <div className="solicitacoes__lista-area" aria-busy={carregando || undefined}>
          {carregando && <p className="solicitacoes__aviso">Carregando solicitações...</p>}

          {!carregando && erro && (
            <div className="solicitacoes__aviso solicitacoes__aviso--erro" role="alert">
              <span>Não foi possível carregar as solicitações: {erro}</span>
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

          {!carregando && !erro && itens.length === 0 && (
            <div className="solicitacoes__vazio">
              <p className="solicitacoes__vazio-titulo">
                {filtroStatus === "aberto" && !filtrando ? "Nenhuma solicitação em aberto." : "Nenhuma solicitação com esses filtros."}
              </p>
              {filtroStatus === "aberto" && !filtrando && <p>Todas as demandas recebidas já foram finalizadas.</p>}
            </div>
          )}

          {!carregando && !erro && itens.length > 0 && (
            <>
              <p className="solicitacoes__resumo">{totalItens === 1 ? "1 solicitação" : `${totalItens} solicitações`}</p>
              <ul className="solicitacoes__lista">
                {itens.map((item) => (
                  <CartaoAtendimento key={item.id} solicitacao={item} onAbrir={(s) => setDetalheId(s.id)} onOcorrencia={handleOcorrencia} />
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

      {detalheId && (
        <SolicitacaoDetalheModal
          solicitacaoId={detalheId}
          usuarioId={usuario?.id}
          visaoSetor
          onAlterada={recarregarLista}
          onFechar={fecharDetalhe}
          onNaoAutenticado={tratarNaoAutenticado}
          acoes={(s) => {
            const acao = acaoOcorrencia(s);
            return (
              acao && (
                <button type="button" className="modal__botao" onClick={() => handleOcorrencia(s)}>
                  {acao.rotulo}
                </button>
              )
            );
          }}
        />
      )}
    </div>
  );
}
