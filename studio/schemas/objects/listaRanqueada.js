import { defineType, defineField } from "sanity";

export default defineType({
  name: "listaRanqueada",
  title: "Lista numerada",
  type: "object",
  fields: [
    defineField({
      name: "ordemCrescente",
      title: "Contagem regressiva (do ultimo para o primeiro)",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "itens",
      title: "Itens",
      type: "array",
      of: [{ type: "itemLista" }],
      validation: (r) => r.min(2),
    }),
  ],
  preview: {
    select: { itens: "itens" },
    prepare({ itens }) {
      return { title: `Lista numerada (${(itens || []).length} itens)` };
    },
  },
});
