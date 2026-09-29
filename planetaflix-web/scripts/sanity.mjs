/*
 * Leitura do Sanity sem biblioteca: o dataset e publico, entao e um GET.
 * Zero dependencia significa nada de npm install no build da Vercel e nada
 * para manter atualizado.
 */
export const PROJETO = "sku1yl2b";
export const DATASET = "production";
export const API = "2025-02-19";

/* Os campos que todo card de artigo precisa — usados na home editorial,
   no bloco "Leia sobre" da ficha e no rodape do proprio artigo. */
const CAMPOS_CARD = `
  "slug": slug.current,
  titulo,
  chamada,
  formato,
  publicadoEm,
  "capa": { "url": capa.asset->url, "alt": capa.alt },
  "autor": autor->{ nome, "slug": slug.current },
  "categorias": categorias[]->{ nome, "slug": slug.current, cor }
`;

export const TODOS_ARTIGOS = `
*[_type == "artigo" && !(_id in path("drafts.**")) && publicadoEm <= now()]
  | order(publicadoEm desc) {
    _id, _updatedAt, atualizadoEm, destaque, tags, seo,
    ${CAMPOS_CARD},
    "capaLegenda": capa.legenda,
    "capaCredito": capa.credito,
    "seoImagem": seo.imagemCompartilhamento.asset->url,
    titulosRelacionados[]{ tmdbId, mediaType, rotulo },
    corpo[]{
      ...,
      _type == "imagemLegenda" => {
        "url": asset->url,
        "dim": asset->metadata.dimensions,
        alt, legenda, credito
      },
      _type == "listaRanqueada" => {
        ordemCrescente,
        itens[]{ rotulo, titulo, texto }
      }
    }
  }
`;

/* SANITY_BASE existe para os testes apontarem para um servidor local com
   conteudo de mentira, e para um dia trocar de dataset sem mexer no codigo. */
const BASE = process.env.SANITY_BASE
  || `https://${PROJETO}.apicdn.sanity.io/v${API}/data/query/${DATASET}`;

export async function buscarArtigos() {
  const url = `${BASE}?query=${encodeURIComponent(TODOS_ARTIGOS)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Sanity respondeu ${r.status}: ${await r.text()}`);
  const { result } = await r.json();
  return result || [];
}

/* O CDN de imagens do Sanity redimensiona por query string. Pedir o tamanho
   certo evita mandar um JPEG de 4000px para um card de 320. */
export function imagem(url, largura, { altura = null } = {}) {
  if (!url) return null;
  const p = new URLSearchParams({ w: String(largura), auto: "format", fit: "crop" });
  if (altura) p.set("h", String(altura));
  return `${url}?${p.toString()}`;
}
