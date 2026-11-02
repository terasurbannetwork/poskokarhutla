/* Isian logbook (ALUR A6, ALGORITMA §7): pilihan, pemotong teks, validasi, bentuk badan POST. Murni; server tetap memvalidasi penuh.
   KUNCI pilihan (kegiatan, kendala, kebutuhan, enum dan rentang kondisi) hanya dari GET /api/petugas/konst lewat argumen `konst`; berkas ini hanya
   menyimpan LABEL dan ikon. Kunci di luar konst tidak ditampilkan dan tidak dikirim; kunci baru dari server tampil dengan label dari kuncinya. */

export const LABEL_KEGIATAN = [
  {k: "patroli", label: "Patroli", ikon: "pin"}, {k: "pemadaman", label: "Pemadaman", ikon: "api"}, {k: "pendinginan", label: "Pendinginan", ikon: "air"},
  {k: "pemantauan", label: "Pemantauan", ikon: "mata"}, {k: "evakuasi", label: "Evakuasi", ikon: "orang"}, {k: "logistik", label: "Logistik", ikon: "kotak"},
  {k: "koordinasi", label: "Koordinasi", ikon: "bicara"}, {k: "lainnya", label: "Lainnya", ikon: "tambah"},
];
export const LABEL_KENDALA = [
  {k: "akses_sulit", label: "Akses sulit", ikon: "jalan"}, {k: "air_jauh", label: "Air jauh", ikon: "air"}, {k: "cuaca", label: "Cuaca", ikon: "awan"},
  {k: "alat_rusak", label: "Alat rusak", ikon: "alat"}, {k: "komunikasi", label: "Sinyal buruk", ikon: "sinyal"}, {k: "keamanan", label: "Keamanan", ikon: "tanda"},
  {k: "lainnya", label: "Lainnya", ikon: "tambah"},
];
export const LABEL_KEBUTUHAN = [
  {k: "bbm", label: "BBM", ikon: "api"}, {k: "selang_pompa", label: "Selang dan pompa", ikon: "alat"}, {k: "makanan_air", label: "Makanan dan air minum", ikon: "air"},
  {k: "personel", label: "Tambahan personel", ikon: "orang"}, {k: "kesehatan", label: "Kesehatan", ikon: "tanda"}, {k: "transport", label: "Transportasi", ikon: "jalan"},
  {k: "lainnya", label: "Lainnya", ikon: "tambah"},
];

/* daftar kunci dari konst + tabel label -> [{k, label, ikon}] berurutan seperti konst; kunci bukan teks dibuang */
export function pilihan(kunci, tabel) {
  return (Array.isArray(kunci) ? kunci : []).filter(k => typeof k === "string" && k).map(k => tabel.find(x => x.k === k) ?? {k, label: k.replace(/_/g, " ").replace(/^./, c => c.toUpperCase()), ikon: "tambah"});
}
export const KEGIATAN = konst => pilihan(konst?.kegiatan, LABEL_KEGIATAN);
export const KENDALA = konst => pilihan(konst?.kendala, LABEL_KENDALA);
export const KEBUTUHAN = konst => pilihan(konst?.kebutuhan, LABEL_KEBUTUHAN);

/* kolom kondisi per bencana tugas (LABEL dan kolom mana milik bencana mana). jenis: pilih (opsi dari konst.kondisi.enum), angka (rentang dari konst.kondisi.angka) */
const AKSES = [{k: "mobil", label: "Mobil", ikon: "jalan"}, {k: "motor", label: "Motor", ikon: "jalan"}, {k: "jalan_kaki", label: "Jalan kaki", ikon: "orang"}, {k: "perahu", label: "Perahu", ikon: "air"}];
export const LABEL_KONDISI = {
  karhutla: [
    {k: "kondisi_api", label: "Kondisi api", jenis: "pilih", wajib: true, opsi: [{k: "menyala", label: "Menyala", ikon: "api"}, {k: "bara", label: "Bara", ikon: "bara"}, {k: "padam", label: "Padam", ikon: "centang"}, {k: "bukan_api", label: "Bukan api", ikon: "silang"}]},
    {k: "tebal_gambut_cm", label: "Tebal gambut (cm)", jenis: "angka", min: 0, maks: 1500},
    {k: "jarak_air_m", label: "Jarak ke air (m)", jenis: "angka", min: 0, maks: 10000},
    {k: "akses", label: "Akses ke lokasi", jenis: "pilih", opsi: AKSES},
  ],
  banjir: [
    {k: "tinggi_genangan_cm", label: "Tinggi genangan (cm)", jenis: "angka", min: 0, maks: 500, wajib: true},
    {k: "hujan_lokal", label: "Hujan di lokasi", jenis: "pilih", opsi: [{k: "tidak", label: "Tidak hujan", ikon: "matahari"}, {k: "ringan", label: "Ringan", ikon: "awan"}, {k: "lebat", label: "Lebat", ikon: "hujan"}]},
  ],
};
/* kolom kondisi bencana itu, hanya yang dikenal konst: opsi pilih = enum konst (urutan konst), angka memakai min/maks konst. Kolom tanpa data konst dibuang. */
export function kondisiUntuk(bencana, konst) {
  const kol = Object.hasOwn(LABEL_KONDISI, bencana) ? LABEL_KONDISI[bencana] : [], k = konst?.kondisi || {}, hasil = [];
  for (const f of kol) {
    if (f.jenis === "pilih") { if (Object.hasOwn(k.enum || {}, f.k)) hasil.push({...f, opsi: pilihan(k.enum[f.k], f.opsi)}); }
    else if (Object.hasOwn(k.angka || {}, f.k) && Array.isArray(k.angka[f.k])) hasil.push({...f, min: k.angka[f.k][0], maks: k.angka[f.k][1]});
  }
  return hasil;
}

export const BATAS = {uraianMin: 10, uraianMaks: 2000, hasilMaks: 1000, fotoMin: 1, fotoMaks: 6};

/* pemotong: rapikan spasi di ujung dan potong ke `maks` karakter (tanpa memutus pasangan surrogate) */
export function potongTeks(s, maks) {
  const t = String(s ?? "").replace(/\r\n/g, "\n").trim();
  if (t.length <= maks) return t;
  const p = t.slice(0, maks);
  return /[\uD800-\uDBFF]$/.test(p) ? p.slice(0, -1) : p;
}

const kunciSah = (daftar) => new Set(daftar.map(x => x.k));
function pilihanBanyak(nilai, daftar, nama, galat) {
  const sah = kunciSah(daftar), arr = Array.isArray(nilai) ? nilai : [];
  const unik = [...new Set(arr)];
  if (unik.some(x => typeof x !== "string" || !sah.has(x))) galat[nama] = "Ada pilihan yang tidak dikenal";
  return unik.filter(x => typeof x === "string" && sah.has(x));
}

/* isian mentah dari formulir -> {ok, galat: {kolom: pesan}, data}. data = badan POST tanpa foto_meta (diisi layar dari GPS tiap foto).
   isian = {kegiatan, uraian, hasil, kendala[], kebutuhan[], kondisi{}, nFoto, tugas_id, tanggal} */
export function rapikanLogbook(isian, bencana, konst) {
  const galat = {}, i = isian || {};
  if (!i.tugas_id) galat.tugas_id = "Pilih tugasnya dulu";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(i.tanggal ?? ""))) galat.tanggal = "Tanggal tidak sah";
  if (typeof i.kegiatan !== "string" || !kunciSah(KEGIATAN(konst)).has(i.kegiatan)) galat.kegiatan = "Pilih jenis kegiatan";
  const uraian = potongTeks(i.uraian, BATAS.uraianMaks);
  if (uraian.length < BATAS.uraianMin) galat.uraian = `Uraian minimal ${BATAS.uraianMin} huruf`;
  const hasil = potongTeks(i.hasil, BATAS.hasilMaks);
  const kendala = pilihanBanyak(i.kendala, KENDALA(konst), "kendala", galat), kebutuhan = pilihanBanyak(i.kebutuhan, KEBUTUHAN(konst), "kebutuhan", galat);
  const kondisi = {}, mentah = i.kondisi || {};
  for (const f of kondisiUntuk(bencana, konst)) {
    const v = mentah[f.k];
    const kosong = v === undefined || v === null || v === "";
    if (kosong) { if (f.wajib) galat[f.k] = `${f.label} wajib diisi`; continue; }
    if (f.jenis === "pilih") { if (typeof v !== "string" || !kunciSah(f.opsi).has(v)) galat[f.k] = `${f.label} tidak sah`; else kondisi[f.k] = v; }
    else {
      const n = typeof v === "number" ? v : /^\d+$/.test(String(v).trim()) ? Number(String(v).trim()) : NaN;
      if (!Number.isInteger(n) || n < f.min || n > f.maks) galat[f.k] = `${f.label}: isi bilangan bulat ${f.min} sampai ${f.maks}`; else kondisi[f.k] = n;
    }
  }
  const nFoto = Number(i.nFoto) || 0;
  if (nFoto < BATAS.fotoMin) galat.foto = "Ambil minimal satu foto";
  if (nFoto > BATAS.fotoMaks) galat.foto = `Paling banyak ${BATAS.fotoMaks} foto`;
  if (Object.keys(galat).length) return {ok: false, galat, data: null};
  return {ok: true, galat: {}, data: {tugas_id: i.tugas_id, tanggal: i.tanggal, kegiatan: i.kegiatan, uraian, hasil, kendala, kebutuhan, kondisi}};
}

/* logbook terkunci setelah 23.59 hari tanggalnya (waktu perangkat yang sudah dikoreksi selisih server, offset menit) */
export const sudahTerkunci = (tanggal, kiniMs, offsetMenit) => new Date(kiniMs + offsetMenit * 60e3).toISOString().slice(0, 10) > tanggal;

/* satu foto: GPS satu titik + waktu server -> metadata. gps null = foto tanpa lokasi (server menandai) */
export const metaFoto = (gps, waktuMs) => ({lat: gps ? gps.lat : null, lon: gps ? gps.lon : null, akurasi: gps && Number.isFinite(gps.akurasi) ? Math.round(gps.akurasi) : null, waktu: Math.round(waktuMs)});
