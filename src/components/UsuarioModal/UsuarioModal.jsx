import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Campo from "../Campo/Campo";
import {
  alterarAtivo,
  atualizarUsuario,
  CARGOS,
  criarUsuario,
  LIMITES_USUARIO,
  redefinirSenha,
  ROLE_ADMIN,
  ROLES,
} from "../../services/usuarios";
import { emailValido } from "../../utils/formatos";
import "./UsuarioModal.css";

const DADOS_VAZIOS = { nif: "", nome: "", email: "", role: "", cargo: "", senha: "", confirmacao: "" };

function dadosDoUsuario(usuario) {
  if (!usuario) return DADOS_VAZIOS;
  return {
    ...DADOS_VAZIOS,
    nif: usuario.nif ?? "",
    nome: usuario.nome ?? "",
    email: usuario.email ?? "",
    role: usuario.role ?? "",
    cargo: usuario.cargo ?? "",
  };
}

function validarSenha(senha, confirmacao) {
  const erros = {};
  if (!senha) erros.senha = "Informe a senha.";
  else if (senha.length < LIMITES_USUARIO.senhaMin) {
    erros.senha = `Mínimo de ${LIMITES_USUARIO.senhaMin} caracteres.`;
  } else if (senha.length > LIMITES_USUARIO.senhaMax) {
    erros.senha = `Máximo de ${LIMITES_USUARIO.senhaMax} caracteres.`;
  }
  if (!erros.senha && confirmacao !== senha) erros.confirmacao = "As senhas não conferem.";
  return erros;
}

function validarDados(dados, criando) {
  const erros = {};
  if (criando) {
    if (!dados.nif.trim()) erros.nif = "Informe o NIF.";
    else if (dados.nif.trim().length > LIMITES_USUARIO.nif) erros.nif = `Máximo de ${LIMITES_USUARIO.nif} caracteres.`;
    Object.assign(erros, validarSenha(dados.senha, dados.confirmacao));
  }
  if (!dados.nome.trim()) erros.nome = "Informe o nome.";
  else if (dados.nome.trim().length > LIMITES_USUARIO.nome) erros.nome = `Máximo de ${LIMITES_USUARIO.nome} caracteres.`;
  const email = dados.email.trim();
  if (email && !emailValido(email)) erros.email = "E-mail inválido.";
  else if (email.length > LIMITES_USUARIO.email) erros.email = `Máximo de ${LIMITES_USUARIO.email} caracteres.`;
  if (!dados.role) erros.role = "Selecione o perfil de acesso.";
  if (!dados.cargo) erros.cargo = "Selecione o cargo.";
  return erros;
}

function errosDaApi(error, campos) {
  const erros = {};
  for (const { campo, mensagem } of error.campos ?? []) {
    if (campos.includes(campo)) erros[campo] = mensagem;
  }
  return erros;
}

function Aviso({ tipo, children }) {
  if (!children) return null;
  return (
    <p className={`usuario-modal__aviso usuario-modal__aviso--${tipo}`} role={tipo === "erro" ? "alert" : "status"}>
      {children}
    </p>
  );
}

// Criação (usuario = null) ou edição de um usuário. Na edição, cada bloco
// (dados, senha, situação) é salvo por um endpoint próprio da API:
// PUT /usuarios/{id}, PATCH /usuarios/{id}/senha e PATCH /usuarios/{id}/ativo.
export default function UsuarioModal({ usuario, ehVoceMesmo, onFechar, onCriado, onAtualizado, onNaoAutenticado }) {
  const criando = !usuario;
  const base = dadosDoUsuario(usuario);

  const [dados, setDados] = useState(base);
  const [errosDados, setErrosDados] = useState({});
  const [msgDados, setMsgDados] = useState({ tipo: "", texto: "" });
  const [salvandoDados, setSalvandoDados] = useState(false);

  const [senha, setSenha] = useState({ senha: "", confirmacao: "" });
  const [errosSenha, setErrosSenha] = useState({});
  const [msgSenha, setMsgSenha] = useState({ tipo: "", texto: "" });
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const [msgAtivo, setMsgAtivo] = useState({ tipo: "", texto: "" });
  const [salvandoAtivo, setSalvandoAtivo] = useState(false);

  const ocupado = salvandoDados || salvandoSenha || salvandoAtivo;
  const dadosAlterados = ["nif", "nome", "email", "role", "cargo", "senha"].some(
    (campo) => dados[campo] !== base[campo],
  );
  const senhaPreenchida = Boolean(senha.senha || senha.confirmacao);
  const primeiroCampoRef = useRef(null);

  function tentarFechar() {
    if (ocupado) return;
    if ((dadosAlterados || senhaPreenchida) && !window.confirm("Descartar as alterações não salvas?")) return;
    onFechar();
  }

  // Esc fecha; a página de fundo não rola; o foco vai para o primeiro campo.
  const tentarFecharRef = useRef(tentarFechar);
  useLayoutEffect(() => {
    tentarFecharRef.current = tentarFechar;
  });
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") tentarFecharRef.current();
    }
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    primeiroCampoRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  function tratarErro(error, setMensagem) {
    if (onNaoAutenticado?.(error)) return;
    setMensagem({ tipo: "erro", texto: error.message });
  }

  function handleChangeDados(event) {
    const { name, value } = event.target;
    setDados((atual) => ({ ...atual, [name]: value }));
    setErrosDados((atual) => ({ ...atual, [name]: undefined }));
    setMsgDados({ tipo: "", texto: "" });
  }

  function handleChangeSenha(event) {
    const { name, value } = event.target;
    setSenha((atual) => ({ ...atual, [name]: value }));
    setErrosSenha((atual) => ({ ...atual, [name]: undefined }));
    setMsgSenha({ tipo: "", texto: "" });
  }

  async function handleSalvarDados(event) {
    event.preventDefault();
    if (ocupado) return;
    const erros = validarDados(dados, criando);
    setErrosDados(erros);
    const primeiro = Object.keys(erros)[0];
    if (primeiro) {
      document.getElementById(`usuario-${primeiro}`)?.focus();
      return;
    }

    if (
      ehVoceMesmo &&
      usuario.role === ROLE_ADMIN &&
      dados.role !== ROLE_ADMIN &&
      !window.confirm("Você está removendo o seu próprio perfil de administrador e perderá o acesso a esta tela. Continuar?")
    ) {
      return;
    }

    const corpo = {
      nome: dados.nome.trim(),
      email: dados.email.trim() || undefined,
      role: dados.role,
      cargo: dados.cargo,
    };

    setSalvandoDados(true);
    setMsgDados({ tipo: "", texto: "" });
    try {
      if (criando) {
        const criado = await criarUsuario({ ...corpo, nif: dados.nif.trim(), senha: dados.senha });
        onCriado(criado);
        return;
      }
      const atualizado = await atualizarUsuario(usuario.id, corpo);
      onAtualizado(atualizado);
      setMsgDados({ tipo: "sucesso", texto: "Dados atualizados com sucesso." });
    } catch (error) {
      setErrosDados(errosDaApi(error, Object.keys(DADOS_VAZIOS)));
      tratarErro(error, setMsgDados);
    } finally {
      setSalvandoDados(false);
    }
  }

  async function handleRedefinirSenha(event) {
    event.preventDefault();
    if (ocupado) return;
    const erros = validarSenha(senha.senha, senha.confirmacao);
    setErrosSenha(erros);
    if (Object.keys(erros).length > 0) return;

    setSalvandoSenha(true);
    setMsgSenha({ tipo: "", texto: "" });
    try {
      await redefinirSenha(usuario.id, senha.senha);
      setSenha({ senha: "", confirmacao: "" });
      setMsgSenha({ tipo: "sucesso", texto: "Senha redefinida. Informe a nova senha ao usuário." });
    } catch (error) {
      const campos = errosDaApi(error, ["novaSenha"]);
      if (campos.novaSenha) setErrosSenha({ senha: campos.novaSenha });
      tratarErro(error, setMsgSenha);
    } finally {
      setSalvandoSenha(false);
    }
  }

  async function handleAlternarAtivo() {
    if (ocupado) return;
    const ativar = !usuario.ativo;
    const pergunta = ativar
      ? `Reativar ${usuario.nome}? O acesso ao sistema volta a ser permitido.`
      : `Desativar ${usuario.nome}? O usuário não conseguirá mais entrar no sistema.`;
    if (!window.confirm(pergunta)) return;

    setSalvandoAtivo(true);
    setMsgAtivo({ tipo: "", texto: "" });
    try {
      const atualizado = await alterarAtivo(usuario.id, ativar);
      onAtualizado(atualizado);
      setMsgAtivo({ tipo: "sucesso", texto: ativar ? "Usuário reativado." : "Usuário desativado." });
    } catch (error) {
      tratarErro(error, setMsgAtivo);
    } finally {
      setSalvandoAtivo(false);
    }
  }

  function handleFundoMouseDown(event) {
    if (event.target === event.currentTarget) tentarFechar();
  }

  const roleSelecionada = ROLES.find((role) => role.valor === dados.role);
  const campo = (nome) => ({
    id: `usuario-${nome}`,
    name: nome,
    value: dados[nome],
    onChange: handleChangeDados,
    erro: errosDados[nome],
    disabled: salvandoDados,
  });

  return (
    <div className="usuario-modal__fundo" onMouseDown={handleFundoMouseDown}>
      <section className="usuario-modal" role="dialog" aria-modal="true" aria-labelledby="usuario-modal-titulo">
        <h2 className="usuario-modal__titulo" id="usuario-modal-titulo">
          {criando ? "Novo usuário" : "Editar usuário"}
        </h2>
        <hr className="usuario-modal__linha" />
        {!criando && (
          <p className="usuario-modal__subtitulo">
            {usuario.nome}
            {ehVoceMesmo && <span className="usuario-modal__voce">você</span>}
          </p>
        )}

        {/* ---- Dados cadastrais ---- */}
        <form className="usuario-modal__bloco" onSubmit={handleSalvarDados} noValidate>
          {!criando && <h3 className="usuario-modal__bloco-titulo">Dados cadastrais</h3>}
          <div className="usuario-modal__grade">
            {criando ? (
              <Campo
                {...campo("nif")}
                ref={primeiroCampoRef}
                rotulo="NIF (login)"
                obrigatorio
                maxLength={LIMITES_USUARIO.nif}
                autoComplete="off"
                dica="Usado para entrar no sistema."
              />
            ) : (
              <Campo
                id="usuario-nif"
                rotulo="NIF (login)"
                value={usuario.nif ?? ""}
                readOnly
                dica="O NIF não pode ser alterado."
              />
            )}
            <Campo
              {...campo("nome")}
              ref={criando ? undefined : primeiroCampoRef}
              rotulo="Nome"
              obrigatorio
              maxLength={LIMITES_USUARIO.nome}
              autoComplete="off"
            />
            <Campo
              {...campo("email")}
              className="usuario-modal__largo"
              rotulo="E-mail"
              type="email"
              maxLength={LIMITES_USUARIO.email}
              placeholder="nome@sp.senai.br"
              autoComplete="off"
            />
            <Campo
              {...campo("role")}
              as="select"
              rotulo="Perfil de acesso"
              obrigatorio
              dica={roleSelecionada?.descricao}
            >
              <option value="">Selecione</option>
              {ROLES.map((role) => (
                <option key={role.valor} value={role.valor}>
                  {role.rotulo}
                </option>
              ))}
            </Campo>
            <Campo {...campo("cargo")} as="select" rotulo="Cargo" obrigatorio>
              <option value="">Selecione</option>
              {CARGOS.map((cargo) => (
                <option key={cargo.valor} value={cargo.valor}>
                  {cargo.rotulo}
                </option>
              ))}
            </Campo>
            {criando && (
              <>
                <Campo
                  {...campo("senha")}
                  rotulo="Senha inicial"
                  obrigatorio
                  type="password"
                  maxLength={LIMITES_USUARIO.senhaMax}
                  autoComplete="new-password"
                  dica={`De ${LIMITES_USUARIO.senhaMin} a ${LIMITES_USUARIO.senhaMax} caracteres.`}
                />
                <Campo
                  {...campo("confirmacao")}
                  rotulo="Confirmar senha"
                  obrigatorio
                  type="password"
                  maxLength={LIMITES_USUARIO.senhaMax}
                  autoComplete="new-password"
                />
              </>
            )}
          </div>

          <Aviso tipo={msgDados.tipo}>{msgDados.texto}</Aviso>

          <div className="usuario-modal__acoes">
            {criando && (
              <button className="usuario-modal__botao usuario-modal__botao--secundario" type="button" onClick={tentarFechar} disabled={ocupado}>
                Cancelar
              </button>
            )}
            <button
              className="usuario-modal__botao"
              type="submit"
              disabled={ocupado || (!criando && !dadosAlterados)}
              aria-busy={salvandoDados || undefined}
            >
              {salvandoDados ? "Salvando..." : criando ? "Criar usuário" : "Salvar alterações"}
            </button>
          </div>
        </form>

        {!criando && (
          <>
            {/* ---- Senha ---- */}
            <form className="usuario-modal__bloco" onSubmit={handleRedefinirSenha} noValidate>
              <h3 className="usuario-modal__bloco-titulo">Redefinir senha</h3>
              <div className="usuario-modal__grade">
                <Campo
                  id="usuario-nova-senha"
                  name="senha"
                  rotulo="Nova senha"
                  type="password"
                  value={senha.senha}
                  onChange={handleChangeSenha}
                  erro={errosSenha.senha}
                  maxLength={LIMITES_USUARIO.senhaMax}
                  autoComplete="new-password"
                  disabled={salvandoSenha}
                  dica={errosSenha.senha ? undefined : `De ${LIMITES_USUARIO.senhaMin} a ${LIMITES_USUARIO.senhaMax} caracteres.`}
                />
                <Campo
                  id="usuario-nova-senha-confirmacao"
                  name="confirmacao"
                  rotulo="Confirmar nova senha"
                  type="password"
                  value={senha.confirmacao}
                  onChange={handleChangeSenha}
                  erro={errosSenha.confirmacao}
                  maxLength={LIMITES_USUARIO.senhaMax}
                  autoComplete="new-password"
                  disabled={salvandoSenha}
                />
              </div>
              <Aviso tipo={msgSenha.tipo}>{msgSenha.texto}</Aviso>
              <div className="usuario-modal__acoes">
                <button
                  className="usuario-modal__botao usuario-modal__botao--secundario"
                  type="submit"
                  disabled={ocupado || !senhaPreenchida}
                >
                  {salvandoSenha ? "Redefinindo..." : "Redefinir senha"}
                </button>
              </div>
            </form>

            {/* ---- Situação ---- */}
            <div className="usuario-modal__bloco">
              <h3 className="usuario-modal__bloco-titulo">Situação</h3>
              <div className="usuario-modal__situacao">
                <span className={`usuario-modal__status usuario-modal__status--${usuario.ativo ? "ativo" : "inativo"}`}>
                  {usuario.ativo ? "Ativo" : "Inativo"}
                </span>
                <p className="usuario-modal__situacao-texto">
                  {ehVoceMesmo
                    ? "Você não pode desativar o seu próprio usuário."
                    : usuario.ativo
                      ? "Usuários desativados não conseguem entrar no sistema."
                      : "Este usuário não consegue entrar no sistema."}
                </p>
                <button
                  className={`usuario-modal__botao ${usuario.ativo ? "usuario-modal__botao--perigo" : ""}`}
                  type="button"
                  onClick={handleAlternarAtivo}
                  disabled={ocupado || ehVoceMesmo}
                >
                  {salvandoAtivo ? "Salvando..." : usuario.ativo ? "Desativar" : "Reativar"}
                </button>
              </div>
              <Aviso tipo={msgAtivo.tipo}>{msgAtivo.texto}</Aviso>
            </div>

            <div className="usuario-modal__rodape">
              <button className="usuario-modal__botao usuario-modal__botao--secundario" type="button" onClick={tentarFechar} disabled={ocupado}>
                Fechar
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
