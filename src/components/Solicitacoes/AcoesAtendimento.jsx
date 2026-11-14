import { useEffect, useState } from "react";
import Campo from "../Campo/Campo";
import {
  alterarStatus,
  finalizarSolicitacao,
  listarAtendentes,
  registrarFeedback,
  repassarAtendente,
} from "../../services/solicitacoes";
import "./Solicitacoes.css";

const LIMITE_OBS_STATUS = 500;
const LIMITE_OBS_REPASSE = 350;

function Aviso({ mensagem }) {
  if (!mensagem?.texto) return null;
  return (
    <p className={`modal__aviso modal__aviso--${mensagem.tipo}`} role={mensagem.tipo === "erro" ? "alert" : "status"}>
      {mensagem.texto}
    </p>
  );
}

// Ações do Setor de Apoio sobre uma solicitação em aberto:
// - iniciar atendimento (PATCH status → EM_ANDAMENTO);
// - assumir / repassar a atendente (PATCH atendente);
// - salvar o retorno ao professor (PATCH feedback);
// - finalizar com o retorno (POST finalizar).
// Cada ação devolve a solicitação atualizada em `onAtualizada`.
export default function AcoesAtendimento({ solicitacao: s, usuarioId, onAtualizada, onNaoAutenticado }) {
  const [atendentes, setAtendentes] = useState([]);
  const [ocupado, setOcupado] = useState("");

  const [obsInicio, setObsInicio] = useState("");
  const [msgInicio, setMsgInicio] = useState(null);

  const [novaAtendente, setNovaAtendente] = useState("");
  const [obsRepasse, setObsRepasse] = useState("");
  const [msgRepasse, setMsgRepasse] = useState(null);

  const [feedback, setFeedback] = useState(s.feedback ?? "");
  const [obsFinal, setObsFinal] = useState("");
  const [erroFeedback, setErroFeedback] = useState("");
  const [msgRetorno, setMsgRetorno] = useState(null);

  useEffect(() => {
    let ativo = true;
    listarAtendentes()
      .then((lista) => ativo && setAtendentes(lista ?? []))
      .catch((error) => onNaoAutenticado?.(error));
    return () => {
      ativo = false;
    };
  }, [onNaoAutenticado]);

  const aguardando = s.status === "AGUARDANDO_ACOMPANHAMENTO";
  const souAtendente = s.atendente?.id === usuarioId;
  const feedbackAlterado = feedback.trim() !== (s.feedback ?? "").trim();

  async function executar(nome, acao, setMensagem, sucesso) {
    if (ocupado) return false;
    setOcupado(nome);
    setMensagem(null);
    try {
      const atualizada = await acao();
      onAtualizada(atualizada, sucesso);
      setMensagem({ tipo: "sucesso", texto: sucesso });
      return true;
    } catch (error) {
      if (!onNaoAutenticado?.(error)) setMensagem({ tipo: "erro", texto: error.message });
      return false;
    } finally {
      setOcupado("");
    }
  }

  async function handleIniciar() {
    const ok = await executar(
      "iniciar",
      () => alterarStatus(s.id, "EM_ANDAMENTO", obsInicio.trim()),
      setMsgInicio,
      "Atendimento iniciado. O professor verá a solicitação como “Em andamento”.",
    );
    if (ok) setObsInicio("");
  }

  async function handleAssumir() {
    await executar(
      "assumir",
      () => repassarAtendente(s.id, usuarioId, "Atendimento assumido."),
      setMsgRepasse,
      "Você é a atendente desta solicitação.",
    );
  }

  async function handleRepassar() {
    if (!novaAtendente) return;
    const nome = atendentes.find((a) => String(a.id) === novaAtendente)?.nome ?? "a atendente escolhida";
    const ok = await executar(
      "repassar",
      () => repassarAtendente(s.id, Number(novaAtendente), obsRepasse.trim()),
      setMsgRepasse,
      `Solicitação repassada para ${nome}.`,
    );
    if (ok) {
      setNovaAtendente("");
      setObsRepasse("");
    }
  }

  async function handleSalvarRetorno() {
    if (!feedback.trim()) {
      setErroFeedback("Escreva o retorno ao professor.");
      return;
    }
    setErroFeedback("");
    await executar("feedback", () => registrarFeedback(s.id, feedback.trim()), setMsgRetorno, "Retorno salvo. O professor já pode vê-lo.");
  }

  async function handleFinalizar() {
    if (!feedback.trim()) {
      setErroFeedback("O retorno ao professor é obrigatório para finalizar.");
      document.getElementById("atendimento-feedback")?.focus();
      return;
    }
    setErroFeedback("");
    if (!window.confirm("Finalizar esta solicitação? O professor verá o retorno e o status “Finalizada”.")) return;
    await executar(
      "finalizar",
      () => finalizarSolicitacao(s.id, feedback.trim(), obsFinal.trim()),
      setMsgRetorno,
      "Solicitação finalizada.",
    );
  }

  const outrasAtendentes = atendentes.filter((a) => a.id !== s.atendente?.id);

  return (
    <div className="modal__bloco acoes-atendimento">
      <h3 className="modal__bloco-titulo">Atendimento</h3>

      {/* ---- 1. Início ---- */}
      {aguardando && (
        <section className="acoes-atendimento__passo acoes-atendimento__passo--destaque">
          <div className="acoes-atendimento__passo-cabecalho">
            <span className="acoes-atendimento__numero">1</span>
            <div>
              <p className="acoes-atendimento__passo-titulo">Iniciar atendimento</p>
              <p className="acoes-atendimento__passo-texto">Avise ao professor que a demanda está sendo tratada.</p>
            </div>
          </div>
          <Campo
            id="atendimento-obs-inicio"
            rotulo="Observação para o histórico (opcional)"
            value={obsInicio}
            onChange={(e) => setObsInicio(e.target.value)}
            maxLength={LIMITE_OBS_STATUS}
            disabled={Boolean(ocupado)}
          />
          <div className="acoes-atendimento__botoes">
            <button type="button" className="modal__botao" onClick={handleIniciar} disabled={Boolean(ocupado)}>
              {ocupado === "iniciar" ? "Iniciando..." : "Iniciar atendimento"}
            </button>
          </div>
          <Aviso mensagem={msgInicio} />
        </section>
      )}

      {/* ---- Atendente ---- */}
      <section className="acoes-atendimento__passo">
        <div className="acoes-atendimento__atendente">
          <div>
            <p className="acoes-atendimento__passo-titulo">Atendente</p>
            <p className="acoes-atendimento__passo-texto">
              {s.atendente ? (
                <>
                  {s.atendente.nome}
                  {souAtendente && <span className="tag tag--escura acoes-atendimento__voce">você</span>}
                </>
              ) : (
                "Ninguém assumiu esta solicitação ainda."
              )}
            </p>
          </div>
          {!souAtendente && (
            <button type="button" className="modal__botao modal__botao--secundario" onClick={handleAssumir} disabled={Boolean(ocupado)}>
              {ocupado === "assumir" ? "Assumindo..." : "Assumir atendimento"}
            </button>
          )}
        </div>

        <details className="acoes-atendimento__repassar">
          <summary>Repassar para outra atendente</summary>
          <div className="modal__grade">
            <Campo
              id="atendimento-nova-atendente"
              as="select"
              rotulo="Nova atendente"
              value={novaAtendente}
              onChange={(e) => setNovaAtendente(e.target.value)}
              disabled={Boolean(ocupado)}
            >
              <option value="">Selecione</option>
              {outrasAtendentes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                  {a.id === usuarioId ? " (você)" : ""}
                </option>
              ))}
            </Campo>
            <Campo
              id="atendimento-obs-repasse"
              rotulo="Motivo do repasse (opcional)"
              value={obsRepasse}
              onChange={(e) => setObsRepasse(e.target.value)}
              maxLength={LIMITE_OBS_REPASSE}
              disabled={Boolean(ocupado)}
            />
          </div>
          <div className="acoes-atendimento__botoes">
            <button type="button" className="modal__botao modal__botao--secundario" onClick={handleRepassar} disabled={Boolean(ocupado) || !novaAtendente}>
              {ocupado === "repassar" ? "Repassando..." : "Repassar"}
            </button>
          </div>
        </details>
        <Aviso mensagem={msgRepasse} />
      </section>

      {/* ---- 2. Retorno e finalização ---- */}
      <section className={`acoes-atendimento__passo${aguardando ? "" : " acoes-atendimento__passo--destaque"}`}>
        <div className="acoes-atendimento__passo-cabecalho">
          <span className="acoes-atendimento__numero">{aguardando ? 2 : 1}</span>
          <div>
            <p className="acoes-atendimento__passo-titulo">Retorno ao professor</p>
            <p className="acoes-atendimento__passo-texto">
              O professor lê este texto. Não inclua informações sensíveis do acompanhamento.
            </p>
          </div>
        </div>
        <Campo
          id="atendimento-feedback"
          as="textarea"
          className="acoes-atendimento__feedback"
          rotulo="Retorno"
          value={feedback}
          onChange={(e) => {
            setFeedback(e.target.value);
            setErroFeedback("");
          }}
          erro={erroFeedback}
          placeholder="Ex.: Conversamos com a família e o aluno passará a ter acompanhamento semanal."
          disabled={Boolean(ocupado)}
        />
        {!aguardando && (
          <Campo
            id="atendimento-obs-final"
            rotulo="Observação interna ao finalizar (opcional, fica no histórico)"
            value={obsFinal}
            onChange={(e) => setObsFinal(e.target.value)}
            maxLength={LIMITE_OBS_STATUS}
            disabled={Boolean(ocupado)}
          />
        )}
        <div className="acoes-atendimento__botoes">
          <button type="button" className="modal__botao modal__botao--secundario" onClick={handleSalvarRetorno} disabled={Boolean(ocupado) || !feedbackAlterado}>
            {ocupado === "feedback" ? "Salvando..." : "Salvar retorno"}
          </button>
          {!aguardando && (
            <button type="button" className="modal__botao" onClick={handleFinalizar} disabled={Boolean(ocupado)}>
              {ocupado === "finalizar" ? "Finalizando..." : "Finalizar solicitação"}
            </button>
          )}
        </div>
        {aguardando && <p className="acoes-atendimento__dica">Inicie o atendimento para poder finalizar.</p>}
        <Aviso mensagem={msgRetorno} />
      </section>
    </div>
  );
}
