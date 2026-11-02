/* Fungsi murni tahap C (tanpa DOM): panggilan relawan, keahlian, pelatihan di profil, kit logbook, tautan unduh CSV.
   Bentuk API: data/kajian-bnpb/lapangan/KONTRAK-TAHAP-C.md. Server tetap memvalidasi penuh; batas di sini hanya pagar masuk akal. */

/* label dan ikon keahlian; kunci di luar tabel tetap tampil dengan label dari kuncinya (kunci baru dari server tidak hilang) */
export const LABEL_KEAHLIAN = [
  {k: "drone", label: "Drone", ikon: "mata"}, {k: "pompa", label: "Pompa", ikon: "alat"}, {k: "medis", label: "Medis", ikon: "tanda"},
  {k: "evakuasi", label: "Evakuasi", ikon: "orang"}, {k: "selam", label: "Penyelam", ikon: "air"}, {k: "komunikasi", label: "Komunikasi", ikon: "sinyal"},
];
export const RE_KEAHLIAN = /^[a-z][a-z0-9_]{1,29}$/;
export const keahlianItem = k => LABEL_KEAHLIAN.find(x => x.k === k) ?? {k, label: String(k).replace(/_/g, " ").replace(/^./, c => c.toUpperCase()), ikon: "tambah"};
/* kunci unik berbentuk sah, urutan tabel dulu lalu kunci tambahan */
export function daftarKeahlian(tambahan = []) {
  const ekstra = [...new Set((Array.isArray(tambahan) ? tambahan : []).filter(k => typeof k === "string" && RE_KEAHLIAN.test(k)))].filter(k => !LABEL_KEAHLIAN.some(x => x.k === k));
  return [...LABEL_KEAHLIAN, ...ekstra.map(keahlianItem)];
}
export const BATAS_PANGGIL = {kuotaMaks: 500, jamMaks: 168, pesanMin: 3, pesanMaks: 300};

/* formulir panggilan -> {ok, galat{kolom}, badan}. Badan persis kontrak: {tugas_id, keahlian[], prov, kab?, kuota, batas_jam, pesan} */
export function rapikanPanggil(f) {
  const galat = {}, i = f || {}, bil = s => /^\d+$/.test(String(s ?? "").trim()) ? Number(String(s).trim()) : NaN;
  const rapi = (s, maks) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, maks);
  if (!i.tugas_id) galat.tugas_id = "Pilih tugasnya dulu";
  const keahlian = [...new Set(Array.isArray(i.keahlian) ? i.keahlian : [])];
  if (!keahlian.length) galat.keahlian = "Pilih minimal satu keahlian";
  else if (keahlian.some(k => typeof k !== "string" || !RE_KEAHLIAN.test(k))) galat.keahlian = "Ada keahlian yang tidak dikenal";
  const prov = rapi(i.prov, 80), kab = rapi(i.kab, 80);
  if (prov.length < 2) galat.prov = "Isi provinsi";
  const kuota = bil(i.kuota), jam = bil(i.batas_jam);
  if (!(kuota >= 1 && kuota <= BATAS_PANGGIL.kuotaMaks)) galat.kuota = `Kuota 1 sampai ${BATAS_PANGGIL.kuotaMaks} orang`;
  if (!(jam >= 1 && jam <= BATAS_PANGGIL.jamMaks)) galat.batas_jam = `Batas 1 sampai ${BATAS_PANGGIL.jamMaks} jam`;
  const pesan = String(i.pesan ?? "").replace(/\r\n/g, "\n").trim().slice(0, BATAS_PANGGIL.pesanMaks);
  if (pesan.length < BATAS_PANGGIL.pesanMin) galat.pesan = "Tulis pesan untuk relawan";
  if (Object.keys(galat).length) return {ok: false, galat, badan: null};
  return {ok: true, galat: {}, badan: {tugas_id: i.tugas_id, keahlian, prov, ...(kab ? {kab} : {}), kuota, batas_jam: jam, pesan}};
}

const STATUS_PANGGIL = {buka: ["Buka", "hijau"], penuh: ["Penuh", "kuning"], tutup: ["Tutup", "abu"]};
const bulat = n => Math.max(0, Math.trunc(Number(n)) || 0);
/* satu baris panggilan dari server -> angka aman + label status + sisa jam sampai batas (null bila batas lewat/kosong) */
export function ringkasPanggil(p, kini = Date.now()) {
  const st = Object.hasOwn(STATUS_PANGGIL, p?.status) ? STATUS_PANGGIL[p.status] : ["Belum jelas", "abu"];
  const batas = Number(p?.batas), kuota = bulat(p?.kuota), siap = bulat(p?.siap);
  return {id: p?.id ?? "", kuota, siap, tidak: bulat(p?.tidak), antre: bulat(p?.antre), label: st[0], kelas: st[1],
    sisaJam: Number.isFinite(batas) && batas > kini ? Math.ceil((batas - kini) / 3600e3) : null, batas: Number.isFinite(batas) ? batas : null,
    kurang: Math.max(0, kuota - siap)};
}

/* unduhan rekap CSV per tugas; id dikodekan. Kosong -> null */
export const urlEkspor = tugasId => tugasId ? `/api/petugas/panel/ekspor.csv?tugas_id=${encodeURIComponent(tugasId)}` : null;
export const urlDaftarPanggil = tugasId => `/api/petugas/panel/panggil?tugas_id=${encodeURIComponent(tugasId ?? "")}`;
/* daftar orang: cari/jenis/halaman seperti biasa, keahlian bila dipilih */
export function queryOrang({cari = "", jenis = "", halaman = 1, keahlian = ""} = {}) {
  const p = new URLSearchParams({cari, jenis, halaman: String(halaman)});
  if (keahlian && RE_KEAHLIAN.test(keahlian)) p.set("keahlian", keahlian);
  return p.toString();
}
/* panel/orang lama memberi {baris, total}, varian keahlian memberi {orang}; keduanya terbaca */
export const barisOrang = d => Array.isArray(d?.baris) ? d.baris : Array.isArray(d?.orang) ? d.orang : [];
export const keahlianOrang = o => (Array.isArray(o?.keahlian) ? o.keahlian : []).filter(k => typeof k === "string" && RE_KEAHLIAN.test(k));

/* kelola keahlian (Super Admin): POST/DELETE {orang_id, keahlian, bukti?} */
export function badanKeahlian(orangId, keahlian, bukti = "") {
  if (!orangId || typeof keahlian !== "string" || !RE_KEAHLIAN.test(keahlian)) return null;
  const b = String(bukti ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  return {orang_id: orangId, keahlian, ...(b ? {bukti: b} : {})};
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
/* "2026-05-03" atau ms epoch -> "3 Mei 2026"; selain itu teks apa adanya (dipotong), kosong -> "" */
export function teksTanggalPelatihan(t) {
  const s = String(t ?? "").trim(), m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}`;
  if (/^\d{10,}$/.test(s)) { const d = new Date(Number(s)); return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
  return s.slice(0, 40);
}
/* saya -> bagian profil. Pelatihan terbaru dulu (urut tanggal teks menurun), tanpa nama kosong. */
export function ringkasProfil(saya) {
  const pelatihan = (Array.isArray(saya?.pelatihan) ? saya.pelatihan : []).filter(p => p && typeof p.nama === "string" && p.nama.trim())
    .map(p => ({nama: p.nama.trim(), tanggal: teksTanggalPelatihan(p.tanggal), urut: String(p.tanggal ?? "")})).sort((a, b) => b.urut.localeCompare(a.urut)).map(({nama, tanggal}) => ({nama, tanggal}));
  const keahlian = [...new Set((Array.isArray(saya?.keahlian) ? saya.keahlian : []).filter(k => typeof k === "string" && RE_KEAHLIAN.test(k)))].map(keahlianItem);
  return {pelatihan, keahlian, ada: pelatihan.length > 0 || keahlian.length > 0};
}

/* kit logbook: kit_tugas dari /saya = [{id, nama}]; isian = {<id>: "jumlah"} untuk kit yang dicentang. -> {ok, galat, kit:[{kit_id, jumlah}]} */
export const kitTugas = saya => (Array.isArray(saya?.kit_tugas) ? saya.kit_tugas : []).filter(k => k && k.id != null && k.id !== "" && typeof k.nama === "string" && k.nama.trim());
export const BATAS_KIT = {jumlahMaks: 999};
export function rapikanKit(isian, saya) {
  const sah = kitTugas(saya), kit = [], galat = {}, i = isian && typeof isian === "object" ? isian : {};
  for (const k of sah) {
    if (!Object.hasOwn(i, String(k.id))) continue;
    const v = String(i[String(k.id)] ?? "").trim() || "1", n = /^\d+$/.test(v) ? Number(v) : NaN;
    if (!(n >= 1 && n <= BATAS_KIT.jumlahMaks)) galat.kit = `Jumlah ${k.nama}: isi bilangan 1 sampai ${BATAS_KIT.jumlahMaks}`;
    else kit.push({kit_id: k.id, jumlah: n});
  }
  return Object.keys(galat).length ? {ok: false, galat, kit: []} : {ok: true, galat: {}, kit};
}
