/* Terima meja "Data kejadian dan dampak" ke Logbook Pusdalops: fungsi murni (tanpa D1, tanpa Response) yang menyusun muatan Logbook dari satu catatan dampak.
   Muatan lewat validasi Logbook yang sama (periksaEntri/periksaJuklak di src/logbook.js); berkas ini hanya memetakan nama. Aturan: data/kajian-bnpb/juklak/DATA-DAMPAK.md. */

const HARI = 864e5, WIB = 7 * 36e5;
export const JENDELA_MULAI_HARI = 400;   // sama dengan batas `mulai` di buatKejadian (src/logbook.js)
const UMUR = {anak: "0-17", dewasa: "18-59", lansia: "60+"}, JK = {l: "L", p: "P"};
const KORBAN = {md: "meninggal", hilang: "hilang", luka: "luka", mengungsi: "mengungsi", terdampak: "terdampak"};   // kunci korban Logbook -> kolom dampak
const HA = ["sawah", "lahan", "kebun", "hutan", "kolam"], TINGKAT = ["rb", "rs", "rr", "terendam"];
/* [kode prasarana Logbook, tingkat, kolom jumlah, kolom taksiran]; satuan ditetapkan Logbook dari kode */
const PRASARANA = [
  ...HA.map(n => [n, null, n + "_ha", "rugi_" + n]),
  ...TINGKAT.map(t => ["kios_toko", t, "kios_" + t, "rugi_kios"]), ...TINGKAT.map(t => ["pabrik", t, "pabrik_" + t, "rugi_pabrik"]),
  ["jaringan_air", null, "air_unit", "rugi_air"], ["jaringan_listrik", null, "listrik_unit", "rugi_listrik"], ["jaringan_telekomunikasi", null, "telekom_unit", "rugi_telekom"],
  ["irigasi", null, "irigasi_unit", "rugi_irigasi"], ["transportasi", null, "transportasi_unit", "rugi_transportasi"], ["spbu", null, "spbu_unit", "rugi_spbu"], ["jalan", null, "jalan_km", "rugi_jalan"],
  ...TINGKAT.slice(0, 3).map(t => ["jembatan", t, "jembatan_" + t, "rugi_jembatan"]),
  ...[["rumah_ibadat", "ibadah"], ["faskes", "faskes"], ["sekolah", "sekolah"], ["kantor", "kantor"], ["pasar", "pasar"]].flatMap(([kode, n]) => TINGKAT.map(t => [kode, t, `${n}_${t}`, "rugi_" + n])),
];
const RUGI = [...new Set(PRASARANA.map(x => x[3])), "rugi_rumah"];
export const tutupKab = s => String(s || "").trim().replace(/^(Kab\.|Kabupaten)\s+/i, "");

/* kab dari data wilayah (public/data/bnpb/wilayah.json: {kab: [{kode, prov, nama}]}), dicocokkan pada nama: "Kab. Magelang" dan "Magelang" ke 3308, "Kota Magelang" ke 3371. Tidak ketemu: null. */
export function cariKab(daftar, prov, nama) {
  const a = String(nama || "").trim().toLowerCase(), b = tutupKab(nama).toLowerCase();
  return (daftar || []).find(k => k.prov === prov && (k.nama.toLowerCase() === a || k.nama.toLowerCase() === b)) ?? null;
}
export const mulaiMs = (d, kini) => Math.min(Date.parse(`${d.tanggal}T${d.jam || "00:00"}:00+07:00`), kini);
export const tanggalWib = ms => new Date(ms + WIB).toISOString().slice(0, 10);
/* kejadian lama yang tidak bisa dibuat baru di Logbook (jendela `mulai`): pesan siap tampil, atau "" */
export const luarJendela = (d, kini) => mulaiMs(d, kini) < kini - JENDELA_MULAI_HARI * HARI
  ? `kejadian ${d.tanggal} lebih dari ${JENDELA_MULAI_HARI} hari lalu, di luar jendela Logbook; catatan tetap berstatus diverifikasi di Meja Kerja` : "";

/* {kejadian, entri}: `kejadian` = badan buatKejadian (tanpa `entri`), `entri` = badan lanjutEntri; keduanya melewati periksaEntri yang sama */
export function bangunMuatan(d, {prov, kab, kec, desa, kini, yakin = false}) {
  const ang = k => (d[k] == null ? undefined : d[k]);
  const entri = {md: ang("meninggal"), hilang: ang("hilang"), luka: ang("luka"), mengungsi_jiwa: ang("mengungsi"),
    rumah_rb: ang("rumah_rb"), rumah_rs: ang("rumah_rs"), rumah_rr: ang("rumah_rr"), rumah_terendam: ang("rumah_terendam"), terdampak_jiwa: ang("terdampak"), yakin};
  const korban = {};
  for (const [g, n] of Object.entries(KORBAN)) for (const [u, ut] of Object.entries(UMUR)) for (const [s, st] of Object.entries(JK)) {
    const v = d[`${n}_${u}_${s}`]; if (v == null) continue;
    ((korban[g] ??= {})[ut] ??= {})[st] = v;
  }
  if (Object.keys(korban).length) entri.korban = korban;
  const pras = [], sudahRugi = new Set();
  for (const [kode, tingkat, kolJml, kolRugi] of PRASARANA) {
    const v = d[kolJml]; if (!(v > 0)) continue;
    const x = {kode, tingkat, jumlah: v};
    if (d[kolRugi] != null && !sudahRugi.has(kolRugi)) { x.kerugian_juta = d[kolRugi]; sudahRugi.add(kolRugi); }   // taksiran per butir ditempel di tingkat pertama yang berisi
    pras.push(x);
  }
  if (pras.length) entri.prasarana = pras;
  if (RUGI.some(k => d[k] != null)) entri.kerugian_juta = Math.round(RUGI.reduce((a, k) => a + (d[k] || 0), 0) * 100) / 100;
  const dok = [d.dokumentasi].filter(u => typeof u === "string" && u.startsWith("https://"));
  if (dok.length) entri.dokumentasi = dok;
  const catatan = [d.kondisi_mutakhir && `Kondisi mutakhir: ${d.kondisi_mutakhir}`, d.sumber && `Sumber: ${d.sumber}`,
    ...[["keb_dana", "Dana"], ["keb_sdm", "SDM"], ["keb_sarpras", "Sarana prasarana"], ["keb_logistik", "Logistik"], ["keb_peralatan", "Peralatan"]].map(([c, t]) => d[c] && `Kebutuhan ${t}: ${d[c]}`),
    d.aset_barang && `Aset dipakai: ${d.aset_barang}`, d.sebaran && `Sebaran dampak: ${d.sebaran}`].filter(Boolean).join("; ").slice(0, 1000);   // ponytail: kebutuhan masuk catatan bebas, bukan kebutuhan_rinci terstruktur
  if (catatan) entri.catatan = catatan;
  entri.sumber_instansi = `BPBD ${tutupKab(kab)}`.slice(0, 80);
  for (const n of ["nama_kejadian", "penyebab", "kronologis", "deskripsi", "upaya"]) if (d[n]) entri[n] = d[n];
  const kejadian = {jenis: d.jenis, kab_kode: `${prov}|${kab}`, kec: kec ?? null, desa: desa ?? null, mulai: new Date(mulaiMs(d, kini)).toISOString(),
    ...(d.bujur != null && d.lintang != null ? {lat: d.lintang, lon: d.bujur} : {})};
  return {kejadian, entri};
}
