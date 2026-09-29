/*
 * Portable Text -> HTML.
 *
 * Escrito a mao, e nao com @portabletext/to-html, por duas razoes: a
 * biblioteca traria uma arvore de dependencias inteira para um site que hoje
 * nao tem nenhuma, e os blocos que importam aqui (card de titulo, lista
 * ranqueada, embed do YouTube) sao todos nossos — teriam de ser escritos de
 * qualquer jeito.
 */
import { imagem } from "./sanity.mjs";

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* Marcas (negrito, italico, link) sao intervalos sobre os spans, nao
   aninhamento. Abrimos e fechamos por span, que e como o Portable Text
   descreve, e aceita sobreposicao sem gerar HTML invalido. */
function spans(filhos, defs = []) {
  const porChave = {};
  defs.forEach(d => { porChave[d._key] = d; });

  return (filhos || []).map(f => {
    if (f._type !== "span") return "";
    let html = esc(f.text).replace(/\n/g, "<br>");
    for (const m of (f.marks || []).slice().reverse()) {
      if (m === "strong") html = `<strong>${html}</strong>`;
      else if (m === "em") html = `<em>${html}</em>`;
      else if (m === "underline") html = `<u>${html}</u>`;
      else if (porChave[m]) {
        const d = porChave[m];
        if (d._type === "link" && d.href) {
          const alvo = d.externo ? ` target="_blank" rel="noopener noreferrer"` : "";
          html = `<a href="${esc(d.href)}"${alvo}>${html}</a>`;
        } else if (d._type === "linkTitulo" && d.titulo && d.titulo.tmdbId) {
          const t = d.titulo;
          html = `<a href="titulo.html?type=${esc(t.mediaType || "movie")}&id=${esc(t.tmdbId)}">${html}</a>`;
        }
      }
    }
    return html;
  }).join("");
}

function bloco(b) {
  const conteudo = spans(b.children, b.markDefs);
  if (b.listItem) return `<li>${conteudo}</li>`;
  switch (b.style) {
    case "h2": return `<h2>${conteudo}</h2>`;
    case "h3": return `<h3>${conteudo}</h3>`;
    case "blockquote": return `<blockquote>${conteudo}</blockquote>`;
    default: return `<p>${conteudo}</p>`;
  }
}

/* O card do titulo sai do build como uma casca com o id do TMDb. Quem preenche
   poster, nota e onde assistir e o artigo.js, no cliente — um artigo publicado
   em marco nao pode afirmar em setembro que o filme esta na Netflix. */
function cardTitulo(b) {
  const t = b.titulo || {};
  if (!t.tmdbId) return "";
  const nota = b.notaEditorial
    ? `<p class="card-titulo-nota">${esc(b.notaEditorial)}</p>` : "";
  return `
<aside class="card-titulo ${b.variante === "inline" ? "inline" : "destaque"}"
       data-tmdb-id="${esc(t.tmdbId)}" data-tipo="${esc(t.mediaType || "movie")}">
  <div class="card-titulo-poster" aria-hidden="true"></div>
  <div class="card-titulo-corpo">
    <p class="card-titulo-rotulo">Na ficha do Planeta Flix</p>
    <h3 class="card-titulo-nome">${esc(t.rotulo || "Carregando…")}</h3>
    <p class="card-titulo-meta"></p>
    ${nota}
    <p class="card-titulo-onde"></p>
    <a class="card-titulo-link" href="titulo.html?type=${esc(t.mediaType || "movie")}&id=${esc(t.tmdbId)}">Ver ficha completa ›</a>
  </div>
</aside>`;
}

function listaRanqueada(b) {
  const itens = (b.itens || []);
  const total = itens.length;
  const linhas = itens.map((it, i) => {
    const pos = b.ordemCrescente ? total - i : i + 1;
    const t = it.titulo || {};
    const nome = it.rotulo || t.rotulo || "";
    const cabeca = t.tmdbId
      ? `<a href="titulo.html?type=${esc(t.mediaType || "movie")}&id=${esc(t.tmdbId)}">${esc(nome)}</a>`
      : esc(nome);
    const texto = (it.texto || []).map(bloco).join("");
    return `<li class="item-lista"><span class="item-pos">${pos}</span>
      <div><h3 class="item-nome">${cabeca}</h3>${texto}</div></li>`;
  }).join("");
  return `<ol class="lista-ranqueada">${linhas}</ol>`;
}

/* Aceita watch, shorts e youtu.be — os tres formatos que o editor pode colar. */
function idDoYoutube(url) {
  const m = String(url || "").match(/(?:v=|shorts\/|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function videoYoutube(b) {
  const id = idDoYoutube(b.url);
  if (!id) return "";
  const inicio = b.inicioSegundos ? `?start=${b.inicioSegundos}` : "";
  const legenda = b.legenda ? `<figcaption>${esc(b.legenda)}</figcaption>` : "";
  // loading=lazy porque um artigo com tres videos carregaria tres players
  // antes do primeiro paragrafo aparecer.
  return `<figure class="video-yt">
  <iframe src="https://www.youtube-nocookie.com/embed/${id}${inicio}"
          title="${esc(b.legenda || "Vídeo")}" loading="lazy" allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"></iframe>
  ${legenda}</figure>`;
}

function imagemLegenda(b) {
  if (!b.url) return "";
  const rel = b.dim && b.dim.aspectRatio ? ` style="aspect-ratio:${b.dim.aspectRatio}"` : "";
  const pe = [b.legenda, b.credito && `<span class="credito">${esc(b.credito)}</span>`]
    .filter(Boolean);
  const cap = pe.length ? `<figcaption>${esc(b.legenda || "")}${b.credito ? ` <span class="credito">${esc(b.credito)}</span>` : ""}</figcaption>` : "";
  return `<figure class="img-artigo">
  <img src="${esc(imagem(b.url, 1200))}" alt="${esc(b.alt || "")}" loading="lazy"${rel}>
  ${cap}</figure>`;
}

function citacao(b) {
  const quem = [b.autor, b.contexto].filter(Boolean).map(esc).join(" · ");
  return `<blockquote class="citacao"><p>${esc(b.texto)}</p>${quem ? `<cite>${quem}</cite>` : ""}</blockquote>`;
}

/* Blocos de lista chegam soltos, um por item; o HTML precisa de <ul>/<ol>
   em volta dos consecutivos. */
export function corpoParaHtml(corpo = []) {
  const saida = [];
  let lista = null;

  const fecharLista = () => {
    if (!lista) return;
    saida.push(`<${lista.tag}>${lista.itens.join("")}</${lista.tag}>`);
    lista = null;
  };

  for (const b of corpo) {
    if (b._type === "block" && b.listItem) {
      const tag = b.listItem === "number" ? "ol" : "ul";
      if (!lista || lista.tag !== tag) { fecharLista(); lista = { tag, itens: [] }; }
      lista.itens.push(bloco(b));
      continue;
    }
    fecharLista();
    if (b._type === "block") saida.push(bloco(b));
    else if (b._type === "cardTitulo") saida.push(cardTitulo(b));
    else if (b._type === "imagemLegenda") saida.push(imagemLegenda(b));
    else if (b._type === "videoYoutube") saida.push(videoYoutube(b));
    else if (b._type === "listaRanqueada") saida.push(listaRanqueada(b));
    else if (b._type === "citacao") saida.push(citacao(b));
  }
  fecharLista();
  return saida.join("\n");
}

export { esc };
