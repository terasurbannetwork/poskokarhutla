/* tiga.js — awan asap 3D di atas medan (three.js 0.169 dimuat malas dari CDN, seperti public/sim_adegan.js; tanpa importmap dan tanpa
   OrbitControls: kontrol orbit ditulis sendiri supaya halaman tidak perlu menambah importmap). Data masuk lewat buat(wadah, o) dan ubah(s).
   Medan: ubin Terrarium (AWS) dirangkai jadi kisi ketinggian; gagal diunduh -> permukaan datar, tanpa error. Sumbu: x = bujur x cos(lintang tengah),
   y = ketinggian x PEMBESAR, z = -lintang (utara di atas layar). */
const CDN = "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js";
const DEM = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const PEMBESAR = 14, M_PER_DEG = 111320;
let pustaka = null;
const muat = () => pustaka || (pustaka = Promise.race([import(/* @vite-ignore */ CDN), new Promise((_, no) => setTimeout(() => no(new Error("three.js terlalu lama dimuat")), 40000))]).catch(e => { pustaka = null; throw e; }));
export const adaWebGL = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };

const mix = (a, b, t) => a + (b - a) * t;
const lat2y = la => { const r = la * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2; };

/* rangkai ubin jadi larik ketinggian (m). Mengembalikan {elev(lon,lat)} */
async function medan(bbox) {
  const [w, s, e, n] = bbox; let z = 7, x0, x1, y0, y1;
  for (; z > 3; z--) { const T = 2 ** z; x0 = Math.floor((w + 180) / 360 * T); x1 = Math.floor((e + 180) / 360 * T); y0 = Math.floor(lat2y(n) * T); y1 = Math.floor(lat2y(s) * T); if ((x1 - x0 + 1) * (y1 - y0 + 1) <= 12) break; }
  const nx = x1 - x0 + 1, ny = y1 - y0 + 1, cv = document.createElement("canvas"); cv.width = nx * 256; cv.height = ny * 256;
  const g = cv.getContext("2d", {willReadFrequently: true}); let ok = 0;
  await Promise.all(Array.from({length: nx * ny}, (_, k) => new Promise(res => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { g.drawImage(im, (k % nx) * 256, ((k / nx) | 0) * 256); ok++; res(); }; im.onerror = () => res(); setTimeout(res, 9000); im.src = DEM(z, x0 + k % nx, y0 + ((k / nx) | 0)); })));
  if (!ok) return {elev: () => 0, nyata: false};
  const d = g.getImageData(0, 0, cv.width, cv.height).data, T = 2 ** z;
  return {nyata: true, elev(lon, lat) {
    const px = Math.min(cv.width - 1, Math.max(0, Math.floor(((lon + 180) / 360 * T - x0) * 256))), py = Math.min(cv.height - 1, Math.max(0, Math.floor((lat2y(lat) * T - y0) * 256))), o = (py * cv.width + px) * 4;
    const h = d[o] * 256 + d[o + 1] + d[o + 2] / 256 - 32768; return h > 0 ? h : 0;
  }};
}
const warnaMedan = h => h <= 0 ? [.42, .55, .64] : h < 150 ? [mix(.62, .5, h / 150), mix(.72, .66, h / 150), mix(.5, .42, h / 150)] : h < 1200 ? [mix(.5, .62, (h - 150) / 1050), mix(.66, .58, (h - 150) / 1050), mix(.42, .46, (h - 150) / 1050)] : [mix(.62, .9, Math.min(1, (h - 1200) / 2000)), mix(.58, .88, Math.min(1, (h - 1200) / 2000)), mix(.46, .84, Math.min(1, (h - 1200) / 2000))];

function ikonCanvas(jenis) {
  const c = document.createElement("canvas"); c.width = c.height = 96; const g = c.getContext("2d"); g.lineJoin = "round";
  if (jenis === "api") { g.fillStyle = "#e8541e"; g.strokeStyle = "#fff"; g.lineWidth = 5; g.beginPath(); g.moveTo(48, 6); g.bezierCurveTo(52, 30, 78, 40, 78, 62); g.bezierCurveTo(78, 82, 62, 90, 48, 90); g.bezierCurveTo(34, 90, 18, 82, 18, 62); g.bezierCurveTo(18, 48, 28, 42, 32, 30); g.bezierCurveTo(38, 38, 40, 42, 44, 44); g.bezierCurveTo(46, 30, 44, 18, 48, 6); g.closePath(); g.stroke(); g.fill();
    g.fillStyle = "#ffd25e"; g.beginPath(); g.ellipse(48, 68, 11, 16, 0, 0, 7); g.fill(); }
  else { g.fillStyle = "#4b5563"; g.strokeStyle = "#fff"; g.lineWidth = 5; g.beginPath(); g.moveTo(34, 90); g.lineTo(40, 24); g.lineTo(56, 24); g.lineTo(62, 90); g.closePath(); g.stroke(); g.fill();
    g.fillStyle = "#e5e7eb"; g.fillRect(38, 40, 20, 6); g.fillRect(36, 60, 24, 6); g.fillStyle = "rgba(210,210,210,.9)"; g.beginPath(); g.arc(52, 14, 9, 0, 7); g.arc(62, 8, 7, 0, 7); g.fill(); }
  return c;
}
function spriteAwan() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.45, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c;
}

export async function buat(wadah, o) {
  const T = await muat();
  const [w, s, e, n] = o.bbox, lc = (s + n) / 2, bc = (w + e) / 2, kx = Math.cos(lc * Math.PI / 180), P = (lon, lat, m = 0) => [(lon - bc) * kx, m / M_PER_DEG * PEMBESAR, -(lat - lc)];
  const lebar = (e - w) * kx, tinggiPeta = n - s;
  const R = new T.WebGLRenderer({antialias: true, alpha: false, powerPreference: "high-performance"}); R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); wadah.append(R.domElement); R.domElement.className = "su-kanvas";
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(40, 1, .05, 400), amb = new T.AmbientLight(0xffffff, .6), sun = new T.DirectionalLight(0xffffff, 1.2); scene.add(amb, sun);
  const md = await medan(o.bbox);
  /* permukaan medan */
  const SX = 150, SZ = Math.max(40, Math.round(SX * tinggiPeta / ((e - w)))), geo = new T.PlaneGeometry(lebar, tinggiPeta, SX, SZ); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), zeros = [];
  for (let i = 0; i < pos.count; i++) { const lon = bc + pos.getX(i) / kx, lat = lc - pos.getZ(i), h = md.elev(lon, lat); pos.setY(i, h / M_PER_DEG * PEMBESAR); const c = warnaMedan(h); col.set(c, i * 3); zeros.push(h); }
  geo.setAttribute("color", new T.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const tanah = new T.Mesh(geo, new T.MeshLambertMaterial({vertexColors: true})); scene.add(tanah);
  /* awan asap */
  const kis = o.kisi, ciA = [], cx = [], cy = [], cz = [];
  const i0 = Math.max(0, Math.floor((w - kis.lon0) / kis.s)), i1 = Math.min(kis.nx - 1, Math.ceil((e - kis.lon0) / kis.s)), j0 = Math.max(0, Math.floor((s - kis.lat0) / kis.s)), j1 = Math.min(kis.ny - 1, Math.ceil((n - kis.lat0) / kis.s));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const lon = kis.lon0 + (i + .5) * kis.s, lat = kis.lat0 + (j + .5) * kis.s; ciA.push(j * kis.nx + i); const [x, , z] = P(lon, lat); cx.push(x); cz.push(z); cy.push(md.elev(lon, lat) / M_PER_DEG * PEMBESAR); }
  const MAKS = ciA.length * 5, gp = new T.BufferGeometry(), pp = new Float32Array(MAKS * 3), pc = new Float32Array(MAKS * 4);
  gp.setAttribute("position", new T.BufferAttribute(pp, 3).setUsage(T.DynamicDrawUsage)); gp.setAttribute("color", new T.BufferAttribute(pc, 4).setUsage(T.DynamicDrawUsage)); gp.setDrawRange(0, 0);
  const tx = new T.CanvasTexture(spriteAwan()), asap = new T.Points(gp, new T.PointsMaterial({size: kis.s * kx * 4.5, map: tx, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true}));
  asap.frustumCulled = false; scene.add(asap);
  /* sumber berikon */
  const tex = {api: new T.CanvasTexture(ikonCanvas("api")), pltu: new T.CanvasTexture(ikonCanvas("pltu"))}, spr = [];
  const maksFrp = Math.max(1, ...o.sumber.map(x => x.frp || 0));
  for (const q of o.sumber) { const m = new T.SpriteMaterial({map: tex[q.jenis], transparent: true, depthWrite: false}), sp = new T.Sprite(m), ukr = q.jenis === "api" ? .28 + .5 * Math.sqrt((q.frp || 0) / maksFrp) : .5;
    const [x, , z] = P(q.lon, q.lat); sp.position.set(x, md.elev(q.lon, q.lat) / M_PER_DEG * PEMBESAR + ukr * .55, z); sp.scale.set(ukr, ukr, 1); sp.userData = q; scene.add(sp); spr.push(sp); }
  /* label kota */
  const lab = o.kota.map(k => { const cv = document.createElement("canvas"); cv.width = 320; cv.height = 96; const t = new T.CanvasTexture(cv), sp = new T.Sprite(new T.SpriteMaterial({map: t, transparent: true, depthTest: false}));
    const [x, , z] = P(k.lon, k.lat); sp.position.set(x, md.elev(k.lon, k.lat) / M_PER_DEG * PEMBESAR + .45, z); sp.scale.set(1.9, .57, 1); sp.renderOrder = 10; scene.add(sp); return {k, cv, t, sp, teks: ""}; });
  function gambarLabel(L, nama, val, kat) {
    const teks = `${nama}|${val}|${kat.w}`; if (L.teks === teks) return; L.teks = teks; const g = L.cv.getContext("2d"); g.clearRect(0, 0, 320, 96);
    g.fillStyle = "rgba(255,255,255,.94)"; g.beginPath(); g.roundRect(6, 12, 308, 72, 36); g.fill(); g.fillStyle = kat.w; g.beginPath(); g.roundRect(6, 12, 108, 72, 36); g.fill();
    g.fillStyle = kat.fg; g.font = "700 34px Inter,system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(val, 60, 49);
    g.fillStyle = "#1f2937"; g.font = "600 30px Inter,system-ui,sans-serif"; g.textAlign = "left"; let t = nama.replace(/^(Kota|Kabupaten|Kab\.) /, ""); while (g.measureText(t).width > 188 && t.length > 3) t = t.slice(0, -2); if (t !== nama.replace(/^(Kota|Kabupaten|Kab\.) /, "")) t += "..."; g.fillText(t, 124, 49); L.t.needsUpdate = true;
  }
  /* kamera orbit */
  const K = {az: .5, el: .85, r: Math.max(lebar, tinggiPeta) * 1.15, tx: 0, ty: 0, tz: 0}; let kotor = true, hancur = false, ptr = new Map(), jarak0 = 0;
  const sedia = () => { const ce = Math.cos(K.el); cam.position.set(K.tx + K.r * ce * Math.sin(K.az), K.ty + K.r * Math.sin(K.el), K.tz + K.r * ce * Math.cos(K.az)); cam.lookAt(K.tx, K.ty, K.tz); kotor = true; };
  const cv = R.domElement; cv.style.touchAction = "none";
  cv.addEventListener("pointerdown", ev => { cv.setPointerCapture(ev.pointerId); ptr.set(ev.pointerId, [ev.clientX, ev.clientY]); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; jarak0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
  cv.addEventListener("pointermove", ev => { const p = ptr.get(ev.pointerId); if (!p) return;
    if (ptr.size === 1) { K.az -= (ev.clientX - p[0]) * .006; K.el = Math.min(1.45, Math.max(.2, K.el + (ev.clientY - p[1]) * .005)); }
    ptr.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (jarak0) K.r = Math.min(80, Math.max(2, K.r * jarak0 / d)); jarak0 = d; }
    sedia(); });
  const lepas = ev => { ptr.delete(ev.pointerId); jarak0 = 0; };
  cv.addEventListener("pointerup", lepas); cv.addEventListener("pointercancel", lepas);
  cv.addEventListener("wheel", ev => { ev.preventDefault(); K.r = Math.min(80, Math.max(2, K.r * Math.exp(ev.deltaY * .001))); sedia(); }, {passive: false});
  const ukuran = () => { const W = wadah.clientWidth, H = wadah.clientHeight; if (!W || !H) return; R.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); kotor = true; };
  const ro = new ResizeObserver(ukuran); ro.observe(wadah); ukuran(); sedia();
  const langit = [new T.Color("#0a1224"), new T.Color("#9fc4e6")], tmp = new T.Color();
  function ubah(st) {
    const { jam, hasil, Kal, nilaiKota, faktorSumber } = st, b0 = Math.min(Math.floor(jam), 72), b1 = Math.min(b0 + 1, 72), f = jam - b0, N = kis.n, hw = st.jamWIB(jam);
    const siang = Math.max(0, Math.sin(Math.PI * (hw - 6) / 12)), a = Math.PI * (hw - 6) / 12;
    sun.position.set(Math.cos(a) * 30, Math.max(4, Math.sin(a) * 30), 12); sun.intensity = .15 + 1.25 * siang; amb.intensity = .25 + .55 * siang;
    tmp.copy(langit[0]).lerp(langit[1], Math.min(1, siang * 1.4)); scene.background = tmp.clone(); const gelap = .38 + .62 * Math.min(1, siang * 1.5);
    let k = 0;
    const konc = (A, Pp, c) => Kal * (A[b0 * N + c] * (1 - f) + A[b1 * N + c] * f) + (Pp[b0 * N + c] * (1 - f) + Pp[b1 * N + c] * f);
    for (let q = 0; q < ciA.length; q++) { const c = ciA[q], v = konc(hasil.sfcA, hasil.sfcP, c), u = konc(hasil.atsA, hasil.atsP, c) * .5;
      if (v > 2) { const t = Math.min(1, v / 250), r0 = mix(.84, .3, t) * gelap, g0 = mix(.79, .22, t) * gelap, b2 = mix(.64, .12, t) * gelap, al = Math.min(.6, .1 + v / 300), nl = v < 30 ? 2 : v < 100 ? 3 : 4;
        for (let l = 0; l < nl; l++) { pp[k * 3] = cx[q] + (((q * 7 + l * 13) % 10) - 5) * .012; pp[k * 3 + 1] = cy[q] + (.06 + l * .1) * PEMBESAR / 14 * (1 + t * .7); pp[k * 3 + 2] = cz[q] + (((q * 11 + l * 5) % 10) - 5) * .012; pc.set([r0, g0, b2, al], k * 4); k++; } }
      if (u > 2) { const al = Math.min(.3, .03 + u / 600); pp[k * 3] = cx[q]; pp[k * 3 + 1] = cy[q] + .55; pp[k * 3 + 2] = cz[q]; pc.set([.7 * gelap, .66 * gelap, .6 * gelap, al], k * 4); k++; } }
    gp.setDrawRange(0, k); gp.attributes.position.needsUpdate = true; gp.attributes.color.needsUpdate = true;
    for (const sp of spr) { const fk = faktorSumber(sp.userData); sp.material.opacity = fk <= 0 ? .22 : fk < 1 ? .6 : 1; }
    lab.forEach((L, i) => { const nv = nilaiKota[i]; gambarLabel(L, L.k.nama, String(Math.round(nv.v)), nv.kat); });
    kotor = true;
  }
  function putar() { if (hancur) return; if (kotor) { kotor = false; R.render(scene, cam); } requestAnimationFrame(putar); }
  requestAnimationFrame(putar);
  return {ubah, ukuran, nyata: md.nyata, hancur() { hancur = true; ro.disconnect(); R.dispose(); R.domElement.remove(); }};
}
