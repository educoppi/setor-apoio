import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Campo from "../Campo/Campo";
import Modal from "../Modal/Modal";
import { alterarMinhaSenha, getUsuario, logout } from "../../services/auth";
import { LIMITES_USUARIO, rotuloCargo, rotuloRole } from "../../services/usuarios";
import "./MenuUsuario.css";

function IconeChave() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l3 3M14 9l2 2" />
    </svg>
  );
}

function IconeSair() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5M5 12h11" />
    </svg>
  );
}

// Troca da própria senha (PUT /auth/senha).
function AlterarSenhaModal({ onFechar, onSessaoExpirada }) {
  const [form, setForm] = useState({ senhaAtual: "", novaSenha: "", confirmacao: "" });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const preenchido = Object.values(form).some(Boolean);

  function tentarFechar() {
    if (salvando) return;
    if (!concluido && preenchido && !window.confirm("Descartar a troca de senha?")) return;
    onFechar();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
    setErros((atual) => ({ ...atual, [name]: undefined }));
    setErroGeral("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (salvando) return;
    const novos = {};
    if (!form.senhaAtual) novos.senhaAtual = "Informe a senha atual.";
    if (!form.novaSenha) novos.novaSenha = "Informe a nova senha.";
    else if (form.novaSenha.length < LIMITES_USUARIO.senhaMin) novos.novaSenha = `Mínimo de ${LIMITES_USUARIO.senhaMin} caracteres.`;
    else if (form.novaSenha.length > LIMITES_USUARIO.senhaMax) novos.novaSenha = `Máximo de ${LIMITES_USUARIO.senhaMax} caracteres.`;
    else if (form.novaSenha === form.senhaAtual) novos.novaSenha = "A nova senha deve ser diferente da atual.";
    if (!novos.novaSenha && form.confirmacao !== form.novaSenha) novos.confirmacao = "As senhas não conferem.";
    setErros(novos);
    const primeiro = Object.keys(novos)[0];
    if (primeiro) {
      document.getElementById(`senha-${primeiro}`)?.focus();
      return;
    }

    setSalvando(true);
    try {
      await alterarMinhaSenha(form.senhaAtual, form.novaSenha);
      setForm({ senhaAtual: "", novaSenha: "", confirmacao: "" });
      setConcluido(true);
    } catch (error) {
      // 401 aqui pode ser senha atual errada ou sessão expirada: a mensagem da API decide.
      if (error.status === 401 && !error.message.toLowerCase().includes("senha")) {
        onSessaoExpirada();
        return;
      }
      const daApi = {};
      for (const { campo, mensagem } of error.campos ?? []) if (campo in form) daApi[campo] = mensagem;
      if (!Object.keys(daApi).length && [400, 401, 403].includes(error.status)) {
        daApi.senhaAtual = error.message;
      }
      setErros(daApi);
      if (!Object.keys(daApi).length) setErroGeral(error.message);
    } finally {
      setSalvando(false);
    }
  }

  const campo = (nome) => ({
    id: `senha-${nome}`,
    name: nome,
    type: "password",
    value: form[nome],
    onChange: handleChange,
    erro: erros[nome],
    disabled: salvando,
    obrigatorio: true,
  });

  return (
    <Modal titulo="Alterar senha" largura={520} onFechar={tentarFechar}>
      {concluido ? (
        <>
          <p className="modal__aviso modal__aviso--sucesso" role="status">
            Senha alterada. Use a nova senha no próximo acesso.
          </p>
          <div className="modal__acoes">
            <button type="button" className="modal__botao" onClick={onFechar}>
              Fechar
            </button>
          </div>
        </>
      ) : (
        <form className="modal__bloco menu-usuario__form" onSubmit={handleSubmit} noValidate>
          <Campo {...campo("senhaAtual")} rotulo="Senha atual" autoComplete="current-password" />
          <Campo
            {...campo("novaSenha")}
            rotulo="Nova senha"
            autoComplete="new-password"
            maxLength={LIMITES_USUARIO.senhaMax}
            dica={erros.novaSenha ? undefined : `De ${LIMITES_USUARIO.senhaMin} a ${LIMITES_USUARIO.senhaMax} caracteres.`}
          />
          <Campo {...campo("confirmacao")} rotulo="Confirmar nova senha" autoComplete="new-password" maxLength={LIMITES_USUARIO.senhaMax} />

          {erroGeral && (
            <p className="modal__aviso modal__aviso--erro" role="alert">
              {erroGeral}
            </p>
          )}

          <div className="modal__acoes">
            <button type="button" className="modal__botao modal__botao--secundario" onClick={tentarFechar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="modal__botao" disabled={salvando} aria-busy={salvando || undefined}>
              {salvando ? "Salvando..." : "Alterar senha"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// Avatar do cabeçalho: abre o menu com "Alterar senha" e "Sair".
export default function MenuUsuario({ nome = "", role }) {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const raizRef = useRef(null);
  const botaoRef = useRef(null);
  const menuId = useId();

  const usuario = getUsuario();
  const inicial = nome.trim().charAt(0).toUpperCase();
  const perfil = [role && rotuloRole(role), usuario?.cargo && rotuloCargo(usuario.cargo)].filter(Boolean).join(" · ");

  useEffect(() => {
    if (!aberto) return undefined;
    function handleFora(event) {
      if (!raizRef.current?.contains(event.target)) setAberto(false);
    }
    function handleTecla(event) {
      if (event.key === "Escape") {
        setAberto(false);
        botaoRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const itens = [...raizRef.current.querySelectorAll('[role="menuitem"]')];
        const atual = itens.indexOf(document.activeElement);
        const proximo = event.key === "ArrowDown" ? (atual + 1) % itens.length : (atual - 1 + itens.length) % itens.length;
        itens[proximo]?.focus();
      }
    }
    document.addEventListener("mousedown", handleFora);
    document.addEventListener("keydown", handleTecla);
    raizRef.current?.querySelector('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("mousedown", handleFora);
      document.removeEventListener("keydown", handleTecla);
    };
  }, [aberto]);

  function handleAlterarSenha() {
    setAberto(false);
    setTrocandoSenha(true);
  }

  function sair() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="menu-usuario" ref={raizRef}>
      <button
        ref={botaoRef}
        className="header__avatar"
        type="button"
        aria-label={`Menu do usuário${nome ? `: ${nome}` : ""}`}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? menuId : undefined}
        onClick={() => setAberto((valor) => !valor)}
      >
        {inicial}
      </button>

      {aberto && (
        <div id={menuId} className="menu-usuario__painel" role="menu" aria-label="Opções da conta">
          <div className="menu-usuario__cabecalho">
            <span className="menu-usuario__avatar" aria-hidden="true">
              {inicial}
            </span>
            <span className="menu-usuario__identidade">
              <span className="menu-usuario__nome">{nome}</span>
              {perfil && <span className="menu-usuario__perfil">{perfil}</span>}
              {usuario?.nif && <span className="menu-usuario__perfil">NIF {usuario.nif}</span>}
            </span>
          </div>
          <button type="button" role="menuitem" className="menu-usuario__item" onClick={handleAlterarSenha}>
            <IconeChave />
            Alterar senha
          </button>
          <button type="button" role="menuitem" className="menu-usuario__item menu-usuario__item--sair" onClick={sair}>
            <IconeSair />
            Sair
          </button>
        </div>
      )}

      {trocandoSenha && <AlterarSenhaModal onFechar={() => setTrocandoSenha(false)} onSessaoExpirada={sair} />}
    </div>
  );
}
