/* SIPPA: layar Pemeliharaan /pipa/pelihara (PRD §9.4.9, DS §4.15, keputusan 56, SP-094). Kontrak router: pasang(akar, konteks) dan lepas().
   Logika murni (jadwal, laik gelar, stok, kalender, biaya, validasi form) dan pembangun HTML ada di atas dan diuji tanpa DOM; DOM dan jaringan di bawah.
   Jadwal dihitung KLIEN dengan SippaPelihara.jadwal() dari pelihara.js (satu-satunya tempat interval, laju, dan kelas K1-K10). Semua interval dan laju
   berlabel asumsi-kebijakan. Butuh global public/inti: fmt, esc, jamWIB, paginasi, nanti. Tanpa toFixed; semua teks data lewat esc. */
import {KELAS, KELAS_ASET, kelasDari, jadwal, laikGelar, stokMin, biayaTahun} from "./pelihara.js";
import {peranKlien, kirimPost, bukaDialog, tutupDialog, muatGayaKit} from "./layar_kit.js";
import {katalogHtml} from "./katalog_alat.js";
import {sukuCadangHtml, muatGayaLapangan} from "./lapangan_staf.js";
import {memuat, kosong, galat} from "./keadaan.js";

const HARI = 864e5, WIB = 7 * 36e5, PER_HAL = 25, TUNGGU_HARI = 60;
export const STATUS_JADWAL = ["terlambat", "segera", "aman", "belum_pernah"];
export const TEKS_STATUS = {terlambat: "Terlambat", segera: "Segera", aman: "Aman", belum_pernah: "Belum pernah"};
export const SKOR_KATA = ["Baik", "Rusak ringan", "Rusak berat", "Hilang atau afkir"];
const URUT_STATUS = {terlambat: 0, segera: 1, belum_pernah: 2, aman: 3};
const NAMA_KELAS = {K1: "Pompa", K2: "Selang", K3: "Hidraulik", K4: "Sensor", K5: "APD", K7: "Sumur", K8: "Pipa sementara", K9: "Jembatan darurat", K10: "Jembatan pantau"};
const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
/* unit dilayani per kit gambut (PRD §6.1, BOM di src/sippa.js GAMBUT) untuk stok_min = ceil(laju x kit x satuan x (1 + 60/180)); kode di luar daftar tanpa minimum.
   Payload /api/sippa/pelihara tidak membawa jumlah per kit, jadi daftar ini asumsi-kebijakan sampai server mengirim BOM per gudang. */
export const SATUAN_KIT = {"P-101": 2, "IMP-101": 2, "SF-101": 2, "C-101": 20, "I-101": 8, "H-101": 1000, "H-201": 500, "T-101": 8, "Q-101": 20};
const JENIS_SAH = ["pra_gelar", "pasca_gelar", "berkala", "pra_musim", "tahunan", "servis", "uji_tekanan", "mutu_air"];   // himpunan bagian JENIS_INSPEKSI di src/sippa.js
const TEKS_JENIS = {pra_gelar: "Pra-gelar", pasca_gelar: "Pasca-gelar", berkala: "Berkala", pra_musim: "Pra-musim", tahunan: "Tahunan", servis: "Servis", uji_tekanan: "Uji tekanan", mutu_air: "Uji mutu air"};
const TINDAKAN = [["tidak_ada", "Tidak ada"], ["perbaiki", "Perbaiki"], ["ganti", "Ganti"], ["afkir", "Afkir"], ["uji_ulang", "Uji ulang"], ["serahkan", "Serahkan"], ["tunggu_suku_cadang", "Tunggu suku cadang"]];
const SATUAN_STOK = ["unit", "m", "set", "paket", "liter"], ALASAN_STOK = [["terima", "Terima"], ["pakai", "Pakai"], ["pindah", "Pindah"], ["koreksi", "Koreksi"], ["afkir", "Afkir"]];
const RE_BOM = /^[A-Z]{1,4}-\d{1,6}$/;

const ada = v => v != null && String(v).trim() !== "";
const angka = v => ada(v) ? Number(String(v).trim().replace(",", ".")) : NaN;
const tgl = ms => new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"});
const waktuTag = ms => ms == null ? "–" : `<time datetime="${new Date(ms).toISOString()}">${esc(tgl(ms))}</time>`;
const persen = r => `${fmt(Math.round(r * 1000) / 10)}%`;
const rp = v => v == null ? "–" : v >= 1e9 ? `Rp${fmt(Math.round(v / 1e8) / 10)} miliar` : v >= 1e6 ? `Rp${fmt(Math.round(v / 1e5) / 10)} juta` : `Rp${fmt(Math.round(v))}`;
const pilYakin = (teks, kelas = "asumsi-kebijakan", judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;
const JUDUL_ASUMSI = "Interval, laju biaya, dan stok minimum ditetapkan sebagai asumsi kebijakan sampai dikalibrasi dengan data musim 2027";
const sumberBaris = per => `<p class="ad-catat sp-sumber">Sumber: SIPPA D1 (inspeksi, komponen, log gelar, stok), per ${per == null ? "–" : esc(jamWIB(per))}</p>`;

/* ---------- jadwal ---------- */
/* satu baris per komponen kit (kelas dari awalan BOM) dan per aset bukan kit; urut terlambat, segera, belum pernah, aman, lalu jatuh tempo terdekat.
   Inspeksi terakhir = yang terbaru dari semua jenis; jam sejak servis hanya untuk K1; awalan BOM tanpa kelas dilewati (uji P1 menjaga templat). */
export function susunJadwal(d, kini) {
  const akhir = new Map();
  for (const i of d.inspeksi_terakhir || []) { const k = `${i.sasaran_jenis}:${i.sasaran_id}`, a = akhir.get(k); if (!a || i.waktu >= a.waktu) akhir.set(k, {waktu: i.waktu, skor: i.skor}); }
  const rows = [];
  for (const c of d.komponen || []) {
    const kelas = kelasDari(c.kode_bom); if (!kelas) continue;
    const a = akhir.get(`komponen:${c.id}`), j = jadwal({kelas}, a?.waktu ?? null, kelas === "K1" ? d.jam_sejak_servis?.[c.kit_id] ?? null : null, kini);
    rows.push({sasaran: "komponen", id: c.id, kit_id: c.kit_id, kode: `${c.kit_kode} ${c.kode_bom}`, kode_bom: c.kode_bom, nama: c.nama, kelas, lokasi: c.kit_kode, kondisi: c.kondisi,
      terakhir: a?.waktu ?? null, skor: a?.skor ?? null, jatuh_tempo: j.jatuh_tempo, status: j.status, alasan: j.alasan, pemelihara: KELAS[kelas].pemelihara_t1});
  }
  for (const s of d.aset || []) {
    const kelas = KELAS_ASET[s.kelas]; if (!kelas) continue;
    const a = akhir.get(`aset:${s.id}`), j = jadwal({kelas}, a?.waktu ?? null, null, kini);
    rows.push({sasaran: "aset", id: s.id, kit_id: null, kode: s.kode, kode_bom: null, nama: s.nama, kelas, lokasi: s.kab ?? "–", kondisi: null,
      terakhir: a?.waktu ?? null, skor: a?.skor ?? null, jatuh_tempo: j.jatuh_tempo, status: j.status, alasan: j.alasan, pemelihara: s.pemelihara ?? KELAS[kelas].pemelihara_t1});
  }
  return rows.sort((x, y) => URUT_STATUS[x.status] - URUT_STATUS[y.status] || (x.jatuh_tempo ?? Infinity) - (y.jatuh_tempo ?? Infinity) || (x.kode < y.kode ? -1 : x.kode > y.kode ? 1 : 0));
}

/* §6.10.4: kit tidak laik gelar bila komponen K1-K3 rusak berat atau hilang, atau pompa K1 terlambat. Hanya peringatan (T-P), bukan blokir. */
export function kitTidakLaik(d, rows) {
  const per = new Map();
  for (const c of d.komponen || []) { if (!per.has(c.kit_id)) per.set(c.kit_id, {kit_id: c.kit_id, kit_kode: c.kit_kode, komponen: [], jadwal: []}); per.get(c.kit_id).komponen.push({kode_bom: c.kode_bom, kondisi: c.kondisi}); }
  for (const r of rows) if (r.sasaran === "komponen" && r.kelas === "K1") per.get(r.kit_id)?.jadwal.push({kelas: r.kelas, status: r.status});
  const hasil = [];
  for (const k of per.values()) { const h = laikGelar(k.komponen, k.jadwal); if (!h.laik) hasil.push({kit_id: k.kit_id, kit_kode: k.kit_kode, alasan: h.alasan}); }
  return hasil.sort((a, b) => a.kit_kode < b.kit_kode ? -1 : a.kit_kode > b.kit_kode ? 1 : 0);
}

/* §6.10.5: minimum per gudang = stokMin(kode, kit di gudang x satuan per kit); tanpa laju atau tanpa kit tercatat = tanpa minimum */
export function barisStok(d) {
  return (d.stok || []).map(s => {
    const kit = d.n_kit_per_gudang?.[s.gudang], satuan = Object.hasOwn(SATUAN_KIT, s.kode_bom) ? SATUAN_KIT[s.kode_bom] : null;
    let min = null;
    if (kit > 0 && satuan != null) { try { min = stokMin(s.kode_bom, kit * satuan, TUNGGU_HARI); } catch { min = null; } }
    return {gudang: s.gudang, kode_bom: s.kode_bom, saldo: s.saldo, satuan: s.satuan, min, bawah: min != null && s.saldo < min};
  });
}

export function ringkasan(rows, laik, stok) {
  const r = {terlambat: 0, segera: 0, aman: 0, belum_pernah: 0, tidakLaik: laik.length, stokBawah: stok.filter(s => s.bawah).length, total: rows.length};
  for (const x of rows) r[x.status]++;
  return r;
}
export function kalimatJudul(r) {
  const b = [];
  if (r.terlambat > 0) b.push(`${fmt(r.terlambat)} butir terlambat`);
  if (r.tidakLaik > 0) b.push(`${fmt(r.tidakLaik)} kit tidak laik gelar`);
  if (r.stokBawah > 0) b.push(`${fmt(r.stokBawah)} suku cadang di bawah minimum`);
  if (b.length) return b.join(", ");
  return r.total > 0 ? "Tidak ada butir terlambat, tidak ada kit tidak laik gelar, stok di atas minimum" : "Belum ada butir pemeliharaan tercatat";
}

/* ---------- penyaring dan kalender ---------- */
export const saring = (rows, {kelas, status}) => rows.filter(r => (kelas == null || r.kelas === kelas) && status.has(r.status));
/* jumlah di chip: status dihitung di kelas terpilih, kelas dihitung di status terpilih (chip yang ditekan tidak mengubah angkanya sendiri) */
export function hitungChip(rows, {kelas, status}) {
  const s = Object.fromEntries(STATUS_JADWAL.map(x => [x, 0])), k = {semua: 0, ...Object.fromEntries(Object.keys(KELAS).map(x => [x, 0]))};
  for (const r of rows) { if (kelas == null || r.kelas === kelas) s[r.status]++; if (status.has(r.status)) { k.semua++; k[r.kelas]++; } }
  return {status: s, kelas: k};
}
/* 12 bulan mulai bulan ini (WIB); pita musim karhutla Mei sampai Oktober, banjir November sampai April (DS §4.15); yang sudah lewat dihitung terpisah */
export function kalender(rows, kini) {
  const w = new Date(kini + WIB), y0 = w.getUTCFullYear(), m0 = w.getUTCMonth();
  const bulan = Array.from({length: 12}, (_, i) => { const m = (m0 + i) % 12; return {nama: NAMA_BULAN[m], tahun: y0 + Math.floor((m0 + i) / 12), musim: m >= 4 && m <= 9 ? "karhutla" : "banjir", n: 0}; });
  let lewat = 0;
  for (const r of rows) {
    if (r.jatuh_tempo == null) continue;
    if (r.jatuh_tempo <= kini) { lewat++; continue; }
    const t = new Date(r.jatuh_tempo + WIB), sel = (t.getUTCFullYear() - y0) * 12 + t.getUTCMonth() - m0;
    if (sel >= 0 && sel < 12) bulan[sel].n++;
  }
  return {bulan, lewat};
}

/* ---------- biaya (PRD §6.10.7) ---------- */
/* nilai ganti dan jumlah belum dikirim server (harga.csv dari RFQ belum diserahkan): tanpa d.harga dan d.komponen[].jumlah biaya = null (menunggu), laju tetap tampil */
export function biayaKelas(d) {
  const harga = d.harga && typeof d.harga === "object" ? d.harga : null;
  const item = harga ? (d.komponen || []).filter(c => typeof c.jumlah === "number" && kelasDari(c.kode_bom)).map(c => ({kode_bom: c.kode_bom, jumlah: c.jumlah})) : [];
  const b = harga ? biayaTahun(item, harga) : null;
  const kelas = Object.keys(KELAS).map(k => ({kelas: k, nama: KELAS[k].nama, laju: KELAS[k].laju_biaya, biaya: b?.per_kelas[k]?.biaya ?? null}));
  return {kelas, total: b && kelas.some(x => x.biaya != null) ? b.total : null, keyakinan: "asumsi-kebijakan"};
}

/* ---------- inspeksi staf (POST /api/sippa/inspeksi) dan stok (POST /api/sippa/stok) ---------- */
export function jenisUntuk(kelas) {
  if (!Object.hasOwn(KELAS, kelas)) return [];
  const {interval} = KELAS[kelas], j = new Set(interval.tiap_pakai ? ["pra_gelar", "pasca_gelar"] : []);
  for (const n of [...Object.keys(interval.hari), ...Object.keys(interval.jam)]) if (JENIS_SAH.includes(n)) j.add(n);
  return [...j];
}
export function cekInspeksiStaf(row, f) {
  const g = [], tolak = (medan, alasan) => g.push({medan, alasan}), sah = jenisUntuk(row.kelas), jenis = String(f.jenis ?? "");
  const skor = ada(f.skor) ? Number(f.skor) : NaN;
  if (!Number.isInteger(skor) || skor < 0 || skor > 3) tolak("skor", "Pilih kondisi: Baik, Rusak ringan, Rusak berat, atau Hilang atau afkir.");
  if (!sah.includes(jenis)) tolak("jenis", `Jenis ${jenis || "kosong"} tidak berlaku untuk kelas ${row.kelas}. Pilih jenis dari daftar.`);
  if (ada(f.jam_operasi)) { const n = angka(f.jam_operasi); if (row.kelas !== "K1") tolak("jam_operasi", "Jam operasi hanya untuk pompa (kelas K1). Kosongkan kolom ini."); else if (!(n >= 0 && n <= 100000)) tolak("jam_operasi", "Jam operasi harus angka 0 sampai 100.000. Perbaiki lalu simpan lagi."); }
  if (ada(f.tindakan) && !TINDAKAN.some(([k]) => k === f.tindakan)) tolak("tindakan", "Tindakan tidak dikenal. Pilih dari daftar.");
  if (String(f.temuan ?? "").trim().length > 1000) tolak("temuan", "Temuan paling banyak 1.000 huruf. Persingkat teksnya.");
  if (sah.includes(jenis) && jenis === "mutu_air" && !(angka(f.e_coli_cfu) >= 0)) tolak("e_coli_cfu", "E. coli wajib diisi, angka 0 atau lebih (CFU per 100 ml). Isi hasil uji laboratorium.");
  if (sah.includes(jenis) && jenis === "uji_tekanan" && !(angka(f.tekanan_bar) > 0)) tolak("tekanan_bar", "Tekanan uji wajib diisi, angka lebih dari 0 (bar). Isi hasil uji tekanan.");
  return g;
}
export function badanInspeksi(row, f) {
  const b = row.sasaran === "aset" ? {sasaran_jenis: "aset", sasaran_id: row.id} : {sasaran_jenis: "komponen", sasaran_id: row.id, kit_id: row.kit_id};
  b.jenis = f.jenis; b.skor = Number(f.skor);
  if (ada(f.jam_operasi)) b.jam_operasi = angka(f.jam_operasi);
  if (ada(f.temuan)) b.temuan = String(f.temuan).trim();
  b.tindakan = ada(f.tindakan) ? f.tindakan : "tidak_ada";
  if (f.jenis === "mutu_air") b.hasil = {e_coli_cfu: angka(f.e_coli_cfu)};
  if (f.jenis === "uji_tekanan") b.hasil = {tekanan_bar: angka(f.tekanan_bar)};
  return b;
}
export function cekStok(f) {
  const g = [], tolak = (medan, alasan) => g.push({medan, alasan}), t = v => String(v ?? "").trim(), d = angka(f.delta), kode = t(f.kode_bom).toUpperCase();
  if (t(f.gudang).length < 3 || t(f.gudang).length > 80) tolak("gudang", "Gudang harus 3 sampai 80 huruf. Tulis nama gudang yang jelas.");
  if (!RE_BOM.test(kode) || kode.length > 12) tolak("kode_bom", "Kode suku cadang berbentuk C-101 (huruf, tanda hubung, angka). Perbaiki lalu simpan lagi.");
  if (t(f.nama).length < 2 || t(f.nama).length > 120) tolak("nama", "Nama suku cadang harus 2 sampai 120 huruf. Tulis nama barangnya.");
  if (!Number.isFinite(d) || d === 0 || Math.abs(d) > 100000) tolak("delta", "Jumlah harus angka bukan nol, paling banyak 100.000. Pakai tanda minus untuk stok keluar.");
  if (!SATUAN_STOK.includes(f.satuan)) tolak("satuan", "Satuan belum dipilih. Pilih satuan dari daftar.");
  if (!ALASAN_STOK.some(([k]) => k === f.alasan)) tolak("alasan", "Alasan belum dipilih. Pilih alasan dari daftar.");
  return g;
}
export const badanStok = f => ({gudang: String(f.gudang).trim(), kode_bom: String(f.kode_bom).trim().toUpperCase(), nama: String(f.nama).trim(), delta: angka(f.delta), satuan: f.satuan, alasan: f.alasan});

/* ---------- HTML: semua teks dari data lewat esc ---------- */
const pilStatus = s => `<span class="sp-jadwal ${esc(s)}">${esc(TEKS_STATUS[s] ?? s)}</span>`;
const td = (label, isi, kelas = "") => `<td${kelas ? ` class="${kelas}"` : ""} data-label="${label}">${isi}</td>`;
const KEPALA = ["Butir", "Kelas", "Kit atau lokasi", "Inspeksi terakhir", "Skor", "Jatuh tempo", "Status", "Pemelihara", ""];

function tempoTeks(r, kini) {
  if (r.jatuh_tempo == null) return r.status === "belum_pernah" ? `–<span class="sp-sub">belum ada inspeksi</span>` : "–";
  const sisa = r.jatuh_tempo - kini, hari = Math.floor(Math.abs(sisa) / HARI);
  const ket = r.status === "terlambat" ? (hari >= 1 ? `lewat ${fmt(hari)} hari` : r.alasan) : r.status === "segera" ? `dalam ${fmt(Math.ceil(sisa / HARI))} hari` : "";
  return `${waktuTag(r.jatuh_tempo)}${ket ? `<span class="sp-sub">${esc(ket)}</span>` : ""}`;
}
export function tabelJadwalHtml(rows, {peran, kini, per}) {
  if (!rows.length) return `<p class="ad-kosong">Tidak ada butir yang cocok dengan penyaring.</p>`;
  const tulis = peran === "W" || peran === "M";
  const baris = rows.map(r => `<tr>${td("Butir", `<b>${esc(r.nama)}</b><span class="sp-sub">${esc(r.kode)}</span>`)}${td("Kelas", `<span class="num">${esc(r.kelas)}</span>`)}`
    + `${td("Kit atau lokasi", r.kit_id ? `<a class="sp-kit-kode" href="/pipa/kit/${esc(r.kit_id)}">${esc(r.lokasi)}</a>` : esc(r.lokasi))}${td("Inspeksi terakhir", waktuTag(r.terakhir))}`
    + `${td("Skor", r.skor == null ? "–" : `<span class="num">${esc(fmt(r.skor))}</span><span class="sp-sub">${esc(SKOR_KATA[r.skor] ?? "")}</span>`, "n")}${td("Jatuh tempo", tempoTeks(r, kini))}${td("Status", pilStatus(r.status))}`
    + `${td("Pemelihara", esc(r.pemelihara))}<td class="a">${tulis ? `<button type="button" class="ad-tombol sp-catat" data-catat="${esc(r.sasaran)}:${esc(r.id)}">Catat inspeksi</button>` : ""}</td></tr>`);
  return `<div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-pelihara"><caption class="sr">Jadwal pemeliharaan</caption><thead><tr>${KEPALA.map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${baris.join("")}</tbody></table></div>${sumberBaris(per)}`;
}

/* kartu Insight 3.2.1: kalimat judul, pil asumsi-kebijakan, kit tidak laik gelar berpil teks dengan alasan dan tautan kit */
export function isiKartuHtml(r, laik, per = null) {
  const daftar = laik.length ? `<ul class="sp-daftar sp-laik-daftar">${laik.map(k => `<li><a class="sp-kit-kode" href="/pipa/kit/${esc(k.kit_id)}">${esc(k.kit_kode)}</a><span class="sp-laik">tidak laik gelar</span><span class="ad-catat">${esc(k.alasan.join("; "))}</span></li>`).join("")}</ul>` : "";
  return `<article class="ex"><header class="ex-hd"><span class="ex-ey">Pemeliharaan</span><div class="ex-jd"><h3>${esc(kalimatJudul(r))}</h3></div></header>`
    + `<div class="ex-bd"><div class="sp-pil-baris">${pilYakin("asumsi-kebijakan", "asumsi-kebijakan", JUDUL_ASUMSI)}</div>${daftar}</div>`
    + `<footer class="ex-ft"><em>Sumber: SIPPA D1 (inspeksi, komponen, log gelar, stok), per ${per == null ? "–" : esc(jamWIB(per))}</em></footer></article>`;
}

export function kontrolHtml(hit, {kelas, status}) {
  const kls = [["semua", "Semua"], ...Object.keys(KELAS).map(k => [k, `${k} ${NAMA_KELAS[k]}`])];
  return `<div class="sp-kontrol sp-kontrol-pel" role="group" aria-label="Penyaring jadwal"><div class="sp-chips" role="group" aria-label="Kelas">${kls.map(([k, n]) => `<button type="button" class="ad-chip" data-kelas="${k}" aria-pressed="${(kelas ?? "semua") === k}">${esc(n)} <span class="num jml">${esc(fmt(hit.kelas[k]))}</span></button>`).join("")}</div>`
    + `<div class="sp-chips" role="group" aria-label="Status">${STATUS_JADWAL.map(s => `<button type="button" class="ad-chip" data-status="${s}" aria-pressed="${status.has(s)}">${TEKS_STATUS[s]} <span class="num jml">${esc(fmt(hit.status[s]))}</span></button>`).join("")}</div></div>`;
}

export function kalenderHtml(k) {
  const sel = k.bulan.map(b => `<li class="sp-kal-bln ${b.musim}"><span class="sp-kal-nama">${esc(b.nama)} ${esc(b.tahun)}</span><b class="num" aria-label="${esc(fmt(b.n))} butir jatuh tempo">${esc(fmt(b.n))}</b><span class="sp-kal-musim">${b.musim === "karhutla" ? "Karhutla" : "Banjir"}</span></li>`).join("");
  return `<section class="sp-panel-pel" aria-labelledby="sp-kal-h"><h2 class="sp-sub-judul" id="sp-kal-h">Jatuh tempo 12 bulan</h2><ol class="sp-kal">${sel}</ol>`
    + `<p class="ad-catat">${k.lewat > 0 ? `${esc(fmt(k.lewat))} butir sudah lewat jatuh tempo, tidak masuk kalender. ` : ""}Pita musim: Karhutla Mei sampai Oktober, Banjir November sampai April. Interval asumsi-kebijakan.</p></section>`;
}

export function stokHtml(baris, peran) {
  const bawah = baris.filter(b => b.bawah).length, tulis = peran === "W" || peran === "M";
  const isi = baris.length ? `<div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-stok"><caption class="sr">Stok suku cadang per gudang</caption><thead><tr>${["Gudang", "Kode", "Saldo", "Minimum", "Keterangan"].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>`
    + baris.map(b => `<tr>${td("Gudang", esc(b.gudang))}${td("Kode", esc(b.kode_bom))}${td("Saldo", `${esc(fmt(b.saldo))} ${esc(b.satuan)}`, "n")}${td("Minimum", b.min == null ? "–" : esc(fmt(b.min)), "n")}${td("Keterangan", b.bawah ? `<span class="sp-laik">di bawah minimum</span>` : b.min == null ? `<span class="sp-sub">tanpa minimum</span>` : "")}</tr>`).join("")
    + `</tbody></table></div>` : `<p class="ad-kosong">Belum ada stok tercatat. Catat penerimaan suku cadang lewat tombol Catat stok.</p>`;
  return `<section class="sp-panel-pel" aria-labelledby="sp-stok-h"><div class="sp-panel-kepala"><h2 class="sp-sub-judul" id="sp-stok-h">${bawah > 0 ? `${esc(fmt(bawah))} kode di bawah minimum` : "Stok suku cadang"}</h2>${tulis ? `<button type="button" class="ad-tombol" data-stok>Catat stok</button>` : ""}</div>${isi}`
    + `<p class="ad-catat">Minimum = pembulatan ke atas dari laju pakai x unit dilayani x (1 + ${esc(fmt(TUNGGU_HARI))}/180), unit dilayani dari BOM kit gambut (PRD §6.10.5). ${pilYakin("asumsi-kebijakan", "asumsi-kebijakan", JUDUL_ASUMSI)}</p></section>`;
}

export function biayaHtml(b) {
  const kartu = b.kelas.map(x => `<div class="sp-biaya-kelas"><span class="sp-biaya-k">${esc(x.kelas)} ${esc(NAMA_KELAS[x.kelas] ?? x.nama)}</span><b class="num">${x.biaya == null ? "–" : esc(rp(x.biaya))}</b><small>${esc(persen(x.laju))} nilai ganti per tahun${x.laju === 0 ? ", bukan beban BNPB" : ""}</small></div>`).join("");
  const total = b.total == null ? `<span class="sp-menunggu"><b>–</b><span class="sp-yakin menunggu">Menunggu</span><small>nilai ganti dari daftar harga (harga.csv) belum diterima</small></span>` : `<b class="num">${esc(rp(b.total))}</b>`;
  return `<section class="sp-panel-pel" aria-labelledby="sp-biaya-h"><div class="sp-panel-kepala"><h2 class="sp-sub-judul" id="sp-biaya-h">Biaya pemeliharaan per tahun per kelas</h2>${pilYakin("asumsi-kebijakan", b.keyakinan, JUDUL_ASUMSI)}</div>`
    + `<div class="sp-biaya"><div class="sp-biaya-total"><span class="sp-biaya-k">Total</span>${total}</div>${kartu}</div>`
    + `<p class="ad-catat sp-rumus">B tahun = jumlah kelas (nilai ganti x laju kelas) + jam pompa x biaya per jam + sampel uji x biaya sampel (rumus PRD §6.10.7)</p></section>`;
}

export function formInspeksiHtml(row) {
  const jenis = jenisUntuk(row.kelas);
  const pilihJenis = jenis.map(j => `<option value="${esc(j)}">${esc(TEKS_JENIS[j] ?? j)}</option>`).join("");
  const skor = SKOR_KATA.map((k, i) => `<label class="sp-skor-pil"><input type="radio" name="skor" value="${i}"><span>${esc(k)}</span></label>`).join("");
  return `<form class="sp-form sp-form-inspeksi" novalidate><p class="sp-form-judul"><b>${esc(row.nama)}</b> <span class="ad-catat">${esc(row.kode)}, kelas ${esc(row.kelas)}</span></p>`
    + `<label>Jenis inspeksi <select name="jenis">${pilihJenis}</select></label>`
    + `<fieldset class="sp-skor"><legend>Kondisi saat diperiksa</legend><div class="sp-skor-baris" role="radiogroup" aria-label="Kondisi">${skor}</div></fieldset>`
    + (row.kelas === "K1" ? `<label>Jam operasi pompa sejak servis <input name="jam_operasi" inputmode="decimal" autocomplete="off"></label>` : "")
    + (jenis.includes("mutu_air") ? `<label data-g="mutu_air" hidden>E. coli, CFU per 100 ml <input name="e_coli_cfu" inputmode="decimal" autocomplete="off"></label>` : "")
    + (jenis.includes("uji_tekanan") ? `<label data-g="uji_tekanan" hidden>Tekanan uji, bar <input name="tekanan_bar" inputmode="decimal" autocomplete="off"></label>` : "")
    + `<label>Tindakan <select name="tindakan">${TINDAKAN.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label>`
    + `<label>Temuan <textarea name="temuan" rows="3" maxlength="1000"></textarea></label>`
    + `<div class="sp-galat-slot"></div><div class="sp-aksi"><button type="submit" class="ad-tombol utama sp-besar">Simpan inspeksi</button></div></form>`;
}
export function formStokHtml(gudang) {
  return `<form class="sp-form sp-form-stok" novalidate><label>Gudang <input name="gudang" list="sp-gudang" maxlength="80" autocomplete="off"></label><datalist id="sp-gudang">${gudang.map(g => `<option value="${esc(g)}"></option>`).join("")}</datalist>`
    + `<label>Kode suku cadang <input name="kode_bom" maxlength="12" placeholder="C-101" autocomplete="off"></label><label>Nama <input name="nama" maxlength="120" autocomplete="off"></label>`
    + `<label>Jumlah, plus untuk masuk dan minus untuk keluar <input name="delta" inputmode="decimal" autocomplete="off"></label>`
    + `<label>Satuan <select name="satuan">${SATUAN_STOK.map(s => `<option value="${s}">${s}</option>`).join("")}</select></label>`
    + `<label>Alasan <select name="alasan">${ALASAN_STOK.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label>`
    + `<div class="sp-galat-slot"></div><div class="sp-aksi"><button type="submit" class="ad-tombol utama sp-besar">Simpan stok</button></div></form>`;
}

/* ---------- DOM ---------- */
const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
const pergi = jalur => { history.pushState(null, "", jalur + location.search); dispatchEvent(new PopStateEvent("popstate")); };   // app.js mendengar popstate: aria-current seketika, layar sesudah satu frame
const kotakGalat = daftar => { const e = el("div", "ad-galat"); e.setAttribute("role", "alert"); const ul = el("ul"); daftar.forEach(g => ul.append(el("li", "", g))); e.append(ul); return e; };

let ctrl = null;
export function lepas() { ctrl?.abort(); ctrl = null; tutupDialog(); }

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, peran = peranKlien(document.body?.dataset), tulis = peran === "W" || peran === "M";
  const st = {d: null, rows: [], kini: 0, kelas: null, status: new Set(STATUS_JADWAL), hal: 0};
  akar.innerHTML = `<header class="sp-kepala"><h1 class="sp-judul">Pemeliharaan</h1><div class="sp-aksi-kepala"><a class="ad-tombol" data-csv href="/api/sippa/pelihara.csv?prov=${encodeURIComponent(konteks.prov)}" download>Unduh pelihara.csv</a>${tulis ? `<button type="button" class="ad-tombol" data-stok>Catat stok</button>` : ""}</div></header><div id="sp-pel-isi"></div>`;
  const isi = akar.querySelector("#sp-pel-isi");

  const gambarTabel = () => {
    if (sinyal.aborted || !st.d) return;
    const hit = hitungChip(st.rows, st), baris = saring(st.rows, st), hal = Math.min(st.hal, Math.max(0, Math.ceil(baris.length / PER_HAL) - 1));
    isi.querySelectorAll("[data-kelas] .jml").forEach(s => { s.textContent = fmt(hit.kelas[s.parentElement.dataset.kelas]); });
    isi.querySelectorAll("[data-status] .jml").forEach(s => { s.textContent = fmt(hit.status[s.parentElement.dataset.status]); });
    const nav = baris.length > PER_HAL ? paginasi(hal, baris.length, PER_HAL, "butir") : "";
    isi.querySelector("#sp-pel-tabel").innerHTML = tabelJadwalHtml(baris.slice(hal * PER_HAL, (hal + 1) * PER_HAL), {peran, kini: st.kini, per: st.d.per ?? st.kini}) + nav;
  };
  /* satu gambar ulang antre sekaligus: klik beruntun tidak menumpuk kerja berat */
  let terjadwal = false;
  const jadwalkan = () => { if (terjadwal) return; terjadwal = true; nanti(() => { terjadwal = false; gambarTabel(); }); };

  const gambar = () => {
    if (sinyal.aborted) return;
    const d = st.d, laik = kitTidakLaik(d, st.rows), stok = barisStok(d), r = ringkasan(st.rows, laik, stok), per = d.per ?? st.kini;
    konteks.setPer?.(per);
    if (!st.rows.length && !stok.length) { muatGayaKit(); const k = el("div"); k.innerHTML = katalogHtml(); isi.replaceChildren(kosong("Belum ada butir pemeliharaan. Butir muncul dari komponen kit dan aset yang dicatat staf."), k); return; }   // katalog alat mengisi layar kosong (SP-113)
    isi.innerHTML = isiKartuHtml(r, laik, per) + kontrolHtml(hitungChip(st.rows, st), st) + `<div id="sp-pel-tabel"></div>`
      + `<div class="sp-dua">${kalenderHtml(kalender(st.rows, st.kini))}${stokHtml(stok, peran)}</div>${biayaHtml(biayaKelas(d))}<section class="sp-suku" id="sp-suku" hidden></section>`;
    gambarTabel(); nanti(muatSuku);
  };

  /* SP-131: alat menunggu suku cadang; rute belum ada (404) atau galat = bagian ini disembunyikan, bukan baris "menunggu" */
  const muatSuku = async () => {
    const w = isi.querySelector("#sp-suku"); if (!w || sinyal.aborted) return;
    try {
      const [j] = await Promise.all([konteks.ambil("/api/sippa/suku-cadang", sinyal), muatGayaLapangan()]);
      if (sinyal.aborted) return;
      const rows = (j.komponen || []).filter(r => !konteks.prov || r.prov == null || r.prov === konteks.prov);
      w.innerHTML = `<h2 class="sp-sub">Alat menunggu suku cadang</h2>${sukuCadangHtml(rows, Date.now())}`; w.hidden = false;
    } catch (e) { if (e?.name === "AbortError" || sinyal.aborted) return; if (e.status == null) console.error(e); w.hidden = true; }
  };
  let acMuat = null;
  const muat = async (senyap = false) => {
    acMuat?.abort(); const ac = acMuat = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});   // jawaban basi tidak pernah menimpa yang terbaru
    if (!senyap) isi.replaceChildren(memuat());
    try {
      const d = await konteks.ambil(`/api/sippa/pelihara?prov=${encodeURIComponent(konteks.prov)}`, ac.signal);
      if (ac.signal.aborted) return;
      st.d = d; st.kini = Date.now(); st.rows = susunJadwal(d, st.kini); gambar();
    } catch (e) { if (ac.signal.aborted) return; if (e.status == null) console.error(e); isi.replaceChildren(galat(e.status ?? 0, e.status == null ? "Layar tidak bisa ditampilkan. Coba lagi." : e.status ? e.message : "Tidak bisa terhubung ke server.", () => muat())); }
  };

  /* dialog: isian dibaca dari form, galat per medan di slot, tombol mati seketika (INP) sebelum kirim */
  const lewatForm = (html, judul, kirim, selesai, sesuaikan) => {
    const w = el("div"); w.innerHTML = html;
    const f = w.firstElementChild, slot = f.querySelector(".sp-galat-slot"), tombol = f.querySelector("button[type=submit]");
    const d = bukaDialog(judul, f); d.classList.add("sp-lembar-dlg");
    if (sesuaikan) { f.addEventListener("change", () => sesuaikan(f)); sesuaikan(f); }
    f.addEventListener("submit", async e => {
      e.preventDefault(); if (tombol.disabled) return;
      const nilai = Object.fromEntries([...new FormData(f)].map(([k, v]) => [k, typeof v === "string" ? v : ""])), salah = kirim.cek(nilai);
      if (salah.length) { slot.replaceChildren(kotakGalat(salah.map(g => g.alasan))); f.elements[salah[0].medan]?.focus?.(); return; }
      tombol.disabled = true; tombol.setAttribute("aria-busy", "true"); slot.replaceChildren();
      try { await kirimPost(kirim.url, kirim.badan(nilai)); tutupDialog(); konteks.pesan?.(selesai); await muat(true); }
      catch (er) { slot.replaceChildren(kotakGalat([er.message])); tombol.disabled = false; tombol.removeAttribute("aria-busy"); }
    });
  };
  const dialogInspeksi = row => lewatForm(formInspeksiHtml(row), `Catat inspeksi ${row.kode}`, {url: "/api/sippa/inspeksi", cek: n => cekInspeksiStaf(row, n), badan: n => badanInspeksi(row, n)}, "Inspeksi tersimpan.",
    f => { for (const j of ["mutu_air", "uji_tekanan"]) { const g = f.querySelector(`[data-g="${j}"]`); if (g) g.hidden = f.elements.jenis.value !== j; } });
  const dialogStok = () => lewatForm(formStokHtml([...new Set(barisStok(st.d || {}).map(b => b.gudang))]), "Catat stok suku cadang", {url: "/api/sippa/stok", cek: cekStok, badan: badanStok}, "Stok tersimpan.");

  /* INP: aria-pressed dan halaman aktif berubah di handler; gambar ulang tabel lewat nanti() */
  akar.addEventListener("click", e => {
    const t = e.target;
    const kls = t.closest("[data-kelas]");
    if (kls) { st.kelas = kls.dataset.kelas === "semua" ? null : kls.dataset.kelas; kls.parentElement.querySelectorAll("[data-kelas]").forEach(b => b.setAttribute("aria-pressed", String(b === kls))); st.hal = 0; jadwalkan(); return; }
    const sts = t.closest("[data-status]");
    if (sts) { const on = sts.getAttribute("aria-pressed") !== "true"; sts.setAttribute("aria-pressed", String(on)); st.status[on ? "add" : "delete"](sts.dataset.status); st.hal = 0; jadwalkan(); return; }
    const p = t.closest(".pgn-b[data-h]");
    if (p && !p.disabled) { p.parentElement.querySelectorAll(".pgn-b").forEach(x => x.removeAttribute("aria-current")); p.setAttribute("aria-current", "page"); st.hal = +p.dataset.h; jadwalkan(); return; }
    const c = t.closest("[data-catat]");
    if (c && st.d) { const [j, id] = c.dataset.catat.split(":"), row = st.rows.find(r => r.sasaran === j && r.id === id); if (row) dialogInspeksi(row); return; }
    if (t.closest("[data-stok]") && st.d) { dialogStok(); return; }
    const a = t.closest("a.sp-kit-kode");
    if (a && !e.button && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); pergi(a.pathname); }
  }, {signal: sinyal});
  await muat();
}
