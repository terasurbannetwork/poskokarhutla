/* sim_panel.js — tab "Lapisan | Analisis | Bukti | Catatan" di panel kanan tab Insiden (mode forensik, sim_3d.js).
   Berdiri sendiri: mengamati window.SimFT.ctx().el.kanan; isi asli (kartu Lapisan, Ringkasan, Cuaca) dibiarkan dan hanya ditampil/disembunyikan lewat CSS.
   Semua angka dari hasil Sim (H.T, H.fuel, H.W, H.desa, H.luas), titik panas nyata (S.titik / data/hotspot.json) dan deteksi drone simulasi
   (SimArmada.inti). Catatan hanya di localStorage peramban, tidak dikirim ke server. */
(() => {
if (typeof Sim === "undefined" || !window.SimFT) return;
/* ASUMSI (bukan keluaran model), dinamai supaya mudah dicari */
const RADIUS_TITIK_KM = 5;      /* titik panas satelit dihitung bila <= 5 km dari titik penyulutan */
const JENDELA_ANGIN_JAM = 6;    /* arah angin = rata-rata vektor 6 jam terakhir sampai jam geser */
const SELARAS_DORONG = 30;      /* selisih arah kepala api vs angin < 30° = "Didorong angin" */
const SELARAS_LAWAN = 120;      /* selisih >= 120° = "Melawan angin"; di antaranya "Menyamping" */
const MAKS_PER_JENIS = 10;      /* kartu bukti per jenis (titik panas, drone) yang ditampilkan */
const MAKS_CATATAN = 50;        /* catatan per insiden */
const BANTU = {N: "VIIRS S-NPP", N20: "VIIRS NOAA-20", N21: "VIIRS NOAA-21", M: "MODIS"};

/* ---------- hitung murni (diekspor di window.SimPanel.inti untuk smoke) ---------- */
const sudut = d => ((d % 360) + 360) % 360;
const selisihArah = (a, b) => Math.abs(((sudut(a) - sudut(b) + 540) % 360) - 180); /* 0..180 */
function bearing(lon0, lat0, lon1, lat1) { return sudut(Math.atan2((lon1 - lon0) * Math.cos(lat0 * Math.PI / 180), lat1 - lat0) * 180 / Math.PI); }
/* arah angin RATA-RATA yang MENUJU (derajat): rata-rata vektor ws, jam (t-5..t); W.wd = arah DARI (+180) */
function anginMenuju(W, t, jendela = JENDELA_ANGIN_JAM) {
  let x = 0, y = 0; for (let h = Math.max(0, t - jendela + 1); h <= t; h++) { const a = (W.wd[h] + 180) * Math.PI / 180; x += W.ws[h] * Math.sin(a); y += W.ws[h] * Math.cos(a); }
  return Math.hypot(x, y) < 1e-9 ? null : sudut(Math.atan2(x, y) * 180 / Math.PI);
}
const labelSelaras = d => d < SELARAS_DORONG ? "dorong" : d >= SELARAS_LAWAN ? "lawan" : "samping";
/* luas terbakar kumulatif per jam per bahan bakar: sel dihitung pada jam ceil(T) (sama dengan H.luas), jadi jumlahnya = luas total */
function luasBahan(T, fuel, ha, nf) {
  const c = Array.from({length: nf}, () => new Float64Array(73)), t0 = new Float64Array(nf).fill(Infinity);
  for (let k = 0; k < T.length; k++) { const t = T[k]; if (!(t <= 72)) continue; const f = fuel[k] || 0; c[f][Math.ceil(t)]++; if (t < t0[f]) t0[f] = t; }
  for (const a of c) { for (let h = 1; h <= 72; h++) a[h] += a[h - 1]; for (let h = 0; h <= 72; h++) a[h] *= ha; }
  return {kum: c, t0};
}
/* titik pada jalur kepala api di jam t (interpolasi antar titik jalur) */
function posJalur(pts, t) {
  if (!pts || !pts.length) return null; if (t <= pts[0].jam) return pts[0];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i].jam) { const a = pts[i - 1], b = pts[i], f = (t - a.jam) / (b.jam - a.jam); return {lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f}; }
  return pts[pts.length - 1];
}

/* ---------- pembantu tampilan ---------- */
const $1 = id => document.getElementById(id);
const nf = (v, d = 0) => v.toLocaleString("id-ID", {maximumFractionDigits: d});
const bulat = v => v >= 1e3 ? Math.round(v / 10) * 10 : Math.round(v); /* tanpa presisi palsu */
const p2 = n => String(n).padStart(2, "0");
const jamW = ms => { const d = new Date(ms + 7 * 36e5); return `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][d.getUTCMonth()]} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())} WIB`; };
const ik = (d, w = 13) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IK = {
  lapis: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', analisis: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>', bukti: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  catatan: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>', dorong: '<path d="M4 12h15M14 6l6 6-6 6"/>', samping: '<path d="M6 18L18 6M9 6h9v9"/>', lawan: '<path d="M20 12H5M10 6l-6 6 6 6"/>',
  sat: '<circle cx="12" cy="12" r="3"/><path d="M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>', drone: '<circle cx="12" cy="12" r="2"/><circle cx="5" cy="5" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/>',
  cuaca: '<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1A4.5 4.5 0 0 1 17 18z"/>', desa: '<path d="M4 20V10l8-6 8 6v10z"/><path d="M10 20v-6h4v6"/>', api: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z"/>',
  hapus: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>', jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', naik: '<path d="M3 18l7-8 4 4 7-9"/>', turun: '<path d="M3 6l7 8 4-4 7 9"/>'
};
const TAB = [["lapisan", "Lapisan"], ["analisis", "Analisis"], ["bukti", "Bukti"], ["catatan", "Catatan"]];
const P = {tab: "lapisan", kunci: "", H: null, hs: null, hsH: null, lereng: new Map(), cat: null};
try { const s = sessionStorage.getItem("sp-tab"); if (TAB.some(x => x[0] === s)) P.tab = s; } catch (e) {}
const pill = (k, teks) => `<span class="sp-pill sp-${k}">${ik(IK[k] || IK.api, 12)}${teks}</span>`;
const sing = n => String(n || "").split(/ \(|, /)[0];

/* ---------- analisis ---------- */
const cacheLuas = new WeakMap();
function luasH(c) { let r = cacheLuas.get(c.H); if (!r) cacheLuas.set(c.H, r = luasBahan(c.H.T, c.H.fuel, c.K.d * c.K.d / 1e4, NF)); return r; }
function htmlAnalisis(c, t) {
  const H = c.H, W = H.W, L = luasH(c), tot = L.kum.reduce((s, a) => s + a[t], 0), nama = f => f ? sing(BAHAN[FUEL[f - 1]]?.n) : "Lain", warna = f => f ? BAHAN[FUEL[f - 1]]?.warna : "#8a96aa";
  const baris = L.kum.map((a, f) => ({f, ha: a[t], t0: L.t0[f]})).filter(x => x.ha > 0).sort((a, b) => b.ha - a.ha);
  const bar = baris.map(x => { const pr = tot > 0 ? x.ha / tot * 100 : 0, laju = x.ha / Math.max(1, t - Math.ceil(x.t0)); /* ha/jam rata-rata sejak sel bahan itu pertama tersulut */
    return `<div class="sp-r"><span class="sp-rn">${esc(nama(x.f))}</span><b>${nf(bulat(x.ha))} ha · ${nf(Math.round(pr))}%</b><i class="sp-bar"><u style="width:${pr.toFixed(1)}%;background:${warna(x.f)}"></u></i><small>${t > 0 ? `${nf(laju < 10 ? Math.round(laju * 10) / 10 : Math.round(laju), 1)} ha/jam` : "belum menyebar"}</small></div>`; }).join("");
  /* keselarasan dengan angin */
  const pts = SimFT.jalur(H), p0 = pts?.[0], pk = pts && posJalur(pts, t), am = anginMenuju(W, Math.min(72, t));
  let sel = "";
  if (p0 && pk && t > 0 && km(p0.lat, p0.lon, pk.lat, pk.lon) > 0.05 && am != null) {
    const b = bearing(p0.lon, p0.lat, pk.lon, pk.lat), d = selisihArah(b, am), lb = labelSelaras(d);
    sel = `<dt>Jalur kepala api</dt><dd>${nf(Math.round(b))}° <small>${nf(km(p0.lat, p0.lon, pk.lat, pk.lon), 1)} km dari penyulutan</small></dd><dt>Angin ${JENDELA_ANGIN_JAM} j</dt><dd>menuju ${nf(Math.round(am))}°</dd>
      <dt>Selisih</dt><dd>${nf(Math.round(d))}° ${pill(lb, {dorong: "Didorong angin", samping: "Menyamping", lawan: "Melawan angin"}[lb])}</dd>`;
    const ls = lereng(c, pts, pk, t); if (ls != null) sel += `<dt>Lereng</dt><dd>${ls >= 0 ? pill("naik", "Naik lereng") : pill("turun", "Turun lereng")} ${nf(Math.abs(Math.round(ls)))}%</dd>`;
  } else sel = `<dt>Jalur kepala api</dt><dd><small>${t > 0 ? "belum terukur" : "geser jam untuk melihat arah"}</small></dd>`;
  const sk = SKEN.filter(s => c.Sim.hasil[s.id]).map(s => ({s, v: c.Sim.hasil[s.id].luas.mid[72]})), mx = Math.max(1, ...sk.map(x => x.v));
  const bsk = sk.map(x => `<div class="sp-r${x.s.id === c.Sim.lihat ? " on" : ""}"><span class="sp-rn">${esc(x.s.n)}</span><b>${nf(bulat(x.v))} ha</b><i class="sp-bar"><u style="width:${(x.v / mx * 100).toFixed(1)}%;background:${x.s.w}"></u></i></div>`).join("");
  return `<section class="s3-sec"><h3>${ik(IK.api)}Luas per bahan bakar <small>sampai +${t} j</small></h3>${bar || `<p class="sp-nol">Belum ada yang terbakar.</p>`}<div class="sp-tot">Total <b>${nf(bulat(tot))} ha</b></div></section>
    <section class="s3-sec"><h3>${ik(IK.dorong)}Arah penjalaran</h3><dl class="s3-kv2">${sel}</dl></section>
    <section class="s3-sec"><h3>${ik(IK.analisis)}Skenario, luas 72 j</h3>${bsk}</section>`;
}
/* kemiringan rata-rata dari penyulutan ke kepala (naik = +%); async, di-cache per jalur+jam; null bila ketinggian belum ada */
function lereng(c, pts, pk, t) {
  if (!SimFT.elevasi) return null; const key = `${t}|${c.Sim.lihat}`, m = P.lereng; if (P.lerengH !== c.H) { m.clear(); P.lerengH = c.H; }
  if (m.has(key)) return m.get(key);
  m.set(key, null); const p0 = pts[0], H = c.H;
  Promise.all([SimFT.elevasi(p0.lon, p0.lat), SimFT.elevasi(pk.lon, pk.lat)]).then(([a, b]) => {
    const dm = km(p0.lat, p0.lon, pk.lat, pk.lon) * 1000; if (a == null || b == null || dm < 50) return;
    m.set(key, (b - a) / dm * 100); if (P.H === H && P.tab === "analisis") plan();
  }).catch(() => {});
  return null;
}

/* ---------- bukti ---------- */
function muatTitik() { /* S.titik bila sudah penuh, selain itu data/hotspot.json (format seperti sim_data.js titik()) */
  if (typeof S !== "undefined" && S.titikPenuh && S.titik) return Promise.resolve({rows: S.titik, acuan: S.acuan});
  return muatTitik.p ||= muatJSON("data/hotspot.json").then(h => ({rows: h.baris, acuan: new Date(h.acuan)})).catch(() => { muatTitik.p = null; return null; });
}
function itemBukti(c, hs) {
  const {Sim, H, K} = c, p = Sim.f.properties, mulai = +Sim.cuaca.mulai, out = [], W = H.W;
  const jamKe = ms => Math.max(0, Math.min(72, Math.round((ms - mulai) / 36e5)));
  if (hs) { const a = +hs.acuan, dekat = [];
    for (const r of hs.rows) { const d = km(p.lat, p.lon, r[0], r[1]); if (d <= RADIUS_TITIK_KM) dekat.push({ms: a + r[2] * 36e5, d, s: r[3], lat: r[0], lon: r[1]}); }
    dekat.sort((x, y) => x.ms - y.ms); const tampil = dekat.slice(-MAKS_PER_JENIS);
    for (const x of tampil) out.push({ms: x.ms, h: jamKe(x.ms), ik: "sat", jd: `Titik panas · ${nf(x.d, 1)} km`, sm: `${BANTU[x.s] || esc(x.s)} (FIRMS)`, lat: x.lat, lon: x.lon});
    if (dekat.length > tampil.length) out.push({ms: tampil[0].ms - 1, h: 0, ik: "sat", jd: `${nf(dekat.length - tampil.length)} titik panas lebih lama`, sm: `dalam ${RADIUS_TITIK_KM} km`, lat: p.lat, lon: p.lon}); }
  const inti = window.SimArmada?.inti; if (inti?.deteksi) aman(() => { const det = inti.deteksi(K, H);
    for (const x of det.slice(0, MAKS_PER_JENIS)) out.push({ms: mulai + x.h * 36e5, h: x.h, ik: "drone", jd: `Deteksi drone · ${nf(Math.round(x.suhu))} °C`, sm: `${inti.DR[x.i].kode} (simulasi)`, lat: x.lat, lon: x.lon}); });
  const cuaca = /^Open-Meteo/.test(Sim.cuaca.sumber || "") ? "Open-Meteo" : Sim.cuaca.sumber || "Open-Meteo";
  for (let h = 0; h <= 72; h += 6) { let hj = 0; for (let q = Math.max(0, h - 5); q <= h; q++) hj += W.hujan[q];
    out.push({ms: mulai + h * 36e5, h, ik: "cuaca", jd: `Angin ${nf(Math.round(W.ws[h]))} km/j · RH ${nf(Math.round(W.rh[h]))}%`, sm: `${cuaca} · hujan 6 j ${hj >= .1 ? nf(Math.round(hj * 10) / 10, 1) + " mm" : "0 mm"}`, lat: p.lat, lon: p.lon}); }
  for (const d of H.desa) out.push({ms: mulai + d.eta * 36e5, h: Math.min(72, Math.ceil(d.eta)), ik: "desa", jd: `${esc(d.nama)} tercapai api`, sm: `model sebaran · ± ${nf(Math.round(d.km * 10) / 10, 1)} km`, lat: d.lat, lon: d.lon});
  if (Sim.k !== "titik") { const n = Number.isFinite(p.n) ? p.n : p.api24?.length; if (n > 0) out.push({ms: mulai, h: 0, ik: "api", jd: `${nf(n)} titik panas 24 jam`, sm: `cluster ${esc(p.kec || p.id)} (FIRMS)`, lat: p.lat, lon: p.lon}); }
  return out.sort((a, b) => a.ms - b.ms || a.h - b.h);
}
function htmlBukti(c) {
  const it = P.items = itemBukti(c, P.hsH === c.H ? P.hs : null);
  return `<section class="s3-sec"><h3>${ik(IK.bukti)}Bukti <small>${nf(it.length)} kartu</small></h3><div class="sp-bk">${it.map((x, i) =>
    `<button type="button" class="sp-kt" data-i="${i}" data-h="${x.h}"><span class="sp-ik">${ik(IK[x.ik], 14)}</span><span class="sp-tk"><b>${x.jd}</b><small>${x.sm}</small></span><time>${jamW(x.ms)}</time></button>`).join("")}</div></section>`;
}
function tandaiBukti(el, t) { el.querySelectorAll(".sp-kt").forEach(b => b.classList.toggle("sp-fut", +b.dataset.h > t)); }
function loncat(i) {
  const x = P.items?.[i]; if (!x) return; const s = $1("simT"); s.value = Math.min(72, Math.max(0, x.h)); s.dispatchEvent(new Event("input"));
  const m = Sim.peta; if (m && Number.isFinite(x.lat)) m.flyTo({center: [x.lon, x.lat], zoom: Math.max(m.getZoom(), 11), duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900});
}

/* ---------- catatan ---------- */
const kunciCat = () => { const p = Sim.f?.properties; return p ? `sp-catatan:${Sim.k}|${p.lat.toFixed(3)}|${p.lon.toFixed(3)}` : null; };
function bacaCat(k) { try { const v = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function simpanCat(k, a) { try { localStorage.setItem(k, JSON.stringify(a.slice(0, MAKS_CATATAN))); return true; } catch (e) { return false; } }
function htmlCatatan(c, t) {
  const k = kunciCat(), a = k ? bacaCat(k) : [];
  return `<section class="s3-sec"><h3>${ik(IK.catatan)}Catatan <small>${nf(a.length)} tersimpan di peramban ini</small></h3>
    <textarea class="sp-ta" id="spTa" rows="3" maxlength="500" placeholder="Tulis catatan insiden ini" aria-label="Catatan insiden"></textarea>
    <div class="sp-aksi"><button type="button" class="sp-btn" data-aksi="tandai">${ik(IK.jam, 12)}Tandai jam ini</button><button type="button" class="sp-btn sp-pr" data-aksi="simpan">Simpan</button></div>
    <div class="sp-cl">${a.map(n => `<div class="sp-cn"><p>${esc(n.teks)}</p><small>${jamW(n.ts)} · simulasi +${nf(n.jam)} j</small><button type="button" class="sp-x" data-hapus="${esc(n.id)}" aria-label="Hapus catatan">${ik(IK.hapus, 13)}</button></div>`).join("") || `<p class="sp-nol">Belum ada catatan.</p>`}</div></section>`;
}
function aksiCatatan(a) {
  const ta = $1("spTa"), k = kunciCat(); if (!k) return;
  if (a === "tandai" && ta) { const s = `+${Math.floor(+$1("simT").value)} j `, i = ta.selectionStart ?? ta.value.length; ta.value = ta.value.slice(0, i) + s + ta.value.slice(ta.selectionEnd ?? i); ta.focus(); ta.selectionStart = ta.selectionEnd = i + s.length; return; }
  if (a === "simpan" && ta) { const teks = ta.value.trim(); if (!teks) return; const l = bacaCat(k);
    l.unshift({id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ts: Date.now(), jam: Math.floor(+$1("simT").value), teks});
    if (!simpanCat(k, l)) return toast("Catatan tidak bisa disimpan di peramban ini"); P.kunci = ""; plan(true); }
}

/* ---------- pasang & segarkan ---------- */
const aman = fn => { try { return fn(); } catch (e) { console.error("SimPanel:", e); } };
const kanan = () => aman(() => SimFT.ctx().el.kanan);
function pasang(el) { /* strip + wadah di depan kartu asli; idempoten, dipanggil tiap kanan dirender ulang */
  if (el.querySelector(":scope > .sp-tabs") || !el.querySelector(":scope > .s3-sec .s3-lyl")) return false;
  el.insertAdjacentHTML("afterbegin", `<div class="sp-tabs" role="tablist" aria-label="Panel kanan">${TAB.map(([id, n]) => `<button type="button" role="tab" data-sp="${id}" aria-selected="${id === P.tab}"><span>${n}</span></button>`).join("")}</div><div class="sp-isi" id="spIsi"></div>`);
  el.dataset.spTab = P.tab; P.kunci = ""; return true;
}
function render() {
  const el = kanan(); if (!el) return; const isi = el.querySelector(":scope > .sp-isi"); if (!isi) return;
  el.dataset.spTab = P.tab; el.querySelectorAll(":scope > .sp-tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.sp === P.tab));
  if (P.tab === "lapisan") return;
  const c = SimFT.ctx(); if (!c.H || !c.K || !c.Sim.cuaca) return; const t = Math.min(72, Math.max(0, Math.floor(c.t)));
  P.H = c.H;
  if (P.tab === "bukti") { const kunci = `b|${c.Sim.k}|${c.Sim.lihat}|${P.hsH === c.H}`;
    if (P.kunci !== kunci) { P.kunci = kunci; isi.innerHTML = aman(() => htmlBukti(c)) || ""; if (P.hsH !== c.H) muatTitik().then(hs => { if (hs && SimFT.ctx().H === c.H) { P.hs = hs; P.hsH = c.H; plan(); } }); }
    tandaiBukti(isi, t); return; }
  if (P.tab === "catatan") { const kunci = `c|${kunciCat()}`; if (P.kunci !== kunci) { P.kunci = kunci; isi.innerHTML = aman(() => htmlCatatan(c, t)) || ""; } return; }
  const kunci = `a|${c.Sim.k}|${c.Sim.lihat}|${t}`; if (P.kunci === kunci && P.hh === c.H) return; P.kunci = kunci; P.hh = c.H;
  isi.innerHTML = aman(() => htmlAnalisis(c, t)) || "";
}
let rt = 0;
function plan(paksa) { if (paksa) P.kunci = ""; if (!rt) rt = requestAnimationFrame(() => { rt = 0; render(); }); } /* hitungan berat ditunda rAF */
function awal() {
  const el = kanan(); if (!el || el._sp) return !!el; el._sp = 1;
  new MutationObserver(() => { const baru = pasang(el); if (baru) plan(); }).observe(el, {childList: true});
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-sp]");
    if (b) { P.tab = b.dataset.sp; el.dataset.spTab = P.tab; el.querySelectorAll(":scope > .sp-tabs button").forEach(x => x.setAttribute("aria-selected", x === b)); try { sessionStorage.setItem("sp-tab", P.tab); } catch (_) {} return plan(true); } /* kelas urgent; isi menyusul rAF */
    const k = e.target.closest(".sp-kt"); if (k) return loncat(+k.dataset.i);
    const a = e.target.closest("[data-aksi]"); if (a) return aksiCatatan(a.dataset.aksi);
    const h = e.target.closest("[data-hapus]"); if (h) { const kk = kunciCat(); if (kk) { simpanCat(kk, bacaCat(kk).filter(n => n.id !== h.dataset.hapus)); plan(true); } }
  });
  const s = $1("simT"); s?.addEventListener("input", () => plan()); s?.addEventListener("change", () => plan());
  if (pasang(el)) plan();
  return true;
}
if (!awal()) document.addEventListener("DOMContentLoaded", awal);
window.SimPanel = {segar: () => plan(true), inti: {selisihArah, bearing, anginMenuju, labelSelaras, luasBahan, posJalur}};
})();
