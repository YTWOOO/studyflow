// ============================================================
// StudyFlow — camada de armazenamento
// ============================================================
// Usa o Cloud Firestore (Firebase) quando js/firebase-config.js está preenchido
// com um projeto real. Caso contrário, cai automaticamente para o localStorage
// do navegador, para que o site funcione imediatamente sem nenhuma configuração.
//
// O resto do app (js/app.js) não sabe qual dos dois está em uso: ele só chama
// Store.getAll(colecao), Store.save(colecao, id, dados) e Store.remove(colecao, id).

import { firebaseConfig } from './firebase-config.js?v=5';

const FIREBASE_SDK_VERSION = '10.13.2';
const isConfigured = !!(firebaseConfig && firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('YOUR_'));

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
  async init() {
    if (isConfigured) {
      try {
        this.backend = await buildFirebaseBackend();
        return this.backend.mode;
      } catch (e) {
        console.error('Não foi possível conectar ao Firebase — usando armazenamento local neste dispositivo.', e);
      }
    }
    this.backend = LocalBackend;
    return this.backend.mode;
  },
  getAll(c) { return this.backend.getAll(c).catch(() => []); },
  async save(c, id, data) { try { await this.backend.save(c, id, data); } catch (e) { console.error('save failed', c, id, e); } },
  async remove(c, id) { try { await this.backend.remove(c, id); } catch (e) { console.error('remove failed', c, id, e); } },
};
