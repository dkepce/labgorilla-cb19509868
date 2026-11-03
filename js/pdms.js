/* LabGorilla — chip-making cards for the Procedure tab: a PDMS batch (mixing ratio calculator, degas/cure timers,
   plasma bonding, leak test) and a 3D viewer for STL files (chip designs, moulds), drawn with plain WebGL. */
(function (LB) {
  const K = LB.cardKit, U = LB.U, esc = U.esc, A = LB.actions;
  const { field, txt, sel, num, extra, icon } = K, TYPES = LB.CARD_TYPES, IC = LB.CARD_ICONS;
  const live = () => { const e = LB.cur(); return e && !e.locked ? e : null; };
  const cardOf = id => { const e = LB.cur(); return e ? extra(e).find(c => c.id === id) : null; };
  const kv = rows => { rows = rows.filter(r => r[1] && String(r[1]).trim()); return rows.length ? '<table class="t">' + rows.map(r => '<tr><th style="width:28%">' + r[0] + "</th><td>" + esc(r[1]) + "</td></tr>").join("") + "</table>" : ""; };
  const g = v => (isFinite(v) ? String(+v.toPrecision(3)) : "–");

  Object.assign(IC, {
    pdms: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9" stroke-opacity=".5"/>',
    stl: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>'
  });

  /* ================= PDMS BATCH ================= */
  const DENSITY = 1.03;   // g/cm³, cured Sylgard 184
  const PRODUCTS = ["Sylgard 184", "Sylgard 182", "RTV 615", "Other"];
  const CURE_PRESETS = [["65", "2", "h"], ["80", "1", "h"], ["100", "35", "min"], ["RT", "48", "h"]];
  const BONDS = ["", "Oxygen plasma", "Air plasma", "Corona treater", "Partial cure (PDMS–PDMS)", "Reversible (no treatment)", "Other"];
  const LEAK = ["", "Not tested", "No leaks", "Small leaks", "Leaked / delaminated"];
  const STAGES = [["mix", "Mix"], ["degas", "Degas"], ["pour", "Pour"], ["cure", "Cure"], ["peel", "Peel & punch"], ["bond", "Bond"], ["leak", "Leak test"]];
  const DUR = { min: 1, h: 60 };
  /* grams needed: typed total, or mould area × thickness (+ loss) */
  function pdmsMass(c) {
    const t = num(c.total); if (t > 0) return { m: t, from: "typed" };
    const a = num(c.area), th = num(c.thick), x = num(c.loss); if (!(a > 0 && th > 0)) return null;
    return { m: a * th / 10 * DENSITY * (1 + (x > 0 ? x : 0) / 100), from: "mould" };
  }
  function pdmsSplit(c) {
    const r = num(c.ratio), m = pdmsMass(c); if (!m || !(r > 0)) return null;
    return { total: m.m, from: m.from, base: m.m * r / (r + 1), agent: m.m / (r + 1) };
  }
  const minutesOf = (v, u) => num(v) * (DUR[u] || 1);
  function timer(c, key, mins, dis) {
    const end = (c.tmr || {})[key];
    if (end) return '<span class="tmr run" data-end="' + end + '">⏱</span><button class="x" data-a="pdmsTmrStop" data-card="' + c.id + '" data-k="' + key + '" ' + dis + ' aria-label="Stop timer" title="Stop timer">■</button>';
    return mins > 0 ? '<button class="btn sm" data-a="pdmsTmr" data-card="' + c.id + '" data-k="' + key + '" ' + dis + ' title="Start a ' + Math.round(mins) + ' min timer">▶ Timer</button>' : "";
  }
  function pdmsStrip(c, dis) {
    return '<div class="tstrip pdstrip">' + STAGES.map(([k, l]) => { const d = !!(c.done || {})[k]; return '<div class="tnode' + (d ? " done" : "") + '"><button class="tdot" data-a="pdmsStage" data-card="' + c.id + '" data-k="' + k + '" ' + dis + ' title="' + (d ? "Done. Click to undo" : "Click when done") + '">' + (d ? "✓" : STAGES.findIndex(s => s[0] === k) + 1) + '</button><div class="tlab">' + l + "</div></div>"; }).join("") + "</div>";
  }
  function pdmsBody(e, c, P, dis) {
    const s = pdmsSplit(c), cureMin = minutesOf(c.cureD, c.cureU);
    const presets = CURE_PRESETS.map(p => '<button class="btn sm" data-a="pdmsCure" data-card="' + c.id + '" data-t="' + p[0] + '" data-d="' + p[1] + '" data-u="' + p[2] + '" ' + dis + ">" + (p[0] === "RT" ? "Room temp" : p[0] + " °C") + " · " + p[1] + " " + p[2] + "</button>").join("");
    return pdmsStrip(c, dis) +
      '<div class="cfgrid">' + field("PDMS", '<select data-b="' + P + '.product" data-render="1" ' + dis + ">" + sel(PRODUCTS, c.product) + "</select>") + field("Lot / batch no.", txt(P, "lot", c.lot, dis, "from the kit label")) +
      field("Mould / wafer", txt(P, "mould", c.mould, dis, "e.g. SU-8 wafer W3, 3D-printed mould v2")) + field("Mixed on", '<input type="date" data-b="' + P + '.made" value="' + esc(c.made || e.date) + '" ' + dis + ">") + "</div>" +
      '<div class="lbl">Mixing</div><div class="cfgrid">' +
      field("Ratio base : curing agent", '<span class="row" style="gap:6px">' + txt(P, "ratio", c.ratio, dis, "10", 'style="width:70px" inputmode="decimal"') + '<span class="muted">: 1</span></span>') +
      field("Total amount (g)", txt(P, "total", c.total, dis, "e.g. 33, or leave empty and use the mould", 'inputmode="decimal"')) +
      field("…or mould area (cm²)", txt(P, "area", c.area, dis, "e.g. 78.5 for a 10 cm dish", 'inputmode="decimal"')) + field("Layer thickness (mm)", txt(P, "thick", c.thick, dis, "e.g. 4", 'inputmode="decimal"')) +
      field("Extra for losses (%)", txt(P, "loss", c.loss, dis, "10", 'inputmode="decimal"')) +
      field("Weigh out", '<div class="calc">' + (s ? "<b>" + g(s.base) + " g</b> base + <b>" + g(s.agent) + " g</b> curing agent = " + g(s.total) + " g" + (s.from === "mould" ? " (from the mould)" : "") : '<span class="muted">enter a total, or the mould area and thickness</span>') + "</div>") + "</div>" +
      '<div class="lbl">Degassing and curing</div><div class="cfgrid">' +
      field("Degas (min)", '<span class="row" style="gap:6px">' + txt(P, "degas", c.degas, dis, "30", 'style="width:80px" inputmode="decimal"') + timer(c, "degas", num(c.degas), dis) + "</span>") +
      field("Cure temperature (°C)", txt(P, "cureT", c.cureT, dis, "65", 'inputmode="decimal"')) +
      field("Cure time", '<span class="row" style="gap:6px">' + txt(P, "cureD", c.cureD, dis, "2", 'style="width:70px" inputmode="decimal"') + '<select data-b="' + P + '.cureU" data-render="1" ' + dis + ">" + sel(Object.keys(DUR), c.cureU) + "</select>" + timer(c, "cure", cureMin, dis) + "</span>") + "</div>" +
      '<div class="row wrap" style="gap:6px"><span class="muted sm">Typical cures:</span>' + presets + "</div>" +
      '<div class="lbl">Bonding</div><div class="cfgrid">' + field("Method", '<select data-b="' + P + '.bond" data-render="1" ' + dis + ">" + sel(BONDS, c.bond) + "</select>") +
      (c.bond && !/^Reversible/.test(c.bond) ? field("Bonded to", txt(P, "bondTo", c.bondTo, dis, "e.g. glass slide, PDMS layer")) + field("Power / pressure", txt(P, "power", c.power, dis, "e.g. 50 W, 0.4 mbar")) + field("Treatment time", txt(P, "btime", c.btime, dis, "e.g. 60 s")) + field("Post-bake", txt(P, "post", c.post, dis, "e.g. 70 °C, 20 min")) : "") +
      field("Leak test", '<select data-b="' + P + '.leak" data-render="1" ' + dis + ">" + sel(LEAK, c.leak) + "</select>") + "</div>" +
      '<div class="cfgrid">' + field("Chips made from this batch", txt(P, "chips", c.chips, dis, "e.g. C8-1 to C8-6")) + field("How many came out usable", txt(P, "good", c.good, dis, "e.g. 5 of 6")) + "</div>";
  }
  function pdmsPrint(e, c) {
    const s = pdmsSplit(c), done = STAGES.filter(([k]) => (c.done || {})[k]).map(x => x[1]);
    return kv([["PDMS", [c.product, c.lot && "lot " + c.lot].filter(Boolean).join(", ")], ["Mould / wafer", c.mould], ["Mixed on", c.made ? U.fmtLong(c.made) : ""], ["Ratio", c.ratio ? c.ratio + " : 1 (base : curing agent)" : ""],
      ["Weighed out", s ? g(s.base) + " g base + " + g(s.agent) + " g curing agent = " + g(s.total) + " g" + (s.from === "mould" ? " (mould " + c.area + " cm² × " + c.thick + " mm" + (num(c.loss) > 0 ? " + " + c.loss + " %" : "") + ")" : "") : ""],
      ["Degassed", c.degas ? c.degas + " min" : ""], ["Cured", c.cureD ? (c.cureT === "RT" ? "room temperature" : c.cureT ? c.cureT + " °C" : "") + ", " + c.cureD + " " + c.cureU : ""],
      ["Bonding", c.bond ? [c.bond, c.bondTo && "to " + c.bondTo, c.power, c.btime, c.post && "post-bake " + c.post].filter(Boolean).join(", ") : ""], ["Leak test", c.leak], ["Chips", [c.chips, c.good && "usable: " + c.good].filter(Boolean).join(" · ")], ["Steps done", done.join(", ")]]);
  }
  A.pdmsStage = el => { const e = live(), c = e && cardOf(el.dataset.card); if (!c) return; c.done = c.done || {}; const k = el.dataset.k; c.done[k] = !c.done[k]; LB.log(e, (c.done[k] ? "PDMS: done " : "PDMS: undone ") + (STAGES.find(s => s[0] === k) || [0, k])[1]); LB.save(); LB.render(); };
  A.pdmsCure = el => { const e = live(), c = e && cardOf(el.dataset.card); if (!c) return; c.cureT = el.dataset.t; c.cureD = el.dataset.d; c.cureU = el.dataset.u; LB.save(); LB.render(); };
  A.pdmsTmr = el => {
    const e = live(), c = e && cardOf(el.dataset.card); if (!c) return; const k = el.dataset.k, m = k === "degas" ? num(c.degas) : minutesOf(c.cureD, c.cureU); if (!(m > 0)) return;
    try { const Ctx = window.AudioContext || window.webkitAudioContext; if (Ctx) { LB.audio = LB.audio || new Ctx(); if (LB.audio.resume) LB.audio.resume(); } } catch (x) { }
    c.tmr = c.tmr || {}; c.tmr[k] = Date.now() + m * 60000; LB.log(e, "PDMS: started the " + (k === "degas" ? "degassing" : "curing") + " timer"); LB.save(); LB.render();
  };
  A.pdmsTmrStop = el => { const e = live(), c = e && cardOf(el.dataset.card); if (!c || !c.tmr) return; delete c.tmr[el.dataset.k]; LB.save(); LB.render(); };
  function chime() {
    try { const ctx = LB.audio; if (!ctx) return; [0, 0.3, 0.6].forEach(t => { const o = ctx.createOscillator(), v = ctx.createGain(); o.connect(v); v.connect(ctx.destination); o.frequency.value = 660; v.gain.setValueAtTime(0.0001, ctx.currentTime + t); v.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02); v.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.27); }); } catch (x) { }
  }
  /* the shared 1-second tick in cards.js updates every [data-end] label; this one only finishes PDMS timers */
  setInterval(() => {
    const now = Date.now(); let fired = false;
    Object.values(LB.D.entries).forEach(e => extra(e).forEach(c => {
      if (c.type !== "pdms" || !c.tmr) return;
      Object.keys(c.tmr).forEach(k => { if (c.tmr[k] <= now) { delete c.tmr[k]; fired = true; const w = k === "degas" ? "Degassing" : "Curing"; LB.toast("⏱ " + w + " done: " + c.title + " (" + e.code + ")"); LB.log(e, "PDMS: " + w.toLowerCase() + " timer finished"); } });
    }));
    if (fired) { chime(); LB.save(); LB.render(); }
  }, 1000);

  /* ================= STL VIEWER ================= */
  /* reading an STL file: binary (most CAD exports) or ASCII. Normals are recomputed from the triangles. */
  function parseStl(buf) {
    const dv = new DataView(buf), len = buf.byteLength; let n = len >= 84 ? dv.getUint32(80, true) : 0, pts;
    const head = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(len, 512)));
    const binary = len >= 84 && 84 + n * 50 === len || !/^\s*solid/i.test(head) || !/facet/i.test(new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(len, 4096))));
    if (binary) {
      if (84 + n * 50 > len) n = Math.floor((len - 84) / 50); if (!(n > 0)) return null;
      pts = new Float32Array(n * 9);
      for (let i = 0; i < n; i++) { const o = 84 + i * 50 + 12; for (let k = 0; k < 9; k++) pts[i * 9 + k] = dv.getFloat32(o + k * 4, true); }
    } else {
      const t = new TextDecoder().decode(buf), re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/gi, a = []; let m;
      while ((m = re.exec(t))) a.push(+m[1], +m[2], +m[3]);
      n = Math.floor(a.length / 9); if (!n) return null; pts = new Float32Array(a.slice(0, n * 9));
    }
    const nrm = new Float32Array(n * 9), mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; let vol = 0, area = 0;
    for (let i = 0; i < n; i++) {
      const o = i * 9, ax = pts[o], ay = pts[o + 1], az = pts[o + 2], bx = pts[o + 3], by = pts[o + 4], bz = pts[o + 5], cx = pts[o + 6], cy = pts[o + 7], cz = pts[o + 8];
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); area += l / 2;
      if (l > 0) { nx /= l; ny /= l; nz /= l; }
      for (let k = 0; k < 3; k++) { nrm[o + k * 3] = nx; nrm[o + k * 3 + 1] = ny; nrm[o + k * 3 + 2] = nz; for (let d = 0; d < 3; d++) { const v = pts[o + k * 3 + d]; if (v < mn[d]) mn[d] = v; if (v > mx[d]) mx[d] = v; } }
      vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    }
    if (!isFinite(mn[0])) return null;
    return { pts, nrm, n, mn, mx, vol: Math.abs(vol), area };
  }
  const geoCache = {};
  function geoOf(ref) {
    if (!geoCache[ref.id]) geoCache[ref.id] = LB.fileBlob(ref).then(b => (b ? b.arrayBuffer() : null)).then(buf => (buf ? parseStl(buf) : null)).catch(() => null);
    return geoCache[ref.id];
  }

  /* ---- tiny WebGL renderer: flat-shaded, two lights, orbit camera; Z is up like in CAD ---- */
  const VS = "attribute vec3 p;attribute vec3 n;uniform mat4 P;uniform mat4 V;uniform mat3 R;uniform vec3 C;uniform float S;varying vec3 vn;void main(){vn=R*n;gl_Position=P*V*vec4((p-C)*S,1.0);}";
  const FS = "precision mediump float;varying vec3 vn;uniform vec3 col;void main(){vec3 q=normalize(vn);if(!gl_FrontFacing)q=-q;float d=max(dot(q,normalize(vec3(.4,.6,1.))),0.);float f=max(dot(q,normalize(vec3(-.6,-.3,.5))),0.)*.3;vec3 c=col*(.3+.6*d+f)+vec3(.16)*pow(d,24.);gl_FragColor=vec4(c,1.);}";
  const mul = (a, b) => { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
  const rotX = t => { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
  const rotZ = t => { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); };
  const tr = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
  const persp = (fov, a, nr, fr) => { const f = 1 / Math.tan(fov / 2); return new Float32Array([f / a, 0, 0, 0, 0, f, 0, 0, 0, 0, (fr + nr) / (nr - fr), -1, 0, 0, 2 * fr * nr / (nr - fr), 0]); };
  /* orthographic ("axo"): no vanishing point, parallel edges stay parallel; same visible size as perspective at that distance */
  const ortho = (hh, a, nr, fr) => new Float32Array([1 / (a * hh), 0, 0, 0, 0, 1 / hh, 0, 0, 0, 0, -2 / (fr - nr), 0, 0, 0, -(fr + nr) / (fr - nr), 1]);
  const VIEWS = { iso: { yaw: -Math.PI / 4, pitch: Math.acos(1 / Math.sqrt(3)) }, top: { yaw: 0, pitch: 0 }, front: { yaw: 0, pitch: Math.PI / 2 }, side: { yaw: -Math.PI / 2, pitch: Math.PI / 2 } };
  const hex = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); const v = m ? parseInt(m[1], 16) : 0x8fa8c8; return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255]; };

  function makeRenderer(canvas, keep) {
    const gl = canvas.getContext("webgl", { antialias: true, preserveDrawingBuffer: !!keep }) || canvas.getContext("experimental-webgl"); if (!gl) return null;
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    const R = { gl, pr, canvas, bp: gl.createBuffer(), bn: gl.createBuffer(), geo: null, loc: {} };
    ["P", "V", "R", "C", "S", "col"].forEach(k => { R.loc[k] = gl.getUniformLocation(pr, k); });
    R.load = geo => { R.geo = geo; gl.bindBuffer(gl.ARRAY_BUFFER, R.bp); gl.bufferData(gl.ARRAY_BUFFER, geo.pts, gl.STATIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, R.bn); gl.bufferData(gl.ARRAY_BUFFER, geo.nrm, gl.STATIC_DRAW); };
    R.draw = (cam, color, axo) => {
      const w = canvas.width, h = canvas.height; gl.viewport(0, 0, w, h); gl.clearColor(0.965, 0.97, 0.985, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const geo = R.geo; if (!geo) return; gl.enable(gl.DEPTH_TEST); gl.useProgram(pr);
      const c = [0, 1, 2].map(d => (geo.mn[d] + geo.mx[d]) / 2), rad = Math.hypot(geo.mx[0] - geo.mn[0], geo.mx[1] - geo.mn[1], geo.mx[2] - geo.mn[2]) / 2 || 1;
      const V = mul(tr(cam.px, cam.py, -cam.dist), mul(rotX(-cam.pitch), rotZ(cam.yaw)));
      gl.uniformMatrix4fv(R.loc.P, false, axo ? ortho(cam.dist * Math.tan(0.3), w / h, 0.01, 100) : persp(0.6, w / h, 0.05, 100)); gl.uniformMatrix4fv(R.loc.V, false, V);
      gl.uniformMatrix3fv(R.loc.R, false, new Float32Array([V[0], V[1], V[2], V[4], V[5], V[6], V[8], V[9], V[10]]));
      gl.uniform3fv(R.loc.C, c); gl.uniform1f(R.loc.S, 1 / rad); gl.uniform3fv(R.loc.col, hex(color));
      const ap = gl.getAttribLocation(pr, "p"), an = gl.getAttribLocation(pr, "n");
      gl.bindBuffer(gl.ARRAY_BUFFER, R.bp); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, R.bn); gl.enableVertexAttribArray(an); gl.vertexAttribPointer(an, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, geo.n * 3);
    };
    return R;
  }
  const newCam = v => Object.assign({ dist: 3.6, px: 0, py: 0 }, VIEWS[v || "iso"]);
  const cams = LB.tmp.stlCam = LB.tmp.stlCam || {};   // camera per card + file, so the view survives re-renders (and is used for the PDF)
  const camOf = (c, fid) => cams[c.id + ":" + fid] || (cams[c.id + ":" + fid] = newCam());

  /* one live viewer per card; its canvas is kept and moved back into the page after every render */
  const viewers = {};
  function viewer(c) {
    let v = viewers[c.id];
    if (!v) {
      const cv = document.createElement("canvas"); cv.className = "stlcv"; cv.setAttribute("aria-label", "3D view of the STL file. Drag to turn, scroll to zoom.");
      const r = makeRenderer(cv); if (!r) return null;
      v = viewers[c.id] = { cv, r, fid: "", card: c.id }; hookMouse(v);
      const ids = Object.keys(viewers); if (ids.length > 8) { const old = viewers[ids[0]]; try { old.r.gl.getExtension("WEBGL_lose_context").loseContext(); } catch (x) { } delete viewers[ids[0]]; }
    }
    return v;
  }
  function redraw(v) {
    const c = cardOf(v.card); if (!c || !v.r.geo) { v.r.draw(newCam(), ""); return; }
    const box = v.cv.parentNode, dpr = window.devicePixelRatio || 1;
    if (box) { const w = Math.round(box.clientWidth * dpr), h = Math.round(box.clientHeight * dpr); if (w && h && (v.cv.width !== w || v.cv.height !== h)) { v.cv.width = w; v.cv.height = h; } }
    v.r.draw(camOf(c, v.fid), c.color, isAxo(c));
  }
  /* projection: saved on the card (also used for the PDF); on a locked entry it can still be switched for viewing */
  const axoTmp = LB.tmp.stlAxo = LB.tmp.stlAxo || {};
  const isAxo = c => (axoTmp[c.id] !== undefined ? axoTmp[c.id] : c.proj === "axo");
  function hookMouse(v) {
    let drag = null; const cv = v.cv, cam = () => { const c = cardOf(v.card); return c && camOf(c, v.fid); };
    cv.addEventListener("pointerdown", ev => { const k = cam(); if (!k) return; drag = { x: ev.clientX, y: ev.clientY, pan: ev.shiftKey || ev.button === 2 }; cv.setPointerCapture(ev.pointerId); ev.preventDefault(); });
    cv.addEventListener("pointermove", ev => {
      if (!drag) return; const k = cam(); if (!k) return; const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y; drag.x = ev.clientX; drag.y = ev.clientY;
      if (drag.pan) { const s = k.dist / cv.clientHeight * 0.66; k.px += dx * s; k.py -= dy * s; } else { k.yaw += dx * 0.01; k.pitch = Math.max(0, Math.min(Math.PI, k.pitch - dy * 0.01)); }
      requestAnimationFrame(() => redraw(v));
    });
    const up = () => { drag = null; }; cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("contextmenu", ev => ev.preventDefault());
    cv.addEventListener("wheel", ev => { const k = cam(); if (!k) return; ev.preventDefault(); k.dist = Math.max(0.3, Math.min(30, k.dist * Math.exp(ev.deltaY * 0.0012))); requestAnimationFrame(() => redraw(v)); }, { passive: false });
    cv.addEventListener("dblclick", () => { const c = cardOf(v.card); if (!c) return; cams[c.id + ":" + v.fid] = newCam(); redraw(v); });
  }
  /* after each render: put each card's canvas into its box and load the chosen file */
  function hydrateStl() {
    document.querySelectorAll(".stlbox[data-card]").forEach(box => {
      const c = cardOf(box.dataset.card), e = LB.cur(); if (!c || !e) return;
      const ref = e.files.find(f => f.id === c.cur); if (!ref) return;
      const v = viewer(c); if (!v) { box.innerHTML = '<div class="figph">This browser cannot show 3D (WebGL is off).</div>'; return; }
      box.appendChild(v.cv); const info = box.parentNode.querySelector(".stlinfo");
      if (v.fid === ref.id && v.r.geo) { redraw(v); if (info) info.innerHTML = infoLine(v.r.geo); return; }
      v.fid = ref.id; v.r.geo = null; redraw(v); box.classList.add("loading");
      geoOf(ref).then(geo => {
        box.classList.remove("loading"); if (v.fid !== ref.id) return;
        if (!geo) { if (info) info.textContent = "This file could not be read as STL" + (ref.loc === "dir" && !LB.file.dir ? " (reconnect the lab book folder first)" : "") + "."; return; }
        v.r.load(geo); redraw(v); const i2 = document.querySelector('.stlinfo[data-card="' + c.id + '"]'); if (i2) i2.innerHTML = infoLine(geo);
      });
    });
  }
  const baseRender = LB.render;
  LB.render = function () { const r = baseRender.apply(this, arguments); try { hydrateStl(); } catch (x) { } return r; };
  window.addEventListener("resize", () => Object.values(viewers).forEach(v => { if (v.cv.isConnected) redraw(v); }));

  const dims = geo => [0, 1, 2].map(d => g(geo.mx[d] - geo.mn[d])).join(" × ");
  const infoLine = geo => "<b>" + dims(geo) + "</b> (X × Y × Z, in the file's units, usually mm) · " + geo.n.toLocaleString() + " triangles · solid volume ≈ <b>" + g(geo.vol) + "</b> mm³ (= µL, if the model is closed and in mm)";
  const stlFiles = (e, c) => c.files.map(id => e.files.find(f => f.id === id)).filter(Boolean);
  function stlBody(e, c, P, dis) {
    const fs = stlFiles(e, c); if (fs.length && !fs.some(f => f.id === c.cur)) c.cur = fs[0].id;
    const add = '<label class="btn sm" style="cursor:pointer" title="Attach one or more .stl files (chip design, mould, holder…)">⬆ Attach STL…<input type="file" multiple accept=".stl,model/stl,application/sla" data-file="stlAttach" data-card="' + c.id + '" hidden ' + dis + "></label>";
    if (!fs.length) return '<div class="drop stldrop" data-dz="stlAttach" data-card="' + c.id + '"><div class="ic">' + icon("stl", 34) + "</div><div><b>Drop .stl files here</b> or " + add + '</div><div class="muted sm">For example the chip design or mould from your CAD program. The files are also kept on the Results tab.</div></div>';
    const cur = fs.find(f => f.id === c.cur);
    const ax = isAxo(c), proj = '<span class="seg" role="group" aria-label="Projection"><button class="btn sm' + (ax ? "" : " on") + '" data-a="stlProj" data-card="' + c.id + '" data-p="persp" aria-pressed="' + !ax + '" title="Perspective: far parts look smaller, like a photo">Perspective</button><button class="btn sm' + (ax ? " on" : "") + '" data-a="stlProj" data-card="' + c.id + '" data-p="axo" aria-pressed="' + ax + '" title="Axonometric: parallel lines stay parallel, sizes are not distorted (like a technical drawing)">Axo</button></span>';
    const views = proj + Object.keys(VIEWS).map(k => '<button class="btn sm" data-a="stlView" data-card="' + c.id + '" data-v="' + k + '">' + { iso: "Iso", top: "Top", front: "Front", side: "Side" }[k] + "</button>").join("");
    return '<div class="row wrap stltabs" style="gap:6px" data-dz="stlAttach" data-card="' + c.id + '">' + fs.map(f => '<span class="stltab' + (f.id === c.cur ? " on" : "") + '"><button class="link sm" data-a="stlPick" data-card="' + c.id + '" data-fid="' + f.id + '" title="' + esc(f.name) + '">' + esc(K.cut(f.name, 28)) + '</button><button class="x" data-a="stlRm" data-card="' + c.id + '" data-fid="' + f.id + '" ' + dis + ' aria-label="Remove from this card" title="Remove from this card (stays on the Results tab)">×</button></span>').join("") + add + "</div>" +
      '<div class="stlbox" data-card="' + c.id + '"></div>' +
      '<div class="row wrap" style="gap:6px">' + views + '<span class="muted sm grow">Drag to turn · Shift-drag or right-drag to move · scroll to zoom · double-click to reset</span>' +
      '<label class="sm row" style="gap:6px">Color <input type="color" class="pcol" aria-label="Model color" data-b="' + P + '.color" data-render="1" value="' + esc(c.color) + '" ' + dis + '></label><button class="btn sm" data-a="openFile" data-fid="' + cur.id + '" title="Open or download the original file">⬇ File</button></div>' +
      '<div class="muted sm stlinfo" data-card="' + c.id + '">Loading ' + esc(cur.name) + "…</div>" +
      field("About this file", '<input type="text" data-b="' + P + ".labels." + cur.id + '" value="' + esc(c.labels[cur.id] || "") + '" placeholder="e.g. Chamber layer v3, 200 µm channels" ' + dis + ' autocomplete="off">');
  }
  async function snapshot(geo, cam, color, axo) {
    const cv = document.createElement("canvas"); cv.width = 900; cv.height = 520; const r = makeRenderer(cv, true); if (!r) return "";
    r.load(geo); r.draw(cam, color, axo); const u = cv.toDataURL("image/png"); try { r.gl.getExtension("WEBGL_lose_context").loseContext(); } catch (x) { } return u;
  }
  async function stlPrint(e, c) {
    let h = "";
    for (const f of stlFiles(e, c)) {
      const geo = await geoOf(f), img = geo ? await snapshot(geo, camOf(c, f.id), c.color, isAxo(c)) : "";
      h += '<div class="stlp">' + (img ? '<figure class="figp"><img src="' + img + '" alt="' + esc(f.name) + '"></figure>' : "") +
        kv([["File", f.name + " (" + U.size(f.size || 0) + ")"], ["About", c.labels[f.id]], ["Size (X × Y × Z)", geo ? dims(geo) + " (file units, usually mm)" : "could not be read"], ["Triangles", geo ? geo.n.toLocaleString() : ""], ["Solid volume", geo ? "≈ " + g(geo.vol) + " mm³" : ""]]) + "</div>";
    }
    return h;
  }
  A.stlAttach = async el => {
    const e = live(), c = e && cardOf(el.dataset.card), list = [...(el.files || [])]; try { el.value = ""; } catch (x) { } if (!c || !list.length) return;
    let n = 0;
    for (const f of list) {
      if (!/\.stl$/i.test(f.name)) { LB.toast(f.name + " is not an .stl file."); continue; }
      const r = await LB.fileAdd(f); if (!r) continue; e.files.push(r); c.files.push(r.id); c.cur = r.id; n++; LB.log(e, "Attached " + f.name + " (STL)");
    }
    if (n) { LB.save(); LB.render(); }
  };
  A.stlPick = el => { const c = cardOf(el.dataset.card); if (!c) return; c.cur = el.dataset.fid; LB.save(); LB.render(); };
  A.stlRm = el => { const e = live(), c = e && cardOf(el.dataset.card); if (!c) return; c.files = c.files.filter(id => id !== el.dataset.fid); if (c.cur === el.dataset.fid) c.cur = c.files[0] || ""; LB.save(); LB.render(); };
  A.stlProj = el => {
    const c = cardOf(el.dataset.card); if (!c) return; const axo = el.dataset.p === "axo"; axoTmp[c.id] = axo;
    if (live() && c.proj !== el.dataset.p) { c.proj = el.dataset.p; LB.save(); }
    LB.render();
  };
  A.stlView = el => { const c = cardOf(el.dataset.card); if (!c) return; cams[c.id + ":" + c.cur] = newCam(el.dataset.v); const v = viewers[c.id]; if (v) redraw(v); };

  Object.assign(TYPES, {
    pdms: { label: "PDMS batch", desc: "Mixing ratio, degas and cure timers, bonding", make: () => ({ title: "PDMS batch", product: "Sylgard 184", lot: "", mould: "", made: "", ratio: "10", total: "", area: "", thick: "", loss: "10", degas: "30", cureT: "65", cureD: "2", cureU: "h", bond: "", bondTo: "", power: "", btime: "", post: "", leak: "", chips: "", good: "", done: {}, tmr: {} }), body: pdmsBody, print: pdmsPrint, data: c => !!(c.total || c.area || c.lot || c.mould || c.chips || c.bond || Object.values(c.done || {}).some(Boolean)) },
    stl: { label: "3D model (STL)", desc: "Look at chip designs and moulds in 3D", make: () => ({ title: "3D model", files: [], cur: "", color: "#7fa3d1", labels: {}, proj: "persp" }), body: stlBody, print: stlPrint, data: c => c.files.length > 0 }
  });
})(window.LB);
