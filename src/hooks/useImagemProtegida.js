import { useEffect, useState } from "react";
import { requestBlob } from "../services/api";

const PREFIXO_IMAGENS = "/api/v1/imagens/";

// As imagens enviadas à API exigem o token, então não dá para usar o link
// direto num <img>. Devolve o caminho relativo (passa pelo proxy) quando a URL
// aponta para o armazenamento de imagens da API; senão, null.
function caminhoProtegido(url) {
  if (!url) return null;
  try {
    const { pathname } = new URL(url, window.location.origin);
    return pathname.startsWith(PREFIXO_IMAGENS) ? pathname : null;
  } catch {
    return null;
  }
}

// Recebe a `fotoUrl` gravada e devolve algo que o <img> consegue exibir:
// - imagem da API: baixada com o token e exposta como blob: URL;
// - qualquer outro link (ex.: imagem padrão do front): o próprio link.
// Enquanto carrega, ou se falhar, devolve null.
export default function useImagemProtegida(url) {
  const caminho = caminhoProtegido(url);
  const [carregada, setCarregada] = useState({ caminho: null, src: null });

  useEffect(() => {
    if (!caminho) return undefined;
    let ativo = true;
    let objectUrl;

    requestBlob(caminho)
      .then((blob) => {
        if (!ativo) return;
        objectUrl = URL.createObjectURL(blob);
        setCarregada({ caminho, src: objectUrl });
      })
      .catch(() => {
        if (ativo) setCarregada({ caminho, src: null });
      });

    return () => {
      ativo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [caminho]);

  if (!url) return null;
  if (!caminho) return url;
  return carregada.caminho === caminho ? carregada.src : null;
}
