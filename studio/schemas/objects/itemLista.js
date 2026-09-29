import { defineType, defineField } from "sanity";

/** Item de uma lista ranqueada (formato "lista"). */
export default defineType({
  name: "itemLista",
  title: "Item da lista",
  type: "object",
  fields: [
    defineField({
      name: "titulo",
      title: "Titulo (TMDb)",
      type: "tmdbRef",
      description: "Deixe em branco se o item nao for um filme ou serie.",
    }),
    defineField({
      name: "rotulo",
      title: "Nome do item",
      type: "string",
      description:
        "Usado quando o item nao vem do TMDb. Se houver titulo TMDb, o nome vem de la.",
    }),
    defineField({
      name: "texto",
      title: "Comentario",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }] }],
    }),
  ],
  preview: {
    select: { rotulo: "rotulo", id: "titulo.tmdbId", cache: "titulo.rotulo" },
    prepare({ rotulo, id, cache }) {
      return { title: rotulo || cache || (id ? `TMDb #${id}` : "Item") };
    },
  },
});
