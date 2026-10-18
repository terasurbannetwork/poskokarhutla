/* sim.js — tab Simulasi udara: memasang window.SimUdara = {pasang(el), BATAS, ASUMSI}. Logika di model.js (diuji node --test tests/udara/),
   tampilan 3D di tiga.js, peta 2D di peta2d.js. Kerja berat (simulasi 72 jam + 24 jam spin-up) berjalan bertahap di requestAnimationFrame
   (10 ms per potongan), jadi handler klik hanya mengubah keadaan dan menjadwalkan kerja: INP tetap rendah. */
import * as M from "./model.js";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const fmt = n => Math.round(n).toLocaleString("id-ID"), fmt1 = n => n.toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const jj = v => { const a = Math.abs(v), t = a >= 1e6 ? fmt1(a / 1e6) + " juta" : a >= 1e3 ? fmt(a / 1e3) + " ribu" : fmt(a); return (v < 0 ? "-" : "") + t; };
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"], BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const IK = {main: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>', jeda: '<svg viewBox="0 0 24 24"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
  api: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z"/></svg>',
  sek: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-5 9 5-9 5zM7 11.5V16c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5"/></svg>'};

async function ambil(urls) { for (const u of urls) { try { const r = await fetch(u); if (r.ok) return await r.json(); } catch { /* coba berikutnya */ } } return null; }
async function muatData() {
  const [angin, pltu, prak, kluster, pend] = await Promise.all([
    ambil(["/udara/data/angin.json"]), ambil(["/udara/data/pltu.json"]), ambil(["/udara/data/prakiraan.json"]),
    ambil(["/data/kluster.json"]), ambil(["/data/penduduk.json"])]);
  return {angin, pltu, prak, kluster, pend};
}
const kerja = (sim, prog, token) => new Promise(res => { const f = () => { if (token.batal) return res(null); const ok = sim.maju(10); prog(sim.progres()); ok ? res(sim.hasil()) : requestAnimationFrame(f); }; requestAnimationFrame(f); });

function pasang(el) {
  if (!el) return null; if (el._su) return el._su;
  const S = {el, jam: 0, main: false, tampil: "3d", sk: "dasar", komp: null, cache: new Map(), token: {}, kotor: true, view: {}, selesai: false, perlSek: null};
  el._su = S; el.classList.add("su");
  el.innerHTML = `<div class="su-kartu"><div class="su-muat" id="suMuatAwal">Memuat data angin dan sumber...</div></div>`;
  muatData().then(d => mulai(S, d)).catch(e => { console.error("SimUdara:", e); el.innerHTML = `<div class="su-kartu su-kosong">Simulasi belum tersedia.</div>`; });
  return S;
}

async function mulai(S, d) {
  const el = S.el;
  if (!d.angin || !d.prak) { el.innerHTML = `<div class="su-kartu su-kosong">Data angin atau prakiraan belum terbit, jadi simulasi belum bisa dijalankan.</div>`; return; }
  S.A = M.kemasAngin(d.angin);
  const dalam = (lon, lat) => lon >= S.A.lon0 && lon <= S.A.lon0 + (S.A.nx - 1) * S.A.dlon && lat >= S.A.lat0 && lat <= S.A.lat0 + (S.A.ny - 1) * S.A.dlat;
  S.prak = {...d.prak, kota: d.prak.kota.filter(k => dalam(k.lon, k.lat) && k.pm?.length)};
  S.kota = S.prak.kota; S.src = M.buatSumber(d.kluster, d.pltu, S.A); S.jiwa = d.pend ? M.pendudukKota(d.pend, S.kota) : new Float64Array(S.kota.length);
  /* tampilan: kotak yang memuat 10%-90% FRP (menurut bujur dan lintang) + kota di sekitarnya; api terpencil (mis. Papua) tidak melebarkan kamera */
  const fr = S.src.sumber.filter(q => q.jenis === "api" && q.id !== "lain").length ? S.src.sumber.filter(q => q.jenis === "api" && q.id !== "lain") : S.src.sumber;
  /* jendela 22 x 12 derajat yang memuat FRP terbesar (api Papua terpencil tidak melebarkan kamera) */
  let best = -1, w = 0, e = 0, s = 0, n = 0;
  for (let x = S.A.lon0; x <= S.A.lon0 + (S.A.nx - 1) * S.A.dlon - 22 + 1; x += 2) for (let y = S.A.lat0; y <= S.A.lat0 + (S.A.ny - 1) * S.A.dlat - 12 + 1; y += 2) {
    const g = fr.filter(q => q.lon >= x && q.lon <= x + 22 && q.lat >= y && q.lat <= y + 12); const t = g.reduce((m, q) => m + (q.frp || 1), 0);
    if (t > best) { best = t; w = Math.min(...g.map(q => q.lon)); e = Math.max(...g.map(q => q.lon)); s = Math.min(...g.map(q => q.lat)); n = Math.max(...g.map(q => q.lat)); } }
  if (!isFinite(w)) { w = 100; e = 118; s = -8; n = 2; }
  const dekat = S.kota.filter(k => k.lon >= w - 3 && k.lon <= e + 3 && k.lat >= s - 3 && k.lat <= n + 3);
  w = Math.min(w, ...dekat.map(k => k.lon)) - 1.5; e = Math.max(e, ...dekat.map(k => k.lon)) + 1.5; s = Math.min(s, ...dekat.map(k => k.lat)) - 1.5; n = Math.max(n, ...dekat.map(k => k.lat)) + 1.5;
  const kl = (v, a, b) => Math.max(a, Math.min(b, v)); const lx = S.A.lon0 + (S.A.nx - 1) * S.A.dlon, ly = S.A.lat0 + (S.A.ny - 1) * S.A.dlat;
  if (e - w < 8) { const c = (e + w) / 2; w = c - 4; e = c + 4; } if (n - s < 6) { const c = (n + s) / 2; s = c - 3; n = c + 3; }
  S.bbox = [kl(w, S.A.lon0, lx), kl(s, S.A.lat0, ly), kl(e, S.A.lon0, lx), kl(n, S.A.lat0, ly)];
  S.label = S.kota.map((k, i) => i).filter(i => S.kota[i].lon >= S.bbox[0] && S.kota[i].lon <= S.bbox[2] && S.kota[i].lat >= S.bbox[1] && S.kota[i].lat <= S.bbox[3]).sort((a, b) => S.jiwa[b] - S.jiwa[a]).slice(0, 14);
  S.sumberTampil = S.src.sumber.filter(q => q.lon >= S.bbox[0] && q.lon <= S.bbox[2] && q.lat >= S.bbox[1] && q.lat <= S.bbox[3] && (q.jenis === "pltu" || q.id !== "lain"));
  kerangka(S);
  S.token = {}; await hitungDasar(S);
}

function kerangka(S) {
  S.el.innerHTML = `
  <section class="su-kartu" id="suUtama"><div class="su-hd"><h3>Asap 72 jam ke depan</h3><span class="su-pil">${IK.api}Simulasi model</span></div>
    <div class="su-seg" id="suTampil" role="group" aria-label="Tampilan"><button type="button" data-t="3d" aria-pressed="true">3D</button><button type="button" data-t="peta" aria-pressed="false">Peta</button></div>
    <div class="su-tahap"><div id="suV3"></div><div id="suV2" hidden></div>
      <div class="su-leg">${M.KAT.map(k => `<span><i style="--c:${k.w}"></i>${k.n}</span>`).join("")}</div>
      <div class="su-muat" id="suMuat"><div id="suMuatTeks">Menghitung...<i><b id="suBar"></b></i></div></div></div>
    <div class="su-waktu"><button type="button" class="su-main" id="suMain" aria-label="Putar">${IK.main}</button><input type="range" id="suJam" min="0" max="72" step="0.25" value="0" aria-label="Jam ke depan"><output id="suLabel" for="suJam"></output></div>
  </section>
  <section class="su-kartu"><div class="su-hd"><h3>Skenario</h3></div>
    <div class="su-seg baris" id="suSkn" role="group" aria-label="Skenario">${M.SKENARIO.map(k => `<button type="button" data-s="${k.id}" aria-pressed="${k.id === "dasar"}">${k.nama}</button>`).join("")}</div>
    <div class="su-kontrol" id="suKompBar" hidden><select class="su-pilih" id="suKomp" aria-label="Kompleks api"></select></div>
    <p class="su-kal" id="suRingkas" style="margin-top:12px"></p><div id="suTabel"></div></section>
  <section class="su-kartu"><div class="su-hd"><h3>Perlakuan paling berdampak</h3></div><ul class="su-lis" id="suPerl"></ul></section>
  <section class="su-kartu"><div class="su-hd"><h3>Batas model</h3></div><ul class="su-batas">${M.BATAS.map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>`;
  const q = s => S.el.querySelector(s);
  /* handler hanya mengubah keadaan; kerja berat dijadwalkan */
  q("#suTampil").addEventListener("click", ev => { const b = ev.target.closest("button"); if (b) requestAnimationFrame(() => aturTampil(S, b.dataset.t)); });
  q("#suSkn").addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; S.sk = b.dataset.s; S.perlSek = null; segarSkn(S); requestAnimationFrame(() => jalankanSkn(S)); });
  q("#suKomp").addEventListener("change", ev => { S.komp = ev.target.value; requestAnimationFrame(() => jalankanSkn(S)); });
  q("#suMain").addEventListener("click", () => { S.main = !S.main; segarMain(S); if (S.main && S.jam >= 72) S.jam = 0; S.kotor = true; S.t0 = 0; });
  q("#suJam").addEventListener("input", ev => { S.jam = +ev.target.value; S.kotor = true; });
  q("#suPerl").addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; const it = S.urut[+b.dataset.i];
    if (it.jenis === "kompleks") { S.sk = "kompleks"; S.komp = it.id; S.perlSek = null; segarSkn(S); requestAnimationFrame(() => jalankanSkn(S)); }
    else { S.perlSek = it; segarSkn(S); ringkas(S); tandaiPerl(S); } });
  S.lukis = () => lukis(S); requestAnimationFrame(S.lukis);
}
const segarMain = S => { const b = S.el.querySelector("#suMain"); b.innerHTML = S.main ? IK.jeda : IK.main; b.setAttribute("aria-label", S.main ? "Jeda" : "Putar"); };
function segarSkn(S) {
  S.el.querySelectorAll("#suSkn button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.s === S.sk && !S.perlSek)));
  S.el.querySelector("#suKompBar").hidden = S.sk !== "kompleks";
}
function muat(S, teks, p) { const m = S.el.querySelector("#suMuat"); if (!m) return; m.hidden = p == null; if (p != null) { S.el.querySelector("#suMuatTeks").firstChild.textContent = p < 0 ? teks : teks + " " + Math.round(p * 100) + "%"; S.el.querySelector("#suBar").style.width = p < 0 ? "100%" : p * 100 + "%"; } }

async function hitungDasar(S) {
  S.dasar = await kerja(M.buatSim(S.A, S.src, S.kota, {}), p => muat(S, "Menghitung asap dasar", p), S.token);
  if (!S.dasar) return;
  S.cal = M.kalibrasi(S.dasar, S.prak); S.K = S.cal.K; console.info("SimUdara kalibrasi", S.cal);
  S.pmDasar = S.kota.map((_, i) => M.pmKota(S.prak, S.dasar, S.dasar, S.K, i, S.A));
  S.urut = M.urutPerlakuan(S.A, S.prak, S.dasar, S.K, S.jiwa, S.pmDasar);
  const kompl = S.urut.filter(x => x.jenis === "kompleks").slice(0, 15); S.daftarKomp = kompl; S.urut = S.urut.slice(0, 8); S.komp = kompl[0]?.id || null;
  S.el.querySelector("#suKomp").innerHTML = kompl.map(x => `<option value="${esc(x.id)}">${esc(x.nama)} (${esc(x.id)})</option>`).join("");
  S.cache.set(M.kunciSkn({}), {hasil: S.dasar, pm: S.pmDasar});
  S.aktif = S.dasar; S.pmAkt = S.pmDasar; S.sknAkt = {}; S.selesai = true; muat(S, "", null);
  perlakuan(S); segarSkn(S); ringkas(S); await aturTampil(S, S.tampil); S.kotor = true;
}
function sknObj(S) {
  switch (S.sk) { case "api50": return {fApi: .5}; case "balik": return {anginPutar: Math.PI}; case "lemah": return {anginKali: .5}; case "pltu": return {fPltu: 0};
    case "kompleks": return S.komp ? {f: {[S.komp]: 0}} : {}; default: return {}; }
}
async function jalankanSkn(S) {
  if (!S.selesai) return; S.token.batal = true; const tk = S.token = {}; const skn = sknObj(S), kunci = M.kunciSkn(skn); let r = S.cache.get(kunci);
  if (!r) { const h = await kerja(M.buatSim(S.A, S.src, S.kota, skn), p => muat(S, "Menghitung skenario", p), tk); if (!h) return;
    r = {hasil: h, pm: S.kota.map((_, i) => M.pmKota(S.prak, S.dasar, h, S.K, i, S.A))}; if (S.cache.size > 4) S.cache.delete([...S.cache.keys()].find(k => k !== M.kunciSkn({}))); S.cache.set(kunci, r); }
  S.aktif = r.hasil; S.pmAkt = r.pm; S.sknAkt = skn; S.sknBaru = true; muat(S, "", null); ringkas(S); tandaiPerl(S); S.kotor = true;
}
const faktorSumber = S => q => q.jenis === "pltu" ? (S.sknAkt?.fPltu ?? 1) : (S.sknAkt?.fApi ?? 1) * (S.sknAkt?.f?.[q.id] ?? 1);

function ringkas(S) {
  const el = S.el, kal = el.querySelector("#suRingkas"), tb = el.querySelector("#suTabel"), tl = (k, x) => k.nama + x;
  const b = M.bandingKota(S.prak, S.jiwa, S.pmDasar, S.pmAkt);
  if (S.perlSek) { const it = S.perlSek; kal.innerHTML = `Libur sekolah di <b>${esc(it.nama)}</b> menghindari sekitar <b>${jj(it.jj)} jiwa-jam</b> anak dalam 72 jam.`;
    tb.innerHTML = ""; return; }
  if (S.sk === "dasar") { const top = b.filter(x => x.jjDasar > 0).sort((a, c) => c.jjDasar - a.jjDasar).slice(0, 8), tot = b.reduce((s, x) => s + x.jjDasar, 0);
    kal.innerHTML = tot ? `Dalam 72 jam ke depan ada sekitar <b>${jj(tot)} jiwa-jam</b> di atas ambang tidak sehat.` : `Tidak ada kota di atas ambang tidak sehat dalam 72 jam.`;
    tb.innerHTML = top.length ? tabel(["Kota", "PM2,5 puncak", "Jiwa-jam"], top.map(x => [esc(x.nama), kat(x.puncakDasar), jj(x.jjDasar)])) : ""; return; }
  const tot = b.reduce((s, x) => s + x.hindar, 0), tot0 = b.reduce((s, x) => s + x.jjDasar, 0), p = tot0 ? Math.abs(tot) / tot0 * 100 : 0;
  const nama = S.sk === "kompleks" ? `Padamkan ${S.daftarKomp?.find(x => x.id === S.komp)?.nama || "kompleks"}` : M.SKENARIO.find(x => x.id === S.sk).nama;
  kal.innerHTML = Math.abs(tot) < 1 ? `${esc(nama)} hampir tidak mengubah paparan kota dalam 72 jam.` : `${esc(nama)} ${tot > 0 ? "mengurangi" : "menambah"} paparan sekitar <b>${jj(Math.abs(tot))} jiwa-jam</b> (${fmt(p)}%) dibanding dasar.`;
  const top = b.filter(x => Math.abs(x.hindar) >= 1).sort((a, c) => Math.abs(c.hindar) - Math.abs(a.hindar)).slice(0, 8);
  tb.innerHTML = top.length ? tabel(["Kota", "Dasar", "Skenario", "Selisih jiwa-jam"], top.map(x => [esc(x.nama), kat(x.puncakDasar), kat(x.puncakSkn), jj(-x.hindar)])) : "";
}
const kat = v => { const k = M.KAT[M.kategori(v)]; return `<span class="kt" style="--c:${k.w};--f:${k.fg}">${fmt(v)}</span>`; };
const tabel = (kep, baris) => `<table class="su-tb"><thead><tr>${kep.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
function perlakuan(S) {
  S.el.querySelector("#suPerl").innerHTML = S.urut.length ? S.urut.map((x, i) => `<li><button type="button" data-i="${i}" aria-pressed="false"><span class="no">${i + 1}</span><span>${x.jenis === "kompleks" ? IK.api : IK.sek}${x.jenis === "kompleks" ? "Padamkan" : "Liburkan sekolah di"} ${esc(x.nama)}</span><span class="n">${jj(x.jj)} jiwa-jam</span></button></li>`).join("")
    : `<li class="su-kosong">Tidak ada perlakuan yang menghindari paparan di atas ambang.</li>`;
}
function tandaiPerl(S) { S.el.querySelectorAll("#suPerl button").forEach(b => { const it = S.urut[+b.dataset.i]; b.setAttribute("aria-pressed", String(it === S.perlSek || (!S.perlSek && S.sk === "kompleks" && it.jenis === "kompleks" && it.id === S.komp))); }); }

async function aturTampil(S, t) {
  S.tampil = t; S.el.querySelectorAll("#suTampil button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === t)));
  const v3 = S.el.querySelector("#suV3"), v2 = S.el.querySelector("#suV2"); v3.hidden = t !== "3d"; v2.hidden = t !== "peta";
  if (!S.selesai) return;
  const ctx = {bbox: S.bbox, kisi: S.dasar.kisi, sumber: S.sumberTampil, kota: S.label.map(i => S.kota[i])};
  try {
    if ((t === "3d" && !S.view.d3) || (t === "peta" && !S.view.d2)) muat(S, "Memuat tampilan", -1);
    if (t === "3d" && !S.view.d3) { const T = await import("./tiga.js"); if (!T.adaWebGL()) throw new Error("WebGL tidak ada"); S.view.d3 = await T.buat(v3, ctx); }
    if (t === "peta" && !S.view.d2) { if (typeof maplibregl === "undefined") throw new Error("MapLibre tidak dimuat"); const P = await import("./peta2d.js"); S.view.d2 = await P.buat(v2, ctx); }
  } catch (e) { console.warn("SimUdara tampilan:", e.message); if (t === "3d") { v3.hidden = true; return aturTampil(S, "peta"); } v2.hidden = true; v2.innerHTML = ""; }
  muat(S, "", null); S.sknBaru = true; S.kotor = true; requestAnimationFrame(() => { (S.view[t === "3d" ? "d3" : "d2"])?.ukuran?.(); S.kotor = true; });
}

const jamWIB = S => h => M.jamWIB(S.A, h);
function labelWaktu(S, h) { const w = new Date(S.A.t0 + h * 36e5 + 7 * 36e5); return `${HARI[w.getUTCDay()]} ${w.getUTCDate()} ${BLN[w.getUTCMonth()]}, ${String(w.getUTCHours()).padStart(2, "0")}.${String(w.getUTCMinutes()).padStart(2, "0")} WIB (jam ke-${Math.floor(h)})`; }
function lukis(S) {
  if (!S.el.isConnected) return; /* berhenti bila tab dibuang dari DOM */
  const now = performance.now(); if (S.main) { const dt = S.t0 ? (now - S.t0) / 1000 : 0; S.t0 = now; S.jam += dt * 2.2; if (S.jam >= 72) { S.jam = 72; S.main = false; segarMain(S); } S.kotor = true; el_jam(S); }
  if (S.kotor && S.selesai) {
    S.kotor = false; const h = S.jam, b0 = Math.min(Math.floor(h), 72), b1 = Math.min(b0 + 1, 72), f = h - b0, vw = S.view[S.tampil === "3d" ? "d3" : "d2"];
    S.el.querySelector("#suLabel").textContent = labelWaktu(S, h);
    if (vw) { const nilai = S.label.map(i => { const p = S.pmAkt[i], v = p[b0] * (1 - f) + p[b1] * f; return {v, kat: M.KAT[M.kategori(v)]}; });
      vw.ubah({jam: h, hasil: S.aktif, Kal: S.K, nilaiKota: nilai, faktorSumber: faktorSumber(S), jamWIB: jamWIB(S), sknBaru: S.sknBaru}); S.sknBaru = false; }
  }
  requestAnimationFrame(S.lukis);
}
function el_jam(S) { const r = S.el.querySelector("#suJam"); if (r) r.value = S.jam; }

/* teks untuk halaman Metode */
const batasHTML = () => `<ul class="su-batas">${M.BATAS.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`;
window.SimUdara = {pasang, BATAS: M.BATAS, ASUMSI: M.ASUMSI, batasHTML};
export {pasang};
