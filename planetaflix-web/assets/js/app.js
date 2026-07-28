/* PLANETA FLIX — Lógica da página inicial (index.html) */

function titleCardHtml(t) {
  const bg = t.poster ? `background-image:url('${t.poster}')` : `background:${t.bg || "linear-gradient(160deg,#2a4a48,#1e858d)"}`;
  const mediaType = t.mediaType || "movie";
  const idParam = t.id;
  return `
    <a class="title-card" href="titulo.html?type=${mediaType}&id=${encodeURIComponent(idParam)}" style="${bg}">
      ${t.year ? `<span class="badge-year">${t.year}</span>` : ""}
      <div class="overlay"><span>${t.title}</span></div>
    </a>
  `;
}

async function renderTrending() {
  const grid = document.getElementById("trending-grid");
  grid.innerHTML = `<div class="empty-state">Carregando títulos em alta…</div>`;
  const items = await svcTrending();
  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">Não foi possível carregar o catálogo agora.</div>`;
    return;
  }
  grid.innerHTML = items.map(titleCardHtml).join("");
}

function resultRowHtml(t) {
  const bg = t.poster ? `background-image:url('${t.poster}')` : `background:${t.bg || "#1e858d"}`;
  return `
    <a class="result-row" href="titulo.html?type=${t.mediaType || "movie"}&id=${encodeURIComponent(t.id)}">
      <div class="thumb" style="${bg}"></div>
      <div class="meta">
        <div class="t">${t.title}</div>
        <div class="s">${t.year || ""}${t.mediaType === "tv" ? " · Série" : t.mediaType ? " · Filme" : ""}</div>
      </div>
      <div class="arrow">›</div>
    </a>
  `;
}

async function runSearch(query) {
  const trendingSection = document.getElementById("trending-section");
  const resultsSection = document.getElementById("results-section");
  const resultsList = document.getElementById("results-list");
  const resultsTitle = document.getElementById("results-title");

  if (!query.trim()) {
    trendingSection.style.display = "";
    resultsSection.style.display = "none";
    return;
  }

  trendingSection.style.display = "none";
  resultsSection.style.display = "";
  resultsTitle.textContent = `Resultados para "${query}"`;
  resultsList.innerHTML = `<div class="empty-state">Buscando…</div>`;

  const { titles } = await svcSearch(query);
  if (!titles.length) {
    resultsList.innerHTML = `<div class="empty-state">Nenhum título encontrado. Tente outro nome.</div>`;
    return;
  }
  resultsList.innerHTML = titles.map(resultRowHtml).join("");
}

function initHome() {
  const banner = document.getElementById("demo-banner");
  if (isDemoMode()) banner.classList.add("show");

  renderTrending();

  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");

  const params = new URLSearchParams(location.search);
  const initialQ = params.get("q") || "";
  if (initialQ) {
    input.value = initialQ;
    runSearch(initialQ);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    const url = new URL(location.href);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
    history.replaceState(null, "", url.toString());
    runSearch(q);
  });

  input.addEventListener("input", () => {
    if (input.value.trim().length >= 3 || input.value.trim().length === 0) {
      runSearch(input.value);
    }
  });
}

document.addEventListener("DOMContentLoaded", initHome);
