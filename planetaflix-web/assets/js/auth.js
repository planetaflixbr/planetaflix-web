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
