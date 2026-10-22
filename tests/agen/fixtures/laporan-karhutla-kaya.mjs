/* Snapshot karhutla yang TERISI penuh (udara, OMC, kondisi, peralatan, hambatan, luar prioritas, tiga hari, satelit), dibangun dengan agregasi yang sama dengan Worker
   (public/laporan_karhutla_spek.js). Dipakai tests/agen/laporan-karhutla-deck.test.mjs untuk membuktikan slide dan teks WA yang berisi tidak melenceng dari snapshot. */
import * as S from "../../../public/laporan_karhutla_spek.js";

const tot = (fs, fs_padam, target_ha, padam_ha) => ({fs, fs_padam, target_ha, padam_ha});
const HARI = ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"];
const baris = (kode, tgl, n, tgt, pdm) => Array.from({length: n}, (_, i) => ({kab: "Kab " + (i + 1), kawasan: kode === "62" && i % 2 ? "TNTP" : null, target_ha: tgt / n, padam_darat_ha: pdm / n, padam_udara_ha: 0, status: i < n / 2 ? "padam" : "menyala"}));
function provInput(kode, d) {
  const o = {total: tot(d.fs, d.padam_fs, d.target, d.padam), hotspot: {total: d.hs}, personel: {total: d.pers, unsur: d.unsur || {}, shift: d.shift || null, keterangan: d.ket || null}, peralatan: d.alat || [], kondisi: d.kondisi || [],
    hambatan: d.hamb || {pilihan: [], teks: null}, upaya: d.upaya || {pilihan: [], teks: null}, darurat: d.darurat || null};
  if (d.blok) o.blok = d.blok; if (d.kum) o.kumulatif_ha = d.kum; return o;
}
const HARI_INI = {
  "61": {fs: 6, padam_fs: 5, target: 16.79, padam: 14.6, hs: 14, pers: 14458, kum: {ha: 1200, keterangan: "luasan kumulatif musim"}, alat: [{kategori: "pompa", stok: 91, tambahan: 0}, {kategori: "selang_1_5", stok: 297, tambahan: 10}, {kategori: "apd_set", stok: 32, tambahan: 0, catatan: "600 sepatu boot"}],
    kondisi: [{kab: "Ketapang", ispu: "sangat_tidak_sehat", jarak_pandang_m: 100, sekolah: "daring", penerbangan: "terganggu", ispa: 200, hujan: "ringan"}, {kab: "Singkawang", ispu: "tidak_sehat", jarak_pandang_m: 7000, sekolah: "normal", penerbangan: "normal", hujan: "sedang"}],
    hamb: {pilihan: ["air_jauh", "asap_tebal"], teks: null}, upaya: {pilihan: ["pemadaman_darat", "omc"], teks: null}, darurat: {jenis: "siaga_darurat", tmt: "2026-09-01", sd: "2026-11-30"}},
  "62": {fs: 98, padam_fs: 38, target: 431.66, padam: 110.31, hs: 2083, pers: 16387, shift: "2 shift + standby", ket: "Termasuk 2 shift dan standby", unsur: {tni: 13396, bpbd: 11231}, blok: [{kawasan: "Di luar TNTP", ...tot(46, 33, 74.77, 58.31)}, {kawasan: "TNTP", ...tot(52, 5, 356.89, 52)}],
    alat: [{kategori: "pompa", stok: 75, tambahan: 0}, {kategori: "drone_termal", stok: 21, tambahan: 0}, {kategori: "genset", stok: 21, tambahan: 0}],
    kondisi: [{kab: "Palangka Raya", ispu: "berbahaya", jarak_pandang_m: 400, sekolah: "daring", penerbangan: "ditutup", hujan: "tidak"}, {kab: "Kapuas", ispu: "berbahaya", jarak_pandang_m: 500, sekolah: "daring", hujan: "ringan"}],
    hamb: {pilihan: ["akses_sulit_rawa", "asap_tebal"], teks: "api di bawah permukaan gambut"}, upaya: {pilihan: ["pembasahan_gambut"], teks: "drone termal"}, darurat: {jenis: "tanggap_darurat", tmt: "2026-09-20", sd: "2026-10-29"}},
  "63": {fs: 32, padam_fs: 28, target: 61.14, padam: 57.42, hs: 896, pers: 7927, kondisi: [{kab: "Banjarmasin", ispu: "sangat_tidak_sehat", jarak_pandang_m: 2000, sekolah: "normal", penerbangan: "normal"}], hamb: {pilihan: ["air_tidak_cukup"], teks: null}, upaya: {pilihan: ["sekat_kanal"], teks: null}},
  "14": {fs: 0, padam_fs: 0, target: 0, padam: 0, hs: 4, pers: 14837},
  "15": {fs: 29, padam_fs: 18, target: 98.5, padam: 28.5, hs: 77, pers: 5984, hamb: {pilihan: ["alat_terbatas"], teks: null}, upaya: {pilihan: ["patroli_terpadu"], teks: null}},
  "16": {fs: 96, padam_fs: 84, target: 375.25, padam: 291.25, hs: 1055, pers: 12285, darurat: {jenis: "siaga_darurat", tmt: "2026-09-10", sd: "2026-11-30"}},
};
const KEMARIN = {"61": [11.92, 0.19, 450], "62": [452.49, 389.39, 4213], "63": [58.45, 7.5, 1013], "14": [3, 1, 1], "15": [96.5, 64.5, 341], "16": [401.67, 108.5, 545]};
const LUSA = {"61": [11.09, 0.89, 836], "62": [497.09, 401.16, 7950], "63": [30.64, 3, 711], "14": [4.5, 2.5, 0], "15": [99, 69, 43], "16": [355.92, 94.25, 1392]};
const UDARA = {armada: [{prov: "62", pemilik: "BNPB", jenis: "heli", registrasi: "PK-SNK", status: "operasi"}, {prov: "62", pemilik: "BNPB", jenis: "pesawat", registrasi: "PK-FPU", status: "tidak_terbang", alasan: "visibilitas"}, {prov: "62", pemilik: "TNI", jenis: "heli", registrasi: "HA-5231", status: "siap"},
  {prov: "61", pemilik: "BNPB", jenis: "heli", registrasi: "VN-8424", status: "operasi"}, {prov: "61", pemilik: "BNPB", jenis: "pesawat", registrasi: "PK-ALE", status: "operasi"}, {prov: "63", pemilik: "KLHK", jenis: "pesawat", registrasi: "PK-SNL", status: "operasi"}, {prov: "16", pemilik: "Swasta", jenis: "heli", registrasi: "N274TH", status: "operasi"}],
  sortie: [{jenis: "wb", registrasi: "VN-8424", jam_mulai: "08:00", provs: ["61"], bom: 33, liter: 132000, padam_ha: 2.5, lokasi: "Sungai Segak, Landak"}, {jenis: "wb", registrasi: "PK-SNK", jam_mulai: "09:10", provs: ["62", "63"], lintas: true, bom: 6, liter: 24000, padam_ha: 1.5},
    {jenis: "patroli", registrasi: "PK-ALE", jam_mulai: "07:30", provs: ["61"], durasi_menit: 200, temuan_fs: 0, lokasi: "selatan Ketapang"}]};
const OMC = {sortie: [{registrasi: "PK-SCH", jam_mulai: "09:00", bahan: "nacl", kg: 1000, sasaran: ["Ketapang", "Kayong Utara"], provs: ["61"], ketinggian_ft: 10000}, {registrasi: "PK-SNL", jam_mulai: "10:00", bahan: "dry_ice", kg: 800, sasaran: ["Palangka Raya"], provs: ["62"]},
  {registrasi: "PK-SNL", jam_mulai: "13:00", bahan: "dry_ice", kg: 500, sasaran: ["Kapuas"], provs: ["62"]}],
  hasil: [{sasaran: "Ketapang", hujan: "ya", curah_mm: 12}, {sasaran: "Palangka Raya", hujan: "ya", pm25_sebelum: 1907, pm25_sesudah: 1200, jarak_pandang_sebelum_m: 700, jarak_pandang_sesudah_m: 7000}, {sasaran: "Kapuas", hujan: "tidak"}]};
const KOORD = {kejadian: [{prov: "Jawa Tengah", kab: "Karanganyar", jenis: "karhutla", luas_ha: 230}, {prov: "Maluku Utara", kab: "Provinsi", luas_ha: 179.13}, {prov: "Kalimantan Timur", kab: "IKN", luas_ha: 97.77, keterangan: "sebagian padam"}, {prov: "Sulawesi Tengah", kab: "Parigi Moutong"}]};
const SAT = {hari: HARI, prov: Object.fromEntries(["61", "62", "63", "14", "15", "16"].map((k, i) => [k, {titik: HARI.map((_, j) => 50 + ((i + 3) * (j + 7) * 37) % 900), luas: HARI.map((_, j) => 100 + ((i + 2) * (j + 5) * 91) % 2000), kompleks: 100 * (i + 1), luas_kompleks: 5000 * (i + 2)}])),
  luas_banding: {prov: Object.fromEntries(["61", "62", "63", "14", "15", "16"].map((k, i) => [k, {perkiraan: Object.fromEntries([2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y, j) => [y, 10000 * (i + 1) * ((j * 7) % 5 + 1)])), sipongi: {2018: 5000, 2019: 9000, 2020: 2000, 2021: 1000, 2022: 800, 2023: 7000, 2024: 3000, 2025: 2500, 2026: 4000}}]))}};

function snapshotHari(tanggal, input, {sebelumnya = [], pengecualian = [], satelit = SAT, ralat = 0} = {}) {
  const kiriman = {};
  for (const [k, d] of Object.entries(input)) kiriman["prov:" + k] = {isi: S.normalisasiProvinsi(provInput(k, d), {kode: k, tanggal_laporan: tanggal}).isi, data_terakhir: null};
  kiriman.udara = {isi: S.normalisasiUdara(UDARA, {tanggal_laporan: tanggal}).isi, data_terakhir: null};
  kiriman.omc = {isi: S.normalisasiOmc(OMC, {tanggal_laporan: tanggal}).isi, data_terakhir: null};
  kiriman.koordalops = {isi: S.normalisasiKoordalops(KOORD, {tanggal_laporan: tanggal}).isi, data_terakhir: null};
  for (const p of pengecualian) kiriman[p.sumber] = {...kiriman[p.sumber], data_terakhir: p.data_terakhir};
  return S.agregasi({tanggal_laporan: tanggal, prioritas: S.PRIORITAS_BAWAAN, pengecualian, kiriman, sebelumnya, satelit, ralat, dikunci_oleh: "admin", dikunci_pada: 1792000000000, alasan: ralat ? "koreksi angka uji" : null});
}
const hariLalu = (peta, s) => Object.fromEntries(Object.entries(peta).map(([k, [tgt, blm, hs]]) => { const d = HARI_INI[k]; return [k, {...d, target: tgt, padam: +(tgt - blm).toFixed(2), hs, fs: d.fs, padam_fs: d.padam_fs}]; }));
export function snapshotKaya(opsi = {}) {
  const s19 = snapshotHari("2026-10-19", hariLalu(LUSA), {satelit: null}), s20 = snapshotHari("2026-10-20", hariLalu(KEMARIN), {sebelumnya: [s19], satelit: null});
  return snapshotHari("2026-10-21", HARI_INI, {sebelumnya: [s19, s20], ...opsi});
}
