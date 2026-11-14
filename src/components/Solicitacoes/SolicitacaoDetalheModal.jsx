import { useEffect, useState } from "react";
import Modal from "../Modal/Modal";
import AcoesAtendimento from "./AcoesAtendimento";
import SeloStatus, { EtapasStatus } from "./SeloStatus";
import { buscarSolicitacao, rotuloMotivo, rotuloStatus, rotuloVisibilidade } from "../../services/solicitacoes";
import { UNIDADES } from "../../services/turmas";
import { rotuloCargo } from "../../services/usuarios";
import { formatarDataHora } from "../../utils/formatos";
import "./Solicitacoes.css";

function rotuloUnidade(valor) {
  return UNIDADES.find((unidade) => unidade.valor === valor)?.rotulo ?? valor ?? "";
}

function Dado({ rotulo, children }) {
  return (
    <div className="detalhe-solicitacao__dado">
      <dt>{rotulo}</dt>
      <dd>{children || "—"}</dd>
    </div>
  );
}

// Detalhe da solicitação (GET /solicitacoes/{id}): relato, andamento, retorno
// do Setor de Apoio e histórico. A ocorrência associada é registro interno do
// setor: para o solicitante só se informa que ela existe; com `visaoSetor`
// mostra-se o número dela. `acoes(solicitacao)` desenha botões extras no rodapé.
// Com `visaoSetor`, solicitações em aberto mostram o painel de atendimento;
// `onAlterada` avisa quem abriu o modal para recarregar a lista.
export default function SolicitacaoDetalheModal({
  solicitacaoId,
  usuarioId,
  visaoSetor = false,
  acoes,
  onAlterada,
  onFechar,
  onNaoAutenticado,
}) {
  const [solicitacao, setSolicitacao] = useState(null);
  const [avisoFinal, setAvisoFinal] = useState("");
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    buscarSolicitacao(solicitacaoId)
      .then((dados) => {
        if (!ativo) return;
        setSolicitacao(dados);
        setErro("");
      })
      .catch((error) => {
        if (ativo && !onNaoAutenticado?.(error)) setErro(error.message);
      });
    return () => {
      ativo = false;
    };
  }, [solicitacaoId, tentativa, onNaoAutenticado]);

  // Usa a resposta da ação na hora e recarrega o detalhe para trazer o histórico completo.
  function handleAtualizada(atualizada, mensagem) {
    if (atualizada) setSolicitacao((atual) => ({ ...atual, ...atualizada }));
    if (atualizada?.status === "FINALIZADO") setAvisoFinal(mensagem);
    setTentativa((t) => t + 1);
    onAlterada?.();
  }

  const s = solicitacao;
  const minha = s?.solicitante?.id === usuarioId;
  const historico = [...(s?.historico ?? [])].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

  return (
    <Modal titulo={`Solicitação #${solicitacaoId}`} subtitulo={s ? s.aluno?.alunoNome : undefined} largura={820} onFechar={onFechar}>
      {!s && !erro && <p className="detalhe-solicitacao__carregando">Carregando solicitação...</p>}

      {erro && (
        <div className="modal__aviso modal__aviso--erro detalhe-solicitacao__erro" role="alert">
          <span>Não foi possível abrir a solicitação: {erro}</span>
          <button type="button" className="modal__botao modal__botao--secundario" onClick={() => { setErro(""); setTentativa((t) => t + 1); }}>
            Tentar novamente
          </button>
        </div>
      )}

      {s && (
        <>
          <div className="detalhe-solicitacao__topo">
            <SeloStatus status={s.status} />
            <span className="tag">{rotuloMotivo(s.motivo)}</span>
            <span className={`tag${s.visibilidade === "PRIVADO" ? " tag--escura" : ""}`}>
              {rotuloVisibilidade(s.visibilidade)}
            </span>
            {minha && <span className="tag tag--vermelha">Aberta por você</span>}
          </div>

          <div className="modal__bloco">
            <EtapasStatus status={s.status} />
          </div>

          {avisoFinal && (
            <p className="modal__aviso modal__aviso--sucesso" role="status">
              {avisoFinal}
            </p>
          )}

          {visaoSetor && s.status !== "FINALIZADO" && (
            <AcoesAtendimento
              key={s.id}
              solicitacao={s}
              usuarioId={usuarioId}
              onAtualizada={handleAtualizada}
              onNaoAutenticado={onNaoAutenticado}
            />
          )}

          {/* ---- Retorno do Setor de Apoio (no painel de atendimento, quando em aberto) ---- */}
          {(!visaoSetor || s.status === "FINALIZADO" || s.ocorrenciaId) && (
          <div className="modal__bloco">
            <h3 className="modal__bloco-titulo">Retorno do Setor de Apoio</h3>
            {visaoSetor && s.status !== "FINALIZADO" ? null : s.feedback ? (
              <div className="detalhe-solicitacao__feedback">
                <p>{s.feedback}</p>
                {s.dataFinalizacao && <span>Finalizada em {formatarDataHora(s.dataFinalizacao)}</span>}
              </div>
            ) : (
              <p className="detalhe-solicitacao__sem-feedback">
                {s.status === "AGUARDANDO_ACOMPANHAMENTO"
                  ? "A solicitação foi recebida e aguarda o início do atendimento."
                  : "O atendimento está em andamento. O retorno aparecerá aqui quando for registrado."}
              </p>
            )}
            {s.ocorrenciaId && visaoSetor && (
              <p className="modal__aviso modal__aviso--info">
                Associada à ocorrência #{s.ocorrenciaId}, no histórico de acompanhamento do aluno.
              </p>
            )}
            {s.ocorrenciaId && !visaoSetor && (
              <p className="modal__aviso modal__aviso--info">
                Esta solicitação está vinculada a um registro de acompanhamento do Setor de Apoio.
                O conteúdo desse registro é interno e não fica disponível aqui.
              </p>
            )}
          </div>
          )}

          {/* ---- Relato ---- */}
          <div className="modal__bloco">
            <h3 className="modal__bloco-titulo">Relato</h3>
            <p className="detalhe-solicitacao__descricao">{s.descricao}</p>
            <dl className="detalhe-solicitacao__dados">
              <Dado rotulo="Unidade curricular">{s.unidadeCurricular}</Dado>
              <Dado rotulo="Aberta por">
                {s.solicitante?.nome}
                {s.cargoSolicitante && ` (${rotuloCargo(s.cargoSolicitante)})`}
              </Dado>
              <Dado rotulo="Aberta em">{formatarDataHora(s.dataHora)}</Dado>
              <Dado rotulo="Atendente">{s.atendente?.nome ?? "Ainda não definida"}</Dado>
            </dl>
          </div>

          {/* ---- Aluno (dados mínimos) ---- */}
          <div className="modal__bloco">
            <h3 className="modal__bloco-titulo">Aluno</h3>
            <dl className="detalhe-solicitacao__dados">
              <Dado rotulo="Nome">{s.aluno?.alunoNome}</Dado>
              <Dado rotulo="Matrícula">{s.aluno?.matricula}</Dado>
              <Dado rotulo="Turma">{s.aluno?.turmaNome}</Dado>
              <Dado rotulo="Curso">{s.aluno?.cursoNome}</Dado>
              <Dado rotulo="Unidade">{rotuloUnidade(s.aluno?.unidade)}</Dado>
            </dl>
          </div>

          {/* ---- Histórico ---- */}
          {historico.length > 0 && (
            <div className="modal__bloco">
              <h3 className="modal__bloco-titulo">Histórico</h3>
              <ol className="historico">
                {historico.map((item, indice) => (
                  <li key={`${item.dataHora}-${indice}`} className="historico__item">
                    <span className="historico__marca" aria-hidden="true" />
                    <div>
                      <p className="historico__titulo">
                        {rotuloStatus(item.status)}
                        <span className="historico__data">{formatarDataHora(item.dataHora)}</span>
                      </p>
                      {item.usuario?.nome && <p className="historico__usuario">por {item.usuario.nome}</p>}
                      {item.observacao && <p className="historico__obs">{item.observacao}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      <div className="modal__acoes">
        <button type="button" className="modal__botao modal__botao--secundario" onClick={onFechar}>
          Fechar
        </button>
        {s && acoes?.(s)}
      </div>
    </Modal>
  );
}
