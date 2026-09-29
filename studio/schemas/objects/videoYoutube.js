import { defineType, defineField } from "sanity";

const RE_YT =
  /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/;

export default defineType({
  name: "videoYoutube",
  title: "Video do YouTube",
  type: "object",
  fields: [
    defineField({
      name: "url",
      title: "URL do video",
      type: "url",
      description: "Cole o link normal do YouTube (watch, shorts ou youtu.be).",
      validation: (r) =>
        r.required().custom((v) =>
          !v || RE_YT.test(v) ? true : "Link do YouTube invalido"
        ),
    }),
    defineField({ name: "legenda", title: "Legenda", type: "string" }),
    defineField({
      name: "inicioSegundos",
      title: "Comecar em (segundos)",
      type: "number",
      validation: (r) => r.min(0).integer(),
    }),
  ],
  preview: {
    select: { title: "legenda", subtitle: "url" },
    prepare({ title, subtitle }) {
      return { title: title || "Video do YouTube", subtitle };
    },
  },
});
