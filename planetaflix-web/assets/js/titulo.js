/* PLANETA FLIX — Lógica da ficha consolidada do título (titulo.html) */

let currentUser = null;
let currentTitle = null;
let currentStars = 0;
let userAvaliacao = null;

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

function ratingChip(cls, label, value, id) {
  const display = value || "—";
  return `
    <div class="rating-chip ${cls}">
      <div class="src">${label}</div>
      <div class="val"${id ? ` id="${id}"` : ""}>${display}</div>
    </div>
  `;
}

function starPickerHtml() {
  return `
    <div class="star-picker" id="star-picker">
      ${[1, 2, 3, 4, 5].map(n => `<span class="star" data-value="${n}">★</span>`).join("")}
    </div>
  `;
}

function updateStarPickerUI() {
  document.querySelectorAll("#star-picker .star").forEach(s => {
    s.classList.toggle("filled", Number(s.dataset.value) <= currentStars);
  });
}

function updateReviewSubmitState() {
  const btn = document.getElementById("review-submit-btn");
  if (btn) btn.disabled = currentStars < 1;
}

/* Sem login, a área de avaliação fica visível mas qualquer interação
   (estrela ou enviar) leva ao cadastro — mesmo padrão do botão Salvar. */
function updateReviewGateUI() {
  const hint = document.getElementById("review-hint");
  if (!hint) return;
  hint.innerHTML = currentUser ? "" : `Você precisa <a href="cadastro.html">entrar</a> para avaliar.`;
}

function reviewCardHtml(r) {
  const stars = "★".repeat(r.stars || 0) + "☆".repeat(5 - (r.stars || 0));
  return `
    <div class="review-card">
      <div class="review-card-top">
        <div class="review-avatar">${r.avatar || "🎬"}</div>
        <div>
          <div class="review-name">${r.nome || "Cinéfilo Planeta Flix"}</div>
          <div class="review-stars">${stars}</div>
        </div>
      </div>
      ${r.comentario ? `<p class="review-comment">${r.comentario}</p>` : ""}
    </div>
  `;
}

/* Busca todas as avaliações do título, calcula a nota média (chip "Planeta
   Flix" nas notas do topo) e, se o usuário estiver logado, pré-preenche o
   formulário com a avaliação que ele já tiver feito. */
async function loadReviews() {
  if (!currentTitle) return;
  const chipVal = document.getElementById("pf-rating-val");
  const list = document.getElementById("review-list");
  if (!list) return;
  try {
    const reviews = await getAvaliacoes(currentTitle.mediaType, currentTitle.id);
    if (!reviews.length) {
      if (chipVal) chipVal.textContent = "Novo";
      list.innerHTML = `<div class="empty-state">Seja o primeiro a avaliar este título.</div>`;
    } else {
      const avg = reviews.reduce((sum, r) => sum + (r.stars || 0), 0) / reviews.length;
      if (chipVal) chipVal.textContent = `${avg.toFixed(1)} ★ (${reviews.length})`;
      list.innerHTML = reviews.map(reviewCardHtml).join("");
    }

    userAvaliacao = currentUser ? reviews.find(r => r.uid === currentUser.uid) || null : null;
    const submitBtn = document.getElementById("review-submit-btn");
    if (userAvaliacao) {
      currentStars = userAvaliacao.stars || 0;
      const commentBox = document.getElementById("review-comment");
      if (commentBox && !commentBox.value) commentBox.value = userAvaliacao.comentario || "";
      updateStarPickerUI();
      if (submitBtn) submitBtn.textContent = "Atualizar avaliação";
    } else if (submitBtn) {
      submitBtn.textContent = "Enviar avaliação";
    }
    updateReviewSubmitState();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="empty-state">Não foi possível carregar as avaliações.</div>`;
  }
}

async function onReviewSubmit() {
  if (!currentTitle) return;
  if (!currentUser) {
    window.location.href = "cadastro.html";
    return;
  }
  if (currentStars < 1) return;
  const btn = document.getElementById("review-submit-btn");
  const hint = document.getElementById("review-hint");
  btn.disabled = true;
  btn.textContent = "Enviando…";
  try {
    const perfil = await getUserProfile(currentUser.uid);
    const comentario = document.getElementById("review-comment").value.trim();
    await submitAvaliacao(currentUser.uid, perfil, currentTitle, currentStars, comentario);
    if (hint) hint.textContent = "Avaliação salva. Obrigado!";
    await loadReviews();
  } catch (e) {
    console.error(e);
    if (hint) hint.textContent = "Não foi possível salvar sua avaliação. Tente novamente.";
  }
  updateReviewSubmitState();
}

function renderDetail(t) {
  currentTitle = t;
  document.title = `${t.title} — Planeta Flix`;
  const heroBg = t.backdrop ? `background-image:url('${t.backdrop}')` : `background:${t.bg || "linear-gradient(160deg,#1b4c4a,#1e858d)"}`;
  const genres = (t.genres || []).join(", ");

  document.getElementById("detail-hero").setAttribute("style", heroBg);

  const lbUrl = letterboxdUrl(t.letterboxdSlug);
  // Nota do Rotten Tomatoes removida por ora — ainda não usamos a API deles,
  // e exibir sem fonte real passaria uma informação que não temos.
  const ratingsHtml = `
    ${ratingChip("imdb", "IMDb", t.imdbRating)}
    <div class="rating-chip lb">
      <div class="src">Letterboxd</div>
      <div class="val"><a href="${lbUrl}" target="_blank" rel="noopener">Ver nota ↗</a></div>
    </div>
    ${ratingChip("pf", "Planeta Flix", null, "pf-rating-val")}
  `;

  // Trailer do YouTube (quando o TMDb tem um disponível para o título).
  const trailerHtml = t.trailerKey ? `
    <div class="block-title">Trailer</div>
    <div class="trailer-wrap">
      <iframe
        src="https://www.youtube.com/embed/${t.trailerKey}"
        title="Trailer de ${t.title}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="lazy"
        allowfullscreen>
      </iframe>
    </div>
  ` : "";

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
    ${trailerHtml}
    <div class="block-title">Onde assistir</div>
    <div class="where-row">${whereHtml}</div>
    ${whereAttribution}
    <p class="synopsis">${t.synopsis || "Sinopse não disponível."}</p>
    <div class="block-title">Elenco e equipe</div>
    <div class="crew-scroll">${crewHtml || "<span class='empty-state'>Sem informações de elenco.</span>"}</div>
    <div class="block-title">Avaliações da comunidade</div>
    <div class="review-form-box">
      <div class="review-form-label">Sua avaliação</div>
      ${starPickerHtml()}
      <textarea id="review-comment" class="review-textarea" placeholder="Conte o que achou (opcional)" maxlength="500"></textarea>
      <button class="review-submit-btn" id="review-submit-btn" disabled>Enviar avaliação</button>
      <div class="review-hint" id="review-hint"></div>
    </div>
    <div class="review-list" id="review-list">
      <div class="empty-state">Carregando avaliações…</div>
    </div>
  `;

  document.getElementById("save-btn").addEventListener("click", onSaveClick);
  updateSaveButton();

  document.getElementById("star-picker").addEventListener("click", (e) => {
    const star = e.target.closest(".star");
    if (!star) return;
    if (!currentUser) {
      window.location.href = "cadastro.html";
      return;
    }
    currentStars = Number(star.dataset.value);
    updateStarPickerUI();
    updateReviewSubmitState();
  });
  document.getElementById("review-submit-btn").addEventListener("click", onReviewSubmit);
  updateReviewGateUI();
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

  authOnStateChanged(async (user) => {
    currentUser = user;
    updateSaveButton();
    updateReviewGateUI();
    await loadReviews();
  });
}

document.addEventListener("DOMContentLoaded", initTitulo);
