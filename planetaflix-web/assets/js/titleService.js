/*
 * PLANETA FLIX — Camada de serviço
 * Decide, de forma transparente para as páginas, se os dados vêm do TMDb/OMDb
 * (modo real) ou do catálogo de exemplo (modo demonstração). As páginas
 * (index.html, titulo.html, pessoa.html) só chamam as funções abaixo — nunca
 * tmdb.js/omdb.js ou data.js diretamente. Isso permite ligar as APIs reais
 * editando só o config.js.
 */

function isDemoMode() {
  return !tmdbEnabled();
}

/* ---------- Home em blocos ---------- */

const ITENS_POR_BLOCO = 10;

/* Blocos são janelas sobre o mesmo acervo, não gavetas: um título pode ser
   lançamento e estar entre os mais populares do ano ao mesmo tempo, e esconder
   isso deixaria o bloco "Mais populares" sem os títulos mais populares.
   O único par que se contradiz de verdade é Lançamentos x Catálogo — um filme
   não pode ser novidade e acervo antigo —, e é só esse vínculo que existe aqui. */
const EXCLUSAO_ENTRE_BLOCOS = { catalogo: ["lancamentos"] };
const exibidosPorBloco = {};
const chaveTitulo = t => `${t.mediaType}-${t.id}`;

async function svcBlocoHome(bloco, mediaType) {
  if (isDemoMode()) return blocoMock(bloco, mediaType);
  try {
    const itens = await tmdbBlocoHome(bloco, mediaType);

    const proibidos = new Set();
    (EXCLUSAO_ENTRE_BLOCOS[bloco] || []).forEach(outro => {
      (exibidosPorBloco[outro] || []).forEach(k => proibidos.add(k));
    });

    // Sem cartaz o card vira um retângulo escuro com o nome — comum em títulos
    // ainda não lançados, que é justamente o bloco "Em breve".
    const escolhidos = itens
      .filter(t => t.poster)
      .filter(t => !proibidos.has(chaveTitulo(t)))
      .slice(0, ITENS_POR_BLOCO);

    exibidosPorBloco[bloco] = (exibidosPorBloco[bloco] || [])
      .concat(escolhidos.map(chaveTitulo));
    return escolhidos;
  } catch (e) {
    console.warn(`TMDb indisponível no bloco "${bloco}" (${mediaType}), usando catálogo de exemplo.`, e);
    return blocoMock(bloco, mediaType);
  }
}

/* O catálogo de exemplo guarda só o ano, não a data de lançamento, então no
   modo demonstração os blocos são fatias fixas do mock: servem para conferir o
   layout, não a regra de cada bloco. */
function blocoMock(bloco, mediaType) {
  const ordem = { lancamentos: 0, populares: 1, comentados: 2, embreve: 3, catalogo: 4 };
  const i = ordem[bloco] !== undefined ? ordem[bloco] : 0;
  const doTipo = MOCK_TITLES.filter(t => t.mediaType === mediaType);
  if (!doTipo.length) return [];
  const tam = Math.max(2, Math.ceil(doTipo.length / 5));
  const fatia = doTipo.slice(i * tam, i * tam + tam);
  return (fatia.length ? fatia : doTipo.slice(0, tam)).map(t => ({ ...t, poster: null }));
}

function letterboxdUrl(slug) {
  return slug ? `https://letterboxd.com/film/${slug}/` : "https://letterboxd.com/";
}
