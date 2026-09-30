/*
 * Testa a camada de medição: consentimento, os três fluxos e o antirruído da
 * busca. Nada sai para a rede — googletagmanager, TMDb e Firebase são
 * interceptados, e o que "seria enviado" é lido do dataLayer.
 *
 * Como rodar, de dentro de planetaflix-web/:
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/test-analytics.cjs
 *
 * O --no-save é de propósito: o package.json deste projeto não tem
 * dependências, e é isso que faz o build da Vercel não precisar de
 * npm install. O playwright é ferramenta de quem desenvolve, não do build.
 * Se o Chromium já estiver noutro lugar, aponte com CHROMIUM_PATH.
 */
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const PORTA = 8111;

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "text/plain" });
  res.end(fs.readFileSync(file));
});

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const filmes = (n, prefixo) => Array.from({ length: n }, (_, i) => ({
  id: 1000 + i, title: `${prefixo} ${i + 1}`, name: `${prefixo} ${i + 1}`,
  release_date: "2026-01-01", first_air_date: "2026-01-01",
  poster_path: `/p${i}.jpg`, popularity: 100 - i, vote_count: 500, vote_average: 8,
}));

/* Dubles do Firebase: substituem firebase-config.js e auth.js, para o teste
   dirigir o funil de cadastro sem conta nem rede. */
const STUB_FIREBASE_CONFIG = `window.fbAuth = {}; window.fbDb = {};`;
const stubAuth = ({ isNewUser }) => `
const GENEROS_DISPONIVEIS = ["Drama", "Comédia", "Terror"];
const AVATARES_DISPONIVEIS = ["🎬", "🍿"];
window.__usuarioFake = { uid: "u1", displayName: "Teste", email: "t@t.t", photoURL: "" };
window.__onAuth = null;
function authSignInWithGoogle() {
  window.__loginChamado = true;
  if (window.__onAuth) window.__onAuth(window.__usuarioFake);
  return Promise.resolve();
}
function authOnStateChanged(cb) { window.__onAuth = cb; cb(null); }
async function ensureUserProfile(user) {
  return { profile: { onboardingComplete: false }, isNewUser: ${isNewUser} };
}
async function updateUserProfile(uid, dados) { window.__perfilSalvo = dados; }
async function getUserProfile() { return null; }
`;

async function novaPagina(browser, { consentimento = null, cadastro = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 820 } });
  const page = await ctx.newPage();

  const pedidosGoogle = [];
  const erros = [];
  page.on("pageerror", (e) => erros.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") erros.push("CONSOLE: " + m.text()); });

  if (consentimento) {
    await page.addInitScript((v) => {
      try { localStorage.setItem("pf_consentimento", v); } catch (e) {}
    }, consentimento);
  }

  await page.route("**googletagmanager.com/**", (r) => {
    pedidosGoogle.push(r.request().url());
    r.fulfill({ status: 200, contentType: "text/javascript", body: "/* gtag falso */" });
  });
  await page.route("**google-analytics.com/**", (r) => {
    pedidosGoogle.push(r.request().url());
    r.fulfill({ status: 204, body: "" });
  });
  await page.route("**/image.tmdb.org/**", (r) =>
    r.fulfill({ status: 200, contentType: "image/png", body: PNG })
  );
  await page.route("**/api.themoviedb.org/**", (route) => {
    const url = new URL(route.request().url());
    let body = {};
    if (url.pathname.startsWith("/3/search/multi") || url.pathname.startsWith("/3/search/")) {
      body = { page: 1, results: filmes(3, "Duna").map((f) => ({ ...f, media_type: "movie" })), total_results: 3 };
    } else if (url.pathname.startsWith("/3/discover/")) {
      body = { page: 1, results: filmes(20, "Filme"), total_pages: 5, total_results: 100 };
    } else if (url.pathname.includes("/genre/")) {
      body = { genres: [{ id: 18, name: "Drama" }] };
    } else if (url.pathname.includes("/watch/providers/")) {
      body = { results: [{ provider_id: 8, provider_name: "Netflix", display_priorities: { BR: 1 } }] };
    }
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });

  if (cadastro) {
    await page.route("**gstatic.com/firebasejs/**", (r) =>
      r.fulfill({ status: 200, contentType: "text/javascript", body: "window.firebase = { firestore: { FieldValue: { serverTimestamp: () => 0 } } };" })
    );
    await page.route("**/assets/js/firebase-config.js", (r) =>
      r.fulfill({ status: 200, contentType: "text/javascript", body: STUB_FIREBASE_CONFIG })
    );
    await page.route("**/assets/js/auth.js", (r) =>
      r.fulfill({ status: 200, contentType: "text/javascript", body: stubAuth(cadastro) })
    );
  }

  return { ctx, page, pedidosGoogle, erros };
}

/* O que o gtag teria enviado: analytics.js empurra `arguments` no dataLayer. */
const lerEventos = (page) => page.evaluate(() => {
  const dl = window.dataLayer || [];
  return dl.map((a) => Array.from(a))
           .filter((a) => a[0] === "event")
           .map((a) => ({ evento: a[1], props: a[2] || {} }));
});

const ok = (cond, msg) => ({ passou: !!cond, msg });

const lerOrdem = (page) => page.evaluate(() => {
  try { return JSON.parse(sessionStorage.getItem("__ordem") || "[]"); } catch (e) { return []; }
});

(async () => {
  await new Promise((r) => server.listen(PORTA, r));
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  const base = `http://localhost:${PORTA}`;
  const res = [];
  const errosTodos = [];

  // ---------- 1) ANTES DO CONSENTIMENTO: nada sai ----------
  {
    const { ctx, page, pedidosGoogle, erros } = await novaPagina(browser);
    await page.goto(`${base}/index.html`);
    await page.waitForTimeout(500);

    res.push(ok(await page.isVisible("#pf-consentimento"), "banner aparece na primeira visita"));

    await page.fill("#search-input", "duna");
    await page.click('#search-form button[type="submit"]');
    await page.waitForTimeout(700);

    res.push(ok(pedidosGoogle.length === 0,
      `nenhum pedido ao Google antes do aceite (foram ${pedidosGoogle.length})`));
    res.push(ok(!pedidosGoogle.some((u) => u.includes("gtm.js")),
      "GTM não é carregado antes do aceite"));
    const ev = await lerEventos(page);
    res.push(ok(ev.length === 0, `nada enviado antes do aceite (dataLayer tinha ${ev.length})`));
    res.push(ok(await page.evaluate(() => typeof window.gtag === "undefined"),
      "gtag não existe antes do aceite"));
    errosTodos.push(...erros);
    await ctx.close();
  }

  // ---------- 2) ACEITAR: carrega e esvazia a fila ----------
  {
    const { ctx, page, pedidosGoogle, erros } = await novaPagina(browser);
    await page.goto(`${base}/index.html`);
    await page.waitForTimeout(400);
    await page.fill("#search-input", "duna");
    await page.click('#search-form button[type="submit"]');
    await page.waitForTimeout(700);

    await page.click("#pf-aceitar");
    await page.waitForTimeout(600);

    res.push(ok(!(await page.isVisible("#pf-consentimento")), "banner sai depois do aceite"));
    res.push(ok(pedidosGoogle.some((u) => u.includes("gtag/js") && u.includes("G-EH9HLLYG13")),
      "gtag.js pedido com o ID certo depois do aceite"));
    res.push(ok(pedidosGoogle.some((u) => u.includes("gtm.js") && u.includes("GTM-PF2W5X4W")),
      "gtm.js pedido com o container certo depois do aceite"));
    const gtmStart = await page.evaluate(() =>
      (window.dataLayer || []).some((e) => e && e.event === "gtm.js"));
    res.push(ok(gtmStart, "dataLayer recebeu o gtm.start do container"));

    const ev = await lerEventos(page);
    const busca = ev.find((e) => e.evento === "search");
    res.push(ok(!!busca, "evento search da fila foi enviado no aceite"));
    res.push(ok(busca && busca.props.search_term === "duna",
      `search_term = "duna" (veio ${busca && JSON.stringify(busca.props.search_term)})`));
    res.push(ok(busca && busca.props.origem === "submit",
      `origem = submit (veio ${busca && JSON.stringify(busca.props.origem)})`));
    res.push(ok(busca && typeof busca.props.resultados === "number",
      `resultados é número (veio ${busca && JSON.stringify(busca.props.resultados)})`));
    errosTodos.push(...erros);
    await ctx.close();
  }

  // ---------- 3) RECUSAR: nada nunca ----------
  {
    const { ctx, page, pedidosGoogle, erros } = await novaPagina(browser);
    await page.goto(`${base}/index.html`);
    await page.waitForTimeout(400);
    await page.click("#pf-recusar");
    await page.fill("#search-input", "duna");
    await page.click('#search-form button[type="submit"]');
    await page.waitForTimeout(700);

    res.push(ok(pedidosGoogle.length === 0, "recusa: nenhum pedido ao Google (GA4 nem GTM)"));
    res.push(ok((await lerEventos(page)).length === 0, "recusa: nenhum evento"));

    await page.reload();
    await page.waitForTimeout(500);
    res.push(ok(!(await page.isVisible("#pf-consentimento")),
      "recusa é lembrada: banner não volta ao recarregar"));
    errosTodos.push(...erros);
    await ctx.close();
  }

  // ---------- 4) BUSCA: o debounce não vira quatro eventos ----------
  {
    const { ctx, page, erros } = await novaPagina(browser, { consentimento: "aceito" });
    await page.goto(`${base}/index.html`);
    await page.waitForTimeout(500);

    await page.click("#search-input");
    for (const c of "duna") {
      await page.keyboard.type(c);
      await page.waitForTimeout(420); // acima do debounce de 350ms, de propósito
    }
    await page.waitForTimeout(900);

    const buscas = (await lerEventos(page)).filter((e) => e.evento === "search");
    res.push(ok(buscas.length === 2,
      `digitar "duna" com pausas gera 2 eventos (dun + duna), não 4 — gerou ${buscas.length}: ${buscas.map((b) => b.props.search_term).join(", ")}`));

    // repetir a mesma consulta não conta de novo
    const antes = buscas.length;
    await page.click('#search-form button[type="submit"]');
    await page.waitForTimeout(700);
    const depois = (await lerEventos(page)).filter((e) => e.evento === "search").length;
    res.push(ok(depois === antes, `submeter a mesma consulta não gera evento novo (${antes} -> ${depois})`));
    errosTodos.push(...erros);
    await ctx.close();
  }

  // ---------- 5) e-mail no campo de busca não é enviado ----------
  {
    const { ctx, page, erros } = await novaPagina(browser, { consentimento: "aceito" });
    await page.goto(`${base}/index.html`);
    await page.waitForTimeout(400);
    await page.fill("#search-input", "fulano@gmail.com");
    await page.click('#search-form button[type="submit"]');
    await page.waitForTimeout(800);
    const busca = (await lerEventos(page)).find((e) => e.evento === "search");
    res.push(ok(busca && !("search_term" in busca.props),
      `search_term com @ é descartado (props: ${busca && JSON.stringify(busca.props)})`));
    errosTodos.push(...erros);
    await ctx.close();
  }

  // ---------- 6) ESCOLHER: a origem da entrada ----------
  for (const [qs, esperado] of [["?de=nav", "nav"], ["?de=card", "card"], ["", "direto"], ["?de=hack", "direto"]]) {
    const { ctx, page, erros } = await novaPagina(browser, { consentimento: "aceito" });
    await page.goto(`${base}/descobrir.html${qs}`);
    await page.waitForTimeout(900);
    const ab = (await lerEventos(page)).find((e) => e.evento === "escolher_aberto");
    res.push(ok(ab && ab.props.origem === esperado,
      `descobrir.html${qs || " (sem param)"} -> origem ${esperado} (veio ${ab && JSON.stringify(ab.props.origem)})`));
    errosTodos.push(...erros);
    await ctx.close();
  }

  // ---------- 6b) ESCOLHER: a lista de streamings virou quantidade ----------
  {
    const { ctx, page, erros } = await novaPagina(browser, { consentimento: "aceito" });
    await page.goto(`${base}/descobrir.html`);
    await page.waitForTimeout(1200);
    const ver = (await lerEventos(page)).find((e) => e.evento === "escolha_ver_opcoes");
    res.push(ok(ver && typeof ver.props.providers_qtd === "number",
      `escolha_ver_opcoes manda providers_qtd como numero (props: ${ver && JSON.stringify(ver.props)})`));
    res.push(ok(ver && !("providers" in ver.props),
      "a lista concatenada de streamings nao e mais enviada"));
    res.push(ok(ver && typeof ver.props.mediaType === "string",
      "os outros filtros continuam indo (mediaType)"));
    errosTodos.push(...erros);
    await ctx.close();
  }

  // ---------- 7) ESCOLHER: os links da home levam o parâmetro ----------
  {
    const { ctx, page } = await novaPagina(browser, { consentimento: "aceito" });
    await page.goto(`${base}/index.html`);
    await page.waitForTimeout(400);
    const hrefs = await page.$$eval('a[href*="descobrir.html"]', (as) => as.map((a) => a.getAttribute("href")));
    res.push(ok(hrefs.includes("descobrir.html?de=nav"), `pílula do menu leva ?de=nav (achei: ${hrefs.join(" | ")})`));
    res.push(ok(hrefs.includes("descobrir.html?de=card"), "botão do card leva ?de=card"));
    await ctx.close();
  }

  // ---------- 8) CADASTRO: conta nova = sign_up ----------
  {
    const { ctx, page, erros } = await novaPagina(browser, { consentimento: "aceito", cadastro: { isNewUser: true } });
    await page.goto(`${base}/cadastro.html`);
    await page.waitForTimeout(500);
    await page.click("#btn-google");
    await page.waitForTimeout(700);

    const ev = await lerEventos(page);
    res.push(ok(ev.some((e) => e.evento === "cadastro_intencao"), "clique no Google -> cadastro_intencao"));
    const su = ev.find((e) => e.evento === "sign_up");
    res.push(ok(!!su, `conta nova -> sign_up (eventos: ${ev.map((e) => e.evento).join(", ")})`));
    res.push(ok(su && su.props.method === "google", "sign_up com method=google"));
    res.push(ok(!ev.some((e) => e.evento === "login"), "conta nova NÃO dispara login"));

    // completa o onboarding
    await page.click(".avatar-opt");
    await page.click("#genero-grid .chip");
    await page.waitForTimeout(200);
    const salvarAtivo = await page.isEnabled("#btn-salvar-perfil");
    if (salvarAtivo) {
      await page.click("#btn-salvar-perfil");
      await page.waitForTimeout(600);
      const ev2 = await lerEventos(page);
      res.push(ok(ev2.some((e) => e.evento === "cadastro_onboarding_concluido"),
        "salvar avatar + gênero -> cadastro_onboarding_concluido"));
    } else {
      res.push(ok(false, "não consegui habilitar o botão salvar no teste (seletor de gênero)"));
    }
    errosTodos.push(...erros);
    await ctx.close();
  }

  // ---------- 9) CADASTRO: quem volta = login ----------
  {
    const { ctx, page, erros } = await novaPagina(browser, { consentimento: "aceito", cadastro: { isNewUser: false } });
    await page.goto(`${base}/cadastro.html`);
    await page.waitForTimeout(500);
    await page.click("#btn-google");
    await page.waitForTimeout(700);
    const ev = await lerEventos(page);
    res.push(ok(ev.some((e) => e.evento === "login"), `usuário existente -> login (eventos: ${ev.map((e) => e.evento).join(", ")})`));
    res.push(ok(!ev.some((e) => e.evento === "sign_up"), "usuário existente NÃO dispara sign_up"));
    errosTodos.push(...erros);
    await ctx.close();
  }

  // ---------- 10) o banner no celular ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
    const page = await ctx.newPage();
    await page.route("**googletagmanager.com/**", (r) => r.fulfill({ status: 200, body: "" }));
    await page.route("**/api.themoviedb.org/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await page.route("**/image.tmdb.org/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG }));
    await page.goto(`${base}/index.html`);
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const b = document.getElementById("pf-consentimento");
      if (!b) return null;
      const r = b.getBoundingClientRect();
      const btns = [...b.querySelectorAll("button")].map((x) => x.getBoundingClientRect().height);
      return { dentro: r.left >= 0 && r.right <= window.innerWidth, alturaBotoes: btns,
               scrollH: document.documentElement.scrollWidth, janela: window.innerWidth };
    });
    res.push(ok(m && m.dentro, `banner cabe em 390px (${m && JSON.stringify(m)})`));
    res.push(ok(m && m.alturaBotoes.every((h) => h >= 40), `botões com 40px+ de altura (${m && m.alturaBotoes})`));
    res.push(ok(m && m.scrollH <= m.janela, "sem rolagem horizontal em 390px"));
    await ctx.close();
  }


  // ---------- 11) EXCLUSAO DE CONTA ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
    const page = await ctx.newPage();
    const erros = [];
    page.on("pageerror", (e) => erros.push("PAGEERROR: " + e.message));

    await page.addInitScript(() => {
      try { localStorage.setItem("pf_consentimento", "aceito"); } catch (e) {}
    });
    await page.route("**googletagmanager.com/**", (r) =>
      r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
    await page.route("**qrserver.com/**", (r) => r.fulfill({ status: 200, body: "" }));
    await page.route("**gstatic.com/firebasejs/**", (r) =>
      r.fulfill({ status: 200, contentType: "text/javascript", body: "window.firebase={};" }));
    await page.route("**/assets/js/firebase-config.js", (r) =>
      r.fulfill({ status: 200, contentType: "text/javascript", body: "window.fbDb={};window.fbAuth={};" }));

    /* Firestore de mentira que registra a ordem exata das operacoes. */
    await page.route("**/assets/js/auth.js", async (route) => {
      const real = await route.fetch();
      const fonte = await real.text();
      const dubles = `
/* sessionStorage porque a pagina navega no fim e leva junto qualquer
   variavel de window. */
window.__reg = (x) => {
  const a = JSON.parse(sessionStorage.getItem("__ordem") || "[]");
  a.push(x);
  sessionStorage.setItem("__ordem", JSON.stringify(a));
};
sessionStorage.removeItem("__ordem");
window.__usuario = {
  uid: "u1", displayName: "Teste", photoURL: "",
  delete: async () => { window.__reg("auth.delete"); },
};
/* embrulha o pfTrack para registrar o evento no mesmo lugar */
const __track = window.pfTrack;
window.pfTrack = function (e, props) {
  window.__reg("track:" + e + ":" + JSON.stringify(props || {}));
  return __track.apply(null, arguments);
};
const favs = [{ ref: { id: "f1" } }, { ref: { id: "f2" } }, { ref: { id: "f3" } }];
const avs  = [{ ref: { id: "a1" } }];
window.fbDb = {
  batch: () => {
    const ops = [];
    return {
      delete: (ref) => ops.push(ref.id),
      commit: async () => { window.__reg("lote:" + ops.join(",")); },
    };
  },
  collection: (nome) => ({
    doc: (id) => ({
      collection: () => ({ get: async () => ({ docs: favs, size: favs.length }) }),
      delete: async () => { window.__reg("perfil.delete"); },
    }),
    where: () => ({ get: async () => ({ docs: avs, size: avs.length }) }),
  }),
};
function authOnStateChanged(cb) { cb(window.__usuario); }
async function authSignOut() {}
async function getUserProfile() {
  return { nome: "Teste", avatar: "\u{1F3AC}", generosFavoritos: ["Drama"], memberNumber: 7, memberSince: null, onboardingComplete: true };
}
function formatarMemberSince() { return "setembro de 2026"; }
`;
      /* apagarConta e apagarDadosDoUsuario continuam os reais - e o que se
         quer testar. Os dubles vem depois no mesmo script: declaracao de
         funcao repetida, a ultima vence, sem precisar recortar o original. */
      route.fulfill({ status: 200, contentType: "text/javascript", body: fonte + dubles });
    });

    let redirecionou = false;
    await page.route(`${base}/index.html`, (r) => {
      redirecionou = true;
      /* Uma home falsa na MESMA origem: abortar a navegacao descarta o
         contexto e leva o sessionStorage junto; navegar de verdade o
         preserva, e e nele que o teste registrou o que aconteceu. */
      r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>home</title>" });
    });

    await page.goto(`${base}/carteirinha.html`);
    await page.waitForTimeout(700);

    res.push(ok(await page.isVisible("#btn-apagar"), "carteirinha tem o botao de apagar conta"));
    res.push(ok(!(await page.isVisible("#apagar-painel")),
      "o painel de confirmacao comeca escondido - um clique nao apaga nada"));

    await page.click("#btn-apagar");
    await page.waitForTimeout(200);
    res.push(ok(await page.isVisible("#apagar-painel"), "o primeiro clique so abre a confirmacao"));
    res.push(ok((await lerOrdem(page)).length === 0, "abrir a confirmacao nao apaga nada ainda"));

    await page.click("#btn-apagar-cancelar");
    await page.waitForTimeout(200);
    res.push(ok(!(await page.isVisible("#apagar-painel")), "cancelar fecha o painel"));
    res.push(ok((await lerOrdem(page)).length === 0, "cancelar nao apaga nada"));

    await page.click("#btn-apagar");
    await page.waitForTimeout(150);
    await page.click("#btn-apagar-confirmar");
    await page.waitForTimeout(900);

    const registro = await lerOrdem(page);
    const ordem = registro.filter((x) => !x.startsWith("track:"));
    res.push(ok(JSON.stringify(ordem) === JSON.stringify(["lote:f1,f2,f3", "lote:a1", "perfil.delete", "auth.delete"]),
      `ordem: favoritos, avaliacoes, perfil e so entao a conta (veio ${JSON.stringify(ordem)})`));
    res.push(ok(ordem.length > 0 && ordem[ordem.length - 1] === "auth.delete",
      "a autenticacao e a ultima - apaga-la antes deixaria os dados orfaos"));
    res.push(ok(redirecionou, "depois de apagar, manda a pessoa para a home"));

    const linhaEvento = registro.find((x) => x.startsWith("track:conta_excluida:"));
    res.push(ok(!!linhaEvento, `dispara conta_excluida (registro: ${JSON.stringify(registro)})`));
    const propsEvento = linhaEvento ? JSON.parse(linhaEvento.slice("track:conta_excluida:".length)) : {};
    res.push(ok(propsEvento.favoritos === 3 && propsEvento.avaliacoes === 1,
      `conta_excluida conta o que foi apagado (veio ${JSON.stringify(propsEvento)})`));

    errosTodos.push(...erros);
    await ctx.close();
  }

  // ---------- resultado ----------
  const falhas = res.filter((r) => !r.passou);
  console.log("");
  res.forEach((r) => console.log(`${r.passou ? "  ok  " : "FALHA "} ${r.msg}`));
  console.log(`\n${res.length - falhas.length}/${res.length} passaram`);
  if (errosTodos.length) {
    console.log("\nerros de console/página:");
    [...new Set(errosTodos)].forEach((e) => console.log("  -", e));
  }

  await browser.close();
  server.close();
  process.exit(falhas.length ? 1 : 0);
})();
