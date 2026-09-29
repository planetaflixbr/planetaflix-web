# Planeta Flix — Studio editorial (Sanity)

Projeto separado do site. O site continua sendo HTML estatico em
`planetaflix-web/`; este diretorio e so o painel de edicao.

- **Project ID:** `sku1yl2b`
- **Dataset:** `production` (publico — leitura sem token)
- **Endpoint de leitura:**
  `https://sku1yl2b.apicdn.sanity.io/v2025-02-19/data/query/production?query=...`

## Rodar localmente

```bash
cd studio
npm install
npm run dev        # http://localhost:3333
```

## Publicar o painel

```bash
npm run deploy     # vira https://planetaflix.sanity.studio
```

## O que existe aqui

| Arquivo | Para que serve |
|---|---|
| `sanity.config.js` | Configuracao do Studio (projeto, dataset, plugins) |
| `structure.js` | Menu do painel: rascunhos, publicados, por formato, editorias, autores |
| `schemas/documents/artigo.js` | O artigo — abas Conteudo, Titulos, Publicacao, SEO |
| `schemas/documents/autor.js` | Autor (nome, foto, bio, links) |
| `schemas/documents/categoria.js` | Editoria (nome, cor do selo, ordem no menu) |
| `schemas/objects/tmdbRef.js` | Referencia a um titulo pelo ID do TMDb |
| `schemas/objects/cardTitulo.js` | Card de titulo dentro do texto |
| `schemas/objects/videoYoutube.js` | Embed de YouTube com validacao de link |
| `schemas/objects/imagemLegenda.js` | Imagem com alt, legenda e credito |
| `schemas/objects/listaRanqueada.js` | Lista numerada (formato "lista") |
| `queries.js` | As consultas GROQ que o build do site usa |

## A regra que sustenta o resto

O artigo **nunca guarda dados do titulo** — so `tmdbId` + `mediaType`. Poster,
sinopse, nota e "onde assistir" sao buscados pelo `titleService` no cliente,
como no resto do site. Assim um card publicado em marco continua mostrando o
catalogo de hoje, e nao o de marco.

O caminho inverso tambem funciona: como o artigo declara os IDs que cita, a
ficha do titulo consegue perguntar "quem falou de mim?" (`ARTIGOS_POR_TITULO`)
e montar o bloco "Leia sobre" sem nenhum cadastro manual.

## Falta configurar no painel do Sanity (sanity.io/manage)

1. **CORS** — em *API > CORS origins*. O Sanity nao aceita curinga de porta
   (`localhost:*`); o `*` so vale em posicao de subdominio. Cadastre origem por
   origem:

   | Origem | Para que | Credenciais |
   |---|---|---|
   | `http://localhost:3333` | Studio em `sanity dev` | **sim** |
   | `http://localhost:5500` | site local no Live Server | nao |
   | `https://planetaflix.com` | producao | nao |
   | `https://www.planetaflix.com` | producao | nao |
   | `https://*.vercel.app` | previews da Vercel (aqui o curinga funciona) | nao |

   O `http://localhost:3333` costuma ja existir, criado junto com o projeto.
   As origens do site ficam **sem** credenciais: o dataset e publico e a
   leitura nao usa token.
2. **Webhook de publicacao** — em *API > Webhooks*, criar um webhook para o
   Deploy Hook da Vercel, com filtro `_type == "artigo"` e disparo em
   create/update/delete. E isso que faz o site se reconstruir quando um artigo
   e publicado.
