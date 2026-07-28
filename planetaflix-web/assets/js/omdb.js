/*
 * PLANETA FLIX — Integração com a OMDb API
 * Documentação: https://www.omdbapi.com/
 * Usada como fonte secundária de notas (IMDb e, quando disponível, Rotten Tomatoes),
 * evitando o custo de licenciamento direto dessas fontes (ver seção 6 do roadmap).
 */
const OMDB_BASE = "https://www.omdbapi.com/";

function omdbEnabled() {
  return Boolean(CONFIG.OMDB_KEY && CONFIG.OMDB_KEY.trim());
}

/** Busca notas por IMDb ID (mais confiável que buscar por título). */
async function omdbRatingsByImdbId(imdbId) {
  if (!omdbEnabled() || !imdbId) return { imdbRating: null, rtRating: null };
  const url = new URL(OMDB_BASE);
  url.searchParams.set("apikey", CONFIG.OMDB_KEY);
  url.searchParams.set("i", imdbId);
  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.Response === "False") return { imdbRating: null, rtRating: null };
    const ratings = data.Ratings || [];
    const rt = ratings.find(r => r.Source === "Rotten Tomatoes");
    return {
      imdbRating: data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : null,
      rtRating: rt ? rt.Value : null,
    };
  } catch (e) {
    console.warn("OMDb indisponível, seguindo sem notas adicionais.", e);
    return { imdbRating: null, rtRating: null };
  }
}
