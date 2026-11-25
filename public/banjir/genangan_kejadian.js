/* Genangan radar per kejadian di /banjir (GS-14, KEPUTUSAN-GENANGAN K4). Dimuat dari tab Dampak lewat import() di dampak.js.
   Data: /banjir/data/genangan_kejadian.json dan /banjir/data/genangan_kejadian/<KJ>/v<n>/ (scripts/banjir/genangan_terbit.py).
   Fungsi di atas `pasang` murni (tanpa DOM dan jaringan) supaya bisa diuji di Node: tests/banjir/genangan_kejadian.test.mjs.
   Aturan paket: tak teramati = teks alasan, bukan 0; rentang selalu dua ujung; antarsumber tidak dijumlah; tanpa kata aman, surut, terdampak.
   Fungsi format sengaja serupa public/siklus/genangan.js; berkas itu di balik sesi staf (run_worker_first /siklus/*), jadi tidak bisa diimpor halaman publik. */
import {warnaToken} from "../inti/maplibre.js";
const bil = x => typeof x === "number" && Number.isFinite(x);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const N0 = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 0}), N1 = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 1});

/* di bawah 0,1 ditulis "kurang dari 0,1" (bukan 0); 1 desimal di bawah 100, bulat di atas, "rb" di atas 10.000; bukan angka = null */
export const fmtAngka = n => !bil(n) ? null : n > 0 && n < 0.1 ? "kurang dari 0,1" : Math.abs(n) >= 1e4 ? `${N1.format(n / 1e3)} rb` : Math.abs(n) >= 100 ? N0.format(n) : N1.format(n);
export const fmtPersen = n => !bil(n) ? null : n > 0 && n < 0.1 ? "kurang dari 0,1" : N1.format(n);
export const tglUtc = t => /^\d{4}-\d\d-\d\d/.test(t ?? "") ? new Date(t.slice(0, 10) + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}) : null;
export const rentangTulis = r => r && bil(r.bawah) && bil(r.atas) && r.bawah <= r.atas ? `${fmtAngka(r.bawah)} sampai ${fmtAngka(r.atas)}` : null;

/* alasan satu kab tak sah, dari teks pipeline ke kalimat polos */
export const alasanTakSah = k => /sinyal/i.test(k?.alasan ?? "") ? "sinyal lemah" : k?.status === "tanpa_lintasan" ? "belum ada lintasan" : k?.status === "tanpa_pra" ? "tidak ada citra pembanding sebelum kejadian"
  : bil(k?.cakupan_pct) ? `tidak teramati cukup (cakupan ${fmtPersen(k.cakupan_pct)} persen)` : "tidak teramati cukup";

/* satu baris tabel; kab tak sah tidak membawa angka apa pun */
export function barisKab(k) {
  const sah = k?.sah === true && bil(k?.luas?.baru_ha), r = {kab4: String(k?.kab4 ?? ""), nama: k?.kab ?? String(k?.kab4 ?? ""), sah, lintasan: tglUtc(k?.lintasan)};
  if (!sah) return {...r, baru: null, teramati: null, persenDari: null, pend: null, teks: alasanTakSah(k)};
  const wp = k.penduduk?.worldpop, pend = wp && rentangTulis(wp) ? wp : null;   // rentang terbalik atau satu ujung = tidak ada
  return {...r, baru: k.luas.baru_ha, teramati: bil(k.cakupan_pct) ? k.cakupan_pct : null, persenDari: bil(k.luas.persen_teramati) ? k.luas.persen_teramati : null, pend, kisiKasar: k.kisi_kasar === true, teks: null};
}
/* sah menurut tergenang baru (besar ke kecil), lalu tak sah menurut nama; masukan tidak diubah */
export const urutKab = kab => (Array.isArray(kab) ? kab : []).map(barisKab).sort((a, b) => (b.sah - a.sah) || (a.sah ? b.baru - a.baru : a.nama.localeCompare(b.nama, "id")) || a.kab4.localeCompare(b.kab4));
export const kabAwal = kab => { const u = urutKab(kab); return (u.find(x => x.sah) ?? u[0])?.kab4 ?? null; };

/* kelas lahan dijumlah hanya dari kab sah (satu sumber, WorldCover); kelas kosong tidak keluar */
export function lahanGabung(kab) {
  const per = new Map(); let ada = 0;
  for (const k of Array.isArray(kab) ? kab : []) {
    if (k?.sah !== true || !k.lahan) continue;
    ada++;
    for (const [kode, v] of Object.entries(k.lahan)) if (bil(v?.ha) && v.ha > 0) { const e = per.get(kode) ?? {kode, nama: v.nama ?? `Kelas ${kode}`, ha: 0}; e.ha += v.ha; per.set(kode, e); }
  }
  const jml = [...per.values()].reduce((a, e) => a + e.ha, 0);
  return {kelas: [...per.values()].sort((a, b) => b.ha - a.ha).map(e => ({...e, persen: jml > 0 ? e.ha / jml * 100 : null})), kabAda: ada};
}

const NAMA_BERKAS = /^\d{4}_(sel\.geojson|(radar|asli|swir)_(pra|pasca)\.png)$/;
export const urlAset = (kej, nama) => /^KJ-[A-Z0-9-]+$/.test(kej?.kj ?? "") && Number.isInteger(kej?.versi) && NAMA_BERKAS.test(nama ?? "") ? `/banjir/data/genangan_kejadian/${kej.kj}/v${kej.versi}/${nama}` : null;
export const JENIS_CITRA = [["radar", "Radar"], ["asli", "Warna asli"], ["swir", "Semu SWIR"]];
/* pasangan sebelum dan sesudah satu kab untuk satu jenis, atau {alasan}; salah satu sisi tanpa berkas = alasan */
export function citraKab(kej, k, jenis) {
  const pra = k?.citra?.[`${jenis}_pra`], pas = k?.citra?.[`${jenis}_pasca`], a = urlAset(kej, pra?.berkas), b = urlAset(kej, pas?.berkas);
  if (a && b) return {sebelum: {src: a, tgl: tglUtc(pra.tanggal) ?? "tanggal tidak tertulis"}, sesudah: {src: b, tgl: tglUtc(pas.tanggal) ?? "tanggal tidak tertulis"}};
  return {alasan: [pra, pas].some(x => /awan/i.test(x?.status ?? "")) ? "tertutup awan" : "belum ada citra yang memenuhi syarat"};
}

/* ================================================================ kartu (string HTML) */
const kartu = (ey, judul, isi, kanan = "", id = "") => `<section class="ex ex-std"${id ? ` id="${id}"` : ""}><header class="ex-hd"><span class="ex-ey">${esc(ey)}</span><div class="ex-jd"><h3>${esc(judul)}</h3>${kanan}</div></header><div class="ex-bd">${isi}</div></section>`;
const para = t => `<p class="gk-para">${esc(t)}</p>`;
const kosong = t => `<p class="gk-kosong" role="status">${esc(t)}</p>`;
const th = (t, tip) => `<th title="${esc(tip)}">${esc(t)}</th>`;
const PIL = `<div class="gk-baris"><span class="gk-pil" title="Perkiraan dari radar Sentinel-1 lewat Copernicus GFM; bukan angka resmi dan bukan hitungan korban">perkiraan radar</span>`;
export const pilHtml = r => `${PIL}<span class="gk-pil gk-pil-h" title="Belum lulus uji balik, dibaca sebagai hipotesis kerja">${r.status_model === "teruji" ? "teruji" : "hipotesis"}</span><span class="gk-pil" title="Sumber genangan">Copernicus GFM</span></div>`;

export function kartuRingkas(kej, pilih = "") {
  const r = kej.ringkas ?? {}, rg = Array.isArray(r.rentang) && r.rentang.length === 2 && r.rentang.every(bil) && r.rentang[0] <= r.rentang[1] ? {bawah: r.rentang[0], atas: r.rentang[1]} : null;
  const luas = fmtAngka(r.luas_baru_ha), tg = tglUtc(r.lintasan_terakhir);
  return kartu("Kejadian", "Ringkasan", `${pilHtml(r)}<div class="gk-ber">
    <div><small>Luas tergenang baru</small><b>${luas ? `${esc(luas)} ha` : "belum dihitung"}</b></div>
    <div><small>Penduduk di area genangan</small><b>${rg ? `${esc(rentangTulis(rg))} jiwa` : "belum dihitung"}</b>${!rg ? `<span class="gk-sel">data bangunan belum tersedia</span>` : bil(r.kab_rentang) && bil(r.kab_sah) ? `<span class="gk-sel">${fmtAngka(r.kab_rentang)} dari ${fmtAngka(r.kab_sah)} kabupaten teramati sudah punya data bangunan</span>` : ""}</div>
    <div><small>Kabupaten teramati</small><b>${bil(r.kab_sah) && bil(r.kab_semua) ? `${fmtAngka(r.kab_sah)} dari ${fmtAngka(r.kab_semua)}` : "belum dihitung"}</b></div></div>
    ${para(`Lintasan terakhir ${tg ?? "tidak tertulis"} (UTC). ${kej.catatan ?? ""}`.trim())}`, pilih);
}

export function kartuTabel(kab) {
  const baris = urutKab(kab), tidak = baris.filter(b => !b.sah).length;
  const tr = b => `<tr data-kab4="${esc(b.kab4)}" tabindex="0"><td class="gk-lbl">${esc(b.nama)}</td><td>${esc(b.lintasan ?? "tidak ada")}</td>${b.sah
    ? `<td class="n">${esc(fmtAngka(b.baru) ?? "belum dihitung")}</td><td class="n">${esc(fmtPersen(b.teramati) ?? "belum dihitung")}</td><td class="n">${esc(fmtPersen(b.persenDari) ?? "belum dihitung")}</td><td class="n"${b.kisiKasar ? ' title="Batas atas dari sampel, bisa lebih besar"' : ""}>${rentangTulis(b.pend) ? esc(rentangTulis(b.pend)) + (b.kisiKasar ? " (batas atas dari sampel)" : "") : '<span class="gk-abu">belum tersedia</span>'}</td>`
    : `<td class="gk-abu" colspan="4">${esc(b.teks)}</td>`}</tr>`;
  return kartu("Wilayah", "Per kabupaten", baris.length ? `<div class="tw gk-tw" role="region" tabindex="0" aria-label="Genangan radar per kabupaten"><table class="gk-tb"><thead><tr>${th("Kabupaten atau kota", "Klik baris untuk membuka kabupaten di peta dan citra")}${th("Lintasan", "Tanggal lintasan radar, UTC")}${th("Tergenang baru (ha)", "Luas yang tergenang pada lintasan dan tidak ada pada citra pembanding")}${th("Teramati (persen)", "Bagian luas kabupaten yang teramati radar")}${th("Persen dari teramati", "Tergenang baru dibagi luas teramati")}${th("Penduduk di area genangan", "Rentang bawah sampai atas, WorldPop; bukan korban")}</tr></thead><tbody>${baris.map(tr).join("")}</tbody></table></div>
    ${tidak ? para(`${tidak} dari ${baris.length} kabupaten tidak teramati cukup dan tidak ikut dihitung. Itu belum berarti tidak ada genangan di sana.`) : ""}` : kosong("Belum ada kabupaten dengan lintasan radar."));
}

export function kartuLahan(kab) {
  const lg = lahanGabung(kab);
  if (!lg.kelas.length) return kartu("Dampak", "Lahan tergenang", kosong("Lahan tergenang belum terbaca untuk kabupaten teramati."));
  const bar = lg.kelas.map(e => `<i data-kode="${esc(e.kode)}" style="flex-grow:${e.ha}" title="${esc(e.nama)}: ${esc(fmtAngka(e.ha))} ha, ${esc(fmtPersen(e.persen))} persen"></i>`).join("");
  const tr = e => `<tr><td class="gk-lbl"><span class="gk-sw" data-kode="${esc(e.kode)}" aria-hidden="true"></span>${esc(e.nama)}</td><td class="n">${esc(fmtAngka(e.ha))}</td><td class="n">${esc(fmtPersen(e.persen))}</td></tr>`;
  return kartu("Dampak", "Lahan tergenang", `<div class="gk-lahan" role="img" aria-label="Lahan tergenang per kelas: ${esc(lg.kelas.map(e => `${e.nama} ${fmtAngka(e.ha)} ha`).join(", "))}">${bar}</div>
    <div class="tw gk-tw"><table class="gk-tb"><thead><tr>${th("Kelas lahan", "Kelas ESA WorldCover 2021")}${th("Luas (ha)", "Hektare titik tergenang di kelas ini")}${th("Persen", "Bagian dari seluruh lahan tergenang")}</tr></thead><tbody>${lg.kelas.map(tr).join("")}</tbody></table></div>
    ${para(`Dijumlah dari ${lg.kabAda} kabupaten teramati, satu sumber (ESA WorldCover 2021). Kelas terbangun yang kecil bukan bukti permukiman tidak tergenang: radar buta di kota padat.`)}`);
}

export function kartuMetode(kej) {
  const am = kej.ambang ?? {}, min = bil(am.cakupan_pct_min) ? fmtPersen(am.cakupan_pct_min) : "yang ditetapkan model", bawah = bil(am.zona_bawah) ? fmtPersen(am.zona_bawah * 100) : "yang ditetapkan model";
  const butir = [["Data", "Genangan dari Copernicus Global Flood Monitoring (GFM), turunan radar Sentinel-1. Lahan dari ESA WorldCover 2021. Penduduk dari WorldPop, dibagi menurut bangunan Google Open Buildings."],
    ["Deteksi", `Genangan dipakai apa adanya dari GFM. Kami tidak membuat ambang radar sendiri dan tidak menyediakan penyetel ambang. Kabupaten dihitung bila radar mengamati paling sedikit ${min} persen luasnya dan sinyalnya tidak lemah; ambang ini masih hipotesis.`],
    ["Dampak", `Penduduk di area genangan dihitung dari sel yang terkena genangan. Ujung bawah memakai sel yang tergenang paling sedikit ${bawah} persen; ujung atas memakai semua sel yang tersentuh. Bangunan terendam tidak ditampilkan.`],
    ["Catatan", `Belum lulus uji balik, jadi semua angka di sini dibaca sebagai hipotesis. Radar satu lintasan hanya memotret satu saat dan buta di permukiman padat. Angka ini berdampingan dengan laporan resmi dan tidak menggantikannya.`]];
  const at = (kej.atribusi ?? []).filter(a => typeof a === "string");
  return kartu("Cara hitung", "Metode", `<details class="gk-lipat"><summary>Empat butir cara menghitung</summary>${butir.map(([j, t]) => `<div><b>${esc(j)}</b>${para(t)}</div>`).join("")}${at.length ? para(`Atribusi data: ${at.join("; ")}.`) : ""}</details>`);
}

/* ================================================================ layar */
const nanti = f => { let ok = false; const g = () => { if (!ok) { ok = true; f(); } }; requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(g))); setTimeout(g, 120); };
let DATA = null;
const muat = () => DATA ??= fetch("/banjir/data/genangan_kejadian.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null).then(d => { const v = d?.kejadian?.length ? d : null; if (!v) DATA = null; return v; });   // gagal tidak disimpan: dicoba lagi pada render berikutnya

export async function pasang(host) {
  const d = await muat(), sec = host.closest("[data-bag]") ?? host;
  if (!d) { sec.hidden = true; document.querySelectorAll('[data-ke="gen"]').forEach(b => b.hidden = true); return; }
  const S = {kj: d.kejadian[0].kj, kab: null, jenis: "radar"}, fc = new Map();
  let mapa = null, siap = false;
  const kej = () => d.kejadian.find(k => k.kj === S.kj) ?? d.kejadian[0];
  const pilihKej = `<select class="gk-pilih" aria-label="Kejadian">${d.kejadian.map(k => `<option value="${esc(k.kj)}"${k.kj === S.kj ? " selected" : ""}>${esc(k.kj)}, mulai ${esc(tglUtc(k.mulai) ?? "tanggal tidak tertulis")}</option>`).join("")}</select>`;
  const peta = () => kartu("Sebaran", "Peta genangan", `<div class="gk-peta" role="region" aria-label="Peta genangan radar"></div><div class="gk-baris"><button type="button" class="gk-tbl" aria-pressed="true" title="Tampilkan atau sembunyikan lapis genangan radar">Lapis genangan radar</button><span class="ex-leg"><span><i class="gk-sw" data-kode="air"></i>Genangan radar, titik baru per sel</span></span></div><p class="gk-para" role="status" data-info>Peta dimuat sesudah kartu lain tampil.</p>`, "", "gkPeta");
  const citra = () => { const k = kej(), sah = [...k.kab].sort((a, b) => (b.sah === true) - (a.sah === true) || a.kab.localeCompare(b.kab, "id"));
    return kartu("Bukti", "Citra sebelum dan sesudah", `<div class="gk-baris"><select class="gk-pilih" data-kab aria-label="Kabupaten untuk citra">${sah.map(x => `<option value="${esc(x.kab4)}"${x.kab4 === S.kab ? " selected" : ""}>${esc(x.kab)}</option>`).join("")}</select>
      <div class="seg" role="group" aria-label="Jenis citra">${JENIS_CITRA.map(([v, t]) => `<button type="button" data-jenis="${v}" aria-pressed="${v === S.jenis}">${t}</button>`).join("")}</div></div><div data-citra></div>`, "", "gkCitra"); };

  const isiCitra = () => {
    const k = kej(), x = k.kab.find(z => z.kab4 === S.kab), wadah = host.querySelector("[data-citra]"); if (!wadah) return;
    const c = x ? citraKab(k, x, S.jenis) : {alasan: "belum ada kabupaten untuk ditampilkan"};
    if (c.alasan) { wadah.innerHTML = kosong(`${x?.kab ?? "Kabupaten"}: ${c.alasan}.`); return; }
    if (!window.Geser) { wadah.innerHTML = kosong("Penggeser citra belum termuat."); return; }
    wadah.innerHTML = window.Geser.html({...c, label: `Geser citra ${x.kab}, sebelum dan sesudah`}) + para(`${x.kab}, citra ${JENIS_CITRA.find(j => j[0] === S.jenis)[1].toLowerCase().replace("swir", "SWIR")}. Tanggal UTC; satu lintasan atau satu adegan, bukan keadaan sepanjang hari.`);
    window.Geser.pasang(wadah.querySelector(".geser"));
  };
  const info = t => { const e = host.querySelector("[data-info]"); if (e) e.textContent = t; };
  async function keKab() {
    if (!mapa || !siap) return;
    const k = kej(), x = k.kab.find(z => z.kab4 === S.kab), kunci = `${k.kj}/${k.versi}/${S.kab}`, src = x?.sel ? urlAset(k, x.sel) : null;
    let g = fc.get(kunci);
    if (!g && src) { g = await fetch(src).then(r => r.ok ? r.json() : null).catch(() => null); if (g?.type === "FeatureCollection") fc.set(kunci, g); else g = null; }
    if (!mapa || !siap || kunci !== `${kej().kj}/${kej().versi}/${S.kab}`) return;   // peta dibongkar atau pilihan berganti selama memuat
    mapa.getSource("gfm").setData(g ?? {type: "FeatureCollection", features: []});
    if (!g) { info(x?.sah ? "Sel genangan kabupaten ini belum ada. Itu bukan berarti tidak ada genangan." : "Kabupaten ini tidak teramati cukup, jadi tidak ada sel genangan."); return; }
    info(g.features.length ? `${fmtAngka(g.features.length)} titik genangan baru${fmtAngka(g.sel_m) ? `, sel ${fmtAngka(g.sel_m)} meter` : ", ukuran sel belum tercatat"}.` : "Tidak ada sel genangan pada kabupaten ini.");
    let x0 = 181, y0 = 91, x1 = -181, y1 = -91;
    for (const f of g.features) { const [lo, la] = f.geometry.coordinates; x0 = Math.min(x0, lo); x1 = Math.max(x1, lo); y0 = Math.min(y0, la); y1 = Math.max(y1, la); }
    if (x0 <= x1) mapa.fitBounds([[x0, y0], [x1, y1]], {padding: 30, maxZoom: 12, duration: 600});
  }
  function buatPeta() {
    if (mapa) { mapa.remove(); mapa = null; }
    siap = false;
    const kotak = host.querySelector(".gk-peta"), gelap = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    if (!kotak || !kotak.isConnected) return;
    if (typeof maplibregl === "undefined") { info("Peta belum bisa dimuat. Tabel dan citra tetap bisa dipakai."); return; }
    let m;
    try { m = new maplibregl.Map({container: kotak, style: `https://tiles.openfreemap.org/styles/${gelap ? "dark" : "positron"}`, bounds: [[94.8, -11.2], [141.2, 6.2]], attributionControl: {compact: true}}); }
    catch (e) { info("Peta tidak bisa dibuat di peramban ini. Tabel dan citra tetap bisa dipakai."); return; }
    mapa = m;
    m.on("load", () => {
      if (mapa !== m) return;   // peta ini sudah dibongkar
      const air = warnaToken("--kat-banjir");   // MapLibre tidak membaca oklch
      m.addSource("gfm", {type: "geojson", data: {type: "FeatureCollection", features: []}});
      m.addLayer({id: "gfm-sel", type: "circle", source: "gfm", paint: {"circle-color": air, "circle-opacity": 0.8, "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 1.5, 10, 3, 13, 8]}});
      siap = true; if (host.querySelector(".gk-tbl")?.getAttribute("aria-pressed") !== "true") m.setLayoutProperty("gfm-sel", "visibility", "none"); keKab();
    });
    m.on("error", () => { if (mapa === m && !siap) info("Peta dasar belum bisa dimuat."); });
  }
  const sorot = () => host.querySelectorAll("tr[data-kab4]").forEach(r => r.setAttribute("aria-current", String(r.dataset.kab4 === S.kab)));
  function gambar() {   // seluruh isi untuk kejadian S.kj; peta dibuat ulang karena kotaknya ikut diganti
    const k = kej(); S.kab = kabAwal(k.kab);
    if (mapa) { mapa.remove(); mapa = null; }
    siap = false;
    host.innerHTML = `<div class="gk-lay"><div class="gk-kol">${kartuRingkas(k, pilihKej)}${kartuTabel(k.kab)}${kartuLahan(k.kab)}${kartuMetode(k)}</div><div class="gk-kol">${peta()}${citra()}</div></div>`;
    sorot(); isiCitra(); nanti(buatPeta);
  }
  host.addEventListener("click", e => {
    const b = e.target.closest("[data-jenis]"), r = e.target.closest("tr[data-kab4]"), t = e.target.closest(".gk-tbl");
    if (b) { b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); S.jenis = b.dataset.jenis; nanti(isiCitra); }   // sorotan urgent, citra menyusul
    else if (r) { S.kab = r.dataset.kab4; sorot(); host.querySelector("[data-kab]").value = S.kab; nanti(() => { isiCitra(); keKab(); }); }
    else if (t) { const nyala = t.getAttribute("aria-pressed") !== "true"; t.setAttribute("aria-pressed", String(nyala)); if (siap) mapa.setLayoutProperty("gfm-sel", "visibility", nyala ? "visible" : "none"); }
  });
  host.addEventListener("keydown", e => { const r = e.target.closest?.("tr[data-kab4]"); if (r && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); r.click(); } });
  host.addEventListener("change", e => {
    if (e.target.matches("[data-kab]")) { S.kab = e.target.value; sorot(); nanti(() => { isiCitra(); keKab(); }); }
    else if (e.target.matches(".gk-pilih")) { S.kj = e.target.value; nanti(() => { gambar(); host.querySelector('[aria-label="Kejadian"]')?.focus(); }); }
  });
  host._bongkar = () => { if (mapa) { mapa.remove(); mapa = null; } siap = false; };   // dipanggil dampak.js bila bagian ini dibuang dari DOM
  gambar();
}
