/*
 * PLANETA FLIX — Camada de serviço
 * Decide, de forma transparente para as páginas, se os dados vêm do TMDb/OMDb
 * (modo real) ou do catálogo de exemplo (modo demonstração). As páginas
 * (index.html, titulo.html, pessoa.html) só chamam as funções abaixo — nunca
 * tmdb.js/omdb.js ou data.js diretamente. Isso permite ligar as APIs reais
 * editando só o config.js.
 */

function isDemoMode() {
  return !tmdbEnabled();
}

/* ---------- Home em blocos ---------- */

const ITENS_POR_BLOCO = 12;

/* Intercala filme e série em vez de concatenar: sem isso o bloco inteiro
   viraria filme, porque a lista de filmes chega primeiro e já preenche o
   limite sozinha. */
function intercalar(a, b) {
  const saida = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) saida.push(a[i]);
    if (b[i]) saida.push(b[i]);
  }
  return saida;
}

/* Os blocos são janelas sobre o mesmo acervo, não gavetas: um filme com
   lançamento digital recente e estreia mundial antiga cabe em Lançamentos e
   em Catálogo ao mesmo tempo (Toy Story 5 é exatamente esse caso). Guardamos
   o que já foi mostrado para o título aparecer uma vez só, no bloco mais alto
   da página — por isso app.js carrega os blocos em ordem, um de cada vez. */
const jaExibidos = new Set();
const chaveTitulo = t => `${t.mediaType}-${t.id}`;

async function svcBlocoHome(bloco) {
  if (isDemoMode()) return blocoMock(bloco);
  try {
    const [filmes, series] = await Promise.all([
      tmdbBlocoHome(bloco, "movie"),
      tmdbBlocoHome(bloco, "tv"),
    ]);
    // Sem cartaz o card vira um retângulo escuro com o nome — comum em títulos
    // ainda não lançados, que é justamente o bloco "Em breve".
    const escolhidos = intercalar(filmes, series)
      .filter(t => t.poster)
      .filter(t => !jaExibidos.has(chaveTitulo(t)))
      .slice(0, ITENS_POR_BLOCO);
    // Só o que de fato entrou na tela é marcado: o que sobrou da fatia ainda
    // pode aparecer num bloco de baixo.
    escolhidos.forEach(t => jaExibidos.add(chaveTitulo(t)));
    return escolhidos;
  } catch (e) {
    console.warn(`TMDb indisponível no bloco "${bloco}", usando catálogo de exemplo.`, e);
    return blocoMock(bloco);
  }
}

/* O catálogo de exemplo guarda só o ano, não a data de lançamento, então no
   modo demonstração os blocos são fatias fixas do mock: servem para conferir o
   layout, não a regra de cada bloco. */
function blocoMock(bloco) {
  const ordem = { lancamentos: 0, comentados: 1, embreve: 2, catalogo: 3 };
  const i = ordem[bloco] !== undefined ? ordem[bloco] : 0;
  const tam = Math.max(2, Math.ceil(MOCK_TITLES.length / 4));
  return MOCK_TITLES.slice(i * tam, i * tam + tam).map(t => ({ ...t, poster: null }));
}

async function svcSearch(query) {
  if (isDemoMode()) return searchMock(query);
  try {
    return await tmdbSearch(query);
  } catch (e) {
    console.warn("TMDb indisponível, buscando no catálogo de exemplo.", e);
    return searchMock(query);
  }
}

async function svcTitleDetails(mediaType, id) {
  if (isDemoMode() || mediaType === "mock") {
    const t = findMockTitleById(id);
    if (!t) return null;
    return { ...t, poster: null, backdrop: null };
  }
  try {
    const details = await tmdbTitleDetails(mediaType, id);
    if (omdbEnabled() && details.imdbId) {
      const ratings = await omdbRatingsByImdbId(details.imdbId);
      details.imdbRating = ratings.imdbRating;
      details.rtRating = ratings.rtRating;
    } else {
      details.imdbRating = null;
      details.rtRating = null;
    }
    return details;
  } catch (e) {
    console.warn("Não foi possível carregar do TMDb, tentando catálogo de exemplo.", e);
    const t = findMockTitleById(id);
    return t ? { ...t, poster: null, backdrop: null } : null;
  }
}

/* Ficha de pessoa (ator, diretor, roteirista...) usada por pessoa.html. No modo
   demonstração, a filmografia é montada a partir dos filmoIds do catálogo mock. */
async function svcPersonDetails(id) {
  if (isDemoMode()) {
    return mockPersonDetails(id);
  }
  try {
    const details = await tmdbPersonDetails(id);
    if (!details) return mockPersonDetails(id);
    return details;
  } catch (e) {
    console.warn("Não foi possível carregar do TMDb, tentando catálogo de exemplo.", e);
    return mockPersonDetails(id);
  }
}

function mockPersonDetails(id) {
  const p = findMockPersonById(id);
  if (!p) return null;
  const filmography = (p.filmoIds || [])
    .map(fid => findMockTitleById(fid))
    .filter(Boolean)
    .map(t => ({ ...t, poster: null }));
  return { ...p, photo: null, bio: "", filmography };
}

/* ---------- Descoberta ("Me ajuda a escolher") ---------- */

/* No modo demonstração não há lista de serviços: a tela esconde esse filtro
   em vez de mostrar chips que não filtram nada. */
async function svcWatchProviders(mediaType) {
  if (isDemoMode()) return [];
  try {
    return await tmdbWatchProviders(mediaType);
  } catch (e) {
    console.warn("Não foi possível carregar os serviços de streaming.", e);
    return [];
  }
}

async function svcGenres(mediaType) {
  if (isDemoMode()) return mockGenres();
  try {
    return await tmdbGenres(mediaType);
  } catch (e) {
    console.warn("Não foi possível carregar os gêneros, usando catálogo de exemplo.", e);
    return mockGenres();
  }
}

async function svcDiscover(filters) {
  if (isDemoMode()) return discoverMock(filters);
  try {
    return await tmdbDiscover(filters);
  } catch (e) {
    console.warn("TMDb indisponível, filtrando o catálogo de exemplo.", e);
    return discoverMock(filters);
  }
}

/* No mock o "id" do gênero é o próprio nome — o catálogo de exemplo guarda
   gêneros como texto, não como id numérico do TMDb. */
function mockGenres() {
  const names = new Set();
  MOCK_TITLES.forEach(t => (t.genres || []).forEach(g => names.add(g)));
  return [...names].sort().map(n => ({ id: n, name: n }));
}

/* O catálogo de exemplo não guarda país de produção, então o filtro de origem
   não se aplica no modo demonstração — só com o TMDb ligado. */
function discoverMock({ mediaType = "movie", genre = "" } = {}) {
  const results = MOCK_TITLES
    .filter(t => t.mediaType === mediaType)
    .filter(t => !genre || (t.genres || []).includes(genre))
    .map(t => ({ ...t, poster: null }));
  return { results, totalPages: 1, totalResults: results.length };
}

function letterboxdUrl(slug) {
  return slug ? `https://letterboxd.com/film/${slug}/` : "https://letterboxd.com/";
}
