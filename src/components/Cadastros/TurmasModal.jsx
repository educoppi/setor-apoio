import { useCallback, useEffect, useMemo, useState } from "react";
import Campo from "../Campo/Campo";
import Modal from "../Modal/Modal";
import { listarCursos, rotuloModalidade } from "../../services/cursos";
import {
  atualizarTurma,
  criarTurma,
  desvincularUsuario,
  LIMITE_NOME_TURMA,
  listarTurmas,
  listarUsuariosDaTurma,
  rotuloUnidade,
  UNIDADES,
  vincularUsuarios,
} from "../../services/turmas";
import { listarUsuarios, rotuloCargo } from "../../services/usuarios";
import { formatarData } from "../../utils/formatos";
import "./Cadastros.css";

const SITUACOES = [
  { valor: "", rotulo: "Todas" },
  { valor: "ativas", rotulo: "Ativas" },
  { valor: "inativas", rotulo: "Inativas" },
];

function normalizar(texto = "") {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function formDaTurma(turma) {
  return {
    cursoId: turma?.cursoId ? String(turma.cursoId) : "",
    nome: turma?.nome ?? "",
    unidade: turma?.unidade ?? "SAO_CARLOS",
    dataInicio: turma?.dataInicio ?? "",
    dataPrevFim: turma?.dataPrevFim ?? "",
    ativo: turma?.ativo ?? true,
  };
}

function validar(form) {
  const erros = {};
  if (!form.cursoId) erros.cursoId = "Selecione o curso.";
  if (!form.nome.trim()) erros.nome = "Informe o nome da turma.";
  else if (form.nome.trim().length > LIMITE_NOME_TURMA) erros.nome = `Máximo de ${LIMITE_NOME_TURMA} caracteres.`;
  if (!form.dataInicio) erros.dataInicio = "Informe a data de início.";
  if (!form.dataPrevFim) erros.dataPrevFim = "Informe a data prevista de término.";
  else if (form.dataInicio && form.dataPrevFim < form.dataInicio) {
    erros.dataPrevFim = "Deve ser igual ou posterior à data de início.";
  }
  return erros;
}

function IconeVoltar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Professores, coordenação... vinculados à turma (veem as solicitações compartilhadas dela).
function UsuariosVinculados({ turmaId, onNaoAutenticado }) {
  const [vinculados, setVinculados] = useState([]);
  const [candidatos, setCandidatos] = useState(null); // null = ainda não carregados
  const [erroCandidatos, setErroCandidatos] = useState("");
  const [escolhido, setEscolhido] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    let ativo = true;
    listarUsuariosDaTurma(turmaId)
      .then((lista) => ativo && setVinculados(lista ?? []))
      .catch((error) => ativo && !onNaoAutenticado?.(error) && setMensagem({ tipo: "erro", texto: error.message }));
    listarUsuarios()
      .then((lista) => ativo && setCandidatos(lista.filter((u) => u.ativo)))
      .catch((error) => {
        if (!ativo || onNaoAutenticado?.(error)) return;
        setErroCandidatos(
          error.status === 403 ? "Somente administradores podem vincular novos usuários à turma." : error.message,
        );
      });
    return () => {
      ativo = false;
    };
  }, [turmaId, onNaoAutenticado]);

  const disponiveis = (candidatos ?? []).filter((u) => !vinculados.some((v) => v.id === u.id));

  async function handleVincular() {
    if (!escolhido || ocupado) return;
    setOcupado(true);
    setMensagem(null);
    try {
      const lista = await vincularUsuarios(turmaId, [Number(escolhido)]);
      setVinculados(lista ?? []);
      setEscolhido("");
      setMensagem({ tipo: "sucesso", texto: "Usuário vinculado à turma." });
    } catch (error) {
      if (!onNaoAutenticado?.(error)) setMensagem({ tipo: "erro", texto: error.message });
    } finally {
      setOcupado(false);
    }
  }

  async function handleRemover(usuario) {
    if (ocupado || !window.confirm(`Remover ${usuario.nome} desta turma? Ele deixará de ver as solicitações compartilhadas dela.`)) return;
    setOcupado(true);
    setMensagem(null);
    try {
      await desvincularUsuario(turmaId, usuario.id);
      setVinculados((atual) => atual.filter((v) => v.id !== usuario.id));
      setMensagem({ tipo: "sucesso", texto: `${usuario.nome} foi removido da turma.` });
    } catch (error) {
      if (!onNaoAutenticado?.(error)) setMensagem({ tipo: "erro", texto: error.message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="modal__bloco">
      <h3 className="modal__bloco-titulo">Professores e equipe vinculados</h3>
      <p className="cadastro__sub">Usuários vinculados veem as solicitações compartilhadas desta turma.</p>

      {vinculados.length === 0 ? (
        <p className="cadastro__aviso">Nenhum usuário vinculado.</p>
      ) : (
        <ul className="cadastro__vinculados">
          {vinculados.map((usuario) => (
            <li key={usuario.id} className="cadastro__vinculado">
              <span>
                <span className="cadastro__nome">{usuario.nome}</span>
                <span className="cadastro__sub">
                  NIF {usuario.nif} · {rotuloCargo(usuario.cargo)}
                </span>
              </span>
              <button type="button" className="cadastro__editar" onClick={() => handleRemover(usuario)} disabled={ocupado}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      {erroCandidatos ? (
        <p className="modal__aviso modal__aviso--info">{erroCandidatos}</p>
      ) : (
        <div className="cadastro__vincular">
          <Campo
            id="turma-vincular"
            as="select"
            rotulo="Vincular usuário"
            value={escolhido}
            onChange={(e) => setEscolhido(e.target.value)}
            disabled={ocupado || candidatos === null}
          >
            <option value="">{candidatos === null ? "Carregando usuários..." : "Selecione"}</option>
            {disponiveis.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome} — {rotuloCargo(u.cargo)}
              </option>
            ))}
          </Campo>
          <button type="button" className="modal__botao modal__botao--secundario" onClick={handleVincular} disabled={ocupado || !escolhido}>
            Vincular
          </button>
        </div>
      )}

      {mensagem && (
        <p className={`modal__aviso modal__aviso--${mensagem.tipo}`} role={mensagem.tipo === "erro" ? "alert" : "status"}>
          {mensagem.texto}
        </p>
      )}
    </div>
  );
}

function TurmaForm({ turma, cursos, onSalva, onVoltar, onSujoChange, onNaoAutenticado }) {
  const base = useMemo(() => formDaTurma(turma), [turma]);
  const [form, setForm] = useState(base);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [salvando, setSalvando] = useState(false);

  const sujo = Object.keys(base).some((k) => form[k] !== base[k]);
  useEffect(() => {
    onSujoChange(sujo);
  }, [sujo, onSujoChange]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((atual) => ({ ...atual, [name]: type === "checkbox" ? checked : value }));
    setErros((atual) => ({ ...atual, [name]: undefined }));
  }

  function handleVoltar() {
    if (sujo && !window.confirm("Descartar as alterações desta turma?")) return;
    onVoltar();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (salvando) return;
    const novos = validar(form);
    setErros(novos);
    const primeiro = Object.keys(novos)[0];
    if (primeiro) {
      document.getElementById(`turma-${primeiro}`)?.focus();
      return;
    }
    const corpo = {
      cursoId: Number(form.cursoId),
      nome: form.nome.trim(),
      unidade: form.unidade || undefined,
      dataInicio: form.dataInicio,
      dataPrevFim: form.dataPrevFim,
      ativo: form.ativo,
    };
    setSalvando(true);
    setErroGeral("");
    try {
      const salva = turma ? await atualizarTurma(turma.id, corpo) : await criarTurma(corpo);
      onSalva(salva, Boolean(turma));
    } catch (error) {
      if (onNaoAutenticado?.(error)) return;
      const daApi = {};
      for (const { campo, mensagem } of error.campos ?? []) if (campo in base) daApi[campo] = mensagem;
      setErros(daApi);
      setErroGeral(error.message);
      setSalvando(false);
    }
  }

  const campo = (nome) => ({
    id: `turma-${nome}`,
    name: nome,
    value: form[nome],
    onChange: handleChange,
    erro: erros[nome],
    disabled: salvando,
  });

  return (
    <>
      <button type="button" className="cadastro__voltar" onClick={handleVoltar} disabled={salvando}>
        <IconeVoltar /> Todas as turmas
      </button>

      <form className="modal__bloco" onSubmit={handleSubmit} noValidate>
        <h3 className="modal__bloco-titulo">Dados da turma</h3>
        <div className="modal__grade">
          <Campo {...campo("nome")} className="modal__largo" rotulo="Nome" obrigatorio maxLength={LIMITE_NOME_TURMA} placeholder="Ex.: 2026-1 DS Noite" />
          <Campo {...campo("cursoId")} className="modal__largo" as="select" rotulo="Curso" obrigatorio>
            <option value="">Selecione o curso</option>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id} disabled={!curso.ativo && String(curso.id) !== base.cursoId}>
                {curso.nome} ({curso.modalidade}){curso.ativo ? "" : " — inativo"}
              </option>
            ))}
          </Campo>
          <Campo {...campo("unidade")} as="select" rotulo="Unidade">
            {UNIDADES.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.rotulo}
              </option>
            ))}
          </Campo>
          <div />
          <Campo {...campo("dataInicio")} type="date" rotulo="Início" obrigatorio />
          <Campo {...campo("dataPrevFim")} type="date" rotulo="Término previsto" obrigatorio min={form.dataInicio || undefined} />
        </div>
        <label className="cadastro__interruptor">
          <input type="checkbox" name="ativo" checked={form.ativo} onChange={handleChange} disabled={salvando} />
          Turma ativa
        </label>

        {erroGeral && (
          <p className="modal__aviso modal__aviso--erro" role="alert">
            {erroGeral}
          </p>
        )}

        <div className="cadastro__acoes-form">
          <div>
            <button type="button" className="modal__botao modal__botao--secundario" onClick={handleVoltar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="modal__botao" disabled={salvando || (turma && !sujo)}>
              {salvando ? "Salvando..." : turma ? "Salvar alterações" : "Criar turma"}
            </button>
          </div>
        </div>
      </form>

      {turma && <UsuariosVinculados turmaId={turma.id} onNaoAutenticado={onNaoAutenticado} />}
    </>
  );
}

// Cadastro de turmas: lista com filtros, criação (POST) e edição (PUT).
export default function TurmasModal({ onFechar, onAlterado, onNaoAutenticado }) {
  const [turmas, setTurmas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [mensagem, setMensagem] = useState("");

  const [busca, setBusca] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [unidade, setUnidade] = useState("");
  const [situacao, setSituacao] = useState("");

  // null = lista; { turma: null } = nova; { turma } = edição.
  const [edicao, setEdicao] = useState(null);
  const [formSujo, setFormSujo] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([listarTurmas(), listarCursos({ somenteAtivos: false })])
      .then(([listaTurmas, listaCursos]) => {
        if (!ativo) return;
        setTurmas(listaTurmas);
        setCursos((listaCursos ?? []).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
        setErro("");
      })
      .catch((error) => ativo && !onNaoAutenticado?.(error) && setErro(error.message))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [recarga, onNaoAutenticado]);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    return turmas.filter((t) => {
      if (termo && !normalizar(t.nome).includes(termo) && !normalizar(t.cursoNome).includes(termo)) return false;
      if (cursoId && String(t.cursoId) !== cursoId) return false;
      if (unidade && t.unidade !== unidade) return false;
      if (situacao === "ativas" && !t.ativo) return false;
      if (situacao === "inativas" && t.ativo) return false;
      return true;
    });
  }, [turmas, busca, cursoId, unidade, situacao]);

  const handleSujo = useCallback((valor) => setFormSujo(valor), []);

  function tentarFechar() {
    if (edicao && formSujo && !window.confirm("Descartar as alterações desta turma?")) return;
    onFechar();
  }

  function abrir(turma) {
    setMensagem("");
    setFormSujo(false);
    setEdicao({ turma });
  }

  function handleSalva(turma, editada) {
    setEdicao(null);
    setFormSujo(false);
    setMensagem(editada ? `Turma "${turma.nome}" atualizada.` : `Turma "${turma.nome}" criada.`);
    setRecarga((n) => n + 1);
    onAlterado?.();
  }

  const filtrando = Boolean(busca.trim() || cursoId || unidade || situacao);
  const titulo = edicao ? (edicao.turma ? "Editar turma" : "Nova turma") : "Turmas";

  return (
    <Modal titulo={titulo} subtitulo={edicao?.turma?.nome} largura={1000} onFechar={tentarFechar}>
      {edicao ? (
        <TurmaForm
          key={edicao.turma?.id ?? "nova"}
          turma={edicao.turma}
          cursos={cursos}
          onSalva={handleSalva}
          onVoltar={() => setEdicao(null)}
          onSujoChange={handleSujo}
          onNaoAutenticado={onNaoAutenticado}
        />
      ) : (
        <>
          <div className="cadastro__barra">
            <div className="cadastro__filtros">
              <Campo id="turmas-busca" type="search" rotulo="Buscar" placeholder="Nome da turma ou curso" value={busca} onChange={(e) => setBusca(e.target.value)} autoComplete="off" />
              <Campo id="turmas-curso" as="select" rotulo="Curso" value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
                <option value="">Todos</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Campo>
              <Campo id="turmas-unidade" as="select" rotulo="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                <option value="">Todas</option>
                {UNIDADES.map((u) => (
                  <option key={u.valor} value={u.valor}>
                    {u.rotulo}
                  </option>
                ))}
              </Campo>
              <Campo id="turmas-situacao" as="select" rotulo="Situação" value={situacao} onChange={(e) => setSituacao(e.target.value)}>
                {SITUACOES.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.rotulo}
                  </option>
                ))}
              </Campo>
            </div>
            <button type="button" className="cadastro__novo" onClick={() => abrir(null)}>
              + NOVA TURMA
            </button>
          </div>

          {mensagem && (
            <p className="modal__aviso modal__aviso--sucesso" role="status">
              {mensagem}
            </p>
          )}

          {carregando && <p className="cadastro__aviso">Carregando turmas...</p>}
          {!carregando && erro && (
            <p className="modal__aviso modal__aviso--erro" role="alert">
              Não foi possível carregar as turmas: {erro}
            </p>
          )}

          {!carregando && !erro && (
            <>
              <p className="cadastro__resumo">
                {filtrando ? `${filtradas.length} de ${turmas.length} turmas` : `${turmas.length} turmas`}
                {filtrando && (
                  <button
                    type="button"
                    className="cadastro__limpar"
                    onClick={() => {
                      setBusca("");
                      setCursoId("");
                      setUnidade("");
                      setSituacao("");
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </p>
              {filtradas.length === 0 ? (
                <p className="cadastro__aviso">{turmas.length === 0 ? "Nenhuma turma cadastrada." : "Nenhuma turma com esses filtros."}</p>
              ) : (
                <div className="cadastro__tabela-area">
                  <table className="cadastro__tabela">
                    <thead>
                      <tr>
                        <th scope="col">Turma</th>
                        <th scope="col" className="cadastro__ocultar-movel">Unidade</th>
                        <th scope="col" className="cadastro__ocultar-movel">Período</th>
                        <th scope="col">Situação</th>
                        <th scope="col">
                          <span className="cadastro__sr">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtradas.map((t) => (
                        <tr key={t.id} className={t.ativo ? "" : "cadastro__linha--inativa"} onClick={() => abrir(t)}>
                          <td>
                            <span className="cadastro__nome">{t.nome}</span>
                            <span className="cadastro__sub">
                              <span className="cadastro__sigla" title={rotuloModalidade(t.modalidade)}>
                                {t.modalidade}
                              </span>{" "}
                              {t.cursoNome}
                            </span>
                          </td>
                          <td className="cadastro__ocultar-movel">{rotuloUnidade(t.unidade)}</td>
                          <td className="cadastro__ocultar-movel">
                            {formatarData(t.dataInicio)} a {formatarData(t.dataPrevFim)}
                          </td>
                          <td>
                            <span className={`cadastro__situacao cadastro__situacao--${t.ativo ? "ativo" : "inativo"}`}>
                              {t.ativo ? "Ativa" : "Inativa"}
                            </span>
                          </td>
                          <td className="cadastro__acoes">
                            <button
                              type="button"
                              className="cadastro__editar"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrir(t);
                              }}
                              aria-label={`Editar ${t.nome}`}
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
