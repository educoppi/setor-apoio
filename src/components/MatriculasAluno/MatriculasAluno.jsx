import { useState } from "react";
import Campo from "../Campo/Campo";
import {
  adicionarVinculo,
  alterarSituacaoVinculo,
  listarVinculos,
  SITUACAO_VINCULO_INICIAL,
  SITUACOES_VINCULO,
} from "../../services/alunos";
import { rotuloUnidade } from "../../services/turmas";
import { formatarData } from "../../utils/formatos";
import "./MatriculasAluno.css";

const LIMITE_MATRICULA = 20;
const NOVA_VAZIA = { matricula: "", turmaId: "", situacao: SITUACAO_VINCULO_INICIAL };

const CLASSES_SITUACAO = {
  EM_ANDAMENTO: "andamento",
  CONCLUIDO: "concluido",
  TRANCADO: "trancado",
  CANCELADO: "encerrado",
  EVADIDO: "encerrado",
};

// Em andamento primeiro; depois as turmas mais recentes.
function ordenar(vinculos) {
  return [...vinculos].sort((a, b) => {
    const ativoA = a.situacao === "EM_ANDAMENTO" ? 0 : 1;
    const ativoB = b.situacao === "EM_ANDAMENTO" ? 0 : 1;
    if (ativoA !== ativoB) return ativoA - ativoB;
    return (b.turma?.dataInicio ?? "").localeCompare(a.turma?.dataInicio ?? "");
  });
}

function descreverTurma(turma) {
  if (!turma) return "";
  return [
    turma.cursoNome,
    turma.unidade && rotuloUnidade(turma.unidade),
    turma.dataInicio && `${formatarData(turma.dataInicio)} a ${formatarData(turma.dataPrevFim)}`,
    turma.ativo === false && "turma inativa",
  ]
    .filter(Boolean)
    .join(" · ");
}

function SeloSituacao({ situacao }) {
  return (
    <span className={`ficha__situacao-selo ficha__situacao-selo--${CLASSES_SITUACAO[situacao] ?? "encerrado"}`}>
      {SITUACOES_VINCULO[situacao] ?? situacao}
    </span>
  );
}

// Aba "Matrículas" da ficha: todos os vínculos do aluno (GET /alunos/{id}/vinculos),
// nova matrícula em outra turma (POST /alunos/{id}/vinculos) e mudança de
// situação de cada uma (PATCH /vinculos/{id}/situacao).
export default function MatriculasAluno({
  aluno,
  vinculoExibidoId,
  turmas,
  carregandoTurmas,
  onVinculosChange,
  onExibir,
  onNaoAutenticado,
}) {
  const vinculos = ordenar(aluno?.vinculos ?? []);
  const [alterandoId, setAlterandoId] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [novaAberta, setNovaAberta] = useState(false);
  const [nova, setNova] = useState(NOVA_VAZIA);
  const [errosNova, setErrosNova] = useState({});
  const [salvandoNova, setSalvandoNova] = useState(false);

  // Turmas em que o aluno ainda não tem matrícula.
  const turmasLivres = turmas
    .filter((turma) => !vinculos.some((v) => v.turma?.id === turma.id))
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"));

  // Recarrega da API (GET /alunos/{id}/vinculos) para refletir o estado real.
  async function recarregar() {
    const lista = await listarVinculos(aluno.id);
    onVinculosChange(lista ?? []);
  }

  function tratarErro(error) {
    if (onNaoAutenticado?.(error)) return null;
    return error.message;
  }

  async function handleSituacao(vinculo, situacao) {
    if (situacao === vinculo.situacao || alterandoId) return;
    const rotulo = SITUACOES_VINCULO[situacao];
    if (!window.confirm(`Alterar a situação na turma ${vinculo.turma?.nome ?? ""} para “${rotulo}”?`)) return;
    setAlterandoId(vinculo.id);
    setMensagem(null);
    try {
      await alterarSituacaoVinculo(vinculo.id, situacao);
      await recarregar();
      setMensagem({ tipo: "sucesso", texto: `Situação na turma ${vinculo.turma?.nome ?? ""} alterada para “${rotulo}”.` });
    } catch (error) {
      const texto = tratarErro(error);
      if (texto) setMensagem({ tipo: "erro", texto: `Não foi possível alterar a situação: ${texto}` });
    } finally {
      setAlterandoId(null);
    }
  }

  function abrirNova() {
    setNova(NOVA_VAZIA);
    setErrosNova({});
    setMensagem(null);
    setNovaAberta(true);
    requestAnimationFrame(() => document.getElementById("nova-matricula-numero")?.focus());
  }

  function handleChangeNova(event) {
    const { name, value } = event.target;
    setNova((atual) => ({ ...atual, [name]: value }));
    setErrosNova((atual) => ({ ...atual, [name]: undefined, geral: undefined }));
  }

  async function handleMatricular() {
    if (salvandoNova) return;
    const erros = {};
    const numero = nova.matricula.trim();
    if (!numero) erros.matricula = "Informe o número da matrícula.";
    else if (numero.length > LIMITE_MATRICULA) erros.matricula = `Máximo de ${LIMITE_MATRICULA} caracteres.`;
    if (!nova.turmaId) erros.turmaId = "Selecione a turma.";
    setErrosNova(erros);
    const primeiro = Object.keys(erros)[0];
    if (primeiro) {
      document.getElementById(primeiro === "matricula" ? "nova-matricula-numero" : "nova-matricula-turma")?.focus();
      return;
    }

    setSalvandoNova(true);
    try {
      const criado = await adicionarVinculo(aluno.id, { matricula: numero, turmaId: Number(nova.turmaId), situacao: nova.situacao });
      await recarregar();
      setNovaAberta(false);
      setMensagem({ tipo: "sucesso", texto: `Aluno matriculado na turma ${criado?.turma?.nome ?? ""} (matrícula ${numero}).` });
    } catch (error) {
      const texto = tratarErro(error);
      if (texto === null) return;
      const daApi = {};
      for (const { campo, mensagem: m } of error.campos ?? []) if (campo in NOVA_VAZIA) daApi[campo] = m;
      setErrosNova({ ...daApi, geral: texto });
    } finally {
      setSalvandoNova(false);
    }
  }

  if (!aluno) {
    return (
      <div className="matriculas">
        <p className="matriculas__aviso">Salve o cadastro do aluno para gerenciar as matrículas em outras turmas.</p>
      </div>
    );
  }

  return (
    // Sem <form>: a aba fica dentro do formulário da ficha. Enter não envia a ficha.
    <div className="matriculas" onKeyDown={(e) => e.key === "Enter" && e.target.tagName === "INPUT" && e.preventDefault()}>
      <div className="matriculas__cabecalho">
        <div>
          <h3 className="matriculas__titulo">Matrículas</h3>
          <p className="matriculas__subtitulo">Turmas em que o aluno está ou esteve matriculado. Cada matrícula tem a sua situação.</p>
        </div>
        {!novaAberta && (
          <button type="button" className="matriculas__nova" onClick={abrirNova}>
            + NOVA MATRÍCULA
          </button>
        )}
      </div>

      {mensagem && (
        <p className={`ficha__mensagem ficha__mensagem--${mensagem.tipo}`} role={mensagem.tipo === "erro" ? "alert" : "status"}>
          {mensagem.texto}
        </p>
      )}

      {novaAberta && (
        <section className="matriculas__form" aria-labelledby="nova-matricula-titulo">
          <h4 id="nova-matricula-titulo">Matricular em outra turma</h4>
          <div className="matriculas__form-grade">
            <Campo
              id="nova-matricula-numero"
              name="matricula"
              rotulo="Nº Matrícula"
              obrigatorio
              value={nova.matricula}
              onChange={handleChangeNova}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMatricular())}
              erro={errosNova.matricula}
              maxLength={LIMITE_MATRICULA}
              autoComplete="off"
              disabled={salvandoNova}
            />
            <Campo
              id="nova-matricula-turma"
              name="turmaId"
              as="select"
              rotulo="Turma"
              obrigatorio
              value={nova.turmaId}
              onChange={handleChangeNova}
              erro={errosNova.turmaId}
              disabled={salvandoNova || carregandoTurmas}
              dica={!carregandoTurmas && turmasLivres.length === 0 ? "O aluno já está matriculado em todas as turmas cadastradas." : undefined}
            >
              <option value="">{carregandoTurmas ? "Carregando turmas..." : "Selecione"}</option>
              {turmasLivres.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome} — {turma.cursoNome}
                  {turma.ativo ? "" : " (inativa)"}
                </option>
              ))}
            </Campo>
            <Campo
              id="nova-matricula-situacao"
              name="situacao"
              as="select"
              rotulo="Situação"
              value={nova.situacao}
              onChange={handleChangeNova}
              disabled={salvandoNova}
            >
              {Object.entries(SITUACOES_VINCULO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Campo>
          </div>
          {errosNova.geral && (
            <p className="ficha__mensagem ficha__mensagem--erro" role="alert">
              Não foi possível matricular: {errosNova.geral}
            </p>
          )}
          <div className="matriculas__form-acoes">
            <button type="button" className="matriculas__botao matriculas__botao--secundario" onClick={() => setNovaAberta(false)} disabled={salvandoNova}>
              Cancelar
            </button>
            <button type="button" className="matriculas__botao" onClick={handleMatricular} disabled={salvandoNova} aria-busy={salvandoNova || undefined}>
              {salvandoNova ? "Matriculando..." : "Matricular"}
            </button>
          </div>
        </section>
      )}

      {vinculos.length === 0 ? (
        <p className="matriculas__vazio">O aluno ainda não tem matrícula em nenhuma turma.</p>
      ) : (
        <ul className="matriculas__lista">
          {vinculos.map((vinculo) => {
            const exibido = vinculo.id === vinculoExibidoId;
            const alterando = alterandoId === vinculo.id;
            return (
              <li key={vinculo.id} className={`matriculas__item${exibido ? " matriculas__item--exibido" : ""}`}>
                <div className="matriculas__turma">
                  <span className="matriculas__turma-nome">{vinculo.turma?.nome ?? "Turma"}</span>
                  <span className="matriculas__turma-info">{descreverTurma(vinculo.turma)}</span>
                  <span className="matriculas__numero">Matrícula {vinculo.matricula}</span>
                </div>

                <div className="matriculas__situacao">
                  <SeloSituacao situacao={vinculo.situacao} />
                  <label className="matriculas__rotulo-oculto" htmlFor={`situacao-${vinculo.id}`}>
                    Alterar situação na turma {vinculo.turma?.nome}
                  </label>
                  <select
                    id={`situacao-${vinculo.id}`}
                    className="matriculas__select"
                    value={vinculo.situacao}
                    onChange={(e) => handleSituacao(vinculo, e.target.value)}
                    disabled={Boolean(alterandoId)}
                    aria-busy={alterando || undefined}
                  >
                    {Object.entries(SITUACOES_VINCULO).map(([valor, rotulo]) => (
                      <option key={valor} value={valor}>
                        {rotulo}
                      </option>
                    ))}
                  </select>
                  {alterando && <span className="matriculas__salvando">Salvando...</span>}
                </div>

                <div className="matriculas__acoes">
                  {exibido ? (
                    <span className="matriculas__exibida">Exibida no topo</span>
                  ) : (
                    <button type="button" className="matriculas__link" onClick={() => onExibir(vinculo)}>
                      Exibir no topo
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
