import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Abas from "../../components/Abas/Abas";
import Campo from "../../components/Campo/Campo";
import CampoCidade from "../../components/CampoCidade/CampoCidade";
import FotoAluno from "../../components/FotoAluno/FotoAluno";
import Header from "../../components/Header/Header";
import InformacoesPessoais from "../../components/InformacoesPessoais/InformacoesPessoais";
import InformacoesQualitativas from "../../components/InformacoesQualitativas/InformacoesQualitativas";
import MatriculasAluno from "../../components/MatriculasAluno/MatriculasAluno";
import OcorrenciasAluno from "../../components/OcorrenciasAluno/OcorrenciasAluno";
import useImagemProtegida from "../../hooks/useImagemProtegida";
import {
  adicionarVinculo,
  atualizarAluno,
  buscarAluno,
  criarAluno,
  SITUACOES_VINCULO,
} from "../../services/alunos";
import { getToken } from "../../services/api";
import { getUsuario, logout } from "../../services/auth";
import { enviarImagem, fotoPadraoUrl, validarArquivoImagem } from "../../services/imagens";
import { listarTurmas, UNIDADES } from "../../services/turmas";
import { ehSolicitante } from "../../services/usuarios";
import { mascaraCep, mascaraCpf, mascaraTelefone } from "../../utils/formatos";
import {
  alunoParaForm,
  CAMPOS_PESSOAIS,
  CAMPOS_TOPO,
  FORM_INICIAL,
  formAlterado,
  LIMITES,
  montarAluno,
  montarVinculo,
  SITUACOES_SEM_EMPRESA,
  validar,
} from "./alunoForm";
import "./AlunoFicha.css";

const ABAS = [
  { id: "pessoais", rotulo: "Informações Pessoais" },
  { id: "qualitativas", rotulo: "Qualitativas" },
  { id: "ocorrencias", rotulo: "Ocorrências" },
  { id: "matriculas", rotulo: "Matrículas" },
];
const ID_ABAS = "ficha-aluno";
const ORDEM_CAMPOS = [...CAMPOS_TOPO, ...CAMPOS_PESSOAIS];

const MASCARAS = {
  cpf: mascaraCpf,
  cep: mascaraCep,
  celular: mascaraTelefone,
  celularContatoEmergencia: mascaraTelefone,
};

// Valores do enum `modalidade` da TurmaResponse.
const MODALIDADES = [
  { sigla: "CT", titulo: "Curso Técnico" },
  { sigla: "CAI", titulo: "Curso de Aprendizagem Industrial" },
  { sigla: "CST", titulo: "Curso Superior de Tecnologia" },
];

function rotuloUnidade(valor) {
  return UNIDADES.find((unidade) => unidade.valor === valor)?.rotulo ?? valor;
}

function formatarData(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function agruparTurmas(turmas) {
  const conhecidas = new Set(MODALIDADES.map((modalidade) => modalidade.sigla));
  const grupos = MODALIDADES.map((modalidade) => ({
    ...modalidade,
    turmas: turmas.filter((turma) => turma.modalidade === modalidade.sigla),
  }));
  grupos.push({
    sigla: "OUTRAS",
    titulo: "Outras",
    turmas: turmas.filter((turma) => !conhecidas.has(turma.modalidade)),
  });
  return grupos.filter((grupo) => grupo.turmas.length > 0);
}

function descreverTurma(turma) {
  const partes = [
    turma.cursoNome,
    `Unidade ${rotuloUnidade(turma.unidade)}`,
    turma.dataInicio && `${formatarData(turma.dataInicio)} a ${formatarData(turma.dataPrevFim)}`,
    !turma.ativo && "Turma inativa",
  ];
  return partes.filter(Boolean).join(" · ");
}

// A situação do vínculo aparece à parte, num selo abaixo do campo Turma.
function descreverVinculo(vinculo) {
  return vinculo.turma ? descreverTurma(vinculo.turma) : "";
}

const CLASSES_SITUACAO = {
  EM_ANDAMENTO: "andamento",
  CONCLUIDO: "concluido",
  TRANCADO: "trancado",
  CANCELADO: "encerrado",
  EVADIDO: "encerrado",
};

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

// Rota: /alunos/novo (sem id) ou /alunos/:id com parâmetros opcionais:
// - turma: turma de origem (escolhe o vínculo e volta ao modal dela);
// - aba: aba inicial (ex.: "ocorrencias");
// - novaOcorrencia: id de solicitação — abre o registro de ocorrência já associado a ela;
// - ocorrencia: id de uma ocorrência a destacar no histórico;
// - origem=atendimentos: o voltar leva às solicitações recebidas.
// A `key` remonta a ficha ao trocar de aluno, sem herdar estado do anterior.
export default function AlunoFichaPagina() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const turmaOrigemId = searchParams.get("turma");
  const pedidos = {
    abaInicial: searchParams.get("aba"),
    novaOcorrencia: searchParams.get("novaOcorrencia"),
    ocorrenciaDestaque: searchParams.get("ocorrencia"),
    origem: searchParams.get("origem"),
  };
  // Depois de abrir o registro pedido, tira o parâmetro da URL para que um
  // recarregamento não abra outra ocorrência.
  const consumirNovaOcorrencia = useCallback(
    () =>
      setSearchParams(
        (atuais) => {
          const proximos = new URLSearchParams(atuais);
          proximos.delete("novaOcorrencia");
          return proximos;
        },
        { replace: true },
      ),
    [setSearchParams],
  );
  // A ficha completa é restrita ao Setor de Apoio (solicitantes não têm acesso).
  if (ehSolicitante(getUsuario())) return <Navigate to="/solicitacoes" replace />;
  return (
    <AlunoFicha
      key={id ?? "novo"}
      alunoId={id}
      turmaOrigemId={turmaOrigemId}
      pedidos={pedidos}
      onNovaOcorrenciaAberta={consumirNovaOcorrencia}
    />
  );
}

// Ficha do aluno. Uma única tela para os modos:
// - create: ficha nova (POST /alunos + POST /alunos/{id}/vinculos da primeira matrícula);
// - view: ficha cadastrada (GET /alunos/{id} ou logo após o POST), somente leitura;
// - edit: ficha cadastrada em edição (PUT /alunos/{id}).
// Fora da criação, o topo lista as turmas em andamento; as matrículas são
// geridas na aba Matrículas.
function AlunoFicha({ alunoId, turmaOrigemId, pedidos = {}, onNovaOcorrenciaAberta }) {
  const navigate = useNavigate();
  const [usuario] = useState(getUsuario);
  const idValido = alunoId === undefined || /^\d+$/.test(alunoId);

  const [form, setForm] = useState(FORM_INICIAL);
  const [tocados, setTocados] = useState({});
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [errosApi, setErrosApi] = useState({});
  const [abaAtiva, setAbaAtiva] = useState(() =>
    ABAS.some((aba) => aba.id === pedidos.abaInicial) ? pedidos.abaInicial : ABAS[0].id,
  );
  // Editor de ocorrência (aba Ocorrências): o SALVAR da barra passa a gravar a ocorrência.
  const ocorrenciasRef = useRef(null);
  const [editorOcorrencia, setEditorOcorrencia] = useState({ aberto: false, salvando: false });

  const [turmas, setTurmas] = useState([]);
  const [carregandoTurmas, setCarregandoTurmas] = useState(true);
  const [erroTurmas, setErroTurmas] = useState("");

  const [foto, setFoto] = useState(null); // { arquivo, preview }
  const [erroFoto, setErroFoto] = useState("");
  const fotoEnviada = useRef(null); // { arquivo, url } — evita reenviar a mesma foto

  const [aluno, setAluno] = useState(null); // AlunoResponse
  const [editando, setEditando] = useState(false);
  const [carregandoAluno, setCarregandoAluno] = useState(Boolean(alunoId) && idValido);
  const [erroAluno, setErroAluno] = useState(idValido ? "" : "Aluno não encontrado.");
  const [tentativaAluno, setTentativaAluno] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false); // trava síncrona contra cliques repetidos
  const [erroGeral, setErroGeral] = useState("");
  const [sucesso, setSucesso] = useState("");

  let modo = "view";
  if (!aluno) modo = "create";
  else if (editando) modo = "edit";
  // A ficha só é editável na criação ou depois de clicar em Editar.
  const fichaBloqueada = Boolean(aluno) && !editando;
  const fotoSalva = useImagemProtegida(aluno?.fotoUrl);

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
          setTurmas(lista);
          setErroTurmas("");
        })
        .catch((error) => {
          if (!tratarNaoAutenticado(error)) setErroTurmas(error.message);
        })
        .finally(() => setCarregandoTurmas(false)),
    [tratarNaoAutenticado],
  );

  useEffect(() => {
    if (getToken()) carregarTurmas();
  }, [carregarTurmas]);

  // Ficha completa do aluno (GET /alunos/{id}).
  useEffect(() => {
    if (!alunoId || !idValido || !getToken()) return undefined;
    let ativo = true;
    buscarAluno(alunoId)
      .then((dados) => {
        if (!ativo) return;
        setAluno(dados);
        setForm(alunoParaForm(dados, null));
        setErroAluno("");
      })
      .catch((error) => {
        if (!ativo || tratarNaoAutenticado(error)) return;
        setErroAluno(error.status === 404 ? "Aluno não encontrado." : error.message);
      })
      .finally(() => ativo && setCarregandoAluno(false));
    return () => {
      ativo = false;
    };
  }, [alunoId, idValido, tentativaAluno, tratarNaoAutenticado]);

  // Libera a pré-visualização anterior ao trocar de foto e ao sair da tela.
  useEffect(
    () => () => {
      if (foto) URL.revokeObjectURL(foto.preview);
    },
    [foto],
  );

  const criando = !aluno;
  const errosValidacao = useMemo(() => validar(form, { criando }), [form, criando]);
  const turmasDisponiveis = turmas;
  const gruposTurmas = useMemo(() => agruparTurmas(turmasDisponiveis), [turmasDisponiveis]);
  const formBase = useMemo(() => (aluno ? alunoParaForm(aluno, null) : FORM_INICIAL), [aluno]);
  // Matrículas em andamento, das turmas mais recentes para as mais antigas.
  const vinculosEmAndamento = useMemo(
    () =>
      (aluno?.vinculos ?? [])
        .filter((v) => v.situacao === "EM_ANDAMENTO")
        .sort((a, b) => (b.turma?.dataInicio ?? "").localeCompare(a.turma?.dataInicio ?? "")),
    [aluno],
  );

  if (!getToken()) return <Navigate to="/" replace />;

  // Erro da API tem prioridade; os de validação aparecem após tocar o campo ou tentar salvar.
  function erroDe(campo) {
    if (errosApi[campo]) return errosApi[campo];
    return tentouSalvar || tocados[campo] ? errosValidacao[campo] : undefined;
  }

  const errosNaAbaPessoal = CAMPOS_PESSOAIS.filter(erroDe).length;
  const abas = ABAS.map((aba) =>
    aba.id === "pessoais" ? { ...aba, alerta: errosNaAbaPessoal } : aba,
  );
  const turmaSelecionada = turmasDisponiveis.find((turma) => String(turma.id) === form.turmaId);
  const alterado = Boolean(foto) || formAlterado(form, formBase);
  // Resumo "vivo": acompanha as correções do usuário depois da primeira tentativa.
  const totalInvalidos =
    modo !== "view" && tentouSalvar
      ? ORDEM_CAMPOS.filter((campo) => errosValidacao[campo]).length
      : 0;

  function handleChange(event) {
    const { name, value } = event.target;
    const mascara = MASCARAS[name];
    setForm((atual) => {
      const proximo = { ...atual, [name]: mascara ? mascara(value) : value };
      if (name === "situacaoProfissional" && SITUACOES_SEM_EMPRESA.includes(value)) {
        proximo.empresa = "";
      }
      return proximo;
    });
    if (errosApi[name]) setErrosApi((atual) => ({ ...atual, [name]: undefined }));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTocados((atual) => (atual[name] ? atual : { ...atual, [name]: true }));
  }

  function handleSelecionarFoto(arquivo) {
    const erro = validarArquivoImagem(arquivo);
    setErroFoto(erro);
    if (erro) return;
    setFoto({ arquivo, preview: URL.createObjectURL(arquivo) });
  }

  function handleRecarregarTurmas() {
    setCarregandoTurmas(true);
    setErroTurmas("");
    carregarTurmas();
  }

  // Leva o usuário ao campo: troca para a aba dele, se preciso, e coloca o foco.
  function focarCampo(campo) {
    if (CAMPOS_PESSOAIS.includes(campo)) setAbaAtiva("pessoais");
    requestAnimationFrame(() => document.getElementById(`aluno-${campo}`)?.focus());
  }

  // Sem foto nova, mantém `atual` (a já gravada ou, na criação, a imagem padrão).
  async function obterFotoUrl(atual) {
    if (!foto) return atual;
    if (fotoEnviada.current?.arquivo === foto.arquivo) return fotoEnviada.current.url;
    try {
      const url = await enviarImagem(foto.arquivo);
      fotoEnviada.current = { arquivo: foto.arquivo, url };
      return url;
    } catch (error) {
      error.message = `Não foi possível enviar a foto (${error.message}). Nenhum dado foi salvo.`;
      throw error;
    }
  }

  async function handleSalvar(event) {
    event.preventDefault();
    if (salvandoRef.current || modo === "view") return;

    setTentouSalvar(true);
    setSucesso("");
    const primeiroInvalido = ORDEM_CAMPOS.find((campo) => errosValidacao[campo]);
    if (primeiroInvalido) {
      setErroGeral("");
      focarCampo(primeiroInvalido);
      return;
    }

    salvandoRef.current = true;
    setSalvando(true);
    setErroGeral("");
    setErrosApi({});

    let alunoAtual = aluno;
    let etapa = "ficha";
    try {
      if (!alunoAtual) {
        // Criação: ficha (POST /alunos) e, em seguida, a primeira matrícula.
        const fotoUrl = await obterFotoUrl(fotoPadraoUrl());
        alunoAtual = await criarAluno(montarAluno(form, fotoUrl));
        etapa = "vinculo";
        const primeira = await adicionarVinculo(alunoAtual.id, montarVinculo(form));
        setAluno({ ...alunoAtual, vinculos: [primeira] });
        setSucesso(`Aluno ${alunoAtual.nome} cadastrado com sucesso.`);
      } else {
        // Edição: só a ficha (PUT). As matrículas não fazem parte do corpo.
        const fotoUrl = await obterFotoUrl(alunoAtual.fotoUrl);
        const atualizado = await atualizarAluno(alunoAtual.id, montarAluno(form, fotoUrl));
        setAluno({ ...atualizado, vinculos: atualizado.vinculos ?? alunoAtual.vinculos });
        setEditando(false);
        setFoto(null);
        setSucesso(`Aluno ${atualizado.nome} atualizado com sucesso.`);
      }
      setTocados({});
      setTentouSalvar(false);
    } catch (error) {
      if (tratarNaoAutenticado(error)) return;

      const errosCampos = {};
      for (const { campo, mensagem } of error.campos ?? []) {
        if (campo in FORM_INICIAL) errosCampos[campo] = mensagem;
        if (campo === "fotoUrl") setErroFoto(mensagem);
      }
      setErrosApi(errosCampos);
      const detalhe = error.message.replace(/\.$/, "");
      if (etapa === "vinculo") {
        // A ficha já existe: segue em visualização e a matrícula é feita na aba Matrículas.
        setAluno({ ...alunoAtual, vinculos: [] });
        setAbaAtiva("matriculas");
        setErroGeral(
          `A ficha do aluno foi criada, mas a matrícula na turma não foi registrada (${detalhe}). Use “+ NOVA MATRÍCULA” na aba Matrículas para concluir.`,
        );
      } else {
        setErroGeral(error.message);
      }
      const primeiro = ORDEM_CAMPOS.find((campo) => errosCampos[campo]);
      if (primeiro) focarCampo(primeiro);
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  }

  function limparEdicao() {
    setFoto(null);
    setErroFoto("");
    setTocados({});
    setTentouSalvar(false);
    setErrosApi({});
    setErroGeral("");
  }

  function handleEditar() {
    limparEdicao();
    setSucesso("");
    setEditando(true);
    requestAnimationFrame(() => document.getElementById("aluno-nome")?.focus());
  }

  function handleCancelarEdicao() {
    if (alterado && !window.confirm("Descartar as alterações feitas na ficha?")) return;
    limparEdicao();
    setForm(alunoParaForm(aluno, null));
    setEditando(false);
  }

  function handleVoltar() {
    if (
      ocorrenciasRef.current?.temAlteracoes() &&
      !window.confirm("Há uma ocorrência sendo registrada que não foi salva. Deseja sair mesmo assim?")
    ) {
      return;
    }
    if ((!aluno || editando) && alterado) {
      const pergunta = aluno
        ? "Descartar as alterações feitas na ficha?"
        : "Descartar os dados preenchidos?";
      if (!window.confirm(pergunta)) return;
    }
    // Veio das solicitações recebidas: volta para elas.
    if (pedidos.origem === "atendimentos") {
      navigate("/atendimentos");
      return;
    }
    // Veio do modal de uma turma: volta para a página inicial com ele aberto.
    navigate("/home", turmaOrigemId ? { state: { turmaId: Number(turmaOrigemId) } } : undefined);
  }

  // Matrículas alteradas na aba (nova turma, nova situação): a lista do topo acompanha.
  function handleVinculosChange(lista) {
    setAluno((atual) => (atual ? { ...atual, vinculos: lista } : atual));
  }

  function abrirMatriculas() {
    setAbaAtiva("matriculas");
    requestAnimationFrame(() => document.querySelector(".ficha__barra")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function handleRecarregarAluno() {
    setCarregandoAluno(true);
    setErroAluno("");
    setTentativaAluno((valor) => valor + 1);
  }


  if (carregandoAluno || erroAluno) {
    return (
      <div className="ficha">
        <Header nome={usuario?.nome ?? ""} role={usuario?.role} />
        <main className="ficha__carregamento">
          <button
            type="button"
            className="ficha__voltar"
            onClick={handleVoltar}
            aria-label="Voltar para a página inicial"
          >
            <IconeVoltar />
          </button>
          {carregandoAluno ? (
            <p className="ficha__carregamento-texto" role="status">
              <span className="ficha__spinner ficha__spinner--escuro" aria-hidden="true" />
              Carregando ficha do aluno...
            </p>
          ) : (
            <div className="ficha__mensagem ficha__mensagem--erro ficha__erro-carga" role="alert">
              <span>Não foi possível abrir a ficha: {erroAluno}</span>
              {idValido && erroAluno !== "Aluno não encontrado." && (
                <button type="button" onClick={handleRecarregarAluno}>
                  Tentar novamente
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  let dicaTurma;
  if (turmaSelecionada) dicaTurma = descreverTurma(turmaSelecionada);
  else if (!carregandoTurmas && !erroTurmas && turmas.length === 0) {
    dicaTurma = "Nenhuma turma cadastrada. Cadastre uma turma na página inicial.";
  }

  const campoTopo = (nome) => ({
    id: `aluno-${nome}`,
    name: nome,
    value: form[nome],
    onChange: handleChange,
    onBlur: handleBlur,
    erro: erroDe(nome),
    variante: "destaque",
    obrigatorio: true,
  });

  return (
    <div className={`ficha ficha--${modo}`}>
      <Header nome={usuario?.nome ?? ""} role={usuario?.role} />

      <form className="ficha__principal" onSubmit={handleSalvar} noValidate>
        <section className="ficha__topo" aria-label="Dados principais do aluno">
          <button
            type="button"
            className="ficha__voltar"
            onClick={handleVoltar}
            aria-label="Voltar para a página inicial"
          >
            <IconeVoltar />
          </button>

          <div className="ficha__campos">
            <Campo
              {...campoTopo("nome")}
              className="ficha__campo--nome"
              rotulo="Nome do aluno"
              placeholder="Nome do aluno"
              maxLength={LIMITES.nome}
              autoComplete="off"
              readOnly={fichaBloqueada}
            />

            {modo === "create" ? (
              <>
                {/* Primeira matrícula do aluno, criada junto com a ficha. */}
                <Campo
                  {...campoTopo("matricula")}
                  rotulo="Nº Matrícula"
                  placeholder="Nº Matrícula"
                  maxLength={LIMITES.matricula}
                  autoComplete="off"
                />

                <div className="ficha__campo--turma">
                  <Campo
                    {...campoTopo("turmaId")}
                    as="select"
                    rotulo="Turma"
                    dica={dicaTurma}
                    disabled={carregandoTurmas || turmasDisponiveis.length === 0}
                    aria-busy={carregandoTurmas || undefined}
                  >
                    <option value="">
                      {carregandoTurmas ? "Carregando turmas..." : "TURMA"}
                    </option>
                    {gruposTurmas.map((grupo) => (
                      <optgroup key={grupo.sigla} label={grupo.titulo}>
                        {grupo.turmas.map((turma) => (
                          <option key={turma.id} value={turma.id}>
                            {turma.nome} — {turma.cursoNome}
                            {turma.ativo ? "" : " (inativa)"}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Campo>
    
                  {erroTurmas && (
                    <div className="ficha__turmas-erro" role="alert">
                      <span>Não foi possível carregar as turmas: {erroTurmas}</span>
                      <button type="button" onClick={handleRecarregarTurmas}>
                        Tentar novamente
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <section className="ficha__turmas-andamento" aria-labelledby="ficha-turmas-titulo">
                <div className="ficha__turmas-cabecalho">
                  <h2 className="ficha__turmas-titulo" id="ficha-turmas-titulo">
                    Turmas em andamento
                  </h2>
                  <button type="button" className="ficha__turmas-link" onClick={abrirMatriculas}>
                    {(aluno?.vinculos?.length ?? 0) > vinculosEmAndamento.length
                      ? `Ver todas as matrículas (${aluno.vinculos.length})`
                      : "Gerenciar matrículas"}
                  </button>
                </div>

                {vinculosEmAndamento.length === 0 ? (
                  <p className="ficha__turmas-vazio">Nenhuma matrícula em andamento.</p>
                ) : (
                  <table className="ficha__turmas-tabela">
                    <thead>
                      <tr>
                        <th scope="col">Turma</th>
                        <th scope="col">Nº Matrícula</th>
                        <th scope="col">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vinculosEmAndamento.map((v) => (
                        <tr key={v.id}>
                          <td>
                            <span className="ficha__turmas-nome">{v.turma?.nome ?? "Turma"}</span>
                            <span className="ficha__turmas-info">{descreverVinculo(v)}</span>
                          </td>
                          <td className="ficha__turmas-matricula">{v.matricula}</td>
                          <td>
                            <span className={`ficha__situacao-selo ficha__situacao-selo--${CLASSES_SITUACAO[v.situacao] ?? "encerrado"}`}>
                              {SITUACOES_VINCULO[v.situacao] ?? v.situacao}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {/* Municípios de SP, dos mais próximos de São Carlos aos mais distantes. */}
            <CampoCidade
              id="aluno-cidade"
              rotulo="Cidade"
              valor={form.cidade}
              onChange={(nome) => handleChange({ target: { name: "cidade", value: nome } })}
              onBlur={handleBlur}
              erro={erroDe("cidade")}
              obrigatorio
              somenteLeitura={fichaBloqueada}
            />

            {modo !== "view" && (
              <p className="ficha__legenda">
                Campos com <span aria-hidden="true">*</span> são obrigatórios.
              </p>
            )}
          </div>

          <FotoAluno
            src={foto?.preview ?? fotoSalva}
            onSelecionar={handleSelecionarFoto}
            desabilitado={fichaBloqueada}
            erro={erroFoto}
          />
        </section>

        <div className="ficha__barra">
          <Abas
            idBase={ID_ABAS}
            abas={abas}
            ativa={abaAtiva}
            onSelecionar={setAbaAtiva}
            rotulo="Seções da ficha do aluno"
          />

          <div className="ficha__acoes">
            {abaAtiva === "ocorrencias" && editorOcorrencia.aberto ? (
              <button
                type="button"
                className="ficha__salvar"
                onClick={() => ocorrenciasRef.current?.salvar()}
                disabled={editorOcorrencia.salvando}
                aria-busy={editorOcorrencia.salvando || undefined}
              >
                {editorOcorrencia.salvando && <span className="ficha__spinner" aria-hidden="true" />}
                {editorOcorrencia.salvando ? "SALVANDO..." : "SALVAR"}
              </button>
            ) : (
            <>
            {modo === "view" && (
              <button type="button" className="ficha__salvar ficha__editar" onClick={handleEditar}>
                EDITAR
              </button>
            )}
            {editando && (
              <button
                type="button"
                className="ficha__cancelar"
                onClick={handleCancelarEdicao}
                disabled={salvando}
              >
                CANCELAR
              </button>
            )}
            {modo !== "view" && (
              <button
                type="submit"
                className="ficha__salvar"
                disabled={salvando}
                aria-busy={salvando || undefined}
              >
                {salvando && <span className="ficha__spinner" aria-hidden="true" />}
                {salvando ? "SALVANDO..." : "SALVAR"}
              </button>
            )}
            </>
            )}
          </div>
        </div>

        <section className="ficha__conteudo">
          {sucesso && (
            <p className="ficha__mensagem ficha__mensagem--sucesso" role="status">
              {sucesso}
            </p>
          )}
          {totalInvalidos > 0 && (
            <p className="ficha__mensagem ficha__mensagem--erro" role="alert">
              {totalInvalidos === 1
                ? "Há 1 campo a corrigir antes de salvar."
                : `Há ${totalInvalidos} campos a corrigir antes de salvar.`}
            </p>
          )}
          {erroGeral && (
            <p className="ficha__mensagem ficha__mensagem--erro" role="alert">
              {erroGeral}
            </p>
          )}

          {/* Os painéis ficam montados (só ocultos) para preservar tudo entre as abas. */}
          {ABAS.map((aba) => (
            <div
              key={aba.id}
              id={`${ID_ABAS}-painel-${aba.id}`}
              role="tabpanel"
              aria-labelledby={`${ID_ABAS}-aba-${aba.id}`}
              hidden={abaAtiva !== aba.id}
            >
              {aba.id === "pessoais" && (
                <InformacoesPessoais
                  form={form}
                  erroDe={erroDe}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  somenteLeitura={fichaBloqueada}
                />
              )}
              {aba.id === "qualitativas" && (
                <InformacoesQualitativas
                  id="aluno-infoQualitativa"
                  valor={form.infoQualitativa}
                  onChange={handleChange}
                  ativa={abaAtiva === aba.id}
                  somenteLeitura={fichaBloqueada}
                />
              )}
              {aba.id === "matriculas" && (
                <MatriculasAluno
                  aluno={aluno}
                  turmas={turmas}
                  carregandoTurmas={carregandoTurmas}
                  onVinculosChange={handleVinculosChange}
                  onNaoAutenticado={tratarNaoAutenticado}
                />
              )}
              {aba.id === "ocorrencias" && (
                <OcorrenciasAluno
                  ref={ocorrenciasRef}
                  aluno={aluno}
                  usuario={usuario}
                  habilitado={Boolean(aluno)}
                  bloqueado={editando}
                  onEditorChange={setEditorOcorrencia}
                  novaComSolicitacao={pedidos.novaOcorrencia}
                  onNovaComSolicitacaoAberta={onNovaOcorrenciaAberta}
                  destaqueId={pedidos.ocorrenciaDestaque}
                  onNaoAutenticado={tratarNaoAutenticado}
                />
              )}
            </div>
          ))}
        </section>
      </form>
    </div>
  );
}
