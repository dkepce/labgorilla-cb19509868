/* LabGorilla — Notebook view: tree, entry sections, right panel. */
(function (LB) {
  const U = LB.U, esc = U.esc, A = LB.actions;
  const SEC = LB.SECTIONS;
  const colOf = c => (/^#[0-9a-f]{6}$/i.test((c && c.color) || "") ? c.color : "");
  const PAL = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#a5b4fc", "#9ca3af"];
  const palette = (i, cur) => '<div class="palette">' + PAL.map(c => '<button class="pdot' + (c === cur ? " cur" : "") + '" data-a="setColor" data-i="' + i + '" data-c="' + c + '" style="background:' + c + '" aria-label="Color ' + c + '"></button>').join("") +
    '<button class="pdot none" data-a="setColor" data-i="' + i + '" data-c="" aria-label="No color" title="No color">∅</button><label class="sm muted" style="display:flex;gap:4px;align-items:center">Other <input type="color" class="pcol" value="' + (cur || "#a5b4fc") + '" data-act="customColor" data-i="' + i + '" data-b="tmp.customColor"></label></div>';
  const wellStyle = c => { const k = colOf(c); if (!k) return ""; return c.on ? ' style="background:' + k + ";border-color:color-mix(in srgb," + k + ' 55%,#000);color:#1b2030"' : ' style="border-color:color-mix(in srgb,' + k + ' 35%,#b9bdca)"'; };
  const T = (rows, v, extra) => '<textarea rows="' + rows + '" ' + extra + ">" + esc(v) + "</textarea>";

  /* ---------- left tree ---------- */
  function sortEntries(a, b) { return b.date.localeCompare(a.date) || (b.enteredAt || 0) - (a.enteredAt || 0); }
  function side() {
    const D = LB.D, q = (LB.tmp.treeQ || "").trim().toLowerCase(), cur = LB.cur(), curX = cur && cur.expId, curP = curX && (D.experiments.find(x => x.id === curX) || {}).projectId;
    const row = (cls, attrs, chev, ico, name, cnt, tools) => '<div class="nrow ' + cls + '"' + attrs + ' role="button" tabindex="0"><span class="chev">' + chev + '</span><span class="ico" aria-hidden="true">' + ico + '</span><span class="nm">' + name + "</span>" + (cnt != null ? '<span class="cnt">' + cnt + "</span>" : "") + (tools ? '<span class="tools">' + tools + "</span>" : "") + "</div>";
    let h = '<aside class="side" data-scroll="side"><button class="btn pri" data-a="newEntry">+ New entry</button>' +
      '<input type="text" placeholder="Filter entries…" aria-label="Filter entries" data-b="tmp.treeQ" data-rin="1" value="' + esc(LB.tmp.treeQ) + '" autocomplete="off">' +
      '<div class="row sm ftoolbar"><span class="lbl">Lab book</span><span class="grow"></span><button class="link sm" data-a="treeAll" data-v="1">Expand all</button><span class="muted">·</span><button class="link sm" data-a="treeAll" data-v="0">Collapse all</button></div><div class="ftree">';
    D.projects.forEach(p => {
      const exps = D.experiments.filter(x => x.projectId === p.id), pOpen = q || LB.ui.openProj[p.id] !== false;
      let body = "", shown = 0;
      exps.forEach(x => {
        const all = Object.values(D.entries).filter(e => e.expId === x.id), es = all.filter(e => !q || (e.title + " " + e.code + " " + e.aim).toLowerCase().includes(q)).sort(sortEntries);
        if (q && !es.length) return;
        shown++;
        const xOpen = q || LB.ui.openExp[x.id] !== false;
        body += row("exp" + (x.id === curX ? " path" : ""), ' data-a="toggleExp" data-id="' + x.id + '"' + LB.dragAttrs("exp", x.id), xOpen ? "▾" : "▸", LB.icons.folder(xOpen), LB.expCode(x) + " · " + esc(x.name), all.length,
          '<button class="x" data-a="newEntry" data-exp="' + x.id + '" title="New entry here">＋</button><button class="x" data-a="moveExp" data-id="' + x.id + '" title="Move to another project">⇄</button><button class="x" data-a="renameExp" data-id="' + x.id + '" title="Rename">✎</button><button class="x" data-a="delExp" data-id="' + x.id + '" title="Delete experiment">🗑</button>');
        if (xOpen) body += '<div class="fkids">' + (es.map(e => '<button class="nrow ent' + (e.id === LB.ui.cur ? " on" : "") + '" data-a="openEntry" data-id="' + e.id + '"><span class="chev"></span><span class="ico" aria-hidden="true">' + LB.icons.doc(15) + '</span><span class="d">' + U.fmt(e.date, false) + '</span><span class="nm" data-live="D.entries.' + e.id + '.title">' + esc(e.title) + "</span></button>").join("") || '<div class="muted sm" style="padding:2px 8px 4px 34px">No entries yet</div>') + "</div>";
      });
      if (q && !shown) return;
      h += row("proj" + (p.id === curP ? " path" : ""), ' data-a="toggleProj" data-id="' + p.id + '" data-drop="exp:' + p.id + '"', pOpen ? "▾" : "▸", LB.icons.folder(pOpen), esc(p.name), exps.length,
        '<button class="x" data-a="addExp" data-id="' + p.id + '" title="New experiment">＋</button><button class="x" data-a="renameProj" data-id="' + p.id + '" title="Rename">✎</button><button class="x" data-a="delProj" data-id="' + p.id + '" title="Delete project">🗑</button>');
      if (pOpen) h += '<div class="fkids">' + (body || '<div class="muted sm" style="padding:2px 8px 4px 34px">No experiments yet</div>') + "</div>";
    });
    h += '</div><button class="link sm" data-a="addProj" style="margin-top:6px">' + LB.icons.folder(false, 16) + ' New project</button></aside>';
    return h;
  }

  /* ---------- entry ---------- */
  function enteredLabel(e) {
    const g = U.daysBetween(e.date, e.entered || e.date);
    if (g === 0) return ['Entered the same day', ""];
    if (g > 0) return ["Entered " + U.fmt(e.entered, true) + " · " + g + (g === 1 ? " day" : " days") + " later", "badge"];
    return ["Entered before the experiment date", "badge"];
  }
  function head(e) {
    const P = "D.entries." + e.id, x = LB.expOf(e), dis = e.locked ? "disabled" : "", en = enteredLabel(e);
    /* one compact row: code + title on the left, status and actions on the right; date and "entered" sit beside the tabs (secBar) */
    return '<div class="ehead"><span class="mono ecode" title="' + esc(x ? x.name : "") + '">' + esc(e.code) + "</span>" +
      '<input type="text" class="etitle" aria-label="Entry title" data-b="' + P + '.title" data-live="' + P + '.title" data-log="Renamed entry" value="' + esc(e.title) + '" ' + dis + ' autocomplete="off">' +
      '<span class="badge ' + (e.locked ? "ok" : "") + '">' + (e.locked ? "Signed &amp; locked" : "Draft") + "</span>" +
      '<button class="btn sm" data-a="exportPdf">Export PDF</button><button class="btn sm dark" data-a="toggleLock">' + (e.locked ? "Unlock" : "Sign &amp; lock") + "</button></div>";
  }
  function metaLine(e) {
    const P = "D.entries." + e.id, x = LB.expOf(e), dis = e.locked ? "disabled" : "", en = enteredLabel(e);
    return '<div class="meta">' + (x ? '<span class="ename" title="' + esc(LB.expCode(x) + " · " + x.name) + '">' + esc(x.name) + "</span>" : "") +
      '<label>Date <input type="date" data-b="' + P + '.date" data-act="entryDate" value="' + e.date + '" ' + dis + '></label><span class="' + en[1] + '" title="' + esc(en[0]) + '">' + (en[1] ? en[0] : "same day") + "</span></div>";
  }
  /* cards an entry can switch off (data is kept; they are just hidden and left out of the PDF) */
  /* e.cards: which tabs an entry uses (materials, tabProcedure, tabResults, tabConclusion) and which cards sit on the
     Procedure tab (procedure steps, chip map). Switching something off only hides it; the data is kept. */
  const cardsOf = e => (e.cards = Object.assign({ materials: true, procedure: true, chip: true, tabProcedure: true, tabResults: true, tabConclusion: true }, e.cards));
  LB.cardsOf = cardsOf;
  const TABKEY = [null, "materials", "tabProcedure", "tabResults", "tabConclusion"];
  const TABINFO = [["Overview", "Aim, hypothesis and references. Always on."], ["Materials", "Tick the items you used from your inventory."], ["Procedure", "Steps, chip map, plate maps, timeline and other lab cards."], ["Results", "Images, files and observations."], ["Conclusion", "What you learned and what happens next."]];
  const visSecs = e => { const c = cardsOf(e); return [0, 1, 2, 3, 4].filter(i => i === 0 || c[TABKEY[i]]); };
  function tabMenu(e) {
    const c = cardsOf(e);
    return '<div class="tabmenu"><div class="h">Tabs in this entry</div><div class="muted sm">' + (e.locked ? "Unlock the entry to change its tabs." : "Switch off what this experiment does not need. Nothing is deleted.") + "</div>" +
      TABINFO.map(([n, d], i) => '<label class="tabopt' + (i === 0 ? " fixed" : "") + '"><span class="grow"><b>' + n + '</b><span class="muted sm">' + d + '</span></span><input type="checkbox" class="tg" ' + (i === 0 || c[TABKEY[i]] ? "checked" : "") + " " + (i === 0 || e.locked ? "disabled" : 'data-a="toggleTab" data-k="' + TABKEY[i] + '"') + ' aria-label="' + n + ' tab"></label>').join("") + "</div>";
  }
  function secBar(e) {
    return '<div class="secs">' + visSecs(e).map((i, k) => '<button class="pill' + (LB.ui.sec === i ? " on" : "") + '" data-a="setSec" data-n="' + i + '">' + (k + 1) + " " + SEC[i] + (e.sn[i] ? " •" : "") + "</button>").join("") +
      '<span class="addwrap"><button class="pill add' + (LB.tmp.tabMenu ? " on" : "") + '" data-a="tabMenu" title="Choose which tabs this entry uses" aria-haspopup="true" aria-expanded="' + (LB.tmp.tabMenu ? "true" : "false") + '">＋ Tabs</button>' + (LB.tmp.tabMenu ? tabMenu(e) : "") + '</span><span class="grow"></span>' + metaLine(e) + "</div>";
  }
  function overview(e) {
    const P = "D.entries." + e.id, dis = e.locked ? "disabled" : "", x = LB.expOf(e), cd = cardsOf(e);
    const loaded = e.map.cells.filter(c => c.on).length;
    return '<div class="card"><h3>Overview</h3><div class="lbl">Aim</div>' + T(3, e.aim, 'aria-label="Aim" data-b="' + P + '.aim" data-log="Edited aim" ' + dis) +
      '<div class="lbl">Hypothesis</div>' + T(2, e.hyp, 'aria-label="Hypothesis" data-b="' + P + '.hyp" data-log="Edited hypothesis" ' + dis) +
      '<div class="kv"><span class="muted">Experiment</span><b>' + (x ? LB.expCode(x) + " · " + esc(x.name) : "–") + '</b><span class="muted">Protocol</span><b>' + (e.protocol ? esc(e.protocol.title) + " v" + e.protocol.ver : "none") + "</b>" +
      (cd.materials ? '<span class="muted">Linked materials</span><b>' + e.mats.length + " items</b>" : "") +
      (cd.tabProcedure && cd.procedure ? '<span class="muted">Procedure</span><b>' + e.steps.filter(s => s.done).length + " of " + e.steps.length + " steps done</b>" : "") +
      (cd.tabProcedure && cd.chip ? '<span class="muted">Chip positions</span><b>' + loaded + " of " + e.map.cells.length + " loaded</b>" : "") +
      ((LB.thesisFor && LB.thesisFor("entry", e.id).length) ? '<span class="muted">Thesis</span><b>' + esc(LB.thesisFor("entry", e.id).join(", ")) + "</b>" : "") +
      (cd.tabProcedure && LB.cardCount(e) ? '<span class="muted">Lab cards</span><b>' + LB.cardCount(e) + " added</b>" : "") +
      '<span class="muted">Files</span><b>' + e.files.length + " attached</b></div>" +
      '<div class="row"><button class="link sm" style="color:#b42318" data-a="delEntry">Delete this entry</button></div></div>';
  }
  function materials(e) {
    const dis = e.locked ? "disabled" : "", q = (LB.tmp.matQ || "").trim().toLowerCase(), D = LB.D;
    const items = D.items.filter(i => !q || (i.name + " " + i.sub + " " + i.kind).toLowerCase().includes(q));
    return '<div class="card"><div class="row"><h3 class="grow">Materials</h3><input type="text" placeholder="Filter…" aria-label="Filter materials" data-b="tmp.matQ" data-rin="1" value="' + esc(LB.tmp.matQ || "") + '" style="width:160px"><button class="btn sm" data-a="toggleNewMat" ' + dis + ">+ New material</button></div>" +
      '<div class="muted sm">Tick what you used in this entry. Anything missing from your inventory can be added with “+ New material”.</div>' +
      (LB.tmp.showNewMat ? LB.newMatForm("entry") : "") +
      (items.length ? items.map(it => {
        const k = e.mats.findIndex(m => m.id === it.id), on = k >= 0, m = on ? e.mats[k] : null, i = D.items.indexOf(it), PM = "D.entries." + e.id + ".mats." + k;
        return '<div class="item' + (on ? " on" : "") + '"><div class="item-h"><input type="checkbox" data-a="toggleMat" data-id="' + it.id + '" ' + (on ? "checked" : "") + " " + dis + ' aria-label="Use ' + esc(it.name) + ' in this entry"><div class="n"><b data-live="D.items.' + i + '.name">' + esc(it.name) + '</b><div class="muted sm">' + esc(it.sub) + "</div>" + LB.expBadge(it) + '</div><span class="kind">' + esc(it.kind) + '</span><button class="btn sm" data-a="toggleItem" data-id="' + it.id + '">' + (LB.tmp.openItem === it.id ? "Hide details" : "Details" + (it.firms.length || it.docs.length ? " (" + it.firms.length + " firms, " + it.docs.length + " docs)" : "")) + "</button></div>" +
          (on && LB.expiredOn(it, e.date) ? '<div class="warnbox" style="margin:0 14px 10px 42px">⚠ This material expired on ' + U.fmt(it.expires) + ", before this experiment (" + U.fmt(e.date) + "). Note in Results if you used it anyway.</div>" : "") +
          (on ? '<div class="item-use"><span>Amount used</span><input type="text" placeholder="optional" aria-label="Amount used" data-b="' + PM + '.used" data-log="Edited amounts used" value="' + esc(m.used) + '" ' + dis + "><span>Left after</span><input type=\"text\" placeholder=\"optional\" aria-label=\"Amount left after the experiment\" data-b=\"" + PM + '.left" data-log="Edited amounts used" value="' + esc(m.left) + '" ' + dis + "><span>Unit</span><input type=\"text\" placeholder=\"mL, mg, vials…\" aria-label=\"Unit\" data-b=\"" + PM + '.unit" data-log="Edited amounts used" value="' + esc(m.unit) + '" ' + dis + "></div>" : "") +
          (LB.tmp.openItem === it.id ? LB.itemDetails(it) : "") + "</div>";
      }).join("") : '<div class="muted">No materials in the inventory yet.</div>') + "</div>";
  }
  function procedure(e) {
    const P = "D.entries." + e.id, dis = e.locked ? "disabled" : "", total = e.steps.length, done = e.steps.filter(s => s.done).length;
    const mp = e.map, cells = mp.cells, loaded = cells.filter(c => c.on).length, empties = cells.map((c, i) => (c.on ? 0 : i + 1)).filter(Boolean);
    const pct = total ? Math.round(done / total * 100) : 0;
    const steps = '<div class="card"><div class="row" style="gap:12px">' + LB.ring(pct) + '<div class="grow"><h3 style="margin:0;font-size:15px">Procedure</h3><div class="sm" style="color:' + (total && done === total ? "var(--ok)" : "var(--mute)") + ';font-weight:600">' + (!total ? "No steps yet" : done === total ? "All " + total + " steps done 🎉" : done + " of " + total + " steps done") + '</div></div><button class="link sm" data-a="hideCard" data-card="procedure" ' + dis + ' title="Hide this card in this entry">Hide card</button></div>' +
      e.steps.map((s, i) => '<div class="step' + (s.done ? " done" : "") + '"><input type="checkbox" data-a="toggleStep" data-i="' + i + '" ' + (s.done ? "checked" : "") + " " + dis + ' aria-label="Done"><input type="text" aria-label="Step" data-b="' + P + ".steps." + i + '.t" data-log="Edited a step" value="' + esc(s.t) + '" ' + dis + '>' + LB.stepTimer(e, i, s, dis) + '<button class="x" data-a="rmStep" data-i="' + i + '" ' + dis + ' aria-label="Remove step">×</button></div>').join("") +
      (e.steps.length ? "" : '<div class="muted sm">No steps yet. Add them below, or start entries from a protocol.</div>') +
      '<input type="text" placeholder="+ Add a step and press Enter" aria-label="Add a step" data-b="tmp.newStep" data-enter="addStep" value="' + esc(LB.tmp.newStep || "") + '" ' + dis + ' autocomplete="off" style="border-width:0;border-top:1px solid var(--line2);border-radius:0;padding:10px 2px 2px"></div>';
    const map = '<div class="card"><div class="row"><h3 class="grow">Chip loading map</h3><button class="link sm" data-a="hideCard" data-card="chip" ' + dis + ' title="Hide this card in this entry">Hide card</button></div><div class="muted sm">Click a position to mark it loaded or empty.</div>' +
      '<div class="chipmap"><div class="port"><i></i>IN</div><div class="pipe"></div><div class="chamber" style="grid-template-columns:repeat(' + mp.cols + ',minmax(0,1fr))">' +
      cells.map((c, i) => '<button class="well' + (c.on ? " on" : "") + '" data-a="well" data-i="' + i + '" ' + dis + ' title="' + esc([c.note, c.amt].filter(Boolean).join(" · ")) + '"' + wellStyle(c) + ' aria-label="Position ' + (i + 1) + (c.on ? ", loaded" : ", empty") + '">' + (i + 1) + "</button>").join("") + '</div><div class="pipe"></div><div class="port out"><i></i>OUT</div></div>' +
      '<div class="mapset"><span class="mono">chamber · ' + loaded + "/" + cells.length + ' loaded</span><span class="grow"></span>Rows <input type="number" min="1" max="12" data-b="' + P + '.map.rows" data-t="num" data-act="mapResize" value="' + mp.rows + '" ' + dis + ">× columns <input type=\"number\" min=\"1\" max=\"12\" data-b=\"" + P + '.map.cols" data-t="num" data-act="mapResize" value="' + mp.cols + '" ' + dis + '><button class="link sm" data-a="mapFill" ' + dis + '>Fill all loaded…</button><button class="link sm" data-a="palette" data-i="all" ' + dis + '>Color all loaded…</button><button class="link sm" data-a="mapClear" ' + dis + ">Clear all</button></div>" +
      (LB.tmp.palOpen === "all" && !e.locked ? palette("all", "") : "") +
      (empties.length && loaded ? '<div class="warnbox">Empty positions: ' + empties.join(", ") + ". Note why in Results if this is a deviation.</div>" : "") +
      (() => { const seen = {}; cells.forEach(c => { if (colOf(c)) { const key = colOf(c) + "|" + (c.note || "") + "|" + (c.amt || ""); const o = seen[key] || (seen[key] = { color: colOf(c), note: [c.note, c.amt].filter(Boolean).join(" · "), on: false }); if (c.on) o.on = true; } }); const l = Object.values(seen); return l.length ? '<div class="legend">' + l.map(x => '<span class="lg" style="opacity:' + (x.on ? 1 : 0.45) + '"><i style="background:' + x.color + '"></i>' + esc(x.note || "(no label)") + "</span>").join("") + "</div>" : ""; })() +
      '<div class="lbl">What is in each position</div><div class="poslist">' +
      cells.map((c, i) => '<label class="posrow"><span class="pn' + (c.on ? " on" : "") + '">' + (i + 1) + '</span><input type="text" list="matlist" aria-label="Contents of position ' + (i + 1) + '" placeholder="' + (c.on ? "e.g. MCF-7 spheroid, 180 µm" : "empty") + '" data-b="' + P + ".map.cells." + i + '.note" data-log="Edited chip position notes" value="' + esc(c.note || "") + '" ' + dis + ' autocomplete="off"><input type="text" class="amt" aria-label="Amount in position ' + (i + 1) + '" placeholder="amount" title="Amount, e.g. 50 µL" data-b="' + P + ".map.cells." + i + '.amt" data-log="Edited chip position amounts" value="' + esc(c.amt || "") + '" ' + dis + ' autocomplete="off"><button class="swatch" data-a="palette" data-i="' + i + '" ' + dis + ' aria-label="Choose a color for position ' + (i + 1) + '" title="Color" style="' + (colOf(c) ? "background:" + colOf(c) + ";border-style:solid" : "") + '">' + (colOf(c) ? "" : "+") + '</button></label>' + (LB.tmp.palOpen === String(i) && !e.locked ? palette(i, colOf(c)) : "")).join("") + '</div>' +
      '<datalist id="matlist">' + e.mats.map(m => { const it = LB.D.items.find(x => x.id === m.id); return it ? '<option value="' + esc(it.name) + '">' : ""; }).join("") + '</datalist>' +
      '<div class="lbl">Notes on loading</div>' + T(2, mp.note || "", 'aria-label="Notes on loading" data-b="' + P + '.map.note" data-log="Edited loading notes" ' + dis) + "</div>";
    const cd = cardsOf(e);
    const none = !cd.procedure && !cd.chip && !LB.cardCount(e);
    return (none ? '<div class="empty-cards muted">No cards on this tab yet. Add one from the card toolbar on the far right →</div>' : "") + (cd.procedure || cd.chip ?'<div class="two">' + (cd.procedure ? steps : "") + (cd.chip ? map : "") + "</div>" : "") + LB.cardsList(e);
  }
  function results(e) {
    const P = "D.entries." + e.id, dis = e.locked ? "disabled" : "";
    return '<div class="card" data-dz="addEntryFiles" data-id="' + e.id + '"><h3>Results</h3>' +
      LB.filesGrid(e.files, { act: "addEntryFiles", id: e.id, owner: "e:" + e.id, dis: e.locked }) +
      '<div class="lbl">Observations</div>' + T(7, e.results, 'aria-label="Results" placeholder="Describe what you observed…" data-b="' + P + '.results" data-log="Edited results" ' + dis) + "</div>";
  }
  function conclusion(e) {
    const P = "D.entries." + e.id, dis = e.locked ? "disabled" : "";
    return '<div class="card"><h3>Conclusion &amp; next steps</h3>' + T(8, e.concl, 'aria-label="Conclusion" placeholder="What did you learn? What happens next?" data-b="' + P + '.concl" data-log="Edited conclusion" ' + dis) +
      '<div class="row muted sm">Ready? <button class="btn dark sm" data-a="toggleLock">' + (e.locked ? "Unlock" : "Sign &amp; lock") + "</button></div></div>";
  }
  /* section notes live in the right pane (Notes tab); they follow the section that is open in the middle */
  function notesPane(e) {
    const dis = e.locked ? "disabled" : "", others = visSecs(e).filter(i => i !== LB.ui.sec && (e.sn[i] || "").trim());
    return '<div class="notes"><div class="row"><b style="color:#6b5a12">' + SEC[LB.ui.sec] + '</b><span class="sm" style="color:#8f7d2e">scratch space for thoughts and reminders</span></div>' +
      T(12, e.sn[LB.ui.sec] || "", 'aria-label="Section notes" placeholder="Jot down thoughts, questions or reminders for this section…" data-b="D.entries.' + e.id + ".sn." + LB.ui.sec + '" data-log="Edited notes" ' + dis) + "</div>" +
      (others.length ? '<div class="lbl">Notes in other sections</div>' + others.map(i => '<button class="nlink" data-a="setSec" data-n="' + i + '"><b>' + SEC[i] + "</b><span>" + esc(e.sn[i].trim().slice(0, 90)) + "</span></button>").join("") : "");
  }
  function emptyState() {
    return '<div class="empty"><div class="h" style="font-size:20px">Welcome to your lab book</div><div>Create your first entry to get started, or look around with example data.</div><div class="row"><button class="btn pri" data-a="newEntry">+ New entry</button><button class="btn" data-a="demo">Load example data</button></div>' +
      '<div class="muted sm" style="max-width:420px">Tip: open the “Saved in this browser” button at the top to choose a folder. From then on every change is also saved into a LabGorilla.lbk file.</div></div>';
  }
  function main() {
    const e = LB.cur();
    if (!e) return '<main class="main">' + emptyState() + "</main>";
    if (!visSecs(e).includes(LB.ui.sec)) LB.ui.sec = 0;
    const body = [overview, materials, procedure, results, conclusion][LB.ui.sec](e);
    return '<main class="main">' + head(e) + secBar(e) + '<div class="mscroll" data-scroll="main">' + body + (LB.ui.sec === 0 ? LB.refsCard("entry", e, e.id) : "") + "</div></main>";
  }

  /* ---------- right panel ---------- */
  LB.upcoming = function (n) { const t = U.today(); return LB.D.events.filter(v => v.date >= t).sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "")).slice(0, n); };
  function right() {
    const e = LB.cur(); if (!e) return "";
    const D = LB.D, tab = LB.ui.tab;
    const TABS = ["Inventory", "Comments" + (e.comments.length ? " (" + e.comments.length + ")" : ""), "History", "Notes" + ((e.sn[LB.ui.sec] || "").trim() ? " •" : "")], ORDER = [3, 0, 1, 2];
    let body = "";
    if (tab === 3) body = notesPane(e);
    else if (tab === 0) {
      body = '<div class="muted sm">Materials used in this entry, taken from your lab inventory.</div>' + e.mats.map(m => {
        const it = D.items.find(i => i.id === m.id); if (!it) return "";
        const u = []; if (m.used) u.push("used " + m.used + " " + m.unit); if (m.left) u.push(m.left + " " + m.unit + " left");
        return '<div class="lin"><div class="n"><b>' + esc(it.name) + '</b><div class="s">' + esc(it.sub) + "</div>" + LB.expBadge(it) + (u.length ? '<div class="u">' + esc(u.join(" · ")) + "</div>" : "") + '</div><button class="x" data-a="toggleMat" data-id="' + it.id + '" aria-label="Unlink" ' + (e.locked ? "disabled" : "") + ">×</button></div>";
      }).join("") + (cardsOf(e).materials ? '<button class="link sm" data-a="setSec" data-n="1">+ link or add a material</button>' : "");
    } else if (tab === 1) {
      body = e.comments.map(c => '<div class="lin" style="flex-direction:column;gap:2px"><div class="sm" style="color:var(--acc-d);font-weight:600">' + esc(c.who) + ' <span class="muted" style="font-weight:400">· ' + U.stampStr(c.at) + '</span></div><div style="font-size:13px;line-height:1.5;white-space:pre-wrap">' + esc(c.text) + "</div></div>").join("") +
        (e.comments.length ? "" : '<div class="muted sm">No comments yet. Comments stay possible after an entry is locked.</div>') +
        '<input type="text" aria-label="Write a comment" placeholder="Write a comment, press Enter" data-b="tmp.comment" data-enter="addComment" value="' + esc(LB.tmp.comment) + '" autocomplete="off">';
    } else {
      body = e.hist.map(h => '<div class="hist"><time>' + U.stampStr(h.at) + "</time><span>" + esc(h.msg) + "</span></div>").join("") + '<div class="muted sm" style="padding-top:6px">Every change is kept with its time.</div>';
    }
    const up = LB.upcoming(3);
    return '<aside class="right" data-scroll="right"><div class="tabs">' + ORDER.map(i => '<button class="tab' + (i === tab ? " on" : "") + '" data-a="setTab" data-n="' + i + '">' + TABS[i] + "</button>").join("") + '</div><div class="col" style="gap:8px">' + body + "</div>" +
      '<div class="next"><div class="lbl">Next up</div>' + (up.length ? up.map(v => '<div class="row sm" style="align-items:baseline"><span class="mono" style="color:var(--acc-d);white-space:nowrap">' + U.fmt(v.date, false) + "</span><span>" + esc(v.title) + "</span></div>").join("") : '<div class="muted sm">Nothing planned.</div>') + '<button class="link sm" data-a="nav" data-v="calendar">Open calendar →</button></div></aside>';
  }
  LB.views.notebook = () => side() + main() + right() + (LB.cur() ? LB.cardsDock(LB.cur()) : "");

  /* ---------- actions ---------- */
  const entryOK = () => { const e = LB.cur(); return e && !e.locked ? e : null; };
  A.openEntry = el => LB.openEntry(el.dataset.id);
  A.toggleProj = el => { if (LB.tmp.treeQ) return; LB.ui.openProj[el.dataset.id] = LB.ui.openProj[el.dataset.id] === false; LB.saveUI(); LB.render(); };
  A.toggleExp = (el, ev) => { if (ev.target.closest(".tools") || LB.tmp.treeQ) return; LB.ui.openExp[el.dataset.id] = LB.ui.openExp[el.dataset.id] === false; LB.saveUI(); LB.render(); };
  A.treeAll = el => {
    const open = el.dataset.v === "1"; LB.D.projects.forEach(p => { LB.ui.openProj[p.id] = open; }); LB.D.experiments.forEach(x => { LB.ui.openExp[x.id] = open; });
    LB.saveUI(); LB.render();
  };
  A.setSec = el => { LB.ui.sec = +el.dataset.n; LB.saveUI(); LB.render(); };
  A.setTab = el => { LB.ui.tab = +el.dataset.n; LB.saveUI(); LB.render(); };
  A.entryDate = el => { const e = LB.cur(); if (!e || !el.value) return; LB.log(e, "Changed experiment date to " + U.fmt(e.date, true)); LB.save(); LB.render(); };
  A.toggleLock = () => { const e = LB.cur(); if (!e) return; e.locked = !e.locked; LB.log(e, e.locked ? "Signed and locked" : "Unlocked for editing"); LB.save(); LB.render(); LB.toast(e.locked ? "Entry signed and locked." : "Entry unlocked for editing."); };
  A.toggleMat = el => {
    const e = entryOK(); if (!e) return; const k = e.mats.findIndex(m => m.id === el.dataset.id);
    if (k >= 0) e.mats.splice(k, 1);
    else {
      e.mats.push({ id: el.dataset.id, used: "", left: "", unit: "" });
      const it = LB.D.items.find(i => i.id === el.dataset.id), x = it && LB.expiry(it);
      if (it && LB.expiredOn(it, e.date)) LB.toast("⚠ " + it.name + " expired on " + U.fmt(it.expires) + ", before this experiment.");
      else if (x && x.state === "soon") LB.toast("⏳ " + it.name + ": " + x.txt.toLowerCase() + ".");
    }
    LB.log(e, "Changed linked materials"); LB.save(); LB.render();
  };
  A.toggleStep = el => { const e = entryOK(); if (!e) return; const s = e.steps[+el.dataset.i]; s.done = !s.done; LB.log(e, "Ticked a step"); LB.save(); LB.render(); };
  A.rmStep = el => { const e = entryOK(); if (!e) return; e.steps.splice(+el.dataset.i, 1); LB.log(e, "Removed a step"); LB.save(); LB.render(); };
  A.addStep = el => { const e = entryOK(), v = el.value.trim(); if (!e || !v) return; e.steps.push({ t: v, done: false }); LB.tmp.newStep = ""; LB.log(e, "Added a step"); LB.save(); LB.render(); };
  A.well = el => { const e = entryOK(); if (!e) return; const c = e.map.cells[+el.dataset.i]; c.on = !c.on; LB.log(e, "Changed chip loading map"); LB.save(); LB.render(); };
  A.mapClear = () => { const e = entryOK(); if (!e) return; e.map.cells.forEach(c => { c.on = false; }); LB.save(); LB.render(); };
  const paint = (i, color) => {
    const e = entryOK(); if (!e) return;
    if (i === "all") e.map.cells.forEach(c => { if (c.on) c.color = color; }); else e.map.cells[+i].color = color;
    LB.tmp.palOpen = null; LB.log(e, i === "all" ? "Colored loaded chip positions" : "Changed chip position color"); LB.save(); LB.render();
  };
  A.palette = el => { LB.tmp.palOpen = LB.tmp.palOpen === el.dataset.i ? null : el.dataset.i; LB.render(); };
  A.setColor = el => paint(el.dataset.i, el.dataset.c);
  A.customColor = el => { if (el.value) paint(el.dataset.i, el.value); };
  A.tabMenu = () => { LB.tmp.tabMenu = !LB.tmp.tabMenu; LB.render(); };
  A.toggleTab = el => {
    const e = entryOK(); if (!e) return; const c = cardsOf(e), k = el.dataset.k; c[k] = !c[k];
    LB.log(e, (c[k] ? "Added the " : "Hid the ") + k.replace(/^tab/, "").toLowerCase() + " tab"); LB.save(); LB.render();
  };
  document.addEventListener("click", ev => { if (LB.tmp.tabMenu && !ev.target.closest(".tabmenu") && !ev.target.closest('[data-a="tabMenu"]')) { LB.tmp.tabMenu = false; LB.render(); } });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && LB.tmp.tabMenu) { LB.tmp.tabMenu = false; LB.render(); } });
  A.hideCard = el => { const e = entryOK(); if (!e) return; cardsOf(e)[el.dataset.card] = false; LB.log(e, "Hid a card"); LB.save(); LB.render(); };
  A.showCard = el => { const e = entryOK(); if (!e) return; cardsOf(e)[el.dataset.card] = true; LB.log(e, "Added a card back"); LB.save(); LB.render(); };
  A.mapFill = () => {
    const e = entryOK(); if (!e) return;
    const v = prompt("What do all the loaded positions contain? (e.g. MCF-7 spheroid, 150–200 µm)", "");
    if (v === null) return; e.map.cells.forEach(c => { if (c.on) c.note = v.trim(); });
    LB.log(e, "Filled chip position notes"); LB.save(); LB.render();
  };
  A.mapResize = () => {
    const e = entryOK(); if (!e) return; const m = e.map;
    m.rows = Math.max(1, Math.min(12, Math.round(m.rows) || 1)); m.cols = Math.max(1, Math.min(12, Math.round(m.cols) || 1));
    const n = m.rows * m.cols; while (m.cells.length < n) m.cells.push({ on: false, note: "" }); m.cells.length = n;
    LB.log(e, "Resized chip map to " + m.rows + " × " + m.cols); LB.save(); LB.render();
  };
  A.addComment = el => { const e = LB.cur(), v = el.value.trim(); if (!e || !v) return; e.comments.push({ who: "You", text: v, at: Date.now() }); LB.tmp.comment = ""; LB.log(e, "Added a comment"); LB.save(); LB.render(); };

  /* entries */
  A.newEntry = el => {
    const D = LB.D, e = LB.cur(), expId = (el && el.dataset && el.dataset.exp) || (e && e.expId) || (D.experiments[0] && D.experiments[0].id) || "__new";
    LB.tmp.nw = { title: "", expId, newExp: "", projId: (D.projects[0] && D.projects[0].id) || "__new", newProj: "", date: U.today(), proto: LB.tmp.nwProto || "" };
    LB.tmp.nwProto = ""; LB.tmp.pop = "new"; LB.render();
    const t = document.querySelector('[data-b="tmp.nw.title"]'); if (t) t.focus();
  };
  A.createEntry = () => {
    const D = LB.D, nw = LB.tmp.nw; let x;
    if (nw.expId === "__new" || !D.experiments.length) {
      let pid = nw.projId;
      if (pid === "__new" || !D.projects.length) { const p = { id: U.uid(), name: (nw.newProj || "").trim() || "My project" }; D.projects.push(p); pid = p.id; }
      x = { id: U.uid(), projectId: pid, name: (nw.newExp || "").trim() || "New experiment", num: ++D.expSeq }; D.experiments.push(x);
    } else x = D.experiments.find(z => z.id === nw.expId);
    const pr = nw.proto ? D.protocols[nw.proto] : null;
    const n = Object.values(D.entries).filter(e => e.expId === x.id).length;
    const e = { id: U.uid(), expId: x.id, code: LB.expCode(x) + U.letter(n), title: nw.title.trim() || (pr ? pr.title : "Untitled entry"), date: nw.date || U.today(), entered: U.today(), enteredAt: Date.now(), locked: false,
      aim: "", hyp: "", results: "", concl: "", sn: ["", "", "", "", ""], steps: pr ? pr.steps.map(t => ({ t, done: false })) : [], protocol: pr ? { id: nw.proto, ver: pr.ver, title: pr.title } : null,
      map: LB.newMap(), extra: [], mats: pr ? pr.mats.filter(id => D.items.some(i => i.id === id)).map(id => ({ id, used: "", left: "", unit: "" })) : [], files: [], comments: [], hist: [] };
    LB.log(e, pr ? "Entry created from " + pr.title + " v" + pr.ver : "Entry created");
    D.entries[e.id] = e; LB.tmp.pop = ""; LB.ui.openExp[x.id] = true; LB.ui.openProj[x.projectId] = true;
    LB.save(); LB.openEntry(e.id, pr ? 2 : 0);
  };
  A.delEntry = async () => {
    const e = LB.cur(); if (!e || !confirm("Delete “" + e.title + "” for good? Its attached files are deleted too.")) return;
    for (const f of e.files) await LB.fileRemove(f);
    LB.dropTimelineEvents(e); delete LB.D.entries[e.id]; LB.ui.cur = ""; LB.save(); LB.saveUI(); LB.render();
  };
  /* projects & experiments */
  A.addProj = () => { const n = prompt("Name of the new project:"); if (!n || !n.trim()) return; LB.D.projects.push({ id: U.uid(), name: n.trim() }); LB.save(); LB.render(); };
  A.renameProj = el => { const p = LB.D.projects.find(x => x.id === el.dataset.id), n = prompt("Rename project:", p.name); if (n && n.trim()) { p.name = n.trim(); LB.save(); LB.render(); } };
  A.delProj = el => {
    const D = LB.D, p = D.projects.find(x => x.id === el.dataset.id), exps = D.experiments.filter(x => x.projectId === p.id);
    if (exps.length) { alert("This project still has experiments. Delete or move them first."); return; }
    if (confirm("Delete the empty project “" + p.name + "”?")) { D.projects = D.projects.filter(x => x !== p); LB.save(); LB.render(); }
  };
  A.addExp = el => {
    const n = prompt("Name of the new experiment:"); if (!n || !n.trim()) return;
    LB.D.experiments.push({ id: U.uid(), projectId: el.dataset.id, name: n.trim(), num: ++LB.D.expSeq }); LB.save(); LB.render();
  };
  A.renameExp = el => { const x = LB.D.experiments.find(z => z.id === el.dataset.id), n = prompt("Rename experiment:", x.name); if (n && n.trim()) { x.name = n.trim(); LB.save(); LB.render(); } };
  A.delExp = async el => {
    const D = LB.D, x = D.experiments.find(z => z.id === el.dataset.id), es = Object.values(D.entries).filter(e => e.expId === x.id);
    if (!confirm("Delete experiment “" + x.name + "”" + (es.length ? " and its " + es.length + " entries (files included)" : "") + "?")) return;
    for (const e of es) { for (const f of e.files) await LB.fileRemove(f); LB.dropTimelineEvents(e); delete D.entries[e.id]; }
    D.experiments = D.experiments.filter(z => z !== x); if (!D.entries[LB.ui.cur]) LB.ui.cur = ""; LB.save(); LB.render();
  };

  /* ---------- PDF export: choose what goes in, then print dialog → Save as PDF ---------- */
  const EXPORT_ITEMS = [["aim", "Aim and hypothesis"], ["materials", "Materials"], ["procedure", "Procedure steps"], ["chip", "Chip loading map"], ["cards", "Lab cards (plate maps, timeline…)"], ["results", "Results (observations)"], ["files", "Attached images and files"], ["conclusion", "Conclusion and next steps"], ["notes", "My section notes"], ["refs", "References"], ["comments", "Comments"], ["history", "Change history"]];
  const exportAvail = (e, k) => {
    const c = cardsOf(e);
    if (k === "materials") return c.materials;
    if (k === "procedure" || k === "chip") return c.tabProcedure && c[k];
    if (k === "cards") return c.tabProcedure;
    if (k === "results" || k === "files") return c.tabResults;
    if (k === "conclusion") return c.tabConclusion;
    return true;
  };
  LB.exportModal = function () {
    const e = LB.cur(); if (!e) return ""; const o = LB.ui.exportOpts;
    return '<div class="backdrop" data-a="closeModal"><div class="modal"><h2>Export PDF</h2><div class="muted sm">Choose what to include. The entry details at the top are always included.</div><div class="expgrid">' +
      EXPORT_ITEMS.map(([k, l]) => { const av = exportAvail(e, k); return '<label class="expitem' + (av ? "" : " off") + '"><input type="checkbox" data-b="ui.exportOpts.' + k + '" ' + (o[k] && av ? "checked" : "") + " " + (av ? "" : "disabled") + ' style="accent-color:var(--acc);margin:0">' + l + (av ? "" : ' <span class="muted sm">(switched off in this entry)</span>') + "</label>"; }).join("") + "</div>" +
      '<label class="row sm" style="gap:8px;font-weight:600;color:var(--mute)">Reference style<select data-b="ui.refStyle" aria-label="Reference style" style="font-weight:500;color:var(--ink)"><option value="numbered"' + (LB.ui.refStyle !== "authoryear" ? " selected" : "") + '>Numbered: [1] Smith J (2020)…</option><option value="authoryear"' + (LB.ui.refStyle === "authoryear" ? " selected" : "") + ">Author–year: alphabetical, no numbers</option></select></label>" +
      '<div class="row"><button class="link sm" data-a="exportAll" data-v="1">Select all</button><button class="link sm" data-a="exportAll" data-v="0">Select none</button></div>' +
      '<div class="muted sm">In the next window choose “Save as PDF” as the destination. Your choices are remembered.</div>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn" data-a="closeModal" data-force="1">Cancel</button><button class="btn pri" data-a="exportGo">Continue</button></div></div></div>';
  };
  A.exportPdf = () => { if (!LB.cur()) return; LB.tmp.pop = "export"; LB.render(); };
  A.exportAll = el => { const e = LB.cur(); EXPORT_ITEMS.forEach(([k]) => { LB.ui.exportOpts[k] = el.dataset.v === "1" && exportAvail(e, k); }); LB.saveUI(); LB.render(); };
  A.exportGo = async () => {
    const e = LB.cur(); if (!e) return; LB.tmp.pop = ""; LB.render();
    const D = LB.D, x = LB.expOf(e), proj = x && D.projects.find(p => p.id === x.projectId), cd = cardsOf(e), o = LB.ui.exportOpts;
    const on = k => o[k] && exportAvail(e, k);
    const tx = (t, v, cls) => v && v.trim() ? "<section" + (cls ? ' class="' + cls + '"' : "") + "><h2>" + t + '</h2><div class="tx">' + esc(v) + "</div></section>" : "";
    const note = (label, v) => (o.notes && v && v.trim() ? '<div class="note"><b>' + label + ":</b> " + esc(v) + "</div>" : "");
    const signed = e.hist.slice().reverse().find(h => /^Signed/.test(h.msg));
    let h = '<div class="ph"><span class="pb">LabGorilla · Lab notebook</span><span class="stamp' + (e.locked ? " ok" : "") + '">' + (e.locked ? "Signed &amp; locked" + (signed ? " · " + U.stampStr(signed.at) : "") : "Draft") + "</span></div>";
    h += "<h1>" + esc(e.title) + "</h1>";
    const gap = U.daysBetween(e.date, e.entered);
    const rows = [["Entry", esc(e.code)], ["Project / experiment", esc((proj ? proj.name + " / " : "") + (x ? LB.expCode(x) + " · " + x.name : "–"))], ["Experiment date", U.fmtLong(e.date)],
      ["Entered in the lab book", U.fmt(e.entered, true) + (gap > 0 ? " (" + gap + (gap === 1 ? " day" : " days") + " after the experiment)" : "")], ["Protocol", e.protocol ? esc(e.protocol.title) + " (v" + e.protocol.ver + ")" : "none"]];
    h += '<table class="pmeta">' + rows.map(r => "<tr><th>" + r[0] + "</th><td>" + r[1] + "</td></tr>").join("") + "</table>";
    if (on("aim")) h += tx("Aim", e.aim) + tx("Hypothesis", e.hyp);
    h += note("Notes", e.sn[0]);
    const mats = e.mats.map(m => ({ m, it: D.items.find(i => i.id === m.id) })).filter(r => r.it);
    if (on("materials") && mats.length) h += '<section class="long"><h2>Materials</h2><table class="t"><tr><th>Item</th><th>Type</th><th>Details</th><th>Expires</th><th>Used</th><th>Left after</th></tr>' + mats.map(({ m, it }) => "<tr><td>" + esc(it.name) + "</td><td>" + esc(it.kind) + "</td><td>" + esc(it.sub) + "</td><td>" + (it.expires ? (LB.expiredOn(it, e.date) ? "⚠ " : "") + U.fmt(it.expires) : "") + "</td><td>" + esc(m.used ? (m.used + " " + m.unit).trim() : "") + "</td><td>" + esc(m.left ? (m.left + " " + m.unit).trim() : "") + "</td></tr>").join("") + "</table></section>";
    if (cd.materials) h += note("Notes (materials)", e.sn[1]);
    if (on("procedure") && e.steps.length) h += '<section class="long"><h2>Procedure</h2><table class="t"><tr><th style="width:22pt">#</th><th>Step</th><th class="ck">Done</th></tr>' + e.steps.map((s, i) => "<tr><td>" + (i + 1) + "</td><td>" + esc(s.t) + '</td><td class="ck">' + (s.done ? "☑" : "☐") + "</td></tr>").join("") + "</table></section>";
    const mp = e.map, loaded = mp.cells.filter(c => c.on).length;
    if (on("chip") && (loaded || mp.cells.some(c => c.note || c.amt))) {
      const sz = Math.max(18, Math.min(38, Math.floor(430 / mp.cols) - 6));
      const cell = (c, i) => {
        const k = colOf(c);
        const st = c.on ? (k ? "background:" + k + ";border-color:color-mix(in srgb," + k + " 55%,#000);color:#1b2030" : "") : (k ? "border-color:color-mix(in srgb," + k + " 35%,#b9bdca)" : "");
        return '<i class="' + (c.on ? "on" : "off") + '" style="width:' + sz + "pt;height:" + sz + "pt;font-size:" + Math.round(sz * 0.36) + "pt;" + st + '">' + (i + 1) + "</i>";
      };
      h += '<section><h2>Chip loading</h2><div class="chip" style="grid-template-columns:repeat(' + mp.cols + "," + sz + 'pt)">' + mp.cells.map(cell).join("") + '</div><div class="small">' + loaded + " of " + mp.cells.length + " positions loaded (" + mp.rows + " × " + mp.cols + "). Empty positions (shown faded): " + (mp.cells.map((c, i) => (c.on ? 0 : i + 1)).filter(Boolean).join(", ") || "none") + ".</div>" +
        (mp.cells.some(c => c.note || c.amt) ? '<table class="t" style="margin-top:5pt"><tr><th style="width:34pt">Pos.</th><th>Contents</th><th style="width:70pt">Amount</th></tr>' + mp.cells.map((c, i) => (c.note || c.amt ? "<tr><td>" + (i + 1) + "</td><td>" + (colOf(c) ? '<i class="sw" style="background:' + colOf(c) + '"></i>' : "") + esc(c.note || "") + "</td><td>" + esc(c.amt || "") + "</td></tr>" : "")).join("") + "</table>" : "") +
        (mp.note ? '<div class="tx" style="margin-top:5pt">' + esc(mp.note) + "</div>" : "") + "</section>";
    }
    if (on("cards")) h += await LB.cardsPrint(e);
    if (cd.tabProcedure) h += note("Notes (procedure)", e.sn[2]);
    if (on("results")) h += tx("Results", e.results, "long");
    if (on("files")) {
      const figs = [], others = [];
      for (const f of e.files) {
        if (LB.isImage(f)) { const u = await LB.fileUrl(f); if (u) { figs.push('<figure><img src="' + u + '" alt="' + esc(f.name) + '"><figcaption>' + esc(f.name) + "</figcaption></figure>"); continue; } }
        others.push(esc(f.name) + " (" + U.size(f.size || 0) + ")");
      }
      if (figs.length || others.length) h += '<section class="long"><h2>Attached files</h2>' + (figs.length ? '<div class="imgs">' + figs.join("") + "</div>" : "") + (others.length ? '<div class="small" style="margin-top:6pt">Other files: ' + others.join(", ") + "</div>" : "") + "</section>";
    }
    if (cd.tabResults) h += note("Notes (results)", e.sn[3]);
    if (on("conclusion")) h += tx("Conclusion &amp; next steps", e.concl);
    if (cd.tabConclusion) h += note("Notes (conclusion)", e.sn[4]);
    if (on("refs")) h += LB.refsPrint(e);
    if (on("comments") && e.comments.length) h += '<section class="long rec"><h2>Comments</h2>' + e.comments.map(c => "<div><b>" + esc(c.who) + '</b> <span class="small">' + U.stampStr(c.at) + "</span><br>" + esc(c.text) + "</div>").join("") + "</section>";
    if (on("history")) h += '<section class="long rec"><h2>Change history</h2>' + e.hist.slice().reverse().map(z => '<div class="small">' + U.stampStr(z.at) + " · " + esc(z.msg) + "</div>").join("") + "</section>";
    h += '<div class="small">Printed ' + U.fmt(U.today(), true) + " from LabGorilla.</div>";
    const p = document.getElementById("print");
    // spacer rows in thead/tfoot repeat on every printed page, giving real top/bottom margins whatever the print dialog's margin setting is
    p.innerHTML = '<table class="pg"><thead><tr><td></td></tr></thead><tfoot><tr><td>' + esc(e.code) + " · " + esc(e.title) + " · LabGorilla</td></tr></tfoot><tbody><tr><td>" + h + "</td></tr></tbody></table>";
    await Promise.race([Promise.all(Array.from(p.querySelectorAll("img")).map(i => (i.decode ? i.decode().catch(() => { }) : 0))), new Promise(r => setTimeout(r, 4000))]);
    const old = document.title; document.title = e.code + " " + e.title;   // becomes the suggested PDF file name
    window.print(); setTimeout(() => { document.title = old; }, 500);
  };
})(window.LB);
