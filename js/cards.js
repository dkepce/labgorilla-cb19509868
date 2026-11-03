/* LabGorilla — lab cards for the Procedure tab: the card picker, plate map, timeline, flow path, freezer box,
   dilution series and gel lanes (each can be added several times to an entry), plus step timers and the progress ring. */
(function (LB) {
  const U = LB.U, esc = U.esc, A = LB.actions;
  const num = v => { const n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(n) ? n : NaN; };
  const extra = e => e.extra || (e.extra = []);
  const PAL = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#9ca3af", "#1b2030"];
  const rowName = r => (r < 26 ? String.fromCharCode(65 + r) : "A" + String.fromCharCode(65 + r - 26));
  const pathOf = (e, c) => "D.entries." + e.id + ".extra." + extra(e).indexOf(c);
  const cardById = id => { const e = LB.cur(); return e ? extra(e).find(c => c.id === id) : null; };
  const live = () => { const e = LB.cur(); return e && !e.locked ? e : null; };
  const sel = (opts, cur) => opts.map(o => '<option' + (o === cur ? " selected" : "") + ">" + esc(o) + "</option>").join("");
  const field = (label, html, style) => '<label class="cf"' + (style ? ' style="' + style + '"' : "") + '><span class="lbl">' + label + "</span>" + html + "</label>";
  const txt = (P, k, v, dis, ph, extraAttr) => '<input type="text" data-b="' + P + "." + k + '" data-rin="1" value="' + esc(v) + '" placeholder="' + esc(ph || "") + '" ' + dis + " autocomplete=\"off\" " + (extraAttr || "") + ">";

  /* ---------- icons ---------- */
  const IC = {
    steps: '<path d="M5 6l2 2 3-3M5 14l2 2 3-3M13 7h7M13 15h7"/>',
    chip: '<rect x="3" y="7" width="18" height="10" rx="3"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/>',
    plate: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="10" r="1.2"/><circle cx="16" cy="10" r="1.2"/><circle cx="8" cy="14" r="1.2"/><circle cx="12" cy="14" r="1.2"/><circle cx="16" cy="14" r="1.2"/>',
    timeline: '<path d="M3 12h18"/><circle cx="6" cy="12" r="2" fill="var(--card)"/><circle cx="12" cy="12" r="2" fill="var(--card)"/><circle cx="18" cy="12" r="2" fill="var(--card)"/>',
    flow: '<rect x="2" y="9" width="6" height="6" rx="1"/><path d="M8 12h3M16 12h2"/><rect x="11" y="8" width="5" height="8" rx="2"/><path d="M18 9.5l3 2.5-3 2.5"/>',
    box: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16"/>',
    dilution: '<path d="M5 4v10a3 3 0 0 0 6 0V4M13 4v10a3 3 0 0 0 6 0V4"/><path d="M5 11h6M13 14h6" stroke-opacity=".5"/>',
    gel: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 7.5v2M12 7.5v2M16 7.5v2M8 14h0M12 12.5h.01M16 15h.01M8 16.5h.01"/>'
  };
  const icon = (k, s) => '<svg viewBox="0 0 24 24" width="' + (s || 26) + '" height="' + (s || 26) + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + "</svg>";

  /* progress ring (used for the procedure steps) */
  LB.ring = function (pct, label) {
    const r = 15, c = 2 * Math.PI * r;
    return '<span class="ring" role="img" aria-label="' + pct + ' percent done"><svg viewBox="0 0 38 38" width="38" height="38"><circle cx="19" cy="19" r="' + r + '" fill="none" stroke="var(--line2)" stroke-width="4"/><circle cx="19" cy="19" r="' + r + '" fill="none" stroke="' + (pct === 100 ? "#22a06b" : "var(--acc)") + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + (c * pct / 100).toFixed(1) + " " + c.toFixed(1) + '" transform="rotate(-90 19 19)"/></svg><b>' + (label == null ? pct + "%" : label) + "</b></span>";
  };

  /* ================= PLATE MAP ================= */
  const PLATES = { 6: [2, 3], 12: [3, 4], 24: [4, 6], 48: [6, 8], 96: [8, 12], 384: [16, 24] };
  const WSZ = { 6: 54, 12: 46, 24: 38, 48: 31, 96: 26, 384: 17 };
  function wells(c) { const [R, C] = PLATES[c.fmt] || PLATES[96]; while (c.wells.length < R * C) c.wells.push(""); c.wells.length = R * C; return [R, C]; }
  const condOf = (c, id) => c.conds.find(k => k.id === id);
  const brushOf = c => { const b = (LB.tmp.brush || {})[c.id]; return b === undefined ? (c.conds[0] ? c.conds[0].id : "") : b; };
  const wellName = (c, i, C) => rowName(Math.floor(i / C)) + (i % C + 1);
  function plateBody(e, c, P, dis) {
    const [R, C] = wells(c), sz = WSZ[c.fmt] || 26, br = brushOf(c), cnt = {};
    c.wells.forEach(w => { if (w) cnt[w] = (cnt[w] || 0) + 1; });
    const conds = c.conds.map((k, i) => '<div class="cond' + (br === k.id ? " sel" : "") + '"><button class="cdot" data-a="brush" data-card="' + c.id + '" data-k="' + k.id + '" style="background:' + esc(k.color) + '" aria-label="Paint with ' + esc(k.name) + '" title="Paint with this"></button>' +
      '<input type="text" aria-label="Condition name" data-b="' + P + ".conds." + i + '.name" value="' + esc(k.name) + '" ' + dis + ' autocomplete="off"><input type="color" class="pcol" aria-label="Color" data-b="' + P + ".conds." + i + '.color" data-render="1" value="' + esc(k.color) + '" ' + dis + '>' +
      '<span class="muted sm">' + (cnt[k.id] || 0) + '</span><button class="x" data-a="rmCond" data-card="' + c.id + '" data-i="' + i + '" ' + dis + ' aria-label="Remove condition">×</button></div>').join("");
    let grid = '<span></span>' + Array.from({ length: C }, (_, j) => '<button class="ph" data-a="plateLine" data-card="' + c.id + '" data-t="c" data-i="' + j + '" ' + dis + ' title="Paint whole column">' + (j + 1) + "</button>").join("");
    for (let r = 0; r < R; r++) {
      grid += '<button class="ph" data-a="plateLine" data-card="' + c.id + '" data-t="r" data-i="' + r + '" ' + dis + ' title="Paint whole row">' + rowName(r) + "</button>";
      for (let j = 0; j < C; j++) {
        const i = r * C + j, k = condOf(c, c.wells[i]);
        grid += '<button class="pw' + (k ? " on" : "") + '" data-pw="' + i + '" data-card="' + c.id + '" ' + dis + ' style="' + (k ? "background:" + k.color : "") + '" title="' + wellName(c, i, C) + (k ? " · " + esc(k.name) : "") + '" aria-label="Well ' + wellName(c, i, C) + '">' + (sz >= 38 ? wellName(c, i, C) : "") + "</button>";
      }
    }
    return '<div class="row wrap" style="gap:12px">' + field("Plate", '<select data-file="plateFmt" data-card="' + c.id + '" ' + dis + ">" + Object.keys(PLATES).map(k => '<option value="' + k + '"' + (String(c.fmt) === k ? " selected" : "") + ">" + k + "-well</option>").join("") + "</select>") +
      '<span class="muted sm grow" style="align-self:flex-end;padding-bottom:8px">Pick a condition, then click or drag over wells. Click a letter or number to paint a whole row or column. Click a painted well again to clear it.</span></div>' +
      '<div class="conds">' + conds + '<button class="cond erase' + (br === "" ? " sel" : "") + '" data-a="brush" data-card="' + c.id + '" data-k="">⌫ Erase</button><button class="link sm" data-a="addCond" data-card="' + c.id + '" ' + dis + '>+ Condition</button><button class="link sm" data-a="plateCopy" data-card="' + c.id + '" title="Copy the plate layout (which condition is in which well) to paste into Excel or Prism" style="margin-left:auto">Copy layout</button><button class="link sm" data-a="plateClear" data-card="' + c.id + '" ' + dis + '>Clear plate</button></div>' +
      '<div class="plate-wrap"><div class="plate" style="--sz:' + sz + "px;grid-template-columns:auto repeat(" + C + ',var(--sz))">' + grid + "</div></div>" +
      '<div class="muted sm">' + c.wells.filter(Boolean).length + " of " + R * C + " wells used</div>";
  }
  function plateStyleWell(el, c, i) {
    const k = condOf(c, c.wells[i]); el.style.background = k ? k.color : ""; el.classList.toggle("on", !!k);
    const C = (PLATES[c.fmt] || PLATES[96])[1]; el.title = wellName(c, i, C) + (k ? " · " + k.name : "");
  }
  function plateLegend(c) {
    const cnt = {}; c.wells.forEach(w => { if (w) cnt[w] = (cnt[w] || 0) + 1; });
    return c.conds.filter(k => cnt[k.id]).map(k => '<span class="lg"><i style="background:' + esc(k.color) + '"></i>' + esc(k.name) + " (" + cnt[k.id] + ")</span>").join("");
  }
  function platePrint(e, c) {
    const [R, C] = wells(c), s = ({ 6: 30, 12: 26, 24: 22, 48: 18, 96: 15, 384: 9 })[c.fmt] || 15;
    let t = '<table class="g"><tr><th></th>' + Array.from({ length: C }, (_, j) => "<th>" + (j + 1) + "</th>").join("") + "</tr>";
    for (let r = 0; r < R; r++) { t += "<tr><th>" + rowName(r) + "</th>"; for (let j = 0; j < C; j++) { const k = condOf(c, c.wells[r * C + j]); t += '<td style="width:' + s + "pt;height:" + s + "pt;" + (k ? "background:" + k.color + ";border-color:#555" : "") + '"></td>'; } t += "</tr>"; }
    return '<div class="small">' + c.fmt + "-well plate</div>" + t + "</table>" + '<div class="legend" style="margin-top:4pt">' + plateLegend(c) + "</div>";
  }

  /* ================= TIMELINE ================= */
  const KINDS = { seed: ["🌱", "Seeding"], drug: ["💊", "Treatment"], medium: ["💧", "Medium change"], image: ["🔬", "Imaging"], passage: ["🧫", "Passage"], other: ["•", "Other"] };
  const tlSorted = c => c.events.map((v, i) => ({ v, i })).filter(r => isFinite(num(r.v.day))).sort((a, b) => num(a.v.day) - num(b.v.day) || a.i - b.i);
  const tlDate = (e, c, d) => U.add(c.start || e.date, Math.round(d));
  function timelineBody(e, c, P, dis) {
    const evs = tlSorted(c), done = c.events.filter(v => v.done).length, n = c.events.length;
    const strip = evs.map(r => {
      const v = r.v, d = num(v.day), K = KINDS[v.kind] || KINDS.other;
      return '<div class="tnode' + (v.done ? " done" : "") + '"><div class="tday">Day ' + Math.round(d) + '</div><button class="tdot" data-a="tlDone" data-card="' + c.id + '" data-i="' + r.i + '" ' + dis + ' title="' + (v.done ? "Done. Click to undo" : "Click when done") + '">' + (v.done ? "✓" : K[0]) + '</button><div class="tlab">' + esc(v.label || K[1]) + '</div><div class="tdate">' + U.fmt(tlDate(e, c, d), false) + "</div></div>";
    }).join("");
    const rows = c.events.map((v, i) => '<div class="tlrow"><input type="text" inputmode="numeric" class="dayin" aria-label="Day" data-b="' + P + ".events." + i + '.day" data-rin="1" value="' + esc(v.day) + '" ' + dis + '><select aria-label="Kind" data-b="' + P + ".events." + i + '.kind" data-render="1" ' + dis + ">" + Object.keys(KINDS).map(k => '<option value="' + k + '"' + (v.kind === k ? " selected" : "") + ">" + KINDS[k][0] + " " + KINDS[k][1] + "</option>").join("") + "</select>" +
      '<input type="text" aria-label="What happens" placeholder="What happens, e.g. add doxorubicin" data-b="' + P + ".events." + i + '.label" data-rin="1" value="' + esc(v.label) + '" ' + dis + ' autocomplete="off">' +
      (v.calId && LB.D.events.some(x => x.id === v.calId) ? '<span class="sm" style="color:var(--ok);font-weight:600;white-space:nowrap">📅 in calendar</span>' : '<button class="btn sm" data-a="tlCal" data-card="' + c.id + '" data-i="' + i + '" ' + dis + ' title="Put this on the calendar">📅</button>') +
      '<button class="x" data-a="tlRm" data-card="' + c.id + '" data-i="' + i + '" ' + dis + ' aria-label="Remove">×</button></div>').join("");
    return '<div class="row wrap" style="gap:12px">' + field("Day 0 is", '<input type="date" data-b="' + P + '.start" data-render="1" value="' + esc(c.start || e.date) + '" ' + dis + ">") +
      '<div class="grow" style="align-self:flex-end;padding-bottom:6px"><div class="sm" style="color:var(--acc-d);font-weight:600">' + done + " of " + n + ' done</div><div class="bar"><i style="width:' + (n ? Math.round(done / n * 100) : 0) + '%"></i></div></div></div>' +
      (strip ? '<div class="tstrip">' + strip + "</div>" : '<div class="muted sm">No time points yet. Add the first one below.</div>') +
      '<div class="tlrows">' + rows + '</div><div class="row"><button class="link sm" data-a="tlAdd" data-card="' + c.id + '" ' + dis + '>+ Add time point</button><button class="link sm" data-a="tlSort" data-card="' + c.id + '" ' + dis + ' style="color:var(--mute)">Sort by day</button></div>';
  }
  function timelinePrint(e, c) {
    const evs = tlSorted(c); if (!evs.length) return "";
    return '<table class="t"><tr><th style="width:36pt">Day</th><th style="width:78pt">Date</th><th>What happens</th><th class="ck">Done</th></tr>' + evs.map(r => "<tr><td>" + Math.round(num(r.v.day)) + "</td><td>" + U.fmt(tlDate(e, c, num(r.v.day)), true) + "</td><td>" + (KINDS[r.v.kind] || KINDS.other)[0] + " " + esc(r.v.label) + '</td><td class="ck">' + (r.v.done ? "☑" : "☐") + "</td></tr>").join("") + "</table>";
  }

  /* ================= FLOW PATH ================= */
  const RATE_U = { "µL/min": 1, "µL/h": 1 / 60, "nL/min": 0.001, "mL/min": 1000, "mL/h": 1000 / 60 };
  const DUR_U = { min: 1, h: 60, d: 1440 };
  const fmtVol = ul => (ul >= 1000 ? +(ul / 1000).toPrecision(3) + " mL" : +ul.toPrecision(3) + " µL");
  const cut = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
  function flowTotal(c) { const r = num(c.rate), d = num(c.dur); return r > 0 && d > 0 && RATE_U[c.rateU] && DUR_U[c.durU] ? r * RATE_U[c.rateU] * d * DUR_U[c.durU] : NaN; }
  function flowSvg(c) {
    const tot = flowTotal(c), rate = c.rate ? c.rate + " " + c.rateU : "flow rate";
    return '<svg class="flowsvg" viewBox="0 0 700 140" role="img" aria-label="Perfusion path: pump, chip, outlet">' +
      '<rect class="fl-box" x="16" y="44" width="104" height="46" rx="8"/><rect class="fl-in" x="120" y="60" width="20" height="14" rx="2"/><rect class="fl-in" x="140" y="54" width="5" height="26" rx="2"/>' +
      '<text class="fl-t" x="68" y="72" text-anchor="middle">' + esc(cut(c.pump || "Pump", 14)) + "</text>" + '<text class="fl-t fl-s" x="68" y="112" text-anchor="middle">' + esc(cut(c.medium, 22)) + "</text>" +
      '<path class="fl-tube" d="M145 67H262"/><text class="fl-t" x="203" y="55" text-anchor="middle">' + esc(cut(rate, 18)) + "</text>" +
      '<rect class="fl-box" x="262" y="28" width="156" height="78" rx="16"/><rect class="fl-in" x="284" y="46" width="112" height="42" rx="10"/><circle class="fl-dot" cx="318" cy="67" r="6"/><circle class="fl-dot" cx="340" cy="67" r="6"/><circle class="fl-dot" cx="362" cy="67" r="6"/>' +
      '<text class="fl-t" x="340" y="124" text-anchor="middle">' + esc(cut(c.chip || "Chip", 24)) + "</text>" +
      '<path class="fl-tube" d="M418 67H548"/><text class="fl-t" x="483" y="55" text-anchor="middle">' + esc(c.dur ? c.dur + " " + c.durU + (c.temp ? " · " + cut(c.temp, 8) : "") : "") + "</text>" +
      '<rect class="fl-box" x="548" y="40" width="88" height="54" rx="10"/><text class="fl-t" x="592" y="71" text-anchor="middle">' + esc(cut(c.outlet || "Outlet", 12)) + "</text>" +
      (isFinite(tot) ? '<text class="fl-t fl-s" x="592" y="112" text-anchor="middle">≈ ' + fmtVol(tot) + "</text>" : "") + "</svg>";
  }
  function flowBody(e, c, P, dis) {
    const tot = flowTotal(c);
    return flowSvg(c) + '<div class="cfgrid">' + field("Pump / system", txt(P, "pump", c.pump, dis, "Syringe pump")) + field("Chip", txt(P, "chip", c.chip, dis, "e.g. C8")) +
      field("Flow rate", '<span class="row" style="gap:6px">' + txt(P, "rate", c.rate, dis, "0.5", 'style="width:90px" inputmode="decimal"') + '<select data-b="' + P + '.rateU" data-render="1" ' + dis + ">" + sel(Object.keys(RATE_U), c.rateU) + "</select></span>") +
      field("Duration", '<span class="row" style="gap:6px">' + txt(P, "dur", c.dur, dis, "24", 'style="width:90px" inputmode="decimal"') + '<select data-b="' + P + '.durU" data-render="1" ' + dis + ">" + sel(Object.keys(DUR_U), c.durU) + "</select></span>") +
      field("Medium", txt(P, "medium", c.medium, dis, "e.g. DMEM + 10% FBS")) + field("Temperature", txt(P, "temp", c.temp, dis, "37 °C")) + field("Outlet goes to", txt(P, "outlet", c.outlet, dis, "Waste / collection")) +
      field("Total volume", '<div class="calc">' + (isFinite(tot) ? "≈ " + fmtVol(tot) : '<span class="muted">fill in rate and duration</span>') + "</div>") + "</div>";
  }
  function flowPrint(e, c) {
    const tot = flowTotal(c), r = [["Pump / system", c.pump], ["Chip", c.chip], ["Flow rate", c.rate ? c.rate + " " + c.rateU : ""], ["Duration", c.dur ? c.dur + " " + c.durU : ""], ["Medium", c.medium], ["Temperature", c.temp], ["Outlet goes to", c.outlet], ["Total volume", isFinite(tot) ? "≈ " + fmtVol(tot) : ""]].filter(x => x[1]);
    return '<div class="flowp">' + flowSvg(c) + "</div>" + (r.length ? '<table class="t">' + r.map(x => "<tr><th style=\"width:28%\">" + x[0] + "</th><td>" + esc(x[1]) + "</td></tr>").join("") + "</table>" : "");
  }

  /* ================= FREEZER BOX ================= */
  const BOXES = { "9x9": [9, 9], "10x10": [10, 10], "8x12": [8, 12], "5x5": [5, 5], "7x7": [7, 7] };
  const boxDims = c => BOXES[c.fmt] || BOXES["9x9"];
  function boxBody(e, c, P, dis) {
    const [R, C] = boxDims(c), s = (LB.tmp.boxSel || {})[c.id], used = Object.keys(c.cells).filter(k => c.cells[k] && +k < R * C);
    let grid = "<span></span>" + Array.from({ length: C }, (_, j) => '<span class="ph">' + (j + 1) + "</span>").join("");
    for (let r = 0; r < R; r++) {
      grid += '<span class="ph">' + rowName(r) + "</span>";
      for (let j = 0; j < C; j++) { const i = r * C + j, v = c.cells[i]; grid += '<button class="bx' + (v ? " on" : "") + (s === i ? " cur" : "") + '" data-bx="' + i + '" data-card="' + c.id + '" title="' + rowName(r) + (j + 1) + (v ? " · " + esc(v) : "") + '" aria-label="Position ' + rowName(r) + (j + 1) + '"></button>'; }
    }
    const si = s != null && s < R * C ? s : null;
    return '<div class="cfgrid">' + field("Box name", txt(P, "name", c.name, dis, "e.g. Cell stock box 3")) + field("Where is it?", txt(P, "loc", c.loc, dis, "e.g. −80 °C freezer, shelf 2, rack B")) +
      field("Box format", '<select data-file="boxFmt" data-card="' + c.id + '" ' + dis + ">" + Object.keys(BOXES).map(k => "<option" + (c.fmt === k ? " selected" : "") + ">" + k + "</option>").join("") + "</select>") + "</div>" +
      '<div class="plate-wrap"><div class="boxgrid" style="grid-template-columns:auto repeat(' + C + ',28px)">' + grid + "</div></div>" +
      (si != null ? '<div class="row"><b class="mono" style="color:var(--acc-d)">' + rowName(Math.floor(si / C)) + (si % C + 1) + '</b><input type="text" class="grow" aria-label="What is in this position" placeholder="What is in this position? e.g. MCF-7 P18, 2×10⁶ cells" data-b="' + P + ".cells." + si + '" data-rin="1" value="' + esc(c.cells[si] || "") + '" ' + dis + ' autocomplete="off"><button class="link sm" data-a="boxClear" data-card="' + c.id + '" data-i="' + si + '" ' + dis + ">Empty</button></div>" : '<div class="muted sm">Click a position to say what is in it.</div>') +
      '<div class="muted sm">' + used.length + " of " + R * C + " positions used" + (used.length ? ": " + used.slice(0, 12).map(k => rowName(Math.floor(k / C)) + (k % C + 1) + " " + esc(cut(c.cells[k], 18))).join(" · ") + (used.length > 12 ? " …" : "") : "") + "</div>";
  }
  function boxPrint(e, c) {
    const [R, C] = boxDims(c), used = Object.keys(c.cells).filter(k => c.cells[k] && +k < R * C).map(Number).sort((a, b) => a - b), s = 11;
    let t = '<table class="g"><tr><th></th>' + Array.from({ length: C }, (_, j) => "<th>" + (j + 1) + "</th>").join("") + "</tr>";
    for (let r = 0; r < R; r++) { t += "<tr><th>" + rowName(r) + "</th>"; for (let j = 0; j < C; j++) t += '<td style="width:' + s + "pt;height:" + s + "pt;border-radius:2pt;" + (c.cells[r * C + j] ? "background:var(--acc-m);border-color:var(--acc-d)" : "") + '"></td>'; t += "</tr>"; }
    return '<div class="small">' + esc([c.name, c.loc, c.fmt].filter(Boolean).join(" · ")) + "</div>" + t + "</table>" +
      (used.length ? '<table class="t" style="margin-top:4pt"><tr><th style="width:40pt">Position</th><th>Contents</th></tr>' + used.map(k => "<tr><td>" + rowName(Math.floor(k / C)) + (k % C + 1) + "</td><td>" + esc(c.cells[k]) + "</td></tr>").join("") + "</table>" : "");
  }

  /* ================= DILUTION SERIES ================= */
  const CHAINS = [["M", "mM", "µM", "nM", "pM"], ["g/mL", "mg/mL", "µg/mL", "ng/mL", "pg/mL"]];
  const UNITS = ["M", "mM", "µM", "nM", "pM", "mg/mL", "µg/mL", "ng/mL", "%", "x"];
  function fmtConc(v, unit) {
    const ch = CHAINS.find(h => h.includes(unit));
    if (!ch) return +v.toPrecision(3) + " " + unit;
    let k = ch.indexOf(unit), x = v;
    while (x < 1 && x > 0 && k < ch.length - 1) { x *= 1000; k++; }
    while (x >= 1000 && k > 0) { x /= 1000; k--; }
    return +x.toPrecision(3) + " " + ch[k];
  }
  function dilSeries(c) {
    const top = num(c.stock), f = num(c.factor), n = Math.max(1, Math.min(16, Math.round(num(c.steps)) || 0)), v = num(c.vol);
    if (!(top > 0) || !(f > 1) || !n) return null;
    const pts = Array.from({ length: n }, (_, i) => ({ conc: top / Math.pow(f, i), txt: fmtConc(top / Math.pow(f, i), c.unit) }));
    return { pts, f, n, tr: v > 0 ? v / f : NaN, dil: v > 0 ? v - v / f : NaN };
  }
  function dilBody(e, c, P, dis) {
    const s = dilSeries(c);
    const tubes = s ? '<div class="dil">' + s.pts.map((p, i) => '<div class="dtube"><div class="tube"><i style="height:' + (55 + 0) + "%;opacity:" + (1 - 0.82 * (i / Math.max(1, s.n))).toFixed(2) + '"></i></div><b>' + p.txt + '</b><span class="muted sm">' + (i === 0 ? "start" : "1:" + +Math.pow(s.f, i).toPrecision(3)) + "</span></div>").join("") +
      (c.control ? '<div class="dtube"><div class="tube ctl"><i style="height:55%;opacity:.08"></i></div><b>0</b><span class="muted sm">vehicle</span></div>' : "") + "</div>" +
      '<div class="row wrap" style="gap:10px"><button class="btn sm" data-a="dilCopy" data-card="' + c.id + '" title="Concentrations as a column you can paste into a Prism XY table">Copy for Prism</button><span class="muted sm">Pastes the concentrations into a Prism table (for example for an IC50 curve).</span></div><div class="calc">' + (isFinite(s.tr) ? "Each step: move <b>" + +s.tr.toPrecision(3) + " µL</b> from the previous tube into <b>" + +s.dil.toPrecision(3) + " µL</b> " + esc(c.diluent || "diluent") + " (" + c.vol + " µL in each tube)." : "Add a volume per tube to get the pipetting amounts.") + "</div>" : '<div class="muted sm">Enter a start concentration and a dilution factor above 1 (for example 10 for tenfold steps, 2 for halving).</div>';
    return '<div class="cfgrid">' + field("Highest concentration", '<span class="row" style="gap:6px">' + txt(P, "stock", c.stock, dis, "10", 'style="width:90px" inputmode="decimal"') + '<select data-b="' + P + '.unit" data-render="1" ' + dis + ">" + sel(UNITS, c.unit) + "</select></span>") +
      field("Dilute by a factor of", txt(P, "factor", c.factor, dis, "10", 'inputmode="decimal"')) + field("Number of points", txt(P, "steps", c.steps, dis, "6", 'inputmode="numeric"')) +
      field("Volume per tube", txt(P, "vol", c.vol, dis, "in µL (optional)", 'inputmode="decimal"')) + field("Diluent", txt(P, "diluent", c.diluent, dis, "medium")) +
      '<label class="cf" style="flex-direction:row;align-items:center;align-self:flex-end;gap:8px;padding-bottom:8px"><input type="checkbox" data-b="' + P + '.control" data-render="1" ' + (c.control ? "checked" : "") + " " + dis + ' style="accent-color:var(--acc);margin:0">Add a vehicle control</label></div>' + tubes;
  }
  function dilPrint(e, c) {
    const s = dilSeries(c); if (!s) return "";
    return '<table class="t"><tr><th style="width:36pt">Tube</th><th>Concentration</th><th>Dilution</th></tr>' + s.pts.map((p, i) => "<tr><td>" + (i + 1) + "</td><td>" + p.txt + "</td><td>" + (i === 0 ? "start" : "1:" + +Math.pow(s.f, i).toPrecision(3)) + "</td></tr>").join("") + (c.control ? "<tr><td>–</td><td>0 (vehicle control)</td><td></td></tr>" : "") + "</table>" +
      (isFinite(s.tr) ? '<div class="small" style="margin-top:3pt">Each step: ' + +s.tr.toPrecision(3) + " µL from the previous tube into " + +s.dil.toPrecision(3) + " µL " + esc(c.diluent || "diluent") + ".</div>" : "");
  }

  /* ================= GEL LANES ================= */
  function gelBody(e, c, P, dis) {
    const lanes = c.lanes.map((l, i) => '<div class="lane"><span class="pn' + (l.ladder ? " on" : "") + '">' + (i + 1) + '</span><input type="text" class="grow" aria-label="Lane ' + (i + 1) + ' sample" placeholder="' + (l.ladder ? "Ladder" : "Sample") + '" data-b="' + P + ".lanes." + i + '.label" data-rin="1" value="' + esc(l.label) + '" ' + dis + ' autocomplete="off"><input type="text" class="amt" aria-label="Amount loaded" placeholder="amount" data-b="' + P + ".lanes." + i + '.amt" value="' + esc(l.amt) + '" ' + dis + ' autocomplete="off">' +
      '<label class="sm row" style="gap:4px"><input type="checkbox" data-b="' + P + ".lanes." + i + '.ladder" data-render="1" ' + (l.ladder ? "checked" : "") + " " + dis + ' style="accent-color:var(--acc);margin:0">ladder</label><button class="x" data-a="gelRm" data-card="' + c.id + '" data-i="' + i + '" ' + dis + ' aria-label="Remove lane">×</button></div>').join("");
    const vis = '<div class="gel">' + c.lanes.map((l, i) => '<div class="gl' + (l.ladder ? " lad" : "") + '"><i class="slot"></i>' + (l.ladder ? "<u></u><u></u><u></u><u></u><u></u>" : "") + "<span>" + esc(cut(l.label || (l.ladder ? "Ladder" : ""), 14)) + "</span></div>").join("") + "</div>";
    return '<div class="cfgrid">' + field("Gel", txt(P, "gel", c.gel, dis, "e.g. 10% SDS-PAGE, 1% agarose")) + field("Run", txt(P, "run", c.run, dis, "e.g. 120 V, 60 min")) + "</div>" + vis +
      '<div class="lanes">' + lanes + '</div><button class="link sm" data-a="gelAdd" data-card="' + c.id + '" ' + dis + ">+ Add lane</button>";
  }
  function gelPrint(e, c) {
    return '<div class="small">' + esc([c.gel, c.run].filter(Boolean).join(" · ")) + '</div><table class="t"><tr><th style="width:34pt">Lane</th><th>Sample</th><th style="width:80pt">Amount</th></tr>' + c.lanes.map((l, i) => "<tr><td>" + (i + 1) + "</td><td>" + (l.ladder ? "<i>ladder</i> " : "") + esc(l.label) + "</td><td>" + esc(l.amt) + "</td></tr>").join("") + "</table>";
  }

  /* ================= card catalogue ================= */
  const TYPES = {
    plate: { label: "Plate map", desc: "6 to 384 wells, color-coded conditions", make: () => ({ title: "Plate map", fmt: "96", conds: [{ id: "k1", name: "Control", color: "#9ca3af" }, { id: "k2", name: "Sample", color: "#3b82f6" }], wells: [] }), body: plateBody, print: platePrint, data: c => c.wells.some(Boolean) },
    timeline: { label: "Timeline", desc: "Day 0, day 1, day 4… with check-offs", make: () => ({ title: "Timeline", start: "", events: [{ day: 0, kind: "seed", label: "Seed cells", done: false }, { day: 1, kind: "drug", label: "", done: false }, { day: 4, kind: "image", label: "", done: false }] }), body: timelineBody, print: timelinePrint, data: c => c.events.length > 0 },
    flow: { label: "Flow path", desc: "Pump → chip → outlet with rate and volume", make: () => ({ title: "Perfusion path", pump: "Syringe pump", chip: "", rate: "", rateU: "µL/min", dur: "", durU: "h", medium: "", temp: "37 °C", outlet: "Waste" }), body: flowBody, print: flowPrint, data: c => !!(c.rate || c.chip || c.dur) },
    box: { label: "Freezer box", desc: "Which vial sits where", make: () => ({ title: "Freezer box", name: "", loc: "", fmt: "9x9", cells: {} }), body: boxBody, print: boxPrint, data: c => Object.values(c.cells).some(Boolean) },
    dilution: { label: "Dilution series", desc: "Concentrations and pipetting amounts", make: () => ({ title: "Dilution series", stock: "10", unit: "µM", factor: "10", steps: "6", vol: "", diluent: "medium", control: true }), body: dilBody, print: dilPrint, data: () => true },
    gel: { label: "Gel lanes", desc: "Lane-by-lane sample list for gels and blots", make: () => ({ title: "Gel lanes", gel: "", run: "", lanes: [{ label: "Ladder", amt: "", ladder: true }, { label: "", amt: "", ladder: false }, { label: "", amt: "", ladder: false }, { label: "", amt: "", ladder: false }, { label: "", amt: "", ladder: false }, { label: "", amt: "", ladder: false }] }), body: gelBody, print: gelPrint, data: c => c.lanes.some(l => l.label) }
  };
  LB.CARD_TYPES = TYPES; LB.CARD_ICONS = IC;
  LB.cardKit = { field, txt, sel, num, pathOf, extra, cut, PAL, dilSeries, fmtConc, icon };
  LB.newCard = type => Object.assign({ id: U.uid(), type, note: "" }, TYPES[type].make());
  /* old/partial data (or a card from a newer version) must never break the page */
  LB.fixCard = c => { const m = TYPES[c.type]; if (!m) return true; const d = m.make(); Object.keys(d).forEach(k => { if (c[k] === undefined) c[k] = d[k]; }); c.note = c.note || ""; c.id = c.id || U.uid(); return true; };

  function cardView(e, c, dis) {
    const T = TYPES[c.type], P = pathOf(e, c), list = extra(e), i = list.indexOf(c);
    return '<div class="card lcard" data-cardid="' + c.id + '"><div class="row"><span class="cicon">' + icon(c.type, 22) + '</span><input type="text" class="ctitle" aria-label="Card title" data-b="' + P + '.title" data-live="' + P + '.title" value="' + esc(c.title) + '" ' + dis + ' autocomplete="off"><span class="grow"></span>' +
      '<button class="link sm" data-a="cardMove" data-card="' + c.id + '" data-d="-1" ' + (dis || i === 0 ? "disabled" : "") + ' title="Move up" aria-label="Move up">↑</button><button class="link sm" data-a="cardMove" data-card="' + c.id + '" data-d="1" ' + (dis || i === list.length - 1 ? "disabled" : "") + ' title="Move down" aria-label="Move down">↓</button>' +
      '<button class="link sm" style="color:#b42318" data-a="rmCard" data-card="' + c.id + '" ' + dis + ' title="Remove this card">Remove</button></div>' +
      T.body(e, c, P, dis) +
      '<textarea rows="2" aria-label="Notes on this card" placeholder="Notes on this card…" data-b="' + P + '.note" data-log="Edited card notes" ' + dis + ">" + esc(c.note) + "</textarea></div>";
  }
  /* every added card on the Procedure tab */
  LB.cardsList = e => extra(e).filter(c => TYPES[c.type]).map(c => cardView(e, c, e.locked ? "disabled" : "")).join("");
  /* the card toolbar: a narrow dock at the far right of the Notebook. Built-in cards switch on/off, the others add a card. */
  LB.cardsDock = function (e) {
    const dis = e.locked ? "disabled" : "", cd = LB.cardsOf(e), list = extra(e);
    const btn = (key, label, desc, on, count) => {
      const builtin = key === "procedure" || key === "chip", tip = label + " — " + desc + (e.locked ? " (unlock the entry to add cards)" : builtin ? (on ? " · click to hide" : " · click to show") : count ? " · " + count + " added, click to add another" : " · click to add");
      return '<button class="dk' + (on ? " on" : "") + '" data-a="' + (builtin ? "tileBuiltin" : "addCard") + '" data-t="' + key + '" ' + dis + ' aria-pressed="' + (on ? "true" : "false") + '" aria-label="' + esc(tip) + '" data-tip="' + esc(tip) + '">' + icon(key === "procedure" ? "steps" : key, 20) + (count ? "<i>" + count + "</i>" : "") + "</button>";
    };
    return '<aside class="dock" aria-label="Lab cards"><span class="dkh" data-tip="Lab cards: they appear on the Procedure tab and go into the PDF">Cards</span>' + btn("procedure", "Procedure steps", "Checklist with step timers", cd.procedure) + btn("chip", "Chip loading map", "Chamber positions and contents", cd.chip) +
      '<span class="dksep"></span>' + Object.keys(TYPES).map(k => { const n = list.filter(c => c.type === k).length; return btn(k, TYPES[k].label, TYPES[k].desc, n > 0, n); }).join("") + "</aside>";
  };
  /* tooltips for the dock (a native title would be slow and plain) */
  const tipEl = document.createElement("div"); tipEl.className = "dktip"; tipEl.setAttribute("role", "tooltip"); document.body.appendChild(tipEl);
  document.addEventListener("mouseover", ev => {
    const t = ev.target.closest && ev.target.closest(".dock [data-tip]"); if (!t) { tipEl.classList.remove("on"); return; }
    const r = t.getBoundingClientRect(); tipEl.textContent = t.dataset.tip; tipEl.classList.add("on");
    tipEl.style.top = Math.max(8, Math.min(window.innerHeight - tipEl.offsetHeight - 8, r.top + r.height / 2 - tipEl.offsetHeight / 2)) + "px"; tipEl.style.right = (window.innerWidth - r.left + 8) + "px";
  });
  /* show the Procedure tab (switching it on if this entry had it off) and scroll to a card */
  function showProcedure(e, cardId) {
    const cd = LB.cardsOf(e); if (!cd.tabProcedure) cd.tabProcedure = true; LB.ui.sec = 2; LB.saveUI();
    tipEl.classList.remove("on"); LB.save(); LB.render();
    const n = cardId && document.querySelector('[data-cardid="' + cardId + '"]'); if (n) { n.scrollIntoView({ behavior: "smooth", block: "start" }); n.classList.add("flash"); setTimeout(() => n.classList.remove("flash"), 1400); }
  }
  /* make sure every entry has a clean list of cards (also after a backup is restored) */
  const baseFix = LB.fixData;
  LB.fixData = function () { baseFix(); Object.values(LB.D.entries).forEach(e => { e.extra = (e.extra || []).filter(LB.fixCard); }); };
  /* (the first LB.fixData() call happens in folders.js, after analysis.js has registered its card types) */
  /* PDF sections */
  LB.cardsPrint = async function (e) {
    const out = [];
    for (const c of extra(e)) {
      const T = TYPES[c.type]; if (!T || !T.data(c)) continue;
      const inner = await T.print(e, c);
      if (inner) out.push('<section><h2>' + esc(c.title) + "</h2>" + inner + (c.note && c.note.trim() ? '<div class="note" style="margin-top:4pt">' + esc(c.note) + "</div>" : "") + "</section>");
    }
    return out.join("");
  };
  LB.cardCount = e => extra(e).length;

  /* ---------- actions ---------- */
  const log = (e, m) => LB.log(e, m);
  A.addCard = el => { const e = live(); if (!e) return; const c = LB.newCard(el.dataset.t); extra(e).push(c); log(e, "Added card: " + TYPES[c.type].label); showProcedure(e, c.id); LB.toast(TYPES[c.type].label + " added."); };
  A.tileBuiltin = el => { const e = live(); if (!e) return; const cd = LB.cardsOf(e), k = el.dataset.t; cd[k] = !cd[k]; log(e, cd[k] ? "Added card: " + (k === "chip" ? "Chip loading map" : "Procedure steps") : "Hid card: " + (k === "chip" ? "Chip loading map" : "Procedure steps")); showProcedure(e, null); };
  A.rmCard = el => {
    const e = live(), c = e && cardById(el.dataset.card); if (!c) return;
    if (TYPES[c.type].data(c) && !confirm("Remove “" + c.title + "” from this entry? What you entered in it is deleted.")) return;
    if (c.type === "timeline") dropCal(c.events);
    e.extra = extra(e).filter(x => x !== c); log(e, "Removed card: " + c.title); LB.save(); LB.render();
  };
  A.cardMove = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c) return; const l = extra(e), i = l.indexOf(c), j = i + +el.dataset.d; if (j < 0 || j >= l.length) return; l.splice(i, 1); l.splice(j, 0, c); LB.save(); LB.render(); };
  /* plate */
  A.brush = el => { (LB.tmp.brush = LB.tmp.brush || {})[el.dataset.card] = el.dataset.k; LB.render(); };
  A.addCond = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c) return; const id = "k" + U.uid(); c.conds.push({ id, name: "Condition " + (c.conds.length + 1), color: PAL[c.conds.length % PAL.length] }); (LB.tmp.brush = LB.tmp.brush || {})[c.id] = id; LB.save(); LB.render(); };
  A.rmCond = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c) return; const k = c.conds[+el.dataset.i]; if (!k) return; c.conds.splice(+el.dataset.i, 1); c.wells = c.wells.map(w => (w === k.id ? "" : w)); LB.save(); LB.render(); };
  A.plateClear = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c || !confirm("Clear every well on this plate?")) return; c.wells = c.wells.map(() => ""); LB.save(); LB.render(); };
  A.plateFmt = el => {
    const e = live(), c = e && cardById(el.dataset.card); if (!c) { LB.render(); return; }
    if (c.wells.some(Boolean) && !confirm("Changing the plate format clears the painted wells. Continue?")) { LB.render(); return; }
    c.fmt = el.value; c.wells = []; LB.save(); LB.render();
  };
  A.plateLine = el => {
    const e = live(), c = e && cardById(el.dataset.card); if (!c) return; const [R, C] = wells(c), br = brushOf(c), i = +el.dataset.i;
    const idx = el.dataset.t === "r" ? Array.from({ length: C }, (_, j) => i * C + j) : Array.from({ length: R }, (_, r) => r * C + i);
    const val = idx.every(k => c.wells[k] === br) ? "" : br; idx.forEach(k => { c.wells[k] = val; }); LB.save(); LB.render();
  };
  /* timeline */
  A.tlDone = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c) return; const v = c.events[+el.dataset.i]; v.done = !v.done; log(e, (v.done ? "Ticked off: " : "Unticked: ") + (v.label || "time point")); LB.save(); LB.render(); if (v.done && c.events.every(x => x.done)) LB.toast("🎉 Every time point on “" + c.title + "” is done."); };
  A.tlAdd = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c) return; const days = c.events.map(v => num(v.day)).filter(isFinite); c.events.push({ day: days.length ? Math.max(...days) + 1 : 0, kind: "other", label: "", done: false }); LB.save(); LB.render(); };
  A.tlRm = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c) return; dropCal(c.events.splice(+el.dataset.i, 1)); LB.save(); LB.render(); };
  A.tlSort = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c) return; c.events.sort((a, b) => (num(a.day) || 0) - (num(b.day) || 0)); LB.save(); LB.render(); };
  A.tlCal = el => {
    const e = live(), c = e && cardById(el.dataset.card); if (!c) return; const v = c.events[+el.dataset.i], d = num(v.day); if (!v || !isFinite(d)) { LB.toast("Give the time point a day number first."); return; }
    const ev = { id: U.uid(), date: tlDate(e, c, d), time: "", title: (v.label || (KINDS[v.kind] || KINDS.other)[1]) + " · " + e.code, kind: v.kind === "image" ? "imaging" : v.kind === "passage" ? "passage" : "other" };
    LB.D.events.push(ev); v.calId = ev.id; v.calTitle = ev.title; v.calKind = ev.kind; LB.save(); LB.render(); LB.toast("Put on the calendar for " + U.fmt(ev.date) + ". It follows if you change the day.");
  };
  /* Calendar events made from a time point stay linked to it: changing the day, the label, the kind, Day 0 or the
     entry's date moves/renames the calendar event; removing the time point (or its card or entry) removes the event.
     A title or kind she edited by hand in the calendar is left alone. The time of day is never touched. */
  const calTitleOf = (e, v) => (v.label || (KINDS[v.kind] || KINDS.other)[1]) + " · " + e.code;
  const calKindOf = v => (v.kind === "image" ? "imaging" : v.kind === "passage" ? "passage" : "other");
  function dropCal(list) { const ids = (list || []).map(v => v.calId).filter(Boolean); if (ids.length) LB.D.events = LB.D.events.filter(x => !ids.includes(x.id)); }
  LB.dropTimelineEvents = e => extra(e).forEach(c => { if (c.type === "timeline") dropCal(c.events); });
  function syncCalendar() {
    Object.values(LB.D.entries).forEach(e => extra(e).forEach(c => {
      if (c.type !== "timeline") return;
      c.events.forEach(v => {
        const ev = v.calId && LB.D.events.find(x => x.id === v.calId), d = num(v.day); if (!ev || !isFinite(d)) return;
        ev.date = tlDate(e, c, d);
        if (v.calTitle === undefined) { v.calTitle = ev.title; v.calKind = ev.kind; return; }   // made before sync existed: only the date follows
        const t = calTitleOf(e, v), k = calKindOf(v);
        if (ev.title === v.calTitle) ev.title = t; v.calTitle = ev.title;
        if (ev.kind === v.calKind) ev.kind = k; v.calKind = ev.kind;
      });
    }));
  }
  const baseSave = LB.save;
  LB.save = function () { syncCalendar(); return baseSave.apply(this, arguments); };
  /* freezer box */
  A.boxFmt = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c) { LB.render(); return; } if (Object.values(c.cells).some(Boolean) && !confirm("Changing the box format clears what you entered. Continue?")) { LB.render(); return; } c.fmt = el.value; c.cells = {}; LB.tmp.boxSel = {}; LB.save(); LB.render(); };
  A.boxClear = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c) return; delete c.cells[+el.dataset.i]; LB.save(); LB.render(); };
  /* gel */
  A.gelAdd = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c || c.lanes.length >= 30) return; c.lanes.push({ label: "", amt: "", ladder: false }); LB.save(); LB.render(); };
  A.gelRm = el => { const e = live(), c = e && cardById(el.dataset.card); if (!c) return; c.lanes.splice(+el.dataset.i, 1); LB.save(); LB.render(); };

  /* ---------- painting plates by dragging; picking freezer-box positions ---------- */
  let job = null;
  const wellAt = ev => { const t = document.elementFromPoint(ev.clientX, ev.clientY); return t && t.closest ? t.closest("[data-pw]") : null; };
  function paint(el) {
    const c = cardById(el.dataset.card), i = +el.dataset.pw; if (!c || !job || job.card !== c.id || c.wells[i] === job.val) return;
    c.wells[i] = job.val; plateStyleWell(el, c, i); job.dirty = true;
  }
  document.addEventListener("pointerdown", ev => {
    const t = ev.target.closest ? ev.target : null; if (!t) return;
    const w = t.closest("[data-pw]");
    if (w && !w.disabled && live()) {
      const c = cardById(w.dataset.card); if (!c) return; wells(c);
      const br = brushOf(c); job = { card: c.id, val: c.wells[+w.dataset.pw] === br ? "" : br, dirty: false };
      paint(w); ev.preventDefault(); return;
    }
    const b = t.closest("[data-bx]");
    if (b) { (LB.tmp.boxSel = LB.tmp.boxSel || {})[b.dataset.card] = +b.dataset.bx; LB.render(); }
  });
  document.addEventListener("pointermove", ev => { if (!job) return; const w = wellAt(ev); if (w) paint(w); });
  const endPaint = () => { if (!job) return; const d = job.dirty; job = null; if (d) { const e = LB.cur(); if (e) LB.log(e, "Edited a plate map"); LB.save(); LB.render(); } };
  document.addEventListener("pointerup", endPaint); document.addEventListener("pointercancel", endPaint);

  /* ---------- step timers ---------- */
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600); return (h ? h + ":" : "") + U.pad(Math.floor(s % 3600 / 60)) + ":" + U.pad(s % 60); };
  LB.stepTimer = function (e, i, s, dis) {
    if (s.endAt) return '<span class="tmr run" data-end="' + s.endAt + '" title="Timer running">⏱ ' + mmss(s.endAt - Date.now()) + '</span><button class="x" data-a="tmrStop" data-i="' + i + '" ' + dis + ' aria-label="Stop timer" title="Stop timer">■</button>';
    return '<input type="text" inputmode="decimal" class="tmin" aria-label="Timer in minutes" placeholder="min" title="Timer length in minutes (optional)" data-b="D.entries.' + e.id + ".steps." + i + '.min" data-rin="1" value="' + (s.min || "") + '" ' + dis + '>' + (num(s.min) > 0 ? '<button class="x tplay" data-a="tmrStart" data-i="' + i + '" ' + dis + ' aria-label="Start timer" title="Start the timer">▶</button>' : "");
  };
  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return; const ctx = LB.audio || (LB.audio = new Ctx());
      [0, 0.25, 0.5].forEach(t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22); });
    } catch (x) { }
  }
  A.tmrStart = el => {
    const e = live(); if (!e) return; const s = e.steps[+el.dataset.i]; if (!s || !(num(s.min) > 0)) return;
    try { const Ctx = window.AudioContext || window.webkitAudioContext; if (Ctx) { LB.audio = LB.audio || new Ctx(); if (LB.audio.resume) LB.audio.resume(); } } catch (x) { }
    s.endAt = Date.now() + num(s.min) * 60000; log(e, "Started a timer: " + s.t); LB.save(); LB.render();
  };
  A.tmrStop = el => { const e = live(); if (!e) return; const s = e.steps[+el.dataset.i]; if (!s) return; delete s.endAt; LB.save(); LB.render(); };
  setInterval(() => {
    const now = Date.now(); let fired = false;
    document.querySelectorAll("[data-end]").forEach(n => { n.textContent = "⏱ " + mmss(+n.dataset.end - now); });
    Object.values(LB.D.entries).forEach(e => e.steps.forEach(s => {
      if (s.endAt && s.endAt <= now) { delete s.endAt; fired = true; LB.toast("⏱ Timer finished: " + s.t + " (" + e.code + ")"); if (s.min) LB.log(e, "Timer finished: " + s.t); }
    }));
    if (fired) { beep(); LB.save(); LB.render(); }
  }, 1000);
})(window.LB);
