/* SIPPA: sisi staf butir lapangan fase 2 (keputusan 61; SP-122 sampai SP-131). Fungsi murni dan pembangun HTML; tanpa DOM, jaringan hanya lewat fungsi `ambil` yang diberikan layar.
   Dibaca dari GET /api/sippa/lapangan (butir {id, jenis, tugas_id, kit_id, kompleks_id, prov, data, waktu, oleh}), /api/sippa/probe.csv, /api/sippa/pinjam, /api/sippa/suku-cadang.
   Butuh global public/inti: fmt, esc, jamWIB (dimuat cangkang atau app.js). Warna peta memakai nama warna CSS, bukan hex (gerbang warna tertanam). */
import {tanggalHtml} from "./tanggal.js";
import {KEBUTUHAN_DEBIT_LPS, BAR_MIN_LANCE, hitungDebit, bandingDebit, peringatanBor} from "./formulir.js";

const ID16 = /^[0-9a-f]{16}$/, HARI = 864e5, JAM = 36e5;
export const SUHU_PANAS_C = 40;   // ambang tanda pada grafik suhu tanah (permintaan SP-124); asumsi kebijakan
export const JEDA_SESI_MS = 2 * JAM;   // jeda lebih dari ini memisahkan dua sesi tekanan

const hl = n => `<span class="hl">${esc(fmt(n))}</span>`;
const pil = (teks, kelas = "asumsi-kebijakan", judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;
const waktuTag = ms => ms == null ? "–" : `<time datetime="${new Date(ms).toISOString()}">${esc(jamWIB(ms))}</time>`;
const tanggal = ms => ms == null ? "–" : new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"});
const lima = n => Number(n).toLocaleString("id-ID", {minimumFractionDigits: 5, maximumFractionDigits: 5});
const td = (label, isi, n) => `<td${n ? ' class="n"' : ""} data-label="${label}">${isi}</td>`;
const tautanPeta = (lat, lon) => `<a href="https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}" target="_blank" rel="noopener">${esc(lima(lat))}; ${esc(lima(lon))}</a>`;
export const awalHariWIB = kini => Math.floor((kini + 7 * JAM) / HARI) * HARI - 7 * JAM;

/* ---------- ambil data ---------- */
export function urlLapangan({tugas, kompleks, jenis, sejak} = {}) {
  const q = new URLSearchParams();
  if (tugas) q.set("tugas_id", tugas); if (kompleks) q.set("kompleks_id", kompleks);
  if (jenis) q.set("jenis", Array.isArray(jenis) ? jenis.join(",") : jenis);
  if (sejak != null) q.set("sejak", String(Math.round(sejak)));
  return `/api/sippa/lapangan?${q}`;
}
/* rute belum ada (404) atau galat lain = tidak ada butir; layar memutuskan apakah menampilkan sesuatu */
export async function muatButir(ambil, param, sinyal) {
  try { return (await ambil(urlLapangan(param), sinyal)).butir || []; }
  catch (e) { if (e?.name === "AbortError") throw e; return []; }
}
export async function ambilTeks(url, sinyal) {
  const r = await fetch(url, {credentials: "same-origin", signal: sinyal});
  if (!r.ok) { const g = new Error(`Permintaan ditolak (kode ${r.status}).`); g.status = r.status; throw g; }
  return r.text();
}

/* CSV server (kutip ganda RFC 4180, sel berawalan ' sebagai penangkal rumus) menjadi larik objek; angka dikembalikan sebagai angka */
export function uraiCsv(teks) {
  const baris = []; let sel = "", r = [], kutip = false;
  const t = String(teks).replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (kutip) { if (c === '"') { if (t[i + 1] === '"') { sel += '"'; i++; } else kutip = false; } else sel += c; }
    else if (c === '"') kutip = true;
    else if (c === ",") { r.push(sel); sel = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; r.push(sel); sel = ""; if (r.length > 1 || r[0] !== "") baris.push(r); r = []; }
    else sel += c;
  }
  if (sel !== "" || r.length) { r.push(sel); baris.push(r); }
  if (!baris.length) return [];
  const [kepala, ...isi] = baris;
  return isi.map(b => Object.fromEntries(kepala.map((k, i) => [k, b[i] === "" || b[i] == null ? null : /^-?\d+(\.\d+)?$/.test(b[i]) ? Number(b[i]) : b[i]])));
}

/* ---------- SVG garis kecil bersama grafik suhu dan tekanan ---------- */
function grafikGaris({label, xLabel, seri, ambang, ymaks, satuan}) {
  const W = 560, H = 220, L = 44, R = 14, T = 12, B = 46, n = xLabel.length;
  const X = i => n === 1 ? (L + W - R) / 2 : L + (W - L - R) * i / (n - 1), Y = v => T + (H - T - B) * (1 - v / ymaks);
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">`;
  const langkah = ymaks <= 10 ? 2 : ymaks <= 25 ? 5 : 20;
  for (let v = 0; v <= ymaks; v += langkah) s += `<line class="sp-sumbu" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="sp-teks" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${esc(fmt(v))}</text>`;
  xLabel.forEach((t, i) => { s += `<text class="sp-teks" x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(t)}</text>`; });
  for (const a of ambang || []) s += `<line class="sp-ambang putus" x1="${L}" x2="${W - R}" y1="${Y(a.y)}" y2="${Y(a.y)}"><title>${esc(a.label)}</title></line>`;
  seri.forEach((sr, k) => {
    const ada = sr.titik.map((p, i) => p ? {...p, i} : null).filter(Boolean);
    if (ada.length > 1) s += `<polyline class="sp-garis sp-seri-${k % 5}" fill="none" points="${ada.map(p => `${X(p.i)},${Y(Math.min(p.y, ymaks))}`).join(" ")}"/>`;
    for (const p of ada) s += `<circle class="sp-titik sp-seri-${k % 5}${p.panas ? " panas" : ""}" cx="${X(p.i)}" cy="${Y(Math.min(p.y, ymaks))}" r="${p.panas ? 6 : 4}"><title>${esc(sr.nama)}: ${esc(p.judul)}</title></circle>`;
  });
  return s + `</svg><ul class="sp-seri-legenda" aria-label="Keterangan garis">${seri.map((sr, k) => `<li><i class="sp-seri-pj sp-seri-${k % 5}"></i>${esc(sr.nama)}</li>`).join("")}</ul>`;
}

/* ---------- SP-124 suhu tanah sebelum, sesudah, besok per petak ---------- */
const TAHAP_SUHU = [["sebelum", "Sebelum"], ["sesudah", "Sesudah"], ["24j", "Besok (24 jam)"]];
/* per petak, per kedalaman: rata-rata dan tertinggi tiap tahap; panas = ada pengukuran di atas 40 °C pada tahap itu */
export function serieSuhu(probe) {
  const petak = new Map();
  for (const p of probe) {
    if (!TAHAP_SUHU.some(t => t[0] === p.tahap) || typeof p.suhu_c !== "number") continue;
    const k = p.petak_id ?? "";
    if (!petak.has(k)) petak.set(k, new Map());
    const dalam = petak.get(k);
    if (!dalam.has(p.kedalaman_cm)) dalam.set(p.kedalaman_cm, {});
    (dalam.get(p.kedalaman_cm)[p.tahap] ??= []).push(p.suhu_c);
  }
  return [...petak].map(([nama, dalam]) => {
    const seri = [...dalam].sort((a, b) => a[0] - b[0]).map(([cm, per]) => ({cm, nilai: TAHAP_SUHU.map(([t]) => {
      const v = per[t]; return v ? {rata: v.reduce((x, y) => x + y, 0) / v.length, maks: Math.max(...v), n: v.length, panas: v.some(x => x > SUHU_PANAS_C)} : null;
    })}));
    const semua = seri.flatMap(s => s.nilai.filter(Boolean));
    return {petak: nama || null, seri, nPanas: semua.filter(v => v.panas).length, maks: semua.length ? Math.max(...semua.map(v => v.maks)) : null};
  }).sort((a, b) => (a.petak === null) - (b.petak === null) || String(a.petak).localeCompare(String(b.petak)));
}
export function suhuHtml(probe, per = null) {
  const hasil = serieSuhu(probe);
  if (!hasil.length) return `<p class="ad-kosong">Belum ada pengukuran suhu tanah untuk tugas ini.</p>`;
  return hasil.map(h => {
    const ymaks = Math.max(60, Math.ceil((h.maks ?? 0) / 20) * 20);
    const g = grafikGaris({label: `Suhu tanah ${h.petak ? "petak " + h.petak : "tanpa kode petak"} sebelum, sesudah, dan besok, dalam derajat Celsius`, xLabel: TAHAP_SUHU.map(t => t[1]), ymaks, ambang: [{y: SUHU_PANAS_C, label: `${SUHU_PANAS_C} °C`}],
      seri: h.seri.map(s => ({nama: `${fmt(s.cm)} cm`, titik: s.nilai.map(v => v && {y: v.rata, panas: v.panas, judul: `rata-rata ${fmt(v.rata)} °C dari ${fmt(v.n)} titik, tertinggi ${fmt(v.maks)} °C`})}))});
    return `<article class="sp-lap-grafik"><h4>${h.petak ? `Petak ${esc(h.petak)}` : "Tanpa kode petak"}</h4>
      <p>${h.nPanas ? pil(`${fmt(h.nPanas)} pengukuran di atas ${fmt(SUHU_PANAS_C)} °C`, "asumsi-kebijakan", "Penanda panas pada grafik; ambang asumsi kebijakan") : pil("tidak ada yang di atas 40 °C", "terverifikasi")}</p>${g}</article>`;
  }).join("") + `<p class="ad-catat sp-sumber">Sumber: probe form lapangan, rata-rata tiap kedalaman${per == null ? "" : `, per ${esc(jamWIB(per))}`}. Lingkaran besar = ada titik di atas ${esc(fmt(SUHU_PANAS_C))} °C.</p>`;
}

/* ---------- tekanan per sesi ---------- */
export function sesiTekanan(butir, jeda = JEDA_SESI_MS) {
  const t = butir.filter(b => b.jenis === "tekanan" && b.data && typeof b.data.bar === "number").sort((a, b) => a.waktu - b.waktu), sesi = [];
  for (const b of t) {
    const akhir = sesi.at(-1);
    if (akhir && akhir.tugas_id === b.tugas_id && b.waktu - akhir.sampai <= jeda) { akhir.titik.push(b); akhir.sampai = b.waktu; }
    else sesi.push({tugas_id: b.tugas_id, mulai: b.waktu, sampai: b.waktu, titik: [b]});
  }
  return sesi.map(s => ({...s, lanceRendah: s.titik.filter(b => b.data.titik === "lance" && b.data.bar < BAR_MIN_LANCE).length}));
}
export function tekananHtml(butir, per = null) {
  const sesi = sesiTekanan(butir);
  if (!sesi.length) return `<p class="ad-kosong">Belum ada catatan tekanan untuk tugas ini.</p>`;
  const TITIK = [["pompa", "Pompa"], ["manifold", "Manifold"], ["lance", "Lance"]];
  return sesi.map(s => {
    const ymaks = Math.max(10, Math.ceil(Math.max(...s.titik.map(b => b.data.bar)) / 5) * 5), t0 = s.mulai, rentang = Math.max(s.sampai - s.mulai, 1);
    const W = 560, H = 200, L = 44, R = 14, T = 12, B = 34, X = ms => L + (W - L - R) * (ms - t0) / rentang, Y = v => T + (H - T - B) * (1 - v / ymaks);
    let g = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tekanan pompa, manifold, dan lance selama sesi, dalam bar">`;
    for (let v = 0; v <= ymaks; v += 5) g += `<line class="sp-sumbu" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="sp-teks" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${esc(fmt(v))}</text>`;
    g += `<line class="sp-ambang putus" x1="${L}" x2="${W - R}" y1="${Y(BAR_MIN_LANCE)}" y2="${Y(BAR_MIN_LANCE)}"><title>Batas bawah lance ${esc(fmt(BAR_MIN_LANCE))} bar</title></line>`;
    g += `<text class="sp-teks" x="${L}" y="${H - 8}">${esc(jamWIB(s.mulai))}</text><text class="sp-teks" x="${W - R}" y="${H - 8}" text-anchor="end">${esc(jamWIB(s.sampai))}</text>`;
    TITIK.forEach(([kode], k) => {
      const p = s.titik.filter(b => b.data.titik === kode);
      if (p.length > 1) g += `<polyline class="sp-garis sp-seri-${k}" fill="none" points="${p.map(b => `${X(b.waktu)},${Y(b.data.bar)}`).join(" ")}"/>`;
      for (const b of p) g += `<circle class="sp-titik sp-seri-${k}${kode === "lance" && b.data.bar < BAR_MIN_LANCE ? " panas" : ""}" cx="${X(b.waktu)}" cy="${Y(b.data.bar)}" r="4"><title>${esc(jamWIB(b.waktu))}: ${esc(fmt(b.data.bar))} bar</title></circle>`;
    });
    g += `</svg><ul class="sp-seri-legenda">${TITIK.map(([, n], k) => `<li><i class="sp-seri-pj sp-seri-${k}"></i>${esc(n)}</li>`).join("")}</ul>`;
    return `<article class="sp-lap-grafik"><h4>Sesi ${esc(tanggal(s.mulai))}, ${hl(s.titik.length)} catatan</h4>${s.lanceRendah ? `<p>${pil(`${fmt(s.lanceRendah)} catatan lance di bawah ${fmt(BAR_MIN_LANCE)} bar`, "asumsi-kebijakan", "Batas dari aturan renlap")}</p>` : ""}${g}</article>`;
  }).join("") + `<p class="ad-catat sp-sumber">Sumber: catatan tekanan form lapangan${per == null ? "" : `, per ${esc(jamWIB(per))}`}.</p>`;
}

/* ---------- Peta: jejak GPS, titik bor, SOS per kompleks terpilih ---------- */
export const KOSONG_GEO = {type: "FeatureCollection", features: []};
export const LAPISAN_LAP = ["lapangan-jejak", "lapangan-bor", "lapangan-sos"];
export function geoLapangan(butir) {
  const fitur = [];
  for (const b of butir) {
    const d = b.data || {};
    if (b.jenis === "jejak" && Array.isArray(d.titik) && d.titik.length > 1) fitur.push({type: "Feature", geometry: {type: "LineString", coordinates: d.titik.map(t => [t[1], t[0]])}, properties: {jenis: "jejak", moda: d.moda, id: b.id, waktu: b.waktu}});
    else if (b.jenis === "bor" && Number.isFinite(d.lat) && Number.isFinite(d.lon)) {
      const w = peringatanBor(d.kedalaman_cm);
      fitur.push({type: "Feature", geometry: {type: "Point", coordinates: [d.lon, d.lat]}, properties: {jenis: "bor", kedalaman_cm: d.kedalaman_cm, tingkat: d.kedalaman_cm < 50 ? "bukan_gambut" : w ? "tembus" : "cukup", petak: d.petak_id ?? "", id: b.id}});
    } else if (b.jenis === "sos" && Number.isFinite(d.lat) && Number.isFinite(d.lon)) fitur.push({type: "Feature", geometry: {type: "Point", coordinates: [d.lon, d.lat]}, properties: {jenis: "sos", id: b.id, waktu: b.waktu}});
  }
  return {type: "FeatureCollection", features: fitur};
}
export function lapisanLapangan() {
  const sembunyi = {visibility: "none"};
  return [
    {id: "lapangan-jejak", type: "line", source: "lapangan", filter: ["==", ["get", "jenis"], "jejak"], layout: {...sembunyi, "line-cap": "round", "line-join": "round"},
      paint: {"line-width": 3.5, "line-color": ["match", ["get", "moda"], "perahu", "teal", "kendaraan", "darkorange", "royalblue"]}},
    {id: "lapangan-bor", type: "circle", source: "lapangan", filter: ["==", ["get", "jenis"], "bor"], layout: sembunyi,
      paint: {"circle-radius": 6, "circle-stroke-width": 2, "circle-stroke-color": "#fff", "circle-color": ["match", ["get", "tingkat"], "bukan_gambut", "crimson", "tembus", "orange", "seagreen"]}},
    {id: "lapangan-sos", type: "circle", source: "lapangan", filter: ["==", ["get", "jenis"], "sos"], layout: sembunyi,
      paint: {"circle-radius": 10, "circle-stroke-width": 3, "circle-stroke-color": "#fff", "circle-color": "red"}},
  ];
}
export const legendaLapanganHtml = () => `<b class="sp-leg-judul">Lapangan, kompleks terpilih</b><ul class="sp-leg-ukuran"><li><i class="sp-lg sp-lg-jejak"></i>jejak GPS regu</li><li><i class="sp-lg sp-lg-bor"></i>titik bor: hijau cukup, oranye di bawah 100 cm, merah di bawah 50 cm</li><li><i class="sp-lg sp-lg-sos"></i>SOS</li></ul>`;

/* ---------- debit terukur di rincian kompleks ---------- */
export function debitTerukur(butir) {
  return butir.filter(b => b.jenis === "debit" && b.data).map(b => ({id: b.id, waktu: b.waktu, lat: b.data.lat, lon: b.data.lon, metode: b.data.metode, lps: typeof b.data.debit_lps === "number" ? b.data.debit_lps : hitungDebit(b.data)}))
    .filter(d => d.lps != null).sort((a, b) => b.waktu - a.waktu);
}
export function debitHtml(butir) {
  const d = debitTerukur(butir);
  if (!d.length) return "";
  const baris = d.slice(0, 5).map(x => { const b = bandingDebit(x.lps); return `<li><b>${esc(fmt(x.lps))} liter per detik</b>, ${x.metode === "ember" ? "ember" : "pelampung"}, ${waktuTag(x.waktu)} ${b.cukup ? pil("cukup untuk satu kit", "terverifikasi") : pil(`kurang dari ${fmt(KEBUTUHAN_DEBIT_LPS)} liter per detik`, "asumsi-kebijakan", "Kebutuhan satu kit 5 liter per detik (asumsi kebijakan renlap)")}</li>`; }).join("");
  return `<div class="sp-rincian sp-lap-debit"><h3 class="sp-rincian-judul">Debit air terukur regu</h3><ul class="sp-daftar">${baris}</ul>
    <p class="ad-catat">Sumber: ukur lapangan dengan pelampung atau ember; kebutuhan satu kit ${esc(fmt(KEBUTUHAN_DEBIT_LPS))} liter per detik. ${d.length > 5 ? `${esc(fmt(d.length - 5))} ukuran lebih lama tidak ditampilkan.` : ""}</p></div>`;
}

/* ---------- Ringkas: kartu "Lapangan hari ini" ---------- */
export function kartuLapangan(butir, kini = Date.now(), namaKit = {}) {
  const awal = awalHariWIB(kini), hariIni = butir.filter(b => b.waktu >= awal);
  const sos = hariIni.filter(b => b.jenis === "sos").sort((a, b) => b.waktu - a.waktu), selesai = hariIni.filter(b => b.jenis === "selesai").sort((a, b) => b.waktu - a.waktu);
  if (!sos.length && !selesai.length) return {kosong: true};
  const kit = b => esc(namaKit[b.kit_id] ?? b.kit_id ?? "tanpa kit");
  const barisSos = sos.map(b => `<li class="sp-lap-sos"><b>SOS</b> ${kit(b)}, ${waktuTag(b.waktu)}, ${b.data?.lat != null ? tautanPeta(b.data.lat, b.data.lon) : "lokasi tidak ada"}${b.data?.pesan ? `, ${esc(b.data.pesan)}` : ""}</li>`).join("");
  const barisSelesai = selesai.map(b => { const h = b.data?.alat_hilang || []; return `<li><b>Selesai gelar</b> ${kit(b)}, ${waktuTag(b.waktu)}, ${fmt((b.data?.alat_kembali || []).length)} alat kembali${h.length ? `, ${pil(`${fmt(h.length)} hilang: ${h.join(" ")}`, "asumsi-kebijakan")}` : ""}${b.data?.catatan ? `. ${esc(b.data.catatan)}` : ""}</li>`; }).join("");
  const judul = sos.length ? `${hl(sos.length)} SOS dari regu hari ini` : `${hl(selesai.length)} regu melapor selesai gelar hari ini`;
  return {ey: "Lapangan hari ini", judul, isi: `<ul class="sp-daftar sp-lap-daftar">${barisSos}${barisSelesai}</ul>`, sumber: "form lapangan SIPPA (SOS dan laporan selesai)", per: Math.max(...hariIni.map(b => b.waktu)), perLabel: "catatan terakhir"};
}

/* ---------- SP-131 kehilangan komponen per musim per depot ---------- */
/* kit tiap musim = jawaban GET /api/sippa/kit?musim=...: per depot (lokasi), jumlah kit dan komponen kurang; persen = rata-rata persen per kit (kehilangan.per_kit) */
export function kehilanganDepot(jawaban) {
  const hasil = {};
  for (const [musim, j] of Object.entries(jawaban)) {
    if (!j) continue;
    const per = j.kehilangan?.per_kit || {};
    for (const k of j.kit || []) {
      const depot = k.lokasi || "Lokasi belum dicatat", d = (hasil[depot] ??= {depot, musim: {}}), m = (d.musim[musim] ??= {kit: 0, kurang: 0, pct: []});
      m.kit++; m.kurang += k.komponen_kurang ?? 0; if (typeof per[k.id] === "number") m.pct.push(per[k.id]);
    }
  }
  return Object.values(hasil).map(d => ({depot: d.depot, musim: Object.fromEntries(Object.entries(d.musim).map(([m, v]) => [m, {kit: v.kit, kurang: v.kurang, rata: v.pct.length ? v.pct.reduce((a, b) => a + b, 0) / v.pct.length : null}]))}))
    .sort((a, b) => a.depot.localeCompare(b.depot));
}
export function kehilanganDepotHtml(baris, per = null) {
  if (!baris.length) return "";
  const sel = m => m ? `${hl(m.kurang)} komponen kurang${m.rata != null ? `, rata-rata ${esc(fmt(m.rata))}% per kit` : ""} <small>dari ${esc(fmt(m.kit))} kit</small>` : "–";
  const isi = baris.map(b => `<tr>${td("Depot", esc(b.depot))}${td("Musim karhutla", sel(b.musim.karhutla))}${td("Musim banjir", sel(b.musim.banjir))}</tr>`).join("");
  return `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Kehilangan komponen per depot per musim</caption><thead><tr><th scope="col">Depot</th><th scope="col">Musim karhutla</th><th scope="col">Musim banjir</th></tr></thead><tbody>${isi}</tbody></table></div>
    <p class="ad-catat sp-sumber">Sumber: inventaris komponen kit SIPPA${per == null ? "" : `, per ${esc(jamWIB(per))}`}. Awal musim diatur server; persen adalah rata-rata per kit, bukan gabungan seluruh depot.</p>`;
}

/* ---------- SP-130 pinjam-pakai ---------- */
export const KONDISI_KEMBALI_MAKS = 200;
export function jalurPinjamKembali(id) { if (!ID16.test(String(id))) throw new Error("id tidak sah"); return `/api/sippa/pinjam-kembali/${id}`; }
const tglMs = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) ? Date.parse(`${s}T00:00:00+07:00`) : NaN;
/* f: {kit_id, kode_bom (teks dipisah koma/spasi), pemilik_asal, penerima, mulai (yyyy-mm-dd), selesai_rencana, catatan}; galat per medan seperti layar lain */
export function cekFormPinjam(f, kini = Date.now()) {
  const g = {}, teks = (k, a, z) => { const v = String(f[k] ?? "").trim(); if (v.length < a || v.length > z) g[k] = a ? `${k === "pemilik_asal" ? "Pemilik asal" : "Penerima"} ${a} sampai ${z} huruf` : `Paling banyak ${z} huruf`; };
  teks("pemilik_asal", 2, 80); teks("penerima", 2, 80); if (String(f.catatan ?? "").trim()) teks("catatan", 0, 500);
  const bom = bomDari(f.kode_bom);
  if (bom.some(k => !/^[A-Z]{1,4}-\d{1,6}$/.test(k))) g.kode_bom = "Kode alat seperti P-101, dipisah koma";
  if (bom.length > 100) g.kode_bom = "Paling banyak 100 kode alat";
  if (!f.kit_id && !bom.length) g.kit_id = "Pilih kit atau isi kode alat";
  const m = tglMs(f.mulai), s = tglMs(f.selesai_rencana);
  if (Number.isNaN(m)) g.mulai = "Pilih tanggal mulai"; else if (m < kini - 30 * HARI || m > kini + 365 * HARI) g.mulai = "Mulai paling lama 30 hari lalu dan 1 tahun ke depan";
  if (Number.isNaN(s)) g.selesai_rencana = "Pilih tanggal selesai rencana"; else if (!Number.isNaN(m) && (s <= m || s - m > 365 * HARI)) g.selesai_rencana = "Selesai harus sesudah mulai, paling lama 1 tahun";
  return g;
}
export const bomDari = t => [...new Set(String(t ?? "").split(/[\s,;]+/).map(x => x.trim().toUpperCase()).filter(Boolean))];
export function badanPinjam(f) {
  const bom = bomDari(f.kode_bom), b = {pemilik_asal: String(f.pemilik_asal).trim(), penerima: String(f.penerima).trim(), mulai: tglMs(f.mulai), selesai_rencana: tglMs(f.selesai_rencana)};
  if (f.kit_id) b.kit_id = f.kit_id;
  if (bom.length) b.kode_bom = bom;
  if (!f.kit_id && f.prov) b.prov = f.prov;   // tanpa kit server memakai provinsi kiriman (harus di dalam wilayah staf)
  const c = String(f.catatan ?? "").trim(); if (c) b.catatan = c;
  return b;
}
export function badanKembali(f, kini = Date.now()) {
  const b = {waktu: kini}, k = String(f.kondisi ?? "").trim(); if (k) b.kondisi = k.slice(0, KONDISI_KEMBALI_MAKS);
  return b;
}
export const statusPinjam = (p, kini = Date.now()) => p.kembali != null ? "kembali" : kini > p.selesai_rencana ? "lewat" : "berjalan";
const TEKS_PINJAM = {kembali: "Sudah kembali", lewat: "Lewat jadwal", berjalan: "Dipinjam"};
export function tabelPinjamHtml(rows, {peran, kini = Date.now(), namaKit = {}, per = null} = {}) {
  if (!rows.length) return `<p class="ad-kosong">Belum ada pinjam-pakai tercatat.</p>`;
  const tulis = peran === "W" || peran === "M";
  const baris = rows.map(p => {
    const s = statusPinjam(p, kini), barang = [p.kit_id ? namaKit[p.kit_id] ?? "kit" : null, ...(p.kode_bom || [])].filter(Boolean).join(", ") || "–";
    return `<tr>${td("Nomor BA", `<b class="num">${esc(p.nomor_ba)}</b>`)}${td("Barang", esc(barang))}${td("Dari", esc(p.pemilik_asal))}${td("Penerima", esc(p.penerima))}${td("Pinjam", `${esc(tanggal(p.mulai))} sampai ${esc(tanggal(p.selesai_rencana))}`)}`
      + `${td("Status", `<span class="sp-status ${s === "lewat" ? "hilang" : s === "kembali" ? "aktif" : "gelar"}">${esc(TEKS_PINJAM[s])}</span>${p.kembali != null ? ` <small>${esc(tanggal(p.kembali))}${p.kondisi_kembali ? `, ${esc(p.kondisi_kembali)}` : ""}</small>` : ""}`)}`
      + `${td("Aksi", `<button type="button" class="ad-tombol" data-ba="${esc(p.id)}">Berita acara</button>${tulis && p.kembali == null ? ` <button type="button" class="ad-tombol" data-kembali="${esc(p.id)}">Kembalikan</button>` : ""}`)}</tr>`;
  }).join("");
  return `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Pinjam-pakai kit dan alat</caption><thead><tr>${["Nomor BA", "Barang", "Dari", "Penerima", "Pinjam", "Status", "Aksi"].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${baris}</tbody></table></div>
    <p class="ad-catat sp-sumber">Sumber: pinjam-pakai SIPPA${per == null ? "" : `, per ${esc(jamWIB(per))}`}.</p>`;
}
export function formPinjamHtml(kits) {
  return `<form class="sp-form" novalidate>
    <label>Kit (boleh kosong bila hanya alat)<select name="kit_id"><option value="">Tanpa kit utuh</option>${kits.map(k => `<option value="${esc(k.id)}">${esc(k.kode)}</option>`).join("")}</select></label>
    <label>Kode alat, dipisah koma (boleh kosong bila satu kit utuh)<input name="kode_bom" autocomplete="off" maxlength="900" placeholder="P-101, SF-101"></label>
    <label>Pemilik asal<input name="pemilik_asal" maxlength="80" required></label>
    <label>Penerima<input name="penerima" maxlength="80" required></label>
    <label>Mulai ${tanggalHtml({nama: "mulai", label: "Mulai"})}</label>
    <label>Selesai rencana ${tanggalHtml({nama: "selesai_rencana", label: "Selesai rencana"})}</label>
    <label>Catatan<input name="catatan" maxlength="500"></label>
    <div class="sp-galat-slot" role="alert"></div><button type="submit" class="ad-tombol">Catat pinjam</button></form>`;
}

/* Berita acara siap cetak: teks hitam di kertas putih, kepala "Badan Nasional Penanggulangan Bencana" sebagai teks (tanpa logo selain BNPB, tanpa merek).
   Nomor BA dan isi dari server; tanda tangan dua pihak. */
export function beritaAcaraHtml(p, {namaKit = {}, kini = Date.now()} = {}) {
  const barang = [p.kit_id ? `Kit ${namaKit[p.kit_id] ?? ""}`.trim() : null, ...(p.kode_bom || []).map(k => `Alat ${k}`)].filter(Boolean);
  const ttd = (peran, nama) => `<div class="sp-ba-ttd"><p>${esc(peran)}</p><p class="sp-ba-garis"></p><p>${esc(nama)}</p></div>`;
  return `<article class="sp-ba"><header><p class="sp-ba-inst">Badan Nasional Penanggulangan Bencana</p><h1>Berita Acara Pinjam-Pakai</h1><p class="num">Nomor ${esc(p.nomor_ba)}</p></header>
    <p>Pada ${esc(tanggal(p.mulai))}, pihak yang bertanda tangan di bawah ini menyatakan telah terjadi peminjaman barang berikut.</p>
    <dl><div><dt>Pemilik asal</dt><dd>${esc(p.pemilik_asal)}</dd></div><div><dt>Penerima</dt><dd>${esc(p.penerima)}</dd></div>
      <div><dt>Masa pinjam</dt><dd>${esc(tanggal(p.mulai))} sampai ${esc(tanggal(p.selesai_rencana))}</dd></div>
      <div><dt>Barang</dt><dd>${barang.length ? `<ul>${barang.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : "–"}</dd></div>
      ${p.catatan ? `<div><dt>Catatan</dt><dd>${esc(p.catatan)}</dd></div>` : ""}
      ${p.kembali != null ? `<div><dt>Dikembalikan</dt><dd>${esc(tanggal(p.kembali))}${p.kondisi_kembali ? `, kondisi: ${esc(p.kondisi_kembali)}` : ""}</dd></div>` : ""}</dl>
    <p>Penerima wajib menjaga barang dan mengembalikannya dalam kondisi yang sama pada akhir masa pinjam.</p>
    <div class="sp-ba-ttd-baris">${ttd("Pemilik asal", p.pemilik_asal)}${ttd("Penerima", p.penerima)}</div>
    <footer><p>Dicetak ${esc(tanggal(kini))}</p></footer></article>`;
}

/* ---------- SP-131 alat menunggu suku cadang ---------- */
export function sukuCadangHtml(rows, per = null) {
  if (!rows.length) return `<p class="ad-kosong">Tidak ada alat yang menunggu suku cadang.</p>`;
  const urut = [...rows].sort((a, b) => b.umur_hari - a.umur_hari);
  const baris = urut.map(r => `<tr>${td("Kit", esc(r.kit_kode ?? r.kit_id ?? "–"))}${td("Komponen", `<b>${esc(r.kode_bom)}</b> ${esc(r.nama ?? "")}`)}${td("Menunggu sejak", waktuTag(r.sejak))}${td("Umur", `${hl(r.umur_hari)} hari`, true)}${td("Temuan", esc(r.temuan ?? "–"))}</tr>`).join("");
  return `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Komponen menunggu suku cadang</caption><thead><tr>${["Kit", "Komponen", "Menunggu sejak", "Umur", "Temuan"].map(k => `<th class="${k === "Umur" ? "n" : ""}" scope="col">${k}</th>`).join("")}</tr></thead><tbody>${baris}</tbody></table></div>
    <p class="ad-catat sp-sumber">Sumber: inspeksi terakhir tiap komponen dengan tindakan tunggu suku cadang${per == null ? "" : `, per ${esc(jamWIB(per))}`}. Komponen keluar dari daftar begitu ada inspeksi berikutnya.</p>`;
}

/* gaya staf fase 2 dimuat sekali oleh layar yang memakainya (bukan pipa.css yang terkunci ?v= bersama form lapangan) */
export function muatGayaLapangan() {
  return new Promise(ok => {
    if (typeof document === "undefined" || document.querySelector('link[data-sp="lapangan"]')) return ok();
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/pipa/layar_lapangan.css?v=1"; l.dataset.sp = "lapangan";
    l.onload = l.onerror = () => ok(); document.head.append(l); setTimeout(ok, 1500);
  });
}
