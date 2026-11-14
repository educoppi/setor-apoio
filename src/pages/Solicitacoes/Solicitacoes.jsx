import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Campo from "../../components/Campo/Campo";
import Header from "../../components/Header/Header";
import NovaSolicitacaoModal from "../../components/Solicitacoes/NovaSolicitacaoModal";
import SeloStatus from "../../components/Solicitacoes/SeloStatus";
import SolicitacaoDetalheModal from "../../components/Solicitacoes/SolicitacaoDetalheModal";
import { getToken } from "../../services/api";
import { buscarUsuarioLogado, getUsuario, logout } from "../../services/auth";
import { listarSolicitacoes, MOTIVOS, rotuloMotivo, STATUS } from "../../services/solicitacoes";
import { listarMinhasTurmas } from "../../services/turmas";
import { formatarDataHora } from "../../utils/formatos";
import "./Solicitacoes.css";

const TAMANHO_PAGINA = 10;

const ESCOPOS = [
  { id: "minhas", rotulo: "Abertas por mim" },
  { id: "turmas", rotulo: "Das minhas turmas" },
];

function getSaudacao(data = new Date()) {
  const hora = data.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function CartaoSolicitacao({ solicitacao: s, usuarioId, onAbrir }) {
  const minha = s.solicitante?.id === usuarioId;
  return (
    <li>
      <button type="button" className="solicitacoes__cartao" onClick={() => onAbrir(s)}>
        <span className="solicitacoes__cartao-topo">
          <SeloStatus status={s.status} />
          <span className="solicitacoes__cartao-data">
            #{s.id} · {formatarDataHora(s.dataHora)}
          </span>
          {s.visibilidade === "PRIVADO" && <span className="tag tag--escura">Privada</span>}
          {s.feedback && <span className="tag tag--verde">Retorno disponível</span>}
        </span>
        <span className="solicitacoes__cartao-aluno">{s.aluno?.alunoNome}</span>
        <span className="solicitacoes__cartao-turma">
          {[s.aluno?.turmaNome, s.aluno?.cursoNome].filter(Boolean).join(" · ")}
        </span>
        <span className="solicitacoes__cartao-motivo">
          <span className="tag">{rotuloMotivo(s.motivo)}</span>
          {s.unidadeCurricular && <span className="solicitacoes__cartao-uc">{s.unidadeCurricular}</span>}
        </span>
        <span className="solicitacoes__cartao-descricao">{s.descricao}</span>
        <span className="solicitacoes__cartao-rodape">
          <span>Atendente: {s.atendente?.nome ?? "a definir"}</span>
          <span>{minha ? "Aberta por você" : `Aberta por ${s.solicitante?.nome ?? "—"}`}</span>
        </span>
      </button>
    </li>
  );
}

// Página inicial do SOLICITANTE (professores, coordenação...): acompanha as
// solicitações que abriu e as compartilhadas das suas turmas, e abre novas.
export default function Solicitacoes() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(getUsuario);

  const [escopo, setEscopo] = useState("minhas");
  const [status, setStatus] = useState("");
  const [motivo, setMotivo] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [turmas, setTurmas] = useState([]);

  const [itens, setItens] = useState([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalItens, setTotalItens] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState("");
  const [contagens, setContagens] = useState({});
  const [recarga, setRecarga] = useState(0);

  const [novaAberta, setNovaAberta] = useState(false);
  const [detalheId, setDetalheId] = useState(null);
  const [mensagem, setMensagem] = useState("");

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
    if (!getToken()) return;
    buscarUsuarioLogado().then(setUsuario).catch(tratarNaoAutenticado);
    listarMinhasTurmas()
      .then((lista) => setTurmas(lista ?? []))
      .catch(tratarNaoAutenticado);
  }, [tratarNaoAutenticado]);

  // Filtros comuns à lista e às contagens por status.
  const filtrosBase = { minhas: escopo === "minhas", motivo, turmaId };
  const chaveFiltros = JSON.stringify(filtrosBase);

  // Primeira página sempre que um filtro muda.
  useEffect(() => {
    if (!getToken()) return undefined;
    let ativo = true;
    const filtros = JSON.parse(chaveFiltros);
    listarSolicitacoes({ ...filtros, status }, 0, TAMANHO_PAGINA)
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
  }, [chaveFiltros, status, recarga, tratarNaoAutenticado]);

  // Quantidade em cada status (consulta de 1 item por status, lendo o total).
  useEffect(() => {
    if (!getToken()) return undefined;
    let ativo = true;
    const filtros = JSON.parse(chaveFiltros);
    Promise.all(
      STATUS.map((item) =>
        listarSolicitacoes({ ...filtros, status: item.valor }, 0, 1).then((dados) => [
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
  }, [chaveFiltros, recarga]);

  const fecharNova = useCallback(() => setNovaAberta(false), []);
  const fecharDetalhe = useCallback(() => setDetalheId(null), []);

  if (!getToken()) return <Navigate to="/" replace />;

  const nome = usuario?.nome ?? "";
  const totalGeral = Object.values(contagens).reduce((soma, n) => soma + n, 0);
  const filtrando = Boolean(motivo || turmaId);

  function mudarFiltro(setter) {
    return (valor) => {
      setCarregando(true);
      setter(valor);
    };
  }

  function handleCarregarMais() {
    const proxima = pagina + 1;
    setCarregandoMais(true);
    listarSolicitacoes({ ...filtrosBase, status }, proxima, TAMANHO_PAGINA)
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

  function handleRecarregar() {
    setCarregando(true);
    setErro("");
    setRecarga((n) => n + 1);
  }

  function handleCriada(solicitacao) {
    setNovaAberta(false);
    setMensagem(`Solicitação #${solicitacao.id} enviada ao Setor de Apoio. Você pode acompanhar o andamento por aqui.`);
    setCarregando(true);
    setRecarga((n) => n + 1);
  }

  return (
    <div className="solicitacoes">
      <Header nome={nome} role={usuario?.role} />

      <main className="solicitacoes__conteudo">
        <h1 className="solicitacoes__saudacao">
          {getSaudacao()}, {nome.toUpperCase()}
        </h1>

        <div className="solicitacoes__intro">
          <p>
            Comunique ao Setor de Apoio situações de alunos que precisam de atenção e acompanhe o retorno de cada
            solicitação.
          </p>
          <button
            className="solicitacoes__nova"
            type="button"
            onClick={() => {
              setMensagem("");
              setNovaAberta(true);
            }}
          >
            + SOLICITAÇÃO
          </button>
        </div>

        {mensagem && (
          <p className="solicitacoes__aviso solicitacoes__aviso--sucesso" role="status">
            {mensagem}
          </p>
        )}

        {/* ---- Escopo ---- */}
        <div className="solicitacoes__escopos" role="tablist" aria-label="Quais solicitações mostrar">
          {ESCOPOS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={escopo === item.id}
              className={`solicitacoes__escopo${escopo === item.id ? " solicitacoes__escopo--ativo" : ""}`}
              onClick={() => escopo !== item.id && mudarFiltro(setEscopo)(item.id)}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
        {escopo === "turmas" && (
          <p className="solicitacoes__dica">
            Inclui as suas e as solicitações compartilhadas por colegas nas turmas às quais você está vinculado.
          </p>
        )}

        {/* ---- Status + filtros ---- */}
        <div className="solicitacoes__barra">
          <div className="solicitacoes__status" role="group" aria-label="Filtrar por status">
            {[{ valor: "", rotulo: "Todas" }, ...STATUS].map((item) => {
              const total = item.valor ? contagens[item.valor] : totalGeral;
              return (
                <button
                  key={item.valor || "todas"}
                  type="button"
                  aria-pressed={status === item.valor}
                  className={`solicitacoes__filtro-status${status === item.valor ? " solicitacoes__filtro-status--ativo" : ""}`}
                  onClick={() => status !== item.valor && mudarFiltro(setStatus)(item.valor)}
                >
                  {item.rotulo}
                  {total !== undefined && <span className="solicitacoes__contagem">{total}</span>}
                </button>
              );
            })}
          </div>

          <div className="solicitacoes__filtros">
            <Campo
              id="solicitacoes-motivo"
              as="select"
              rotulo="Motivo"
              value={motivo}
              onChange={(event) => mudarFiltro(setMotivo)(event.target.value)}
            >
              <option value="">Todos</option>
              {MOTIVOS.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.rotulo}
                </option>
              ))}
            </Campo>
            <Campo
              id="solicitacoes-turma"
              as="select"
              rotulo="Turma"
              value={turmaId}
              onChange={(event) => mudarFiltro(setTurmaId)(event.target.value)}
              disabled={turmas.length === 0}
            >
              <option value="">{turmas.length === 0 ? "Nenhuma turma vinculada" : "Todas"}</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome} — {turma.cursoNome}
                </option>
              ))}
            </Campo>
          </div>
        </div>

        {/* ---- Lista ---- */}
        <div className="solicitacoes__lista-area" aria-busy={carregando || undefined}>
          {carregando && <p className="solicitacoes__aviso">Carregando solicitações...</p>}

          {!carregando && erro && (
            <div className="solicitacoes__aviso solicitacoes__aviso--erro" role="alert">
              <span>Não foi possível carregar as solicitações: {erro}</span>
              <button type="button" onClick={handleRecarregar}>
                Tentar novamente
              </button>
            </div>
          )}

          {!carregando && !erro && itens.length === 0 && (
            <div className="solicitacoes__vazio">
              <p className="solicitacoes__vazio-titulo">
                {status || filtrando ? "Nenhuma solicitação com esses filtros." : "Nenhuma solicitação por aqui ainda."}
              </p>
              {!status && !filtrando && escopo === "minhas" && (
                <p>Use o botão “+ SOLICITAÇÃO” para comunicar ao Setor de Apoio a situação de um aluno.</p>
              )}
            </div>
          )}

          {!carregando && !erro && itens.length > 0 && (
            <>
              <p className="solicitacoes__resumo">
                {totalItens === 1 ? "1 solicitação" : `${totalItens} solicitações`}
              </p>
              <ul className="solicitacoes__lista">
                {itens.map((item) => (
                  <CartaoSolicitacao key={item.id} solicitacao={item} usuarioId={usuario?.id} onAbrir={(s) => setDetalheId(s.id)} />
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

      {novaAberta && (
        <NovaSolicitacaoModal onFechar={fecharNova} onCriada={handleCriada} onNaoAutenticado={tratarNaoAutenticado} />
      )}
      {detalheId && (
        <SolicitacaoDetalheModal
          solicitacaoId={detalheId}
          usuarioId={usuario?.id}
          onFechar={fecharDetalhe}
          onNaoAutenticado={tratarNaoAutenticado}
        />
      )}
    </div>
  );
}
