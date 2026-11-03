/* LabGorilla — data, saving (browser + LabGorilla.lbk file) and attachments. Plain JS, no build step. */
(function (LB) {
  const U = LB.U;

  /* ---------- defaults & loading ---------- */
  const DEFAULT_S = { theme: "indigo", warnDays: 30, mode: "light" };
  const DEFAULT_UI = { view: "notebook", cur: "", sec: 0, tab: 0, calMode: "month", sel: "", openExp: {}, openProj: {}, exportOpts: { aim: true, materials: true, procedure: true, chip: true, cards: true, results: true, files: true, conclusion: true, notes: true, comments: true, history: true, refs: true } };
  const TYPES = ["cell line", "reagent", "medium", "chips", "drug", "antibody"];
  const SECTIONS = ["Overview", "Materials", "Procedure", "Results", "Conclusion"];
  LB.SECTIONS = SECTIONS;

  function load(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  LB.S = Object.assign({}, DEFAULT_S, load("labbook.settings", null) || {});
  LB.D = load("labbook.data", null) || {};
  LB.ui = Object.assign({}, DEFAULT_UI, load("labbook.ui", null) || {});
  LB.ui.sel = LB.ui.sel || U.today();
  LB.ui.exportOpts = Object.assign({}, DEFAULT_UI.exportOpts, LB.ui.exportOpts);
  LB.tmp = { treeQ: "", protoQ: "", invQ: "", invType: "", openItem: "", protoCur: "", showNewMat: false, newMat: { name: "", kind: "reagent", newKind: "", sub: "", expires: "" }, evTitle: "", evTime: "", evKind: "imaging", comment: "", toast: "" };

  LB.fixData = function () {
    const D = LB.D;
    D.projects = D.projects || []; D.experiments = D.experiments || []; D.entries = D.entries || {};
    D.protocols = D.protocols || {}; D.items = D.items || []; D.events = D.events || []; D.refs = D.refs || [];
    D.types = D.types && D.types.length ? D.types : TYPES.slice(); D.expSeq = D.expSeq || D.experiments.length;
    Object.values(D.entries).forEach(e => {
      e.steps = e.steps || []; e.mats = e.mats || []; e.files = e.files || []; e.comments = e.comments || []; e.hist = e.hist || [];
      e.sn = e.sn || ["", "", "", "", ""]; e.refs = e.refs || []; e.map = e.map || LB.newMap(); e.entered = e.entered || e.date;
      ["aim", "hyp", "results", "concl"].forEach(k => { e[k] = e[k] || ""; });
    });
    Object.values(D.protocols).forEach(p => { p.steps = p.steps || []; p.refs = p.refs || []; p.mats = p.mats || []; p.history = p.history || []; p.ver = p.ver || 1; p.desc = p.desc || ""; });
    D.items.forEach(i => { i.firms = i.firms || []; i.docs = i.docs || []; i.stock = i.stock || ""; i.sub = i.sub || ""; i.expires = i.expires || ""; });
  };
  LB.newMap = (rows = 2, cols = 4) => ({ rows, cols, cells: Array.from({ length: rows * cols }, () => ({ on: false, note: "" })) });
  LB.fixData();

  /* ---------- saving ---------- */
  let savedAt = 0; try { savedAt = +localStorage.getItem("labbook.savedAt") || 0; } catch (e) { }
  let lastSer = JSON.stringify({ S: LB.S, D: LB.D });
  LB.payload = () => ({ app: "labgorilla", version: 1, saved: new Date(savedAt || Date.now()).toISOString(), settings: LB.S, data: LB.D });
  function persistLocal() {
    try {
      localStorage.setItem("labbook.settings", JSON.stringify(LB.S));
      localStorage.setItem("labbook.data", JSON.stringify(LB.D));
      localStorage.setItem("labbook.savedAt", String(savedAt));
    } catch (e) { LB.toast("Browser storage is full. Please make a backup."); }
  }
  LB.save = function () {
    const ser = JSON.stringify({ S: LB.S, D: LB.D });
    if (ser === lastSer) return;
    lastSer = ser; savedAt = Date.now(); persistLocal(); LB.scheduleFileWrite();
  };
  LB.saveUI = U.debounce(() => { try { localStorage.setItem("labbook.ui", JSON.stringify(LB.ui)); } catch (e) { } }, 300);

  /* ---------- audit trail on an entry ---------- */
  LB.log = function (entry, msg) {
    if (!entry) return;
    const last = entry.hist[0], now = Date.now();
    if (last && last.msg === msg && now - last.at < 600000) { last.at = now; return; }
    entry.hist.unshift({ at: now, msg }); entry.hist = entry.hist.slice(0, 60);
  };

  /* ---------- IndexedDB (file handle + attachment blobs when no folder is linked) ---------- */
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open("labbook", 1);
      r.onupgradeneeded = () => { r.result.createObjectStore("kv"); r.result.createObjectStore("blobs"); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(store, k) { try { const db = await idb(); return await new Promise((res, rej) => { const q = db.transaction(store).objectStore(store).get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); } catch (e) { return null; } }
  async function idbSet(store, k, v) { try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction(store, "readwrite"); t.objectStore(store).put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); return true; } catch (e) { return false; } }
  async function idbDel(store, k) { try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction(store, "readwrite"); t.objectStore(store).delete(k); t.oncomplete = res; t.onerror = () => rej(t.error); }); } catch (e) { } }
  LB.idbGet = (...a) => idbGet(...a); LB.idbSet = (...a) => idbSet(...a); LB.idbDel = (...a) => idbDel(...a);   // used by other files that remember a file handle

  /* ---------- LabGorilla.lbk in a folder the user picks (File System Access API) ---------- */
  const FS_OK = !!window.showDirectoryPicker;
  const F = (LB.file = { ok: FS_OK, dir: null, filesDir: null, state: FS_OK ? "none" : "local", name: "", timer: null, lastWrite: 0, msg: "" });
  LB.onFileState = () => { };
  function setState(s) { F.state = s; LB.onFileState(); }
  async function perm(h, ask) {
    if (!h.queryPermission) return true;
    const o = { mode: "readwrite" };
    if ((await h.queryPermission(o)) === "granted") return true;
    return !!ask && (await h.requestPermission(o)) === "granted";
  }
  LB.hasContent = () => Object.keys(LB.D.entries).length || LB.D.items.length || Object.keys(LB.D.protocols).length || LB.D.events.length;
  LB.scheduleFileWrite = function () { if (!F.dir) return; clearTimeout(F.timer); F.timer = setTimeout(() => writeFile(false), 700); };
  async function writeFile(ask) {
    if (!F.dir) return; clearTimeout(F.timer); F.timer = null;
    try {
      if (!(await perm(F.dir, ask))) { setState("needs"); return false; }
      setState("saving");
      const fh = await F.dir.getFileHandle("LabGorilla.lbk", { create: true });
      const w = await fh.createWritable(); await w.write(JSON.stringify(LB.payload(), null, 1)); await w.close();
      F.lastWrite = Date.now(); setState("ok"); return true;
    } catch (e) { F.msg = e.message; setState("error"); return false; }
  }
  LB.writeFileNow = () => writeFile(true);
  async function readLbk(dir) {
    const fh = await dir.getFileHandle("LabGorilla.lbk");
    return JSON.parse(await (await fh.getFile()).text());
  }
  function checkPayload(j) { if (!j || (j.app !== "labgorilla" && j.app !== "labbook") || !j.data) throw new Error("not a LabGorilla file"); return j; }
  LB.applyPayload = function (j) {
    checkPayload(j);
    LB.S = Object.assign({}, DEFAULT_S, j.settings); LB.D = j.data; LB.fixData();
    savedAt = j.saved ? Date.parse(j.saved) || Date.now() : Date.now();
    lastSer = JSON.stringify({ S: LB.S, D: LB.D }); persistLocal();
    if (!LB.D.entries[LB.ui.cur]) LB.ui.cur = "";
    LB.render();
  };
  async function openFilesDir() { try { F.filesDir = await F.dir.getDirectoryHandle("LabGorilla files", { create: true }); } catch (e) { F.filesDir = null; } }
  async function migrateBlobs() {
    if (!F.filesDir) return;
    for (const ref of LB.allRefs()) {
      if (ref.loc !== "idb") continue;
      const blob = await idbGet("blobs", ref.id); if (!blob) continue;
      try { await writeBlob(ref, blob); await idbDel("blobs", ref.id); } catch (e) { }
    }
    LB.save();
  }
  async function syncFromFile() {
    try {
      const j = checkPayload(await readLbk(F.dir)), fsaved = Date.parse(j.saved) || 0;
      if (fsaved > savedAt + 1000) LB.applyPayload(j);
      else if (savedAt > fsaved + 1000) await writeFile(false);
      await openFilesDir(); await migrateBlobs(); setState("ok");
    } catch (e) {
      if (e.name === "NotFoundError") { await writeFile(false); await openFilesDir(); await migrateBlobs(); } else setState("error");
    }
  }
  LB.chooseFolder = async function () {
    try {
      const dir = await showDirectoryPicker({ id: "labbook", mode: "readwrite" });
      let existing = null;
      try { existing = checkPayload(await readLbk(dir)); } catch (e) { }
      if (existing && LB.hasContent() && !confirm("This folder already contains a LabGorilla.lbk.\n\nOpen it? What is on screen now will be replaced.\n(Press Cancel to keep what you have and choose another folder.)")) return;
      F.dir = dir; F.name = dir.name; await idbSet("kv", "dir", dir);
      if (existing) LB.applyPayload(existing); else await writeFile(true);
      await openFilesDir(); await migrateBlobs(); setState("ok");
      LB.toast("Done: your lab book now saves itself into " + dir.name + "/LabGorilla.lbk");
    } catch (e) { if (e.name !== "AbortError") LB.toast("That did not work: " + e.message); }
  };
  LB.reconnect = async function () {
    if (!F.dir) return false;
    try { if (await perm(F.dir, true)) { await syncFromFile(); return F.state === "ok"; } } catch (e) { }
    setState("needs"); return false;
  };
  LB.unlinkFolder = async function () { F.dir = null; F.filesDir = null; F.name = ""; await idbDel("kv", "dir"); setState(FS_OK ? "none" : "local"); };
  /* a .lbk file opened from Explorer/Finder (double-click) arrives here as a file handle */
  LB.openLaunched = async function (handle) {
    try {
      const file = await handle.getFile(), j = checkPayload(JSON.parse(await file.text())), when = Date.parse(j.saved) || 0;
      if (Math.abs(when - savedAt) < 1500) { LB.toast("“" + file.name + "” is already what LabGorilla shows."); return; }
      if (LB.hasContent()) {
        const older = when < savedAt, linked = F.dir ? " and in the linked folder" : "";
        const msg = older
          ? "“" + file.name + "” is OLDER than what is in LabGorilla now (saved " + new Date(when).toLocaleString() + " vs " + new Date(savedAt).toLocaleString() + ").\n\nOpen it anyway? This replaces everything on screen" + linked + "."
          : "Open “" + file.name + "”?\n\nThis replaces everything on screen" + linked + " with the contents of this file.";
        if (!confirm(msg)) return;
      }
      LB.applyPayload(j); if (F.dir) await writeFile(false);
      LB.toast("Opened " + file.name + ".");
    } catch (e) { LB.toast(e.message === "not a LabGorilla file" ? "That file is not a LabGorilla file." : "That file could not be opened: " + e.message); }
  };
  LB.initFile = async function () {
    if (window.launchQueue) launchQueue.setConsumer(p => { if (p.files && p.files.length) LB.openLaunched(p.files[0]); });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
    LB.onFileState();
    if (!FS_OK) return;
    const dir = await idbGet("kv", "dir"); if (!dir) return;
    F.dir = dir; F.name = dir.name;
    if (!(await perm(dir, false))) { setState("needs"); return; }
    await syncFromFile();
  };
  /* pick up changes written elsewhere when she comes back to the window */
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden || !F.dir || F.state === "needs") return;
    try { if (await perm(F.dir, false)) { const fh = await F.dir.getFileHandle("LabGorilla.lbk"); const f = await fh.getFile(); if (f.lastModified > F.lastWrite + 2000 && (JSON.parse(await f.text()).saved || "") > new Date(savedAt + 1000).toISOString()) await syncFromFile(); } } catch (e) { }
  });
  window.addEventListener("beforeunload", () => { if (F.timer) writeFile(false); });

  LB.downloadBackup = function () {
    const blob = new Blob([JSON.stringify(LB.payload(), null, 1)], { type: "application/x-labgorilla" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "LabGorilla-" + U.today() + ".lbk";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    LB.toast("Backup saved: LabGorilla-" + U.today() + ".lbk (see your Downloads folder).");
  };
  LB.restoreFrom = async function (file) {
    try {
      const j = checkPayload(JSON.parse(await file.text()));
      if (!confirm("Replace everything in the lab book with the backup from " + (j.saved || "").slice(0, 10) + "?")) return;
      LB.applyPayload(j); LB.save(); if (F.dir) await writeFile(false); LB.toast("Backup restored.");
    } catch (e) { LB.toast("That file is not a LabGorilla backup."); }
  };

  /* ---------- attachments (images, PDFs, data files) ---------- */
  LB.allRefs = function () {
    const out = [];
    Object.values(LB.D.entries).forEach(e => e.files.forEach(f => out.push(f)));
    LB.D.items.forEach(i => i.docs.forEach(f => out.push(f)));
    return out;
  };
  async function writeBlob(ref, blob) {
    const fn = ref.id + "_" + U.safeName(ref.name);
    const fh = await F.filesDir.getFileHandle(fn, { create: true });
    const w = await fh.createWritable(); await w.write(blob); await w.close();
    ref.loc = "dir"; ref.fn = fn;
  }
  const urlCache = {};
  LB.fileAdd = async function (file) {
    const ref = { id: U.uid(), name: file.name, type: file.type || "", size: file.size, loc: "idb", at: Date.now() };
    let ok = false;
    if (F.filesDir && (await perm(F.dir, false))) { try { await writeBlob(ref, file); ok = true; } catch (e) { } }
    if (!ok) { if (!(await idbSet("blobs", ref.id, file))) { LB.toast("Could not store " + file.name); return null; } }
    return ref;
  };
  LB.fileBlob = async function (ref) {
    try {
      if (ref.loc === "dir") { if (!F.filesDir) return null; const fh = await F.filesDir.getFileHandle(ref.fn); return await fh.getFile(); }
      return await idbGet("blobs", ref.id);
    } catch (e) { return null; }
  };
  LB.fileUrl = async function (ref) {
    if (urlCache[ref.id]) return urlCache[ref.id];
    const b = await LB.fileBlob(ref); if (!b) return "";
    return (urlCache[ref.id] = URL.createObjectURL(b));
  };
  LB.fileRemove = async function (ref) {
    try { if (ref.loc === "dir" && F.filesDir) await F.filesDir.removeEntry(ref.fn); else await idbDel("blobs", ref.id); } catch (e) { }
    delete urlCache[ref.id];
  };
  LB.isImage = ref => /^image\//.test(ref.type) && !/tiff?$/i.test(ref.name);
})(window.LB);
