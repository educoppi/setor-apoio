import { useCallback, useEffect, useRef, useState } from "react";
import useImagemProtegida from "../../hooks/useImagemProtegida";
import { listarAlunosDaTurma, SITUACOES_VINCULO } from "../../services/alunos";
import { getUsuario } from "../../services/auth";
import { FOTO_PADRAO_CAMINHO } from "../../services/imagens";
import { ROLE_ADMIN } from "../../services/usuarios";
import ImportacaoAlunos from "./ImportacaoAlunos";
import "./AlunosTurmaModal.css";

// Importação de alunos: só o Setor de Apoio (operacional) e administradores.
const PERFIS_IMPORTACAO = [ROLE_ADMIN, "OPERACIONAL"];

function IconeVoltar() {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Comparação sem acentos e sem diferenciar maiúsculas ("joao" encontra "João").
function normalizar(texto = "") {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function CartaoAluno({ aluno, turmaId, onSelecionar }) {
  const foto = useImagemProtegida(aluno.fotoUrl);
  const [fotoComFalha, setFotoComFalha] = useState(null);
  const src = foto && foto !== fotoComFalha ? foto : FOTO_PADRAO_CAMINHO;

  // Destaca matrículas que não estão em andamento nesta turma (trancado, evadido...).
  const situacao = aluno.vinculos?.find((vinculo) => vinculo.turma?.id === turmaId)?.situacao;
  const rotuloSituacao = situacao && situacao !== "EM_ANDAMENTO" ? SITUACOES_VINCULO[situacao] : "";

  return (
    <li>
      <button type="button" className="alunos-turma__aluno" onClick={() => onSelecionar(aluno)}>
        <span className="alunos-turma__foto">
          <img src={src} alt="" loading="lazy" onError={() => foto && setFotoComFalha(foto)} />
          {rotuloSituacao && <span className="alunos-turma__situacao">{rotuloSituacao}</span>}
        </span>
        <span className="alunos-turma__nome" title={aluno.nome}>
          {aluno.nome}
        </span>
      </button>
    </li>
  );
}

// Modal com todos os alunos matriculados na turma (GET /alunos?turmaId=).
// Perfis do setor também importam alunos por CSV numa segunda visão do modal.
export default function AlunosTurmaModal({ turma, onFechar, onSelecionarAluno, onNaoAutenticado }) {
  const podeImportar = PERFIS_IMPORTACAO.includes(getUsuario()?.role);
  const [importando, setImportando] = useState(false);
  const [enviandoImportacao, setEnviandoImportacao] = useState(false);
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [busca, setBusca] = useState("");
  const voltarRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    listarAlunosDaTurma(turma.id)
      .then((lista) => {
        if (!ativo) return;
        setAlunos(lista);
        setErro("");
      })
      .catch((error) => {
        if (ativo && !onNaoAutenticado?.(error)) setErro(error.message);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [turma.id, tentativa, onNaoAutenticado]);

  // Esc fecha, o foco vai para o modal e a página de fundo não rola.
  const voltarOuFechar = useCallback(() => {
    if (enviandoImportacao) return;
    if (importando) setImportando(false);
    else onFechar();
  }, [importando, enviandoImportacao, onFechar]);
  const voltarOuFecharRef = useRef(voltarOuFechar);
  useEffect(() => {
    voltarOuFecharRef.current = voltarOuFechar;
  });

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") voltarOuFecharRef.current();
    }
    const focoAnterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    voltarRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus?.();
    };
  }, []);

  function recarregarAlunos() {
    setCarregando(true);
    setErro("");
    setTentativa((valor) => valor + 1);
  }

  function handleTentarNovamente() {
    setCarregando(true);
    setErro("");
    setTentativa((valor) => valor + 1);
  }

  function handleFundoMouseDown(event) {
    if (event.target === event.currentTarget && !importando) onFechar();
  }

  // A lista da turma já vem inteira; a pesquisa por nome filtra aqui mesmo.
  const termo = normalizar(busca);
  const alunosVisiveis = termo ? alunos.filter((aluno) => normalizar(aluno.nome).includes(termo)) : alunos;

  let resumo = "";
  if (!carregando && !erro) {
    resumo = alunos.length === 1 ? "1 aluno" : `${alunos.length} alunos`;
  }
  const mostraBusca = !carregando && !erro && alunos.length > 0;

  return (
    <div className="alunos-turma__fundo" onMouseDown={handleFundoMouseDown}>
      <section
        className="alunos-turma"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alunos-turma-titulo"
        aria-describedby={resumo ? "alunos-turma-resumo" : undefined}
      >
        <header className="alunos-turma__cabecalho">
          <button
            ref={voltarRef}
            type="button"
            className="alunos-turma__voltar"
            onClick={voltarOuFechar}
            disabled={enviandoImportacao}
            aria-label={importando ? "Voltar para a lista de alunos" : "Fechar lista de alunos"}
          >
            <IconeVoltar />
          </button>
          <div className="alunos-turma__titulos">
            <h2 className="alunos-turma__titulo" id="alunos-turma-titulo">
              {turma.nome}
            </h2>
            <p className="alunos-turma__resumo" id="alunos-turma-resumo">
              {importando ? "Importar alunos por CSV" : [turma.cursoNome, resumo].filter(Boolean).join(" · ")}
            </p>
          </div>
        </header>

        <div className="alunos-turma__corpo" aria-busy={carregando || undefined}>
          {importando ? (
            <ImportacaoAlunos
              turma={turma}
              onVoltar={() => setImportando(false)}
              onImportou={recarregarAlunos}
              onOcupadoChange={setEnviandoImportacao}
              onNaoAutenticado={onNaoAutenticado}
            />
          ) : (
          <>
          {(podeImportar || mostraBusca) && (
            <div className="alunos-turma__ferramentas">
              {mostraBusca && (
                <div className="alunos-turma__busca" role="search">
                  <label className="alunos-turma__busca-rotulo" htmlFor="alunos-turma-busca">
                    Pesquisar aluno por nome
                  </label>
                  <svg className="alunos-turma__busca-icone" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-4-4" />
                  </svg>
                  <input
                    id="alunos-turma-busca"
                    className="alunos-turma__busca-campo"
                    type="text"
                    placeholder="Pesquisar aluno por nome"
                    value={busca}
                    autoComplete="off"
                    onChange={(e) => setBusca(e.target.value)}
                    onKeyDown={(e) => {
                      // Esc limpa a pesquisa antes de fechar o modal.
                      if (e.key === "Escape" && busca) {
                        e.stopPropagation();
                        setBusca("");
                      }
                    }}
                    aria-describedby={termo ? "alunos-turma-busca-resultado" : undefined}
                  />
                  {busca && (
                    <button
                      type="button"
                      className="alunos-turma__busca-limpar"
                      onClick={() => {
                        setBusca("");
                        document.getElementById("alunos-turma-busca")?.focus();
                      }}
                      aria-label="Limpar pesquisa"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              {podeImportar && (
              <button type="button" className="alunos-turma__importar" onClick={() => setImportando(true)}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                </svg>
                Importar alunos (CSV)
              </button>
              )}
            </div>
          )}

          {carregando && <p className="alunos-turma__aviso">Carregando alunos...</p>}

          {erro && (
            <div className="alunos-turma__aviso alunos-turma__aviso--erro" role="alert">
              <span>Não foi possível carregar os alunos: {erro}</span>
              <button type="button" onClick={handleTentarNovamente}>
                Tentar novamente
              </button>
            </div>
          )}

          {!carregando && !erro && alunos.length === 0 && (
            <p className="alunos-turma__aviso">
              Nenhum aluno matriculado nesta turma.
              {podeImportar && " Use “Importar alunos (CSV)” para cadastrar vários de uma vez."}
            </p>
          )}

          {mostraBusca && termo && (
            <p className="alunos-turma__busca-resultado" id="alunos-turma-busca-resultado" role="status">
              {alunosVisiveis.length === 0
                ? `Nenhum aluno encontrado para “${busca.trim()}”.`
                : `${alunosVisiveis.length} de ${alunos.length} ${alunos.length === 1 ? "aluno" : "alunos"}`}
            </p>
          )}

          {mostraBusca && alunosVisiveis.length > 0 && (
            <ul className="alunos-turma__lista">
              {alunosVisiveis.map((aluno) => (
                <CartaoAluno
                  key={aluno.id}
                  aluno={aluno}
                  turmaId={turma.id}
                  onSelecionar={onSelecionarAluno}
                />
              ))}
            </ul>
          )}
          </>
          )}
        </div>
      </section>
    </div>
  );
}
