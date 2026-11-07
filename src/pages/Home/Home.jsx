import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import TurmaModal from "../../components/TurmaModal/TurmaModal";
import { getToken } from "../../services/api";
import { buscarUsuarioLogado, getUsuario, logout } from "../../services/auth";
import "./Home.css";

function getSaudacao(data = new Date()) {
  const hora = data.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Home() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(getUsuario);
  const [modalTurmaAberto, setModalTurmaAberto] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!getToken()) return;
    buscarUsuarioLogado()
      .then(setUsuario)
      .catch((error) => {
        if (error.status === 401) {
          logout();
          navigate("/", { replace: true });
        }
      });
  }, [navigate]);

  const fecharModalTurma = useCallback(() => setModalTurmaAberto(false), []);

  if (!getToken()) return <Navigate to="/" replace />;

  const nome = usuario?.nome ?? "";

  function handleNovoAluno() {
    // TODO: abrir o cadastro de aluno
  }

  function handleNovaTurma() {
    setMensagem("");
    setModalTurmaAberto(true);
  }

  function handleTurmaCriada(turma) {
    setModalTurmaAberto(false);
    setMensagem(`Turma "${turma.nome}" (${turma.cursoNome}) criada com sucesso.`);
  }

  return (
    <div className="home">
      <Header nome={nome} temNotificacao />

      <main className="home__conteudo">
        <h1 className="home__saudacao">
          {getSaudacao()}, {nome.toUpperCase()}
        </h1>

        <div className="home_botoes">
          <button className="home__botao" type="button" onClick={handleNovoAluno}>
            + ALUNO
          </button>

          <button className="home__botao" type="button" onClick={handleNovaTurma}>
            + TURMA
          </button>
        </div>

        {mensagem && (
          <p className="home__mensagem" role="status">
            {mensagem}
          </p>
        )}
      </main>

      {modalTurmaAberto && (
        <TurmaModal onFechar={fecharModalTurma} onCriada={handleTurmaCriada} />
      )}
    </div>
  );
}
