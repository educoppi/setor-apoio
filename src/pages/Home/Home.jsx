import Header from "../../components/Header/Header";
import "./Home.css";

function getSaudacao(data = new Date()) {
  const hora = data.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Home() {
  // TODO: trocar pelos dados do usuário autenticado
  const usuario = { nome: "Nome" };

  function handleNovoAluno() {
    // TODO: abrir o cadastro de aluno
  }

  return (
    <div className="home">
      <Header nome={usuario.nome} temNotificacao />

      <main className="home__conteudo">
        <h1 className="home__saudacao">
          {getSaudacao()}, {usuario.nome.toUpperCase()}
        </h1>

        <button className="home__botao" type="button" onClick={handleNovoAluno}>
          + ALUNO
        </button>
      </main>
    </div>
  );
}