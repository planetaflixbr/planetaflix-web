/**
 * Config do Sanity CLI — CommonJS de proposito.
 *
 * O CLI le este arquivo com require(), depois de registrar o esbuild-register.
 * Se o package.json tiver "type": "module", o Node >=22.12 trata a saida
 * transpilada (que usa require/exports) como ESM e estoura
 * "require is not defined in ES module scope" — o CLI engole o erro e reclama
 * de api.projectId ausente, que nao tem nada a ver com a causa.
 *
 * O template oficial do Sanity (createPackageManifest, no @sanity/cli) nao
 * inclui "type": "module" justamente por isso. Nao readicione.
 *
 * Os outros arquivos (sanity.config.js, structure.js, schemas/) seguem em ESM:
 * quem carrega aqueles eh o Vite, que faz o interop por conta propria.
 */
module.exports = {
  api: { projectId: "sku1yl2b", dataset: "production" },
  // hostname do Studio publicado: https://planetaflix.sanity.studio
  studioHost: "planetaflix",
};
