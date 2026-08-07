/*
 * PLANETA FLIX — Catálogo de exemplo (modo demonstração)
 * Usado automaticamente enquanto CONFIG.TMDB_KEY estiver vazio em config.js.
 * Assim que a chave for preenchida, tmdb.js passa a buscar dados reais e
 * este arquivo deixa de ser usado para busca/detalhe (fica só como fallback
 * de rede, caso a API do TMDb fique fora do ar por um instante).
 */
const MOCK_TITLES = [
  {
    id: "duna", mediaType: "movie", title: "Duna: Parte 2", year: "2024",
    genres: ["Ficção científica", "Aventura"], runtime: "2h 46min", ageRating: "14 anos",
    bg: "linear-gradient(160deg,#3a2b1a,#8a5a2a)",
    imdbRating: "8.5", rtRating: "92%", letterboxdSlug: "dune-part-two",
    synopsis: "Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família, equilibrando o amor de sua vida com o destino do universo conhecido.",
    where: [["Max", "#4c2fc9"], ["Prime Video", "#00a8e1"]],
    cast: [["Denis Villeneuve", "Direção"], ["Timothée Chalamet", "Elenco"], ["Zendaya", "Elenco"], ["Jon Spaihts", "Roteiro"]]
  },
  {
    id: "oppenheimer", mediaType: "movie", title: "Oppenheimer", year: "2023",
    genres: ["Drama", "Biografia"], runtime: "3h 00min", ageRating: "16 anos",
    bg: "linear-gradient(160deg,#1a2b3a,#2a5a8a)",
    imdbRating: "8.4", rtRating: "93%", letterboxdSlug: "oppenheimer-2023",
    synopsis: "A história do físico J. Robert Oppenheimer e seu papel no desenvolvimento da bomba atômica durante a Segunda Guerra Mundial.",
    where: [["Prime Video", "#00a8e1"], ["Telecine", "#e50914"]],
    cast: [["Christopher Nolan", "Direção"], ["Cillian Murphy", "Elenco"], ["Emily Blunt", "Elenco"], ["Christopher Nolan", "Roteiro"]]
  },
  {
    id: "bridgerton", mediaType: "tv", title: "Bridgerton", year: "2020–",
    genres: ["Romance", "Drama"], runtime: "Série", ageRating: "14 anos",
    bg: "linear-gradient(160deg,#3a1a2b,#8a2a5a)",
    imdbRating: "7.3", rtRating: "78%", letterboxdSlug: "bridgerton",
    synopsis: "Ambientada na sociedade da alta aristocracia regencial inglesa, a série acompanha os oito irmãos Bridgerton em sua busca por amor e felicidade.",
    where: [["Netflix", "#e50914"]],
    cast: [["Shonda Rhimes", "Produção"], ["Nicola Coughlan", "Elenco"], ["Jonathan Bailey", "Elenco"], ["Chris Van Dusen", "Roteiro"]]
  },
  {
    id: "lastofus", mediaType: "tv", title: "The Last of Us", year: "2023–",
    genres: ["Drama", "Suspense"], runtime: "Série", ageRating: "18 anos",
    bg: "linear-gradient(160deg,#1a3a2b,#2a8a5a)",
    imdbRating: "8.7", rtRating: "96%", letterboxdSlug: "the-last-of-us",
    synopsis: "Vinte anos após uma pandemia moderna devastar a civilização, Joel é contratado para escoltar Ellie, uma garota de 14 anos, por um perigoso território pós-apocalíptico.",
    where: [["Max", "#4c2fc9"]],
    cast: [["Craig Mazin", "Roteiro"], ["Pedro Pascal", "Elenco"], ["Bella Ramsey", "Elenco"], ["Neil Druckmann", "Roteiro"]]
  },
  {
    id: "poorthings", mediaType: "movie", title: "Pobres Criaturas", year: "2023",
    genres: ["Comédia", "Drama"], runtime: "2h 21min", ageRating: "18 anos",
    bg: "linear-gradient(160deg,#2b1a3a,#5a2a8a)",
    imdbRating: "8.0", rtRating: "92%", letterboxdSlug: "poor-things-2023",
    synopsis: "A incrível história de Bella Baxter, uma jovem trazida de volta à vida pelo cientista Dr. Godwin Baxter, que embarca em uma jornada de autodescoberta.",
    where: [["Star+", "#0b0b0b"], ["Disney+", "#113ccf"]],
    cast: [["Yorgos Lanthimos", "Direção"], ["Emma Stone", "Elenco"], ["Tony McNamara", "Roteiro"]]
  },
  {
    id: "barbie", mediaType: "movie", title: "Barbie", year: "2023",
    genres: ["Comédia", "Fantasia"], runtime: "1h 54min", ageRating: "12 anos",
    bg: "linear-gradient(160deg,#3a1a2e,#c94fae)",
    imdbRating: "6.8", rtRating: "88%", letterboxdSlug: "barbie",
    synopsis: "Barbie sofre uma crise existencial que a leva a deixar Barbie Land e ir para o mundo real em busca de felicidade verdadeira.",
    where: [["Max", "#4c2fc9"]],
    cast: [["Greta Gerwig", "Direção"], ["Margot Robbie", "Elenco"], ["Ryan Gosling", "Elenco"]]
  }
];

const MOCK_PEOPLE = [
  { id: "nolan", name: "Christopher Nolan", role: "Diretor, Roteirista, Produtor", filmoIds: ["oppenheimer"] },
  { id: "murphy", name: "Cillian Murphy", role: "Ator", filmoIds: ["oppenheimer"] },
  { id: "villeneuve", name: "Denis Villeneuve", role: "Diretor", filmoIds: ["duna"] }
];

function findMockTitleById(id) {
  return MOCK_TITLES.find(t => t.id === id);
}
function findMockPersonById(id) {
  return MOCK_PEOPLE.find(p => p.id === id);
}
function searchMock(query) {
  const q = query.trim().toLowerCase();
  if (!q) return { titles: [], people: [] };
  return {
    titles: MOCK_TITLES.filter(t => t.title.toLowerCase().includes(q)),
    people: MOCK_PEOPLE.filter(p => p.name.toLowerCase().includes(q)),
  };
}
