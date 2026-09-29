import { defineType, defineField } from "sanity";

/**
 * Referencia a um titulo do TMDb. O artigo guarda apenas o id e o tipo:
 * poster, sinopse, nota e onde assistir sao hidratados no cliente pelo
 * titleService, para nunca ficarem defasados dentro do texto.
 */
export default defineType({
  name: "tmdbRef",
  title: "Titulo (TMDb)",
  type: "object",
  fields: [
    defineField({
      name: "tmdbId",
      title: "ID no TMDb",
      type: "number",
      description:
        "Numero que aparece na URL do TMDb: themoviedb.org/movie/<ID>. Ex.: 872585",
      validation: (r) => r.required().integer().positive(),
    }),
    defineField({
      name: "mediaType",
      title: "Tipo",
      type: "string",
      options: {
        list: [
          { title: "Filme", value: "movie" },
          { title: "Serie", value: "tv" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "movie",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "rotulo",
      title: "Nome do titulo (apenas para o editor se achar)",
      type: "string",
      description:
        "Nao aparece no site. O nome exibido vem sempre do TMDb, em pt-BR.",
    }),
  ],
  preview: {
    select: { rotulo: "rotulo", id: "tmdbId", tipo: "mediaType" },
    prepare({ rotulo, id, tipo }) {
      return {
        title: rotulo || `TMDb #${id}`,
        subtitle: tipo === "tv" ? "Serie" : "Filme",
      };
    },
  },
});
