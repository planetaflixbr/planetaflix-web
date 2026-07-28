/*
 * PLANETA FLIX — Configuração de chaves de API
 * ---------------------------------------------
 * ÚNICO ARQUIVO que precisa ser editado para o site sair do modo demonstração
 * (dados de exemplo) e passar a usar dados reais do TMDb e OMDb.
 *
 * Como preencher:
 * 1) TMDB_KEY  -> Crie uma conta em https://www.themoviedb.org/signup,
 *                 depois vá em Configurações > API e copie a "API Key (v3 auth)".
 * 2) OMDB_KEY  -> Crie uma chave gratuita em https://www.omdbapi.com/apikey.aspx
 *                 (confirme pelo e-mail que a OMDb envia).
 *
 * Enquanto os campos abaixo estiverem vazios (""), o site funciona normalmente
 * usando o catálogo de exemplo em assets/js/data.js — ninguém vê tela quebrada.
 *
 * Aviso de segurança: como este é um site estático (sem servidor próprio),
 * estas chaves ficam visíveis no código-fonte do navegador. É o modelo padrão
 * de uso client-side do TMDb/OMDb e aceitável para o lançamento desta sexta.
 * Antes de escalar (Fase 2), migrar essas chamadas para uma função serverless
 * (ex.: Vercel Functions) que esconda as chaves é o próximo passo recomendado.
 */
const CONFIG = {
  TMDB_KEY: "",
  OMDB_KEY: "",
  TMDB_LANGUAGE: "pt-BR",
  WATCH_REGION: "BR",
};
