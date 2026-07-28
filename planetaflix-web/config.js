/*
 * PLANETA FLIX — Configuração de chaves de API
 * ---------------------------------------------
 * ÚNICO ARQUIVO que precisa ser editado para o site sair do modo demonstração
 * (dados de exemplo) e passar a usar dados reais do TMDb e OMDb.
 *
 * Aviso de segurança: como este é um site estático (sem servidor próprio),
 * estas chaves ficam visíveis no código-fonte do navegador. É o modelo padrão
 * de uso client-side do TMDb/OMDb e aceitável para o lançamento desta sexta.
 * Antes de escalar (Fase 2), migrar essas chamadas para uma função serverless
 * (ex.: Vercel Functions) que esconda as chaves é o próximo passo recomendado.
 */
const CONFIG = {
  TMDB_KEY: "f2860174faf8e7d62efa04132fb902f6",
  OMDB_KEY: "20f68bfc",
  TMDB_LANGUAGE: "pt-BR",
  WATCH_REGION: "BR",
};
