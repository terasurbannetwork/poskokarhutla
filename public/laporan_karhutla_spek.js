/* Laporan Karhutla: SPEK BERSAMA peramban dan Worker (pola meja_spek.js). Modul ES murni, tanpa DOM dan tanpa D1.
   Isi: bentuk isian per sumber, angka gaya Indonesia, validasi (galat 400), cek MERAH/KUNING (SOP §4), dan SATU fungsi agregasi snapshot (SOP §7.3).
   Peramban: const S = await import("/laporan_karhutla_spek.js"). Worker: import dari ../public/laporan_karhutla_spek.js.
   Daftar tetap di sini HARUS sama dengan CHECK di migrations/0032_laporan_karhutla.sql (dijaga tests/warga/laporan_karhutla.test.mjs).

   Arti kolom FS (keputusan desain): target_ha = luas FS, padam_darat_ha dan padam_udara_ha = luas dipadamkan KUMULATIF SAMPAI tanggal_data, sisa_ha = target - padam (dihitung,
   isian sisa yang menyimpang > 0,01 ha = merah). Luasan kumulatif MUSIM (mis. Kalbar) tidak masuk kolom ini: centang `kumulatif` atau isi `kumulatif_ha`; keduanya tidak pernah dijumlah.
   Dua tanggal: tanggal_laporan (D, hari dikunci) dan tanggal_data (D-1, pantauan 24 jam, cut-off D 07.00 WIB). */

export const SUMBER_TETAP = ["udara", "omc", "koordalops"];
export const PRIORITAS_BAWAAN = ["62", "63", "61", "16", "15", "14"];   // urutan laporan asli BNPB: Kalteng, Kalsel, Kalbar, Sumsel, Jambi, Riau
export const WILAYAH = {Kalimantan: ["61", "62", "63", "64", "65"], Sumatera: ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21"]};
export const NAMA_PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung", "19": "Kep. Bangka Belitung", "21": "Kepulauan Riau",
  "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara"};
export const STATUS_KIRIMAN = ["draf", "terkirim", "dikembalikan", "disetujui"];
export const STATUS_FS = ["menyala", "bara", "padam"];
export const UNSUR = {bpbd: "BPBD", tni: "TNI", polri: "Polri", manggala_agni: "Manggala Agni", mpa: "MPA", swasta: "Swasta", relawan: "Relawan", pemda: "Pemda", kehutanan: "Kehutanan"};
export const ISPU = ["baik", "sedang", "tidak_sehat", "sangat_tidak_sehat", "berbahaya"];
export const SEKOLAH = ["normal", "daring", "libur"];
export const PENERBANGAN = ["normal", "terganggu", "ditutup"];
export const HUJAN = ["tidak", "ringan", "sedang", "lebat"];
export const HAMBATAN = {air_jauh: "Sumber air jauh", akses_sulit_rawa: "Akses sulit di rawa dan gambut", roda_empat_sulit: "Kendaraan roda empat sulit masuk", air_tidak_cukup: "Air tidak cukup",
  asap_tebal: "Asap tebal", angin_kencang: "Angin kencang", personel_terbatas: "Personel terbatas", alat_terbatas: "Peralatan terbatas"};
export const UPAYA = {pemadaman_darat: "Pemadaman darat", water_bombing: "Water bombing", patroli_terpadu: "Patroli terpadu", pembasahan_gambut: "Pembasahan gambut", sekat_kanal: "Sekat kanal",
  omc: "Operasi modifikasi cuaca", penegakan_hukum: "Penegakan hukum", sosialisasi: "Sosialisasi"};
export const DARURAT = {tidak: "Tidak berstatus", siaga_darurat: "Siaga darurat", tanggap_darurat: "Tanggap darurat"};
export const PEMILIK_ARMADA = ["BNPB", "KLHK", "BPBD", "TNI", "Polri", "Swasta", "Lainnya"];
export const ALASAN_TIDAK_TERBANG = {visibilitas: "Jarak pandang", pemeliharaan: "Pemeliharaan", siaga: "Siaga", cuaca: "Cuaca", lainnya: "Lainnya"};
export const BAHAN_OMC = {nacl: "NaCl", dry_ice: "Dry ice"};
export const KATEGORI_ALAT = ["pompa", "selang_1_5", "selang_2_5", "nozzle", "jet_shooter_lance", "tangki_fleksibel", "mobil_tangki", "mobil_pemadam", "motor_trail", "alat_berat", "drone_termal", "genset", "perahu",
  "apd_set", "scba", "kepyok_garu", "pompa_punggung", "ht_radio", "tenda", "lainnya"];   // sama dengan KATEGORI src/inventaris.js (dijaga uji)
/* SATU sumber label kategori alat untuk WA, kartu verifikasi, dan form: "selang 2,5 inci", bukan "selang 2 5" */
const LABEL_ALAT = {selang_1_5: "selang 1,5 inci", selang_2_5: "selang 2,5 inci", jet_shooter_lance: "jet shooter/lance", apd_set: "set APD", scba: "SCBA", kepyok_garu: "kepyok dan garu", ht_radio: "HT/radio"};
export const labelAlat = k => LABEL_ALAT[k] ?? String(k).replace(/_/g, " ");
export const KALIMAT_OMC = "kesesuaian lokasi hujan dengan sasaran belum membuktikan sebab-akibat";
const TOL = 0.011;

/* ================================================================ angka dan tanggal */
/* angka gaya Indonesia: "1.234,56" -> 1234.56, "74,77" -> 74.77, "2.083" -> 2083 (titik ribuan), "74.77" -> 74.77. Kosong -> null. Tak terbaca -> NaN. */
export function angkaID(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v !== "string") return NaN;
  let s = v.trim().replace(/\s+/g, "");
  if (s === "") return null;
  if (s.includes(",")) { if (!/^-?\d{1,3}(\.\d{3})*,\d+$|^-?\d+,\d+$/.test(s)) return NaN; s = s.replace(/\./g, "").replace(",", "."); }
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  else if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  const n = Number(s); return Number.isFinite(n) ? n : NaN;
}
const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
export const tglSah = t => typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(t + "T00:00:00Z")) && new Date(t + "T00:00:00Z").toISOString().slice(0, 10) === t;
export const geserHari = (t, n) => new Date(Date.parse(t + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
export const tanggalData = tanggalLaporan => geserHari(tanggalLaporan, -1);
/* teks satu baris: karakter kontrol dibuang dan SEMUA whitespace (termasuk \n dan \t) jadi satu spasi, supaya isian tidak bisa menyisipkan baris palsu ke teks WA */
export const ringkas = s => String(s).replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, "").normalize("NFC").replace(/\s+/g, " ").trim();
export const namaProv = k => NAMA_PROV[k] ?? k;
export const kodeDariSumber = s => /^prov:\d{2}$/.test(s) ? s.slice(5) : null;
export const sumberSah = s => typeof s === "string" && (SUMBER_TETAP.includes(s) || kodeDariSumber(s) !== null);
export const labelSumber = s => kodeDariSumber(s) ? namaProv(kodeDariSumber(s)) : {udara: "Operasi udara", omc: "OMC", koordalops: "Dit. Koordalops"}[s] ?? s;
export const sumberWajib = prioritas => [...prioritas.map(k => "prov:" + k), "udara", "omc"];

/* ================================================================ pembaca bernilai: kumpulkan galat, jangan lempar */
function Baca(galat, kirim) {
  const g = (jalur, pesan) => galat.push({jalur, pesan});
  return {
    g, kirim,
    teks(v, j, maks, {wajib = false} = {}) {
      if (v == null || v === "") { if (wajib && kirim) g(j, "wajib diisi"); return null; }
      if (typeof v !== "string") { g(j, "harus teks"); return null; }
      const s = ringkas(v); if (s.length > maks) { g(j, `maksimal ${maks} karakter`); return null; }
      if (!s && wajib && kirim) g(j, "wajib diisi"); return s || null;
    },
    ha(v, j, {wajib = false, maks = 1e6} = {}) {
      const n = angkaID(v);
      if (n === null) { if (wajib && kirim) g(j, "wajib diisi (isi 0 bila tidak ada)"); return null; }
      if (Number.isNaN(n)) { g(j, "bukan angka (contoh 1.234,56)"); return null; }
      if (n < 0 || n > maks) { g(j, `harus 0 sampai ${maks}`); return null; }
      return r2(n);
    },
    bulat(v, j, {wajib = false, maks = 1e8} = {}) {
      const n = angkaID(v);
      if (n === null) { if (wajib && kirim) g(j, "wajib diisi (isi 0 bila tidak ada)"); return null; }
      if (Number.isNaN(n) || !Number.isInteger(n)) { g(j, "harus bilangan bulat (contoh 2.083)"); return null; }
      if (n < 0 || n > maks) { g(j, `harus 0 sampai ${maks}`); return null; }
      return n;
    },
    pilih(v, j, daftar, {wajib = false} = {}) {
      if (v == null || v === "") { if (wajib && kirim) g(j, "wajib dipilih"); return null; }
      if (typeof v !== "string" || !daftar.includes(v)) { g(j, `harus salah satu dari ${daftar.join("/")}`); return null; }
      return v;
    },
    kode(v, j, kamus) {
      if (v == null) return [];
      if (!Array.isArray(v) || v.length > 20) { g(j, "harus daftar pilihan"); return []; }
      const ok = v.filter(x => typeof x === "string" && Object.hasOwn(kamus, x));
      if (ok.length !== v.length) g(j, "ada pilihan yang tidak dikenal");
      return [...new Set(ok)];
    },
    tgl(v, j) { if (v == null || v === "") return null; if (!tglSah(v)) { g(j, "tanggal harus YYYY-MM-DD"); return null; } return v; },
    jam(v, j, {wajib = false} = {}) { if (v == null || v === "") { if (wajib && kirim) g(j, "jam wajib (HH:MM)"); return null; } if (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) { g(j, "jam harus HH:MM"); return null; } return v; },
    larik(v, j, maks) { if (v == null) return []; if (!Array.isArray(v)) { g(j, "harus daftar"); return []; } if (v.length > maks) { g(j, `maksimal ${maks} baris`); return v.slice(0, maks); } return v; },
    obj(v, j) { if (v == null) return {}; if (typeof v !== "object" || Array.isArray(v)) { g(j, "harus objek"); return {}; } return v; },
    bool: v => v === true || v === "true" || v === 1,
  };
}
const kodeProvs = (b, v, j) => { const a = b.larik(v, j, 6).filter(x => /^\d{2}$/.test(String(x))).map(String); return [...new Set(a)]; };

/* ================================================================ provinsi */
const kosongTotal = () => ({fs: 0, fs_padam: 0, fs_sisa: 0, target_ha: 0, padam_ha: 0, sisa_ha: 0});
export function jumlahBaris(fs) {
  const t = kosongTotal();
  for (const f of fs) { if (f.kumulatif) continue; t.fs++; if (f.status === "padam" || f.sisa_ha <= TOL) t.fs_padam++; else t.fs_sisa++; t.target_ha += f.target_ha ?? 0; t.padam_ha += (f.padam_darat_ha ?? 0) + (f.padam_udara_ha ?? 0); }
  t.target_ha = r2(t.target_ha); t.padam_ha = r2(t.padam_ha); t.sisa_ha = r2(t.target_ha - t.padam_ha); return t;
}
function bacaTotal(b, o, j) {
  const t = {fs: b.bulat(o.fs, j + ".fs", {wajib: true}), fs_padam: b.bulat(o.fs_padam, j + ".fs_padam", {wajib: true}), fs_sisa: b.bulat(o.fs_sisa, j + ".fs_sisa"),
    target_ha: b.ha(o.target_ha, j + ".target_ha", {wajib: true}), padam_ha: b.ha(o.padam_ha, j + ".padam_ha", {wajib: true}), sisa_ha: b.ha(o.sisa_ha, j + ".sisa_ha")};
  return t;
}
const lengkapiTotal = t => ({...t, fs_sisa_isian: t.fs_sisa, sisa_isian: t.sisa_ha,
  fs_sisa: t.fs != null && t.fs_padam != null ? t.fs - t.fs_padam : t.fs_sisa, sisa_ha: t.target_ha != null && t.padam_ha != null ? r2(t.target_ha - t.padam_ha) : t.sisa_ha});

/* Normalisasi isi provinsi. konteks: {kode, tanggal_laporan}. Mengembalikan {isi, galat}; galat = pelanggaran bentuk (400), BUKAN merah/kuning. */
export function normalisasiProvinsi(masuk, konteks, kirim = false) {
  const galat = [], b = Baca(galat, kirim), o = b.obj(masuk, "isi"), kode = konteks.kode;
  const isi = {tanggal_data: tanggalData(konteks.tanggal_laporan)};
  const urutId = new Map();
  const daftarFs = b.larik(o.fs, "fs", 400);
  const sudah = new Set(daftarFs.map(f => f?.fs_id).filter(x => typeof x === "string"));
  isi.fs = daftarFs.map((f0, i) => {
    const j = `fs[${i}]`, f = b.obj(f0, j), p = {};
    let id = typeof f.fs_id === "string" ? f.fs_id.trim() : "";
    if (!id) {   // FS baru: identitas tetap FS-<prov>-<YYYYMMDD data>-<NNN>
      const awal = `FS-${kode}-${isi.tanggal_data.replace(/-/g, "")}-`; let n = (urutId.get(awal) ?? 0);
      do { n++; id = awal + String(n).padStart(3, "0"); } while (sudah.has(id));
      urutId.set(awal, n); sudah.add(id);
    } else if (!new RegExp(`^FS-${kode}-\\d{8}-\\d{3,4}$`).test(id)) b.g(j + ".fs_id", `harus berbentuk FS-${kode}-YYYYMMDD-NNN`);
    p.fs_id = id; p.tugas_id = typeof f.tugas_id === "string" && /^[0-9a-f]{16}$/.test(f.tugas_id) ? f.tugas_id : null;
    p.kab = b.teks(f.kab, j + ".kab", 60); p.kec = b.teks(f.kec, j + ".kec", 60);
    const lat = angkaID(f.lat), lon = angkaID(f.lon);
    if ((lat != null && (!(lat >= -11.5 && lat <= 6.5))) || (lon != null && (!(lon >= 94.5 && lon <= 141.5)))) b.g(j + ".lat", "koordinat di luar Indonesia");
    p.lat = lat != null && lat >= -11.5 && lat <= 6.5 && lon != null ? lat : null; p.lon = p.lat != null ? lon : null;
    p.kawasan = b.teks(f.kawasan, j + ".kawasan", 60);
    p.target_ha = b.ha(f.target_ha, j + ".target_ha", {wajib: true}); p.padam_darat_ha = b.ha(f.padam_darat_ha, j + ".padam_darat_ha", {wajib: true}); p.padam_udara_ha = b.ha(f.padam_udara_ha, j + ".padam_udara_ha", {wajib: true});
    p.status = b.pilih(f.status, j + ".status", STATUS_FS, {wajib: true}); p.kumulatif = b.bool(f.kumulatif);
    p.alasan = b.teks(f.alasan, j + ".alasan", 300);
    const t = p.target_ha ?? 0, pd = (p.padam_darat_ha ?? 0) + (p.padam_udara_ha ?? 0);
    p.sisa_ha = r2(t - pd); p.sisa_isian = b.ha(f.sisa_ha, j + ".sisa_ha");
    p.kemarin = f.kemarin && typeof f.kemarin === "object" ? {target_ha: angkaID(f.kemarin.target_ha) ?? null, padam_ha: angkaID(f.kemarin.padam_ha) ?? null} : null;
    return p;
  });
  const ids = isi.fs.map(f => f.fs_id); if (new Set(ids).size !== ids.length) b.g("fs", "fs_id berulang");
  const T = b.obj(o.total, "total");
  isi.total = Object.keys(T).length ? lengkapiTotal(bacaTotal(b, T, "total")) : (isi.fs.length ? {...jumlahBaris(isi.fs), dihitung: true} : null);
  if (!isi.total && kirim) b.g("total", "total provinsi wajib diisi");
  isi.blok = b.larik(o.blok, "blok", 8).map((x0, i) => { const j = `blok[${i}]`, x = b.obj(x0, j); return {kawasan: b.teks(x.kawasan, j + ".kawasan", 60, {wajib: true}), ...lengkapiTotal(bacaTotal(b, x, j))}; });
  const kh = b.obj(o.kumulatif_ha, "kumulatif_ha");
  isi.kumulatif_ha = Object.keys(kh).length ? {ha: b.ha(kh.ha, "kumulatif_ha.ha"), keterangan: b.teks(kh.keterangan, "kumulatif_ha.keterangan", 200)} : null;
  const H = o.hotspot == null ? null : b.obj(o.hotspot, "hotspot");
  isi.hotspot = H ? {total: b.bulat(H.total, "hotspot.total"), tinggi: b.bulat(H.tinggi, "hotspot.tinggi"), sedang: b.bulat(H.sedang, "hotspot.sedang"), sumber: "GIS/satelit"} : null;
  const P = b.obj(o.personel, "personel"), un = b.obj(P.unsur, "personel.unsur"), unsur = {};
  for (const k of Object.keys(UNSUR)) { const v = b.bulat(un[k], "personel.unsur." + k); if (v != null) unsur[k] = v; }
  for (const k of Object.keys(un)) if (!Object.hasOwn(UNSUR, k)) b.g("personel.unsur." + k, "unsur tidak dikenal");
  isi.personel = {total: b.bulat(P.total, "personel.total", {wajib: true}), unsur, shift: b.teks(P.shift, "personel.shift", 120), standby: b.bulat(P.standby, "personel.standby"),
    keterangan: b.teks(P.keterangan, "personel.keterangan", 300), diperbarui: P.diperbarui === false ? false : true};
  isi.peralatan = b.larik(o.peralatan, "peralatan", 40).map((x0, i) => { const j = `peralatan[${i}]`, x = b.obj(x0, j);
    return {kategori: b.pilih(x.kategori, j + ".kategori", KATEGORI_ALAT, {wajib: true}), stok: b.bulat(x.stok, j + ".stok") ?? 0, tambahan: b.bulat(x.tambahan, j + ".tambahan") ?? 0, catatan: b.teks(x.catatan, j + ".catatan", 120)}; });
  isi.kondisi = b.larik(o.kondisi, "kondisi", 60).map((x0, i) => { const j = `kondisi[${i}]`, x = b.obj(x0, j);
    return {kab: b.teks(x.kab, j + ".kab", 60, {wajib: true}), ispu: b.pilih(x.ispu, j + ".ispu", ISPU), jarak_pandang_m: b.bulat(x.jarak_pandang_m, j + ".jarak_pandang_m", {maks: 100000}), sekolah: b.pilih(x.sekolah, j + ".sekolah", SEKOLAH),
      penerbangan: b.pilih(x.penerbangan, j + ".penerbangan", PENERBANGAN), ispa: b.bulat(x.ispa, j + ".ispa"), hujan: b.pilih(x.hujan, j + ".hujan", HUJAN)}; });
  const hb = b.obj(o.hambatan, "hambatan"), up = b.obj(o.upaya, "upaya");
  isi.hambatan = {pilihan: b.kode(hb.pilihan, "hambatan.pilihan", HAMBATAN), teks: b.teks(hb.teks, "hambatan.teks", 500)};
  isi.upaya = {pilihan: b.kode(up.pilihan, "upaya.pilihan", UPAYA), teks: b.teks(up.teks, "upaya.teks", 500)};
  const d = o.darurat == null ? null : b.obj(o.darurat, "darurat");
  isi.darurat = d ? {jenis: b.pilih(d.jenis, "darurat.jenis", Object.keys(DARURAT)), tmt: b.tgl(d.tmt, "darurat.tmt"), sd: b.tgl(d.sd, "darurat.sd")} : null;
  if (isi.darurat && isi.darurat.jenis && isi.darurat.jenis !== "tidak" && !isi.darurat.tmt && kirim) b.g("darurat.tmt", "TMT wajib bila ada status kedaruratan");
  isi.catatan = b.teks(o.catatan, "catatan", 500);
  return {isi, galat};
}

/* ---------------- cek provinsi: [{t: "merah"|"kuning", k, j, p, dijelaskan?}] ---------------- */
const beda = (a, b) => Math.abs((a ?? 0) - (b ?? 0)) > 0.01;
export function cekProvinsi(isi, kemarin = null) {
  const c = [], M = (k, j, p) => c.push({t: "merah", k, j, p}), K = (k, j, p, dijelaskan = false) => c.push({t: "kuning", k, j, p, dijelaskan});
  isi.fs.forEach((f, i) => {
    const j = `fs[${i}]`, nama = [f.kec, f.kab].filter(Boolean).join(", ") || f.fs_id, padam = (f.padam_darat_ha ?? 0) + (f.padam_udara_ha ?? 0);
    if (!f.kab) M("fs_tanpa_kab", j + ".kab", `${f.fs_id}: kab/kota wajib diisi`);
    if (padam - (f.target_ha ?? 0) > 0.01) M("padam_lebih_target", j + ".padam_darat_ha", `${nama}: padam ${padam} ha melebihi target ${f.target_ha ?? 0} ha`);
    if (f.sisa_isian != null && beda(f.sisa_isian, f.sisa_ha)) M("sisa_salah", j + ".sisa_ha", `${nama}: sisa diisi ${f.sisa_isian} ha, seharusnya ${f.sisa_ha} ha (target dikurangi padam)`);
    if (!f.kumulatif && /kumulatif/i.test(f.alasan ?? "")) K("kumulatif_di_harian", j, `${nama}: keterangan menyebut kumulatif; centang "kumulatif" agar luasannya tidak masuk kolom harian`);
  });
  const T = isi.total;
  if (T) {
    if (T.padam_ha - T.target_ha > 0.01) M("padam_lebih_target", "total.padam_ha", `Total: padam ${T.padam_ha} ha melebihi target ${T.target_ha} ha`);
    if (T.sisa_isian != null && beda(T.sisa_isian, T.sisa_ha)) M("sisa_salah", "total.sisa_ha", `Total: sisa diisi ${T.sisa_isian} ha, seharusnya ${T.sisa_ha} ha`);
    if (T.fs_sisa_isian != null && T.fs_sisa_isian !== T.fs_sisa) M("sisa_salah", "total.fs_sisa", `Total: FS sisa diisi ${T.fs_sisa_isian}, seharusnya ${T.fs_sisa} (FS dikurangi FS padam)`);
    if (T.fs_padam > T.fs) M("padam_lebih_target", "total.fs_padam", "Total: FS padam melebihi jumlah FS");
    const nyata = isi.fs.filter(f => !f.kumulatif);
    if (nyata.length && !T.dihitung) {
      const s = jumlahBaris(isi.fs);
      for (const [n, label] of [["fs", "jumlah FS"], ["target_ha", "target (ha)"], ["padam_ha", "padam (ha)"]]) if (beda(s[n], T[n])) M("total_beda_baris", "total." + n, `Total ${label} ${T[n]} tidak sama dengan jumlah baris FS ${r2(s[n])}`);
    }
    if (isi.blok.length) {
      const z = isi.blok.reduce((a, x) => { for (const n of Object.keys(a)) a[n] += x[n] ?? 0; return a; }, kosongTotal());
      for (const [n, label] of [["fs", "jumlah FS"], ["fs_padam", "FS padam"], ["target_ha", "target (ha)"], ["padam_ha", "padam (ha)"]]) if (beda(z[n], T[n])) M("total_beda_blok", "total." + n, `Total ${label} ${T[n]} tidak sama dengan jumlah blok kawasan ${r2(z[n])}`);
      isi.blok.forEach((x, i) => { if (x.sisa_isian != null && beda(x.sisa_isian, x.sisa_ha)) M("sisa_salah", `blok[${i}].sisa_ha`, `Blok ${x.kawasan}: sisa diisi ${x.sisa_isian} ha, seharusnya ${x.sisa_ha} ha`); });
    }
    if (isi.kumulatif_ha?.ha != null && beda(isi.kumulatif_ha.ha, 0) && !beda(isi.kumulatif_ha.ha, T.target_ha)) K("kumulatif_di_harian", "kumulatif_ha.ha", "Luasan kumulatif sama dengan kolom target harian; pastikan kolom harian bukan angka kumulatif");
    if (!isi.fs.length) K("tanpa_rincian_fs", "fs", "Tanpa rincian FS: rekonsiliasi antarhari tidak bisa dilakukan");
  }
  if (isi.personel.unsur && Object.keys(isi.personel.unsur).length) {
    const s = Object.values(isi.personel.unsur).reduce((a, x) => a + x, 0);
    if (isi.personel.total != null && s !== isi.personel.total) M("personel_beda_unsur", "personel.total", `Personel total ${isi.personel.total} tidak sama dengan jumlah unsur ${s}`);
  }
  if (kemarin) {
    const ky = new Map((kemarin.fs ?? []).map(f => [f.fs_id, f]));
    isi.fs.forEach((f, i) => {
      const y = ky.get(f.fs_id); if (!y) return;
      const nama = f.kab ?? f.fs_id, ada = !!f.alasan, pdY = y.padam_ha ?? 0, pdT = (f.padam_darat_ha ?? 0) + (f.padam_udara_ha ?? 0);
      if (beda(f.target_ha, y.target_ha)) K("luasan_berubah", `fs[${i}].target_ha`, `${nama}: target ${y.target_ha} ha kemarin menjadi ${f.target_ha} ha; sisa kemarin + luasan baru - padam tidak cocok tanpa alasan`, ada);
      if (pdY - pdT > 0.01) K("padam_turun", `fs[${i}].padam_darat_ha`, `${nama}: padam turun dari ${pdY} ha menjadi ${r2(pdT)} ha (koreksi wajib beralasan)`, ada);
    });
    const hariIni = new Set(isi.fs.map(f => f.fs_id));
    for (const y of kemarin.fs ?? []) if (y.sisa_ha > 0.01 && !hariIni.has(y.fs_id)) K("fs_hilang", "fs", `${y.fs_id} masih bersisa ${y.sisa_ha} ha kemarin tetapi tidak ada hari ini`, !!isi.catatan);
    const pY = kemarin.personel?.total;
    if (pY > 0 && isi.personel.total != null && Math.abs(isi.personel.total - pY) / pY > 0.5) K("personel_berubah", "personel.total", `Personel berubah lebih dari 50% (${pY} menjadi ${isi.personel.total}); beri keterangan, mis. termasuk shift dan standby`, !!isi.personel.keterangan);
    const hY = kemarin.hotspot?.total, hT = isi.hotspot?.total;
    if (hY > 0 && hT != null && hT > hY * 2 && (isi.total?.fs ?? 0) <= (kemarin.total?.fs ?? 0)) K("hotspot_naik_fs_tetap", "hotspot.total", `Hotspot naik lebih dari 100% (${hY} menjadi ${hT}) tetapi jumlah FS tidak bertambah`, !!isi.catatan);
  }
  return c.map(x => ({...x, p: x.p.replace(/(\d)\.(\d)/g, "$1,$2")}));   // angka dalam kalimat bergaya Indonesia (12,5 ha)
}

/* ================================================================ udara */
const kunciSortie = s => `${s.jenis}|${s.registrasi}|${s.jam_mulai}`;
export function normalisasiUdara(masuk, konteks, kirim = false) {
  const galat = [], b = Baca(galat, kirim), o = b.obj(masuk, "isi"), isi = {tanggal_data: tanggalData(konteks.tanggal_laporan)};
  isi.armada = b.larik(o.armada, "armada", 200).map((x0, i) => { const j = `armada[${i}]`, x = b.obj(x0, j), p = {};
    p.prov = typeof x.prov === "string" && /^\d{2}$/.test(x.prov) ? x.prov : (b.g(j + ".prov", "kode provinsi 2 digit"), null);
    p.pemilik = b.pilih(x.pemilik, j + ".pemilik", PEMILIK_ARMADA, {wajib: true}); p.jenis = b.pilih(x.jenis, j + ".jenis", ["heli", "pesawat"], {wajib: true});
    p.registrasi = b.teks(x.registrasi, j + ".registrasi", 20, {wajib: true}); p.status = b.pilih(x.status, j + ".status", ["siap", "operasi", "tidak_terbang"], {wajib: true});
    p.alasan = b.pilih(x.alasan, j + ".alasan", Object.keys(ALASAN_TIDAK_TERBANG)); p.keterangan = b.teks(x.keterangan, j + ".keterangan", 200);
    if (p.status === "tidak_terbang" && !p.alasan && kirim) b.g(j + ".alasan", "alasan tidak terbang wajib");
    return p; });
  isi.sortie = b.larik(o.sortie, "sortie", 300).map((x0, i) => { const j = `sortie[${i}]`, x = b.obj(x0, j), p = {};
    p.jenis = b.pilih(x.jenis, j + ".jenis", ["wb", "patroli"], {wajib: true}); p.registrasi = b.teks(x.registrasi, j + ".registrasi", 20, {wajib: true}); p.jam_mulai = b.jam(x.jam_mulai, j + ".jam_mulai", {wajib: true});
    p.provs = kodeProvs(b, x.provs, j + ".provs"); if (!p.provs.length && kirim) b.g(j + ".provs", "minimal satu provinsi"); p.lintas = b.bool(x.lintas);
    p.bom = b.bulat(x.bom, j + ".bom", {maks: 1000}); p.liter = b.bulat(x.liter, j + ".liter", {maks: 1e7}); p.padam_ha = b.ha(x.padam_ha, j + ".padam_ha", {maks: 1e5});
    p.durasi_menit = b.bulat(x.durasi_menit, j + ".durasi_menit", {maks: 1440}); p.lokasi = b.teks(x.lokasi, j + ".lokasi", 120);
    p.temuan_fs = b.bulat(x.temuan_fs, j + ".temuan_fs", {maks: 1000}); p.temuan_ha = b.ha(x.temuan_ha, j + ".temuan_ha", {maks: 1e5}); p.fs_id = typeof x.fs_id === "string" && /^FS-\d{2}-\d{8}-\d{3,4}$/.test(x.fs_id) ? x.fs_id : null;
    return p; });
  isi.alasan_kosong = b.teks(o.alasan_kosong, "alasan_kosong", 200); isi.catatan = b.teks(o.catatan, "catatan", 500);
  if (!isi.sortie.length && !isi.armada.length && !isi.alasan_kosong && kirim) b.g("sortie", "tanpa armada dan sortie wajib menulis alasan_kosong");
  return {isi, galat};
}
function cekSortie(daftar, jenisLabel) {
  const c = [], per = new Map();
  daftar.forEach((s, i) => { const k = kunciSortie(s); (per.get(k) ?? per.set(k, []).get(k)).push([s, i]);
    if (s.provs.length > 1 && !s.lintas) c.push({t: "merah", k: "sortie_dua_provinsi", j: `sortie[${i}].lintas`, p: `${jenisLabel} ${s.registrasi} ${s.jam_mulai} tercatat di ${s.provs.length} provinsi tanpa tanda "lintas provinsi"`}); });
  for (const [, g] of per) if (g.length > 1) {
    if (!g.every(([s]) => s.lintas)) c.push({t: "merah", k: "sortie_ganda", j: `sortie[${g[1][1]}]`, p: `${jenisLabel} ${g[0][0].registrasi} ${g[0][0].jam_mulai} tercatat ${g.length} kali tanpa tanda "lintas provinsi" (dihitung sekali di total nasional)`});
    else if (g.some(([s]) => s.bom !== g[0][0].bom || s.liter !== g[0][0].liter || (s.kg ?? null) !== (g[0][0].kg ?? null))) c.push({t: "kuning", k: "sortie_lintas_beda_angka", j: `sortie[${g[1][1]}]`, p: `${jenisLabel} ${g[0][0].registrasi} lintas provinsi dengan angka berbeda antarbaris; dipakai baris pertama`, dijelaskan: false});
  }
  return c;
}
export const cekUdara = isi => cekSortie(isi.sortie, "Sortie");

/* ================================================================ OMC */
export function normalisasiOmc(masuk, konteks, kirim = false) {
  const galat = [], b = Baca(galat, kirim), o = b.obj(masuk, "isi"), isi = {tanggal_data: tanggalData(konteks.tanggal_laporan)};
  isi.sortie = b.larik(o.sortie, "sortie", 100).map((x0, i) => { const j = `sortie[${i}]`, x = b.obj(x0, j), p = {};
    p.jenis = "omc"; p.registrasi = b.teks(x.registrasi, j + ".registrasi", 20, {wajib: true}); p.jam_mulai = b.jam(x.jam_mulai, j + ".jam_mulai", {wajib: true});
    p.bahan = b.pilih(x.bahan, j + ".bahan", Object.keys(BAHAN_OMC), {wajib: true}); p.kg = b.ha(x.kg, j + ".kg", {wajib: true, maks: 1e5});
    p.sasaran = b.larik(x.sasaran, j + ".sasaran", 20).map(s => typeof s === "string" ? ringkas(s).slice(0, 60) : "").filter(Boolean);
    p.provs = kodeProvs(b, x.provs, j + ".provs"); if (!p.provs.length && kirim) b.g(j + ".provs", "minimal satu provinsi"); p.lintas = b.bool(x.lintas); p.ketinggian_ft = b.bulat(x.ketinggian_ft, j + ".ketinggian_ft", {maks: 60000});
    return p; });
  isi.hasil = b.larik(o.hasil, "hasil", 100).map((x0, i) => { const j = `hasil[${i}]`, x = b.obj(x0, j);
    return {sasaran: b.teks(x.sasaran, j + ".sasaran", 80, {wajib: true}), hujan: b.pilih(x.hujan, j + ".hujan", ["ya", "tidak", "tidak_diketahui"]), curah_mm: b.ha(x.curah_mm, j + ".curah_mm", {maks: 1000}),
      pm25_sebelum: b.ha(x.pm25_sebelum, j + ".pm25_sebelum", {maks: 2000}), pm25_sesudah: b.ha(x.pm25_sesudah, j + ".pm25_sesudah", {maks: 2000}),
      jarak_pandang_sebelum_m: b.bulat(x.jarak_pandang_sebelum_m, j + ".jarak_pandang_sebelum_m", {maks: 100000}), jarak_pandang_sesudah_m: b.bulat(x.jarak_pandang_sesudah_m, j + ".jarak_pandang_sesudah_m", {maks: 100000})}; });
  isi.alasan_kosong = b.teks(o.alasan_kosong, "alasan_kosong", 200); isi.catatan = b.teks(o.catatan, "catatan", 500);
  if (!isi.sortie.length && !isi.alasan_kosong && kirim) b.g("sortie", "tanpa sortie wajib menulis alasan_kosong");
  return {isi, galat};
}
export const cekOmc = isi => cekSortie(isi.sortie, "Sortie OMC");

/* ================================================================ koordalops */
export function normalisasiKoordalops(masuk, konteks, kirim = false) {
  const galat = [], b = Baca(galat, kirim), o = b.obj(masuk, "isi"), isi = {tanggal_data: tanggalData(konteks.tanggal_laporan)};
  isi.kejadian = b.larik(o.kejadian, "kejadian", 100).map((x0, i) => { const j = `kejadian[${i}]`, x = b.obj(x0, j);
    return {prov: b.teks(x.prov, j + ".prov", 40, {wajib: true}), kab: b.teks(x.kab, j + ".kab", 60), jenis: b.teks(x.jenis, j + ".jenis", 40) ?? "karhutla", luas_ha: b.ha(x.luas_ha, j + ".luas_ha"), keterangan: b.teks(x.keterangan, j + ".keterangan", 200)}; });
  const hn = o.hotspot_nasional == null ? null : b.obj(o.hotspot_nasional, "hotspot_nasional");   // rincian keyakinan hotspot tingkat nasional (GIS Pusat) bila provinsi tidak merinci
  isi.hotspot_nasional = hn ? {total: b.bulat(hn.total, "hotspot_nasional.total"), tinggi: b.bulat(hn.tinggi, "hotspot_nasional.tinggi"), sedang: b.bulat(hn.sedang, "hotspot_nasional.sedang")} : null;
  isi.dari_laporan_bnpb = b.bool(o.dari_laporan_bnpb); isi.alasan_kosong = b.teks(o.alasan_kosong, "alasan_kosong", 200); isi.catatan = b.teks(o.catatan, "catatan", 500);
  if (!isi.kejadian.length && !isi.alasan_kosong && kirim) b.g("kejadian", "tanpa kejadian wajib menulis alasan_kosong");
  return {isi, galat};
}

/* ================================================================ pintu tunggal per sumber */
export function normalisasi(sumber, masuk, tanggal_laporan, kirim = false) {
  const kode = kodeDariSumber(sumber);
  if (kode) return normalisasiProvinsi(masuk, {kode, tanggal_laporan}, kirim);
  const f = {udara: normalisasiUdara, omc: normalisasiOmc, koordalops: normalisasiKoordalops}[sumber];
  if (!f) return {isi: null, galat: [{jalur: "sumber", pesan: "sumber tidak dikenal"}]};
  return f(masuk, {tanggal_laporan}, kirim);
}
/* ================================================================ galat dalam bahasa manusia (peramban dan Worker memakai fungsi yang sama) */
const BAGIAN_GALAT = {fs: "Fire spot", blok: "Blok kawasan", kondisi: "Kondisi kabupaten", peralatan: "Peralatan", sortie: "Sortie", personel: "Personel", hambatan: "Hambatan", upaya: "Upaya", darurat: "Status darurat", hotspot: "Hotspot", kumulatif_ha: "Luasan kumulatif", total: "Total provinsi"};
const KOLOM_GALAT = {target_ha: "luas target", padam_darat_ha: "padam darat", padam_udara_ha: "padam udara", padam_ha: "luas padam", sisa_ha: "sisa", fs: "jumlah FS", fs_padam: "FS padam", fs_sisa: "FS sisa", kab: "kabupaten/kota", kec: "kecamatan",
  lat: "koordinat", lon: "koordinat", status: "status", kawasan: "kawasan", alasan: "alasan", fs_id: "kode FS", jarak_pandang_m: "jarak pandang", ispu: "ISPU", ispa: "kasus ISPA", total: "total", unsur: "unsur", kategori: "kategori alat", stok: "stok", tambahan: "tambahan"};
/* {jalur: "fs[2].padam_udara_ha", pesan: "wajib diisi"} -> "Fire spot 3: padam udara wajib diisi" (nomor baris dimulai dari 1) */
export function galatManusia({jalur = "", pesan = ""} = {}) {
  if (!jalur || jalur === "kirim" || jalur === "sumber") return pesan;
  const m = String(jalur).match(/^(\w+)(?:\[(\d+)\])?\.?(.*)$/);
  if (!m) return `${jalur}: ${pesan}`;
  const [, bagian, no, sisa] = m, nama = BAGIAN_GALAT[bagian] ?? bagian.replace(/_/g, " "), kolom = sisa.split(".").filter(Boolean).map(x => KOLOM_GALAT[x] ?? x.replace(/_/g, " ")).filter((x, i, a) => a.indexOf(x) === i).join(" ");
  if (!no && !kolom) return pesan.replace(/^./, c => c.toUpperCase());
  return `${nama}${no != null ? " " + (Number(no) + 1) : ""}: ${kolom ? kolom + " " : ""}${pesan}`;
}
/* isian wajib yang masih kosong, dari validasi KIRIM (aturan yang sama dengan Worker): daftar kalimat; kosong = isian minimal terpenuhi */
export const kurangMinimal = (sumber, masuk, tanggal_laporan) => normalisasi(sumber, masuk, tanggal_laporan, true).galat.map(galatManusia);
export function cek(sumber, isi, kemarin = null) {
  if (kodeDariSumber(sumber)) return cekProvinsi(isi, kemarin);
  if (sumber === "udara") return cekUdara(isi);
  if (sumber === "omc") return cekOmc(isi);
  return [];
}
export const adaMerah = c => c.some(x => x.t === "merah");
export const hitungCek = c => ({merah: c.filter(x => x.t === "merah").length, kuning: c.filter(x => x.t === "kuning").length, kuning_belum_dijelaskan: c.filter(x => x.t === "kuning" && !x.dijelaskan).length});

/* ================================================================ status hari */
/* kiriman: Map/obj sumber -> {status}; hasil: belum_lengkap | lengkap | dikunci | dikunci_pengecualian */
export function statusHari({status, prioritas, kiriman}) {
  if (status === "dikunci" || status === "dikunci_pengecualian") return status;
  const ok = s => { const k = kiriman[s]?.status; return k === "terkirim" || k === "disetujui"; };
  return sumberWajib(prioritas).every(ok) ? "lengkap" : "belum_lengkap";
}

/* ================================================================ AGREGASI SNAPSHOT (satu fungsi, dipakai kunci DAN ralat) */
const jml = (a, f) => a.reduce((s, x) => s + (f(x) ?? 0), 0);
const kosongHariIni = () => ({fs: 0, fs_padam: 0, fs_sisa: 0, target_ha: 0, padam_ha: 0, sisa_ha: 0});
const padatProv = p => p && {fs: p.total?.fs ?? null, fs_padam: p.total?.fs_padam ?? null, fs_sisa: p.total?.fs_sisa ?? null, target_ha: p.total?.target_ha ?? null, padam_ha: p.total?.padam_ha ?? null, sisa_ha: p.total?.sisa_ha ?? null,
  hotspot: p.hotspot?.total ?? null, personel: p.personel?.total ?? null};

/* masuk: {tanggal_laporan, prioritas, pengecualian: [{sumber, alasan}], kiriman: {sumber: {isi, data_terakhir?: tanggal}}, sebelumnya: [snapshot...] (urut naik),
   satelit: objek laporan.json atau null, ralat, alasan, dikunci_oleh, dikunci_pada}. Hanya angka dari kiriman; tidak ada angka karangan: sumber kosong menghasilkan null. */
export function agregasi(masuk) {
  const {tanggal_laporan, prioritas, pengecualian = [], kiriman, sebelumnya = [], satelit = null} = masuk;
  const urutan = k => { const i = PRIORITAS_BAWAAN.indexOf(k); return i < 0 ? 100 : i; };   // urutan laporan asli BNPB (WA dan data); provinsi tambahan di belakang
  const td = tanggalData(tanggal_laporan), pr = [...prioritas].sort((a, b) => urutan(a) - urutan(b) || a.localeCompare(b));
  const tanpa = new Map(pengecualian.map(p => [p.sumber, p]));
  const dari = s => kiriman[s]?.isi ?? null;
  const prov = pr.map(kode => {
    const sumber = "prov:" + kode, isi = dari(sumber), x = kiriman[sumber];
    return {kode, nama: namaProv(kode), wilayah: Object.keys(WILAYAH).find(w => WILAYAH[w].includes(kode)) ?? null, sumber, lanjut_tanpa: tanpa.has(sumber) ? {alasan: tanpa.get(sumber).alasan, data_terakhir: x?.data_terakhir ?? null} : null,
      data_terakhir: x?.data_terakhir ?? null, ada: !!isi,
      total: isi?.total ? {fs: isi.total.fs, fs_padam: isi.total.fs_padam, fs_sisa: isi.total.fs_sisa, target_ha: isi.total.target_ha, padam_ha: isi.total.padam_ha, sisa_ha: isi.total.sisa_ha} : null,
      blok: isi?.blok?.map(({kawasan, fs, fs_padam, fs_sisa, target_ha, padam_ha, sisa_ha}) => ({kawasan, fs, fs_padam, fs_sisa, target_ha, padam_ha, sisa_ha})) ?? [],
      kumulatif_ha: isi?.kumulatif_ha ?? null, fs: (isi?.fs ?? []).map(({sisa_isian, kemarin, ...f}) => f), hotspot: isi?.hotspot ?? null, personel: isi?.personel ?? null, peralatan: isi?.peralatan ?? [],
      kondisi: isi?.kondisi ?? [], hambatan: isi?.hambatan ?? null, upaya: isi?.upaya ?? null, darurat: isi?.darurat ?? null, catatan: isi?.catatan ?? null};
  });
  const ada = prov.filter(p => p.total);
  const tot = kosongHariIni(); for (const k of Object.keys(tot)) tot[k] = k.endsWith("_ha") ? r2(jml(ada, p => p.total[k])) : jml(ada, p => p.total[k]);
  const dgHot = prov.filter(p => p.hotspot?.total != null);
  const hn = dari("koordalops")?.hotspot_nasional ?? null;
  let hotspot = dgHot.length ? {total: jml(dgHot, p => p.hotspot.total), tinggi: dgHot.every(p => p.hotspot.tinggi != null) ? jml(dgHot, p => p.hotspot.tinggi) : null,
    sedang: dgHot.every(p => p.hotspot.sedang != null) ? jml(dgHot, p => p.hotspot.sedang) : null, sumber: "GIS/satelit"} : null;
  if (hotspot && hotspot.tinggi == null && hn && hn.total === hotspot.total && hn.tinggi != null && hn.sedang != null) hotspot = {...hotspot, tinggi: hn.tinggi, sedang: hn.sedang};   // hanya bila jumlahnya cocok
  const dgPers = prov.filter(p => p.personel?.total != null), unsurNas = Object.fromEntries(Object.keys(UNSUR).map(k => [k, 0]));
  let tanpaRinci = 0; for (const p of dgPers) { const u = p.personel.unsur ?? {}; if (Object.keys(u).length) for (const [k, v] of Object.entries(u)) unsurNas[k] += v; else tanpaRinci += p.personel.total; }
  const personel = {total: jml(dgPers, p => p.personel.total), unsur: unsurNas, tanpa_rincian: tanpaRinci, standby: jml(dgPers, p => p.personel.standby)};
  const alat = new Map(); for (const p of prov) for (const a of p.peralatan) { const e = alat.get(a.kategori) ?? alat.set(a.kategori, {kategori: a.kategori, stok: 0, tambahan: 0}).get(a.kategori); e.stok += a.stok; e.tambahan += a.tambahan; }
  const wilayah = Object.keys(WILAYAH).map(w => { const ps = ada.filter(p => p.wilayah === w), z = kosongHariIni();
    for (const k of Object.keys(z)) z[k] = k.endsWith("_ha") ? r2(jml(ps, p => p.total[k])) : jml(ps, p => p.total[k]);
    return {wilayah: w, provinsi: ps.map(p => p.kode), ...z, hotspot: ps.some(p => p.hotspot?.total != null) ? jml(ps, p => p.hotspot?.total) : null, personel: ps.some(p => p.personel?.total != null) ? jml(ps, p => p.personel?.total) : null}; }).filter(w => w.provinsi.length);
  /* udara dan OMC: sortie lintas provinsi dihitung SEKALI */
  const U = dari("udara"), uniq = (daftar, kunci) => { const m = new Map(); for (const s of daftar) { const k = kunci(s); if (!m.has(k)) m.set(k, {...s, provs: [...s.provs]}); else for (const p of s.provs) if (!m.get(k).provs.includes(p)) m.get(k).provs.push(p); } return [...m.values()]; };
  const wb = uniq((U?.sortie ?? []).filter(s => s.jenis === "wb"), kunciSortie), patroli = uniq((U?.sortie ?? []).filter(s => s.jenis === "patroli"), kunciSortie);
  const perProvSortie = Object.fromEntries(pr.map(k => [k, {wb: wb.filter(s => s.provs.includes(k)).length, patroli: patroli.filter(s => s.provs.includes(k)).length}]));
  const udara = U ? {armada: U.armada, armada_per_provinsi: Object.fromEntries([...new Set(U.armada.map(a => a.prov))].filter(Boolean).map(k => [k, {total: U.armada.filter(a => a.prov === k).length, siap: U.armada.filter(a => a.prov === k && a.status !== "tidak_terbang").length,
      tidak_terbang: U.armada.filter(a => a.prov === k && a.status === "tidak_terbang").map(a => ({registrasi: a.registrasi, alasan: a.alasan}))}])),
    water_bombing: {sortie: wb.length, bom: jml(wb, s => s.bom), liter: jml(wb, s => s.liter), padam_ha: r2(jml(wb, s => s.padam_ha)), lintas_provinsi: wb.filter(s => s.provs.length > 1).length, daftar: wb},
    patroli: {sortie: patroli.length, durasi_menit: jml(patroli, s => s.durasi_menit), temuan_fs: jml(patroli, s => s.temuan_fs), temuan_ha: r2(jml(patroli, s => s.temuan_ha)), daftar: patroli},
    per_provinsi: perProvSortie, alasan_kosong: U.alasan_kosong, catatan: U.catatan, data_terakhir: kiriman.udara?.data_terakhir ?? null} : null;
  const O = dari("omc"), os = O ? uniq(O.sortie, kunciSortie) : [];
  const omc = O ? {sortie: os.length, lintas_provinsi: os.filter(s => s.provs.length > 1).length, kg_total: r2(jml(os, s => s.kg)),
    per_bahan: Object.fromEntries(Object.keys(BAHAN_OMC).map(k => [k, {sortie: os.filter(s => s.bahan === k).length, kg: r2(jml(os.filter(s => s.bahan === k), s => s.kg))}])),
    per_provinsi: Object.fromEntries(pr.map(k => [k, {sortie: os.filter(s => s.provs.includes(k)).length, kg: r2(jml(os.filter(s => s.provs.includes(k)), s => s.kg))}])),
    daftar: os, hasil: O.hasil, kalimat_hujan: KALIMAT_OMC, alasan_kosong: O.alasan_kosong, catatan: O.catatan, data_terakhir: kiriman.omc?.data_terakhir ?? null} : null;
  const diluar = dari("koordalops") ? {kejadian: dari("koordalops").kejadian, catatan: dari("koordalops").catatan, data_terakhir: kiriman.koordalops?.data_terakhir ?? null} : null;
  /* tiga hari: dua snapshot sebelumnya (dibaca dari snapshot, tidak dihitung ulang) + hari ini */
  const riwayat = sebelumnya.slice(-3).map(s => ({tanggal_laporan: s.tanggal_laporan, tanggal_data: s.tanggal_data, ralat: s.ralat, nasional: {...s.nasional.fs_ha, hotspot: s.nasional.hotspot?.total ?? null, personel: s.nasional.personel?.total ?? null},
    provinsi: Object.fromEntries((s.provinsi ?? []).map(p => [p.kode, padatProv(p)]))}));
  const hariIni = {tanggal_laporan, tanggal_data: td, ralat: masuk.ralat ?? 0, nasional: {...tot, hotspot: hotspot?.total ?? null, personel: personel.total}, provinsi: Object.fromEntries(prov.map(p => [p.kode, padatProv(p)]))};
  const kumulatif = prov.filter(p => p.kumulatif_ha?.ha != null).map(p => ({kode: p.kode, nama: p.nama, ha: p.kumulatif_ha.ha, keterangan: p.kumulatif_ha.keterangan, dijumlah: false}));
  const nasional = {fs_ha: tot, hotspot, personel, peralatan: [...alat.values()], provinsi_terisi: ada.length, provinsi_wajib: pr.length, kumulatif_tidak_dijumlah: kumulatif,
    udara: udara ? {wb_sortie: udara.water_bombing.sortie, patroli_sortie: udara.patroli.sortie, armada: udara.armada.length} : null, omc: omc ? {sortie: omc.sortie, kg_total: omc.kg_total} : null};
  const sat = satelit ? ((p) => ({hari: satelit.hari ?? null, tren: pr.map(k => ({kode: k, nama: namaProv(k), titik: p[k]?.titik ?? null, luas: p[k]?.luas ?? null})),
    kompleks: pr.map(k => ({kode: k, kompleks: p[k]?.kompleks ?? null, luas_kompleks: p[k]?.luas_kompleks ?? null})), riwayat_tahunan: pr.map(k => ({kode: k, perkiraan: satelit.luas_banding?.prov?.[k]?.perkiraan ?? null, sipongi: satelit.luas_banding?.prov?.[k]?.sipongi ?? null}))}))(satelit.prov ?? {}) : null;
  const snap = {
    skema: 1, tanggal_laporan, tanggal_data: td, ralat: masuk.ralat ?? 0, alasan_ralat: masuk.alasan ?? null,
    status: pengecualian.length ? "dikunci_pengecualian" : "dikunci", dikunci_oleh: masuk.dikunci_oleh ?? null, dikunci_pada: masuk.dikunci_pada ?? null,
    pengecualian: pengecualian.map(p => ({sumber: p.sumber, label: labelSumber(p.sumber), alasan: p.alasan, data_terakhir: kiriman[p.sumber]?.data_terakhir ?? null})),
    prioritas: pr, nasional, wilayah, provinsi: prov, udara, omc, di_luar_prioritas: diluar,
    tiga_hari: [...riwayat.slice(-2), hariIni], riwayat,
    /* lampiran: pemetaan A1-A11 dan B1-B5 menurut SOP §5 (halaman utama 1-3 = nasional, wilayah, provinsi) */
    lampiran: {
      A1_fs_per_provinsi: prov.map(p => ({kode: p.kode, nama: p.nama, ...p.total, blok: p.blok})),
      A2_rincian_fs: prov.map(p => ({kode: p.kode, nama: p.nama, fs: p.fs})),
      A3_personel: prov.map(p => ({kode: p.kode, nama: p.nama, ...(p.personel ?? {total: null})})),
      A4_peralatan: prov.map(p => ({kode: p.kode, nama: p.nama, peralatan: p.peralatan})),
      A5_kondisi_wilayah: prov.map(p => ({kode: p.kode, nama: p.nama, kondisi: p.kondisi})),
      A6_hambatan_upaya: prov.map(p => ({kode: p.kode, nama: p.nama, hambatan: p.hambatan, upaya: p.upaya})),
      A7_kedaruratan: prov.map(p => ({kode: p.kode, nama: p.nama, darurat: p.darurat})),
      A8_armada_udara: udara ? {armada: udara.armada, per_provinsi: udara.armada_per_provinsi} : null,
      A9_water_bombing_patroli: udara ? {water_bombing: udara.water_bombing, patroli: udara.patroli, per_provinsi: udara.per_provinsi} : null,
      A10_omc: omc,
      A11_di_luar_prioritas: diluar,
      B1_hotspot_provinsi: prov.map(p => ({kode: p.kode, nama: p.nama, ...(p.hotspot ?? {total: null})})),
      B2_tren_hotspot: sat?.tren ?? null,
      B3_konsesi_gambut: null,   // belum ada aset persen konsesi/gambut per provinsi pada umpan ini: null jujur
      B4_konsesi_terindikasi: sat?.kompleks ?? null,
      B5_riwayat_tahunan: sat?.riwayat_tahunan ?? null,
    },
    satelit: sat ? {hari: sat.hari, sumber: "GIS/satelit (FIRMS), bukan angka lapangan"} : null,
  };
  /* dampak korban jiwa (angka saja, dari korbanHari di Worker): hanya bila ada laporan, jadi snapshot lama dan putar ulang tidak berubah */
  if (masuk.dampak?.laporan > 0) { const d = masuk.dampak; snap.dampak = {tanggal: d.tanggal, laporan: d.laporan, terverifikasi: d.terverifikasi, meninggal: d.meninggal, luka_berat: d.luka_berat, hilang: d.hilang, meninggal_terverifikasi: d.meninggal_terverifikasi, provinsi: d.provinsi.map(({prov, nama, meninggal, luka_berat, hilang}) => ({prov, nama, meninggal, luka_berat, hilang}))}; }
  snap.kesimpulan = kesimpulan(snap);
  return snap;
}

/* dampak korban jiwa: hanya angka. "terverifikasi N dari M" = laporan yang sudah diverifikasi dari seluruh laporan hari itu */
export const teksDampak = d => [[d.meninggal, "meninggal"], [d.luka_berat, "luka berat"], [d.hilang, "hilang"]].filter(([n]) => n > 0).map(([n, l]) => `${n} ${l}`).join(", ") || "tidak ada korban";
export const labelVerifikasi = d => `terverifikasi ${d.terverifikasi} dari ${d.laporan} laporan`;

/* kesimpulan otomatis: kalimat dari angka snapshot saja */
export function kesimpulan(s) {
  const n = s.nasional, f = n.fs_ha, k = [];
  const id = (x, d = 2) => x == null ? "tidak ada data" : Number(x).toLocaleString("id-ID", {maximumFractionDigits: d});
  k.push(`Data ${s.tanggal_data}: ${id(f.fs, 0)} fire spot dengan target ${id(f.target_ha)} ha, padam ${id(f.padam_ha)} ha, belum padam ${id(f.sisa_ha)} ha di ${n.provinsi_terisi} dari ${n.provinsi_wajib} provinsi prioritas.`);
  const sisa = s.provinsi.filter(p => p.total && p.total.sisa_ha > 0).sort((a, b) => b.total.sisa_ha - a.total.sisa_ha)[0];
  if (sisa) k.push(`Sisa terluas di ${sisa.nama}, ${id(sisa.total.sisa_ha)} ha (${id(sisa.total.fs_sisa, 0)} FS belum padam).`);
  if (n.hotspot) k.push(`Satelit (GIS) mendeteksi ${id(n.hotspot.total, 0)} hotspot di provinsi prioritas.`);
  if (s.dampak) k.push(`Korban jiwa ${s.dampak.tanggal}: ${teksDampak(s.dampak)} (${labelVerifikasi(s.dampak)}).`);
  for (const p of s.pengecualian) k.push(`${p.label}: data terakhir ${p.data_terakhir ?? "tidak ada"}, dikunci tanpa kiriman terbaru (${p.alasan}).`);
  return k;
}

/* daftar angka berubah antara dua snapshot (untuk ralat): [{jalur, lama, baru}] pada daun angka dan teks, tanpa kolom turunan waktu */
export function bedaSnapshot(lama, baru) {
  const out = [], abaikan = new Set(["ralat", "alasan_ralat", "dikunci_oleh", "dikunci_pada", "status", "kesimpulan", "riwayat", "tiga_hari"]);
  const jalan = (a, b, j) => {
    if (a === b) return;
    if (a && b && typeof a === "object" && typeof b === "object") {
      const ks = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of ks) { if (!j && abaikan.has(k)) continue; jalan(a[k], b[k], j ? `${j}.${k}` : k); } return;
    }
    out.push({jalur: j, lama: a ?? null, baru: b ?? null});
  };
  jalan(lama, baru, ""); return out.slice(0, 500);
}
