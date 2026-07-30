/*
 * PLANETA FLIX — Configuração do Firebase
 * ----------------------------------------
 * Projeto: planeta-flix (console.firebase.google.com)
 * Usado por: cadastro.html, carteirinha.html (via auth.js)
 *
 * Estas chaves são públicas por natureza (client-side do Firebase Web SDK) —
 * a proteção real dos dados fica nas Regras de Segurança do Firestore, que
 * restringem cada usuário autenticado a ler/escrever apenas o próprio perfil.
 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDhFiZjCk3qS2DYj-uhiE1zQL2ZFCfCYm4",
  authDomain: "planeta-flix.firebaseapp.com",
  projectId: "planeta-flix",
  storageBucket: "planeta-flix.firebasestorage.app",
  messagingSenderId: "713604636481",
  appId: "1:713604636481:web:b5f46f60a74ad389f58bc0",
  measurementId: "G-EH9HLLYG13",
};

firebase.initializeApp(FIREBASE_CONFIG);

const fbAuth = firebase.auth();
const fbDb = firebase.firestore();
