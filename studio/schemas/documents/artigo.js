import { defineType, defineField, defineArrayMember } from "sanity";

export const FORMATOS = [
  { title: "Noticia", value: "noticia" },
  { title: "Lista", value: "lista" },
  { title: "Critica", value: "critica" },
  { title: "Guia", value: "guia" },
];

export default defineType({
  name: "artigo",
  title: "Artigo",
  type: "document",
  groups: [
    { name: "conteudo", title: "Conteudo", default: true },
    { name: "titulos", title: "Titulos" },
    { name: "publicacao", title: "Publicacao" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "titulo",
      title: "Titulo",
      type: "string",
      group: "conteudo",
      validation: (r) => r.required().max(110),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "conteudo",
      options: { source: "titulo", maxLength: 80 },
      description: "Define a URL: planetaflix.com/artigo/<slug>",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "formato",
      title: "Formato",
      type: "string",
      group: "conteudo",
      options: { list: FORMATOS, layout: "radio" },
      initialValue: "noticia",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "chamada",
      title: "Chamada",
      type: "text",
      rows: 3,
      group: "conteudo",
      description:
        "Uma ou duas frases. Aparece abaixo do titulo, nos cards e como descricao na busca.",
      validation: (r) => r.required().max(220),
    }),
    defineField({
      name: "capa",
      title: "Capa",
      type: "imagemLegenda",
      group: "conteudo",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "corpo",
      title: "Corpo",
      type: "array",
      group: "conteudo",
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            { title: "Paragrafo", value: "normal" },
            { title: "Intertitulo", value: "h2" },
            { title: "Subtitulo", value: "h3" },
            { title: "Destaque", value: "blockquote" },
          ],
          lists: [
            { title: "Com marcadores", value: "bullet" },
            { title: "Numerada", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Negrito", value: "strong" },
              { title: "Italico", value: "em" },
            ],
            annotations: [
              {
                name: "link",
                title: "Link",
                type: "object",
                fields: [
                  {
                    name: "href",
                    title: "URL",
                    type: "url",
                    validation: (r) => r.required(),
                  },
                  {
                    name: "externo",
                    title: "Abrir em nova aba",
                    type: "boolean",
                    initialValue: false,
                  },
                ],
              },
              {
                name: "linkTitulo",
                title: "Link para ficha de titulo",
                type: "object",
                fields: [{ name: "titulo", title: "Titulo", type: "tmdbRef" }],
              },
            ],
          },
        }),
        defineArrayMember({ type: "imagemLegenda" }),
        defineArrayMember({ type: "videoYoutube" }),
        defineArrayMember({ type: "cardTitulo" }),
        defineArrayMember({ type: "listaRanqueada" }),
        defineArrayMember({ type: "citacao" }),
      ],
      validation: (r) => r.required().min(1),
    }),

    defineField({
      name: "titulosRelacionados",
      title: "Titulos citados",
      type: "array",
      group: "titulos",
      of: [defineArrayMember({ type: "tmdbRef" })],
      description:
        "Todo titulo listado aqui passa a mostrar este artigo no bloco 'Leia sobre' da ficha. Os cards no corpo do texto entram nesta lista automaticamente no build.",
    }),

    defineField({
      name: "autor",
      title: "Autor",
      type: "reference",
      group: "publicacao",
      to: [{ type: "autor" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "categorias",
      title: "Editorias",
      type: "array",
      group: "publicacao",
      of: [defineArrayMember({ type: "reference", to: [{ type: "categoria" }] })],
      validation: (r) => r.required().min(1).unique(),
    }),
    defineField({
      name: "publicadoEm",
      title: "Publicado em",
      type: "datetime",
      group: "publicacao",
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: "atualizadoEm",
      title: "Atualizado em",
      type: "datetime",
      group: "publicacao",
      description: "Preencha so quando o texto mudar depois de publicado.",
    }),
    defineField({
      name: "destaque",
      title: "Destacar na home",
      type: "boolean",
      group: "publicacao",
      initialValue: false,
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      group: "publicacao",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),

    defineField({ name: "seo", title: "SEO", type: "seo", group: "seo" }),
  ],

  orderings: [
    {
      title: "Mais recentes",
      name: "publicadoEmDesc",
      by: [{ field: "publicadoEm", direction: "desc" }],
    },
  ],

  preview: {
    select: {
      title: "titulo",
      formato: "formato",
      data: "publicadoEm",
      media: "capa",
      autor: "autor.nome",
    },
    prepare({ title, formato, data, media, autor }) {
      const rotulo = (FORMATOS.find((f) => f.value === formato) || {}).title || "";
      const dia = data
        ? new Date(data).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "sem data";
      return {
        title,
        media,
        subtitle: [rotulo, autor, dia].filter(Boolean).join(" · "),
      };
    },
  },
});
