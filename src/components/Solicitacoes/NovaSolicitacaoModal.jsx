import { useEffect, useState } from "react";
import Campo from "../Campo/Campo";
import Modal from "../Modal/Modal";
import {
  BUSCA_ALUNO_MINIMO,
  buscarAlunosParaSolicitacao,
  criarSolicitacao,
  LIMITE_UNIDADE_CURRICULAR,
  listarAtendentes,
  MOTIVOS,
  VISIBILIDADES,
} from "../../services/solicitacoes";
import { UNIDADES } from "../../services/turmas";
import "./Solicitacoes.css";

const FORM_INICIAL = {
  unidadeCurricular: "",
  motivo: "",
  descricao: "",
  visibilidade: "COMPARTILHADO",
  atendenteId: "",
};

function rotuloUnidade(valor) {
  return UNIDADES.find((unidade) => unidade.valor === valor)?.rotulo ?? valor ?? "";
}

function descreverVinculo(vinculo) {
  return [`Matrícula ${vinculo.matricula}`, vinculo.turmaNome, vinculo.cursoNome, rotuloUnidade(vinculo.unidade)]
    .filter(Boolean)
    .join(" · ");
}

// Abertura de solicitação (POST /solicitacoes). O aluno é escolhido pela busca
// mínima do GET /solicitacoes/alunos, que devolve o `vinculoAcademicoId`.
export default function NovaSolicitacaoModal({ onFechar, onCriada, onNaoAutenticado }) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState("");
  const [vinculo, setVinculo] = useState(null);

  const [form, setForm] = useState(FORM_INICIAL);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [atendentes, setAtendentes] = useState([]);

  useEffect(() => {
    let ativo = true;
    listarAtendentes()
      .then((lista) => ativo && setAtendentes(lista ?? []))
      .catch((error) => onNaoAutenticado?.(error));
    return () => {
      ativo = false;
    };
  }, [onNaoAutenticado]);

  // Busca com espera de 350 ms após a digitação.
  const termo = busca.trim();
  const buscaValida = termo.length >= BUSCA_ALUNO_MINIMO;
  useEffect(() => {
    if (!buscaValida || vinculo) return undefined;
    let ativo = true;
    const espera = setTimeout(() => {
      setBuscando(true);
      buscarAlunosParaSolicitacao(termo)
        .then((lista) => {
          if (!ativo) return;
          setResultados(lista ?? []);
          setErroBusca("");
        })
        .catch((error) => {
          if (ativo && !onNaoAutenticado?.(error)) setErroBusca(error.message);
        })
        .finally(() => ativo && setBuscando(false));
    }, 350);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [termo, buscaValida, vinculo, onNaoAutenticado]);

  const alterado = Boolean(vinculo) || Object.keys(FORM_INICIAL).some((k) => form[k] !== FORM_INICIAL[k]);

  function tentarFechar() {
    if (enviando) return;
    if (alterado && !window.confirm("Descartar a solicitação que está sendo preenchida?")) return;
    onFechar();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
    setErros((atual) => ({ ...atual, [name]: undefined }));
  }

  function handleEscolher(item) {
    setVinculo(item);
    setErros((atual) => ({ ...atual, aluno: undefined }));
  }

  function handleTrocarAluno() {
    setVinculo(null);
    requestAnimationFrame(() => document.getElementById("solicitacao-busca")?.focus());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (enviando) return;

    const novos = {};
    if (!vinculo) novos.aluno = "Selecione o aluno.";
    if (!form.motivo) novos.motivo = "Selecione o motivo.";
    if (!form.descricao.trim()) novos.descricao = "Descreva a situação observada.";
    if (form.unidadeCurricular.trim().length > LIMITE_UNIDADE_CURRICULAR) {
      novos.unidadeCurricular = `Máximo de ${LIMITE_UNIDADE_CURRICULAR} caracteres.`;
    }
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      const primeiro = { aluno: "solicitacao-busca", motivo: "solicitacao-motivo-0", descricao: "solicitacao-descricao", unidadeCurricular: "solicitacao-uc" }[Object.keys(novos)[0]];
      document.getElementById(primeiro)?.focus();
      return;
    }

    setEnviando(true);
    setErroGeral("");
    try {
      const criada = await criarSolicitacao({
        vinculoAcademicoId: vinculo.vinculoAcademicoId,
        unidadeCurricular: form.unidadeCurricular.trim() || undefined,
        motivo: form.motivo,
        descricao: form.descricao.trim(),
        visibilidade: form.visibilidade,
        atendenteId: form.atendenteId ? Number(form.atendenteId) : undefined,
      });
      onCriada(criada);
    } catch (error) {
      if (onNaoAutenticado?.(error)) return;
      const daApi = {};
      for (const { campo, mensagem } of error.campos ?? []) {
        if (campo in FORM_INICIAL) daApi[campo] = mensagem;
        if (campo === "vinculoAcademicoId") daApi.aluno = mensagem;
      }
      setErros(daApi);
      setErroGeral(error.message);
      setEnviando(false);
    }
  }

  const responsavel = vinculo?.responsavelCurso;

  return (
    <Modal titulo="Nova solicitação" subtitulo="Informe ao Setor de Apoio uma situação que precisa de atenção." largura={760} onFechar={tentarFechar}>
      <form onSubmit={handleSubmit} noValidate>
        {/* ---- Aluno ---- */}
        <div className="modal__bloco">
          <h3 className="modal__bloco-titulo">Aluno</h3>
          {vinculo ? (
            <div className="nova-solicitacao__escolhido">
              <div>
                <p className="nova-solicitacao__aluno-nome">{vinculo.alunoNome}</p>
                <p className="nova-solicitacao__aluno-info">{descreverVinculo(vinculo)}</p>
              </div>
              <button type="button" className="modal__botao modal__botao--secundario" onClick={handleTrocarAluno} disabled={enviando}>
                Trocar
              </button>
            </div>
          ) : (
            <>
              <Campo
                id="solicitacao-busca"
                rotulo="Buscar aluno"
                obrigatorio
                type="search"
                placeholder="Nome (mín. 3 letras) ou matrícula"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                erro={erros.aluno}
                autoComplete="off"
                dica={!buscaValida && termo ? `Digite ao menos ${BUSCA_ALUNO_MINIMO} caracteres.` : undefined}
              />
              {buscaValida && (
                <div className="nova-solicitacao__resultados" aria-live="polite" aria-busy={buscando || undefined}>
                  {buscando && <p className="nova-solicitacao__vazio">Buscando...</p>}
                  {!buscando && erroBusca && <p className="nova-solicitacao__vazio nova-solicitacao__vazio--erro">{erroBusca}</p>}
                  {!buscando && !erroBusca && resultados.length === 0 && (
                    <p className="nova-solicitacao__vazio">Nenhum aluno encontrado.</p>
                  )}
                  {!buscando && !erroBusca && resultados.length > 0 && (
                    <ul className="nova-solicitacao__lista">
                      {resultados.map((item) => (
                        <li key={item.vinculoAcademicoId}>
                          <button type="button" className="nova-solicitacao__opcao" onClick={() => handleEscolher(item)}>
                            <span className="nova-solicitacao__aluno-nome">
                              {item.alunoNome}
                              {item.minhaTurma && <span className="tag tag--escura">Minha turma</span>}
                            </span>
                            <span className="nova-solicitacao__aluno-info">{descreverVinculo(item)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ---- Situação ---- */}
        <div className="modal__bloco">
          <h3 className="modal__bloco-titulo">Situação</h3>

          <fieldset className="nova-solicitacao__motivos" aria-describedby={erros.motivo ? "solicitacao-motivo-erro" : undefined}>
            <legend className="campo__rotulo">
              Motivo <span className="campo__obrigatorio" aria-hidden="true">*</span>
            </legend>
            <div className="opcoes-chip">
              {MOTIVOS.map((motivo, indice) => (
                <label key={motivo.valor} className={`opcoes-chip__item${form.motivo === motivo.valor ? " opcoes-chip__item--ativo" : ""}`}>
                  <input
                    id={`solicitacao-motivo-${indice}`}
                    type="radio"
                    name="motivo"
                    value={motivo.valor}
                    checked={form.motivo === motivo.valor}
                    onChange={handleChange}
                    disabled={enviando}
                  />
                  {motivo.rotulo}
                </label>
              ))}
            </div>
            {erros.motivo && <p id="solicitacao-motivo-erro" className="campo__erro">{erros.motivo}</p>}
          </fieldset>

          <div className="modal__grade nova-solicitacao__grade">
            <Campo
              id="solicitacao-uc"
              name="unidadeCurricular"
              className="modal__largo"
              rotulo="Unidade curricular"
              placeholder="Ex.: Lógica de Programação"
              value={form.unidadeCurricular}
              onChange={handleChange}
              erro={erros.unidadeCurricular}
              maxLength={LIMITE_UNIDADE_CURRICULAR}
              disabled={enviando}
            />
            <Campo
              id="solicitacao-descricao"
              name="descricao"
              as="textarea"
              className="modal__largo nova-solicitacao__descricao"
              rotulo="O que você observou?"
              obrigatorio
              placeholder="Conte o que aconteceu, desde quando e o que já foi tentado..."
              value={form.descricao}
              onChange={handleChange}
              erro={erros.descricao}
              disabled={enviando}
            />
          </div>
        </div>

        {/* ---- Encaminhamento ---- */}
        <div className="modal__bloco">
          <h3 className="modal__bloco-titulo">Encaminhamento</h3>

          <fieldset className="nova-solicitacao__visibilidade">
            <legend className="campo__rotulo">Quem pode ver</legend>
            <div className="opcoes-cartao">
              {VISIBILIDADES.map((item) => (
                <label key={item.valor} className={`opcoes-cartao__item${form.visibilidade === item.valor ? " opcoes-cartao__item--ativo" : ""}`}>
                  <input
                    type="radio"
                    name="visibilidade"
                    value={item.valor}
                    checked={form.visibilidade === item.valor}
                    onChange={handleChange}
                    disabled={enviando}
                  />
                  <span>
                    <strong>{item.rotulo}</strong>
                    <span>{item.descricao}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Campo
            id="solicitacao-atendente"
            name="atendenteId"
            as="select"
            className="nova-solicitacao__atendente"
            rotulo="Quem vai atender"
            value={form.atendenteId}
            onChange={handleChange}
            disabled={enviando}
            dica="Se não escolher, a solicitação vai para a responsável pelo curso da turma."
          >
            <option value="">
              {responsavel ? `Responsável pelo curso (${responsavel.nome})` : "Responsável pelo curso (automático)"}
            </option>
            {atendentes.map((atendente) => (
              <option key={atendente.id} value={atendente.id}>
                {atendente.nome}
              </option>
            ))}
          </Campo>
        </div>

        {erroGeral && (
          <p className="modal__aviso modal__aviso--erro" role="alert">
            {erroGeral}
          </p>
        )}

        <div className="modal__acoes">
          <button type="button" className="modal__botao modal__botao--secundario" onClick={tentarFechar} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" className="modal__botao" disabled={enviando} aria-busy={enviando || undefined}>
            {enviando ? "Enviando..." : "Enviar solicitação"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
