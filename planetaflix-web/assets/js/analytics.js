/*
 * PLANETA FLIX — Medição (GA4) com consentimento
 * ----------------------------------------------
 * Contrato: as páginas chamam SOMENTE pfTrack(evento, props). Nada de gtag
 * espalhado pelo código, pelo mesmo motivo do titleService: um lugar só para
 * trocar de ferramenta.
 *
 * LGPD: o gtag.js NÃO é carregado antes do aceite. Enquanto a pessoa não
 * decide, os eventos ficam numa fila em memória — nada sai do navegador e
 * nada é gravado em disco. No aceite, a fila é enviada; na recusa, ela é
 * descartada e nada mais é medido, nesta nem nas próximas visitas.
 *
 * O ID de medição é público: ele aparece no HTML de qualquer site com GA4.
 * É o mesmo que o Firebase criou (firebase-config.js, measurementId).
 */

const PF_MEDICAO_ID = "G-EH9HLLYG13";

/* Container do GTM. Ele NÃO deve conter tag de configuração do GA4: o GA4 já
   é carregado aqui, e as duas coisas juntas contam cada page_view e cada
   evento duas vezes — sem erro visível, só o número dobrado. O container
   existe para pixels de anúncio e tags de terceiros. */
const PF_GTM_ID = "GTM-PF2W5X4W";
const PF_CHAVE_CONSENTIMENTO = "pf_consentimento";
const PF_FILA_MAXIMA = 50;

/* Limites do GA4: nome de parâmetro até 40 caracteres, valor até 100. Passar
   disso não dá erro visível — o parâmetro simplesmente não chega. */
const GA_LIMITE_VALOR = 100;

let pfFila = [];
let pfGtagCarregado = false;
let pfGtmCarregado = false;

/* localStorage falha em navegação anônima e com cookies bloqueados. Nunca
   deixar isso derrubar a página, e tratar a falha como "ainda não decidiu". */
function pfLerConsentimento() {
  try {
    return localStorage.getItem(PF_CHAVE_CONSENTIMENTO);
  } catch (e) {
    return null;
  }
}

function pfGravarConsentimento(valor) {
  try {
    localStorage.setItem(PF_CHAVE_CONSENTIMENTO, valor);
  } catch (e) {
    /* segue sem lembrar: o banner reaparece na próxima visita */
  }
}

function pfCarregarGtag() {
  if (pfGtagCarregado) return;
  pfGtagCarregado = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", PF_MEDICAO_ID);

  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + PF_MEDICAO_ID;
  document.head.appendChild(s);
}

/* Mesmo snippet que o painel do GTM entrega, só que atrás do consentimento.
   O <noscript> com iframe do snippet oficial foi deixado de fora de propósito:
   ele serve para navegador sem JavaScript, e sem JavaScript não existe home,
   busca nem Escolher — não mediria nada de útil, e um iframe não pode ficar
   atrás do banner. */
function pfCarregarGtm() {
  if (pfGtmCarregado) return;
  pfGtmCarregado = true;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtm.js?id=" + PF_GTM_ID;
  document.head.appendChild(s);
}

/* GA4 e GTM compartilham o mesmo window.dataLayer, o que é esperado. */
function pfCarregarMedicao() {
  pfCarregarGtag();
  pfCarregarGtm();
}

/* Corta valores longos e descarta o que parecer identificável. O campo de
   busca é texto livre: alguém pode digitar um e-mail ali, e mandar isso para
   o GA4 viola a política da própria ferramenta. */
function pfLimparValor(v) {
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  if (s.includes("@")) return undefined;
  return s.length > GA_LIMITE_VALOR ? s.slice(0, GA_LIMITE_VALOR) : s;
}

function pfLimparProps(props) {
  const saida = {};
  Object.keys(props || {}).forEach((k) => {
    const v = pfLimparValor(props[k]);
    if (v !== undefined) saida[k] = v;
  });
  return saida;
}

function pfEnviar(evento, props) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", evento, props);
}

/* A única função que o resto do site conhece. */
function pfTrack(evento, props = {}) {
  const limpos = pfLimparProps(props);
  const decisao = pfLerConsentimento();

  if (decisao === "recusado") return;

  if (decisao === "aceito") {
    pfCarregarMedicao();
    pfEnviar(evento, limpos);
    return;
  }

  /* ainda não decidiu: guarda em memória, com teto para não crescer sem fim */
  if (pfFila.length < PF_FILA_MAXIMA) pfFila.push([evento, limpos]);
}

function pfEsvaziarFila() {
  const fila = pfFila;
  pfFila = [];
  fila.forEach(([evento, props]) => pfEnviar(evento, props));
}

function pfDecidir(valor) {
  pfGravarConsentimento(valor);
  const banner = document.getElementById("pf-consentimento");
  if (banner) banner.remove();

  if (valor === "aceito") {
    pfCarregarMedicao();
    pfEsvaziarFila();
  } else {
    pfFila = [];
  }
}

/* O banner é montado aqui em vez de repetido no HTML das nove páginas. */
function pfMontarBanner() {
  const caixa = document.createElement("div");
  caixa.id = "pf-consentimento";
  caixa.setAttribute("role", "dialog");
  caixa.setAttribute("aria-label", "Aviso de cookies");
  caixa.innerHTML = [
    '<p>Usamos cookies para entender como o site é usado e melhorar as ',
    'recomendações. Nada é medido antes de você escolher.</p>',
    '<div class="pf-consentimento-botoes">',
    '<button type="button" id="pf-recusar">Recusar</button>',
    '<button type="button" id="pf-aceitar">Aceitar</button>',
    '</div>',
  ].join("");
  document.body.appendChild(caixa);
  document.getElementById("pf-aceitar").addEventListener("click", () => pfDecidir("aceito"));
  document.getElementById("pf-recusar").addEventListener("click", () => pfDecidir("recusado"));
}

/* Permite refazer a escolha — usar numa futura página de privacidade. */
function pfConsentimentoRefazer() {
  try { localStorage.removeItem(PF_CHAVE_CONSENTIMENTO); } catch (e) {}
  location.reload();
}

function initAnalytics() {
  const decisao = pfLerConsentimento();
  if (decisao === "aceito") {
    pfCarregarMedicao();
    pfEsvaziarFila();
    return;
  }
  if (decisao === "recusado") return;
  pfMontarBanner();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAnalytics);
} else {
  initAnalytics();
}
