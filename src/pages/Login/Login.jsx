import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoSenai from "../../assets/logo-senai.png";
import { login } from "../../services/auth";
import "./Login.css";

export default function Login() {
  const [nif, setNif] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    if (enviando) return;

    if (!nif.trim() || !senha) {
      setErro("Informe o NIF e a senha.");
      return;
    }

    setErro("");
    setEnviando(true);
    try {
      await login(nif.trim(), senha);
      navigate("/home");
    } catch (error) {
      setErro(
        error.status === 401 || error.status === 403
          ? "NIF ou senha inválidos."
          : error.message,
      );
      setEnviando(false);
    }
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

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label className="login-form__label" htmlFor="nif">
              NIF:
            </label>
            <input
              className="login-form__input"
              id="nif"
              type="text"
              autoComplete="username"
              value={nif}
              onChange={(e) => setNif(e.target.value)}
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

            {erro && (
              <p className="login-form__erro" role="alert">
                {erro}
              </p>
            )}

            <button className="login-form__button" type="submit" disabled={enviando}>
              {enviando ? "Entrando..." : "Avançar"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
