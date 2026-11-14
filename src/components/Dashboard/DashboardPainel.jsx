import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Campo from "../Campo/Campo";
import SeloStatus from "../Solicitacoes/SeloStatus";
import { buscarPainel, listarAtendentes, rotuloMotivo } from "../../services/solicitacoes";
import { formatarData } from "../../utils/formatos";
import "../Solicitacoes/Solicitacoes.css";
import "./DashboardPainel.css";

const PERIODOS = [
  { valor: 1, rotulo: "Último mês" },
  { valor: 3, rotulo: "Últimos 3 meses" },
  { valor: 6, rotulo: "Últimos 6 meses" },
  { valor: 12, rotulo: "Últimos 12 meses" },
];

const SERIES = [
  { chave: "abertas", rotulo: "Abertas", cor: "var(--serie-1)" },
  { chave: "finalizadas", rotulo: "Finalizadas", cor: "var(--serie-2)" },
];

const numero = (n) => (n ?? 0).toLocaleString("pt-BR");

// Topo "redondo" do eixo: 1, 2 ou 5 × 10^n acima do maior valor.
function maximoEixo(valor) {
  if (valor <= 4) return 4;
  const potencia = 10 ** Math.floor(Math.log10(valor));
  for (const passo of [1, 2, 2.5, 5, 10]) {
    if (passo * potencia >= valor) return passo * potencia;
  }
  return 10 * potencia;
}

function diaMes(iso) {
  const [, mes, dia] = (iso ?? "").split("-");
  return dia && mes ? `${dia}/${mes}` : "";
}

// Largura real do contêiner, para o SVG desenhar texto em tamanho de verdade.
function useLargura() {
  const ref = useRef(null);
  const [largura, setLargura] = useState(0);
  useLayoutEffect(() => {
    const elemento = ref.current;
    if (!elemento) return undefined;
    // Medida inicial imediata (o observador pode demorar a disparar, ex.: aba em segundo plano).
    let ativo = true;
    queueMicrotask(() => ativo && setLargura(Math.floor(elemento.getBoundingClientRect().width)));
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.floor(entrada.contentRect.width)));
    observador.observe(elemento);
    return () => {
      ativo = false;
      observador.disconnect();
    };
  }, []);
  return [ref, largura];
}

// ---------------------------------------------------------------- Indicadores
function Indicador({ rotulo, valor, dica, destaque }) {
  return (
    <div className={`painel__indicador${destaque ? " painel__indicador--destaque" : ""}`}>
      <span className="painel__indicador-rotulo">{rotulo}</span>
      <span className="painel__indicador-valor">{numero(valor)}</span>
      {dica && <span className="painel__indicador-dica">{dica}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- Barras horizontais
function Barras({ titulo, dados, vazio }) {
  const [ativo, setAtivo] = useState(null);
  const ordenados = [...(dados ?? [])].sort((a, b) => b.total - a.total);
  const total = ordenados.reduce((soma, item) => soma + item.total, 0);
  const maior = Math.max(1, ...ordenados.map((item) => item.total));

  return (
    <section className="painel__cartao" aria-labelledby={`painel-${titulo}`}>
      <h3 className="painel__cartao-titulo" id={`painel-${titulo}`}>
        {titulo}
      </h3>
      {ordenados.length === 0 || total === 0 ? (
        <p className="painel__vazio">{vazio}</p>
      ) : (
        <ul className="painel__barras">
          {ordenados.map((item) => {
            const parte = Math.round((item.total / total) * 100);
            const descricao = `${item.nome}: ${numero(item.total)} (${parte}% do total)`;
            return (
              <li
                key={item.chave ?? item.nome}
                className={`painel__barra${ativo === item.nome ? " painel__barra--ativa" : ""}`}
                onMouseEnter={() => setAtivo(item.nome)}
                onMouseLeave={() => setAtivo(null)}
                onFocus={() => setAtivo(item.nome)}
                onBlur={() => setAtivo(null)}
                tabIndex={0}
                aria-label={descricao}
              >
                <span className="painel__barra-nome" title={item.nome}>
                  {item.nome}
                </span>
                <span className="painel__barra-trilho" aria-hidden="true">
                  <span className="painel__barra-valor" style={{ width: `${Math.max((item.total / maior) * 100, 1.5)}%` }} />
                  <span className="painel__barra-numero">{numero(item.total)}</span>
                  {ativo === item.nome && (
                    <span className="painel__dica-flutuante" role="presentation">
                      <strong>{item.nome}</strong>
                      {numero(item.total)} {item.total === 1 ? "solicitação" : "solicitações"} · {parte}% do total
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Evolução semanal (linhas)
function Evolucao({ semanas }) {
  const [ref, largura] = useLargura();
  const [indice, setIndice] = useState(null);
  const svgRef = useRef(null);

  const altura = 260;
  const margem = { topo: 16, direita: 96, base: 30, esquerda: 40 };
  const w = Math.max(largura - margem.esquerda - margem.direita, 10);
  const h = altura - margem.topo - margem.base;
  const n = semanas.length;
  const maior = maximoEixo(Math.max(0, ...semanas.flatMap((s) => [s.abertas, s.finalizadas])));
  const x = (i) => margem.esquerda + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v) => margem.topo + h - (v / maior) * h;
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maior * f));
  const passoRotulo = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 70))));

  function caminho(chave) {
    return semanas.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s[chave]).toFixed(1)}`).join(" ");
  }

  function handleMover(event) {
    if (!svgRef.current || n === 0) return;
    const caixa = svgRef.current.getBoundingClientRect();
    const px = event.clientX - caixa.left;
    const i = n <= 1 ? 0 : Math.round(((px - margem.esquerda) / w) * (n - 1));
    setIndice(Math.min(n - 1, Math.max(0, i)));
  }

  function handleTecla(event) {
    if (n === 0) return;
    if (event.key === "ArrowRight") setIndice((i) => Math.min(n - 1, (i ?? -1) + 1));
    else if (event.key === "ArrowLeft") setIndice((i) => Math.max(0, (i ?? n) - 1));
    else return;
    event.preventDefault();
  }

  const ultima = semanas[n - 1];
  const totalAbertas = semanas.reduce((soma, s) => soma + s.abertas, 0);
  const totalFinalizadas = semanas.reduce((soma, s) => soma + s.finalizadas, 0);
  const sel = indice !== null ? semanas[indice] : null;
  // Rótulos diretos no fim das linhas, afastados se ficarem colados.
  let yAbertas = ultima ? y(ultima.abertas) : 0;
  let yFinalizadas = ultima ? y(ultima.finalizadas) : 0;
  if (Math.abs(yAbertas - yFinalizadas) < 16) {
    const meio = (yAbertas + yFinalizadas) / 2;
    const acima = ultima.abertas >= ultima.finalizadas;
    yAbertas = meio + (acima ? -8 : 8);
    yFinalizadas = meio + (acima ? 8 : -8);
  }

  return (
    <section className="painel__cartao painel__cartao--largo" aria-labelledby="painel-evolucao">
      <div className="painel__cartao-cabecalho">
        <div>
          <h3 className="painel__cartao-titulo" id="painel-evolucao">
            Evolução semanal
          </h3>
          <p className="painel__cartao-sub">
            {numero(totalAbertas)} abertas e {numero(totalFinalizadas)} finalizadas no período
          </p>
        </div>
        <ul className="painel__legenda" aria-label="Legenda">
          {SERIES.map((serie) => (
            <li key={serie.chave}>
              <span className="painel__legenda-marca" style={{ background: serie.cor }} aria-hidden="true" />
              {serie.rotulo}
            </li>
          ))}
        </ul>
      </div>

      {n === 0 ? (
        <p className="painel__vazio">Sem semanas no período.</p>
      ) : (
        <div ref={ref} className="painel__grafico">
          {largura > 0 && (
            <svg
              ref={svgRef}
              width={largura}
              height={altura}
              role="img"
              aria-label={`Gráfico de linhas: solicitações abertas e finalizadas por semana, de ${diaMes(semanas[0].inicio)} a ${diaMes(ultima.inicio)}. Use as setas para percorrer as semanas.`}
              tabIndex={0}
              onMouseMove={handleMover}
              onMouseLeave={() => setIndice(null)}
              onKeyDown={handleTecla}
              onBlur={() => setIndice(null)}
            >
              {marcas.map((m) => (
                <g key={m}>
                  <line className="painel__grade" x1={margem.esquerda} x2={margem.esquerda + w} y1={y(m)} y2={y(m)} />
                  <text className="painel__eixo" x={margem.esquerda - 8} y={y(m)} dy="0.32em" textAnchor="end">
                    {m}
                  </text>
                </g>
              ))}
              {semanas.map((s, i) =>
                // Rótulos espaçados; o último sempre aparece e tira o vizinho que ficaria colado.
                (i % passoRotulo === 0 && n - 1 - i >= passoRotulo) || i === n - 1 ? (
                  <text key={s.inicio} className="painel__eixo" x={x(i)} y={altura - 8} textAnchor="middle">
                    {diaMes(s.inicio)}
                  </text>
                ) : null,
              )}

              {sel && <line className="painel__mira" x1={x(indice)} x2={x(indice)} y1={margem.topo} y2={margem.topo + h} />}

              {SERIES.map((serie) => (
                <path key={serie.chave} d={caminho(serie.chave)} fill="none" stroke={serie.cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              ))}

              {sel &&
                SERIES.map((serie) => (
                  <circle key={serie.chave} cx={x(indice)} cy={y(sel[serie.chave])} r="4.5" fill={serie.cor} stroke="var(--superficie)" strokeWidth="2" />
                ))}

              <text className="painel__rotulo-direto" x={x(n - 1) + 10} y={yAbertas} dy="0.32em">
                Abertas {ultima.abertas}
              </text>
              <text className="painel__rotulo-direto" x={x(n - 1) + 10} y={yFinalizadas} dy="0.32em">
                Finalizadas {ultima.finalizadas}
              </text>
            </svg>
          )}

          {sel && (
            <div
              className="painel__dica-grafico"
              style={{ left: Math.min(Math.max(x(indice), 80), largura - 80) }}
              role="status"
            >
              <strong>Semana de {formatarData(sel.inicio)}</strong>
              {SERIES.map((serie) => (
                <span key={serie.chave}>
                  <span className="painel__legenda-marca" style={{ background: serie.cor }} aria-hidden="true" />
                  {serie.rotulo}: {numero(sel[serie.chave])}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {n > 0 && (
        <details className="painel__tabela-dados">
          <summary>Ver dados em tabela</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">Semana de</th>
                <th scope="col">Abertas</th>
                <th scope="col">Finalizadas</th>
              </tr>
            </thead>
            <tbody>
              {semanas.map((s) => (
                <tr key={s.inicio}>
                  <td>{formatarData(s.inicio)}</td>
                  <td>{numero(s.abertas)}</td>
                  <td>{numero(s.finalizadas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Fila
function Fila({ itens }) {
  const navigate = useNavigate();
  return (
    <section className="painel__cartao painel__cartao--largo" aria-labelledby="painel-fila">
      <div className="painel__cartao-cabecalho">
        <div>
          <h3 className="painel__cartao-titulo" id="painel-fila">
            Fila: em aberto há mais tempo
          </h3>
          <p className="painel__cartao-sub">Solicitações não finalizadas, das mais antigas para as mais recentes.</p>
        </div>
        <button type="button" className="painel__link" onClick={() => navigate("/atendimentos")}>
          Ver solicitações recebidas
        </button>
      </div>
      {itens.length === 0 ? (
        <p className="painel__vazio">Nenhuma solicitação em aberto.</p>
      ) : (
        <div className="painel__fila-area">
          <table className="painel__fila">
            <thead>
              <tr>
                <th scope="col">Aberta há</th>
                <th scope="col">Aluno</th>
                <th scope="col" className="painel__ocultar-movel">Motivo</th>
                <th scope="col">Status</th>
                <th scope="col" className="painel__ocultar-movel">Atendente</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className={`painel__dias${item.diasAberta >= 7 ? " painel__dias--alerta" : ""}`}>
                      {item.diasAberta === 0 ? "hoje" : item.diasAberta === 1 ? "1 dia" : `${numero(item.diasAberta)} dias`}
                    </span>
                  </td>
                  <td>
                    <span className="painel__fila-aluno">{item.alunoNome}</span>
                    <span className="painel__fila-sub">
                      #{item.id} · {[item.turmaNome, item.cursoNome].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="painel__ocultar-movel">{rotuloMotivo(item.motivo)}</td>
                  <td>
                    <SeloStatus status={item.status} curto />
                  </td>
                  <td className="painel__ocultar-movel">{item.atendente?.nome ?? <span className="painel__fila-sub">Sem atendente</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Painel
// Dashboard do administrador com os dados de GET /solicitacoes/painel.
export default function DashboardPainel({ onNaoAutenticado }) {
  const [meses, setMeses] = useState(6);
  const [atendenteId, setAtendenteId] = useState("");
  const [atendentes, setAtendentes] = useState([]);
  const [painel, setPainel] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let ativo = true;
    listarAtendentes()
      .then((lista) => ativo && setAtendentes(lista ?? []))
      .catch((error) => onNaoAutenticado?.(error));
    return () => {
      ativo = false;
    };
  }, [onNaoAutenticado]);

  useEffect(() => {
    let ativo = true;
    buscarPainel({ meses, atendenteId })
      .then((dados) => {
        if (!ativo) return;
        setPainel(dados);
        setErro("");
      })
      .catch((error) => ativo && !onNaoAutenticado?.(error) && setErro(error.message))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [meses, atendenteId, recarga, onNaoAutenticado]);

  function mudar(setter) {
    return (event) => {
      setCarregando(true);
      setter(event.target.value);
    };
  }

  const totais = painel?.totais ?? {};
  const nomeAtendente = atendentes.find((a) => String(a.id) === String(atendenteId))?.nome;

  return (
    <div className="painel">
      <div className="painel__filtros">
        <Campo id="painel-periodo" as="select" rotulo="Período" value={meses} onChange={mudar((v) => setMeses(Number(v)))}>
          {PERIODOS.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </Campo>
        <Campo id="painel-atendente" as="select" rotulo="Atendente" value={atendenteId} onChange={mudar(setAtendenteId)}>
          <option value="">Todo o Setor de Apoio</option>
          {atendentes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </Campo>
        <div className="painel__periodo-info" aria-live="polite">
          {carregando
            ? "Atualizando..."
            : painel?.inicioPeriodo && `Dados desde ${formatarData(painel.inicioPeriodo)}${nomeAtendente ? ` · ${nomeAtendente}` : ""}`}
        </div>
        <button
          type="button"
          className="painel__atualizar"
          onClick={() => {
            setCarregando(true);
            setRecarga((n) => n + 1);
          }}
          disabled={carregando}
        >
          Atualizar
        </button>
      </div>

      {erro && (
        <div className="admin__aviso admin__aviso--erro admin__aviso--acao" role="alert">
          <span>Não foi possível carregar o painel: {erro}</span>
          <button type="button" onClick={() => { setCarregando(true); setRecarga((n) => n + 1); }}>
            Tentar novamente
          </button>
        </div>
      )}

      {!painel && carregando && <p className="painel__vazio">Carregando painel...</p>}

      {painel && (
        <div className={`painel__conteudo${carregando ? " painel__conteudo--atualizando" : ""}`}>
          <div className="painel__indicadores">
            <Indicador rotulo="Aguardando atendimento" valor={totais.aguardando} dica="ainda não iniciadas" destaque={totais.aguardando > 0} />
            <Indicador rotulo="Em andamento" valor={totais.emAndamento} dica="sendo atendidas" />
            <Indicador rotulo="Sem atendente" valor={totais.semAtendente} dica="em aberto, sem responsável" destaque={totais.semAtendente > 0} />
            <Indicador rotulo="Abertas no mês" valor={totais.abertasMes} dica="recebidas neste mês" />
            <Indicador rotulo="Finalizadas no mês" valor={totais.finalizadasMes} dica="concluídas neste mês" />
          </div>

          <div className="painel__grade-cartoes">
            <Evolucao semanas={painel.evolucao ?? []} />
            <Barras titulo="Por motivo" dados={(painel.porMotivo ?? []).map((m) => ({ ...m, nome: m.nome || rotuloMotivo(m.chave) }))} vazio="Sem solicitações no período." />
            <Barras titulo="Por curso" dados={painel.porCurso ?? []} vazio="Sem solicitações no período." />
            <Fila itens={painel.fila ?? []} />
          </div>
        </div>
      )}
    </div>
  );
}
