/* sim.js — tab Simulasi udara: memasang window.SimUdara = {pasang(el), BATAS, ASUMSI}. Logika di model.js (diuji node --test tests/udara/),
   tampilan 3D di tiga.js, peta 2D di peta2d.js. Kerja berat (simulasi 72 jam + 24 jam spin-up) berjalan bertahap di requestAnimationFrame
   (10 ms per potongan), jadi handler klik hanya mengubah keadaan dan menjadwalkan kerja: INP tetap rendah. */
import * as M from "./model.js";
import * as T from "./tanggap.js";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const fmt = n => Math.round(n).toLocaleString("id-ID"), fmt1 = n => n.toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const jj = v => { const a = Math.abs(v), t = a >= 1e9 ? fmt1(a / 1e9) + " miliar" : a >= 1e6 ? fmt1(a / 1e6) + " juta" : a >= 1e3 ? fmt(a / 1e3) + " ribu" : fmt(a); return (v < 0 ? "-" : "") + t; };
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"], BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const IK = {main: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>', jeda: '<svg viewBox="0 0 24 24"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
  api: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z"/></svg>',
  mk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16v4a8 7 0 0 1-16 0zM2 10h2M20 10h2"/></svg>',
  rm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9H3zM9 20v-6h6v6"/></svg>',
  sek: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-5 9 5-9 5zM7 11.5V16c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5"/></svg>'};

async function ambil(urls) { for (const u of urls) { try { const r = await fetch(u); if (r.ok) return await r.json(); } catch { /* coba berikutnya */ } } return null; }
/* kluster.json diurai di Worker (hanya kolom yang dipakai kembali); gagal -> utas utama */
function klusterWorker() { return new Promise(res => { try { const w = new Worker(new URL("kluster.worker.js", import.meta.url), {type: "module"}); w.onmessage = e => { w.terminate(); res(e.data); }; w.onerror = () => { w.terminate(); res(null); }; w.postMessage("/data/kluster.json"); } catch { res(null); } }).then(r => r || ambil(["/data/kluster.json"])); }
async function muatData(opsi = {}) {
  const [angin, pltu, prak, kluster, pend, fas] = await Promise.all([
    ambil(["/udara/data/angin.json"]), ambil(["/udara/data/pltu.json"]), (opsi.prak ? Promise.resolve(opsi.prak) : ambil(["/udara/data/prakiraan.json"])),
    klusterWorker(), ambil(["/data/penduduk.json"]), ambil(["/data/fasilitas.json"])]);
  return {angin, pltu, prak, kluster, pend, fas};
}
const kerja = (sim, prog, token) => new Promise(res => { const f = () => { if (token.batal) return res(null); const ok = sim.maju(10); prog(sim.progres()); ok ? res(sim.hasil()) : requestAnimationFrame(f); }; requestAnimationFrame(f); });

/* generator dikerjakan per potongan rAF (10 ms), seperti kerja() untuk simulasi */
const kerjaGen = (gen, token) => new Promise(res => { const f = () => { if (token.batal) return res(null); const t0 = performance.now(); let r; do r = gen.next(); while (!r.done && performance.now() - t0 < 10); r.done ? res(r.value) : requestAnimationFrame(f); }; requestAnimationFrame(f); });

/* opsi.prak: halaman yang sudah punya prakiraan.json bisa mengopernya agar tidak diunduh ulang */
function pasang(el, opsi = {}) {
  if (!el) return null; if (el._su) return el._su;
  const S = {el, jam: 0, main: false, tampil: "3d", sk: "dasar", komp: null, cache: new Map(), token: {}, kotor: true, view: {}, selesai: false, perlSek: null};
  el._su = S; el.classList.add("su");
  el.innerHTML = `<div class="su-kartu"><div class="su-muat" id="suMuatAwal">Memuat data angin dan sumber...</div></div>`;
  muatData(opsi).then(d => mulai(S, d)).catch(e => { console.error("SimUdara:", e); el.innerHTML = `<div class="su-kartu su-kosong">Simulasi belum tersedia.</div>`; });
  return S;
}

async function mulai(S, d) {
  const el = S.el;
  if (!d.angin || !d.prak) { el.innerHTML = `<div class="su-kartu su-kosong">Data angin atau prakiraan belum terbit, jadi simulasi belum bisa dijalankan.</div>`; return; }
  S.A = M.kemasAngin(d.angin);
  const dalam = (lon, lat) => lon >= S.A.lon0 && lon <= S.A.lon0 + (S.A.nx - 1) * S.A.dlon && lat >= S.A.lat0 && lat <= S.A.lat0 + (S.A.ny - 1) * S.A.dlat;
  S.prak = {...d.prak, kota: d.prak.kota.filter(k => dalam(k.lon, k.lat) && k.pm?.length)};
  S.kota = S.prak.kota; S.src = M.buatSumber(d.kluster, d.pltu, S.A); S.jiwa = d.pend ? M.pendudukKota(d.pend, S.kota) : new Float64Array(S.kota.length);
  S.fk = d.fas ? T.fasilitasKota(d.fas, S.kota) : null; S.galat = d.prak.galat || null; S.koreksi = d.prak.koreksi || null;
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
  S.bboxSeluruh = S.bbox; S.wil = "Seluruh";
  kerangka(S);
  S.token = {}; await hitungDasar(S);
}

const WIL = {Sumatra: [94.5, -6.5, 107, 6], Kalimantan: [108, -4.5, 119.5, 4.5], Jawa: [104.5, -9, 115.5, -5.2], Seluruh: null};
/* wilayah: kotak tampilan, sumber di dalamnya, dan label kota tanpa tumpang tindih (prioritas kategori terburuk 72 jam, lalu penduduk) */
function aturWilayah(S, w) {
  S.wil = w; const b = WIL[w], z = S.bboxSeluruh; S.bbox = b ? [Math.max(z[0] - 20, b[0]), Math.max(S.A.lat0, b[1]), Math.min(z[2] + 20, b[2]), Math.min(S.A.lat0 + (S.A.ny - 1) * S.A.dlat, b[3])] : z;
  const [w0, s0, e0, n0] = S.bbox, W = e0 - w0, H = n0 - s0, dlm = (x, y) => x >= w0 && x <= e0 && y >= s0 && y <= n0;
  const puncak = i => S.pmDasar ? Math.max(...S.pmDasar[i].slice(0, 72)) : 0;
  const kand = S.kota.map((k, i) => i).filter(i => dlm(S.kota[i].lon, S.kota[i].lat)).sort((a, c) => M.kategori(puncak(c)) - M.kategori(puncak(a)) || S.jiwa[c] - S.jiwa[a]);
  S.label = []; for (const i of kand) { const k = S.kota[i]; if (S.label.every(j => Math.abs(S.kota[j].lon - k.lon) / W > .16 || Math.abs(S.kota[j].lat - k.lat) / H > .08)) S.label.push(i); if (S.label.length >= 12) break; }
  S.sumberTampil = S.src.sumber.filter(q => dlm(q.lon, q.lat) && (q.jenis === "pltu" || q.id !== "lain"));
}
function wilayahAwal(S) { const g = S.urut?.find(x => x.jenis === "kompleks"), G = g && S.dasar.grup[g.g]; if (!G) return "Seluruh"; for (const w of ["Sumatra", "Kalimantan", "Jawa"]) { const b = WIL[w]; if (G.lon >= b[0] && G.lon <= b[2] && G.lat >= b[1] && G.lat <= b[3]) return w; } return "Seluruh"; }
function kerangka(S) {
  S.el.innerHTML = `
  <section class="su-kartu" id="suUtama"><div class="su-hd"><h3>Asap 72 jam ke depan</h3><span class="su-pil">${IK.api}Simulasi model, belum dikoreksi ke alat ukur</span></div>
    <div class="su-seg" id="suTampil" role="group" aria-label="Tampilan"><button type="button" data-t="3d" aria-pressed="true">3D</button><button type="button" data-t="peta" aria-pressed="false">Peta</button></div>
    <div class="su-seg" id="suWil" role="group" aria-label="Wilayah" style="margin-top:8px">${Object.keys(WIL).map(w => `<button type="button" data-w="${w}" aria-pressed="false">${w}</button>`).join("")}</div>
    <div class="su-tahap"><div id="suV3"></div><div id="suV2" hidden></div>
      <div class="su-leg">${M.KAT.map((k, c) => `<span><i style="--c:${k.w}"></i>${esc(M.labelKat(c))}</span>`).join("")}</div>
      <div class="su-muat" id="suMuat"><div id="suMuatTeks">Menghitung...<i><b id="suBar"></b></i></div></div></div>
    <div class="su-waktu"><button type="button" class="su-main" id="suMain" aria-label="Putar">${IK.main}</button><input type="range" id="suJam" min="0" max="72" step="0.25" value="0" aria-label="Jam ke depan"><output id="suLabel" for="suJam"></output></div>
  </section>
  <section class="su-kartu"><div class="su-hd"><h3>Skenario</h3></div>
    <div class="su-seg baris" id="suSkn" role="group" aria-label="Skenario">${M.SKENARIO.map(k => `<button type="button" data-s="${k.id}" aria-pressed="${k.id === "dasar"}">${k.nama}</button>`).join("")}</div>
    <div class="su-kontrol" id="suKompBar" hidden><select class="su-pilih" id="suKomp" aria-label="Cluster"></select></div>
    <p class="su-kal" id="suRingkas" style="margin-top:12px"></p><div id="suTabel"></div></section>
  <section class="su-kartu"><div class="su-hd"><h3>Perlakuan paling berdampak</h3><span class="su-pil">Hasil model, belum divalidasi</span></div><p class="su-kal" id="suPerlKal"></p><ul class="su-lis" id="suPerl"></ul></section>
  <section class="su-kartu"><div class="su-hd"><h3>Pita ketidakpastian PM2,5</h3><span class="su-pil" id="suEnsPil">Ensemble</span></div>
    <div class="su-kontrol"><select class="su-pilih" id="suEnsKota" aria-label="Kota" hidden></select></div><div id="suEns"><p class="su-kal">Menunggu simulasi dasar...</p></div></section>
  <section class="su-kartu"><div class="su-hd"><h3>Beban fasilitas kesehatan</h3></div><div id="suRS"></div></section>
  <section class="su-kartu"><div class="su-hd"><h3>Kecocokan skala dengan CAMS</h3></div><div id="suVal"></div></section>
  <section class="su-kartu"><div class="su-hd"><h3>Batas model</h3></div><ul class="su-batas">${M.BATAS.map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>`;
  const q = s => S.el.querySelector(s);
  /* handler hanya mengubah keadaan; kerja berat dijadwalkan */
  q("#suTampil").addEventListener("click", ev => { const b = ev.target.closest("button"); if (b) requestAnimationFrame(() => aturTampil(S, b.dataset.t)); });
  q("#suWil").addEventListener("click", ev => { const b = ev.target.closest("button"); if (b && b.dataset.w !== S.wil) requestAnimationFrame(() => gantiWilayah(S, b.dataset.w)); });
  q("#suSkn").addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; S.sk = b.dataset.s; S.perlSek = null; segarSkn(S); requestAnimationFrame(() => jalankanSkn(S)); });
  q("#suKomp").addEventListener("change", ev => { S.komp = ev.target.value; requestAnimationFrame(() => jalankanSkn(S)); });
  q("#suMain").addEventListener("click", () => { S.main = !S.main; segarMain(S); if (S.main && S.jam >= 72) S.jam = 0; S.kotor = true; S.t0 = 0; });
  q("#suJam").addEventListener("input", ev => { S.jam = +ev.target.value; S.kotor = true; });
  q("#suEnsKota").addEventListener("change", ev => requestAnimationFrame(() => gambarEns(S, +ev.target.value)));
  q("#suPerl").addEventListener("click", ev => { const b = ev.target.closest("button"); if (!b) return; const it = S.urut[+b.dataset.i];
    if (it.jenis === "pltu") { S.sk = "pltu"; S.perlSek = null; segarSkn(S); requestAnimationFrame(() => jalankanSkn(S)); }
    else if (it.jenis === "kompleks") { S.sk = "kompleks"; S.komp = it.id; S.perlSek = null; segarSkn(S); requestAnimationFrame(() => jalankanSkn(S)); }
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
  muat(S, "Menyusun perlakuan", -1); const urutMentah = await kerjaGen(M.urutGen(S.A, S.prak, S.dasar, S.K, S.jiwa, S.pmDasar), S.token); if (!urutMentah) return;
  const kompl = urutMentah.filter(x => x.jenis === "kompleks").slice(0, 15); S.daftarKomp = kompl; S.komp = kompl[0]?.id || null;
  const semua = T.peringkat(S.A, S.prak, S.dasar, S.K, S.jiwa, S.pmDasar, urutMentah, S.fk), pilih = semua.slice(0, 8);
  for (const j of ["kompleks", "pltu", "masker", "ruang", "sekolah"]) { const x = semua.find(y => y.jenis === j); if (x && !pilih.includes(x)) pilih.push(x); } /* tiap jenis tampil dengan wakil terbaiknya */
  S.urut = pilih.sort((a, c) => c.oh - a.oh);
  S.el.querySelector("#suKomp").innerHTML = kompl.map(x => `<option value="${esc(x.id)}">${esc(x.nama)}</option>`).join("");
  S.cache.set(M.kunciSkn({}), {hasil: S.dasar, pm: S.pmDasar});
  S.aktif = S.dasar; S.pmAkt = S.pmDasar; S.sknAkt = {}; S.selesai = true; muat(S, "", null);
  perlakuan(S); cekData(S); bebanRS(S); requestAnimationFrame(() => jalankanEns(S)); segarSkn(S); ringkas(S); aturWilayah(S, wilayahAwal(S)); S.el.querySelectorAll("#suWil button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.w === S.wil))); await aturTampil(S, S.tampil); S.kotor = true;
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
  if (S.perlSek) { const it = S.perlSek; kal.innerHTML = `${esc(it.nama)} menghindari sekitar <b>${jj(it.oh)} orang-hari</b> Tidak sehat${it.hi != null ? ` (rentang ${jj(it.lo)} sampai ${jj(it.hi)})` : ""} dalam 72 jam, biaya sekitar ${T.rupiah(it.biaya)}.`;
    tb.innerHTML = ""; return; }
  if (S.sk === "dasar") { const top = b.filter(x => x.jjDasar > 0).sort((a, c) => c.jjDasar - a.jjDasar).slice(0, 8), tot = b.reduce((s, x) => s + x.jjDasar, 0);
    kal.innerHTML = tot ? `Dalam 72 jam ke depan ada sekitar <b>${jj(tot)} jiwa-jam</b> di atas ambang tidak sehat.` : `Tidak ada kota di atas ambang tidak sehat dalam 72 jam.`;
    tb.innerHTML = top.length ? tabel(["Kota", "PM2,5 puncak <span class=\"su-sat\">(µg/m³)</span>", "Jiwa-jam"], top.map(x => [esc(x.nama), kat(x.puncakDasar), jj(x.jjDasar)])) : ""; return; }
  const tot = b.reduce((s, x) => s + x.hindar, 0), tot0 = b.reduce((s, x) => s + x.jjDasar, 0), p = tot0 ? Math.abs(tot) / tot0 * 100 : 0;
  const nama = S.sk === "kompleks" ? `Padamkan ${S.daftarKomp?.find(x => x.id === S.komp)?.nama || "cluster"}` : M.SKENARIO.find(x => x.id === S.sk).nama;
  kal.innerHTML = Math.abs(tot) < 1 ? `${esc(nama)} hampir tidak mengubah paparan kota dalam 72 jam.` : `${esc(nama)} ${tot > 0 ? "mengurangi" : "menambah"} paparan sekitar <b>${jj(Math.abs(tot))} jiwa-jam</b> (${fmt(p)}%) dibanding dasar.`;
  const top = b.filter(x => Math.abs(x.hindar) >= 1).sort((a, c) => Math.abs(c.hindar) - Math.abs(a.hindar)).slice(0, 8);
  tb.innerHTML = top.length ? tabel(["Kota", "Dasar <span class=\"su-sat\">(µg/m³)</span>", "Skenario <span class=\"su-sat\">(µg/m³)</span>", "Selisih jiwa-jam"], top.map(x => [esc(x.nama), kat(x.puncakDasar), kat(x.puncakSkn), jj(-x.hindar)])) : "";
}
const kat = v => { const k = M.KAT[M.kategori(v)]; return `<span class="kt" title="${esc(M.labelKat(M.kategori(v)))}" style="--c:${k.w};--f:${k.fg}">${fmt(v)}</span>`; };
const tabel = (kep, baris) => `<table class="su-tb"><thead><tr>${kep.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const IKJ = {kompleks: IK.api, pltu: IK.api, sekolah: IK.sek, masker: IK.mk, ruang: IK.rm};
function perlakuan(S) {
  const st = S.stab, ket = st?.stabil === true ? `Diperingkat menurut orang-hari Tidak sehat yang terhindar dalam 72 jam (urutan stabil di ensemble, korelasi ${fmt1(st.rho)}); satuan biaya memakai asumsi.`
    : st?.stabil === false ? `Urutan tidak stabil di ensemble (korelasi ${fmt1(st.rho)}): daftar ini kandidat dengan perkiraan dampaknya, bukan peringkat; satuan biaya memakai asumsi.`
    : "Kandidat dengan orang-hari Tidak sehat yang terhindar dalam 72 jam; urutan baru ditampilkan setelah kestabilannya diuji di ensemble.";
  S.el.querySelector("#suPerlKal").textContent = ket;
  S.el.querySelector("#suPerl").innerHTML = S.urut.length ? S.urut.map((x, i) => `<li><button type="button" data-i="${i}" aria-pressed="false"><span class="no">${st?.stabil === true ? i + 1 : "·"}</span><span>${IKJ[x.jenis]}${esc(x.nama)}</span><span class="n">sekitar ${jj(x.oh)} orang-hari${x.hi != null && x.hi > x.lo ? ` (${jj(x.lo)} sampai ${jj(x.hi)})` : ""}<small>${T.rupiah(x.biaya)}${x.perOh ? `, ${T.rupiah(x.perOh)} per orang-hari` : ""}${x.ispa >= 1 ? `, ISPA ${jj(x.ispa)} kasus terhindar` : ""}</small></span></button></li>`).join("")
    : `<li class="su-kosong">Tidak ada perlakuan yang menghindari paparan di atas ambang.</li>`;
}
function tandaiPerl(S) { S.el.querySelectorAll("#suPerl button").forEach(b => { const it = S.urut[+b.dataset.i]; b.setAttribute("aria-pressed", String(it === S.perlSek || (!S.perlSek && ((S.sk === "kompleks" && it.jenis === "kompleks" && it.id === S.komp) || (S.sk === "pltu" && it.jenis === "pltu"))))); }); }

/* ---------- kecocokan skala dengan atribusi CAMS ---------- */
function cekData(S) {
  const v = S.kec = M.kecocokanSkala(S.dasar, S.prak), el = S.el.querySelector("#suVal"), st = S.galat?.stasiun, L = [];
  let k1 = "Belum cukup kota dengan porsi asap untuk menilai kecocokan skala.";
  if (v.ok) { const t = v.bias > 1.15 ? ", cenderung terlalu pekat" : v.bias < .87 ? ", cenderung terlalu tipis" : "";
    k1 = `Di ${fmt(v.n)} kota dengan porsi asap, asap model menyimpang rata-rata ${fmt1(v.galat)} kali dari atribusi CAMS${t}; ${fmt(v.luar2 * 100)}% kota di luar faktor 2.`; }
  L.push(`Faktor skala K = ${fmt1(S.K)} (pengali terpisah pada asap api di kota)${S.K > 3 || S.K < 1 / 3 ? ": <b>K di luar 1/3 sampai 3, emisi model salah skala secara struktural, jadi awan 3D dan angka absolut tidak bisa dipercaya</b>" : ""}.`);
  L.push("Ini bukan validasi: K dan targetnya sama-sama dari atribusi pipeline (sebagian melingkar), K dihitung tanpa kota yang dinilai.");
  L.push(st ? `Stasiun ukur: ${fmt(st.n)} hari-stasiun, bias ${fmt1(st.bias)} µg/m³, RMSE ${fmt1(st.rmse)} µg/m³, kategori tepat ${fmt(st.tepat_kategori * 100)}% (${esc(st.periode)}).`
    : "Belum ada stasiun ukur PM2,5 di pipeline (butuh WAQI_TOKEN), jadi model belum diuji terhadap alat ukur di tanah.");
  el.innerHTML = `<p class="su-kal">${k1}</p><ul class="su-batas">${L.map(t => `<li>${t}</li>`).join("")}</ul>`;
}

/* ---------- beban fasilitas kesehatan ---------- */
function bebanRS(S) {
  const el = S.el.querySelector("#suRS"), b = T.bebanRS(S.kota, S.jiwa, S.pmDasar, S.fk), tot = b.reduce((s, x) => s + x.ispa, 0), lo = b.reduce((s, x) => s + x.lo, 0), hi = b.reduce((s, x) => s + x.hi, 0);
  if (!b.length) { el.innerHTML = `<p class="su-kal">Tidak ada kota di atas ambang Tidak sehat, jadi tidak ada ISPA tambahan dalam 72 jam.</p>`; return; }
  el.innerHTML = `<p class="su-kal">Sekitar <b>${jj(tot)} kasus ISPA tambahan</b> dalam 72 jam (rentang ${jj(lo)} sampai ${jj(hi)}) di kota yang melewati ambang.</p>` +
    tabel(["Kota", "ISPA tambahan", "Faskes", "Kasus per faskes"], b.slice(0, 6).map(x => [esc(x.nama), jj(x.ispa), S.fk && x.faskes ? fmt(x.faskes) : "-", x.perFaskes == null ? "-" : fmt1(x.perFaskes)]));
}

/* ---------- ensemble: pita p10/p50/p90 ---------- */
/* ensemble di Worker: simulasi penuh tiap anggota + peringkat perlakuan dihitung ulang di anggota itu (kestabilan urutan) */
function jalankanEns(S) {
  if (S.ensJalan || !S.selesai) return; S.ensJalan = true; const pil = S.el.querySelector("#suEnsPil"), kunci = S.urut.map(x => x.jenis + "|" + x.id);
  const gagal = () => { pil.textContent = "Ensemble tidak tersedia"; S.el.querySelector("#suEns").innerHTML = `<p class="su-kal">Ensemble belum bisa dijalankan di peramban ini.</p>`; };
  let w; try { w = new Worker(new URL("ensemble.worker.js", import.meta.url), {type: "module"}); } catch { return gagal(); }
  S.ensW = w; w.onerror = () => { w.terminate(); gagal(); };
  w.onmessage = e => { const d = e.data;
    if (d.t === "progres") pil.textContent = `Anggota ${d.m} dari ${d.n}`;
    else if (d.t === "galat") { console.warn("SimUdara ensemble:", d.pesan); w.terminate(); gagal(); }
    else if (d.t === "selesai") { w.terminate(); S.pita = d.seri.map(M.pitaDariSeri); S.stab = T.stabilitas(S.urut.map(x => x.oh), d.ohAng); pil.textContent = `Ensemble ${S.pita[0].n} anggota`; renderEns(S); perlakuan(S); tandaiPerl(S); } };
  w.postMessage({n: M.ENS.n, sdApi: M.sdApiDariGalat(S.kec?.ok ? S.kec.galat : 1.4), A: S.A, src: S.src, kota: S.kota, prak: S.prak, dasar: S.dasar, K: S.K, jiwa: S.jiwa, pmDasar: S.pmDasar, fk: S.fk, kunci});
}
function renderEns(S) {
  /* kota yang porsi asapnya ditolak pipeline di semua hari tidak ikut: PM-nya tidak berubah antar anggota, jadi pitanya palsu-sempit */
  const P = S.pita, tak = S.kota.map((_, i) => [0, 24, 48].every(b => M.takTerpercaya(S.prak, i, S.A, b))), idx = S.kota.map((_, i) => i).filter(i => P[i].puncak.p90 > 0 && !tak[i]).sort((a, c) => P[c].puncak.p90 - P[a].puncak.p90), top = idx.slice(0, 12), sel = S.el.querySelector("#suEnsKota");
  if (!top.length) { S.el.querySelector("#suEns").innerHTML = `<p class="su-kal">Tidak ada kota dengan PM2,5 terhitung.</p>`; return; }
  sel.innerHTML = top.map(i => `<option value="${i}">${esc(S.kota[i].nama)}</option>`).join(""); sel.hidden = false;
  const nTak = tak.filter((t, i) => t && P[i].puncak.p90 > M.KONF.ambang).length;
  S.el.querySelector("#suEns").innerHTML = `<p class="su-kal" id="suEnsKal"></p><div class="su-pita" id="suEnsGrf"></div>` +
    tabel(["Kota", "Puncak p10 <span class=\"su-sat\">(µg/m³)</span>", "p50", "p90", "Peluang Tidak sehat"], idx.slice(0, 8).map(i => [esc(S.kota[i].nama), kat(P[i].puncak.p10), kat(P[i].puncak.p50), kat(P[i].puncak.p90), fmt(P[i].peluang * 100) + "%"])) + (nTak ? `<p class="su-sat" style="margin:8px 0 0;color:var(--su-ink2)">${fmt(nTak)} kota lain tidak ditampilkan: pipeline menolak porsi asapnya karena model melebihi CAMS, jadi tidak ada pita yang jujur.</p>` : "");
  gambarEns(S, top[0]);
}
function gambarEns(S, i) {
  const P = S.pita?.[i]; if (!P) return; const W = 600, H = 190, l = 40, r = 10, t = 12, b = 26, mx = Math.max(M.KONF.ambang * 1.25, ...P.p90) * 1.06, x = h => l + (W - l - r) * h / 72, y = v => H - b - (H - t - b) * v / mx;
  const pts = a => Array.from(a, (v, h) => `${x(h).toFixed(1)},${y(v).toFixed(1)}`), band = [...pts(P.p90), ...pts(P.p10).reverse()].join(" ");
  const tik = [0, 24, 48, 72].map(h => `<text x="${x(h)}" y="${H - 8}" text-anchor="${h === 72 ? "end" : h === 0 ? "start" : "middle"}">${h === 0 ? "sekarang" : "+" + h + " jam"}</text>`).join("");
  S.el.querySelector("#suEnsGrf").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pita PM2,5 p10 sampai p90 untuk ${esc(S.kota[i].nama)}"><polygon points="${band}" fill="currentColor" opacity=".16"/><polyline points="${pts(P.p50).join(" ")}" fill="none" stroke="currentColor" stroke-width="2"/>
    <line x1="${l}" x2="${W - r}" y1="${y(M.KONF.ambang)}" y2="${y(M.KONF.ambang)}" stroke="#e8743b" stroke-dasharray="5 4"/><text x="${W - r}" y="${y(M.KONF.ambang) - 4}" text-anchor="end" fill="#e8743b">ambang 55,5</text><text x="${l - 4}" y="${t + 8}" text-anchor="end">${fmt(mx)}</text>${tik}</svg>`;
  S.el.querySelector("#suEnsKal").innerHTML = `${esc(S.kota[i].nama)}: puncak 72 jam <b>${fmt(P.puncak.p50)} µg/m³</b> (p10 ${fmt(P.puncak.p10)} sampai p90 ${fmt(P.puncak.p90)}), ${fmt(P.peluang * 100)}% anggota melewati ambang Tidak sehat.`;
}

async function gantiWilayah(S, w) {
  aturWilayah(S, w); S.el.querySelectorAll("#suWil button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.w === w)));
  S.view.d3?.hancur(); S.view.d2?.hancur(); S.view = {}; await aturTampil(S, S.tampil);
}
async function aturTampil(S, t) {
  S.tampil = t; S.el.querySelectorAll("#suTampil button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === t)));
  const v3 = S.el.querySelector("#suV3"), v2 = S.el.querySelector("#suV2"); v3.hidden = t !== "3d"; v2.hidden = t !== "peta";
  if (!S.selesai) return;
  const g0 = S.urut?.find(x => x.jenis === "kompleks"), G0 = g0 && S.dasar.grup[g0.g], ctx = {fokus: G0 && G0.lon >= S.bbox[0] && G0.lon <= S.bbox[2] && G0.lat >= S.bbox[1] && G0.lat <= S.bbox[3] ? {lon: G0.lon, lat: G0.lat} : null, bbox: S.bbox, kisi: S.dasar.kisi, sumber: S.sumberTampil, kota: S.label.map(i => S.kota[i])};
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
    if (vw) { const nilai = S.label.map(i => { const p = S.pmAkt[i], v = p[b0] * (1 - f) + p[b1] * f; return {v, kat: M.KAT[M.kategori(v)], tanda: S.sk !== "dasar" && !S.perlSek && M.takTerpercaya(S.prak, i, S.A, b0)}; });
      vw.ubah({jam: h, hasil: S.aktif, Kal: S.K, nilaiKota: nilai, faktorSumber: faktorSumber(S), jamWIB: jamWIB(S), sknBaru: S.sknBaru}); S.sknBaru = false; }
  }
  requestAnimationFrame(S.lukis);
}
function el_jam(S) { const r = S.el.querySelector("#suJam"); if (r) r.value = S.jam; }

/* teks untuk halaman Metode */
const batasHTML = () => `<ul class="su-batas">${M.BATAS.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`;
window.SimUdara = {pasang, BATAS: M.BATAS, ASUMSI: [...M.ASUMSI, ...T.ASUMSI_TANGGAP], batasHTML};
export {pasang};
