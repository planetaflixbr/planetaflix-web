/* PLANETA FLIX — Lógica da ficha de pessoa (pessoa.html) */

function personInitials(name) {
  return (name || "").split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function filmographyCardHtml(t) {
  const bg = t.poster ? `background-image:url('${t.poster}')` : `background:${t.bg || "linear-gradient(160deg,#2a4a48,#1e858d)"}`;
  const mediaType = t.mediaType || "movie";
  return `
    <a class="title-card" href="titulo.html?type=${mediaType}&id=${encodeURIComponent(t.id)}" style="${bg}">
      ${t.year ? `<span class="badge-year">${t.year}</span>` : ""}
      <div class="overlay"><span>${t.title}</span></div>
    </a>
  `;
}

function renderPerson(p) {
  document.title = `${p.name} — Planeta Flix`;

  const photoHtml = p.photo
    ? `<img class="person-photo" src="${p.photo}" alt="${p.name}">`
    : `<div class="person-photo-fallback">${personInitials(p.name)}</div>`;

  document.getElementById("person-body").innerHTML = `
    <div class="person-card">
      ${photoHtml}
      <div>
        <div class="person-name">${p.name}</div>
        <div class="person-role">${p.role || "Pessoa"}</div>
        ${p.bio ? `<p class="person-bio">${p.bio}</p>` : ""}
      </div>
    </div>
    <div class="block-title">Filmografia</div>
    <div class="grid-titles">
      ${(p.filmography && p.filmography.length) ? p.filmography.map(filmographyCardHtml).join("") : `<div class="empty-state">Sem filmografia disponível.</div>`}
    </div>
  `;
}

async function initPessoa() {
  const banner = document.getElementById("demo-banner");
  if (isDemoMode()) banner.classList.add("show");

  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  if (!id) {
    document.getElementById("person-body").innerHTML = `<div class="empty-state">Pessoa não encontrada.</div>`;
    return;
  }

  document.getElementById("person-body").innerHTML = `<div class="empty-state">Carregando…</div>`;
  const p = await svcPersonDetails(id);
  if (!p) {
    document.getElementById("person-body").innerHTML = `<div class="empty-state">Não encontramos essa pessoa.</div>`;
    return;
  }
  renderPerson(p);
}

document.addEventListener("DOMContentLoaded", initPessoa);
