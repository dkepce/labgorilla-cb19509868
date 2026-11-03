/* LabGorilla — app shell: render loop, event handling, top bar, dialogs, colors. */
(function (LB) {
  const U = LB.U, esc = U.esc;
  const $ = s => document.querySelector(s);
  const A = (LB.actions = {});
  LB.views = {};

  /* ---------- colors ---------- */
  LB.THEMES = {
    indigo: { name: "Indigo", kind: "one color", acc: "#4f46e5", accD: "#3730a3", accS: "#eceefe", accM: "#a5b4fc", bar: "#1b2030", bar2: "#2b3250" },
    teal: { name: "Teal", kind: "one color", acc: "#0f766e", accD: "#115e59", accS: "#e3f3f1", accM: "#8fd3cb", bar: "#10302e", bar2: "#1c4642" },
    plum: { name: "Plum", kind: "one color", acc: "#a23b72", accD: "#7c2a58", accS: "#f8e8f1", accM: "#e0a6c6", bar: "#2a1726", bar2: "#402338" },
    sunset: { name: "Orange and navy", kind: "two colors", acc: "#d9480f", accD: "#a8380b", accS: "#fdeee5", accM: "#f1b08e", bar: "#1d3b53", bar2: "#2c5473" },
    graphite: { name: "Graphite", kind: "neutral", acc: "#374151", accDark: "#6b7689", accD: "#1f2937", accS: "#eceef1", accM: "#aab0bb", bar: "#111827", bar2: "#1f2937" },
    /* "Glass" themes (same look as Hedgehog's, from the Project Hub "Verlauf + Glas" design): a colour gradient behind
       the window, side panels and cards see-through with a blur (body.glass in style.css). grad = [corner colour, base colour] */
    glassRose: { name: "Glass · Rose", kind: "glass", glass: true, grad: ["#f3a6b5", "#f5f6f9"], acc: "#c0506a", accD: "#8f2f47", accS: "#fbe9ee", accM: "#eba9b8", bar: "#3a2230", bar2: "#52323f" },
    glassSky: { name: "Glass · Sky", kind: "glass", glass: true, grad: ["#93bff0", "#f4f6fb"], acc: "#3f7cc4", accD: "#2a5a96", accS: "#e6f0fb", accM: "#a9c8ee", bar: "#1c2c44", bar2: "#2b405e" },
    glassLavender: { name: "Glass · Lavender", kind: "glass", glass: true, grad: ["#c4b2f1", "#f6f5fb"], acc: "#7b62c9", accD: "#573fa3", accS: "#efeafb", accM: "#c4b5f0", bar: "#2a2340", bar2: "#3c3358" },
    /* dark Glass themes (always dark): panel / card = the see-through tint of the side panels and cards */
    glassEmerald: { name: "Glass · Emerald night", kind: "glass, dark", glass: true, dark: true, grad: ["#0f8a5f", "#0b1630"], acc: "#1f9e6e", bar: "#0b2a24", bar2: "#14423a", panel: "rgba(10,26,34,.46)", card: "rgba(10,26,34,.52)" },
    glassSunset: { name: "Glass · Sunset violet", kind: "glass, dark", glass: true, dark: true, grad: ["#e2601f", "#2a1546"], acc: "#d9662a", bar: "#2a1438", bar2: "#3f2252", panel: "rgba(34,16,40,.46)", card: "rgba(34,16,40,.52)" },
    glassNavy: { name: "Glass · Gold navy", kind: "glass, dark", glass: true, dark: true, grad: ["#d9a400", "#101c3d"], acc: "#b8870b", bar: "#0f1a36", bar2: "#1b2a50", panel: "rgba(14,22,48,.46)", card: "rgba(14,22,48,.52)" }
  };
  /* Light / Dark / Auto (follows the computer). Glass themes bring their own: the light ones are always light, the dark ones always dark. */
  const sysDark = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  LB.isDark = t => (t.glass ? !!t.dark : LB.S.mode === "dark" || (LB.S.mode === "auto" && !!(sysDark && sysDark.matches)));
  if (sysDark && sysDark.addEventListener) sysDark.addEventListener("change", () => { if (LB.S.mode === "auto") LB.render(); });
  /* colour only in the top-left corner, the base colour from about the middle on (same recipe as Project Hub and Hedgehog) */
  LB.glassGrad = t => "linear-gradient(135deg, " + t.grad[0] + " 0%, color-mix(in srgb, " + t.grad[0] + " 45%, " + t.grad[1] + ") 20%, " + t.grad[1] + " 50%, " + t.grad[1] + " 100%)";
  LB.applyTheme = function () {
    const t = LB.THEMES[LB.S.theme] || LB.THEMES.indigo, st = document.documentElement.style;
    st.setProperty("--acc", t.acc); st.setProperty("--acc-d", t.accD || "color-mix(in srgb, " + t.acc + " 75%, #000)"); st.setProperty("--acc-s", t.accS || "color-mix(in srgb, " + t.acc + " 12%, #fff)");
    st.setProperty("--acc-m", t.accM || "color-mix(in srgb, " + t.acc + " 50%, #fff)"); st.setProperty("--bar", t.bar); st.setProperty("--bar-2", t.bar2);
    document.body.classList.toggle("glass", !!t.glass);
    if (t.glass) { st.setProperty("--grad", LB.glassGrad(t)); st.setProperty("--grad-base", t.grad[1]); } else { st.removeProperty("--grad"); st.removeProperty("--grad-base"); }
    if (t.panel) { st.setProperty("--glass-panel", t.panel); st.setProperty("--glass-card", t.card); }
    /* dark mode: body.dark switches on dark.css. The accent shades are set on #app only, so the PDF (#print) keeps the light ones. */
    const dark = LB.isDark(t), app = document.getElementById("app"); document.body.classList.toggle("dark", dark);
    if (app) {
      const as = app.style, a = t.accDark || t.acc;
      if (dark) { as.setProperty("--acc", a); as.setProperty("--acc-s", "color-mix(in srgb, " + a + " 24%, #1a1f2b)"); as.setProperty("--acc-m", "color-mix(in srgb, " + a + " 55%, #1a1f2b)"); as.setProperty("--acc-d", "color-mix(in srgb, " + a + " 50%, #ffffff)"); }
      else ["--acc", "--acc-s", "--acc-m", "--acc-d"].forEach(k => as.removeProperty(k));
    }
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t.bar;
  };

  /* ---------- small shared helpers ---------- */
  let tt;
  LB.toast = function (msg) {
    let el = $("#toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("show"), 3200);
  };
  LB.cur = () => LB.D.entries[LB.ui.cur] || null;
  LB.expOf = e => LB.D.experiments.find(x => x.id === e.expId);
  LB.expCode = x => "EXP-" + U.pad(x.num || 0);
  LB.mutate = fn => { fn(); LB.save(); LB.render(); };
  LB.go = function (view, extra) { Object.assign(LB.ui, { view }, extra || {}); LB.saveUI(); LB.render(); };
  LB.openEntry = function (id, sec) {
    const e = LB.D.entries[id]; if (!e) return false;
    LB.ui.view = "notebook"; LB.ui.cur = id; if (sec != null) LB.ui.sec = sec;
    const x = LB.expOf(e); if (x) { LB.ui.openExp[x.id] = true; LB.ui.openProj[x.projectId] = true; }
    LB.tmp.gq = ""; LB.saveUI(); LB.render(); return true;
  };

  /* ---------- render ---------- */
  LB.render = function () {
    const app = $("#app");
    const f = document.activeElement; let fk = null, ss = 0, se = 0;
    if (f && app.contains(f) && (f.dataset.b || f.dataset.fk)) { fk = f.dataset.b || f.dataset.fk; ss = f.selectionStart; se = f.selectionEnd; }
    const scr = {}; app.querySelectorAll("[data-scroll]").forEach(e => { scr[e.dataset.scroll] = e.scrollTop; });
    LB.applyTheme();
    const v = LB.views[LB.ui.view] || LB.views.notebook;
    app.innerHTML = topbar() + '<div class="layout">' + v() + "</div>" + overlays();
    app.querySelectorAll("[data-scroll]").forEach(e => { if (scr[e.dataset.scroll] != null) e.scrollTop = scr[e.dataset.scroll]; });
    if (fk) {
      const n = app.querySelector('[data-b="' + fk + '"],[data-fk="' + fk + '"]');
      if (n) { n.focus(); try { if (ss != null) n.setSelectionRange(ss, se); } catch (e) { } }
    }
    hydrate();
  };
  function hydrate() {
    const refs = {}; LB.allRefs().forEach(r => { refs[r.id] = r; });
    document.querySelectorAll("img[data-fid]").forEach(img => {
      const r = refs[img.dataset.fid]; if (!r) return;
      LB.fileUrl(r).then(u => { if (u) img.src = u; else if (img.parentNode) img.parentNode.textContent = "file not found"; });
    });
  }
  LB.refById = id => LB.allRefs().find(r => r.id === id);

  /* ---------- top bar ---------- */
  const LOGO = '<img class="logo" src="icons/logo-bar.png" width="28" height="28" alt="" aria-hidden="true">';
  function fileChip() {
    const F = LB.file;
    const m = { ok: ["✓ Saved to LabGorilla.lbk", ""], saving: ["Saving…", ""], needs: ["⚠ Reconnect file", "warn"], error: ["⚠ File problem", "warn"], none: ["Saved in this browser", ""], local: ["Saved in this browser", ""] };
    const x = m[F.state] || m.none;
    return '<button class="tbtn ' + x[1] + '" data-a="pop" data-p="file" title="Your lab book file">' + x[0] + "</button>";
  }
  function globalResults() {
    const q = (LB.tmp.gq || "").trim().toLowerCase(); if (!q) return "";
    const D = LB.D, out = [];
    const has = (...t) => t.some(s => String(s || "").toLowerCase().includes(q));
    Object.values(D.entries).forEach(e => { if (has(e.code, e.title, e.aim, e.hyp, e.results, e.concl, e.sn.join(" "), e.steps.map(s => s.t).join(" "), e.comments.map(c => c.text).join(" "))) out.push({ k: "Entry", t: e.code + " · " + e.title, a: "gopen", kind: "entry", id: e.id }); });
    Object.entries(D.protocols).forEach(([id, p]) => { if (has(p.title, p.desc, p.steps.join(" "))) out.push({ k: "Protocol", t: p.title, a: "gopen", kind: "proto", id }); });
    D.refs.forEach(r => { if (has(r.title, r.authors, r.journal, r.year, r.doi)) out.push({ k: "Reference", t: (r.title || "Untitled") + (r.year ? " (" + r.year + ")" : ""), a: "gopen", kind: "ref", id: r.id }); });
    D.items.forEach(i => { if (has(i.name, i.sub, i.kind)) out.push({ k: "Inventory", t: i.name + " · " + i.kind, a: "gopen", kind: "item", id: i.id }); });
    D.events.forEach(v => { if (has(v.title)) out.push({ k: "Calendar", t: U.fmt(v.date) + " · " + v.title, a: "gopen", kind: "event", id: v.id }); });
    return '<div class="gres">' + (out.length ? out.slice(0, 14).map(r => '<button data-a="' + r.a + '" data-kind="' + r.kind + '" data-id="' + r.id + '"><span class="k">' + r.k + "</span><span>" + esc(r.t) + "</span></button>").join("") : '<div class="muted sm" style="padding:8px 10px">Nothing found.</div>') + "</div>";
  }
  function topbar() {
    const NAV = [["notebook", "Notebook"], ["protocols", "Protocols"], ["inventory", "Inventory"], ["references", "References"], ["thesis", "Thesis"], ["calendar", "Calendar"]];
    return '<header class="top"><div class="brand">' + LOGO + 'LabGorilla</div><nav class="nav">' +
      NAV.map(([k, l]) => '<button class="' + (LB.ui.view === k ? "on" : "") + '" data-a="nav" data-v="' + k + '">' + l + "</button>").join("") + '</nav><span class="grow"></span>' +
      '<div class="tsearch"><input type="text" placeholder="Search everything…" aria-label="Search everything" autocomplete="off" data-b="tmp.gq" data-rin="1" value="' + esc(LB.tmp.gq || "") + '">' + globalResults() + "</div>" +
      fileChip() + '<button class="tbtn" data-a="pop" data-p="theme" title="Colors"><span style="width:10px;height:10px;border-radius:50%;background:var(--acc);display:inline-block"></span>Colors</button></header>';
  }
  LB.onFileState = function () {   // only refresh the small file button (and the file dialog if open); a full render would interrupt typing and pickers
    if (!document.querySelector("#app .top")) return;
    if (LB.tmp.pop === "file") { LB.render(); return; }
    const b = document.querySelector('#app .top [data-p="file"]'); if (b) b.outerHTML = fileChip();
  };

  /* ---------- popovers & dialogs ---------- */
  function themePop() {
    const mode = LB.S.mode || "light", glass = (LB.THEMES[LB.S.theme] || {}).glass;
    const seg = '<div class="row" style="gap:8px"><span class="lbl grow">Appearance</span><span class="seg" role="group" aria-label="Appearance">' + [["light", "☀ Light"], ["dark", "☾ Dark"], ["auto", "Auto"]].map(([k, l]) => '<button class="btn sm' + (mode === k ? " on" : "") + '" data-a="setMode" data-m="' + k + '" aria-pressed="' + (mode === k) + '"' + (k === "auto" ? ' title="Follow the computer: dark when macOS / Windows is in dark mode"' : "") + ">" + l + "</button>").join("") + "</span></div>" +
      (glass ? '<div class="muted sm">Glass themes have their own light or dark look; Appearance applies to the other colors.</div>' : "");
    return '<div class="pop" style="width:300px"><div class="h">Colors</div>' + seg + '<div class="muted sm">One accent color, or an accent plus a matching top bar.</div>' +
      Object.keys(LB.THEMES).map(k => { const t = LB.THEMES[k]; return '<button class="themeopt ' + (LB.S.theme === k ? "on" : "") + '" data-a="setTheme" data-k="' + k + '"><span class="sw' + (t.glass ? " swg" : "") + '"' + (t.glass ? ' style="background:' + LB.glassGrad(t) + '"' : "") + '><i style="background:' + t.acc + '"></i><i style="background:' + t.bar + '"></i></span><span class="grow">' + t.name + '</span><span class="muted" style="font-size:11px;font-weight:500">' + t.kind + "</span></button>"; }).join("") + "</div>";
  }
  function filePop() {
    const F = LB.file;
    const status = {
      ok: '<div class="okbox">✓ Every change is saved automatically into ' + esc(F.name) + "/LabGorilla.lbk</div>",
      saving: '<div class="okbox">Saving…</div>',
      needs: '<div class="warnbox2">The browser needs your permission again to save into <b>' + esc(F.name) + "</b>. Click Reconnect.</div>",
      error: '<div class="warnbox2">The file could not be written' + (F.msg ? ": " + esc(F.msg) : "") + ".</div>",
      none: '<div class="warnbox2">Right now everything is saved only inside this browser. Choose a folder so it is also saved into a LabGorilla.lbk file that you can back up or keep in iCloud Drive.</div>',
      local: '<div class="warnbox2">This browser cannot save into a file by itself. Everything is saved in the browser; use Backup now and then. (In Brave: enable “File System Access API” in brave://flags.)</div>'
    }[F.state] || "";
    const btns = [];
    if (F.ok && F.state === "needs") btns.push('<button class="btn pri" data-a="fileReconnect">Reconnect</button>');
    if (F.ok && (F.state === "none")) btns.push('<button class="btn pri" data-a="fileChoose">Choose folder…</button>');
    if (F.ok && F.dir) btns.push('<button class="btn" data-a="fileChoose">Change folder…</button>', '<button class="btn" data-a="fileUnlink">Stop saving to file</button>');
    btns.push('<button class="btn" data-a="fileBackup">⬇ Backup</button>', '<label class="btn" style="cursor:pointer">⬆ Restore<input type="file" accept=".lbk,.json,application/json" data-file="fileRestore" hidden></label>');
    return '<div class="pop"><div class="h">Your lab book file</div>' + status +
      '<div class="muted" style="font-size:13px;line-height:1.55">Text, tables and settings live in <b>LabGorilla.lbk</b>. Images and PDFs go into a folder called “LabGorilla files” next to it. Hedgehog can read the same file to show your experiments in the planner.</div>' +
      '<div class="row wrap">' + btns.join("") + "</div>" +
      '<div class="muted sm">A backup is a copy as of now. Restore replaces everything on screen with the backup file.</div>' +
      '<hr style="border:0;border-top:1px solid var(--line2);width:100%"><div class="row wrap"><button class="btn" data-a="demo">Load example data</button><span class="muted sm">Fills the lab book with sample experiments, protocols and inventory.</span></div></div>';
  }
  function newEntryModal() {
    const D = LB.D, nw = LB.tmp.nw;
    const newExp = nw.expId === "__new" || !D.experiments.length;
    return '<div class="backdrop" data-a="closeModal"><div class="modal"><h2>New entry</h2>' +
      '<label>Title<input type="text" data-b="tmp.nw.title" placeholder="e.g. Seeding on chip C8" value="' + esc(nw.title) + '" autocomplete="off"></label>' +
      '<label>Experiment<select data-b="tmp.nw.expId" data-render="1">' + D.experiments.map(x => '<option value="' + x.id + '"' + (nw.expId === x.id ? " selected" : "") + ">" + LB.expCode(x) + " · " + esc(x.name) + "</option>").join("") + '<option value="__new"' + (newExp ? " selected" : "") + ">+ New experiment…</option></select></label>" +
      (newExp ? '<label>New experiment name<input type="text" data-b="tmp.nw.newExp" placeholder="e.g. Spheroid loading" value="' + esc(nw.newExp) + '"></label>' +
        '<label>Project<select data-b="tmp.nw.projId">' + D.projects.map(p => '<option value="' + p.id + '"' + (nw.projId === p.id ? " selected" : "") + ">" + esc(p.name) + "</option>").join("") + '<option value="__new">+ New project…</option></select></label>' : "") +
      (newExp && nw.projId === "__new" ? '<label>New project name<input type="text" data-b="tmp.nw.newProj" value="' + esc(nw.newProj) + '"></label>' : "") +
      '<label>Experiment date (the day you did the work)<input type="date" data-b="tmp.nw.date" value="' + nw.date + '"></label>' +
      '<label>Start from a protocol<select data-b="tmp.nw.proto"><option value="">None (blank entry)</option>' + Object.keys(D.protocols).map(id => '<option value="' + id + '"' + (nw.proto === id ? " selected" : "") + ">" + esc(D.protocols[id].title) + " (v" + D.protocols[id].ver + ")</option>").join("") + "</select></label>" +
      '<div class="row" style="justify-content:flex-end"><button class="btn" data-a="closeModal" data-force="1">Cancel</button><button class="btn pri" data-a="createEntry">Create entry</button></div></div></div>';
  }
  function overlays() {
    const p = LB.tmp.pop;
    return p === "theme" ? themePop() : p === "file" ? filePop() : p === "new" ? newEntryModal() : p === "export" ? LB.exportModal() : p === "zotero" ? LB.zoteroModal() : p === "move" ? LB.moveModal() : "";
  }

  /* ---------- shared actions ---------- */
  A.nav = el => { LB.tmp.pop = ""; LB.go(el.dataset.v); };
  A.pop = el => { LB.tmp.pop = LB.tmp.pop === el.dataset.p ? "" : el.dataset.p; LB.render(); };
  A.closeModal = (el, ev) => { if (el.dataset.force || ev.target === el) { LB.tmp.pop = ""; LB.render(); } };
  A.setTheme = el => { LB.S.theme = el.dataset.k; LB.tmp.pop = ""; LB.save(); LB.render(); };
  A.setMode = el => { LB.S.mode = el.dataset.m; LB.save(); LB.render(); };
  A.fileChoose = () => LB.chooseFolder();
  A.fileReconnect = () => LB.reconnect();
  A.fileUnlink = async () => { await LB.unlinkFolder(); LB.render(); };
  A.fileBackup = () => LB.downloadBackup();
  A.fileRestore = async el => { const f = el.files[0]; el.value = ""; if (f) await LB.restoreFrom(f); };
  A.demo = () => {
    if (LB.hasContent() && !confirm("Add the example data? It will be added next to what you already have.")) return;
    LB.seedDemo(); LB.tmp.pop = ""; LB.save(); LB.render(); LB.toast("Example data added.");
  };
  A.gopen = el => {
    const { kind, id } = el.dataset; LB.tmp.gq = "";
    if (kind === "entry") LB.openEntry(id, 0);
    else if (kind === "proto") { LB.tmp.protoCur = id; LB.go("protocols"); }
    else if (kind === "ref") { const r = LB.D.refs.find(x => x.id === id); LB.tmp.refQ = r ? (r.title || "").slice(0, 60) : ""; LB.tmp.refFolder = ""; LB.go("references"); }
    else if (kind === "item") { LB.tmp.openItem = id; LB.tmp.invQ = ""; LB.tmp.invType = ""; LB.go("inventory"); }
    else { const v = LB.D.events.find(x => x.id === id); if (v) { LB.ui.sel = v.date; const d = U.parse(v.date); LB.ui.calY = d.getFullYear(); LB.ui.calM = d.getMonth(); } LB.go("calendar"); }
  };

  /* ---------- event delegation ---------- */
  document.addEventListener("click", ev => {
    const el = ev.target.closest("[data-a]");
    if (LB.tmp.pop && LB.tmp.pop !== "new" && LB.tmp.pop !== "export" && LB.tmp.pop !== "zotero" && LB.tmp.pop !== "move" && !ev.target.closest(".pop") && !(el && el.dataset.a === "pop")) { LB.tmp.pop = ""; LB.render(); }
    if (LB.tmp.gq && !ev.target.closest(".tsearch")) { LB.tmp.gq = ""; LB.render(); }
    if (!el) return;
    const fn = A[el.dataset.a]; if (fn) fn(el, ev);
  });
  document.addEventListener("input", ev => {
    const el = ev.target, p = el.dataset && el.dataset.b; if (!p) return;
    const v = el.type === "checkbox" ? el.checked : el.dataset.t === "num" ? +el.value : el.value;
    if (!U.setPath(LB, p, v)) return;
    if (p.startsWith("D.") || p.startsWith("S.")) LB.save(); else if (p.startsWith("ui.")) LB.saveUI();
    document.querySelectorAll('[data-live="' + p + '"]').forEach(n => { n.textContent = v; });
    if (el.dataset.rin) LB.render();
  });
  document.addEventListener("change", ev => {
    const el = ev.target; if (!el.dataset) return;
    if (el.dataset.file) { const fn = A[el.dataset.file]; if (fn) fn(el, ev); return; }
    const p = el.dataset.b; if (!p) return;
    if (p.startsWith("D.entries.") && el.dataset.log) { LB.log(LB.D.entries[p.split(".")[2]], el.dataset.log); LB.save(); }
    if (el.dataset.act && A[el.dataset.act]) A[el.dataset.act](el, ev);
    else if (el.dataset.render) LB.render();
  });
  document.addEventListener("keydown", ev => {
    const el = ev.target;
    if (ev.key === "Enter" && el.dataset && el.dataset.enter && A[el.dataset.enter]) { ev.preventDefault(); A[el.dataset.enter](el, ev); return; }
    if (ev.key === "Escape" && (LB.tmp.pop || LB.tmp.gq)) { LB.tmp.pop = ""; LB.tmp.gq = ""; LB.render(); return; }
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "s") { ev.preventDefault(); if (LB.file.dir) LB.writeFileNow(); else LB.downloadBackup(); }
  });
  /* drop files onto a zone marked data-dz */
  document.addEventListener("dragover", ev => { const z = ev.target.closest && ev.target.closest("[data-dz]"); if (z) { ev.preventDefault(); z.classList.add("dz-over"); } });
  document.addEventListener("dragleave", ev => { const z = ev.target.closest && ev.target.closest("[data-dz]"); if (z) z.classList.remove("dz-over"); });
  document.addEventListener("drop", ev => {
    const z = ev.target.closest && ev.target.closest("[data-dz]"); if (!z) return;
    ev.preventDefault(); z.classList.remove("dz-over");
    const fn = A[z.dataset.dz]; if (fn && ev.dataTransfer.files.length) fn({ dataset: z.dataset, files: ev.dataTransfer.files, value: "" });
  });

  /* ---------- hash links: #/entry/<id or code> (used by Hedgehog) ---------- */
  LB.route = function () {
    const c = location.hash.match(/^#\/calendar\/(\d{4}-\d{2}-\d{2})$/);
    if (c) { const d = U.parse(c[1]); LB.ui.sel = c[1]; LB.ui.calY = d.getFullYear(); LB.ui.calM = d.getMonth(); LB.go("calendar"); return; }
    const m = location.hash.match(/^#\/entry\/(.+)$/); if (!m) return;
    const key = decodeURIComponent(m[1]);
    const e = LB.D.entries[key] || Object.values(LB.D.entries).find(x => x.code === key);
    if (e) LB.openEntry(e.id, 0); else LB.toast("That entry was not found in this lab book.");
  };
  window.addEventListener("hashchange", LB.route);
})(window.LB);
