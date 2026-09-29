import { defineType, defineField } from "sanity";

export default defineType({
  name: "citacao",
  title: "Citacao",
  type: "object",
  fields: [
    defineField({
      name: "texto",
      title: "Texto",
      type: "text",
      rows: 3,
      validation: (r) => r.required().max(400),
    }),
    defineField({ name: "autor", title: "Quem disse", type: "string" }),
    defineField({ name: "contexto", title: "Cargo / onde disse", type: "string" }),
  ],
  preview: {
    select: { title: "texto", subtitle: "autor" },
  },
});
