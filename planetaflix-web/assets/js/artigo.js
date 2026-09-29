/*
 * PLANETA FLIX — hidratação dos cards de título dentro do artigo.
 *
 * O texto do artigo é HTML estático, gerado no build. Só o card de título
 * é preenchido aqui, no cliente: poster, nota e "onde assistir" mudam toda
 * semana, e um artigo publicado em março não pode afirmar em setembro que
 * o filme está na Netflix.
 */
function ondeAssistirTexto(t) {
  const onde = (t.where || []).map(w => Array.isArray(w) ? w[0] : w).filter(Boolean);
  if (!onde.length) return "Sem streaming por assinatura no Brasil agora.";
  if (onde.length <= 3) return `Disponível em ${onde.join(", ")}.`;
  return `Disponível em ${onde.slice(0, 3).join(", ")} e mais ${onde.length - 3}.`;
}

async function hidratarCard(card) {
  const id = card.dataset.tmdbId;
  const tipo = card.dataset.tipo || "movie";
  if (!id) return;

  try {
    const t = await svcTitleDetails(tipo, id);
    if (!t) throw new Error("título não encontrado");

    const nome = card.querySelector(".card-titulo-nome");
    if (nome) nome.textContent = t.title || nome.textContent;

    const poster = card.querySelector(".card-titulo-poster");
    if (poster && t.poster) {
      poster.style.backgroundImage = `url('${t.poster}')`;
      poster.classList.add("tem-poster");
    }

    const meta = card.querySelector(".card-titulo-meta");
    if (meta) {
      const paises = (t.countries || []).slice(0, 2).join(", ");
      meta.textContent = [t.year, paises, t.genres, t.runtime].filter(Boolean).join(" · ");
    }

    const onde = card.querySelector(".card-titulo-onde");
    if (onde) onde.textContent = ondeAssistirTexto(t);

    card.classList.add("hidratado");
  } catch (e) {
    // O card fica com o rótulo que o editor escreveu e o link para a ficha:
    // degrada para menos informação, nunca para um buraco no meio do texto.
    console.warn(`Não foi possível carregar o título ${tipo}/${id} do card.`, e);
    card.classList.add("sem-dados");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const cards = [...document.querySelectorAll(".card-titulo[data-tmdb-id]")];
  cards.forEach(hidratarCard);
});
