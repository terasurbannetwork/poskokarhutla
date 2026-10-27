/* SIPPA: antrean luring form lapangan (SP-011; PRD §9.9, DT §6.1.3 dan §6.1.4). IndexedDB "sippa-antre" (store butir dan foto), jatuh ke
   localStorage "sippa.antre" untuk teks bila IndexedDB gagal. Tanpa DOM: layar ada di lapangan.js. Kode penugasan dibaca dari
   localStorage "sippa.kode" dan hanya dikirim sebagai header x-kode, tidak pernah di alamat. Server idempoten (ON CONFLICT(id) DO NOTHING),
   jadi kunci `sedangKirim` di sini cukup per tab; dua tab yang berbarengan paling jauh menghasilkan jawaban "ganda", bukan baris ganda. */
import {cekButir} from "./formulir.js";

const NAMA_DB = "sippa-antre", LS_ANTRE = "sippa.antre", LS_KODE = "sippa.kode";
const BATAS_LS = 200, BATAS_KIRIM = 200, FOTO_MAKS = 8388608;
const BUKA_MAKS_MS = 3000, DASAR_MS = 60000, TUTUP_MS = 30 * 60000;
const UMUR_MAKS_MS = 14 * 86400000, JALUR_SAYA = "/api/sippa/lapangan/saya";
const LS_TERKIRIM = "sippa.terkirim", LS_DRAF = "sippa.draf.";
const PESAN_KODE ={401: "Tautan penugasan tidak berlaku. Minta tautan baru dari Pusdalops", 403: "Kode penugasan sudah dicabut"};
const MIME_FOTO = ["image/jpeg", "image/webp"];   // jenisBerkas server (ADR-09); PNG tidak dikenali

/* ---------- penyimpanan ---------- */
let _db = null;
const buka = () => _db ||= new Promise((ok, no) => {
  try {
    const q = globalThis.indexedDB.open(NAMA_DB, 1);
    q.onupgradeneeded = () => { for (const n of ["butir", "foto"]) q.result.createObjectStore(n, {keyPath: "id"}); };
    q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); q.onblocked = () => no(new Error("IndexedDB terblokir"));
    /* sebagian peramban (mode privat, profil rusak) membiarkan open() menggantung tanpa galat: tanpa batas ini seluruh layar ikut beku */
    setTimeout(() => no(new Error("IndexedDB tidak menjawab")), BUKA_MAKS_MS)?.unref?.();
  } catch (e) { no(e); }
});
const pakaiDb = async () => { try { return await buka(); } catch { return null; } };
const minta = r => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const op = async (toko, metode, arg) => minta((await buka()).transaction(toko, metode.startsWith("get") ? "readonly" : "readwrite").objectStore(toko)[metode](arg));

const simpan = () => globalThis.localStorage;
function bacaLs() { try { const a = JSON.parse(simpan().getItem(LS_ANTRE)); return Array.isArray(a) ? a : []; } catch { return []; } }
const tulisLs = a => simpan().setItem(LS_ANTRE, JSON.stringify(a));

const semuaButir = async () => (await pakaiDb()) ? op("butir", "getAll") : bacaLs();
async function taruhButir(b) {
  if (await pakaiDb()) return op("butir", "put", b);
  const a = bacaLs(), i = a.findIndex(x => x.id === b.id);
  if (i < 0) a.push(b); else a[i] = b;
  tulisLs(a);
}
async function buangButir(id) { if (await pakaiDb()) return op("butir", "delete", id); tulisLs(bacaLs().filter(x => x.id !== id)); }
const semuaFoto = async () => (await pakaiDb()) ? op("foto", "getAll") : [];

/* ---------- butir ---------- */
let _dibuat = 0;   // urutan dibuat harus menaik walau dua butir lahir pada milidetik yang sama
const urutan = () => (_dibuat = Math.max(Date.now(), _dibuat + 1));
/* KETAT: kirim tidak pernah memilih butir tanpa tugas_id (butir tugas A tidak boleh berangkat dengan kode tugas B). Hanya tampilan (daftar, jumlah) boleh melihat semua. */
const milik = tugas_id => b => b.tugas_id === tugas_id;
const lihat = tugas_id => tugas_id == null ? () => true : milik(tugas_id);

/* false = IndexedDB tidak bisa dipakai: butir teks jatuh ke localStorage, foto ditolak (F5) */
export const idbSiap = async () => !!(await pakaiDb());
export const kodeTersimpan =() => { try { return simpan().getItem(LS_KODE); } catch { return null; } };

/* butir = {jenis: log|probe|bbm|gerak|inspeksi, data, tugas_id}; opsi.lengan_dalam dari tugas. Mengembalikan {ok, id} atau {ok:false, galat|pesan}. */
export async function tambah({jenis, data, tugas_id = null}, opsi = {}) {
  const id = data?.id || globalThis.crypto.randomUUID();
  const isi = {...data, id};
  const c = cekButir(jenis, isi, opsi);
  if (!c.ok) return {ok: false, galat: c.galat};
  try {
    if (!(await pakaiDb()) && bacaLs().length >= BATAS_LS) return {ok: false, pesan: "Antrean di peramban ini penuh. Kirim dulu saat ada sinyal."};
    await taruhButir({id, jenis, data: isi, dibuat: urutan(), tugas_id, keadaan: "menunggu", alasan: null, coba: 0, kirim_berikut: 0});
  } catch { return {ok: false, pesan: "Penyimpanan peramban penuh atau diblokir. Isian tidak tersimpan."}; }
  return {ok: true, id};
}

export async function daftar({tugas_id} = {}) { return (await semuaButir()).filter(lihat(tugas_id)).sort((a, b) => a.dibuat - b.dibuat); }

export async function jumlah({tugas_id} = {}) {
  const d = await daftar({tugas_id});
  const menunggu = d.filter(b => b.keadaan === "menunggu").length, ditolak = d.length - menunggu;
  return {menunggu, ditolak, total: d.length};
}

/* Perbaiki butir ditolak: isi baru wajib lolos cekButir lagi, lalu kembali menunggu (coba nol). */
export async function perbaiki(id, data, opsi = {}) {
  const b = (await semuaButir()).find(x => x.id === id);
  if (!b) return {ok: false, pesan: "Isian tidak ditemukan di antrean"};
  const isi = {...data, id};
  const c = cekButir(b.jenis, isi, opsi);
  if (!c.ok) return {ok: false, galat: c.galat};
  await taruhButir({...b, data: isi, keadaan: "menunggu", alasan: null, coba: 0, kirim_berikut: 0});
  return {ok: true};
}

export const hapus = id => buangButir(id);

/* ---------- foto ---------- */
export async function tambahFoto(blob, butir_id) {
  if (blob?.type === "image/png") return {ok: false, pesan: "Foto PNG tidak didukung. Pakai JPEG atau WebP."};
  if (!MIME_FOTO.includes(blob?.type)) return {ok: false, pesan: "Format foto tidak didukung. Pakai JPEG atau WebP."};
  if (blob.size > FOTO_MAKS) return {ok: false, pesan: "Foto lebih dari 8 MB. Kecilkan dulu."};
  if (!(await pakaiDb())) return {ok: false, pesan: "Foto tidak bisa disimpan luring di peramban ini"};
  try { await op("foto", "put", {id: globalThis.crypto.randomUUID(), blob, mime: blob.type, butir_id, keadaan: "menunggu"}); }
  catch { return {ok: false, pesan: "Foto tidak bisa disimpan luring di peramban ini"}; }
  return {ok: true};
}

/* ---------- kirim ---------- */
/* 60 dtk x 2^coba, tertutup 30 menit, dikali 0,8 sampai 1,2 supaya ponsel satu regu tidak menyerbu bersamaan (DT §6.1.4) */
export const tundaUlang = (coba, acak = Math.random()) => Math.min(DASAR_MS * 2 ** coba, TUTUP_MS) * (0.8 + 0.4 * acak);

let sedangKirim = false;

export async function kirimSemua({sekarang = Date.now(), tugas_id, kode} = {}) {
  if (sedangKirim) return {diterima: 0, ganda: 0, ditolak: 0, berhenti: "sibuk"};
  sedangKirim = true;
  try { return await jalan(sekarang, tugas_id, kode); } finally { sedangKirim = false; }
}

async function jalan(sekarang, tugas_id, kodeOpsi) {
  const h = {diterima: 0, ganda: 0, ditolak: 0, berhenti: null};
  if (tugas_id == null) return {...h, berhenti: "tugas", pesan: "Tugas belum dimuat. Buka tugasmu dulu."};
  const semua = (await semuaButir()).filter(milik(tugas_id));
  const ids = new Set(semua.map(b => b.id));
  const foto = (await semuaFoto()).filter(f => f.keadaan === "menunggu" && (f.kirim_berikut || 0) <= sekarang && ids.has(f.butir_id));
  let sisa = semua.filter(b => b.keadaan === "menunggu" && b.kirim_berikut <= sekarang).sort((a, b) => a.dibuat - b.dibuat);
  if (!sisa.length && !foto.length) return h;
  const kode = kodeOpsi ?? kodeTersimpan();
  if (!kode) return {...h, berhenti: "kode", pesan: PESAN_KODE[401]};

  /* kode yang ditolak server tidak dipakai lagi (butir tetap di antrean); kode kiriman manual lewat opsi tidak disentuh */
  const henti = status => { if (status !== 401 && status !== 403) return null; if (kodeOpsi == null) try { simpan().removeItem(LS_KODE); } catch { /* diblokir */ } return {berhenti: "kode", pesan: PESAN_KODE[status]}; };
  const tundaFoto = f => op("foto", "put", {...f, coba: (f.coba || 0) + 1, kirim_berikut: sekarang + tundaUlang((f.coba || 0) + 1)});
  const tundaSemua = async list => { for (const b of list) await taruhButir({...b, coba: b.coba + 1, kirim_berikut: sekarang + tundaUlang(b.coba + 1)}); };
  const MENUNGGU_SINYAL = {berhenti: "tunda", pesan: "Belum ada sinyal. Dikirim ulang otomatis."};

  /* 1. foto dulu; 4xx menandai foto ditolak tetapi butirnya tetap berangkat */
  for (const f of foto) {
    const fd = new FormData(); fd.append("berkas", f.blob);
    let r;
    try { r = await fetch("/api/sippa/lapangan/foto", {method: "POST", headers: {"x-kode": kode}, body: fd}); } catch { await tundaFoto(f); return {...h, ...MENUNGGU_SINYAL}; }
    const s = henti(r.status); if (s) return {...h, ...s};
    if (r.ok) {
      const j = await r.json().catch(() => null);
      const pemilik = semua.find(b => b.id === f.butir_id);
      if (pemilik && j?.foto_id) await taruhButir({...pemilik, foto_id: j.foto_id});   // foto_id disimpan di baris antrean, bukan di kiriman: cekButir menolak medan di luar MEDAN
      await op("foto", "delete", f.id);
    } else if (r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429) await op("foto", "put", {...f, keadaan: "ditolak"});
    else { await tundaFoto(f); return {...h, ...MENUNGGU_SINYAL}; }   // 408, 429, 5xx: sementara, mundur seperti butir
  }

  /* 2. butir: paling banyak 200 per panggilan, urut dibuat */
  const tolak = async (b, alasan) => { await taruhButir({...b, keadaan: "ditolak", alasan}); h.ditolak++; };
  async function kirimSet(list) {
    const badan = {jam_kirim: Date.now(), log: [], probe: [], bbm: [], gerak: [], inspeksi: []};   // inspeksi pra/pasca gelar (SP-094)
    for (const b of list) badan[b.jenis].push(b.data);
    let r;
    try { r = await fetch("/api/sippa/lapangan/kirim", {method: "POST", headers: {"x-kode": kode, "content-type": "application/json"}, body: JSON.stringify(badan)}); }
    catch { await tundaSemua(list); return MENUNGGU_SINYAL; }
    const s = henti(r.status); if (s) return s;
    if (r.status === 413) {
      if (list.length === 1) { await tolak(list[0], "Isian terlalu besar untuk dikirim"); return null; }
      const t = list.length >> 1;
      return (await kirimSet(list.slice(0, t))) || kirimSet(list.slice(t));
    }
    const j = r.ok ? await r.json().catch(() => null) : null;
    if (!j) { await tundaSemua(list); return MENUNGGU_SINYAL; }
    if (j.jam_server != null) h.jam_server = j.jam_server;   // layar membandingkan dengan jam ponsel (pita "jam berbeda")
    const ada = new Map(list.map(b => [b.id, b]));
    for (const id of j.diterima || []) if (ada.has(id)) { await buangButir(id); h.diterima++; }
    for (const id of j.ganda || []) if (ada.has(id)) { await buangButir(id); h.ganda++; }
    for (const t of j.ditolak || []) if (ada.has(t.id)) await tolak(ada.get(t.id), String(t.alasan || "Ditolak server"));
    return null;
  }
  while (sisa.length) {
    const potong = sisa.slice(0, BATAS_KIRIM); sisa = sisa.slice(BATAS_KIRIM);
    const x = await kirimSet(potong);
    if (x) return {...h, ...x};
  }
  return h;
}

/* "Keluar dari tugas": butir belum terkirim (menunggu, ditolak, foto) mencegah keluar; sisanya kode dihapus. */
export async function keluar({tugas_id} = {}) {
  if ((await jumlah()).total || (await semuaFoto()).length) return {ok: false, pesan: "Masih ada isian yang belum terkirim"};
  await bersihkanJejak(tugas_id);
  return {ok: true};
}

/* kode, penanda terkirim, dan draf stopwatch tugas itu ikut hilang: ponsel bersama tidak membawa jejak regu sebelumnya */
async function bersihkanJejak(tugas_id, semuaDraf = false) {
  try {
    const s = simpan(); s.removeItem(LS_KODE); s.removeItem(LS_TERKIRIM);
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

/* Antrean milik kode yang sudah mati tidak pernah terkirim: butir lebih tua 14 hari (dan fotonya) dibuang saat layar mulai.
   hanyaHitung = hanya menghitung, supaya layar bisa memberi tahu jumlahnya sebelum membuang. */
export async function buangKadaluarsa({sekarang = Date.now(), hanyaHitung = false} = {}) {
  const batas = sekarang - UMUR_MAKS_MS, tua = (await semuaButir()).filter(b => b.dibuat < batas), ids = new Set(tua.map(b => b.id));
  const foto = (await pakaiDb()) ? (await semuaFoto()).filter(f => ids.has(f.butir_id)) : [];
  if (!hanyaHitung) { for (const b of tua) await buangButir(b.id); for (const f of foto) await op("foto", "delete", f.id); }
  return {butir: tua.length, foto: foto.length};
}

/* Jalan keluar bila kode sudah tidak berlaku dan butir tidak mungkin terkirim: buang seluruh antrean (layar meminta konfirmasi dua langkah). */
export async function buangSemua({tugas_id} = {}) {
  for (const b of await semuaButir()) await buangButir(b.id);
  if (await pakaiDb()) for (const f of await semuaFoto()) await op("foto", "delete", f.id);
  await bersihkanJejak(tugas_id, true);
  return {ok: true};
}
