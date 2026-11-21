import { useEffect, useRef, useState } from "react";
import {
  analisarCsv,
  COLUNAS_OBRIGATORIAS,
  COLUNAS_OPCIONAIS,
  importarAlunos,
  MODELO_CSV,
} from "../../services/importacao";
import "./ImportacaoAlunos.css";

const numero = (n) => (n ?? 0).toLocaleString("pt-BR");

function tamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function ehCsv(arquivo) {
  return /\.csv$/i.test(arquivo.name) || ["text/csv", "application/vnd.ms-excel"].includes(arquivo.type);
}

function Relatorio({ relatorio, onOutro, onVerAlunos }) {
  const erros = relatorio.erros ?? [];
  const importados = (relatorio.criados ?? 0) + (relatorio.atualizados ?? 0);
  return (
    <div className="importacao__relatorio">
      <p className={`importacao__resultado importacao__resultado--${erros.length === 0 ? "ok" : importados > 0 ? "parcial" : "falha"}`} role="status">
        {erros.length === 0
          ? "Importação concluída sem erros."
          : importados > 0
            ? "Importação concluída com erros em algumas linhas."
            : "Nenhum aluno foi importado."}
      </p>

      <dl className="importacao__numeros">
        <div>
          <dt>Linhas lidas</dt>
          <dd>{numero(relatorio.totalLinhas)}</dd>
        </div>
        <div>
          <dt>Alunos criados</dt>
          <dd>{numero(relatorio.criados)}</dd>
        </div>
        <div>
          <dt>Atualizados</dt>
          <dd>{numero(relatorio.atualizados)}</dd>
        </div>
        <div className={erros.length ? "importacao__numero--erro" : ""}>
          <dt>Com erro</dt>
          <dd>{numero(erros.length)}</dd>
        </div>
      </dl>

      {erros.length > 0 && (
        <div className="importacao__erros">
          <h4>Linhas não importadas</h4>
          <p className="importacao__dica">Corrija essas linhas no arquivo e importe de novo. As linhas já importadas serão apenas atualizadas.</p>
          <div className="importacao__tabela-area">
            <table className="importacao__tabela">
              <thead>
                <tr>
                  <th scope="col">Linha</th>
                  <th scope="col">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {erros.map((erro, indice) => (
                  <tr key={`${erro.linha}-${indice}`}>
                    <td>{erro.linha}</td>
                    <td>{erro.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="importacao__acoes">
        <button type="button" className="importacao__botao importacao__botao--secundario" onClick={onOutro}>
          Importar outro arquivo
        </button>
        <button type="button" className="importacao__botao" onClick={onVerAlunos}>
          Ver alunos da turma
        </button>
      </div>
    </div>
  );
}

// Importação de alunos por CSV para a turma (POST /importacao/alunos).
export default function ImportacaoAlunos({ turma, onVoltar, onImportou, onOcupadoChange, onNaoAutenticado }) {
  const [arquivo, setArquivo] = useState(null);
  const [analise, setAnalise] = useState(null);
  const [erroArquivo, setErroArquivo] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [relatorio, setRelatorio] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    onOcupadoChange?.(enviando);
  }, [enviando, onOcupadoChange]);

  function limpar() {
    setArquivo(null);
    setAnalise(null);
    setErroArquivo("");
    setErroEnvio("");
    setRelatorio(null);
  }

  function escolher(selecionado) {
    limpar();
    if (!selecionado) return;
    if (!ehCsv(selecionado)) {
      setErroArquivo("Escolha um arquivo .csv (no Excel: Salvar como → CSV UTF-8).");
      return;
    }
    if (selecionado.size === 0) {
      setErroArquivo("O arquivo está vazio.");
      return;
    }
    setArquivo(selecionado);
    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = analisarCsv(String(leitor.result ?? ""));
      if (resultado.vazio) setErroArquivo("O arquivo não tem conteúdo.");
      setAnalise(resultado);
    };
    leitor.onerror = () => setErroArquivo("Não foi possível ler o arquivo.");
    leitor.readAsText(selecionado, "UTF-8");
  }

  function handleInput(event) {
    escolher(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setArrastando(false);
    if (!enviando) escolher(event.dataTransfer.files?.[0]);
  }

  async function handleImportar() {
    if (!arquivo || enviando) return;
    setEnviando(true);
    setErroEnvio("");
    try {
      const resposta = await importarAlunos(turma.id, arquivo);
      setRelatorio(resposta ?? { totalLinhas: 0, criados: 0, atualizados: 0, erros: [] });
      if ((resposta?.criados ?? 0) + (resposta?.atualizados ?? 0) > 0) onImportou?.();
    } catch (error) {
      if (onNaoAutenticado?.(error)) return;
      setErroEnvio(
        error.status === 403 ? "Somente o Setor de Apoio e administradores podem importar alunos." : error.message,
      );
    } finally {
      setEnviando(false);
    }
  }

  if (relatorio) {
    return <Relatorio relatorio={relatorio} onOutro={limpar} onVerAlunos={onVoltar} />;
  }

  const bloqueado = !arquivo || !analise || analise.vazio || analise.faltando?.length > 0 || analise.totalLinhas === 0;

  return (
    <div className="importacao">
      <section className="importacao__instrucoes" aria-labelledby="importacao-formato">
        <div className="importacao__instrucoes-topo">
          <h3 id="importacao-formato">Formato do arquivo</h3>
          <a className="importacao__modelo" href={MODELO_CSV} download="modelo-importacao-alunos.csv">
            Baixar modelo CSV
          </a>
        </div>
        <ul>
          <li>
            Primeira linha com o cabeçalho. Obrigatórias:{" "}
            {COLUNAS_OBRIGATORIAS.map((c) => (
              <code key={c}>{c}</code>
            ))}
          </li>
          <li>
            Opcionais:{" "}
            {COLUNAS_OPCIONAIS.map((c) => (
              <code key={c}>{c}</code>
            ))}
          </li>
          <li>
            Separador <code>;</code> ou <code>,</code>, codificação <strong>UTF-8</strong> (no Excel: “CSV UTF-8”).
          </li>
          <li>
            Datas em <code>dd/MM/aaaa</code> ou <code>aaaa-MM-dd</code>.
          </li>
          <li>
            Os alunos são matriculados na turma <strong>{turma.nome}</strong>. Quem já existe (mesmo CPF) tem a ficha atualizada.
          </li>
        </ul>
      </section>

      <div
        className={`importacao__area${arrastando ? " importacao__area--arrastando" : ""}${arquivo ? " importacao__area--com-arquivo" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={handleDrop}
      >
        {arquivo ? (
          <div className="importacao__arquivo">
            <span className="importacao__arquivo-nome">{arquivo.name}</span>
            <span className="importacao__arquivo-info">
              {tamanho(arquivo.size)}
              {analise && !analise.vazio && ` · ${numero(analise.totalLinhas)} ${analise.totalLinhas === 1 ? "aluno" : "alunos"} · separador “${analise.separador}”`}
            </span>
            <button type="button" className="importacao__trocar" onClick={() => inputRef.current?.click()} disabled={enviando}>
              Trocar arquivo
            </button>
          </div>
        ) : (
          <>
            <p className="importacao__area-texto">Arraste o arquivo CSV para cá</p>
            <p className="importacao__area-ou">ou</p>
            <button type="button" className="importacao__botao importacao__botao--secundario" onClick={() => inputRef.current?.click()}>
              Escolher arquivo
            </button>
          </>
        )}
        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={handleInput} />
      </div>

      {erroArquivo && (
        <p className="importacao__aviso importacao__aviso--erro" role="alert">
          {erroArquivo}
        </p>
      )}

      {analise && !analise.vazio && (
        <>
          {analise.faltando.length > 0 && (
            <p className="importacao__aviso importacao__aviso--erro" role="alert">
              Faltam colunas obrigatórias no cabeçalho: {analise.faltando.map((c) => `“${c}”`).join(", ")}.
            </p>
          )}
          {analise.totalLinhas === 0 && analise.faltando.length === 0 && (
            <p className="importacao__aviso importacao__aviso--erro" role="alert">
              O arquivo só tem o cabeçalho, sem nenhum aluno.
            </p>
          )}
          {analise.desconhecidas.length > 0 && (
            <p className="importacao__aviso importacao__aviso--info">
              Colunas que não fazem parte do modelo e devem ser ignoradas: {analise.desconhecidas.map((c) => `“${c}”`).join(", ")}.
            </p>
          )}
          {analise.suspeitaCodificacao && (
            <p className="importacao__aviso importacao__aviso--info">
              O arquivo não parece estar em UTF-8 e os acentos podem ficar errados. No Excel, salve como “CSV UTF-8”.
            </p>
          )}

          {analise.amostra.length > 0 && (
            <div className="importacao__previa">
              <h4>
                Prévia{analise.totalLinhas > analise.amostra.length ? ` (primeiras ${analise.amostra.length} de ${numero(analise.totalLinhas)} linhas)` : ""}
              </h4>
              <div className="importacao__tabela-area">
                <table className="importacao__tabela">
                  <thead>
                    <tr>
                      {analise.cabecalho.map((coluna, i) => (
                        <th key={`${coluna}-${i}`} scope="col" className={COLUNAS_OBRIGATORIAS.includes(coluna) ? "importacao__coluna--obrigatoria" : ""}>
                          {coluna || "(vazia)"}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analise.amostra.map((linha, i) => (
                      <tr key={i}>
                        {analise.cabecalho.map((_, j) => (
                          <td key={j}>{linha[j] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {erroEnvio && (
        <p className="importacao__aviso importacao__aviso--erro" role="alert">
          Não foi possível importar: {erroEnvio}
        </p>
      )}

      <div className="importacao__acoes">
        <button type="button" className="importacao__botao importacao__botao--secundario" onClick={onVoltar} disabled={enviando}>
          Cancelar
        </button>
        <button type="button" className="importacao__botao" onClick={handleImportar} disabled={bloqueado || enviando} aria-busy={enviando || undefined}>
          {enviando ? "Importando..." : analise?.totalLinhas ? `Importar ${numero(analise.totalLinhas)} ${analise.totalLinhas === 1 ? "aluno" : "alunos"}` : "Importar"}
        </button>
      </div>
    </div>
  );
}
