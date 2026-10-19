/* Meja Kerja: spesifikasi lima meja (kolom, status, transisi, tanda bahaya) + validasi + status turunan. Semua meja lewat SATU mesin di src/meja.js.
   Daftar meja, status per meja, dan transisi HARUS sama dengan CHECK/trigger migrations/0026_meja.sql (dijaga tests/warga/meja.test.mjs).
   Impor lewat worker.js dulu bila dipakai sendirian (posko.js dan worker.js saling impor). */
import {tx, num, tglSah, wib} from "./posko.js";

const HARI = 864e5, JAM = 36e5;
export const BENCANA = ["banjir", "longsor", "karhutla", "gempa", "tsunami", "gunungapi", "kekeringan", "cuaca_ekstrem", "rob", "lainnya"];
export const BARANG = ["beras", "air_mineral", "makanan_siap_saji", "selimut", "tenda", "terpal", "family_kit", "hygiene_kit", "obat", "popok_bayi", "susu_bayi", "pembalut", "masker", "genset", "lainnya"];
export const INDIKATOR_DESTANA = ["tim_siaga", "peta_risiko", "jalur_evakuasi", "rencana_kontinjensi_desa", "sistem_peringatan", "latihan_rutin"];
/* ambang tanda bahaya dan status turunan (jam / hari / bulan) */
export const AMBANG = {kaji_verifikasi_jam: 72, logistik_setuju_jam: 24, dsp_spj_hari: 30, renkon_segera_hari: 90, renkon_uji_hari: 365, destana_pasif_bulan: 12};
/* Rapor kinerja BPBD: indeks komposit, BOBOT SEMENTARA (belum diuji balik). Komponen tanpa data dilewati dan bobot sisanya dinormalkan ulang. */
export const RAPOR = {bobot: {respons: 35, keaktifan: 25, kelengkapan: 40}, respons_terbaik_menit: 15, respons_terburuk_menit: 120, jendela_panggilan_hari: 30, jendela_regu_hari: 7};

const k = (nama, label, tipe, o = {}) => ({nama, label, tipe, ...o});
const angka = (nama, label, o = {}) => k(nama, label, "angka", {min: 0, maks: 1e6, wajib: true, ...o});
const tgl = (nama, label, o = {}) => k(nama, label, "tanggal", o);
const rupiah = (nama, label, o = {}) => angka(nama, label, {maks: 1e13, rupiah: true, ...o});

export const MEJA = {
  kaji_cepat: {
    id: "kaji_cepat", nama: "Kaji cepat", ikon: '<path d="M9 4h6v3H9z"/><path d="M7 5H5v16h14V5h-2"/><path d="m9 14 2 2 4-4"/>',
    wilayah: {kec: false, desa: true},
    kolom: [
      k("kejadian", "Bencana", "pilih", {nilai: BENCANA, wajib: true}), tgl("tanggal", "Tanggal kejadian", {wajib: true, maks: "hariini"}),
      angka("rumah_rb", "Rumah rusak berat"), angka("rumah_rs", "Rumah rusak sedang"), angka("rumah_rr", "Rumah rusak ringan"),
      angka("sekolah", "Sekolah rusak", {maks: 1e4}), angka("faskes", "Faskes rusak", {maks: 1e4}), angka("ibadah", "Tempat ibadah rusak", {maks: 1e4}),
      angka("jalan_km", "Jalan rusak (km)", {maks: 1e4, desimal: true}), angka("jembatan", "Jembatan rusak", {maks: 1e4}),
      angka("meninggal", "Meninggal (jiwa)"), angka("hilang", "Hilang (jiwa)"), angka("luka", "Luka (jiwa)"), angka("mengungsi", "Mengungsi (jiwa)"),
      k("foto", "Tautan foto (opsional)", "tautan"),
    ],
    awal: "dilaporkan", status: ["dilaporkan", "diverifikasi", "masuk_jitupasna"],
    transisi: {dilaporkan: {diverifikasi: "petugas"}, diverifikasi: {masuk_jitupasna: "admin"}},
    rekap: ["rumah_rb", "rumah_rs", "rumah_rr", "meninggal", "hilang", "luka", "mengungsi"],
    bahaya: {belum_diverifikasi: `dilaporkan lebih dari ${AMBANG.kaji_verifikasi_jam} jam belum diverifikasi`},
  },
  logistik: {
    id: "logistik", nama: "Logistik", ikon: '<path d="m3 7 9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    wilayah: {kec: false, desa: false},
    kolom: [
      k("barang", "Barang", "pilih", {nilai: BARANG, wajib: true}), angka("jumlah_diminta", "Jumlah diminta", {min: 1, maks: 1e7}),
      k("satuan", "Satuan", "teks", {wajib: true, maks: 20}), k("posko", "Posko / lokasi", "teks", {wajib: true, maks: 80}),
      angka("kebutuhan_untuk", "Kebutuhan untuk (jiwa)"),
      angka("jumlah_kirim", "Jumlah dikirim", {maks: 1e7, tahap: "dikirim"}), tgl("tgl_kirim", "Tanggal kirim", {wajib: true, tahap: "dikirim"}),
      k("armada", "Armada", "teks", {maks: 60, tahap: "dikirim"}),
      angka("jumlah_terima", "Jumlah diterima", {maks: 1e7, tahap: "diterima"}), k("penerima", "Penerima", "teks", {wajib: true, maks: 80, tahap: "diterima"}),
    ],
    awal: "diminta", status: ["diminta", "disetujui", "dikirim", "diterima"],
    transisi: {diminta: {disetujui: "admin"}, disetujui: {dikirim: "admin"}, dikirim: {diterima: "petugas"}},
    rekap: ["kebutuhan_untuk"],
    bahaya: {belum_disetujui: `diminta lebih dari ${AMBANG.logistik_setuju_jam} jam belum disetujui`, selisih_terima: "jumlah diterima tidak sama dengan jumlah dikirim"},
  },
  dsp: {
    id: "dsp", nama: "Dana Siap Pakai", ikon: '<circle cx="12" cy="12" r="9"/><path d="M9 9.5c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 1.8-3 2-3 .8-3 2 1.3 2 3 2 3-.8 3-2"/><path d="M12 6v1.5M12 16.5V18"/>',
    wilayah: {kec: false, desa: false},
    kolom: [
      k("kejadian", "Kejadian", "teks", {wajib: true, maks: 100}), k("nomor_permohonan", "Nomor permohonan", "teks", {wajib: true, maks: 60}),
      rupiah("nilai_diajukan", "Nilai diajukan"), tgl("tgl_ajuan", "Tanggal pengajuan", {wajib: true}),
      rupiah("nilai_disetujui", "Nilai disetujui", {tahap: "disetujui"}), tgl("tgl_setuju", "Tanggal disetujui", {wajib: true, tahap: "disetujui"}),
      rupiah("nilai_cair", "Nilai cair", {tahap: "cair"}), tgl("tgl_cair", "Tanggal cair", {wajib: true, tahap: "cair"}),
      rupiah("realisasi", "Realisasi", {tahap: "spj"}), tgl("tgl_spj", "Tanggal SPJ", {wajib: true, tahap: "spj"}),
      tgl("tgl_selesai", "Tanggal selesai", {wajib: true, tahap: "selesai"}),
      k("alasan", "Alasan ditolak", "teks", {wajib: true, maks: 200, tahap: "ditolak"}),
    ],
    awal: "diajukan", status: ["diajukan", "disetujui", "cair", "spj", "selesai", "ditolak"],
    transisi: {diajukan: {disetujui: "admin", ditolak: "admin"}, disetujui: {cair: "admin"}, cair: {spj: "petugas"}, spj: {selesai: "admin"}},
    rekap: ["nilai_diajukan", "nilai_disetujui", "nilai_cair", "realisasi"],
    bahaya: {spj_terlambat: `cair lebih dari ${AMBANG.dsp_spj_hari} hari belum SPJ`},
    cek: d => d.nilai_disetujui > d.nilai_diajukan ? "nilai disetujui tidak boleh melebihi nilai diajukan"
      : d.nilai_cair > d.nilai_disetujui ? "nilai cair tidak boleh melebihi nilai disetujui" : d.realisasi > d.nilai_cair ? "realisasi tidak boleh melebihi nilai cair" : "",
  },
  renkon: {
    id: "renkon", nama: "Rencana kontinjensi", ikon: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    wilayah: {kec: false, desa: false},
    kolom: [
      k("bencana", "Bencana", "pilih", {nilai: BENCANA, wajib: true}), k("judul", "Judul dokumen", "teks", {wajib: true, maks: 150}),
      tgl("tgl_sah", "Tanggal disahkan", {wajib: true}), tgl("berlaku_sampai", "Berlaku sampai", {wajib: true}),
      tgl("uji_terakhir", "Uji terakhir (simulasi/geladi)", {maks: "hariini"}), k("tautan", "Tautan dokumen (http/https)", "tautan"),
    ],
    awal: "tercatat", status: ["tercatat"], transisi: {}, turunan: ["berlaku", "segera_habis", "kedaluwarsa", "belum_diuji"],
    rekap: [],
    bahaya: {kedaluwarsa: "dokumen sudah kedaluwarsa", belum_diuji: `belum diuji lebih dari ${AMBANG.renkon_uji_hari} hari`},
    cek: d => d.berlaku_sampai < d.tgl_sah ? "berlaku sampai tidak boleh sebelum tanggal disahkan" : "",
  },
  destana: {
    id: "destana", nama: "Desa tangguh (Destana)", ikon: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    wilayah: {kec: true, desa: true},
    kolom: [
      k("kelas", "Kelas", "pilih", {nilai: ["pratama", "madya", "utama"], wajib: true}), angka("tahun_dibentuk", "Tahun dibentuk", {min: 2000, maks: 2100}),
      k("indikator", "Indikator terpenuhi", "multi", {nilai: INDIKATOR_DESTANA}), tgl("kegiatan_terakhir", "Kegiatan terakhir", {maks: "hariini"}),
    ],
    awal: "tercatat", status: ["tercatat"], transisi: {}, turunan: ["aktif", "pasif"],
    rekap: [],
    bahaya: {pasif: `tidak ada kegiatan lebih dari ${AMBANG.destana_pasif_bulan} bulan`},
  },
};
export const DAFTAR_MEJA = Object.keys(MEJA);
/* pasangan 'meja:dari>ke' sah; sama dengan trigger meja_catatan_ubah */
export const PASANGAN = DAFTAR_MEJA.flatMap(m => Object.entries(MEJA[m].transisi).flatMap(([d, o]) => Object.keys(o).map(ke => `${m}:${d}>${ke}`)));
/* bentuk untuk klien: tanpa fungsi */
export const spekPublik = () => ({ambang: AMBANG, rapor: RAPOR, meja: Object.values(MEJA).map(({cek, ...m}) => m)});

/* ---------------------------------------------------------------- tanggal */
const selisihHari = (a, b) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / HARI);
const mundurBulan = (t, n) => { const d = new Date(t + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 10); };

/* ---------------------------------------------------------------- validasi */
const URL_OK = s => { try { const u = new URL(s); return (u.protocol === "http:" || u.protocol === "https:") && !u.username && !u.password && !/\s/.test(s); } catch (e) { return false; } };
function satu(c, v, kini) {
  const kosong = v == null || v === "";
  if (kosong) return c.wajib ? {galat: `${c.label} wajib diisi`} : {};
  if (c.tipe === "teks") { const s = tx(v, c.maks ?? 120); return s ? {v: s} : {galat: `${c.label}: teks 1-${c.maks ?? 120} huruf`}; }
  if (c.tipe === "angka") { const n = num(v, c.min ?? 0, c.maks ?? 1e9, !c.desimal); return Number.isNaN(n) ? {galat: `${c.label}: angka ${c.desimal ? "" : "bulat "}${c.min ?? 0} sampai ${c.maks ?? 1e9}`} : {v: c.desimal ? Math.round(n * 100) / 100 : n}; }
  if (c.tipe === "pilih") return typeof v === "string" && c.nilai.includes(v) ? {v} : {galat: `${c.label}: pilih salah satu dari ${c.nilai.join(", ")}`};
  if (c.tipe === "multi") return Array.isArray(v) && v.length <= c.nilai.length && v.every(x => typeof x === "string" && c.nilai.includes(x)) && new Set(v).size === v.length ? {v} : {galat: `${c.label}: pilihan tidak sah`};
  if (c.tipe === "ya") return typeof v === "boolean" ? {v} : {galat: `${c.label}: harus ya atau tidak`};
  if (c.tipe === "tanggal") {
    const maks = c.maks === "hariini" ? wib(kini + HARI) : c.maks ?? "2100-12-31";
    return typeof v === "string" && tglSah(v) && v >= (c.min ?? "2000-01-01") && v <= maks ? {v} : {galat: `${c.label}: tanggal YYYY-MM-DD antara ${c.min ?? "2000-01-01"} dan ${maks}`};
  }
  if (c.tipe === "tautan") return typeof v === "string" && v.length <= 300 && URL_OK(v) ? {v} : {galat: `${c.label}: tautan http/https, maksimal 300 huruf`};
  return {galat: `${c.label}: tipe tidak dikenal`};
}
/* tahap null = isian awal (kolom tanpa `tahap`); tahap 'dikirim' dst = isian saat pindah ke status itu. Kolom di luar tahap ditolak. */
export function validasi(meja, masuk, tahap, kini = Date.now(), lama = {}) {
  const M = MEJA[meja]; if (!M) return {galat: "meja tidak dikenal"};
  if (!masuk || typeof masuk !== "object" || Array.isArray(masuk)) return {galat: "data harus objek"};
  const boleh = M.kolom.filter(c => (c.tahap ?? null) === tahap), nama = new Set(boleh.map(c => c.nama));
  for (const x of Object.keys(masuk)) if (!nama.has(x)) return {galat: `kolom "${x.slice(0, 40)}" tidak dikenal untuk ${tahap ? "tahap " + tahap : "isian awal"} di meja ${M.nama}`};
  const data = {};
  for (const c of boleh) { const r = satu(c, masuk[c.nama], kini); if (r.galat) return r; if (r.v !== undefined) data[c.nama] = r.v; }
  const gabung = {...lama, ...data}, g = M.cek?.(gabung);
  return g ? {galat: g} : {data};
}

/* ---------------------------------------------------------------- status turunan & tanda bahaya */
export function statusEfektif(meja, rec, kini = Date.now()) {
  const d = rec.data, h = wib(kini);
  if (meja === "renkon") {
    const sisa = selisihHari(d.berlaku_sampai, h);
    return sisa < 0 ? "kedaluwarsa" : sisa <= AMBANG.renkon_segera_hari ? "segera_habis" : !d.uji_terakhir || selisihHari(h, d.uji_terakhir) > AMBANG.renkon_uji_hari ? "belum_diuji" : "berlaku";
  }
  if (meja === "destana") return d.kegiatan_terakhir && d.kegiatan_terakhir >= mundurBulan(h, AMBANG.destana_pasif_bulan) ? "aktif" : "pasif";
  return rec.status;
}
/* daftar kode tanda bahaya yang sedang terpicu */
export function tandaBahaya(meja, rec, kini = Date.now()) {
  const d = rec.data, out = [], h = wib(kini);
  if (meja === "kaji_cepat" && rec.status === "dilaporkan" && kini - rec.dibuat > AMBANG.kaji_verifikasi_jam * JAM) out.push("belum_diverifikasi");
  if (meja === "logistik") {
    if (rec.status === "diminta" && kini - rec.dibuat > AMBANG.logistik_setuju_jam * JAM) out.push("belum_disetujui");
    if (rec.status === "diterima" && d.jumlah_terima !== d.jumlah_kirim) out.push("selisih_terima");
  }
  if (meja === "dsp" && rec.status === "cair" && selisihHari(h, d.tgl_cair) > AMBANG.dsp_spj_hari) out.push("spj_terlambat");
  if (meja === "renkon") { const s = statusEfektif(meja, rec, kini); if (s === "kedaluwarsa" || s === "belum_diuji") out.push(s); }
  if (meja === "destana" && statusEfektif(meja, rec, kini) === "pasif") out.push("pasif");
  return out;
}
