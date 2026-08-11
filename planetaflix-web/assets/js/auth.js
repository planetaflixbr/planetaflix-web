/*
 * PLANETA FLIX — Autenticação e perfil (Firebase Auth + Firestore)
 * -------------------------------------------------------------
 * Depende de firebase-config.js já ter sido carregado (define fbAuth, fbDb).
 * Padrão de acesso: cada usuário só le/escreve o próprio documento em
 * users/{uid} — reforçado pelas Regras de Segurança do Firestore.
 */

const GENEROS_DISPONIVEIS = [
  "Ficção científica", "Drama", "Comédia", "Terror",
  "Romance", "Documentário", "Ação", "Animação",
];

const AVATARES_DISPONIVEIS = ["🎬", "🍿", "🎭", "👾", "🦇", "🌌", "🎥", "🧟"];

function authSignInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  return fbAuth.signInWithPopup(provider);
}

function authSignOut() {
  return fbAuth.signOut();
}

function authOnStateChanged(callback) {
  return fbAuth.onAuthStateChanged(callback);
}

/*
 * Gera um número de sócio sequencial e único, usando uma transação
 * atômica sobre contadores/membros — evita números repetidos mesmo com
 * cadastros simultâneos.
 */
async function proximoNumeroDeMembro() {
  const counterRef = fbDb.collection("contadores").doc("membros");
  const novoNumero = await fbDb.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    const atual = doc.exists ? (doc.data().total || 0) : 0;
    const proximo = atual + 1;
    t.set(counterRef, { total: proximo }, { merge: true });
    return proximo;
  });
  return novoNumero;
}

/*
 * Garante que existe um documento users/{uid}. Se for a primeira vez do
 * usuário, cria o documento com onboardingComplete=false (o cadastro.html
 * então pede avatar + gêneros favoritos antes de liberar a carteirinha).
 * Retorna { profile, isNewUser }.
 */
async function ensureUserProfile(user) {
  const ref = fbDb.collection("users").doc(user.uid);
  const snap = await ref.get();

  if (snap.exists) {
    return { profile: snap.data(), isNewUser: false };
  }

  const memberNumber = await proximoNumeroDeMembro();
  const novoPerfil = {
    nome: user.displayName || "Cinéfilo Planeta Flix",
    email: user.email || null,
    fotoGoogle: user.photoURL || null,
    avatar: null,
    generosFavoritos: [],
    onboardingComplete: false,
    memberNumber: memberNumber,
    memberSince: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(novoPerfil);
  const salvo = await ref.get();
  return { profile: salvo.data(), isNewUser: true };
}

async function getUserProfile(uid) {
  const snap = await fbDb.collection("users").doc(uid).get();
  return snap.exists ? snap.data() : null;
}

async function updateUserProfile(uid, dados) {
  await fbDb.collection("users").doc(uid).set(dados, { merge: true });
}

function formatarMemberSince(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  const data = timestamp.toDate();
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/*
 * Favoritos / watchlist pessoal — subcoleção users/{uid}/favoritos.
 * Cada documento é identificado por "{mediaType}_{id}" (ex.: "movie_27205"),
 * evitando duplicidade e permitindo checar/alternar o status com um único get/set.
 */
function favoritoRef(uid, mediaType, id) {
  return fbDb.collection("users").doc(uid).collection("favoritos").doc(`${mediaType}_${id}`);
}

async function addFavorito(uid, titulo) {
  await favoritoRef(uid, titulo.mediaType, titulo.id).set({
    mediaType: titulo.mediaType,
    id: titulo.id,
    title: titulo.title,
    poster: titulo.poster || null,
    year: titulo.year || null,
    addedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function removeFavorito(uid, mediaType, id) {
  await favoritoRef(uid, mediaType, id).delete();
}

async function isFavorito(uid, mediaType, id) {
  const snap = await favoritoRef(uid, mediaType, id).get();
  return snap.exists;
}

/* Lista os favoritos do usuário, mais recentes primeiro. */
async function getFavoritos(uid) {
  const snap = await fbDb.collection("users").doc(uid).collection("favoritos").orderBy("addedAt", "desc").get();
  return snap.docs.map((d) => d.data());
}

/*
 * Avaliações da comunidade (nota Planeta Flix: estrelas + comentário).
 * Fica numa coleção de nível superior "avaliacoes" — diferente de favoritos,
 * aqui QUALQUER visitante precisa poder ler (nota média + comentários),
 * não só o autor. Um documento por usuário por título: "{mediaType}_{id}_{uid}",
 * reescrever o mesmo documento = usuário edita a própria avaliação.
 * IMPORTANTE: as Regras de Segurança do Firestore precisam liberar leitura
 * pública e escrita restrita ao dono (uid do documento) nesta coleção.
 */
function avaliacaoRef(mediaType, id, uid) {
  return fbDb.collection("avaliacoes").doc(`${mediaType}_${id}_${uid}`);
}

async function submitAvaliacao(uid, perfil, titulo, stars, comentario) {
  await avaliacaoRef(titulo.mediaType, titulo.id, uid).set({
    mediaType: titulo.mediaType,
    id: titulo.id,
    uid,
    nome: (perfil && perfil.nome) || "Cinéfilo Planeta Flix",
    avatar: (perfil && perfil.avatar) || "🎬",
    stars,
    comentario: comentario || "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

/* Todas as avaliações de um título. Ordenadas no cliente (não no Firestore)
   para não depender de um índice composto — a query usa só filtros de
   igualdade, que o Firestore indexa automaticamente. */
async function getAvaliacoes(mediaType, id) {
  const snap = await fbDb.collection("avaliacoes")
    .where("mediaType", "==", mediaType)
    .where("id", "==", id)
    .get();
  const docs = snap.docs.map((d) => d.data());
  docs.sort((a, b) => {
    const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
  return docs;
}
