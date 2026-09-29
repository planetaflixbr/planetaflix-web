import { defineType, defineField } from "sanity";

/** Card de titulo embutido no corpo do artigo. */
export default defineType({
  name: "cardTitulo",
  title: "Card de titulo",
  type: "object",
  fields: [
    defineField({
      name: "titulo",
      title: "Titulo",
      type: "tmdbRef",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "notaEditorial",
      title: "Nota do editor",
      type: "text",
      rows: 3,
      description:
        "Uma ou duas frases sobre por que esse titulo esta aqui. Opcional.",
      validation: (r) => r.max(280),
    }),
    defineField({
      name: "variante",
      title: "Formato do card",
      type: "string",
      options: {
        list: [
          { title: "Destaque (poster grande)", value: "destaque" },
          { title: "Em linha (compacto)", value: "inline" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "destaque",
    }),
  ],
  preview: {
    select: { rotulo: "titulo.rotulo", id: "titulo.tmdbId", nota: "notaEditorial" },
    prepare({ rotulo, id, nota }) {
      return { title: `Card: ${rotulo || `TMDb #${id}`}`, subtitle: nota };
    },
  },
});
