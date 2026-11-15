/* BEKU: salinan validasi lama (sebelum KP-18b) public/pipa/formulir.js dan src/sippa_lapangan.js, HANYA untuk uji paritas (formulir_paritas.test.mjs). Jangan dipakai kode produksi; jangan disunting. */
import {MEDAN, MEDAN_INSPEKSI, URUTAN_WAKTU, KEDALAMAN_CM, JENIS_FASE2, MODA_JEJAK, TITIK_TEKANAN, JEJAK, hitungDebit} from "../../../public/pipa/formulir.js";
const dalam = (v, a, z) => typeof v === "number" && Number.isFinite(v) && v >= a && v <= z;
const n = v => Number(v).toLocaleString("id-ID");
const ada = v => v !== undefined && v !== null;

function cekMedan(m, v, opsi) {
  if (!ada(v)) return m.wajib ? "wajib diisi" : null;
  switch (m.tipe) {
    case "teks": case "json": {
      if (typeof v !== "string") return "harus berupa teks";
      if (m.tipe === "json") { try { JSON.parse(v); } catch { return "bukan JSON yang sah"; } }
      if (m.panjang && !m.panjang.includes(v.length)) return `panjang harus ${m.panjang.map(n).join(" atau ")} karakter`;
      if (m.min != null && v.length < m.min) return `minimal ${n(m.min)} karakter`;
      if (m.maks != null && v.length > m.maks) return `maksimal ${n(m.maks)} karakter`;
      return null;
    }
    case "pilihan": case "bool": {
      if (!m.pilihan.includes(v)) return `harus salah satu dari ${m.pilihan.map(String).join(", ")}`;
      if (m.nama === "kedalaman_cm" && KEDALAMAN_CM.lengan_dalam.includes(v) && !(opsi && opsi.lengan_dalam)) {
        return "kedalaman 150 cm atau lebih hanya untuk tugas lengan uji (lengan_dalam)";
      }
      return null;
    }
    default: {
      if (typeof v !== "number" || !Number.isFinite(v)) return "harus berupa angka";
      if ((m.tipe === "bulat" || m.tipe === "waktu") && !Number.isInteger(v)) return "harus bilangan bulat";
      if (m.min != null && (m.minEksklusif ? v <= m.min : v < m.min)) return m.maks != null
        ? `harus ${m.minEksklusif ? "lebih dari" : "antara"} ${n(m.min)}${m.minEksklusif ? " dan paling banyak" : " dan"} ${n(m.maks)}`
        : `minimal ${n(m.min)}`;
      if (m.maks != null && v > m.maks) return `harus antara ${n(m.min ?? 0)} dan ${n(m.maks)}`;
      return null;
    }
  }
}

/* Periksa satu butir kiriman klien. Mengembalikan {ok, galat:[{medan, pesan}]}; semua galat dikumpulkan.
   opsi.lengan_dalam: tugas boleh probe 150 sampai 500 cm. Medan di luar MEDAN ditolak (kolom server tidak dikirim klien). */
export function cekButirLama(jenis, butir, opsi = {}) {
  const galat = [];
  const ke = (medanNama, pesan) => { if (!galat.some(g => g.medan === medanNama)) galat.push({ medan: medanNama, pesan }); };
  const def = jenis === "inspeksi" ? MEDAN_INSPEKSI : Object.hasOwn(MEDAN, jenis) ? MEDAN[jenis] : null;
  if (!def) return { ok: false, galat: [{ medan: "jenis", pesan: `jenis butir tidak dikenal: ${String(jenis)}` }] };
  if (!butir || typeof butir !== "object" || Array.isArray(butir)) return { ok: false, galat: [{ medan: "butir", pesan: "butir harus berupa objek" }] };
  for (const k of Object.keys(butir)) if (!Object.hasOwn(def, k)) ke(k, "medan tidak dikenal");
  for (const m of Object.values(def)) { const p = cekMedan(m, butir[m.nama], opsi); if (p) ke(m.nama, p); }
  if (jenis === "log") {
    for (const [awal, akhir] of URUTAN_WAKTU) {
      if (Number.isInteger(butir[awal]) && Number.isInteger(butir[akhir]) && butir[akhir] < butir[awal]) {
        ke(akhir, `tidak boleh lebih awal dari ${def[awal].label.toLowerCase()}`);
      }
    }
    if (ada(butir.banjir_m3) && butir.jenis !== "banjir") ke("banjir_m3", "hanya untuk sesi jenis banjir");
  }
  if (jenis === "gerak" && butir.rencana !== 1 && !ada(butir.tiba) && !galat.some(g => g.medan === "rencana")) {
    ke("tiba", "wajib diisi untuk gerak langsung; hanya gerak terencana boleh tanpa waktu tiba");
  }
  return { ok: galat.length === 0, galat };
}
/* validasi klien butir fase 2: aturan sama dengan cekLapangan server; mengembalikan {ok, galat:[{medan,pesan}]} seperti cekButir */
export function cekFase2Lama(jenis, b) {
  const galat = [], ke = (medan, pesan) => galat.push({medan, pesan});
  if (!JENIS_FASE2.includes(jenis)) return {ok: false, galat: [{medan: "jenis", pesan: `jenis butir tidak dikenal: ${String(jenis)}`}]};
  if (!b || typeof b !== "object" || Array.isArray(b)) return {ok: false, galat: [{medan: "butir", pesan: "butir harus berupa objek"}]};
  const bom = (k) => { if (b[k] != null && !(Array.isArray(b[k]) && b[k].length <= 100 && b[k].every(x => typeof x === "string" && /^[A-Z]{1,4}-\d{1,6}$/.test(x)))) ke(k, "harus daftar kode BOM seperti P-101"); };
  if (b.petak_id != null && !(typeof b.petak_id === "string" && /^[A-Za-z0-9._ -]{1,40}$/.test(b.petak_id))) ke("petak_id", "1 sampai 40 karakter huruf, angka, titik, garis, spasi");
  if (jenis === "jejak") {
    if (!Array.isArray(b.titik) || b.titik.length < 2 || b.titik.length > JEJAK.maks) ke("titik", "harus 2 sampai 500 titik");
    else if (!b.titik.every(t => Array.isArray(t) && t.length === 3 && dalam(t[0], -11.5, 6.5) && dalam(t[1], 94.5, 141.5) && dalam(t[2], 1, 9e15))) ke("titik", "tiap titik harus [lintang, bujur, waktu] di dalam Indonesia");
    if (!MODA_JEJAK.some(m => m[0] === b.moda)) ke("moda", "harus jalan_kaki, perahu, atau kendaraan");
    return {ok: !galat.length, galat};
  }
  if (jenis !== "jejak" && !dalam(b.waktu, 1, 9e15)) ke("waktu", "wajib diisi");
  if (jenis === "periksa" && !(typeof b.langkah === "string" && /^[a-z0-9_]{2,40}$/.test(b.langkah))) ke("langkah", "2 sampai 40 karakter a-z, 0-9, garis bawah");
  if (jenis === "tekanan") { if (!TITIK_TEKANAN.some(t => t[0] === b.titik)) ke("titik", "harus pompa, manifold, atau lance"); if (!dalam(b.bar, 0, 25)) ke("bar", "harus antara 0 dan 25"); }
  if (jenis === "selesai") { bom("alat_kembali"); bom("alat_hilang"); }
  if (jenis === "sos" || jenis === "bor" || jenis === "debit") { if (!dalam(b.lat, -11.5, 6.5)) ke("lat", "di luar Indonesia"); if (!dalam(b.lon, 94.5, 141.5)) ke("lon", "di luar Indonesia"); }
  if (jenis === "sos" && b.pesan != null && !(typeof b.pesan === "string" && [...b.pesan].length <= 200)) ke("pesan", "paling banyak 200 karakter");
  if ((jenis === "selesai" || jenis === "bor") && b.catatan != null && !(typeof b.catatan === "string" && [...b.catatan].length <= (jenis === "bor" ? 200 : 500))) ke("catatan", `paling banyak ${jenis === "bor" ? 200 : 500} karakter`);
  if (jenis === "bor" && !dalam(b.kedalaman_cm, 0, 1500)) ke("kedalaman_cm", "harus antara 0 dan 1.500");
  if (jenis === "debit") {
    if (b.metode === "pelampung") { if (hitungDebit(b) == null) ke("lebar_m", "isi lebar, kedalaman, dan kecepatan dengan angka lebih dari 0"); }
    else if (b.metode === "ember") { if (hitungDebit(b) == null) ke("volume_l", "isi volume dan detik dengan angka lebih dari 0 (detik minimal 0,5)"); }
    else ke("metode", "harus pelampung atau ember");
  }
  const kenal = {periksa: ["langkah", "waktu", "petak_id"], sos: ["lat", "lon", "waktu", "pesan"], tekanan: ["titik", "bar", "waktu", "petak_id"], selesai: ["waktu", "alat_kembali", "alat_hilang", "catatan"],
    bor: ["petak_id", "lat", "lon", "kedalaman_cm", "waktu", "catatan"], debit: ["metode", "lat", "lon", "waktu", "lebar_m", "dalam_m", "kecepatan_ms", "volume_l", "detik"]}[jenis];
  for (const k of Object.keys(b)) if (k !== "id" && !kenal.includes(k)) ke(k, "medan tidak dikenal");
  return {ok: !galat.length, galat};
}
/* ---- src/sippa_lapangan.js lama ---- */
const HARI = 864e5, MELESET_MS = 600000;
const JENIS_LAP = ["periksa", "sos", "tekanan", "jejak", "selesai", "bor", "debit"];   // dikirim lewat /lapangan/kirim; 'foto' lewat /lapangan/foto
const TAHAP_FOTO = ["tiba", "pompa", "gelar", "injeksi", "selesai"];
const MAKS_DATA = 32768;
const RE_LANGKAH = /^[a-z0-9_]{2,40}$/, RE_PETAK = /^[A-Za-z0-9._ -]{1,40}$/, RE_BOM = /^[A-Z]{1,4}-\d{1,6}$/;
const adaS = (v, a, z) => typeof v === "number" && Number.isFinite(v) && v >= a && v <= z;
const lat = v => adaS(v, -11.5, 6.5), lon = v => adaS(v, 94.5, 141.5);   // kotak Indonesia, sama dengan MEDAN.log
const teks = (v, maks) => { if (v == null) return null; if (typeof v !== "string") return undefined; const t = v.normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "").trim(); return [...t].length <= maks ? t : undefined; };   // kontrol dan bidi dibuang (pemalsuan tampilan)
const waktuOK = (v, kini) => adaS(v, 1, 9e15) ? (v > kini - 30 * HARI && v <= kini + MELESET_MS ? Math.round(v) : kini) : null;
const r3 = x => Math.round(x * 1000) / 1000, r6 = x => Math.round(x * 1e6) / 1e6;
const g = galat => ({galat});
const petak = v => v == null ? null : typeof v === "string" && RE_PETAK.test(v) ? v : undefined;
const kodeDaftar = (v, nama) => {
  if (!Array.isArray(v) || v.length > 100) return g(`${nama} harus larik paling banyak 100 kode_bom`);
  if (!v.every(k => typeof k === "string" && RE_BOM.test(k))) return g(`${nama} berisi kode_bom tidak sah (contoh P-101)`);
  return {v: [...new Set(v)]};
};
const hitungDebitS = d => d.metode === "pelampung" ? r3(d.lebar_m * d.dalam_m * d.kecepatan_ms * 0.85 * 1000) : r3(d.volume_l / d.detik);

export function cekLapanganLama(jenis, b, kini) {
  const w = waktuOK(b.waktu, kini), p = petak(b.petak_id);
  if (jenis === "jejak") {
    if (!Array.isArray(b.titik) || b.titik.length < 2 || b.titik.length > 500) return g("titik harus larik 2 sampai 500 baris [lat, lon, ms]");
    if (!["jalan_kaki", "perahu", "kendaraan"].includes(b.moda)) return g("moda harus salah satu dari jalan_kaki, perahu, kendaraan");
    for (const t of b.titik) if (!Array.isArray(t) || t.length !== 3 || !lat(t[0]) || !lon(t[1]) || !adaS(t[2], 1, 9e15)) return g("tiap titik harus [lat, lon, ms] di dalam Indonesia");
    const titik = b.titik.map(t => [r6(t[0]), r6(t[1]), Math.round(t[2])]);
    return {data: {titik, moda: b.moda}, waktu: waktuOK(titik.at(-1)[2], kini) ?? kini};
  }
  if (w === null) return g("waktu harus milidetik epoch");
  if (p === undefined) return g("petak_id 1 sampai 40 karakter huruf, angka, titik, garis, spasi");
  const cat = (maks) => { const c = teks(b.catatan, maks); return c; };
  if (jenis === "periksa") {
    if (typeof b.langkah !== "string" || !RE_LANGKAH.test(b.langkah)) return g("langkah harus 2 sampai 40 karakter [a-z0-9_]");
    return {data: {langkah: b.langkah, waktu: w, ...(p ? {petak_id: p} : {})}, waktu: w};
  }
  if (jenis === "tekanan") {
    if (!["pompa", "manifold", "lance"].includes(b.titik)) return g("titik harus salah satu dari pompa, manifold, lance");
    if (!adaS(b.bar, 0, 25)) return g("bar harus angka 0 sampai 25");
    return {data: {titik: b.titik, bar: r3(b.bar), waktu: w, ...(p ? {petak_id: p} : {})}, waktu: w};
  }
  if (jenis === "selesai") {
    const k = kodeDaftar(b.alat_kembali ?? [], "alat_kembali"); if (k.galat) return k;
    const h = kodeDaftar(b.alat_hilang ?? [], "alat_hilang"); if (h.galat) return h;
    const c = cat(500); if (c === undefined) return g("catatan paling banyak 500 karakter");
    return {data: {waktu: w, alat_kembali: k.v, alat_hilang: h.v, ...(c ? {catatan: c} : {})}, waktu: w};
  }
  if (!lat(b.lat) || !lon(b.lon)) return g("lat dan lon harus di dalam Indonesia");
  const pos = {lat: r6(b.lat), lon: r6(b.lon)};
  if (jenis === "sos") {
    const m = teks(b.pesan, 200); if (m === undefined) return g("pesan paling banyak 200 karakter");
    return {data: {...pos, waktu: w, ...(m ? {pesan: m} : {})}, waktu: w};
  }
  if (jenis === "bor") {
    if (!adaS(b.kedalaman_cm, 0, 1500)) return g("kedalaman_cm harus angka 0 sampai 1500");
    const c = cat(200); if (c === undefined) return g("catatan paling banyak 200 karakter");
    return {data: {...pos, kedalaman_cm: r3(b.kedalaman_cm), waktu: w, ...(p ? {petak_id: p} : {}), ...(c ? {catatan: c} : {})}, waktu: w};
  }
  if (jenis === "debit") {
    let d;
    if (b.metode === "pelampung") {
      if (!adaS(b.lebar_m, 0.01, 500) || !adaS(b.dalam_m, 0.01, 50) || !adaS(b.kecepatan_ms, 0.01, 20)) return g("pelampung wajib lebar_m 0,01 sampai 500, dalam_m 0,01 sampai 50, kecepatan_ms 0,01 sampai 20");
      d = {metode: "pelampung", lebar_m: b.lebar_m, dalam_m: b.dalam_m, kecepatan_ms: b.kecepatan_ms};
    } else if (b.metode === "ember") {
      if (!adaS(b.volume_l, 0.01, 100000) || !adaS(b.detik, 0.5, 3600)) return g("ember wajib volume_l 0,01 sampai 100000 dan detik 0,5 sampai 3600");
      d = {metode: "ember", volume_l: b.volume_l, detik: b.detik};
    } else return g("metode harus pelampung atau ember");
    return {data: {...pos, ...d, debit_lps: hitungDebitS(d), waktu: w}, waktu: w};
  }
  return g("jenis tidak dikenal");
}
