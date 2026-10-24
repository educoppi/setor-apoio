import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoSenai from "../../assets/logo-senai.png";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();

    // TODO: integrar com a API de autenticação
    console.log("Login:", { email, senha });
    navigate("/home");
  }

  return (
    <div className="login-page">
      <header className="login-header">
        <img className="login-header__logo" src={logoSenai} alt="SENAI" />
        <span className="login-header__divider" aria-hidden="true" />
        <h2 className="login-header__title">SETOR DE APOIO</h2>
      </header>

      <main className="login-main">
        <section className="login-card">
          <h1 className="login-card__title">Login</h1>
          <p className="login-card__subtitle">
            Bem-vindo(a) ao sistema do Setor de Apoio!
          </p>
          <hr className="login-card__line" />

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-form__label" htmlFor="email">
              Email:
            </label>
            <input
              className="login-form__input"
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="login-form__label" htmlFor="senha">
              Senha:
            </label>
            <input
              className="login-form__input"
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />

            <button className="login-form__button" type="submit">
              Avançar
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}