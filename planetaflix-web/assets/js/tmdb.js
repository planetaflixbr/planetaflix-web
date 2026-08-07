/*
 * PLANETA FLIX — Integração com o TMDb (The Movie Database)
 * Documentação: https://developer.themoviedb.org/reference/intro/getting-started
 * Todas as funções aqui usam CONFIG.TMDB_KEY (definida em config.js).
 */
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";

function tmdbEnabled() {
  return Boolean(CONFIG.TMDB_KEY && CONFIG.TMDB_KEY.trim());
}

async function tmdbFetch(path, params = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", CONFIG.TMDB_KEY);
  url.searchParams.set("language", CONFIG.TMDB_LANGUAGE || "pt-BR");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("TMDb error " + res.status);
  return res.json();
}

/** Trending da semana (filmes + séries) para a home. */
async function tmdbTrending() {
  const data = await tmdbFetch("/trending/all/week");
  return (data.results || []).map(mapTmdbSummary);
}

/** Busca multi (filme, série e pessoa) pelo termo digitado. */
async function tmdbSearch(query) {
  const data = await tmdbFetch("/search/multi", { query, include_adult: "false" });
  const results = data.results || [];
  return {
    titles: results.filter(r => r.media_type === "movie" || r.media_type === "tv").map(mapTmdbSummary),
    people: results.filter(r => r.media_type === "person").map(mapTmdbPerson),
  };
}

/** Detalhe completo de um título: metadata + elenco + onde assistir + classificação indicativa + external_ids. */
/* Cores oficiais de marca dos principais serviços de streaming no Brasil —
   usadas como fallback quando o logo do provedor (TMDb) não carrega, e como
   acento visual junto ao logo. Provedor fora da lista cai no turquesa da marca. */
const PROVIDER_COLORS = {
  "Netflix": "#e50914",
  "Amazon Prime Video": "#00a8e1",
  "Max": "#4c2fc9",
  "HBO Max": "#4c2fc9",
  "Disney Plus": "#113ccf",
  "Disney+": "#113ccf",
  "Star Plus": "#0b0b0b",
  "Star+": "#0b0b0b",
  "Apple TV Plus": "#000000",
  "Apple TV+": "#000000",
  "Apple TV": "#000000",
  "Paramount Plus": "#0064ff",
  "Paramount+": "#0064ff",
  "Globoplay": "#ff6600",
  "Telecine": "#c8102e",
  "Telecine Play": "#c8102e",
  "Looke": "#ffcc00",
  "MUBI": "#000000",
  "Claro video": "#d90007",
  "YouTube": "#ff0000",
  "Google Play Movies": "#4285f4",
};

function providerColor(name) {
  return PROVIDER_COLORS[name] || "#1e858d";
}

async function tmdbTitleDetails(mediaType, id) {
  // release_dates só existe em /movie, content_ratings só existe em /tv — cada tipo pede o seu.
  const ratingsAppend = mediaType === "tv" ? "content_ratings" : "release_dates";
  const data = await tmdbFetch(`/${mediaType}/${id}`, {
    append_to_response: `credits,watch/providers,external_ids,${ratingsAppend}`,
  });
  const providers = (data["watch/providers"] && data["watch/providers"].results && data["watch/providers"].results[CONFIG.WATCH_REGION]) || {};
  const flatrate = providers.flatrate || [];
  const rent = providers.rent || [];
  // Logo real do provedor (asset do TMDb) + cor oficial de marca como acento/fallback.
  const where = (flatrate.length ? flatrate : rent).map(p => [
    p.provider_name,
    providerColor(p.provider_name),
    p.logo_path ? TMDB_IMG_BASE.replace("w500", "w92") + p.logo_path : null,
  ]);
  // Link para a página de disponibilidade no TMDb (fonte dos dados: parceria TMDb + JustWatch).
  // Atribuição ao JustWatch é exigida pelos termos da API — ver seção "Onde assistir" em titulo.js.
  const whereLink = providers.link || null;

  const crew = (data.credits && data.credits.crew || []).filter(c => ["Director", "Screenplay", "Writer"].includes(c.job)).slice(0, 3);
  const cast = (data.credits && data.credits.cast || []).slice(0, 6);
  const combined = [
    ...crew.map(c => [c.name, c.job === "Director" ? "Direção" : "Roteiro"]),
    ...cast.map(c => [c.name, "Elenco"]),
  ];

  const ageRating = mediaType === "tv"
    ? extractTvAgeRating(data.content_ratings)
    : extractMovieAgeRating(data.release_dates);

  return {
    id: String(data.id),
    mediaType,
    title: data.title || data.name,
    year: (data.release_date || data.first_air_date || "").slice(0, 4),
    genres: (data.genres || []).map(g => g.name),
    runtime: data.runtime ? `${data.runtime}min` : (data.episode_run_time && data.episode_run_time[0] ? `${data.episode_run_time[0]}min/ep` : "Série"),
    ageRating,
    poster: data.poster_path ? TMDB_IMG_BASE + data.poster_path : null,
    backdrop: data.backdrop_path ? TMDB_IMG_BASE.replace("w500", "w1280") + data.backdrop_path : null,
    synopsis: data.overview || "Sinopse não disponível.",
    where,
    whereLink,
    cast: combined,
    imdbId: data.external_ids ? data.external_ids.imdb_id : null,
    // Letterboxd usa majoritariamente o título original (em inglês) no slug —
    // por isso usamos original_title/original_name aqui, não o título em pt-BR.
    // É um "melhor palpite" enquanto não temos a API própria do Letterboxd (ver seção 6 do roadmap);
    // pode não resolver para todo título, mas acerta a maioria dos lançamentos internacionais.
    letterboxdSlug: slugify(data.original_title || data.original_name || data.title || data.name, data.release_date || data.first_air_date),
  };
}

/** Primeira certificação não-vazia dentro de um país (release_dates de /movie). */
function pickCertification(countryEntry) {
  if (!countryEntry || !countryEntry.release_dates) return "";
  const withCert = countryEntry.release_dates.find(rd => rd.certification);
  return withCert ? withCert.certification : "";
}

/** Classificação indicativa de filme: prioriza o Brasil (ClassInd), cai para os EUA se faltar. */
function extractMovieAgeRating(releaseDates) {
  if (!releaseDates || !releaseDates.results) return "";
  const br = releaseDates.results.find(r => r.iso_3166_1 === "BR");
  const brCert = pickCertification(br);
  if (brCert) return brCert === "L" ? "Livre" : `${brCert} anos`;
  const us = releaseDates.results.find(r => r.iso_3166_1 === "US");
  return pickCertification(us) || "";
}

/** Classificação indicativa de série: prioriza o Brasil (ClassInd), cai para os EUA se faltar. */
function extractTvAgeRating(contentRatings) {
  if (!contentRatings || !contentRatings.results) return "";
  const br = contentRatings.results.find(r => r.iso_3166_1 === "BR");
  if (br && br.rating) return br.rating === "L" ? "Livre" : `${br.rating} anos`;
  const us = contentRatings.results.find(r => r.iso_3166_1 === "US");
  return (us && us.rating) || "";
}

function mapTmdbSummary(r) {
  return {
    id: String(r.id),
    mediaType: r.media_type || (r.title ? "movie" : "tv"),
    title: r.title || r.name,
    year: (r.release_date || r.first_air_date || "").slice(0, 4),
    poster: r.poster_path ? TMDB_IMG_BASE + r.poster_path : null,
    bg: null,
  };
}
function mapTmdbPerson(r) {
  return { id: "p" + r.id, tmdbId: r.id, name: r.name, role: (r.known_for_department || ""), photo: r.profile_path ? TMDB_IMG_BASE + r.profile_path : null };
}

function slugify(title, dateStr) {
  if (!title) return "";
  const year = (dateStr || "").slice(0, 4);
  const base = title.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return year ? `${base}-${year}` : base;
}
