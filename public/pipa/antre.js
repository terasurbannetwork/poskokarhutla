/* SIPPA: antrean luring form lapangan (SP-011; KP-12). Penyimpanan, kirim ulang, mundur, kedaluwarsa 14 hari ada di public/inti/antre.js (window.PbAntre);
   di sini hanya: validasi sebelum antre (cekButir/cekFase2), bentuk butir, kirim per jenis, foto dua tahap, dan pemindahan dari IndexedDB "sippa-antre".
   Antarmuka (tambah, daftar, jumlah, kirimSemua, ...) sama seperti sebelum KP-12, jadi lapangan.js nyaris tak berubah. Kode penugasan dibaca dari
   localStorage "sippa.kode" dan hanya dikirim sebagai header x-kode, tidak pernah disimpan di butir.
   Dua saluran PER TUGAS: "sippa:<tugas>" (butir; satu POST /kirim berisi larik per jenis, 200 per paket) dan "sippa-foto:<tugas>" (foto, satu per kirim).
   Per tugas karena kode x-kode milik satu tugas: butir tugas A tidak boleh berangkat dengan kode tugas B (milik() ketat). Foto TIDAK memakai opsi.media:
   server menuntut multipart (berkas, tahap, lat, lon), sedangkan media inti mengirim badan mentah; blob ikut di data butir foto (IndexedDB menyimpannya, localStorage tidak: foto ditolak bila cadangan). */
import "../inti/antre.js";   // skrip klasik; memasang globalThis.PbAntre
import {cekButir, cekFase2, JENIS_FASE2, TAHAP_FOTO} from "./formulir.js";

/* fase 2 (keputusan 61): jenis tanpa tabel di MEDAN diperiksa cekFase2 */
const periksa = (jenis, isi, opsi) => JENIS_FASE2.includes(jenis) ? cekFase2(jenis, isi) : cekButir(jenis, isi, opsi);
const P = () => globalThis.PbAntre;

const LS_ANTRE = "sippa.antre", LS_KODE = "sippa.kode", LS_TERKIRIM = "sippa.terkirim", LS_DRAF = "sippa.draf.", LS_TUGAS = "sippa.antre.tugas", LS_PINDAH = "sippa.antre.pindah";
const BATAS_LS = 200, BATAS_KIRIM = 200, FOTO_MAKS = 8388608, BUKA_MAKS_MS = 3000;
const UMUR_MAKS_MS = 14 * 86400000, JALUR_SAYA = "/api/sippa/lapangan/saya";
const URL_KIRIM = "/api/sippa/lapangan/kirim", URL_FOTO = "/api/sippa/lapangan/foto";
const PESAN_KODE = {401: "Tautan penugasan tidak berlaku. Minta tautan baru dari Pusdalops", 403: "Kode penugasan sudah dicabut"};
const MENUNGGU_SINYAL = "Belum ada sinyal. Dikirim ulang otomatis.";
const MIME_FOTO = ["image/jpeg", "image/webp"];   // jenisBerkas server (ADR-09); PNG tidak dikenali

const simpan = () => globalThis.localStorage;
const bacaLs = k => { try { return JSON.parse(simpan().getItem(k)); } catch { return null; } };
export const kodeTersimpan = () => { try { return simpan().getItem(LS_KODE); } catch { return null; } };

/* ---------- saluran ---------- */
let pilihan = {}, kini = null, kodeKirim = null, perluKode = 0, lari = null;
const kanal = new Map();
const jam = () => kini ?? Date.now();
/* untuk uji: pilihan saluran (simpan: PbAntre.memori(), ...). Saluran dibuat ulang. */
export function atur(o = {}) { pilihan = o; kanal.clear(); }

const buat = (nama, o) => P().saluran(nama, {pemicu: false, langsung: false, sekarang: jam, umurMs: UMUR_MAKS_MS, header: () => ({"x-kode": kodeKirim}), masukUlang: s => { perluKode = s; }, ...o, ...pilihan});
const butirKanal = t => kanal.get("b" + t) ?? kanal.set("b" + t, buat(`sippa:${t}`, {kirim: kirimButir, batch: BATAS_KIRIM})).get("b" + t);
const fotoKanal = t => kanal.get("f" + t) ?? kanal.set("f" + t, buat(`sippa-foto:${t}`, {kirim: kirimFoto})).get("f" + t);

/* tugas yang pernah punya butir di ponsel ini (kanal per tugas tak bisa dicacah dari penyimpanan) */
const tugasDikenal = () => { const a = bacaLs(LS_TUGAS); return Array.isArray(a) ? a : []; };
const catatTugas = t => { const a = tugasDikenal(); if (!a.includes(t)) try { simpan().setItem(LS_TUGAS, JSON.stringify([...a, t])); } catch { /* diblokir */ } };
const tujuan = t => t == null ? tugasDikenal() : [t];   // tugas_id kosong = lihat semua (tampilan saja; kirim tetap ketat)

/* butir mentah [saluran, x] urut dibuat; tampilan x -> bentuk lama {id, jenis, data, tugas_id, dibuat, keadaan, alasan} */
const mentah = async t => { const l = []; for (const g of tujuan(t)) for (const x of await butirKanal(g).daftar()) l.push([butirKanal(g), x]); return l.sort((a, b) => a[1].dibuat - b[1].dibuat); };
const lihatButir = x => ({id: x.klien_id, jenis: x.data.jenis, data: x.data.isi, tugas_id: x.data.tugas_id, dibuat: x.dibuat, keadaan: x.status === "menunggu" ? "menunggu" : "ditolak", alasan: x.alasan ?? null});
const semuaFoto = async () => { const l = []; for (const g of tugasDikenal()) l.push(...await fotoKanal(g).daftar()); return l; };

/* ---------- kirim: fungsi kirim saluran (badan = butir antre + klien_id) -> {s, j} ---------- */
async function kirimButir(badan, h) {
  const b = {jam_kirim: Date.now(), log: [], probe: [], bbm: [], gerak: [], inspeksi: [], ...Object.fromEntries(JENIS_FASE2.map(j => [j, []]))};   // inspeksi pra/pasca gelar (SP-094)
  for (const x of badan) b[x.jenis].push(x.isi);   // dikelompokkan per jenis dalam satu POST: urutan terlama tetap satu saluran
  let r; try { r = await fetch(URL_KIRIM, {method: "POST", headers: {...h, "content-type": "application/json"}, body: JSON.stringify(b)}); } catch { return {s: 0, j: {}}; }
  const j = await r.json().catch(() => null);
  const selesai = (s, jj) => { if (badan.length === 1 && P().kelas(s, jj) === "tolak") lari.h.ditolak++; return {s, j: jj}; };
  if (r.status === 413) return selesai(413, {galat: "Isian terlalu besar untuk dikirim"});
  if (!r.ok) return selesai(r.status, j ?? {});
  if (!j) return {s: 0, j: {}};   // 2xx tanpa isi: dicoba lagi
  if (j.jam_server != null) lari.h.jam_server = j.jam_server;
  const ada = new Set(badan.map(x => x.klien_id)), alasan = new Map();
  for (const t of j.ditolak || []) if (ada.has(t.id)) alasan.set(t.id, String(t.alasan || "Ditolak server"));
  for (const [kunci, n] of [["diterima", "diterima"], ["ganda", "ganda"]]) for (const id of j[kunci] || []) if (ada.has(id) && !lari.sudah.has(id)) { lari.sudah.add(id); lari.h[n]++; }
  /* ditolak sebagian: dijawab 422 supaya saluran membelah paket; yang sah terkirim ulang dan dijawab "ganda" (idempoten), yang ditolak tinggal sendiri dan ditandai beralasan */
  if (alasan.size) return selesai(422, {galat: badan.length === 1 ? alasan.get(badan[0].klien_id) : "sebagian ditolak"});
  return {s: 200, j};
}
async function kirimFoto([f], h) {
  const fd = new FormData(); fd.append("berkas", f.blob);
  if (f.tahap) { fd.append("tahap", f.tahap); fd.append("lat", koord(f.lat)); fd.append("lon", koord(f.lon)); }
  try { const r = await fetch(URL_FOTO, {method: "POST", headers: h, body: fd}); return {s: r.status, j: await r.json().catch(() => ({}))}; } catch { return {s: 0, j: {}}; }
}
/* koordinat foto sebagai teks yang diterima server (paling banyak 10 desimal, tanpa eksponen) */
const koord = v => String(Math.round(v * 1e6) / 1e6).replace(/e.*/, "0");

/* ---------- butir ---------- */
let _dibuat = 0;   // urutan dibuat harus menaik walau dua butir lahir pada milidetik yang sama
const urutan = () => (_dibuat = Math.max(Date.now(), _dibuat + 1));
const bentuk = (jenis, isi, tugas_id) => ({jenis, tugas_id: tugas_id ?? null, isi});
const masukButir = async (id, jenis, isi, tugas_id, dibuat) => { await butirKanal(tugas_id ?? null).masukkan({klien_id: id, data: bentuk(jenis, isi, tugas_id), dibuat}); catatTugas(tugas_id ?? null); };

/* false = IndexedDB tidak bisa dipakai: butir teks jatuh ke localStorage, foto ditolak (F5). Probe tanpa menghapus yang kedaluwarsa. */
export const idbSiap = async () => { const s = butirKanal(null); await s.menunggu(); return !s.cadangan; };

/* butir = {jenis: log|probe|bbm|gerak|inspeksi|periksa|sos|tekanan|jejak|selesai|bor|debit, data, tugas_id}; opsi.lengan_dalam dari tugas. Mengembalikan {ok, id} atau {ok:false, galat|pesan}. */
export async function tambah({jenis, data, tugas_id = null}, opsi = {}) {
  const id = data?.id || globalThis.crypto.randomUUID();
  const isi = {...data, id};
  const c = periksa(jenis, isi, opsi);
  if (!c.ok) return {ok: false, galat: c.galat};
  try {
    const semua = await mentah();
    if (butirKanal(tugas_id ?? null).cadangan && semua.length >= BATAS_LS) return {ok: false, pesan: "Antrean di peramban ini penuh. Kirim dulu saat ada sinyal."};
    await masukButir(id, jenis, isi, tugas_id, urutan());
  } catch { return {ok: false, pesan: "Penyimpanan peramban penuh atau diblokir. Isian tidak tersimpan."}; }
  return {ok: true, id};
}

export async function daftar({tugas_id} = {}) { return (await mentah(tugas_id)).map(([, x]) => lihatButir(x)); }

export async function jumlah({tugas_id} = {}) {
  const d = await daftar({tugas_id});
  const menunggu = d.filter(b => b.keadaan === "menunggu").length, ditolak = d.length - menunggu;
  return {menunggu, ditolak, total: d.length};
}

/* Perbaiki butir ditolak: isi baru wajib lolos cekButir lagi, lalu kembali menunggu. */
export async function perbaiki(id, data, opsi = {}) {
  const p = (await mentah()).find(([, x]) => x.klien_id === id);
  if (!p) return {ok: false, pesan: "Isian tidak ditemukan di antrean"};
  const {jenis, tugas_id} = p[1].data, isi = {...data, id};
  const c = periksa(jenis, isi, opsi);
  if (!c.ok) return {ok: false, galat: c.galat};
  await masukButir(id, jenis, isi, tugas_id, p[1].dibuat);
  return {ok: true};
}

export async function hapus(id) { const p = (await mentah()).find(([, x]) => x.klien_id === id); if (p) await p[0].buang(id); }

/* ---------- foto ---------- */
/* opsi.tahap (tiba|pompa|gelar|injeksi|selesai) + lat + lon + tugas_id = foto bukti berdiri sendiri (SP-121): server membuat butir foto sendiri dari /lapangan/foto.
   Foto lampiran butir (butir_id) ikut tugas butirnya. */
export async function tambahFoto(blob, butir_id, opsi = {}) {
  if (blob?.type === "image/png") return {ok: false, pesan: "Foto PNG tidak didukung. Pakai JPEG atau WebP."};
  if (!MIME_FOTO.includes(blob?.type)) return {ok: false, pesan: "Format foto tidak didukung. Pakai JPEG atau WebP."};
  if (blob.size > FOTO_MAKS) return {ok: false, pesan: "Foto lebih dari 8 MB. Kecilkan dulu."};
  if (opsi.tahap && !TAHAP_FOTO.some(t => t[0] === opsi.tahap)) return {ok: false, pesan: "Tahap foto tidak dikenal"};
  if (opsi.tahap && !(Number.isFinite(opsi.lat) && Number.isFinite(opsi.lon))) return {ok: false, pesan: "Foto bukti butuh lokasi GPS. Ambil lokasi dulu."};
  const GAGAL = {ok: false, pesan: "Foto tidak bisa disimpan luring di peramban ini"};
  try {
    const t = opsi.tahap ? opsi.tugas_id ?? null : (await mentah()).find(([, x]) => x.klien_id === butir_id)?.[1].data.tugas_id;
    if (t === undefined) return {ok: false, pesan: "Isian tidak ditemukan di antrean"};
    const f = fotoKanal(t); await f.menunggu();
    if (f.cadangan) return GAGAL;   // localStorage tak menyimpan blob
    await f.masukkan({klien_id: globalThis.crypto.randomUUID(), data: {butir_id, tugas_id: t, blob, mime: blob.type, ...(opsi.tahap ? {tahap: opsi.tahap, lat: opsi.lat, lon: opsi.lon} : {})}, dibuat: urutan()});
    catatTugas(t);
  } catch { return GAGAL; }
  return {ok: true};
}

/* ---------- kirim ---------- */
let sedangKirim = false;

export async function kirimSemua({sekarang = Date.now(), tugas_id, kode} = {}) {
  if (sedangKirim) return {diterima: 0, ganda: 0, ditolak: 0, berhenti: "sibuk"};
  sedangKirim = true; kini = sekarang;
  try { return await jalan(tugas_id, kode); } finally { sedangKirim = false; kini = null; }
}

async function jalan(tugas_id, kodeOpsi) {
  const h = {diterima: 0, ganda: 0, ditolak: 0, berhenti: null};
  if (tugas_id == null) return {...h, berhenti: "tugas", pesan: "Tugas belum dimuat. Buka tugasmu dulu."};
  const urut = [fotoKanal(tugas_id), butirKanal(tugas_id)];   // foto dulu, lalu butir
  const ada = async s => (await s.daftar()).some(x => x.status === "menunggu");
  if (!(await ada(urut[0])) && !(await ada(urut[1]))) return h;
  const kode = kodeOpsi ?? kodeTersimpan();
  if (!kode) return {...h, berhenti: "kode", pesan: PESAN_KODE[401]};
  kodeKirim = kode; perluKode = 0; lari = {h, sudah: new Set()};
  for (const s of urut) {
    if (!(await ada(s))) continue;
    await s._otomatis();   // menghormati mundur (tunda) saluran; kirimSekarang() akan memaksa
    /* kode yang ditolak server tidak dipakai lagi (butir tetap di antrean); kode kiriman manual lewat opsi tidak disentuh */
    if (perluKode) { if (kodeOpsi == null) try { simpan().removeItem(LS_KODE); } catch { /* diblokir */ } return {...h, berhenti: "kode", pesan: PESAN_KODE[perluKode]}; }
    if (s.tundaSampai > jam() && await ada(s)) return {...h, berhenti: "tunda", pesan: MENUNGGU_SINYAL};
  }
  if (h.ditolak) kanal.delete("b" + tugas_id);   // saluran membelah paket sementara; yang baru mulai lagi dengan paket 200
  return h;
}

/* "Keluar dari tugas": butir belum terkirim (menunggu, ditolak, foto) mencegah keluar; sisanya kode dihapus. */
export async function keluar({tugas_id} = {}) {
  await mentah(); await semuaFoto();   // memasang semua saluran tugas ke PbAntre
  if (await P().menungguSemua()) return {ok: false, pesan: "Masih ada isian yang belum terkirim"};
  await bersihkanJejak(tugas_id);
  return {ok: true};
}

/* kode, penanda terkirim, dan draf stopwatch tugas itu ikut hilang: ponsel bersama tidak membawa jejak regu sebelumnya */
async function bersihkanJejak(tugas_id, semuaDraf = false) {
  try {
    const s = simpan(); s.removeItem(LS_KODE); s.removeItem(LS_TERKIRIM); s.removeItem(LS_TUGAS);
    if (tugas_id != null) s.removeItem(LS_DRAF + tugas_id);
    if (semuaDraf) for (let i = s.length - 1; i >= 0; i--) { const k = s.key(i); if (k?.startsWith(LS_DRAF)) s.removeItem(k); }
  } catch { /* penyimpanan diblokir */ }
  /* simpanan API service worker (/api/sippa/lapangan/saya: tugas, regu, kit) ikut dibuang; cangkang dan jalur lain tidak disentuh */
  try {
    for (const n of await globalThis.caches.keys()) {
      if (!/^pb-lapangan-api-/.test(n)) continue;
      const c = await globalThis.caches.open(n);
      for (const r of await c.keys()) if (new URL(r.url).pathname === JALUR_SAYA) await c.delete(r);
    }
  } catch { /* tanpa Cache API */ }
}

/* Antrean milik kode yang sudah mati tidak pernah terkirim: PbAntre membuang butir dan foto lebih tua 14 hari saat dibaca; di sini dihitung selisihnya
   supaya layar bisa memberi tahu. Harus jalan sebelum pembacaan lain (daftar) membersihkannya diam-diam. */
export async function buangKadaluarsa({sekarang = Date.now()} = {}) {
  kini = sekarang;
  try {
    const hitung = async (f) => { let n = 0; for (const g of tugasDikenal()) n += await f(g).menunggu(); return n; };
    const [b0, f0] = [await hitung(butirKanal), await hitung(fotoKanal)];
    await mentah(); await semuaFoto();   // membaca = membersihkan
    return {butir: b0 - await hitung(butirKanal), foto: f0 - await hitung(fotoKanal)};
  } finally { kini = null; }
}

/* Jalan keluar bila kode sudah tidak berlaku dan butir tidak mungkin terkirim: buang seluruh antrean (layar meminta konfirmasi dua langkah). */
export async function buangSemua({tugas_id} = {}) {
  for (const [s, x] of await mentah()) await s.buang(x.klien_id);
  for (const g of tugasDikenal()) for (const x of await fotoKanal(g).daftar()) await fotoKanal(g).buang(x.klien_id);
  await bersihkanJejak(tugas_id, true);
  return {ok: true};
}

/* ---------- pindah dari IndexedDB "sippa-antre" lama (KP-12, T6/T7) ----------
   pindahDari inti memindahkan satu store lalu menghapus SELURUH basis lama, jadi foto (store lain, berisi blob) dipindah lebih dulu di sini dan diperiksa
   terbaca ulang; hanya sesudah itu butir dipindah lewat pindahDari, yang menghapus basis lama bila semua butir terbaca ulang. id lama dipertahankan.
   `lama` = {semua(store), hapus()} bisa disuntik untuk uji; bawaannya membaca IndexedDB sungguhan (satu-satunya pemanggil indexedDB.open di berkas ini). */
const lamaIdb = () => {
  const buka = () => new Promise((ok, no) => { const r = globalThis.indexedDB.open("sippa-antre"); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); r.onblocked = () => no(new Error("terkunci")); setTimeout(() => no(new Error("IndexedDB tidak menjawab")), BUKA_MAKS_MS)?.unref?.(); });
  return {
    semua: async store => { const d = await buka(); try { if (!d.objectStoreNames.contains(store)) return []; return await new Promise((ok, no) => { const q = d.transaction(store).objectStore(store).getAll(); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); }); } finally { d.close(); } },
    hapus: () => new Promise((ok, no) => { const r = globalThis.indexedDB.deleteDatabase("sippa-antre"); r.onsuccess = () => ok(); r.onerror = r.onblocked = () => no(r.error || new Error("basis lama terkunci")); }),
  };
};
/* basis lama tidak dibuat bila belum ada (open() membuatnya); tanpa databases() peramban lama tetap mencoba */
const adaLama = async () => { try { const d = await globalThis.indexedDB.databases?.(); return !d || d.some(x => x.name === "sippa-antre"); } catch { return true; } };

export async function pindahkan({lama} = {}) {
  if (simpan().getItem(LS_PINDAH)) return 0;
  const lsLama = bacaLs(LS_ANTRE);
  if (!lama && !(await adaLama()) && !Array.isArray(lsLama)) { simpan().setItem(LS_PINDAH, "1"); return 0; }
  const L = lama || lamaIdb();
  const butirLama = [...(await L.semua("butir")), ...(Array.isArray(lsLama) ? lsLama : [])], foto = await L.semua("foto");
  const tugasDari = new Map(butirLama.map(b => [b.id, b.tugas_id ?? null]));
  for (const f of foto) {   // 1. foto; yatim (butir sudah terkirim) dan yang ditolak server tak pernah berangkat di antrean lama, jadi ikut hilang
    const t = f.tahap ? f.tugas_id ?? null : tugasDari.get(f.butir_id);
    if (t === undefined || f.keadaan !== "menunggu") continue;
    const s = fotoKanal(t);
    await s.masukkan({klien_id: f.id, data: {butir_id: f.butir_id ?? null, tugas_id: t, blob: f.blob, mime: f.mime, ...(f.tahap ? {tahap: f.tahap, lat: f.lat, lon: f.lon} : {})}, dibuat: urutan()});
    catatTugas(t);
  }
  for (const f of foto) {   // 2. terbaca ulang sebelum basis lama disentuh
    const t = f.tahap ? f.tugas_id ?? null : tugasDari.get(f.butir_id);
    if (t === undefined || f.keadaan !== "menunggu") continue;
    const s = fotoKanal(t);
    if (s.cadangan || !(await s.daftar()).some(x => x.klien_id === f.id)) throw new Error("foto belum tertulis semua: basis lama dibiarkan");
  }
  /* 3. butir: saluran gabungan yang meneruskan ke saluran tugasnya */
  const ke = {
    daftar: async () => (await mentah()).map(([, x]) => x),
    masukkan: async b => { await butirKanal(b.data.tugas_id).masukkan(b); catatTugas(b.data.tugas_id); },
    get cadangan() { return [...kanal.values()].some(s => s.cadangan); },
    kedaluwarsa: t => butirKanal(null).kedaluwarsa(t),
  };
  const petakan = b => ({klien_id: b.id, dibuat: b.dibuat, data: bentuk(b.jenis, b.data, b.tugas_id)});
  const n = await P().pindahDari({db: "sippa-antre", store: "butir", petakan, ke, lama: {semua: () => Promise.resolve(butirLama), hapus: L.hapus}});
  try { simpan().removeItem(LS_ANTRE); simpan().setItem(LS_PINDAH, "1"); } catch { /* diblokir */ }
  return n;
}
