import { defineType, defineField } from "sanity";

export default defineType({
  name: "categoria",
  title: "Editoria",
  type: "document",
  fields: [
    defineField({
      name: "nome",
      title: "Nome",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "nome", maxLength: 60 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "descricao",
      title: "Descricao",
      type: "text",
      rows: 2,
      description: "Aparece no topo da pagina da editoria.",
      validation: (r) => r.max(200),
    }),
    defineField({
      name: "cor",
      title: "Cor do selo",
      type: "string",
      options: {
        list: [
          { title: "Turquesa", value: "turquesa" },
          { title: "Verde escuro", value: "verde-escuro" },
          { title: "Dourado", value: "dourado" },
        ],
      },
      initialValue: "turquesa",
    }),
    defineField({
      name: "ordem",
      title: "Ordem no menu",
      type: "number",
      initialValue: 10,
    }),
  ],
  orderings: [
    { title: "Ordem no menu", name: "ordem", by: [{ field: "ordem", direction: "asc" }] },
  ],
  preview: { select: { title: "nome", subtitle: "descricao" } },
});
