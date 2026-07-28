/* PLANETA FLIX — Lógica da ficha consolidada do título (titulo.html) */

function initials(name) {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function ratingChip(cls, label, value) {
  const display = value || "—";
  return `
    <div class="rating-chip ${cls}">
      <div class="src">${label}</div>
      <div class="val">${display}</div>
    </div>
  `;
}

function renderDetail(t) {
  document.title = `${t.title} — Planeta Flix`;
  const heroBg = t.backdrop ? `background-image:url('${t.backdrop}')` : `background:${t.bg || "linear-gradient(160deg,#1b4c4a,#1e858d)"}`;
  const genres = (t.genres || []).join(", ");

  document.getElementById("detail-hero").setAttribute("style", heroBg);

  const lbUrl = letterboxdUrl(t.letterboxdSlug);
  const ratingsHtml = `
    ${ratingChip("imdb", "IMDb", t.imdbRating)}
    ${ratingChip("rt", "Rotten Tomatoes", t.rtRating)}
    <div class="rating-chip lb">
      <div class="src">Letterboxd</div>
      <div class="val"><a href="${lbUrl}" target="_blank" rel="noopener">Ver nota ↗</a></div>
    </div>
  `;

  const whereHtml = (t.where && t.where.length)
    ? t.where.map(([name, color]) => `<div class="platform"><span class="dot" style="background:${color}"></span>${name}</div>`).join("")
    : `<div class="empty-state" style="padding:8px 0;">Não encontramos este título em nenhum streaming no Brasil no momento.</div>`;

  const crewHtml = (t.cast || []).map(([name, role]) => `
    <div class="crew-card">
      <div class="av">${initials(name)}</div>
      <div class="n">${name}</div>
      <div class="r">${role}</div>
    </div>
  `).join("");

  document.getElementById("detail-body").innerHTML = `
    <div class="detail-title">${t.title}</div>
    <div class="detail-sub">${[t.year, genres, t.runtime, t.ageRating].filter(Boolean).join(" · ")}</div>
    <div class="ratings-row">${ratingsHtml}</div>
    <div class="block-title">Onde assistir</div>
    <div class="where-row">${whereHtml}</div>
    <p class="synopsis">${t.synopsis || "Sinopse não disponível."}</p>
    <div class="block-title">Elenco e equipe</div>
    <div class="crew-scroll">${crewHtml || "<span class='empty-state'>Sem informações de elenco.</span>"}</div>
  `;
}

async function initTitulo() {
  const banner = document.getElementById("demo-banner");
  if (isDemoMode()) banner.classList.add("show");

  const params = new URLSearchParams(location.search);
  const mediaType = params.get("type") || "movie";
  const id = params.get("id");

  if (!id) {
    document.getElementById("detail-body").innerHTML = `<div class="empty-state">Título não encontrado.</div>`;
    return;
  }

  document.getElementById("detail-body").innerHTML = `<div class="empty-state">Carregando ficha do título…</div>`;
  const t = await svcTitleDetails(mediaType, id);
  if (!t) {
    document.getElementById("detail-body").innerHTML = `<div class="empty-state">Não encontramos esse título.</div>`;
    return;
  }
  renderDetail(t);
}

document.addEventListener("DOMContentLoaded", initTitulo);
