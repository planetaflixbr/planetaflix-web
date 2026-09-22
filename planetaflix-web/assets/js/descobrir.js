/*
 * PLANETA FLIX — "Me ajuda a escolher" (descobrir.html)
 * -----------------------------------------------------
 * Porta de entrada para quem NÃO sabe o que quer assistir — a persona
 * "Decisor Indeciso" do playbook. Enquanto a busca exige um nome digitado,
 * aqui o usuário descreve a situação (o que assina, gênero, tempo que tem)
 * e recebe opções — ou deixa o sorteio decidir por ele.
 */

const SERVICOS_KEY = "pf_servicos";   // serviços assinados ficam no navegador
const MAX_PROVIDERS = 12;             // quantos serviços virar chip na tela
const ROLETA_MAX_PAGE = 15;           // teto de páginas sorteáveis (além disso a cauda fica fraca)
const RESULTS_LIMIT = 12;

const filtros = {
  mediaType: "movie",
  providers: [],
  genre: "",
  maxRuntime: "",
  minRating: "",
};

let ultimoSorteado = null;   // evita sortear o mesmo título duas vezes seguidas
let buscando = false;

/* Stub de analytics (backlog B15). Hoje só registra no console; quando a
   ferramenta de analytics entrar, basta trocar o corpo desta função. */
function pfTrack(evento, props = {}) {
  if (typeof window.pfAnalytics === "function") {
    window.pfAnalytics(evento, props);
    return;
  }
  console.log("[track]", evento, props);
}

/* localStorage pode falhar (navegação anônima, cookies bloqueados) — nunca
   deixar isso derrubar a tela. */
function lerServicosSalvos() {
  try {
    const raw = localStorage.getItem(SERVICOS_KEY);
    return raw ? JSON.parse(raw).map(Number).filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

function salvarServicos(ids) {
  try {
    localStorage.setItem(SERVICOS_KEY, JSON.stringify(ids));
  } catch (e) {
    /* sem persistência: a escolha vale só para esta sessão */
  }
}

/* ---------- Renderização dos filtros ---------- */

async function renderProviders() {
  const bloco = document.getElementById("providers-block");
  const row = document.getElementById("providers-row");
  const providers = await svcWatchProviders(filtros.mediaType);

  // Modo demonstração (ou TMDb fora do ar): sem lista de serviços, o filtro some
  // em vez de virar um punhado de chips que não filtram nada.
  if (!providers.length) {
    bloco.style.display = "none";
    filtros.providers = [];
    return;
  }

  bloco.style.display = "";
  const lista = providers.slice(0, MAX_PROVIDERS);
  const disponiveis = new Set(lista.map(p => p.id));
  filtros.providers = filtros.providers.filter(id => disponiveis.has(id));

  row.innerHTML = lista.map(p => `
    <button type="button" class="chip ${filtros.providers.includes(p.id) ? "on" : ""}" data-provider="${p.id}">
      ${p.logo
        ? `<img class="chip-logo" src="${p.logo}" alt="" loading="lazy">`
        : `<span class="dot" style="background:${p.color}"></span>`}
      <span>${p.name}</span>
    </button>
  `).join("");

  row.querySelectorAll("[data-provider]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.provider);
      const i = filtros.providers.indexOf(id);
      if (i >= 0) filtros.providers.splice(i, 1);
      else filtros.providers.push(id);
      btn.classList.toggle("on");
      salvarServicos(filtros.providers);
      pfTrack("filtro_servico", { provider_id: id, marcado: i < 0 });
    });
  });
}

async function renderGenres() {
  const select = document.getElementById("filtro-genero");
  const generos = await svcGenres(filtros.mediaType);
  select.innerHTML = `<option value="">Qualquer gênero</option>` +
    generos.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
  select.value = "";
  filtros.genre = "";
}

/* Duração só faz sentido em filme — em série o tempo é por episódio. */
function atualizarVisibilidadeDuracao() {
  const bloco = document.getElementById("duracao-block");
  bloco.style.display = filtros.mediaType === "movie" ? "" : "none";
  if (filtros.mediaType !== "movie") filtros.maxRuntime = "";
}

/* ---------- Renderização dos resultados ---------- */

function cardHtml(t) {
  const bg = t.poster
    ? `background-image:url('${t.poster}')`
    : `background:${t.bg || "linear-gradient(160deg,#2a4a48,#1e858d)"}`;
  return `
    <a class="title-card" href="titulo.html?type=${t.mediaType || "movie"}&id=${encodeURIComponent(t.id)}"
       style="${bg}" data-resultado="${t.id}">
      ${t.year ? `<span class="badge-year">${t.year}</span>` : ""}
      <div class="overlay"><span>${t.title}</span></div>
    </a>
  `;
}

function setStatus(texto) {
  document.getElementById("resultado-status").textContent = texto || "";
}

function renderCarregando(mensagem) {
  document.getElementById("resultado-area").innerHTML =
    `<div class="empty-state">${mensagem}</div>`;
}

function renderVazio() {
  setStatus("");
  document.getElementById("resultado-area").innerHTML = `
    <div class="empty-state">
      Nada bateu com esses filtros.<br>
      Tente tirar a nota mínima, aumentar o tempo ou marcar mais um serviço.
    </div>`;
  pfTrack("escolha_sem_resultado", { ...filtros });
}

function renderLista(resultados, total) {
  const area = document.getElementById("resultado-area");
  area.innerHTML = `<div class="grid-titles">${resultados.slice(0, RESULTS_LIMIT).map(cardHtml).join("")}</div>`;
  setStatus(total ? `${total} títulos combinam — mostrando ${Math.min(resultados.length, RESULTS_LIMIT)}.` : "");
  ligarCliquesDeResultado("lista");
}

function renderSorteio(t) {
  const area = document.getElementById("resultado-area");
  const bg = t.poster
    ? `background-image:url('${t.poster}')`
    : `background:${t.bg || "linear-gradient(160deg,#2a4a48,#1e858d)"}`;
  area.innerHTML = `
    <div class="roleta-card">
      <a class="roleta-poster" href="titulo.html?type=${t.mediaType || "movie"}&id=${encodeURIComponent(t.id)}"
         style="${bg}" data-resultado="${t.id}"></a>
      <div class="roleta-info">
        <div class="roleta-tag">A escolha da noite</div>
        <h2 class="roleta-titulo">${t.title}</h2>
        <p class="roleta-sub">${t.year || ""}${t.mediaType === "tv" ? " · Série" : " · Filme"}</p>
        <div class="roleta-acoes">
          <a class="btn-primary" href="titulo.html?type=${t.mediaType || "movie"}&id=${encodeURIComponent(t.id)}"
             data-resultado="${t.id}">Ver ficha e onde assistir</a>
          <button type="button" class="btn-ghost" id="btn-sortear-de-novo">Sortear de novo</button>
        </div>
      </div>
    </div>`;
  setStatus("");
  document.getElementById("btn-sortear-de-novo").addEventListener("click", sortear);
  ligarCliquesDeResultado("sorteio");
}

/* Mede o que importa: quantas escolhas viram clique de verdade numa ficha.
   É a métrica que diz se esta tela resolve a indecisão ou só enfeita. */
function ligarCliquesDeResultado(origem) {
  document.querySelectorAll("[data-resultado]").forEach(el => {
    el.addEventListener("click", () => {
      pfTrack("escolha_clique_titulo", { origem, title_id: el.dataset.resultado, ...filtros });
    });
  });
}

/* ---------- Ações ---------- */

function lerFiltrosDaTela() {
  filtros.genre = document.getElementById("filtro-genero").value;
  filtros.maxRuntime = document.getElementById("filtro-duracao").value;
  filtros.minRating = document.getElementById("filtro-nota").value;
}

async function verOpcoes() {
  if (buscando) return;
  buscando = true;
  lerFiltrosDaTela();
  renderCarregando("Procurando o que combina…");
  pfTrack("escolha_ver_opcoes", { ...filtros });
  try {
    const { results, totalResults } = await svcDiscover({ ...filtros, page: 1 });
    if (!results.length) renderVazio();
    else renderLista(results, totalResults);
  } catch (e) {
    console.error(e);
    renderCarregando("Não foi possível buscar agora. Tente de novo em instantes.");
  } finally {
    buscando = false;
  }
}

async function sortear() {
  if (buscando) return;
  buscando = true;
  lerFiltrosDaTela();
  renderCarregando("Sorteando…");
  pfTrack("escolha_sorteio", { ...filtros });
  try {
    const primeira = await svcDiscover({ ...filtros, page: 1 });
    if (!primeira.results.length) {
      renderVazio();
      return;
    }
    // Sorteia dentro de uma faixa de páginas para não devolver sempre os
    // mesmos campeões de popularidade da página 1.
    const teto = Math.min(primeira.totalPages || 1, ROLETA_MAX_PAGE);
    const pagina = teto > 1 ? 1 + Math.floor(Math.random() * teto) : 1;
    const lote = pagina === 1 ? primeira : await svcDiscover({ ...filtros, page: pagina });

    let opcoes = lote.results.length ? lote.results : primeira.results;
    if (opcoes.length > 1 && ultimoSorteado) {
      const semRepetir = opcoes.filter(t => t.id !== ultimoSorteado);
      if (semRepetir.length) opcoes = semRepetir;
    }
    const escolhido = opcoes[Math.floor(Math.random() * opcoes.length)];
    ultimoSorteado = escolhido.id;
    renderSorteio(escolhido);
  } catch (e) {
    console.error(e);
    renderCarregando("Não foi possível sortear agora. Tente de novo em instantes.");
  } finally {
    buscando = false;
  }
}

async function trocarTipo(novoTipo) {
  if (filtros.mediaType === novoTipo) return;
  filtros.mediaType = novoTipo;
  document.querySelectorAll("[data-tipo]").forEach(b => {
    b.classList.toggle("on", b.dataset.tipo === novoTipo);
  });
  atualizarVisibilidadeDuracao();
  // Gêneros e serviços têm listas próprias para filme e série no TMDb.
  await Promise.all([renderGenres(), renderProviders()]);
  verOpcoes();
}

/* ---------- Início ---------- */

async function initDescobrir() {
  const banner = document.getElementById("demo-banner");
  if (banner && isDemoMode()) banner.classList.add("show");

  filtros.providers = lerServicosSalvos();

  document.querySelectorAll("[data-tipo]").forEach(btn => {
    btn.addEventListener("click", () => trocarTipo(btn.dataset.tipo));
  });
  document.getElementById("btn-ver-opcoes").addEventListener("click", verOpcoes);
  document.getElementById("btn-sortear").addEventListener("click", sortear);
  ["filtro-genero", "filtro-duracao", "filtro-nota"].forEach(id => {
    document.getElementById(id).addEventListener("change", verOpcoes);
  });

  atualizarVisibilidadeDuracao();
  await Promise.all([renderGenres(), renderProviders()]);
  verOpcoes();
}

document.addEventListener("DOMContentLoaded", initDescobrir);
