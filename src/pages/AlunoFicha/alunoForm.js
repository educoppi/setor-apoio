import { SITUACAO_VINCULO_INICIAL } from "../../services/alunos";
import {
  cpfValido,
  emailValido,
  hojeIso,
  mascaraCep,
  mascaraCpf,
  mascaraTelefone,
  somenteDigitos,
} from "../../utils/formatos";

export const FORM_INICIAL = {
  // Parte superior (fixa)
  nome: "",
  matricula: "",
  turmaId: "",
  cidade: "",
  // Aba Informações Pessoais
  cpf: "",
  dataNascimento: "",
  email: "",
  celular: "",
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  moraCom: "",
  situacaoProfissional: "",
  empresa: "",
  nomeContatoEmergencia: "",
  parentescoContatoEmergencia: "",
  celularContatoEmergencia: "",
  // Aba Informações Qualitativas
  infoQualitativa: "",
};

// Ordem usada para levar o foco ao primeiro campo inválido.
export const CAMPOS_TOPO = ["nome", "matricula", "turmaId", "cidade"];
export const CAMPOS_PESSOAIS = [
  "cpf",
  "dataNascimento",
  "email",
  "celular",
  "cep",
  "rua",
  "numero",
  "bairro",
  "moraCom",
  "situacaoProfissional",
  "empresa",
  "nomeContatoEmergencia",
  "parentescoContatoEmergencia",
  "celularContatoEmergencia",
];

// Situações em que o aluno não tem empresa: o campo fica desabilitado e vazio.
export const SITUACOES_SEM_EMPRESA = ["DESEMPREGADO"];

// Limites de tamanho do AlunoRequest / VinculoRequest.
export const LIMITES = {
  nome: 100,
  matricula: 20,
  email: 150,
  rua: 100,
  numero: 10,
  bairro: 100,
  moraCom: 100,
  empresa: 100,
  nomeContatoEmergencia: 100,
  parentescoContatoEmergencia: 50,
};

function excedeLimite(form, campo) {
  return form[campo].trim().length > LIMITES[campo];
}

// Obrigatórios: os quatro campos do topo (regra da tela) + cpf e dataNascimento
// (required no AlunoRequest). Os demais só são validados quando preenchidos.
// Matrícula e turma só são pedidas na criação (primeira matrícula do aluno);
// depois, as matrículas são geridas na aba Matrículas.
export function validar(form, { criando = true } = {}) {
  const erros = {};
  const telefone = (campo) => {
    const digitos = somenteDigitos(form[campo]);
    if (digitos && (digitos.length < 10 || digitos.length > 11)) {
      erros[campo] = "Informe DDD + número (10 ou 11 dígitos).";
    }
  };

  if (!form.nome.trim()) erros.nome = "Informe o nome do aluno.";
  if (criando && !form.matricula.trim()) erros.matricula = "Informe o número da matrícula.";
  if (criando && !form.turmaId) erros.turmaId = "Selecione a turma.";
  if (!form.cidade) erros.cidade = "Selecione a cidade.";

  if (!somenteDigitos(form.cpf)) erros.cpf = "Informe o CPF.";
  else if (!cpfValido(form.cpf)) erros.cpf = "CPF inválido.";

  if (!form.dataNascimento) erros.dataNascimento = "Informe a data de nascimento.";
  else if (form.dataNascimento > hojeIso()) {
    erros.dataNascimento = "A data de nascimento não pode estar no futuro.";
  }

  if (form.email.trim() && !emailValido(form.email.trim())) erros.email = "E-mail inválido.";

  telefone("celular");
  telefone("celularContatoEmergencia");

  const cep = somenteDigitos(form.cep);
  if (cep && cep.length !== 8) erros.cep = "O CEP deve ter 8 dígitos.";

  for (const campo of Object.keys(LIMITES)) {
    if (!erros[campo] && excedeLimite(form, campo)) {
      erros[campo] = `Máximo de ${LIMITES[campo]} caracteres.`;
    }
  }

  return erros;
}

// Campos opcionais vazios são omitidos: enviar "" quebraria os patterns da API
// (ex.: celular \d{10,11}, cep \d{8}).
function opcional(valor) {
  const texto = valor.trim();
  return texto ? texto : undefined;
}

// Corpo do POST e do PUT /alunos (AlunoRequest). id/createdAt/updatedAt ficam com o backend.
export function montarAluno(form, fotoUrl) {
  return {
    nome: form.nome.trim(),
    cpf: somenteDigitos(form.cpf),
    dataNascimento: form.dataNascimento,
    cidade: form.cidade,
    email: opcional(form.email),
    celular: opcional(somenteDigitos(form.celular)),
    cep: opcional(somenteDigitos(form.cep)),
    rua: opcional(form.rua),
    numero: opcional(form.numero),
    bairro: opcional(form.bairro),
    moraCom: opcional(form.moraCom),
    fotoUrl: fotoUrl || undefined,
    situacaoProfissional: form.situacaoProfissional || undefined,
    empresa: SITUACOES_SEM_EMPRESA.includes(form.situacaoProfissional)
      ? undefined
      : opcional(form.empresa),
    nomeContatoEmergencia: opcional(form.nomeContatoEmergencia),
    parentescoContatoEmergencia: opcional(form.parentescoContatoEmergencia),
    celularContatoEmergencia: opcional(somenteDigitos(form.celularContatoEmergencia)),
    infoQualitativa: opcional(form.infoQualitativa),
  };
}

// Corpo do POST /alunos/{id}/vinculos (VinculoRequest): a API espera só o id da turma.
export function montarVinculo(form) {
  return {
    matricula: form.matricula.trim(),
    turmaId: Number(form.turmaId),
    situacao: SITUACAO_VINCULO_INICIAL,
  };
}

// AlunoResponse (+ vínculo escolhido) -> estado do formulário, já com máscaras.
// A API devolve null nos campos vazios; o formulário trabalha só com strings.
export function alunoParaForm(aluno, vinculo) {
  const texto = (valor) => (valor == null ? "" : String(valor));
  return {
    nome: texto(aluno.nome),
    matricula: texto(vinculo?.matricula),
    turmaId: texto(vinculo?.turma?.id),
    cidade: texto(aluno.cidade),
    cpf: mascaraCpf(texto(aluno.cpf)),
    dataNascimento: texto(aluno.dataNascimento),
    email: texto(aluno.email),
    celular: mascaraTelefone(texto(aluno.celular)),
    cep: mascaraCep(texto(aluno.cep)),
    rua: texto(aluno.rua),
    numero: texto(aluno.numero),
    bairro: texto(aluno.bairro),
    moraCom: texto(aluno.moraCom),
    situacaoProfissional: texto(aluno.situacaoProfissional),
    empresa: texto(aluno.empresa),
    nomeContatoEmergencia: texto(aluno.nomeContatoEmergencia),
    parentescoContatoEmergencia: texto(aluno.parentescoContatoEmergencia),
    celularContatoEmergencia: mascaraTelefone(texto(aluno.celularContatoEmergencia)),
    infoQualitativa: texto(aluno.infoQualitativa),
  };
}

export function formAlterado(form, base) {
  return Object.keys(FORM_INICIAL).some((campo) => form[campo] !== base[campo]);
}
