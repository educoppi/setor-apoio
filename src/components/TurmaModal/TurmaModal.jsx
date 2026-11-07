import { useEffect, useState } from "react";
import { listarCursos } from "../../services/cursos";
import { criarTurma, UNIDADES } from "../../services/turmas";
import "./TurmaModal.css";

const FORM_INICIAL = {
  cursoId: "",
  nome: "",
  unidade: "",
  dataInicio: "",
  dataPrevFim: "",
  ativo: true,
};

function validar(form) {
  const erros = {};
  if (!form.cursoId) erros.cursoId = "Selecione o curso.";
  if (!form.nome.trim()) erros.nome = "Informe o nome da turma.";
  else if (form.nome.trim().length > 100) erros.nome = "Máximo de 100 caracteres.";
  if (!form.dataInicio) erros.dataInicio = "Informe a data de início.";
  if (!form.dataPrevFim) erros.dataPrevFim = "Informe a data prevista de término.";
  else if (form.dataInicio && form.dataPrevFim < form.dataInicio) {
    erros.dataPrevFim = "Deve ser igual ou posterior à data de início.";
  }
  return erros;
}

// Inputs type="date" já entregam o valor no formato YYYY-MM-DD.
function montarPayload(form) {
  const payload = {
    cursoId: Number(form.cursoId),
    nome: form.nome.trim(),
    dataInicio: form.dataInicio,
    dataPrevFim: form.dataPrevFim,
    ativo: form.ativo,
  };
  if (form.unidade) payload.unidade = form.unidade;
  return payload;
}

export default function TurmaModal({ onFechar, onCriada }) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cursos, setCursos] = useState([]);
  const [carregandoCursos, setCarregandoCursos] = useState(true);
  const [erroCursos, setErroCursos] = useState("");

  useEffect(() => {
    let montado = true;
    listarCursos({ somenteAtivos: true })
      .then((lista) => montado && setCursos(lista ?? []))
      .catch((error) => montado && setErroCursos(error.message))
      .finally(() => montado && setCarregandoCursos(false));
    return () => {
      montado = false;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !enviando) onFechar();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enviando, onFechar]);

  function handleChange(event) {
    const { name, type, value, checked } = event.target;
    setForm((atual) => ({ ...atual, [name]: type === "checkbox" ? checked : value }));
    setErros((atual) => ({ ...atual, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (enviando) return;

    const novosErros = validar(form);
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setErroGeral("");
    setEnviando(true);
    try {
      const turma = await criarTurma(montarPayload(form));
      onCriada(turma);
    } catch (error) {
      const errosApi = {};
      for (const { campo, mensagem } of error.campos ?? []) {
        if (campo in FORM_INICIAL) errosApi[campo] = mensagem;
      }
      setErros(errosApi);
      setErroGeral(error.message);
      setEnviando(false);
    }
  }

  function handleFundoMouseDown(event) {
    if (event.target === event.currentTarget && !enviando) onFechar();
  }

  return (
    <div className="turma-modal__fundo" onMouseDown={handleFundoMouseDown}>
      <section
        className="turma-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="turma-modal-titulo"
      >
        <h2 className="turma-modal__titulo" id="turma-modal-titulo">
          Nova turma
        </h2>
        <hr className="turma-modal__linha" />

        <form className="turma-modal__form" onSubmit={handleSubmit} noValidate>
          <label className="turma-modal__label" htmlFor="turma-curso">
            Curso:
          </label>
          <select
            className="turma-modal__input"
            id="turma-curso"
            name="cursoId"
            value={form.cursoId}
            onChange={handleChange}
            disabled={carregandoCursos || enviando}
          >
            <option value="">
              {carregandoCursos ? "Carregando cursos..." : "Selecione o curso"}
            </option>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nome} ({curso.modalidade})
              </option>
            ))}
          </select>
          {erroCursos && <p className="turma-modal__erro">{erroCursos}</p>}
          {!carregandoCursos && !erroCursos && cursos.length === 0 && (
            <p className="turma-modal__erro">Nenhum curso ativo cadastrado.</p>
          )}
          {erros.cursoId && <p className="turma-modal__erro">{erros.cursoId}</p>}

          <label className="turma-modal__label" htmlFor="turma-nome">
            Nome:
          </label>
          <input
            className="turma-modal__input"
            id="turma-nome"
            name="nome"
            type="text"
            maxLength={100}
            value={form.nome}
            onChange={handleChange}
            disabled={enviando}
          />
          {erros.nome && <p className="turma-modal__erro">{erros.nome}</p>}

          <label className="turma-modal__label" htmlFor="turma-unidade">
            Unidade:
          </label>
          <select
            className="turma-modal__input"
            id="turma-unidade"
            name="unidade"
            value={form.unidade}
            onChange={handleChange}
            disabled={enviando}
          >
            <option value="">Não informada (padrão: São Carlos)</option>
            {UNIDADES.map((unidade) => (
              <option key={unidade.valor} value={unidade.valor}>
                {unidade.rotulo}
              </option>
            ))}
          </select>
          {erros.unidade && <p className="turma-modal__erro">{erros.unidade}</p>}

          <div className="turma-modal__datas">
            <div>
              <label className="turma-modal__label" htmlFor="turma-inicio">
                Início:
              </label>
              <input
                className="turma-modal__input"
                id="turma-inicio"
                name="dataInicio"
                type="date"
                value={form.dataInicio}
                onChange={handleChange}
                disabled={enviando}
              />
              {erros.dataInicio && <p className="turma-modal__erro">{erros.dataInicio}</p>}
            </div>

            <div>
              <label className="turma-modal__label" htmlFor="turma-fim">
                Término previsto:
              </label>
              <input
                className="turma-modal__input"
                id="turma-fim"
                name="dataPrevFim"
                type="date"
                min={form.dataInicio || undefined}
                value={form.dataPrevFim}
                onChange={handleChange}
                disabled={enviando}
              />
              {erros.dataPrevFim && <p className="turma-modal__erro">{erros.dataPrevFim}</p>}
            </div>
          </div>

          <label className="turma-modal__checkbox">
            <input
              name="ativo"
              type="checkbox"
              checked={form.ativo}
              onChange={handleChange}
              disabled={enviando}
            />
            Turma ativa
          </label>

          {erroGeral && (
            <p className="turma-modal__erro turma-modal__erro--geral" role="alert">
              {erroGeral}
            </p>
          )}

          <div className="turma-modal__acoes">
            <button
              className="turma-modal__botao turma-modal__botao--secundario"
              type="button"
              onClick={onFechar}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button className="turma-modal__botao" type="submit" disabled={enviando}>
              {enviando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
