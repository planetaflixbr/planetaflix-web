# Planeta Flix — MVL v0 (site estático)

Site pronto para rodar em modo demonstração agora mesmo e virar dados reais assim que as chaves de API forem coladas em `config.js`. Sem build, sem npm, sem servidor próprio — HTML/CSS/JS puro.

## Estrutura do site

- **`index.html`** — landing page pública ("Planeta Flix, Plataforma de curadoria de conteúdo audiovisual"). É a página que TMDb e OMDb vão ver ao analisar o pedido de chave de API, e a porta de entrada para qualquer visitante enquanto o produto está em construção.
- **`app.html`** — a demonstração funcional: busca de título, ficha consolidada (sinopse, elenco, notas IMDb/Rotten Tomatoes via OMDb, link Letterboxd) e "onde assistir" no Brasil. Acessível pelo botão "Ver demonstração" na landing.
- **`titulo.html`** — ficha de cada título, aberta a partir da busca em `app.html`.

## O que já está pronto (feito por Claude)

- Landing page com a proposta de valor, para servir de URL nos cadastros de API e para visitantes em geral.
- Busca de título, ficha consolidada e "onde assistir" funcionando em `app.html`.
- Catálogo de exemplo (6 títulos) para o site funcionar hoje, sem depender de chave nenhuma.
- Integração real com TMDb e OMDb já escrita — liga automaticamente quando as chaves entrarem em `config.js`.
- Identidade visual aplicada (cores e fontes do manual de marca).

**Cortado de propósito do v0** (para reduzir risco até sexta): login/cadastro, watchlist e busca por pessoa. O código de busca por pessoa já existe parcialmente (`mapTmdbPerson` em `tmdb.js`), religar depois é rápido.

## Pendências suas (bloqueiam a integração real)

Isto é o que está no seu nome na matriz RACI — sem isso o site roda só em modo demonstração:

1. **Conta TMDb** → [themoviedb.org/signup](https://www.themoviedb.org/signup) → Configurações → API → copiar a "API Key (v3 auth)".
2. **Conta OMDb** → [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) → plano gratuito → confirmar pelo e-mail.
3. Colar as duas chaves em `config.js` (é o único arquivo que você precisa editar):
   ```js
   const CONFIG = {
     TMDB_KEY: "cole_aqui",
     OMDB_KEY: "cole_aqui",
     ...
   };
   ```
4. **Domínio no Registro.br** — já em andamento por você. Assim que estiver registrado, é só seguir a seção "Conectar o domínio" abaixo.
5. **Conta na Vercel** → [vercel.com/signup](https://vercel.com/signup) (pode entrar com GitHub/Google).
6. **Enviar o e-mail de solicitação de acesso à API do Letterboxd** — rascunho pronto no final deste arquivo. Envie do seu e-mail para `api@letterboxd.com` o quanto antes (aprovação pode demorar). Assim que a landing estiver no ar, preencha a URL no campo "Website" desse e-mail e também nos formulários de cadastro do TMDb/OMDb.

## Precisa de GitHub e Vercel?

- **Vercel: sim**, é onde o site vai ficar hospedado. Sem ele (ou outro host equivalente), não tem como colocar no ar.
- **GitHub: não é obrigatório.** Dá pra publicar direto (arrastar a pasta ou `vercel --prod` pelo terminal) sem repositório nenhum. GitHub só entra se você quiser controle de versão e deploy automático a cada alteração — recomendado a partir da Fase 2, dispensável para colocar a landing no ar agora.

## Como publicar (deploy)

Sem build — é literalmente subir estes arquivos. Duas formas:

**Opção A — arrastar e soltar (mais rápido, sem GitHub):**
1. Entre em [vercel.com/new](https://vercel.com/new).
2. Arraste a pasta `planetaflix-web` inteira para a área de upload.
3. Confirme o deploy. Pronto, já sai com uma URL pública (`algo.vercel.app`) — a landing (`index.html`) abre na raiz.
4. Siga para "Conectar o domínio" abaixo assim que o Registro.br confirmar o registro.

**Opção B — linha de comando (sem GitHub):**
```bash
cd planetaflix-web
npx vercel --prod
```
Siga as perguntas (login, nome do projeto). Como não há build, aceite as opções padrão.

**Opção C — GitHub + Vercel (deploy automático a cada mudança):**
1. Crie um repositório no GitHub e suba a pasta `planetaflix-web`.
2. Em [vercel.com/new](https://vercel.com/new), escolha "Import Git Repository" e conecte esse repositório.
3. Framework preset: "Other" (site estático, sem build command).
4. A partir daí, todo `git push` gera um novo deploy automaticamente.

Qualquer host de site estático funciona também (Netlify, Cloudflare Pages, GitHub Pages) — é só apontar para a pasta `planetaflix-web`.

## Conectar o domínio (Registro.br → Vercel)

1. No painel da Vercel, abra o projeto → **Settings → Domains → Add**.
2. Digite o domínio registrado no Registro.br (ex.: `planetaflix.com.br`) e confirme.
3. A Vercel vai mostrar os registros de DNS exatos para o seu domínio — **use os valores que aparecem na tela dela**, não valores de outros tutoriais (a Vercel atribui endereços diferentes por projeto). Normalmente é:
   - Um registro **A** para o domínio raiz (`@`) apontando para o IP mostrado.
   - Um registro **CNAME** para `www` apontando para `cname.vercel-dns.com`.
4. No painel do Registro.br, vá em **"Meus domínios" → selecione o domínio → "DNS" / "Editar Zona DNS"** e cadastre esses dois registros exatamente como a Vercel indicou.
5. Volte para a Vercel — assim que o DNS propagar (geralmente 15-30 min, pode levar até 48h), o domínio aparece como "Valid Configuration" e o certificado HTTPS é emitido automaticamente.
6. Repita para o `www` se quiser que `www.planetaflix.com.br` também funcione (redirecionamento automático).

## Testar localmente antes de publicar

Não precisa de nada instalado além de um navegador. Duas formas simples:
- Abrir `index.html` (landing) ou `app.html` (demonstração) direto no navegador — funciona no modo demonstração; buscas reais ao TMDb podem ser bloqueadas por CORS ao abrir como arquivo local — se isso acontecer, use a opção abaixo.
- Rodar um servidor local simples: `python3 -m http.server 8000` dentro da pasta `planetaflix-web` e abrir `http://localhost:8000`.

## Avisos importantes

- **Chaves de API ficam visíveis no navegador** — é o modelo padrão de uso client-side do TMDb/OMDb e está OK para o lançamento de sexta. Antes de escalar (Fase 2), migrar essas chamadas para uma função serverless que esconda as chaves é o próximo passo recomendado.
- **Link do Letterboxd é um "melhor palpite"**: construímos a URL a partir do título original do TMDb, mas sem a API própria do Letterboxd aprovada, alguns links podem não resolver perfeitamente. Isso já está sinalizado no roadmap (seção 6) como risco conhecido.
- Se o TMDb ou o OMDb ficarem fora do ar por um instante, o site cai automaticamente de volta no catálogo de exemplo em vez de mostrar tela quebrada.

## Rascunho do e-mail — acesso à API do Letterboxd

Envie do seu e-mail para **api@letterboxd.com**, assunto: `API Access Request — Planeta Flix`

```
Hi Letterboxd team,

My name is Ricardo Di Lello Freitas and I'm building Planeta Flix, a content
curation platform (Brazil) that consolidates critic/audience ratings, cast and
crew information, and streaming availability for movies and TV shows into a
single view per title.

We'd like to request API access to display Letterboxd ratings alongside our
other data sources (TMDb, OMDb) on each title's page, with proper attribution
and a link back to the title's Letterboxd page.

Project: Planeta Flix
Stage: MVP / early launch
Intended use: read-only access to film ratings and metadata for display purposes
Website: [adicionar URL assim que estiver no ar]

Happy to share more details about the product or usage volume if helpful.

Thank you,
Ricardo Di Lello Freitas
rdilellofreitas@gmail.com
```
