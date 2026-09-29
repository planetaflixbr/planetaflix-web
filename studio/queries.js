/**
 * Consultas GROQ usadas pelo build estatico. Sem token: o dataset e publico.
 * Endpoint: https://sku1yl2b.apicdn.sanity.io/v2025-02-19/data/query/production?query=...
 */

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

/** Todos os artigos publicados, para gerar as paginas no build. */
export const TODOS_ARTIGOS = `
*[_type == "artigo" && !(_id in path("drafts.**")) && publicadoEm <= now()]
  | order(publicadoEm desc) {
    _id,
    _updatedAt,
    ${CAMPOS_CARD},
    atualizadoEm,
    destaque,
    tags,
    seo,
    "capaCredito": capa.credito,
    "capaLegenda": capa.legenda,
    corpo[]{
      ...,
      _type == "imagemLegenda" => { "url": asset->url, "dim": asset->metadata.dimensions, alt, legenda, credito },
      _type == "listaRanqueada" => { ordemCrescente, itens[]{ rotulo, titulo, texto } }
    },
    "tmdbIds": array::unique(
      titulosRelacionados[].tmdbId +
      corpo[_type == "cardTitulo"].titulo.tmdbId +
      corpo[_type == "listaRanqueada"].itens[].titulo.tmdbId
    )
  }
`;

/** Home editorial: destaque + ultimos. */
export const HOME_EDITORIAL = `
{
  "destaques": *[_type == "artigo" && !(_id in path("drafts.**")) && destaque == true && publicadoEm <= now()]
    | order(publicadoEm desc)[0...3] { ${CAMPOS_CARD} },
  "ultimos": *[_type == "artigo" && !(_id in path("drafts.**")) && publicadoEm <= now()]
    | order(publicadoEm desc)[0...12] { ${CAMPOS_CARD} }
}
`;

/** Artigos que citam um titulo — alimenta o bloco "Leia sobre" na ficha. */
export const ARTIGOS_POR_TITULO = `
*[_type == "artigo" && !(_id in path("drafts.**")) && publicadoEm <= now() &&
  ($tmdbId in titulosRelacionados[].tmdbId ||
   $tmdbId in corpo[_type == "cardTitulo"].titulo.tmdbId)]
  | order(publicadoEm desc)[0...4] { ${CAMPOS_CARD} }
`;

export const ARTIGOS_POR_EDITORIA = `
*[_type == "artigo" && !(_id in path("drafts.**")) && publicadoEm <= now() &&
  $slug in categorias[]->slug.current]
  | order(publicadoEm desc) { ${CAMPOS_CARD} }
`;
