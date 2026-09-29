import { defineType, defineField } from "sanity";

export default defineType({
  name: "imagemLegenda",
  title: "Imagem",
  type: "image",
  options: { hotspot: true },
  fields: [
    defineField({
      name: "alt",
      title: "Texto alternativo",
      type: "string",
      description:
        "Descreve a imagem para quem usa leitor de tela. Obrigatorio.",
      validation: (r) => r.required().max(160),
    }),
    defineField({ name: "legenda", title: "Legenda", type: "string" }),
    defineField({
      name: "credito",
      title: "Credito",
      type: "string",
      description: "Fonte ou fotografo. Ex.: Divulgacao/Netflix",
    }),
  ],
  preview: {
    select: { media: "asset", title: "legenda", subtitle: "credito" },
  },
});
