// ============================================================
// StudyFlow — camada de armazenamento
// ============================================================
// Usa o Cloud Firestore (Firebase) quando js/firebase-config.js está preenchido
// com um projeto real. Caso contrário, cai automaticamente para o localStorage
// do navegador, para que o site funcione imediatamente sem nenhuma configuração.
//
// O resto do app (js/app.js) não sabe qual dos dois está em uso: ele só chama
// Store.getAll(colecao), Store.save(colecao, id, dados) e Store.remove(colecao, id).

import { firebaseConfig } from './firebase-config.js?v=7';

const FIREBASE_SDK_VERSION = '10.13.2';
const isConfigured = !!(firebaseConfig && firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('YOUR_'));

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
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`);
  const { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } =
    await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);
  const app = initializeApp(firebaseConfig);
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
    if (isConfigured) {
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
