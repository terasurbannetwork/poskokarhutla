/* SIPPA: layar Dashboard A/B /pipa/ab (PRD §9.4.7, DS §3.8 §4.8, SP-036). Kontrak router: pasang(akar, konteks) dan lepas().
   Logika murni (pemeriksa CSV, pengelompokan lengan, ringkasan, kartu vonis G4 dan vonis pilot, grafik SVG) ada di atas dan diuji tanpa DOM; DOM dan jaringan di bawah.
   Rumus tidak ditulis ulang di sini: Welch, Agresti-Caffo, vonisG4, vonisPilot semuanya dari hitung.js. Data pilot TIDAK PERNAH diberi vonis G4 (vonisG4 mengembalikan vonis null);
   vonis pilot "dapat dipakai" tampil di kartu terpisah. Butuh global public/inti: fmt, esc, jamWIB, paginasi, nanti. Tanpa toFixed; semua teks data lewat esc. */
import {vonisG4, vonisPilot, KONST} from "./hitung.js";
import {peranKlien} from "./layar_kit.js";
import {bahanPilot, barisProbe, RENTANG_PILOT} from "./layar_laporan.js";
import {memuat, kosong, galat, menunggu} from "./keadaan.js";

/* ---------- konstanta: sama dengan CHECK dan pemeriksa server (src/sippa.js KOLOM_AB, LENGAN) ---------- */
export const LENGAN_AB = [["konvensional", "Konvensional"], ["lance", "Lance"], ["lance_surfaktan", "Lance + surfaktan"], ["sekat_rewetting", "Sekat kanal atau rewetting"], ["lance_dalam", "Lance dalam"]];
export const KOLOM_CSV = ["petak_id", "aoi", "prov", "lengan", "pasangan_id", "tanggal_perlakuan", "luas_m2", "regu_hari", "air_m3", "surfaktan_l", "biaya_rp", "dingin_24j", "dingin_72j", "nyala_7h", "nyala_30h", "nyala_90h", "catatan"];
export const WAJIB_CSV = ["petak_id", "aoi", "lengan", "tanggal_perlakuan", "luas_m2"];
export const BATAS_CSV = {byte: 1048576, baris: 2000, potong: 500, galatTampil: 50, galatSimpan: 200};
const NAMA_LENGAN = Object.fromEntries(LENGAN_AB), RE_PROV = /^\d{2}$/, ID16 = /^[0-9a-f]{16}$/;
const HARI = ["nyala_7h", "nyala_30h", "nyala_90h"];
/* pil keyakinan: semua angka efikasi hipotesis sampai evaluator independen meninjau (status unggahan, PRD §9.4.7) */
export const PIL_HIPOTESIS = "Hipotesis sampai evaluator independen meninjau dan menandatangani; belum bukti efektivitas";

const ada = v => v != null && String(v).trim() !== "";
const pctBulat = r => `${r > 0 ? "+" : r < 0 ? "-" : ""}${fmt(Math.abs(Math.round(r * 100)))}%`;
const pct = r => r == null ? "–" : `${fmt(Math.round(r * 1000) / 10)}%`;
const rp = v => v == null ? "–" : v >= 1e9 ? `Rp${fmt(Math.round(v / 1e8) / 10)} miliar` : v >= 1e6 ? `Rp${fmt(Math.round(v / 1e5) / 10)} juta` : `Rp${fmt(Math.round(v))}`;
const tglPendek = ms => ms == null ? "–" : new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"});
const pilYakin = (teks, kelas, judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;
const sumberBaris = (per, isi = "SIPPA D1 (sippa_petak, unggahan CSV)") => `<p class="ad-catat sp-sumber">Sumber: ${esc(isi)}, per ${per == null ? "–" : esc(jamWIB(per))}</p>`;

/* ================= pemeriksa CSV sisi klien (DS §3.8 "ditolak klien"); aturan sama dengan cekBarisAb di server ================= */
export function uraiCsv(teks, pisah) {
  const baris = []; let sel = "", r = [], kutip = false, ada_ = false;
  const tutupSel = () => { r.push(sel); sel = ""; ada_ = true; };
  const tutupBaris = () => { tutupSel(); if (r.length > 1 || r[0].trim() !== "") baris.push(r); r = []; ada_ = false; };
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (kutip) { if (c === '"') { if (teks[i + 1] === '"') { sel += '"'; i++; } else kutip = false; } else sel += c; }
    else if (c === '"' && sel === "") kutip = true;
    else if (c === pisah) tutupSel();
    else if (c === "\n") tutupBaris();
    else if (c === "\r") { if (teks[i + 1] === "\n") i++; tutupBaris(); }
    else sel += c;
  }
  if (kutip) return {galat: "Tanda kutip tidak tertutup."};
  if (ada_ || sel !== "") tutupBaris();
  return {baris};
}
const tanggalSah = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;

/* satu baris -> {v} atau {salah: [{kolom, alasan}]}; alasan berbahasa Indonesia untuk tabel galat */
export function cekBarisCsv(b, hariIni, komaDesimal) {
  const salah = [], v = {}, tambah = (kolom, alasan) => salah.push({kolom, alasan});
  const angka = (k, min, maks, bulat) => {
    let s = (b[k] ?? "").trim(); if (s === "") return null; if (komaDesimal) s = s.replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(s)) { tambah(k, "Harus angka."); return null; }
    const n = Number(s); if (bulat && !Number.isInteger(n)) { tambah(k, "Harus bilangan bulat."); return null; }
    if (n < min || n > maks) { tambah(k, `Harus ${fmt(min)} sampai ${fmt(maks)}.`); return null; } return n;
  };
  const tf = k => { const s = (b[k] ?? "").trim(); if (s === "") return null; if (s !== "0" && s !== "1") { tambah(k, "Harus 0, 1, atau kosong."); return null; } return Number(s); };
  const teks = (k, min, maks, wajib) => { const s = (b[k] ?? "").normalize("NFC").trim(); if (s === "") { if (wajib) tambah(k, "Wajib diisi."); return null; } if (s.length < min || s.length > maks) { tambah(k, `Harus ${fmt(min)} sampai ${fmt(maks)} huruf.`); return null; } return s; };
  v.petak_id = teks("petak_id", 3, 40, true); v.aoi = teks("aoi", 1, 40, true); v.pasangan_id = teks("pasangan_id", 1, 40, false); v.catatan = teks("catatan", 1, 500, false);
  const prov = (b.prov ?? "").trim(); if (prov !== "" && !RE_PROV.test(prov)) tambah("prov", "Harus kode provinsi 2 digit."); v.prov = prov === "" ? null : prov;
  const lengan = (b.lengan ?? "").trim(); if (!LENGAN_AB.some(([k]) => k === lengan)) tambah("lengan", `Harus salah satu dari ${LENGAN_AB.map(([k]) => k).join(", ")}.`); v.lengan = lengan;
  const t = (b.tanggal_perlakuan ?? "").trim();
  if (!tanggalSah(t)) tambah("tanggal_perlakuan", "Harus tanggal YYYY-MM-DD yang nyata."); else if (t > hariIni) tambah("tanggal_perlakuan", "Tidak boleh lebih dari hari ini."); v.tanggal_perlakuan = t;
  v.luas_m2 = angka("luas_m2", 1, 100000); if (v.luas_m2 === null && !salah.some(s => s.kolom === "luas_m2")) tambah("luas_m2", "Wajib diisi.");
  v.regu_hari = angka("regu_hari", 0, 1000); v.air_m3 = angka("air_m3", 0, 100000); v.surfaktan_l = angka("surfaktan_l", 0, 1e9) ?? 0; v.biaya_rp = angka("biaya_rp", 0, Number.MAX_SAFE_INTEGER, true);
  if (v.surfaktan_l > 0 && v.lengan !== "lance_surfaktan") tambah("surfaktan_l", "Lebih dari 0 hanya untuk lengan lance_surfaktan.");
  for (const k of ["dingin_24j", "dingin_72j", ...HARI]) v[k] = tf(k);
  return salah.length ? {salah} : {v};
}

/* periksaCsv(teks, hariIni, {tunda}) -> {galat: [{baris, kolom, alasan}], nGalat, petak, nBaris, nLengan, nAoi, pisah, kepalaSalah}
   baris data diperiksa per potongan BATAS_CSV.potong; tunda() dipanggil di antara potongan (di peramban = nanti, supaya > 500 baris tidak membekukan layar, INP) */
export async function periksaCsv(teks, hariIni, {tunda = async () => {}} = {}) {
  const galat_ = [], keluar = (x = {}) => ({galat: galat_, nGalat: galat_.length, petak: [], nBaris: 0, nLengan: 0, nAoi: 0, pisah: ",", kepalaSalah: false, ...x});
  const tolak = (baris, kolom, alasan) => galat_.push({baris, kolom, alasan});
  const byte = new TextEncoder().encode(teks).length;
  if (byte > BATAS_CSV.byte) { tolak(0, "berkas", `Berkas ${fmt(Math.round(byte / 1024))} KB, batas ${fmt(BATAS_CSV.byte / 1048576)} MB.`); return keluar({kepalaSalah: true, nGalat: 1}); }
  teks = String(teks).replace(/^﻿/, "");
  if (!teks.trim()) { tolak(0, "berkas", "Berkas kosong."); return keluar({kepalaSalah: true, nGalat: 1}); }
  const kepala = teks.split(/\r?\n/, 1)[0], pisah = (kepala.match(/;/g) || []).length > (kepala.match(/,/g) || []).length ? ";" : ",";
  const c = uraiCsv(teks, pisah);
  if (c.galat) { tolak(0, "berkas", c.galat); return keluar({kepalaSalah: true, nGalat: 1, pisah}); }
  const [kol, ...isi] = c.baris, nama = kol.map(k => k.trim());
  const kurang = WAJIB_CSV.filter(k => !nama.includes(k)), asing = nama.filter(k => !KOLOM_CSV.includes(k));
  kurang.forEach(k => tolak(1, k, "Kolom wajib tidak ada di baris kepala.")); asing.forEach(k => tolak(1, k, "Kolom tidak dikenal. Pakai templat CSV."));
  if (new Set(nama).size !== nama.length) tolak(1, "kepala", "Ada nama kolom yang muncul dua kali.");
  if (galat_.length) return keluar({kepalaSalah: true, pisah, nGalat: galat_.length});
  if (!isi.length) { tolak(0, "berkas", "Berkas tidak punya baris data."); return keluar({kepalaSalah: true, pisah, nGalat: 1}); }
  if (isi.length > BATAS_CSV.baris) { tolak(0, "berkas", `Paling banyak ${fmt(BATAS_CSV.baris)} baris data (dikirim ${fmt(isi.length)}).`); return keluar({kepalaSalah: true, pisah, nGalat: 1}); }
  const petak = [], lihat = new Set(); let nGalat = 0;
  for (let a = 0; a < isi.length; a += BATAS_CSV.potong) {
    if (a > 0) await tunda();
    isi.slice(a, a + BATAS_CSV.potong).forEach((f, j) => {
      const no = a + j + 2, b = Object.fromEntries(nama.map((k, i) => [k, f[i] ?? ""])), x = cekBarisCsv(b, hariIni, pisah === ";");
      let salah = x.salah ?? [];
      if (f.length > nama.length) salah = [...salah, {kolom: "kepala", alasan: "Jumlah kolom lebih banyak dari baris kepala."}];
      if (x.v) { const k = `${x.v.aoi}\u001f${x.v.petak_id}`; if (lihat.has(k)) salah = [...salah, {kolom: "petak_id", alasan: "Petak ini muncul dua kali untuk AOI yang sama."}]; lihat.add(k); }
      if (salah.length) { nGalat++; for (const s of salah) if (galat_.length < BATAS_CSV.galatSimpan) tolak(no, s.kolom, s.alasan); } else petak.push(x.v);
    });
  }
  if (nGalat) return keluar({pisah, nGalat, nBaris: isi.length});
  return keluar({petak, pisah, nBaris: isi.length, nLengan: new Set(petak.map(p => p.lengan)).size, nAoi: new Set(petak.map(p => p.aoi)).size});
}

/* ================= pengelompokan dan ringkasan ================= */
const ha = p => p.luas_m2 / 10000;
const jumlahHa = ps => ps.reduce((s, p) => s + ha(p), 0);
/* air m3 per ha: hanya petak yang mencatat air_m3 (null bukan nol) dan luasnya sendiri */
export function airPerHa(ps) {
  const a = ps.filter(p => typeof p.air_m3 === "number"), h = jumlahHa(a);
  return a.length && h > 0 ? a.reduce((s, p) => s + p.air_m3, 0) / h : null;
}
export const daftarAoi = petak => [...new Set(petak.map(p => p.aoi))].sort();
export function kelompokkan(petak, aoi = null) {
  const g = Object.fromEntries(LENGAN_AB.map(([k]) => [k, []]));
  for (const p of petak) if (Object.hasOwn(g, p.lengan) && (aoi == null || p.aoi === aoi)) g[p.lengan].push(p);
  return g;
}
/* arm uji = pil "lengan uji" (DS §4.8): lance_dalam, kedalaman 3-5 m */
export const lenganUji = k => k === "lance_dalam";

/* satu baris per lengan non-konvensional: vonis G4 dari hitung.js lawan konvensional; status keyakinan dari unggahan petaknya */
export function ringkasAb(petak, {aoi = null, unggah = []} = {}) {
  const g = kelompokkan(petak, aoi), konv = g.konvensional, status = new Map(unggah.map(u => [u.id, u.status]));
  const ditinjau = ps => ps.length > 0 && ps.every(p => status.get(p.unggah_id) === "ditinjau_evaluator");
  const lengan = LENGAN_AB.filter(([k]) => k !== "konvensional").map(([k, nama]) => {
    const ps = g[k], v = vonisG4(ps, konv);
    return {kunci: k, nama, uji: lenganUji(k), n: ps.length, dummy: ps.some(x => x.dummy === 1 || x.dummy === true), g4: v, air_per_ha: airPerHa(ps), biaya_tanpa_capex: v.biaya_per_ha?.lengan ?? null, ada: ps.length > 0,
      keyakinan: ditinjau(ps) && ditinjau(konv) ? "ditinjau-evaluator" : "hipotesis"};
  });
  return {konv: {n: konv.length, air_per_ha: airPerHa(konv), biaya_tanpa_capex: lengan.find(l => l.g4.biaya_per_ha)?.g4.biaya_per_ha.konv ?? null}, lengan, g,
    pilot: lengan.some(l => l.g4.pilot), dummy: petak.some(p => p.dummy === 1 || p.dummy === true), n: petak.length};
}

/* ---------- kata vonis ---------- */
export const KATA_G4 = {"LULUS": {kelas: "lulus", teks: "LULUS"}, "TIDAK LULUS": {kelas: "tidak", teks: "TIDAK LULUS"}, "BELUM BISA DIPUTUS": {kelas: "belum", teks: "BELUM BISA DIPUTUS"}};
export const KATA_PILOT = {"DAPAT DIPAKAI": "dapat", "DAPAT DIPAKAI BERSYARAT": "syarat", "BELUM DAPAT DIPAKAI": "belum-dapat"};
/* data pilot: tanpa vonis G4 (g4.vonis null) -> kata tetap "TIDAK DIVONIS", bukan salah satu dari tiga nilai G4 */
export const kataLengan = g4 => g4.vonis == null ? {kelas: "pilot", teks: "TIDAK DIVONIS, DATA PILOT"} : KATA_G4[g4.vonis];

/* "+34% ha dingin per regu-hari, selang 12% sampai 56%, n 10": selang relatif terhadap rerata konvensional (selisih / rel = rerata konvensional) */
export function kalimatEfek(g4) {
  const e = g4.efikasi_y;
  if (g4.vonis == null) return `Hasil pilot, n kecil: ${fmt(g4.n_lengan)} petak lengan dan ${fmt(g4.n_konv)} petak konvensional. Tidak dipakai untuk vonis G4.`;
  if (!e || e.selisih == null || e.rel == null) return `n ${fmt(g4.n_lengan)} petak lengan, ${fmt(g4.n_konv)} konvensional; ha dingin per regu-hari belum bisa dibandingkan.`;
  const dasar = e.rel !== 0 ? e.selisih / e.rel : null, ci = dasar && e.ci ? e.ci.map(x => x / dasar) : null;
  return `${pctBulat(e.rel)} ha dingin per regu-hari${ci ? `, selang 95% ${pctBulat(ci[0])} sampai ${pctBulat(ci[1])}` : ""}, n ${fmt(e.n_lengan)} lawan ${fmt(e.n_konv)}.`;
}
export const alasanLengan = g4 => (g4.alasan || []).join("; ");
/* ukuran yang membuat vonis: selisih ha dingin per regu-hari (relatif >= efek_min dan batas bawah selang di atas nol) dan nyala ulang per hari, dibaca dari keluaran vonisG4 */
export function dasarVonis(g4) {
  if (g4.vonis == null) return [];
  const d = [], y = g4.efikasi_y;
  if (y && y.rel != null && y.ci && y.rel >= KONST.efek_min && y.ci[0] > 0) d.push("ha dingin per regu-hari");
  for (const h of [7, 30, 90]) if (g4.nyala?.[h]?.lulus) d.push(`nyala ulang ${h} hari`);
  return d;
}

/* ================= HTML ================= */
const td = (label, isi, n) => `<td${n ? ' class="n"' : ""} data-label="${label}">${isi}</td>`;

export function kartuLenganHtml(r) {
  const k = kataLengan(r.g4), pil = r.g4.vonis == null ? pilYakin("pilot, n kecil", "asumsi-kebijakan", "Data pilot Oktober 2026, tidak dipakai untuk vonis G4")
    : r.keyakinan === "hipotesis" ? pilYakin("hipotesis", "hipotesis", PIL_HIPOTESIS) : pilYakin("ditinjau evaluator", "terverifikasi", "Unggahan sudah ditandai ditinjau evaluator independen");
  if (!r.ada) return `<article class="sp-lk sp-lk-ab"><header class="sp-lk-hd"><div><h3>${esc(r.nama)}</h3></div></header><div class="sp-lk-bd"><p class="ad-kosong">Belum ada petak untuk lengan ini.</p></div></article>`;
  return `<article class="sp-lk sp-lk-ab" aria-labelledby="sp-ab-${esc(r.kunci)}"><header class="sp-lk-hd"><div><h3 id="sp-ab-${esc(r.kunci)}">${esc(r.nama)}</h3></div></header>`
    + `<div class="sp-lk-bd"><div class="sp-pil-baris">${pil}${r.dummy ? pilYakin("dummy, peragaan", "asumsi-kebijakan", "Baris dummy Super Admin: vonis dihitung dari data peragaan, bukan hasil lapangan") : ""}${r.uji ? pilYakin("lengan uji", "asumsi-kebijakan", "Injeksi 3 sampai 5 m diperlakukan sebagai lengan uji, bukan baku") : ""}</div>`
    + `<p class="sp-vonis-ab ${k.kelas}"><span class="sp-vonis-teks">${esc(k.teks)}</span></p>`
    + `<p class="sp-lk-isi">${esc(kalimatEfek(r.g4))}</p>${r.g4.alasan?.length && r.g4.vonis != null ? `<p class="ad-catat">${esc(alasanLengan(r.g4))}</p>` : r.g4.vonis === "LULUS" && dasarVonis(r.g4).length ? `<p class="ad-catat">Dasar: ${esc(dasarVonis(r.g4).join(", "))}; biaya per ha dalam batas ${esc(fmt(KONST.biaya_maks_rasio))} kali konvensional.</p>` : ""}</div></article>`;
}

/* kartu vonis pilot (keputusan 53): tujuh butir, tiga nilai; butir null = "data belum lengkap". Terpisah dari G4 dan selalu berpil. */
const TEKS_BUTIR = {true: "lulus", false: "gagal", null: "data belum lengkap"};
export function nilaiButirPilot(b) {
  const n = b.nilai;
  if (b.lulus === null && b.no !== 5) return "";
  switch (b.no) {
    case 1: return n ? `${fmt(n.sesi)} sesi, ${fmt(n.petak)} petak` : "";
    case 2: return n == null ? "" : `${fmt(Math.round(n * 10) / 10)} jam`;
    case 3: return n ? `${fmt(n.bar)} bar, ${fmt(n.menit)} menit${n.sumber ? ` (${n.sumber})` : ""}` : "";
    case 5: return n == null ? "" : pct(n) + (b.petak_tanpa_probe?.length ? `; petak tanpa probe: ${b.petak_tanpa_probe.join(", ")}` : "");
    case 6: return n ? `${fmt(n.kecelakaan)} kecelakaan${n.henti_lebih_30 ? ", henti bocor lebih dari 30 menit" : ""}` : "";
    case 7: return n == null ? "" : pct(n);
    default: return "";
  }
}
export function kartuPilotHtml(v, per) {
  const kelas = KATA_PILOT[v.vonis] ?? "belum-dapat";
  const butir = v.butir.map(b => `<li><span class="sp-butir-no num">${esc(b.no)}</span><span class="sp-butir-isi">${esc(b.alasan)}</span><span class="sp-butir-status ${b.lulus === true ? "lulus" : b.lulus === false ? "gagal" : "belum"}">${esc(TEKS_BUTIR[b.lulus])}</span><span class="sp-butir-nilai">${esc(nilaiButirPilot(b))}</span></li>`).join("");
  return `<article class="sp-lk sp-lk-pilot" aria-labelledby="sp-pilot-h"><header class="sp-lk-hd"><span class="ad-ey">Keputusan 53</span><div><h3 id="sp-pilot-h">Vonis pilot Oktober 2026</h3></div></header>`
    + `<div class="sp-lk-bd"><div class="sp-pil-baris">${pilYakin("pilot, n kecil", "asumsi-kebijakan")}${pilYakin("asumsi-kebijakan", "asumsi-kebijakan", "Tujuh butir adalah kebijakan, bukan hasil model")}</div>`
    + `<p class="sp-vonis-ab ${kelas}"><span class="sp-vonis-teks">${esc(v.vonis)}</span></p><ol class="sp-butir">${butir}</ol>`
    + `<p class="ad-catat">Vonis "lebih baik dari konvensional" tidak diputus dari pilot (n kurang dari ${esc(fmt(KONST.n_min_putus))} per lengan).</p>${sumberBaris(per, "SIPPA D1 (sippa_log_gelar, sippa_probe, sippa_komponen), keputusan 53")}</div></article>`;
}

/* tabel Lengan | n | Air m3/ha | Biaya/ha (tanpa dan dengan CAPEX) | Vonis; biaya dengan CAPEX menunggu CAPEX dari Studio (G09), tidak diisi tebakan */
export function tabelLenganHtml(ring, per) {
  const baris = [{kunci: "konvensional", nama: "Konvensional", n: ring.konv.n, air_per_ha: ring.konv.air_per_ha, biaya_tanpa_capex: ring.konv.biaya_tanpa_capex, g4: null}, ...ring.lengan];
  const isi = baris.map(r => td("Lengan", `<b>${esc(r.nama)}</b>${r.g4 == null ? `<span class="sp-sub">pembanding</span>` : ""}`) + td("Petak", esc(fmt(r.n)), true) + td("Air m3 per ha", r.air_per_ha == null ? "–" : esc(fmt(r.air_per_ha)), true)
    + td("Biaya per ha dingin, tanpa CAPEX", r.biaya_tanpa_capex == null ? "–" : esc(rp(r.biaya_tanpa_capex)), true)
    + td("Biaya per ha dingin, dengan CAPEX teramortisasi", `<span class="sp-yakin menunggu" title="CAPEX kit dari Studio (G09) belum dihubungkan ke layar ini">menunggu</span>`)
    + td("Vonis", r.g4 == null ? "–" : r.ada === false ? "–" : `<span class="sp-vonis-ab kecil ${kataLengan(r.g4).kelas}">${esc(kataLengan(r.g4).teks)}</span>`)).map(c => `<tr>${c}</tr>`).join("");
  return `<div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-ab"><caption class="sr">Ringkasan per lengan</caption><thead><tr>${["Lengan", "Petak", "Air m3 per ha", "Biaya per ha dingin, tanpa CAPEX", "Biaya per ha dingin, dengan CAPEX teramortisasi", "Vonis"].map(k => `<th scope="col">${esc(k)}</th>`).join("")}</tr></thead><tbody>${isi}</tbody></table></div>`
    + `<p class="ad-catat">Ha dingin terverifikasi = petak seluas luas_m2 dengan semua probe dingin pada 72 jam dan tanpa nyala ulang 30 hari. Biaya per ha = jumlah biaya_rp dibagi ha dingin.</p>${sumberBaris(per)}`;
}

/* ---------- grafik (SVG, warna lewat kelas CSS) ---------- */
export function titikPerLengan(ring) {
  const y = p => p.regu_hari > 0 ? (p.dingin_72j === 1 && p.nyala_30h === 0 ? ha(p) : 0) / p.regu_hari : null;
  return LENGAN_AB.map(([k, nama]) => {
    const ys = ring.g[k].map(y).filter(v => v != null), n = ys.length, m = n ? ys.reduce((s, v) => s + v, 0) / n : null;
    const g4 = k === "konvensional" ? null : ring.lengan.find(l => l.kunci === k)?.g4;
    let ci = null;
    if (g4?.efikasi_y?.ci && m != null && g4.efikasi_y.selisih != null && ring.konv.n) { const konvY = ring.g.konvensional.map(y).filter(v => v != null); const mk = konvY.length ? konvY.reduce((s, v) => s + v, 0) / konvY.length : null; if (mk != null) ci = g4.efikasi_y.ci.map(x => mk + x); }
    return {kunci: k, nama, ys, rerata: m, ci, uji: lenganUji(k)};
  });
}
export function grafikTitikHtml(ring) {
  const d = titikPerLengan(ring), semua = d.flatMap(x => [...x.ys, ...(x.ci ?? [])]);
  if (!semua.length) return `<p class="ad-kosong">Belum ada petak dengan regu-hari tercatat untuk digambar.</p>`;
  const W = 720, H = 52 + d.length * 34, L = 150, R = 16, T = 14, B = 34, ymaks = Math.max(...semua, 0.0001), X = v => L + (W - L - R) * Math.max(0, v) / ymaks, Y = i => T + 18 + i * 34;
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ha dingin terverifikasi 30 hari per regu-hari, satu titik per petak, garis rerata dan selang kepercayaan 95% selisih terhadap konvensional">`;
  for (let i = 0; i <= 4; i++) { const v = ymaks * i / 4; s += `<line class="sp-sumbu" x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H - B}"/><text class="sp-teks" x="${X(v)}" y="${H - 14}" text-anchor="middle">${fmt(Math.round(v * 100) / 100)}</text>`; }
  d.forEach((x, i) => {
    s += `<text class="sp-teks sp-kuat" x="${L - 8}" y="${Y(i) + 4}" text-anchor="end">${esc(x.nama)}</text>`;
    if (x.ci) s += `<line class="sp-ci" x1="${X(x.ci[0])}" x2="${X(x.ci[1])}" y1="${Y(i)}" y2="${Y(i)}"><title>Selang 95%: ${esc(fmt(Math.round(x.ci[0] * 100) / 100))} sampai ${esc(fmt(Math.round(x.ci[1] * 100) / 100))} ha per regu-hari</title></line>`;
    x.ys.forEach((v, j) => { s += `<circle class="sp-titik${x.kunci === "konvensional" ? " pembanding" : ""}" cx="${X(v)}" cy="${Y(i) + ((j % 3) - 1) * 5}" r="3.5"><title>${esc(x.nama)}: ${esc(fmt(Math.round(v * 100) / 100))} ha per regu-hari</title></circle>`; });
    if (x.rerata != null) s += `<line class="sp-rerata" x1="${X(x.rerata)}" x2="${X(x.rerata)}" y1="${Y(i) - 12}" y2="${Y(i) + 12}"><title>Rerata ${esc(fmt(Math.round(x.rerata * 100) / 100))} ha per regu-hari</title></line>`;
  });
  return s + "</svg>";
}
/* nyala ulang per lengan dan hari: proporsi petak yang menyala; null bila tidak ada petak berdata */
export function nyalaPerLengan(ring) {
  return LENGAN_AB.map(([k, nama]) => ({kunci: k, nama, hari: [7, 30, 90].map(h => { const a = ring.g[k].map(p => p[`nyala_${h}h`]).filter(v => v === 0 || v === 1); return a.length ? {p: a.reduce((s, v) => s + v, 0) / a.length, n: a.length} : null; })}));
}
export function grafikBatangHtml(ring) {
  const d = nyalaPerLengan(ring);
  if (!d.some(x => x.hari.some(Boolean))) return `<p class="ad-kosong">Belum ada petak dengan hasil nyala ulang tercatat.</p>`;
  const W = 720, H = 240, L = 44, R = 12, T = 14, B = 52, lebar = (W - L - R) / d.length, bw = Math.min(20, (lebar - 12) / 3), Y = p => T + (H - T - B) * (1 - p);
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Nyala ulang 7, 30, dan 90 hari per lengan, persen petak">`;
  for (const p of [0, .25, .5, .75, 1]) s += `<line class="sp-sumbu" x1="${L}" x2="${W - R}" y1="${Y(p)}" y2="${Y(p)}"/><text class="sp-teks" x="${L - 6}" y="${Y(p) + 4}" text-anchor="end">${fmt(p * 100)}%</text>`;
  d.forEach((x, i) => {
    const x0 = L + i * lebar + (lebar - bw * 3 - 8) / 2;
    s += `<text class="sp-teks sp-kuat" x="${L + i * lebar + lebar / 2}" y="${H - 28}" text-anchor="middle">${esc(x.nama.length > 16 ? x.nama.split(/ |,/)[0] : x.nama)}</text>`;
    x.hari.forEach((h, j) => {
      if (!h) return;
      s += `<rect class="sp-batang h${j}" x="${x0 + j * (bw + 4)}" y="${Y(h.p)}" width="${bw}" height="${Math.max(1, Y(0) - Y(h.p))}"><title>${esc(x.nama)}, ${[7, 30, 90][j]} hari: ${esc(pct(h.p))} dari ${esc(fmt(h.n))} petak</title></rect>`;
    });
  });
  return s + `</svg><span class="ex-leg"><span><i class="sp-pj sp-batang-h0"></i>7 hari</span><span><i class="sp-pj sp-batang-h1"></i>30 hari</span><span><i class="sp-pj sp-batang-h2"></i>90 hari</span></span>`;
}

/* ---------- unggah ---------- */
export function zonaUnggahHtml(peran) {
  if (peran !== "W" && peran !== "M") return `<p class="ad-spanduk sp-unggah-baca" role="status">Unggah hanya untuk perencana.</p>`;
  return `<div class="sp-unggah-hp ad-spanduk" role="status">Unggah dari laptop.</div><label class="sp-unggah" for="sp-ab-berkas"><span class="sp-unggah-teks">Tarik berkas CSV ke sini atau pilih berkas</span><span class="ad-tombol">Pilih berkas</span>`
    + `<input id="sp-ab-berkas" class="sr" type="file" accept=".csv,text/csv"></label><p class="ad-catat">Batas: 1 MB, ${esc(fmt(BATAS_CSV.baris))} baris, UTF-8, pemisah koma atau titik koma. <a href="#" data-templat>Unduh templat CSV</a></p><div class="sp-unggah-hasil" aria-live="polite"></div>`;
}
export function pratinjauHtml(h, nama, ukuran) {
  const isi = h.petak.slice(0, 10).map(p => `<tr>${td("Petak", esc(p.petak_id))}${td("AOI", esc(p.aoi))}${td("Lengan", esc(NAMA_LENGAN[p.lengan] ?? p.lengan))}${td("Tanggal", esc(p.tanggal_perlakuan))}${td("Luas m2", esc(fmt(p.luas_m2)), true)}</tr>`).join("");
  return `<p class="sp-berkas"><b>${esc(nama)}</b> <span class="ad-catat">${esc(fmt(Math.max(1, Math.round(ukuran / 1024))))} KB</span></p>`
    + `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Sepuluh baris pertama</caption><thead><tr>${["Petak", "AOI", "Lengan", "Tanggal", "Luas m2"].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${isi}</tbody></table></div>`
    + `<p>${esc(fmt(h.nBaris))} baris, ${esc(fmt(h.nLengan))} lengan, ${esc(fmt(h.nAoi))} AOI.</p><div class="sp-aksi"><button type="button" class="ad-tombol utama" data-unggah>Unggah ${esc(fmt(h.nBaris))} baris</button></div>`;
}
export function tabelGalatHtml(galat_, hal = 0, ringkas = "") {
  const mulai = hal * BATAS_CSV.galatTampil, potong = galat_.slice(mulai, mulai + BATAS_CSV.galatTampil);
  const baris = potong.map(g => `<tr>${td("Baris", g.baris ? esc(fmt(g.baris)) : "–", true)}${td("Kolom", esc(g.kolom))}${td("Alasan", esc(g.alasan))}</tr>`).join("");
  return `<div class="ad-galat" role="alert"><span>${esc(ringkas || `Berkas ditolak. ${fmt(galat_.length)} masalah, tidak ada yang disimpan.`)}</span></div>`
    + `<div class="ad-tabel-wadah"><table class="ad-tabel sp-galat-tabel"><caption>Daftar masalah per baris dan kolom</caption><thead><tr><th scope="col">Baris</th><th scope="col">Kolom</th><th scope="col">Alasan</th></tr></thead><tbody>${baris}</tbody></table></div>`
    + (galat_.length > BATAS_CSV.galatTampil ? paginasi(hal, galat_.length, BATAS_CSV.galatTampil, "masalah") : "");
}
/* ringkasan galat dari jawaban server: 400 {galat, rincian:[{baris,kolom,alasan}]}, 409 sha sama */
export function galatServer(status, j) {
  if (status === 409) return {galat: [], ringkas: "Berkas yang sama sudah pernah diunggah (sha sama)."};
  const r = Array.isArray(j?.rincian) ? j.rincian.map(x => ({baris: Number(x.baris) || 0, kolom: String(x.kolom ?? ""), alasan: String(x.alasan ?? "")})) : [];
  return {galat: r, ringkas: r.length ? "Berkas ditolak server. Tidak ada yang disimpan." : (typeof j?.galat === "string" && j.galat ? j.galat : `Unggahan gagal (kode ${status}). Coba lagi.`)};
}
export function templatCsv() { return KOLOM_CSV.join(",") + "\n"; }

export function daftarUnggahHtml(unggah, peran) {
  if (!unggah.length) return "";
  const baris = unggah.slice(0, 20).map(u => `<tr>${td("Berkas", esc(u.nama_berkas ?? "tanpa nama"))}${td("Waktu", `<time datetime="${new Date(u.waktu).toISOString()}">${esc(jamWIB(u.waktu))}</time>`)}${td("Baris", esc(fmt(u.n_baris)), true)}`
    + `${td("Status", u.status === "ditinjau_evaluator" ? pilYakin("ditinjau evaluator", "terverifikasi") : pilYakin("draf, hipotesis", "hipotesis", PIL_HIPOTESIS))}<td class="a">${peran === "M" && u.status !== "ditinjau_evaluator" && ID16.test(String(u.id)) ? `<button type="button" class="ad-tombol" data-tinjau="${esc(u.id)}">Tandai ditinjau evaluator</button>` : ""}</td></tr>`).join("");
  return `<section class="sp-panel-pel" aria-labelledby="sp-ab-uh"><h2 class="sp-sub-judul" id="sp-ab-uh">Unggahan</h2><div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Unggahan A/B</caption><thead><tr>${["Berkas", "Waktu", "Baris", "Status", ""].map(k => `<th scope="col">${esc(k)}</th>`).join("")}</tr></thead><tbody>${baris}</tbody></table></div></section>`;
}

/* ================= DOM dan jaringan ================= */
const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
function muatGaya() {
  return new Promise(ok => {
    if (document.querySelector('link[data-sp="ab"]')) return ok();
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/pipa/layar_ab.css?v=1"; l.dataset.sp = "ab";
    l.onload = l.onerror = () => ok(); document.head.append(l); setTimeout(ok, 1500);
  });
}
const getTeks = async (url, sinyal) => {
  let r;
  try { r = await fetch(url, {credentials: "same-origin", signal: sinyal}); }
  catch (e) { if (e.name === "AbortError") throw e; const g = new Error("Tidak bisa terhubung ke server."); g.status = 0; throw g; }
  if (!r.ok) { const g = new Error(`Permintaan ditolak (kode ${r.status}).`); g.status = r.status; throw g; }
  return r.text();
};
const hariIniWIB = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);

let ctrl = null, urlTemplat = null;
export function lepas() { ctrl?.abort(); ctrl = null; if (urlTemplat) { URL.revokeObjectURL(urlTemplat); urlTemplat = null; } }

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, peran = peranKlien(document.body?.dataset), bisaUnggah = peran === "W" || peran === "M";
  await muatGaya();
  const st = {d: null, aoi: null, per: null, pilot: null, berkas: null, hasil: null, halGalat: 0, galat: []};
  akar.innerHTML = `<header class="sp-kepala"><h1 class="sp-judul">Dashboard A/B</h1><div class="sp-aksi-kepala"><label class="sp-aoi">AOI<select data-aoi aria-label="AOI"><option value="">Semua AOI</option></select></label>`
    + `<a class="ad-tombol" href="/api/sippa/ab.csv" download>Unduh CSV</a></div></header><section class="sp-lk sp-lk-unggah" aria-label="Unggah CSV petak">${zonaUnggahHtml(peran)}</section><div id="sp-ab-isi"></div>`;
  const isi = akar.querySelector("#sp-ab-isi"), selAoi = akar.querySelector("[data-aoi]"), hasilUnggah = akar.querySelector(".sp-unggah-hasil");

  const gambar = () => {
    if (sinyal.aborted || !st.d) return;
    const ring = ringkasAb(st.d.petak || [], {aoi: st.aoi, unggah: st.d.unggah || []}), per = st.per;
    konteks.setPer?.(per);
    if (!(st.d.petak || []).length) { isi.replaceChildren(kosong("Belum ada petak A/B. Unggah CSV petak dari lapangan untuk melihat perbandingan lengan.")); return; }
    const banner = ring.dummy ? `<p class="ad-spanduk" role="status">Sebagian baris adalah data dummy Super Admin, bukan hasil lapangan.</p>` : "";
    isi.innerHTML = banner + `<div id="sp-ab-pilot"></div><section class="sp-kisi sp-kisi-ab" aria-label="Vonis G4 per lengan">${ring.lengan.map(kartuLenganHtml).join("")}</section>`
      + `<article class="ex"><header class="ex-hd"><span class="ex-ey">Efikasi</span><div class="ex-jd"><h3>Ha dingin terverifikasi 30 hari per regu-hari, per lengan</h3></div></header><div class="ex-bd">${grafikTitikHtml(ring)}</div>`
      + `<footer class="ex-ft"><em>Sumber: SIPPA D1 (sippa_petak), per ${esc(per == null ? "–" : jamWIB(per))}; ${ring.lengan.some(l => l.keyakinan === "hipotesis") ? "hipotesis" : "ditinjau evaluator"}, bukan bukti efektivitas</em></footer></article>`
      + `<div class="sp-dua"><article class="ex"><header class="ex-hd"><span class="ex-ey">Nyala ulang</span><div class="ex-jd"><h3>Nyala ulang 7, 30, dan 90 hari per lengan</h3></div></header><div class="ex-bd">${grafikBatangHtml(ring)}</div></article>`
      + `<section class="sp-panel-pel" aria-labelledby="sp-ab-th"><h2 class="sp-sub-judul" id="sp-ab-th">Ringkasan per lengan</h2>${tabelLenganHtml(ring, per)}</section></div>` + daftarUnggahHtml(st.d.unggah || [], peran);
    if (st.pilot) isiPilot();
  };
  let terjadwal = false;
  const jadwalkan = () => { if (terjadwal) return; terjadwal = true; nanti(() => { terjadwal = false; gambar(); }); };
  const isiPilot = () => { const t = isi.querySelector("#sp-ab-pilot"); if (t && st.pilot) t.innerHTML = kartuPilotHtml(st.pilot, st.per); };

  /* vonis pilot: log, probe, komponen dari API yang sama dengan Laporan; gagal tidak menjatuhkan layar A/B (kartu diganti pil menunggu) */
  async function muatPilot() {
    const {sejak, sampai} = {sejak: Date.parse(`${RENTANG_PILOT.dari}T00:00:00+07:00`), sampai: Date.parse(`${RENTANG_PILOT.sampai}T23:59:59.999+07:00`)}, q = new URLSearchParams({sejak, sampai});
    try {
      const [logJ, probeT] = await Promise.all([konteks.ambil(`/api/sippa/log?${q}`, sinyal), getTeks(`/api/sippa/probe.csv?${q}`, sinyal)]);
      const kitId = [...new Set((logJ.log || []).map(l => l.kit_id).filter(x => ID16.test(String(x ?? ""))))].slice(0, 20);
      const kit = await Promise.all(kitId.map(id => konteks.ambil(`/api/sippa/kit/${id}`, sinyal).catch(e => { if (e.name === "AbortError") throw e; return {komponen: []}; })));
      if (sinyal.aborted) return;
      const b = bahanPilot({log: logJ.log, probe: barisProbe(probeT), kit: kit.map(x => ({komponen: x.komponen || []})), kendala: [], prov: konteks.prov, rentang: RENTANG_PILOT});
      if (!b.log.length) return;   // tanpa sesi pilot nyata: kartu tidak ditampilkan
      st.pilot = vonisPilot({log: b.log, probe: b.probe, komponen_kembali: b.komponen_kembali}); isiPilot();
    } catch (e) { if (e.name === "AbortError" || sinyal.aborted) return; const t = isi.querySelector("#sp-ab-pilot"); if (t) t.replaceChildren(menunggu("Vonis pilot belum bisa dihitung: data log pilot tidak termuat")); }
  }

  let acMuat = null;
  const muat = async (senyap = false) => {
    acMuat?.abort(); const ac = acMuat = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});
    if (!senyap) isi.replaceChildren(memuat());
    try {
      const d = await konteks.ambil("/api/sippa/ab", ac.signal);
      if (ac.signal.aborted) return;
      st.d = d; st.per = Date.now();
      const nilai = selAoi.value; selAoi.replaceChildren(new Option("Semua AOI", "")); for (const a of daftarAoi(d.petak || [])) selAoi.append(new Option(a, a)); selAoi.value = daftarAoi(d.petak || []).includes(nilai) ? nilai : ""; st.aoi = selAoi.value || null;
      gambar(); if (!st.pilotDicoba) { st.pilotDicoba = true; nanti(muatPilot); }
    } catch (e) { if (ac.signal.aborted) return; if (e.status == null) console.error(e); isi.replaceChildren(galat(e.status ?? 0, e.status == null ? "Layar tidak bisa ditampilkan. Coba lagi." : e.status ? e.message : "Tidak bisa terhubung ke server.", () => muat())); }
  };

  /* ---- unggah: zona berubah ke "membaca" seketika; periksa per potongan lewat nanti ---- */
  const tampilHasil = h => {
    st.hasil = h; st.halGalat = 0; st.galat = h.galat;
    hasilUnggah.innerHTML = h.nGalat ? tabelGalatHtml(h.galat, 0, `Berkas ditolak. ${fmt(h.nGalat)} ${h.kepalaSalah ? "masalah" : "baris salah"}, tidak ada yang disimpan.`) : pratinjauHtml(h, st.berkas.name, st.berkas.size);
  };
  const baca = async f => {
    st.berkas = f; hasilUnggah.replaceChildren(el("p", "ad-catat", `${f.name}, ${fmt(Math.max(1, Math.round(f.size / 1024)))} KB. Memeriksa berkas.`));
    nanti(async () => {
      try { const teks = await f.text(); if (sinyal.aborted) return; const h = await periksaCsv(teks, hariIniWIB(), {tunda: () => new Promise(ok => nanti(ok))}); if (sinyal.aborted) return; st.teks = teks; tampilHasil(h); }
      catch (e) { if (!sinyal.aborted) hasilUnggah.replaceChildren(galat(0, "Berkas tidak bisa dibaca. Pilih berkas CSV lain.")); }
    });
  };
  const kirimBerkas = async tombol => {
    tombol.disabled = true; tombol.setAttribute("aria-busy", "true");
    let r;
    try { r = await fetch(`/api/sippa/ab/unggah?nama=${encodeURIComponent(st.berkas.name.slice(0, 120))}`, {method: "POST", credentials: "same-origin", headers: {"content-type": "text/csv; charset=utf-8", "x-pb": "1"}, body: st.teks, signal: sinyal}); }
    catch (e) { if (e.name === "AbortError") return; hasilUnggah.replaceChildren(galat(0, "Tidak bisa terhubung ke server.")); return; }
    let j = {}; try { j = await r.json(); } catch { /* badan bukan JSON */ }
    if (r.ok) { hasilUnggah.replaceChildren(); st.berkas = null; konteks.pesan?.(`${fmt(j.n)} baris petak tersimpan.`); await muat(true); return; }
    const g = galatServer(r.status, j); st.galat = g.galat; st.halGalat = 0;
    hasilUnggah.innerHTML = g.galat.length ? tabelGalatHtml(g.galat, 0, g.ringkas) : `<div class="ad-galat" role="alert"><span>${esc(g.ringkas)}</span></div>`;
  };

  akar.addEventListener("change", e => {
    if (e.target === selAoi) { st.aoi = selAoi.value || null; jadwalkan(); return; }
    if (e.target.matches?.("input[type=file]") && e.target.files?.[0]) baca(e.target.files[0]);
  }, {signal: sinyal});
  akar.addEventListener("dragover", e => { if (e.target.closest?.(".sp-unggah")) { e.preventDefault(); e.target.closest(".sp-unggah").classList.add("seret"); } }, {signal: sinyal});
  akar.addEventListener("dragleave", e => e.target.closest?.(".sp-unggah")?.classList.remove("seret"), {signal: sinyal});
  akar.addEventListener("drop", e => { const z = e.target.closest?.(".sp-unggah"); if (!z) return; e.preventDefault(); z.classList.remove("seret"); const f = e.dataTransfer?.files?.[0]; if (f) baca(f); }, {signal: sinyal});
  akar.addEventListener("click", async e => {
    const t = e.target;
    if (t.closest("[data-templat]")) { e.preventDefault(); if (urlTemplat) URL.revokeObjectURL(urlTemplat); urlTemplat = URL.createObjectURL(new Blob([templatCsv()], {type: "text/csv"})); const a = el("a"); a.href = urlTemplat; a.download = "sippa-templat-ab.csv"; a.click(); return; }
    const u = t.closest("[data-unggah]"); if (u && st.berkas && st.teks && !u.disabled) { kirimBerkas(u); return; }
    const p = t.closest(".pgn-b[data-h]");
    if (p && !p.disabled && hasilUnggah.contains(p)) { p.parentElement.querySelectorAll(".pgn-b").forEach(x => x.removeAttribute("aria-current")); p.setAttribute("aria-current", "page"); st.halGalat = +p.dataset.h; const h = st.halGalat; nanti(() => { if (!sinyal.aborted) hasilUnggah.innerHTML = tabelGalatHtml(st.galat, h); }); return; }
    const ti = t.closest("[data-tinjau]");
    if (ti && !ti.disabled) {
      ti.disabled = true; ti.setAttribute("aria-busy", "true");
      try { const r = await fetch(`/api/sippa/ab-status/${ti.dataset.tinjau}`, {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify({status: "ditinjau_evaluator"}), signal: sinyal});
        if (r.ok) { konteks.pesan?.("Unggahan ditandai ditinjau evaluator."); await muat(true); } else { ti.disabled = false; ti.removeAttribute("aria-busy"); konteks.pesan?.(`Status belum bisa diubah (kode ${r.status}).`); } }
      catch (er) { if (er.name !== "AbortError") { ti.disabled = false; ti.removeAttribute("aria-busy"); konteks.pesan?.("Tidak bisa terhubung ke server."); } }
    }
  }, {signal: sinyal});
  await muat();
}
