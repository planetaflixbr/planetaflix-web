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

async function svcTrending() {
  if (isDemoMode()) {
    return MOCK_TITLES.slice(0, 6).map(t => ({ ...t }));
  }
  try {
    return await tmdbTrending();
  } catch (e) {
    console.warn("TMDb indisponível, usando catálogo de exemplo.", e);
    return MOCK_TITLES.slice(0, 6).map(t => ({ ...t }));
  }
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
