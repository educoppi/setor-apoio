import { useRef, useState } from "react";
import { FOTO_PADRAO_CAMINHO, TIPOS_IMAGEM_ACEITOS } from "../../services/imagens";
import "./FotoAluno.css";

// Foto clicável: abre o explorador de arquivos e devolve o arquivo escolhido.
// Sem `src`, ou se a imagem não carregar, mostra a imagem padrão.
export default function FotoAluno({ src, onSelecionar, desabilitado = false, erro }) {
  const inputRef = useRef(null);
  const [srcComFalha, setSrcComFalha] = useState(null);
  const exibir = src && src !== srcComFalha ? src : FOTO_PADRAO_CAMINHO;
  const temFoto = exibir !== FOTO_PADRAO_CAMINHO;

  function handleChange(event) {
    const [arquivo] = event.target.files;
    // Limpa o input para permitir escolher o mesmo arquivo de novo.
    event.target.value = "";
    if (arquivo) onSelecionar(arquivo);
  }

  return (
    <div className="foto-aluno">
      <button
        type="button"
        className="foto-aluno__botao"
        onClick={() => inputRef.current?.click()}
        disabled={desabilitado}
        aria-label={temFoto ? "Trocar foto do aluno" : "Selecionar foto do aluno"}
        aria-describedby={erro ? "foto-aluno-erro" : undefined}
      >
        <img
          className="foto-aluno__imagem"
          src={exibir}
          alt={temFoto ? "Foto do aluno" : "Aluno sem foto"}
          onError={() => src && setSrcComFalha(src)}
        />
        {!desabilitado && (
          <span className="foto-aluno__acao" aria-hidden="true">
            {temFoto ? "Trocar foto" : "Adicionar foto"}
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        className="foto-aluno__input"
        type="file"
        accept={TIPOS_IMAGEM_ACEITOS.join(",")}
        onChange={handleChange}
        tabIndex={-1}
        aria-hidden="true"
      />

      {erro && (
        <p id="foto-aluno-erro" className="foto-aluno__erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
