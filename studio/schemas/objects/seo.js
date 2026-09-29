import { defineType, defineField } from "sanity";

export default defineType({
  name: "seo",
  title: "SEO e compartilhamento",
  type: "object",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: "metaTitulo",
      title: "Titulo na busca",
      type: "string",
      description: "Ate 60 caracteres. Em branco, usa o titulo do artigo.",
      validation: (r) => r.max(60),
    }),
    defineField({
      name: "metaDescricao",
      title: "Descricao na busca",
      type: "text",
      rows: 2,
      description: "Ate 155 caracteres. Em branco, usa a chamada.",
      validation: (r) => r.max(155),
    }),
    defineField({
      name: "imagemCompartilhamento",
      title: "Imagem de compartilhamento",
      type: "image",
      description: "1200x630. Em branco, usa a capa.",
    }),
    defineField({
      name: "naoIndexar",
      title: "Nao indexar (noindex)",
      type: "boolean",
      initialValue: false,
    }),
  ],
});
