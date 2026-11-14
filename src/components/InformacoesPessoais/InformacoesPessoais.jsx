import Campo from "../Campo/Campo";
import { SITUACOES_PROFISSIONAIS } from "../../services/alunos";
import { LIMITES, SITUACOES_SEM_EMPRESA } from "../../pages/AlunoFicha/alunoForm";
import { hojeIso } from "../../utils/formatos";
import "./InformacoesPessoais.css";

function Secao({ titulo, children }) {
  return (
    <fieldset className="info-pessoais__secao">
      <legend className="info-pessoais__titulo">{titulo}</legend>
      <div className="info-pessoais__campos">{children}</div>
    </fieldset>
  );
}

export default function InformacoesPessoais({ form, erroDe, onChange, onBlur, somenteLeitura }) {
  // Propriedades comuns a todos os campos desta aba.
  const props = (nome, largura = 3) => ({
    id: `aluno-${nome}`,
    name: nome,
    value: form[nome],
    onChange,
    onBlur,
    erro: erroDe(nome),
    className: `info-pessoais__campo--${largura}`,
  });
  const texto = (nome, largura) => ({
    ...props(nome, largura),
    readOnly: somenteLeitura,
    maxLength: LIMITES[nome],
  });

  const semEmpresa = SITUACOES_SEM_EMPRESA.includes(form.situacaoProfissional);

  return (
    <div className="info-pessoais">
      <Secao titulo="Dados pessoais">
        <Campo
          {...texto("cpf")}
          rotulo="CPF"
          obrigatorio
          inputMode="numeric"
          placeholder="000.000.000-00"
          autoComplete="off"
        />
        <Campo
          {...texto("dataNascimento")}
          rotulo="Data de nascimento"
          obrigatorio
          type="date"
          max={hojeIso()}
        />
        <Campo
          {...texto("email", 6)}
          rotulo="E-mail"
          type="email"
          placeholder="nome@exemplo.com"
          autoComplete="off"
        />
        <Campo
          {...texto("celular")}
          rotulo="Celular"
          type="tel"
          inputMode="numeric"
          placeholder="(00) 00000-0000"
          autoComplete="off"
        />
      </Secao>

      <Secao titulo="Endereço">
        <Campo
          {...texto("cep", 2)}
          rotulo="CEP"
          inputMode="numeric"
          placeholder="00000-000"
          autoComplete="off"
        />
        <Campo {...texto("rua", 4)} rotulo="Rua" />
        <Campo {...texto("numero", 2)} rotulo="Número" />
        <Campo {...texto("bairro", 4)} rotulo="Bairro" />
      </Secao>

      <Secao titulo="Moradia e trabalho">
        <Campo {...texto("moraCom", 6)} rotulo="Com quem mora" placeholder="Ex.: mãe e irmão" />
        <Campo
          {...props("situacaoProfissional")}
          as="select"
          rotulo="Situação profissional"
          disabled={somenteLeitura}
        >
          <option value="">Não informada</option>
          {SITUACOES_PROFISSIONAIS.map((situacao) => (
            <option key={situacao.valor} value={situacao.valor}>
              {situacao.rotulo}
            </option>
          ))}
        </Campo>
        <Campo
          {...texto("empresa")}
          rotulo="Empresa"
          disabled={semEmpresa}
          dica={semEmpresa && !somenteLeitura ? "Não se aplica a alunos desempregados." : undefined}
        />
      </Secao>

      <Secao titulo="Contato de emergência">
        <Campo {...texto("nomeContatoEmergencia", 6)} rotulo="Nome do contato" />
        <Campo
          {...texto("parentescoContatoEmergencia")}
          rotulo="Parentesco"
          placeholder="Ex.: mãe, tio, avó"
        />
        <Campo
          {...texto("celularContatoEmergencia")}
          rotulo="Celular do contato"
          type="tel"
          inputMode="numeric"
          placeholder="(00) 00000-0000"
          autoComplete="off"
        />
      </Secao>
    </div>
  );
}
