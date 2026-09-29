/*
 * Gera as paginas editoriais a partir do Sanity.
 *
 * Roda no build da Vercel, disparado pelo Deploy Hook que o webhook de
 * publicacao do Sanity chama. O texto sai como HTML de verdade — indexavel
 * pelo Google e com previa ao ser compartilhado —, e so o card de titulo
 * dentro do artigo hidrata no cliente.
 *
 * Saida:
 *   artigo/<slug>.html          uma pagina por artigo
 *   artigos.html                a home editorial
 *   data/artigos-por-titulo.json  indice tmdbId -> artigos, para o bloco
 *                                 "Leia sobre" na ficha do titulo
 */
import { writeFile, mkdir, rm } from "node:fs/promises";
import { buscarArtigos, imagem } from "./sanity.mjs";
import { corpoParaHtml, esc } from "./render.mjs";

const SITE = "https://www.planetaflix.com.br";
const FORMATOS = { noticia: "Notícia", lista: "Lista", critica: "Crítica", guia: "Guia" };

const data = (iso) => iso
  ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  : "";
const dataCurta = (iso) => iso
  ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
  : "";

function cabecalho(profundidade) {
  const r = profundidade ? "../" : "";
  return `<header class="site-header">
  <a href="${r}index.html" class="brand-row">
    <span class="brand brand-font">PLANETA <span>FLIX</span></span>
  </a>
  <nav>
    <a href="${r}artigos.html">Editorial</a>
    <a href="${r}descobrir.html" class="nav-destaque">Me ajuda a escolher</a>
    <a href="${r}favoritos.html">Favoritos</a>
  </nav>
</header>`;
}

function pagina({ titulo, descricao, corpo, canonical, og = {}, profundidade = 0, jsonLd = null, naoIndexar = false }) {
  const r = profundidade ? "../" : "";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
${naoIndexar ? '<meta name="robots" content="noindex">\n' : ""}<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${og.tipo || "website"}">
<meta property="og:title" content="${esc(og.titulo || titulo)}">
<meta property="og:description" content="${esc(og.descricao || descricao)}">
<meta property="og:url" content="${esc(canonical)}">
${og.imagem ? `<meta property="og:image" content="${esc(og.imagem)}">\n<meta name="twitter:card" content="summary_large_image">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poetsen+One&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${r}assets/css/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
</head>
<body>
${cabecalho(profundidade)}
${corpo}
<footer>Planeta Flix · MVL de Curadoria · Fase 1 de 3 (Curadoria → Analítica → Locadora)</footer>
<script src="${r}config.js"></script>
<script src="${r}assets/js/data.js"></script>
<script src="${r}assets/js/tmdb.js"></script>
<script src="${r}assets/js/omdb.js"></script>
<script src="${r}assets/js/titleService.js"></script>
<script src="${r}assets/js/artigo.js"></script>
</body>
</html>`;
}

function selos(categorias = []) {
  return categorias.map(c =>
    `<span class="selo selo-${esc(c.cor || "turquesa")}">${esc(c.nome)}</span>`).join("");
}

function cardArtigo(a, profundidade = 0) {
  const r = profundidade ? "../" : "";
  const capa = a.capa && a.capa.url
    ? `<img src="${esc(imagem(a.capa.url, 560, { altura: 315 }))}" alt="${esc(a.capa.alt || "")}" loading="lazy">`
    : `<div class="card-artigo-sem-capa" aria-hidden="true"></div>`;
  return `<a class="card-artigo" href="${r}artigo/${esc(a.slug)}.html">
  <div class="card-artigo-capa">${capa}</div>
  <div class="card-artigo-corpo">
    <p class="card-artigo-formato">${esc(FORMATOS[a.formato] || "")}</p>
    <h3>${esc(a.titulo)}</h3>
    <p class="card-artigo-chamada">${esc(a.chamada)}</p>
    <p class="card-artigo-pe">${esc((a.autor && a.autor.nome) || "")} · ${dataCurta(a.publicadoEm)}</p>
  </div>
</a>`;
}

function paginaArtigo(a) {
  const seo = a.seo || {};
  const titulo = seo.metaTitulo || a.titulo;
  const descricao = seo.metaDescricao || a.chamada;
  const canonical = `${SITE}/artigo/${a.slug}.html`;
  const imagemOg = a.seoImagem ? imagem(a.seoImagem, 1200, { altura: 630 })
                 : (a.capa && a.capa.url ? imagem(a.capa.url, 1200, { altura: 630 }) : null);

  const capa = a.capa && a.capa.url ? `
<figure class="artigo-capa">
  <img src="${esc(imagem(a.capa.url, 1400))}" alt="${esc(a.capa.alt || "")}">
  ${(a.capaLegenda || a.capaCredito) ? `<figcaption>${esc(a.capaLegenda || "")}${a.capaCredito ? ` <span class="credito">${esc(a.capaCredito)}</span>` : ""}</figcaption>` : ""}
</figure>` : "";

  const atualizado = a.atualizadoEm
    ? `<span class="artigo-atualizado">Atualizado em ${data(a.atualizadoEm)}</span>` : "";

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: a.titulo, description: a.chamada,
    datePublished: a.publicadoEm,
    ...(a.atualizadoEm ? { dateModified: a.atualizadoEm } : {}),
    ...(imagemOg ? { image: [imagemOg] } : {}),
    author: { "@type": "Person", name: (a.autor && a.autor.nome) || "Planeta Flix" },
    publisher: { "@type": "Organization", name: "Planeta Flix" },
    mainEntityOfPage: canonical,
  };

  const corpo = `
<article class="artigo">
  <div class="artigo-topo">
    <p class="artigo-trilha"><a href="../artigos.html">Editorial</a> › ${esc(FORMATOS[a.formato] || "")}</p>
    <div class="artigo-selos">${selos(a.categorias)}</div>
    <h1 class="brand-font">${esc(a.titulo)}</h1>
    <p class="artigo-chamada">${esc(a.chamada)}</p>
    <p class="artigo-assinatura">
      <strong>${esc((a.autor && a.autor.nome) || "Planeta Flix")}</strong>
      <time datetime="${esc(a.publicadoEm || "")}">${data(a.publicadoEm)}</time>
      ${atualizado}
    </p>
  </div>
  ${capa}
  <div class="artigo-corpo">
${corpoParaHtml(a.corpo)}
  </div>
</article>`;

  return pagina({
    titulo: `${titulo} — Planeta Flix`, descricao, corpo, canonical,
    og: { tipo: "article", titulo, descricao, imagem: imagemOg },
    profundidade: 1, jsonLd, naoIndexar: Boolean(seo.naoIndexar),
  });
}

function paginaIndice(artigos) {
  const destaque = artigos.find(a => a.destaque) || artigos[0];
  const resto = artigos.filter(a => a !== destaque);
  const corpo = `
<section class="hero hero-editorial">
  <h1 class="brand-font">Editorial</h1>
  <p>Notícias, listas, críticas e guias sobre o que dá para assistir agora.</p>
</section>
<main class="container">
  ${destaque ? `<div class="editorial-destaque">${cardArtigo(destaque)}</div>` : ""}
  ${resto.length ? `<div class="grid-artigos">${resto.map(a => cardArtigo(a)).join("")}</div>` : ""}
  ${artigos.length ? "" : `<div class="empty-state">Nenhum artigo publicado ainda.</div>`}
</main>`;
  return pagina({
    titulo: "Editorial — Planeta Flix",
    descricao: "Notícias, listas, críticas e guias sobre o que dá para assistir agora no Brasil.",
    corpo, canonical: `${SITE}/artigos.html`,
    og: { imagem: destaque && destaque.capa ? imagem(destaque.capa.url, 1200, { altura: 630 }) : null },
  });
}

/* Indice invertido: de qual titulo do TMDb cada artigo fala. E o que permite a
   ficha perguntar "quem falou de mim?" sem consultar o Sanity a cada visita. */
function indicePorTitulo(artigos) {
  const indice = {};
  for (const a of artigos) {
    const ids = new Set();
    (a.titulosRelacionados || []).forEach(t => t && t.tmdbId && ids.add(`${t.mediaType || "movie"}-${t.tmdbId}`));
    (a.corpo || []).forEach(b => {
      if (b._type === "cardTitulo" && b.titulo && b.titulo.tmdbId)
        ids.add(`${b.titulo.mediaType || "movie"}-${b.titulo.tmdbId}`);
      if (b._type === "listaRanqueada")
        (b.itens || []).forEach(i => i.titulo && i.titulo.tmdbId &&
          ids.add(`${i.titulo.mediaType || "movie"}-${i.titulo.tmdbId}`));
    });
    for (const chave of ids) {
      (indice[chave] = indice[chave] || []).push({
        slug: a.slug, titulo: a.titulo, formato: a.formato,
        publicadoEm: a.publicadoEm,
        capa: a.capa && a.capa.url ? imagem(a.capa.url, 320, { altura: 180 }) : null,
      });
    }
  }
  // no maximo 4 por titulo, do mais novo para o mais velho
  for (const k of Object.keys(indice)) {
    indice[k].sort((x, y) => String(y.publicadoEm).localeCompare(String(x.publicadoEm)));
    indice[k] = indice[k].slice(0, 4);
  }
  return indice;
}

const artigos = await buscarArtigos();

await rm("artigo", { recursive: true, force: true });
await mkdir("artigo", { recursive: true });
await mkdir("data", { recursive: true });

for (const a of artigos) {
  if (!a.slug) { console.warn(`Artigo sem slug ignorado: ${a.titulo}`); continue; }
  await writeFile(`artigo/${a.slug}.html`, paginaArtigo(a), "utf8");
}
await writeFile("artigos.html", paginaIndice(artigos), "utf8");
const indice = indicePorTitulo(artigos);
await writeFile("data/artigos-por-titulo.json", JSON.stringify(indice), "utf8");

console.log(`${artigos.length} artigo(s) gerado(s); ${Object.keys(indice).length} título(s) no índice.`);
