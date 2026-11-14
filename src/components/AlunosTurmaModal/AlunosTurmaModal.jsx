import { useEffect, useRef, useState } from "react";
import useImagemProtegida from "../../hooks/useImagemProtegida";
import { listarAlunosDaTurma, SITUACOES_VINCULO } from "../../services/alunos";
import { FOTO_PADRAO_CAMINHO } from "../../services/imagens";
import "./AlunosTurmaModal.css";

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
export default function AlunosTurmaModal({ turma, onFechar, onSelecionarAluno, onNaoAutenticado }) {
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
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
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onFechar();
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
  }, [onFechar]);

  function handleTentarNovamente() {
    setCarregando(true);
    setErro("");
    setTentativa((valor) => valor + 1);
  }

  function handleFundoMouseDown(event) {
    if (event.target === event.currentTarget) onFechar();
  }

  let resumo = "";
  if (!carregando && !erro) {
    resumo = alunos.length === 1 ? "1 aluno" : `${alunos.length} alunos`;
  }

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
            onClick={onFechar}
            aria-label="Fechar lista de alunos"
          >
            <IconeVoltar />
          </button>
          <div className="alunos-turma__titulos">
            <h2 className="alunos-turma__titulo" id="alunos-turma-titulo">
              {turma.nome}
            </h2>
            <p className="alunos-turma__resumo" id="alunos-turma-resumo">
              {[turma.cursoNome, resumo].filter(Boolean).join(" · ")}
            </p>
          </div>
        </header>

        <div className="alunos-turma__corpo" aria-busy={carregando || undefined}>
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
            <p className="alunos-turma__aviso">Nenhum aluno matriculado nesta turma.</p>
          )}

          {!carregando && !erro && alunos.length > 0 && (
            <ul className="alunos-turma__lista">
              {alunos.map((aluno) => (
                <CartaoAluno
                  key={aluno.id}
                  aluno={aluno}
                  turmaId={turma.id}
                  onSelecionar={onSelecionarAluno}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
