import { API_URL, request } from "./api";

export const TIPOS_IMAGEM_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
export const TAMANHO_MAXIMO_IMAGEM = 10 * 1024 * 1024; // limite do POST /imagens

// Imagem padrão servida pelo próprio front (public/). Como `fotoUrl` precisa ser
// um link http(s), a referência gravada é o endereço absoluto deste arquivo.
export const FOTO_PADRAO_CAMINHO = "/aluno-sem-foto.svg";

export function fotoPadraoUrl() {
  return `${window.location.origin}${FOTO_PADRAO_CAMINHO}`;
}

export function validarArquivoImagem(arquivo) {
  if (!TIPOS_IMAGEM_ACEITOS.includes(arquivo.type)) {
    return "Formato não suportado. Use PNG, JPG/JPEG ou WebP.";
  }
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) return "A imagem deve ter no máximo 10 MB.";
  return "";
}

// Envia o arquivo ao armazenamento de imagens da API e devolve o link como veio
// (relativo: /api/v1/imagens/<hash>.jpg). É o formato aceito em `imagens` da ocorrência.
export async function enviarImagemRelativa(arquivo) {
  const dados = new FormData();
  dados.append("arquivo", arquivo);
  const { url } = await request("/api/v1/imagens", { method: "POST", body: dados });
  return url;
}

// Mesma coisa, mas `fotoUrl` do aluno exige http(s): o link vira absoluto com o endereço da API.
export async function enviarImagem(arquivo) {
  const url = await enviarImagemRelativa(arquivo);
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}
