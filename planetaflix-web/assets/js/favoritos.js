/* PLANETA FLIX — Lógica da página de favoritos (favoritos.html) */

function favTitleCardHtml(f) {
  const bg = f.poster
    ? `background-image:url('${f.poster}')`
    : `background:linear-gradient(160deg,#2a4a48,#1e858d)`;
  return `
    <a class="title-card" href="titulo.html?type=${f.mediaType}&id=${encodeURIComponent(f.id)}" style="${bg}">
      ${f.year ? `<span class="badge-year">${f.year}</span>` : ""}
      <div class="overlay"><span>${f.title}</span></div>
    </a>
  `;
}

async function initFavoritos() {
  const body = document.getElementById("favoritos-body");

  authOnStateChanged(async (user) => {
    if (!user) {
      body.innerHTML = `<div class="empty-state">Entre com sua conta para ver seus favoritos. <a href="cadastro.html">Entrar</a></div>`;
      return;
    }

    body.innerHTML = `<div class="empty-state">Carregando…</div>`;
    try {
      const favoritos = await getFavoritos(user.uid);
      if (!favoritos.length) {
        body.innerHTML = `<div class="empty-state">Você ainda não salvou nenhum título. Explore a <a href="index.html">busca</a> e clique em "Salvar" na ficha de um filme ou série.</div>`;
        return;
      }
      body.innerHTML = `<div class="grid-titles">${favoritos.map(favTitleCardHtml).join("")}</div>`;
    } catch (e) {
      console.error(e);
      body.innerHTML = `<div class="empty-state">Não foi possível carregar seus favoritos. Tente novamente.</div>`;
    }
  });
}

document.addEventListener("DOMContentLoaded", initFavoritos);
