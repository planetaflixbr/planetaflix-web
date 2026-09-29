import { defineType, defineField } from "sanity";

export default defineType({
  name: "autor",
  title: "Autor",
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
    defineField({ name: "foto", title: "Foto", type: "image", options: { hotspot: true } }),
    defineField({
      name: "bio",
      title: "Mini bio",
      type: "text",
      rows: 3,
      validation: (r) => r.max(300),
    }),
    defineField({
      name: "links",
      title: "Links",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "rede", title: "Rede", type: "string" },
            { name: "url", title: "URL", type: "url" },
          ],
          preview: { select: { title: "rede", subtitle: "url" } },
        },
      ],
    }),
  ],
  preview: { select: { title: "nome", media: "foto" } },
});
