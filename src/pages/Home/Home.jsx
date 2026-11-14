import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import AlunosTurmaModal from "../../components/AlunosTurmaModal/AlunosTurmaModal";
import Header from "../../components/Header/Header";
import ModalidadeAccordion from "../../components/ModalidadeAccordion/ModalidadeAccordion";
import CursosModal from "../../components/Cadastros/CursosModal";
import TurmasModal from "../../components/Cadastros/TurmasModal";
import { getToken } from "../../services/api";
import { buscarUsuarioLogado, getUsuario, logout } from "../../services/auth";
import { listarTurmas } from "../../services/turmas";
import { ehSolicitante } from "../../services/usuarios";
import "./Home.css";

// A ordem do array define a ordem das abas na tela.
const MODALIDADES = [
  { sigla: "CT", titulo: "Curso Técnico" },
  { sigla: "CAI", titulo: "Curso de Aprendizagem Industrial" },
  { sigla: "CST", titulo: "Curso Superior de Tecnologia" },
];

function IconeTurmas() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2A5 5 0 0 1 21 19" />
    </svg>
  );
}

function IconeCursos() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}

function getSaudacao(data = new Date()) {
  const hora = data.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

// Matiz aleatória com saturação/luminosidade fixas: cores vivas e com contraste para texto branco.
function corAleatoria() {
  const matiz = Math.floor(Math.random() * 360);
  return `hsl(${matiz} 75% 45%)`;
}

// Mantém a cor das turmas já exibidas para que não "pisquem" ao recarregar a lista.
function atribuirCores(turmas, anteriores) {
  const coresPorId = new Map(anteriores.map((turma) => [turma.id, turma.cor]));
  return turmas.map((turma) => ({ ...turma, cor: coresPorId.get(turma.id) ?? corAleatoria() }));
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [usuario, setUsuario] = useState(getUsuario);
  // Cadastro aberto: "turmas", "cursos" ou null.
  const [cadastroAberto, setCadastroAberto] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [carregandoTurmas, setCarregandoTurmas] = useState(true);
  const [erroTurmas, setErroTurmas] = useState("");
  // Turma com o modal de alunos aberto. Ao voltar da ficha de um aluno, a ficha
  // devolve o id em `location.state` para reabrir a mesma turma.
  const [turmaAbertaId, setTurmaAbertaId] = useState(() => location.state?.turmaId ?? null);

  const tratarNaoAutenticado = useCallback(
    (error) => {
      if (error.status !== 401) return false;
      logout();
      navigate("/", { replace: true });
      return true;
    },
    [navigate],
  );

  const carregarTurmas = useCallback(
    () =>
      listarTurmas()
        .then((lista) => {
          setTurmas((anteriores) => atribuirCores(lista, anteriores));
          setErroTurmas("");
        })
        .catch((error) => {
          if (!tratarNaoAutenticado(error)) setErroTurmas(error.message);
        })
        .finally(() => setCarregandoTurmas(false)),
    [tratarNaoAutenticado],
  );

  useEffect(() => {
    if (!getToken() || ehSolicitante(getUsuario())) return;
    buscarUsuarioLogado().then(setUsuario).catch(tratarNaoAutenticado);
    carregarTurmas();
  }, [tratarNaoAutenticado, carregarTurmas]);

  // Só entram as modalidades com ao menos uma turma; as vazias não geram aba.
  const grupos = useMemo(
    () =>
      MODALIDADES.map((modalidade) => ({
        ...modalidade,
        turmas: turmas.filter((turma) => turma.modalidade === modalidade.sigla),
      })).filter((grupo) => grupo.turmas.length > 0),
    [turmas],
  );

  // Limpa o estado do histórico para não reabrir o modal num recarregamento.
  useEffect(() => {
    if (location.state?.turmaId) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const fecharCadastro = useCallback(() => setCadastroAberto(null), []);
  const fecharModalAlunos = useCallback(() => setTurmaAbertaId(null), []);

  // Só existe depois que a lista carrega (e some se a turma deixar de existir).
  const turmaAberta = turmas.find((turma) => turma.id === turmaAbertaId) ?? null;

  if (!getToken()) return <Navigate to="/" replace />;
  // Solicitantes têm a própria página inicial (solicitações).
  if (ehSolicitante(usuario)) return <Navigate to="/solicitacoes" replace />;

  const nome = usuario?.nome ?? "";

  function handleNovoAluno() {
    navigate("/alunos/novo");
  }

  function handleSelecionarAluno(aluno) {
    navigate(`/alunos/${aluno.id}?turma=${turmaAbertaId}`);
  }

  return (
    <div className="home">
      <Header nome={nome} role={usuario?.role} />

      <main className="home__conteudo">
        <h1 className="home__saudacao">
          {getSaudacao()}, {nome.toUpperCase()}
        </h1>

        <div className="home_botoes">
          <button className="home__botao" type="button" onClick={handleNovoAluno}>
            + ALUNO
          </button>

          <div className="home__cadastros">
            <button className="home__cadastro" type="button" onClick={() => setCadastroAberto("turmas")}>
              <IconeTurmas />
              Turmas
            </button>
            <button className="home__cadastro" type="button" onClick={() => setCadastroAberto("cursos")}>
              <IconeCursos />
              Cursos
            </button>
          </div>
        </div>

        <div className="home__modalidades">
          {carregandoTurmas && <p className="home__aviso">Carregando turmas...</p>}

          {erroTurmas && (
            <p className="home__aviso home__aviso--erro" role="alert">
              {erroTurmas}
            </p>
          )}

          {!carregandoTurmas && !erroTurmas && grupos.length === 0 && (
            <p className="home__aviso">Nenhuma turma cadastrada.</p>
          )}

          {grupos.map((grupo) => (
            <ModalidadeAccordion
              key={grupo.sigla}
              titulo={grupo.titulo}
              turmas={grupo.turmas}
              onSelecionarTurma={(turma) => setTurmaAbertaId(turma.id)}
            />
          ))}
        </div>
      </main>

      {turmaAberta && (
        <AlunosTurmaModal
          turma={turmaAberta}
          onFechar={fecharModalAlunos}
          onSelecionarAluno={handleSelecionarAluno}
          onNaoAutenticado={tratarNaoAutenticado}
        />
      )}

      {cadastroAberto === "turmas" && (
        <TurmasModal onFechar={fecharCadastro} onAlterado={carregarTurmas} onNaoAutenticado={tratarNaoAutenticado} />
      )}
      {cadastroAberto === "cursos" && (
        <CursosModal onFechar={fecharCadastro} onAlterado={carregarTurmas} onNaoAutenticado={tratarNaoAutenticado} />
      )}
    </div>
  );
}
