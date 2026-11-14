import { useCallback, useEffect, useMemo, useState } from "react";
import Campo from "../Campo/Campo";
import Modal from "../Modal/Modal";
import {
  atualizarCurso,
  criarCurso,
  excluirCurso,
  LIMITE_NOME_CURSO,
  listarCursos,
  MODALIDADES_CURSO,
  rotuloModalidade,
} from "../../services/cursos";
import { listarAtendentes } from "../../services/solicitacoes";
import { listarTurmas } from "../../services/turmas";
import "./Cadastros.css";

const SITUACOES = [
  { valor: "", rotulo: "Todos" },
  { valor: "ativos", rotulo: "Ativos" },
  { valor: "inativos", rotulo: "Inativos" },
];

function normalizar(texto = "") {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function formDoCurso(curso) {
  return {
    nome: curso?.nome ?? "",
    modalidade: curso?.modalidade ?? "",
    responsavelId: curso?.responsavel?.id ? String(curso.responsavel.id) : "",
    ativo: curso?.ativo ?? true,
  };
}

function IconeVoltar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CursoForm({ curso, totalTurmas, atendentes, onSalvo, onExcluido, onVoltar, onSujoChange, onNaoAutenticado }) {
  const base = useMemo(() => formDoCurso(curso), [curso]);
  const [form, setForm] = useState(base);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [bloqueadoPorTurmas, setBloqueadoPorTurmas] = useState(false);

  const sujo = Object.keys(base).some((k) => form[k] !== base[k]);
  useEffect(() => {
    onSujoChange(sujo);
  }, [sujo, onSujoChange]);

  // Responsável atual pode não estar mais entre as atendentes ativas.
  const opcoesResponsavel =
    curso?.responsavel && !atendentes.some((a) => a.id === curso.responsavel.id)
      ? [...atendentes, curso.responsavel]
      : atendentes;

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((atual) => ({ ...atual, [name]: type === "checkbox" ? checked : value }));
    setErros((atual) => ({ ...atual, [name]: undefined }));
  }

  function handleVoltar() {
    if (sujo && !window.confirm("Descartar as alterações deste curso?")) return;
    onVoltar();
  }

  async function salvar(corpoForm) {
    const corpo = {
      nome: corpoForm.nome.trim(),
      modalidade: corpoForm.modalidade,
      ativo: corpoForm.ativo,
      responsavelId: corpoForm.responsavelId ? Number(corpoForm.responsavelId) : undefined,
    };
    setSalvando(true);
    setErroGeral("");
    try {
      const salvo = curso ? await atualizarCurso(curso.id, corpo) : await criarCurso(corpo);
      onSalvo(salvo, Boolean(curso));
    } catch (error) {
      if (onNaoAutenticado?.(error)) return;
      const daApi = {};
      for (const { campo, mensagem } of error.campos ?? []) if (campo in base) daApi[campo] = mensagem;
      setErros(daApi);
      setErroGeral(error.message);
      setSalvando(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (salvando) return;
    const novos = {};
    if (!form.nome.trim()) novos.nome = "Informe o nome do curso.";
    else if (form.nome.trim().length > LIMITE_NOME_CURSO) novos.nome = `Máximo de ${LIMITE_NOME_CURSO} caracteres.`;
    if (!form.modalidade) novos.modalidade = "Selecione a modalidade.";
    setErros(novos);
    const primeiro = Object.keys(novos)[0];
    if (primeiro) {
      document.getElementById(`curso-${primeiro}`)?.focus();
      return;
    }
    salvar(form);
  }

  async function handleExcluir() {
    if (excluindo || !window.confirm(`Excluir o curso "${curso.nome}"? Esta ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    setErroGeral("");
    try {
      await excluirCurso(curso.id);
      onExcluido(curso);
    } catch (error) {
      if (onNaoAutenticado?.(error)) return;
      if (error.status === 409) {
        setBloqueadoPorTurmas(true);
        setErroGeral("Este curso tem turmas cadastradas e não pode ser excluído. Desative-o para que deixe de ser oferecido.");
      } else {
        setErroGeral(error.message);
      }
      setExcluindo(false);
    }
  }

  function handleDesativarAgora() {
    const proximo = { ...form, ativo: false };
    setForm(proximo);
    salvar(proximo);
  }

  const campo = (nome) => ({
    id: `curso-${nome}`,
    name: nome,
    value: form[nome],
    onChange: handleChange,
    erro: erros[nome],
    disabled: salvando || excluindo,
  });

  return (
    <>
      <button type="button" className="cadastro__voltar" onClick={handleVoltar} disabled={salvando || excluindo}>
        <IconeVoltar /> Todos os cursos
      </button>

      <form className="modal__bloco" onSubmit={handleSubmit} noValidate>
        <h3 className="modal__bloco-titulo">Dados do curso</h3>
        <div className="modal__grade">
          <Campo {...campo("nome")} className="modal__largo" rotulo="Nome" obrigatorio maxLength={LIMITE_NOME_CURSO} placeholder="Ex.: Técnico em Desenvolvimento de Sistemas" />
          <Campo {...campo("modalidade")} as="select" rotulo="Modalidade" obrigatorio>
            <option value="">Selecione</option>
            {MODALIDADES_CURSO.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo} ({m.valor})
              </option>
            ))}
          </Campo>
          <Campo
            {...campo("responsavelId")}
            as="select"
            rotulo="Responsável no Setor de Apoio"
            dica="Sugerida como atendente nas solicitações das turmas deste curso."
          >
            <option value="">Sem responsável</option>
            {opcoesResponsavel.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Campo>
        </div>
        <label className="cadastro__interruptor">
          <input type="checkbox" name="ativo" checked={form.ativo} onChange={handleChange} disabled={salvando || excluindo} />
          Curso ativo
        </label>
        {curso && (
          <p className="cadastro__sub">
            {totalTurmas === 0 ? "Nenhuma turma neste curso." : totalTurmas === 1 ? "1 turma neste curso." : `${totalTurmas} turmas neste curso.`}
          </p>
        )}

        {erroGeral && (
          <div className="modal__aviso modal__aviso--erro" role="alert">
            {erroGeral}
            {bloqueadoPorTurmas && form.ativo && (
              <div className="cadastro__acoes-form">
                <div>
                  <button type="button" className="modal__botao" onClick={handleDesativarAgora} disabled={salvando}>
                    Desativar curso
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="cadastro__acoes-form">
          {curso && (
            <button type="button" className="cadastro__excluir" onClick={handleExcluir} disabled={salvando || excluindo}>
              {excluindo ? "Excluindo..." : "Excluir curso"}
            </button>
          )}
          <div>
            <button type="button" className="modal__botao modal__botao--secundario" onClick={handleVoltar} disabled={salvando || excluindo}>
              Cancelar
            </button>
            <button type="submit" className="modal__botao" disabled={salvando || excluindo || (curso && !sujo)}>
              {salvando ? "Salvando..." : curso ? "Salvar alterações" : "Criar curso"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

// Cadastro de cursos: lista com filtros, criação (POST), edição (PUT) e exclusão (DELETE).
export default function CursosModal({ onFechar, onAlterado, onNaoAutenticado }) {
  const [cursos, setCursos] = useState([]);
  const [turmasPorCurso, setTurmasPorCurso] = useState({});
  const [atendentes, setAtendentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [mensagem, setMensagem] = useState("");

  const [busca, setBusca] = useState("");
  const [modalidade, setModalidade] = useState("");
  const [situacao, setSituacao] = useState("");

  const [edicao, setEdicao] = useState(null); // null = lista; { curso } = novo (null) ou edição
  const [formSujo, setFormSujo] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([listarCursos({ somenteAtivos: false }), listarTurmas()])
      .then(([listaCursos, turmas]) => {
        if (!ativo) return;
        setCursos((listaCursos ?? []).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
        const contagem = {};
        for (const t of turmas) contagem[t.cursoId] = (contagem[t.cursoId] ?? 0) + 1;
        setTurmasPorCurso(contagem);
        setErro("");
      })
      .catch((error) => ativo && !onNaoAutenticado?.(error) && setErro(error.message))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [recarga, onNaoAutenticado]);

  useEffect(() => {
    let ativo = true;
    listarAtendentes()
      .then((lista) => ativo && setAtendentes(lista ?? []))
      .catch((error) => onNaoAutenticado?.(error));
    return () => {
      ativo = false;
    };
  }, [onNaoAutenticado]);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return cursos.filter((c) => {
      if (termo && !normalizar(c.nome).includes(termo) && !normalizar(c.responsavel?.nome).includes(termo)) return false;
      if (modalidade && c.modalidade !== modalidade) return false;
      if (situacao === "ativos" && !c.ativo) return false;
      if (situacao === "inativos" && c.ativo) return false;
      return true;
    });
  }, [cursos, busca, modalidade, situacao]);

  const handleSujo = useCallback((valor) => setFormSujo(valor), []);

  function tentarFechar() {
    if (edicao && formSujo && !window.confirm("Descartar as alterações deste curso?")) return;
    onFechar();
  }

  function abrir(curso) {
    setMensagem("");
    setFormSujo(false);
    setEdicao({ curso });
  }

  function concluir(texto) {
    setEdicao(null);
    setFormSujo(false);
    setMensagem(texto);
    setRecarga((n) => n + 1);
    onAlterado?.();
  }

  const filtrando = Boolean(busca.trim() || modalidade || situacao);
  const titulo = edicao ? (edicao.curso ? "Editar curso" : "Novo curso") : "Cursos";

  return (
    <Modal titulo={titulo} subtitulo={edicao?.curso?.nome} largura={960} onFechar={tentarFechar}>
      {edicao ? (
        <CursoForm
          key={edicao.curso?.id ?? "novo"}
          curso={edicao.curso}
          totalTurmas={edicao.curso ? turmasPorCurso[edicao.curso.id] ?? 0 : 0}
          atendentes={atendentes}
          onSalvo={(c, editado) => concluir(editado ? `Curso "${c.nome}" atualizado.` : `Curso "${c.nome}" criado.`)}
          onExcluido={(c) => concluir(`Curso "${c.nome}" excluído.`)}
          onVoltar={() => setEdicao(null)}
          onSujoChange={handleSujo}
          onNaoAutenticado={onNaoAutenticado}
        />
      ) : (
        <>
          <div className="cadastro__barra">
            <div className="cadastro__filtros cadastro__filtros--3">
              <Campo id="cursos-busca" type="search" rotulo="Buscar" placeholder="Nome do curso ou responsável" value={busca} onChange={(e) => setBusca(e.target.value)} autoComplete="off" />
              <Campo id="cursos-modalidade" as="select" rotulo="Modalidade" value={modalidade} onChange={(e) => setModalidade(e.target.value)}>
                <option value="">Todas</option>
                {MODALIDADES_CURSO.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.rotulo}
                  </option>
                ))}
              </Campo>
              <Campo id="cursos-situacao" as="select" rotulo="Situação" value={situacao} onChange={(e) => setSituacao(e.target.value)}>
                {SITUACOES.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.rotulo}
                  </option>
                ))}
              </Campo>
            </div>
            <button type="button" className="cadastro__novo" onClick={() => abrir(null)}>
              + NOVO CURSO
            </button>
          </div>

          {mensagem && (
            <p className="modal__aviso modal__aviso--sucesso" role="status">
              {mensagem}
            </p>
          )}

          {carregando && <p className="cadastro__aviso">Carregando cursos...</p>}
          {!carregando && erro && (
            <p className="modal__aviso modal__aviso--erro" role="alert">
              Não foi possível carregar os cursos: {erro}
            </p>
          )}

          {!carregando && !erro && (
            <>
              <p className="cadastro__resumo">
                {filtrando ? `${filtrados.length} de ${cursos.length} cursos` : `${cursos.length} cursos`}
                {filtrando && (
                  <button
                    type="button"
                    className="cadastro__limpar"
                    onClick={() => {
                      setBusca("");
                      setModalidade("");
                      setSituacao("");
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </p>
              {filtrados.length === 0 ? (
                <p className="cadastro__aviso">{cursos.length === 0 ? "Nenhum curso cadastrado." : "Nenhum curso com esses filtros."}</p>
              ) : (
                <div className="cadastro__tabela-area">
                  <table className="cadastro__tabela">
                    <thead>
                      <tr>
                        <th scope="col">Curso</th>
                        <th scope="col" className="cadastro__ocultar-movel">Responsável</th>
                        <th scope="col" className="cadastro__ocultar-movel">Turmas</th>
                        <th scope="col">Situação</th>
                        <th scope="col">
                          <span className="cadastro__sr">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((c) => (
                        <tr key={c.id} className={c.ativo ? "" : "cadastro__linha--inativa"} onClick={() => abrir(c)}>
                          <td>
                            <span className="cadastro__nome">{c.nome}</span>
                            <span className="cadastro__sub">
                              <span className="cadastro__sigla">{c.modalidade}</span> {rotuloModalidade(c.modalidade)}
                            </span>
                          </td>
                          <td className="cadastro__ocultar-movel">{c.responsavel?.nome ?? "—"}</td>
                          <td className="cadastro__ocultar-movel">{turmasPorCurso[c.id] ?? 0}</td>
                          <td>
                            <span className={`cadastro__situacao cadastro__situacao--${c.ativo ? "ativo" : "inativo"}`}>
                              {c.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="cadastro__acoes">
                            <button
                              type="button"
                              className="cadastro__editar"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrir(c);
                              }}
                              aria-label={`Editar ${c.nome}`}
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}
