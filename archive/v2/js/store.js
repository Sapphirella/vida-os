/**
 * VidaOS — 本地数据层
 * ---------------------------------------------------------------------------
 * 主后端：IndexedDB（文本状态 + 图片/音频 Blob 分存，避免 Base64 撑爆配额）
 * 回退后端：localStorage（IndexedDB 不可用时，Blob 以 dataURL 存）
 * 所有方法返回 Promise。
 */
(function (global) {
  'use strict';

  const DB_NAME = 'vidaos';
  const DB_VERSION = 1;
  const STORE_STATE = 'state';
  const STORE_FILES = 'files';
  const STATE_KEY = 'root';
  const LS_STATE = 'vidaos.state';
  const LS_FILES = 'vidaos.files';

  let db = null;
  let backend = null; // 'idb' | 'ls'

  /* ------------------------------------------------------------------ */
  /* IndexedDB 基础                                                     */
  /* ------------------------------------------------------------------ */
  function openIDB() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) { reject(new Error('no indexedDB')); return; }
      const req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_STATE)) d.createObjectStore(STORE_STATE);
        if (!d.objectStoreNames.contains(STORE_FILES)) d.createObjectStore(STORE_FILES);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    });
  }

  function idbReq(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGet(store, key) {
    const tx = db.transaction(store, 'readonly');
    return idbReq(tx.objectStore(store).get(key));
  }
  async function idbPut(store, key, value) {
    const tx = db.transaction(store, 'readwrite');
    await idbReq(tx.objectStore(store).put(value, key));
    return idbReq(tx);
  }
  async function idbDel(store, key) {
    const tx = db.transaction(store, 'readwrite');
    await idbReq(tx.objectStore(store).delete(key));
    return idbReq(tx);
  }
  async function idbClear(store) {
    const tx = db.transaction(store, 'readwrite');
    await idbReq(tx.objectStore(store).clear());
    return idbReq(tx);
  }

  /* ------------------------------------------------------------------ */
  /* 初始化                                                            */
  /* ------------------------------------------------------------------ */
  async function init() {
    if (backend) return backend;
    try {
      db = await openIDB();
      // 验证可用
      await idbGet(STORE_STATE, '__probe__');
      backend = 'idb';
    } catch (e) {
      backend = 'ls';
    }
    return backend;
  }

  /* ------------------------------------------------------------------ */
  /* 状态（JSON 文本）                                                  */
  /* ------------------------------------------------------------------ */
  async function getState() {
    await init();
    if (backend === 'idb') {
      const v = await idbGet(STORE_STATE, STATE_KEY);
      return v || null;
    }
    try {
      const raw = global.localStorage.getItem(LS_STATE);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  async function saveState(state) {
    await init();
    if (backend === 'idb') {
      return idbPut(STORE_STATE, STATE_KEY, state);
    }
    try {
      global.localStorage.setItem(LS_STATE, JSON.stringify(state));
    } catch (e) {
      // 容量满等错误
      throw e;
    }
  }

  /* ------------------------------------------------------------------ */
  /* 文件（Blob）                                                      */
  /* ------------------------------------------------------------------ */
  async function putFile(id, blob) {
    await init();
    if (backend === 'idb') {
      return idbPut(STORE_FILES, id, blob);
    }
    // localStorage 回退：转 dataURL
    const dataUrl = await blobToDataURL(blob);
    try {
      const map = JSON.parse(global.localStorage.getItem(LS_FILES) || '{}');
      map[id] = dataUrl;
      global.localStorage.setItem(LS_FILES, JSON.stringify(map));
    } catch (e) { throw e; }
  }

  async function getFile(id) {
    await init();
    if (backend === 'idb') {
      const blob = await idbGet(STORE_FILES, id);
      return blob || null;
    }
    try {
      const map = JSON.parse(global.localStorage.getItem(LS_FILES) || '{}');
      const dataUrl = map[id];
      if (!dataUrl) return null;
      return dataURLToBlob(dataUrl);
    } catch (e) { return null; }
  }

  async function delFile(id) {
    await init();
    if (backend === 'idb') return idbDel(STORE_FILES, id);
    try {
      const map = JSON.parse(global.localStorage.getItem(LS_FILES) || '{}');
      delete map[id];
      global.localStorage.setItem(LS_FILES, JSON.stringify(map));
    } catch (e) { /* ignore */ }
  }

  async function delFiles(ids) {
    for (const id of ids) await delFile(id);
  }

  async function clearAll() {
    await init();
    if (backend === 'idb') {
      await idbClear(STORE_STATE);
      await idbClear(STORE_FILES);
      return;
    }
    try {
      global.localStorage.removeItem(LS_STATE);
      global.localStorage.removeItem(LS_FILES);
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ */
  /* 工具                                                              */
  /* ------------------------------------------------------------------ */
  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  function dataURLToBlob(dataUrl) {
    const [meta, b64] = dataUrl.split(',');
    const mime = (meta.match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /* ------------------------------------------------------------------ */
  /* 默认状态工厂                                                      */
  /* ------------------------------------------------------------------ */
  function defaultState() {
    return {
      version: 2,
      profile: { name: 'VidaOS', signature: '', avatar: null, background: 'aurora' },
      collections: [],   // { id, name, desc, cover, createdAt }
      articles: [],      // { id, title, content, cover, collectionId, tags, createdAt, updatedAt }
      moments: [],       // { id, content, images: [], createdAt }
      letters: [],       // { id, title, content, images: [], createdAt, unread }
      favorites: [],     // { id, refType, refId, createdAt }
      notes: {
        inspiration: [], // { id, content, category, createdAt }
        schedule: [],    // { id, title, note, date, time, category, done, createdAt }
        todo: []         // { id, content, category, done, createdAt, completedAt }
      },
      categories: {
        inspiration: [], // string[]
        schedule: [],
        todo: []
      },
      tracks: [],        // { id, title, artist, fileId, builtin, createdAt }
      settings: { lastTab: 'desk' }
    };
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  global.VidaStore = { init, getState, saveState, putFile, getFile, delFile, delFiles, clearAll, defaultState, uid, blobToDataURL, dataURLToBlob };
})(typeof window !== 'undefined' ? window : globalThis);
