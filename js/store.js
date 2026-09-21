// ============================================================
// StudyFlow — camada de armazenamento
// ============================================================
// A configuração do Firebase agora fica salva no localStorage DESTE
// dispositivo (editável em Configurações → Firebase), não no código-fonte.
// Isso evita deixar as chaves do seu projeto commitadas num repositório
// público no GitHub. js/firebase-config.js continua existindo só como
// valor padrão opcional (útil se você quiser hospedar uma cópia já
// pré-configurada em algum lugar privado) — se estiver vazio/placeholder,
// é ignorado.
//
// Sem nenhuma configuração (nem localStorage, nem arquivo), o app cai
// automaticamente para o localStorage como banco de dados também, então
// ele sempre funciona, mesmo sem Firebase.
//
// O resto do app (js/app.js) não sabe qual dos dois está em uso: ele só
// chama Store.getAll(colecao), Store.save(colecao, id, dados) e
// Store.remove(colecao, id).

import { firebaseConfig as fileFirebaseConfig } from './firebase-config.js?v=31';

const FIREBASE_SDK_VERSION = '10.13.2';
const FIREBASE_CONFIG_KEY = 'sf_firebase_config';

function looksConfigured(cfg) {
  return !!(cfg && cfg.apiKey && !String(cfg.apiKey).startsWith('YOUR_'));
}

export function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
export function setStoredFirebaseConfig(config) {
  try { localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config)); return true; }
  catch (e) { console.error('Não foi possível salvar a configuração do Firebase:', e); return false; }
}
export function clearStoredFirebaseConfig() {
  try { localStorage.removeItem(FIREBASE_CONFIG_KEY); return true; }
  catch (e) { return false; }
}
// The config actually in effect right now: this device's saved config wins;
// the file's config (if someone chose to hardcode it) is only the fallback.
export function getActiveFirebaseConfig() {
  const stored = getStoredFirebaseConfig();
  if (looksConfigured(stored)) return stored;
  if (looksConfigured(fileFirebaseConfig)) return fileFirebaseConfig;
  return stored || fileFirebaseConfig || null;
}
export function isFirebaseConfigured() {
  return looksConfigured(getActiveFirebaseConfig());
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

const LocalBackend = {
  mode: 'local',
  _read(c) { try { return JSON.parse(localStorage.getItem('sf_' + c) || '{}'); } catch (e) { return {}; } },
  _write(c, o) { try { localStorage.setItem('sf_' + c, JSON.stringify(o)); } catch (e) { /* storage full or unavailable */ } },
  async getAll(c) { const o = this._read(c); return Object.keys(o).map(id => ({ id, ...o[id] })); },
  async save(c, id, data) { const o = this._read(c); o[id] = { ...data }; this._write(c, o); },
  async remove(c, id) { const o = this._read(c); delete o[id]; this._write(c, o); },
};

async function buildFirebaseBackend() {
  const cfg = getActiveFirebaseConfig();
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`);
  const { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } =
    await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);
  const app = initializeApp(cfg);
  const db = getFirestore(app);
  return {
    mode: 'firebase',
    async getAll(c) {
      const snap = await getDocs(collection(db, c));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async save(c, id, data) { await setDoc(doc(db, c, id), data); },
    async remove(c, id) { await deleteDoc(doc(db, c, id)); },
  };
}

export const Store = {
  backend: null,
  lastError: null,
  async init() {
    if (isFirebaseConfigured()) {
      try {
        // Never let a blocked/slow gstatic.com request (ad/script blockers,
        // flaky network) freeze the whole app forever — give up after 6s
        // and fall back to local storage so the page always loads.
        this.backend = await withTimeout(
          buildFirebaseBackend(), 6000,
          'Tempo esgotado conectando ao Firebase (SDK de gstatic.com). Pode ser um bloqueador de scripts (ex: Brave Shields, uBlock) ou falta de conexão.'
        );
        this.lastError = null;
        return this.backend.mode;
      } catch (e) {
        this.lastError = e;
        console.error('Não foi possível conectar ao Firebase — usando armazenamento local neste dispositivo.', e);
      }
    }
    this.backend = LocalBackend;
    return this.backend.mode;
  },
  getAll(c) {
    return withTimeout(this.backend.getAll(c), 8000, `Tempo esgotado lendo "${c}" do backend atual.`)
      .then(r => { if (this.backend.mode === 'firebase') this.lastError = null; return r; })
      .catch(e => { console.error('getAll failed, returning empty:', c, e); this.lastError = e; return []; });
  },
  async save(c, id, data) { try { await this.backend.save(c, id, data); } catch (e) { console.error('save failed', c, id, e); } },
  async remove(c, id) { try { await this.backend.remove(c, id); } catch (e) { console.error('remove failed', c, id, e); } },
};
