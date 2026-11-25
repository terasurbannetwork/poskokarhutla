/* Panel pemantauan alat (EWS) banjir dan gunung api: bagian murni (EW-01).
   Paket data/kajian-bnpb/ews: ALGORITMA G1 tingkat, G2 basi, G3 ringkasan, G4 seri, G5 urutan.
   Uji: tests/inti/pantau_alat.test.mjs (U1, U12). Tanpa DOM; komponen layar menyusul di EW-05. */

const MENIT = 6e4;
/* KEPUTUSAN Q4 (bawaan diterima pemilik 25 Nov 2026). Jenis tanpa batas: basi hanya dari sumber (pos.basi) atau waktu kosong */
export const BATAS = {tma: 30 * MENIT, hujan: 30 * MENIT, geofon: 10 * MENIT};
/* KEPUTUSAN Q8, HIPOTESIS: interval kirim alat sendiri, dasar deteksi celah grafik */
export const INTERVAL = {tma: 5 * MENIT, hujan: 5 * MENIT, geofon: MENIT};
export const TINGKAT = ["waspada", "siaga", "awas"];
/* DESIGN-SYSTEM: label tingkat; kata "aman" tidak pernah dipakai (D3) */
export const LABEL = {normal: "Normal", waspada: "Waspada", siaga: "Siaga", awas: "Awas", tanpa_data: "Tidak ada data terkini"};
const PENGELOLA = {sihka: "Kementerian PU, Ditjen SDA (SIHKA)", pvmbg: "PVMBG, Badan Geologi"};
const LEVEL_PVMBG = {normal: "normal", waspada: "waspada", siaga: "siaga", awas: "awas"};

/* tingkat tertinggi yang terlewati: {tingkat, kunci} | null. Salinan PERSIS src/sensor.js tingkatAmbang;
   kesamaannya dijaga uji U1. ponytail: dua definisi sampai src/sensor.js mengimpor dari sini (warga-api). */
export function tingkatAmbang(ambang, nilai) {
  let t = -1, kunci = null;
  for (const [k, a] of Object.entries(ambang || {})) {
    const v = nilai?.[k]; if (typeof v !== "number" || !a || typeof a !== "object") continue;
    TINGKAT.forEach((n, i) => { if (typeof a[n] === "number" && v >= a[n] && i > t) { t = i; kunci = k; } });
  }
  return t < 0 ? null : {tingkat: TINGKAT[t], kunci};
}

/* G2: basi tidak mengubah nilai; umur tepat di batas belum basi. SIHKA mengikuti status "lama" pipeline (pos_air.js) */
export function basi(pos, kini) {
  if (!pos || pos.waktu == null || !Number.isFinite(pos.waktu)) return true;
  if (pos.basi === true || (pos.sumber === "sihka" && pos.status === "lama")) return true;
  const b = BATAS[pos.jenis];
  return b != null && kini - pos.waktu > b;
}

/* G1: {kode, label, kunci?, resmi?, pengelola?} | null (nilai tampil tanpa warna tingkat).
   kode: normal|waspada|siaga|awas|tanpa_data|resmi. Status resmi sumber luar ditulis apa adanya (D3, Q7) */
export function tingkat(pos, kini) {
  if (basi(pos, kini)) return {kode: "tanpa_data", label: LABEL.tanpa_data};
  const r = typeof pos.status_resmi === "string" && pos.status_resmi.trim() ? pos.status_resmi.trim() : null;
  if (pos.sumber === "pvmbg" || pos.sumber === "sihka") {
    if (!r) return null;
    const kode = pos.sumber === "pvmbg" ? LEVEL_PVMBG[r.toLowerCase()] || "resmi" : "resmi";
    return {kode, label: r, resmi: r, pengelola: pos.pengelola || PENGELOLA[pos.sumber]};
  }
  const amb = pos.ambang && typeof pos.ambang === "object" ? pos.ambang : null;
  if (!amb || !Object.keys(amb).length) return null;
  const t = tingkatAmbang(amb, pos.nilai);
  if (t) return {kode: t.tingkat, label: LABEL[t.tingkat], kunci: t.kunci};
  /* Normal hanya bila sedikitnya satu besaran berambang benar-benar terukur; selain itu tidak dinilai */
  const dinilai = Object.keys(amb).some(k => typeof pos.nilai?.[k] === "number");
  return dinilai ? {kode: "normal", label: LABEL.normal} : null;
}

/* di atas ambang = Waspada ke atas, tidak basi. SIHKA: tiap "Siaga n" resmi berada di atas ambang pengelola */
const diAtas = t => !!t && (TINGKAT.includes(t.kode) || (t.kode === "resmi" && /^siaga\b/i.test(t.resmi || "")));

/* G3: angka hanya dari daftar yang ada. Daftar kosong karena semua sumber gagal -> jumlah null, bukan 0 */
export function ringkasan(pos, kini, {gagal = [], kamera = null} = {}) {
  const daftar = Array.isArray(pos) ? pos : [];
  const kosongKarenaGagal = !daftar.length && gagal.length > 0;
  if (kosongKarenaGagal) return {jumlah_pos: null, di_atas_ambang: null, terputus: null, kamera, gagal: [...gagal]};
  let atas = 0, putus = 0;
  for (const p of daftar) { const t = tingkat(p, kini); if (t?.kode === "tanpa_data") putus++; else if (diAtas(t)) atas++; }
  return {jumlah_pos: daftar.length, di_atas_ambang: atas, terputus: putus, kamera, gagal: [...gagal]};
}

/* G5: tingkat tertinggi dulu, lalu basi, lalu sisanya; dalam kelompok menurut nama (stabil antar-pembaruan) */
const PERINGKAT = {awas: 0, siaga: 1, waspada: 2, resmi: 3, tanpa_data: 4, normal: 5};
export function urut(pos, kini) {
  const kunci = p => { const t = tingkat(p, kini); return t?.kode === "resmi" && !diAtas(t) ? 5 : PERINGKAT[t?.kode] ?? 5; };
  return [...pos].map(p => [kunci(p), String(p.nama ?? p.id ?? ""), p])
    .sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1], "id"))
    .map(x => x[2]);
}

/* G4: titik [waktu, nilai, ...] -> segmen garis. Celah > 2x interval atau nilai kosong memutus garis;
   nilai kosong tidak pernah jadi 0 dan tidak ikut digambar */
export function seri(titik, interval) {
  if (!Array.isArray(titik) || !(interval > 0)) return [];
  const sah = titik.filter(t => Array.isArray(t) && Number.isFinite(t[0])).sort((a, b) => a[0] - b[0]);
  const segmen = []; let kini = null, lalu = null;
  for (const t of sah) {
    if (typeof t[1] !== "number" || !Number.isFinite(t[1])) { kini = null; lalu = t[0]; continue; }
    if (!kini || (lalu != null && t[0] - lalu > 2 * interval)) segmen.push(kini = []);
    kini.push(t); lalu = t[0];
  }
  return segmen;
}

/* ===== EW-05: komponen layar (DESIGN-SYSTEM: angka, pil, tabel mini, kartu pos, baris pemberitahuan, grafik).
   Dipasang di /banjir dan /gunungapi lewat pasang(); menyala hanya bila kemampuan.alat ada di /bencana.json (D1).
   Gaya: public/inti/pantau_alat.css (token tema.css saja). Uji layar: tests/inti/pantau_alat_layar.test.mjs (U2, U6, U7, U11).
   Tidak ada kode DOM di tingkat modul: berkas ini juga diimpor src/alat.js di Worker. */

const ESC = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);
const ANGKA = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 2});
const WAKTU = new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
const JAM_SAJA = new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
export const waktuTeks = ms => Number.isFinite(ms) ? WAKTU.format(ms).replace(",", "") + " WIB" : null;
export function umur(ms) {
  const m = Math.max(0, Math.round(ms / MENIT));
  if (m < 1) return "kurang dari 1 menit"; if (m < 60) return m + " menit";
  const j = Math.round(m / 60); return j < 48 ? j + " jam" : Math.round(j / 24) + " hari";
}
/* besaran yang dikenal (sensor/payload.py SKEMA); kunci lain: nama dari kunci, satuan dari akhiran (sama dengan src/alat.js satuanKunci) */
const BESARAN = {tinggi_cm: "Tinggi muka air", tinggi: "Tinggi muka air", laju_cm_jam: "Laju naik", mm10: "Hujan 10 menit", mm60: "Hujan 1 jam", level: "Level", getar_mms: "Getaran", frek_hz: "Frekuensi"};
const SATUAN = {laju_cm_jam: "cm/jam", mm10: "mm", mm60: "mm"};
const AKHIRAN = {cm: "cm", mm: "mm", m: "m", mms: "mm/s", hz: "Hz", c: "°C", pct: "%"};
const ABAIKAN = new Set(["n", "tips", "seq", "suhu_c", "level"]);
const satuanDari = k => SATUAN[k] ?? AKHIRAN[String(k).split("_").pop()] ?? "";
const namaBesaran = k => BESARAN[k] ?? (k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " "));
const SUMBER = {sensor: "Sensor Centurisk97", sihka: "SIHKA, Kementerian PU", pvmbg: "PVMBG, Badan Geologi"};
const ROMAWI = {1: "I", 2: "II", 3: "III", 4: "IV"};
/* warna tingkat: kode G1, status resmi SIHKA mengikuti warna pos_air.js yang sudah tayang (Q7: tidak dipetakan ulang, hanya diwarnai) */
const WARNA_SIHKA = {"Normal": "info", "Siaga 3": "waspada", "Siaga 2": "siaga", "Siaga 1": "awas"};
const warna = t => !t ? null : t.kode === "resmi" ? WARNA_SIHKA[t.resmi] ?? "info" : t.kode;
const AMB_W = {siaga3: "waspada", siaga2: "siaga", siaga1: "awas"};
const fmt = (v, s) => typeof v === "number" && Number.isFinite(v) ? ANGKA.format(v) + (s ? " " + s : "") : "tidak ada data";

const IK = {
  alat: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 13v8M8.5 9.5a5 5 0 0 1 7 0M5.5 6.5a9 9 0 0 1 13 0"/><circle cx="12" cy="12.5" r="1.2"/></svg>',
  sensor: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 12v9M8.5 8.5a5 5 0 0 1 7 0M5.5 5.5a9 9 0 0 1 13 0"/></svg>',
  sihka: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 15c3-2 6 2 9 0s6 2 9 0M3 19c3-2 6 2 9 0s6 2 9 0M12 3v8"/></svg>',
  pvmbg: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 20 9 9h6l6 11z"/></svg>',
  grafik: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/></svg>',
  tutup: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  awas: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20zM12 10v4M12 17v.5"/></svg>',
  titik: '<svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true"><circle cx="5" cy="5" r="5" fill="currentColor"/></svg>',
};

/* atom 1: angka pos. Basi: abu + umur. ponytail: nilai terakhir 0 pada pos basi tidak ditulis (U2), karena alat putus
   di dasbor rujukan justru tampil 0; nilai terakhir bukan nol tetap tampil abu (D4). */
export function angkaHtml(p, t, kini) {
  const v = p.nilai?.[p.utama], ada = typeof v === "number" && Number.isFinite(v);
  const teks = p.sumber === "pvmbg" && ada ? ROMAWI[v] ?? ANGKA.format(v) : ada ? ANGKA.format(v) : null;
  const satuan = p.sumber === "pvmbg" ? "level" : p.satuan || satuanDari(p.utama || "");
  if (t?.kode === "tanpa_data") {
    const kapan = p.waktu == null ? "belum pernah mengirim data" : `terakhir ${umur(kini - p.waktu)} lalu`;
    return teks && v !== 0
      ? `<div class="al-angka al-basi"><b>${teks}</b><span>${esc(satuan)}</span><small>${kapan}</small></div>`
      : `<div class="al-angka al-basi"><small>${kapan}</small></div>`;
  }
  return teks ? `<div class="al-angka"><b>${teks}</b><span>${esc(satuan)}</span></div>` : `<div class="al-angka"><small>tidak ada data</small></div>`;
}
/* atom 2: pil tingkat (tanpa ambang: tanpa pil) */
export const pilHtml = t => !t ? "" : `<span class="al-pil" data-w="${warna(t)}"${t.pengelola ? ` title="Status resmi ${esc(t.pengelola)}"` : ""}>${IK.titik}${esc(t.label)}</span>`;
/* atom 3: tabel mini. Sel kosong menulis "tidak ada data", tidak pernah 0 */
function ambangTeks(p) {
  const a = p.ambang?.[p.utama] && typeof p.ambang[p.utama] === "object" ? p.ambang[p.utama] : p.ambang;
  if (!a || typeof a !== "object") return null;
  const e = Object.entries(a).filter(([, v]) => typeof v === "number");
  if (!e.length) return null;
  const nama = k => k.replace(/^siaga(\d)$/, "Siaga $1").replace(/^./, c => c.toUpperCase());
  return e.map(([k, v]) => `${nama(k)} ${ANGKA.format(v)}`).join(", ") + (p.satuan ? " " + p.satuan : "");
}
export function rinciHtml(p) {
  const b = [];
  const am = ambangTeks(p); if (am) b.push(["Ambang", am]);
  for (const [k, v] of Object.entries(p.nilai || {})) if (k !== p.utama && !ABAIKAN.has(k)) b.push([namaBesaran(k), fmt(v, satuanDari(k))]);
  if (p.sumber === "sensor") { b.push(["Baterai", fmt(p.alat?.baterai, "V")]); b.push(["Suhu alat", fmt(p.alat?.suhu, "°C")]); }
  b.push(["Waktu bacaan", waktuTeks(p.waktu) ?? "tidak ada data"]);
  return `<dl class="al-rinci">${b.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
}
/* blok 4: kartu pos */
export function kartuHtml(p, kini) {
  const t = tingkat(p, kini), adaSeri = p.sumber !== "pvmbg";
  const tombol = adaSeri ? `<button type="button" class="al-ik" data-grafik="${esc(p.id)}" aria-expanded="false" aria-label="Grafik 24 jam ${esc(p.nama)}" title="Grafik 24 jam">${IK.grafik}</button>` : "";
  return `<article class="al-kartu" data-id="${esc(p.id)}" data-w="${warna(t) ?? ""}"><header><h4>${esc(p.nama)}</h4>${tombol}</header>`
    + `<p class="al-sumber">${IK[p.sumber] ?? ""}${esc(p.pengelola && p.sumber === "pvmbg" ? p.pengelola : SUMBER[p.sumber] ?? p.sumber)}</p>`
    + angkaHtml(p, t, kini) + pilHtml(t) + rinciHtml(p) + `</article>`;
}
/* blok 5: baris pemberitahuan alat tanpa data terkini (bukan dialog) */
export function putusHtml(daftar, kini) {
  if (!daftar.length) return "";
  const n = daftar.slice(0, 5).map(p => `${esc(p.nama)} (${p.waktu == null ? "belum pernah mengirim" : umur(kini - p.waktu) + " lalu"})`).join(", ");
  const sisa = daftar.length > 5 ? `, dan ${daftar.length - 5} lainnya` : "";
  return `<div class="al-putus" role="status">${IK.awas}<p><b>${daftar.length} alat tanpa data terkini</b>: ${n}${sisa}</p><button type="button" class="al-ik" data-tutup-putus aria-label="Tutup pemberitahuan" title="Tutup">${IK.tutup}</button></div>`;
}
/* blok 7: grafik SVG (D8, pola polyline profil_wilayah.js). Segmen dari seri() (celah memutus garis), ambang garis putus-putus,
   kolom tak terlihat ber-data-tip untuk tooltip bersama #tip (public/inti/tip.js) */
export function grafikSvg(d, nama, lebarPx = 640) {
  const seg = seri(d?.titik, d?.interval || INTERVAL.tma), semua = seg.flat();
  if (!semua.length) return `<p class="al-kosong">Belum ada bacaan dalam 24 jam terakhir.</p>`;
  const W = Math.max(280, Math.round(lebarPx)), H = 200, L = 44, R = 92, T = 12, B = 26, sat = d.satuan || "";
  const amb = Object.entries(d.ambang && typeof d.ambang === "object" ? d.ambang : {}).filter(([, v]) => typeof v === "number");
  const ys = [...semua.map(t => t[1]), ...amb.map(a => a[1])];
  let y0 = Math.min(...ys), y1 = Math.max(...ys); if (y0 === y1) { y0 -= 1; y1 += 1; } const pad = (y1 - y0) * .08; y0 -= pad; y1 += pad;
  const t0 = semua[0][0], t1 = Math.max(semua.at(-1)[0], t0 + 1);
  const X = t => L + (t - t0) / (t1 - t0) * (W - L - R), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B), f = n => n.toFixed(1);
  const sumbuY = [y0 + pad, (y0 + y1) / 2, y1 - pad].map(v => `<text x="${L - 6}" y="${f(Y(v) + 4)}" text-anchor="end">${ANGKA.format(Math.round(v * 10) / 10)}</text><line class="al-gk" x1="${L}" x2="${W - R}" y1="${f(Y(v))}" y2="${f(Y(v))}"/>`).join("");
  const sumbuX = [0, .25, .5, .75, 1].map(r => { const t = t0 + r * (t1 - t0); return `<text x="${f(X(t))}" y="${H - 8}" text-anchor="middle">${JAM_SAJA.format(t)}</text>`; }).join("");
  const garisAmb = amb.map(([k, v]) => `<line class="al-ga" data-w="${esc(AMB_W[k] ?? k)}" x1="${L}" x2="${W - R}" y1="${f(Y(v))}" y2="${f(Y(v))}"/><text class="al-gal" x="${W - R + 4}" y="${f(Y(v) + 4)}">${esc(k.replace(/^siaga(\d)$/, "Siaga $1").replace(/^./, c => c.toUpperCase()))} ${ANGKA.format(v)}</text>`).join("");
  const garis = seg.map(s => s.length === 1 ? `<circle class="al-gt" cx="${f(X(s[0][0]))}" cy="${f(Y(s[0][1]))}" r="2.5"/>` : `<polyline class="al-gs" points="${s.map(t => f(X(t[0])) + "," + f(Y(t[1]))).join(" ")}"/>`).join("");
  const akhir = semua.at(-1), lebar = Math.max(2, (W - L - R) / semua.length), besaran = namaBesaran(d.kunci || "");
  const kolom = semua.map(t => `<rect class="al-gh" x="${f(Math.max(L, X(t[0]) - lebar / 2))}" y="${T}" width="${f(lebar)}" height="${H - T - B}" data-tip="${esc(`<b>${waktuTeks(t[0])}</b><br>${besaran}: ${ANGKA.format(t[1])}${sat ? " " + sat : ""}`)}"/>`).join("");
  return `<svg class="al-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Grafik ${besaran.toLowerCase()} ${nama}, 24 jam terakhir, terakhir ${ANGKA.format(akhir[1])} ${sat} pada ${waktuTeks(akhir[0])}`)}">`
    + sumbuY + sumbuX + garisAmb + garis + `<circle class="al-gt al-gt-akhir" cx="${f(X(akhir[0]))}" cy="${f(Y(akhir[1]))}" r="3.5"/>` + kolom + `</svg>`;
}
const ringHtml = r => r && r.jumlah_pos != null ? `<p class="al-ring"><span><b>${r.jumlah_pos}</b> pos</span><span${r.di_atas_ambang ? ' class="al-atas"' : ""}><b>${r.di_atas_ambang}</b> di atas ambang</span><span><b>${r.terputus}</b> tanpa data terkini</span>${r.kamera != null ? `<span><b>${r.kamera}</b> kamera</span>` : ""}</p>` : "";
const gagalHtml = g => g.length ? `<p class="al-gagal">${g.map(s => `Sumber ${esc(SUMBER[s] ?? s)} gagal dimuat.`).join(" ")}</p>` : "";

const PER_HALAMAN = 12;
const nanti = f => requestAnimationFrame(() => setTimeout(f, 0));
const kunciTutup = b => "al-putus:" + b;
const hariIni = kini => new Date(kini + 7 * 3600e3).toISOString().slice(0, 10);

/* pasang(sebelum, bencana): sisipkan kartu "Pemantauan alat" tepat sebelum elemen `sebelum` (selektor atau elemen).
   Data dimuat saat tempatnya pertama terlihat (tab dibuka), bukan saat halaman dimuat. Tanpa kemampuan.alat atau tanpa sumber aktif: tidak dirender (U6). */
export function pasang(sebelum, bencana, {ambil = (u, o) => fetch(u, o)} = {}) {
  const ref = typeof sebelum === "string" ? document.querySelector(sebelum) : sebelum;
  if (!ref) return Promise.resolve(null);
  return new Promise(selesai => {
    const mulai = () => muat(ref, bencana, ambil).then(selesai, e => { console.error("pantau_alat", e); selesai(null); });
    if (typeof IntersectionObserver !== "function") return mulai();
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { io.disconnect(); mulai(); } });
    io.observe(ref);
  });
}

async function muat(ref, bencana, ambil) {
  const reg = await ambil("/bencana.json").then(r => r.ok ? r.json() : null).catch(() => null);
  const alat = reg?.bencana?.find(b => b.id === bencana && b.status !== "mati")?.kemampuan?.alat;
  if (!alat?.sumber?.length) return null;
  let d;
  try { const r = await ambil(`/api/alat/pos?bencana=${encodeURIComponent(bencana)}`); if (!r.ok) throw new Error("status " + r.status); d = await r.json(); }
  catch (e) { d = {pos: [], gagal: [...alat.sumber]}; }
  const daftar = Array.isArray(d.pos) ? d.pos : [], gagalS = Array.isArray(d.gagal) ? d.gagal : [];
  if (!daftar.length && !gagalS.length) return null;
  const kini = Number.isFinite(d.dibuat) ? d.dibuat : Date.now();
  const r = d.ringkas ?? ringkasan(daftar, kini, {gagal: gagalS});
  const putus = daftar.filter(p => tingkat(p, kini)?.kode === "tanpa_data");
  let tutup = null; try { tutup = JSON.parse(localStorage.getItem(kunciTutup(bencana)) || "null"); } catch (e) {}
  const sudahDitutup = tutup?.tgl === hariIni(kini) && putus.every(p => tutup.ids?.includes(p.id));

  const w = document.createElement("div"); w.className = "wrap al-wrap";
  w.innerHTML = `<section class="ex ex-std al" aria-labelledby="al-jd-${esc(bencana)}"><header class="ex-hd"><span class="ex-ey">${IK.sensor}Peringatan dini</span>`
    + `<div class="ex-jd"><h3 id="al-jd-${esc(bencana)}">${IK.alat} Pemantauan alat</h3></div></header><div class="ex-bd">`
    + (sudahDitutup ? "" : putusHtml(putus, kini)) + ringHtml(r) + gagalHtml(gagalS)
    + (daftar.length ? `<div class="al-kisi">${daftar.slice(0, PER_HALAMAN).map(p => kartuHtml(p, kini)).join("")}</div>` : "")
    + (daftar.length > PER_HALAMAN ? `<button type="button" class="al-lagi" data-lagi>Tampilkan ${Math.min(PER_HALAMAN, daftar.length - PER_HALAMAN)} pos lagi</button>` : "")
    + `</div></section>`;
  ref.before(w);

  const kisi = w.querySelector(".al-kisi"), cache = new Map(); let tampil = PER_HALAMAN, ab = null;
  const tutupGrafik = () => { ab?.abort(); w.querySelector(".al-grafik")?.remove(); w.querySelectorAll("[data-grafik][aria-expanded=true]").forEach(b => b.setAttribute("aria-expanded", "false")); };
  w.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-tutup-putus")) {
      b.closest(".al-putus").remove();
      try { localStorage.setItem(kunciTutup(bencana), JSON.stringify({tgl: hariIni(kini), ids: putus.map(p => p.id)})); } catch (e) {}
      return;
    }
    if (b.hasAttribute("data-lagi")) {
      kisi.insertAdjacentHTML("beforeend", daftar.slice(tampil, tampil + PER_HALAMAN).map(p => kartuHtml(p, kini)).join(""));
      tampil += PER_HALAMAN; const sisa = daftar.length - tampil;
      if (sisa > 0) b.textContent = `Tampilkan ${Math.min(PER_HALAMAN, sisa)} pos lagi`; else b.remove();
      return;
    }
    if (b.hasAttribute("data-tutup-grafik")) { const id = b.closest(".al-grafik")?.dataset.id; tutupGrafik(); w.querySelector(`[data-grafik="${CSS.escape(id || "")}"]`)?.focus(); return; }
    const id = b.dataset.grafik; if (!id) return;
    const buka = b.getAttribute("aria-expanded") !== "true";
    tutupGrafik(); if (!buka) return;
    /* chrome urgent: tombol + cangkang grafik langsung; ambil dan gambar seri ditunda (INP) */
    const p = daftar.find(x => x.id === id), nama = p?.nama ?? id;
    b.setAttribute("aria-expanded", "true");
    const g = document.createElement("section"); g.className = "al-grafik"; g.dataset.id = id; g.setAttribute("aria-label", "Grafik 24 jam " + nama);
    g.innerHTML = `<header><h4>${esc(nama)}</h4><span>24 jam terakhir</span><button type="button" class="al-ik" data-tutup-grafik aria-label="Tutup grafik" title="Tutup">${IK.tutup}</button></header><div class="al-gr-isi" aria-live="polite"><p class="al-kosong">Memuat grafik…</p></div>`;
    b.closest(".al-kartu").after(g);
    const isi = g.querySelector(".al-gr-isi"), c = ab = new AbortController();
    const gambar = f => nanti(() => { if (!c.signal.aborted) isi.innerHTML = f(isi.clientWidth || 640); });
    const ada = cache.get(id);
    (ada && Date.now() - ada.t < 60e3 ? Promise.resolve(ada.d) : ambil(`/api/alat/seri?pos=${encodeURIComponent(id)}&jam=24`, {signal: c.signal}).then(r => { if (!r.ok) throw new Error("status " + r.status); return r.json(); })
      .then(dd => { cache.set(id, {t: Date.now(), d: dd}); return dd; }))
      .then(dd => gambar(lb => grafikSvg(p?.sumber === "sihka" && !dd.ambang ? {...dd, ambang: p.ambang} : dd, nama, lb)), e => { if (!c.signal.aborted) gambar(() => `<p class="al-kosong">Grafik gagal dimuat.</p>`); });
  });
  return w;
}
