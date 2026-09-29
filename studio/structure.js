import { FORMATOS } from "./schemas/documents/artigo";

/**
 * Desk: rascunhos primeiro (o que o editor precisa ver ao abrir), depois
 * publicados por formato, e por fim os cadastros de apoio.
 */
export const estrutura = (S) =>
  S.list()
    .title("Planeta Flix")
    .items([
      S.listItem()
        .title("Rascunhos")
        .child(
          S.documentList()
            .title("Rascunhos")
            .filter('_type == "artigo" && _id in path("drafts.**")')
            .defaultOrdering([{ field: "_updatedAt", direction: "desc" }])
        ),
      S.listItem()
        .title("Publicados")
        .child(
          S.documentList()
            .title("Publicados")
            .filter('_type == "artigo" && !(_id in path("drafts.**"))')
            .defaultOrdering([{ field: "publicadoEm", direction: "desc" }])
        ),
      S.divider(),
      S.listItem()
        .title("Por formato")
        .child(
          S.list()
            .title("Por formato")
            .items(
              FORMATOS.map((f) =>
                S.listItem()
                  .title(f.title)
                  .child(
                    S.documentList()
                      .title(f.title)
                      .filter('_type == "artigo" && formato == $formato')
                      .params({ formato: f.value })
                      .defaultOrdering([
                        { field: "publicadoEm", direction: "desc" },
                      ])
                  )
              )
            )
        ),
      S.listItem()
        .title("Editorias")
        .child(S.documentTypeList("categoria").title("Editorias")),
      S.divider(),
      S.listItem()
        .title("Autores")
        .child(S.documentTypeList("autor").title("Autores")),
    ]);
