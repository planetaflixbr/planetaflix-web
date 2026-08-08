/* PLANETA FLIX — Lógica da ficha consolidada do título (titulo.html) */

let currentUser = null;
let currentTitle = null;

function initials(name) {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function saveButtonHtml() {
  return `<button class="save-btn" id="save-btn" disabled>🤍 Salvar</button>`;
}

/* Reflete login + status de favorito no botão. Sem login, o botão fica
   habilitado e leva ao cadastro ao ser clicado (gate feito em onSaveClick). */
async function updateSaveButton() {
  const btn = document.getElementById("save-btn");
  if (!btn || !currentTitle) return;
  if (!currentUser) {
    btn.textContent = "🤍 Salvar";
    btn.classList.remove("saved");
    btn.disabled = false;
    return;
  }
  btn.disabled = true;
  try {
    const saved = await isFavorito(currentUser.uid, currentTitle.mediaType, currentTitle.id);
    btn.textContent = saved ? "✓ Salvo" : "🤍 Salvar";
    btn.classList.toggle("saved", saved);
  } catch (e) {
    console.error(e);
  }
  btn.disabled = false;
}

async function onSaveClick() {
  const btn = document.getElementById("save-btn");
  if (!currentTitle) return;
  if (!currentUser) {
    window.location.href = "cadastro.html";
    return;
  }
  btn.disabled = true;
  try {
    if (btn.classList.contains("saved")) {
      await removeFavorito(currentUser.uid, currentTitle.mediaType, currentTitle.id);
    } else {
      await addFavorito(currentUser.uid, currentTitle);
    }
  } catch (e) {
    console.error(e);
  }
  await updateSaveButton();
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
  currentTitle = t;
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

  // Cada item de "where" é [nome, corDeMarca, logoUrl?]. O logo (asset real do TMDb) é
  // preferido; quando não existe, cai para um ponto colorido com a cor oficial do provedor.
  const whereHtml = (t.where && t.where.length)
    ? t.where.map(([name, color, logo]) => `
        <div class="platform">
          ${logo ? `<img class="platform-logo" src="${logo}" alt="${name}" loading="lazy">` : `<span class="dot" style="background:${color}"></span>`}
          ${name}
        </div>
      `).join("")
    : `<div class="empty-state" style="padding:8px 0;">Não encontramos este título em nenhum streaming no Brasil no momento.</div>`;

  // Atribuição obrigatória: dados de "onde assistir" vêm da parceria TMDb + JustWatch
  // (exigência dos termos da API do TMDb — ver assets/js/tmdb.js).
  const whereAttribution = `
    <p class="where-attribution">
      Disponibilidade fornecida por <strong>JustWatch</strong> via TMDb.
      ${t.whereLink ? `<a href="${t.whereLink}" target="_blank" rel="noopener">Ver todas as opções ↗</a>` : ""}
    </p>
  `;

  const crewHtml = (t.cast || []).map(([name, role]) => `
    <div class="crew-card">
      <div class="av">${initials(name)}</div>
      <div class="n">${name}</div>
      <div class="r">${role}</div>
    </div>
  `).join("");

  document.getElementById("detail-body").innerHTML = `
    <div class="detail-top-row">
      <div>
        <div class="detail-title">${t.title}</div>
        <div class="detail-sub">${[t.year, genres, t.runtime, t.ageRating].filter(Boolean).join(" · ")}</div>
      </div>
      ${saveButtonHtml()}
    </div>
    <div class="ratings-row">${ratingsHtml}</div>
    <div class="block-title">Onde assistir</div>
    <div class="where-row">${whereHtml}</div>
    ${whereAttribution}
    <p class="synopsis">${t.synopsis || "Sinopse não disponível."}</p>
    <div class="block-title">Elenco e equipe</div>
    <div class="crew-scroll">${crewHtml || "<span class='empty-state'>Sem informações de elenco.</span>"}</div>
  `;

  document.getElementById("save-btn").addEventListener("click", onSaveClick);
  updateSaveButton();
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

  authOnStateChanged((user) => {
    currentUser = user;
    updateSaveButton();
  });
}

document.addEventListener("DOMContentLoaded", initTitulo);
