/* Siklus F4: antrean luring formulir baris Jitupasna (SK-078). Pola public/pipa/antre.js, tanpa DOM, tanpa foto.
   IndexedDB "siklus-antre" (store butir); bila IndexedDB gagal, jatuh ke localStorage "siklus.antre". Tiap butir membawa klien_id yang dibuat SEKALI saat tambah,
   jadi kirim ulang aman: server (POST /api/siklus/pulih/:id/baris, UNIQUE jitupasna_id+klien_id) menjawab duplikat, bukan baris kedua.
   Butir 4xx selain 408 dan 429 ditandai ditolak dan tinggal di antrean sampai dihapus; jaringan putus, 5xx, 429 berhenti dan dicoba lagi nanti. */
const NAMA_DB = "siklus-antre", LS = "siklus.antre", PER_KIRIM = 100, BATAS_LS = 200, BUKA_MAKS_MS = 3000;
const RE_KLIEN = /^[A-Za-z0-9_-]{8,40}$/;

let _db = null;
const buka = () => _db ||= new Promise((ok, no) => {
  try {
    const q = globalThis.indexedDB.open(NAMA_DB, 1);
    q.onupgradeneeded = () => q.result.createObjectStore("butir", {keyPath: "klien_id"});
    q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); q.onblocked = () => no(new Error("IndexedDB terblokir"));
    setTimeout(() => no(new Error("IndexedDB tidak menjawab")), BUKA_MAKS_MS)?.unref?.();   // open() bisa menggantung di profil rusak
  } catch (e) { no(e); }
});
const pakaiDb = async () => { try { return await buka(); } catch { return null; } };
const minta = r => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const op = async (metode, arg) => minta((await buka()).transaction("butir", metode.startsWith("get") ? "readonly" : "readwrite").objectStore("butir")[metode](arg));
const bacaLs = () => { try { const a = JSON.parse(globalThis.localStorage.getItem(LS)); return Array.isArray(a) ? a : []; } catch { return []; } };
const semua = async () => (await pakaiDb()) ? op("getAll") : bacaLs();
async function taruh(b) {
  if (await pakaiDb()) return op("put", b);
  const a = bacaLs(), i = a.findIndex(x => x.klien_id === b.klien_id); if (i < 0) a.push(b); else a[i] = b;
  globalThis.localStorage.setItem(LS, JSON.stringify(a));
}
async function buang(id) { if (await pakaiDb()) return op("delete", id); globalThis.localStorage.setItem(LS, JSON.stringify(bacaLs().filter(x => x.klien_id !== id))); }

const BARIS = {rusak: ["tingkat", "unit"], rugi: ["komponen", "arus_rp", "bulan"]};
/* isian formulir -> baris siap kirim, atau {galat}. Angka kosong tidak pernah menjadi 0. */
export function periksa(b) {
  if (!b || (b.jenis !== "rusak" && b.jenis !== "rugi")) return {galat: "Jenis baris harus rusak atau rugi"};
  if (typeof b.sektor !== "string" || !/^[a-z][a-z0-9_]{1,39}$/.test(b.sektor)) return {galat: "Pilih sektor"};
  for (const k of BARIS[b.jenis]) if (b[k] == null || b[k] === "") return {galat: `Isian ${k.replace("_rp", " (Rp)")} belum diisi`};
  const o = {jenis: b.jenis, sektor: b.sektor};
  if (b.jenis === "rusak") { if (!["rb", "rs", "rr", "hancur", "unit"].includes(b.tingkat)) return {galat: "Tingkat tidak dikenal"}; const u = Number(b.unit); if (!Number.isFinite(u) || u < 0) return {galat: "Unit harus angka nol atau lebih"}; Object.assign(o, {tingkat: b.tingkat, unit: u}); }
  else { const a = Number(b.arus_rp), n = Number(b.bulan); if (!Number.isInteger(a) || a < 0) return {galat: "Arus harus bilangan bulat rupiah"}; if (!Number.isInteger(n) || n < 1 || n > 120) return {galat: "Bulan 1 sampai 120"}; Object.assign(o, {komponen: String(b.komponen).trim().toLowerCase().replace(/\s+/g, "_"), arus_rp: a, bulan: n}); }
  if (b.asumsi) o.asumsi = String(b.asumsi).slice(0, 300);
  return {baris: o};
}

export async function tambah(jpId, isian, {klien_id} = {}) {
  const c = periksa(isian); if (c.galat) return {ok: false, pesan: c.galat};
  const id = klien_id ?? globalThis.crypto.randomUUID(); if (!RE_KLIEN.test(id)) return {ok: false, pesan: "klien_id tidak sah"};
  if (!(await pakaiDb()) && bacaLs().length >= BATAS_LS) return {ok: false, pesan: "Antrean di peramban ini penuh. Kirim dulu saat ada sinyal."};
  try { await taruh({klien_id: id, jp_id: jpId, baris: {...c.baris, klien_id: id}, dibuat: Date.now(), keadaan: "menunggu", alasan: null}); }
  catch { return {ok: false, pesan: "Penyimpanan peramban penuh atau diblokir. Isian tidak tersimpan."}; }
  return {ok: true, id};
}
export const daftar = async jpId => (await semua()).filter(b => b.jp_id === jpId).sort((a, b) => a.dibuat - b.dibuat);
export async function jumlah(jpId) { const d = await daftar(jpId), menunggu = d.filter(b => b.keadaan === "menunggu").length; return {menunggu, ditolak: d.length - menunggu, total: d.length}; }
export const hapus = id => buang(id);

let sedang = false;
/* kirim(jpId, barisList) -> {ok, status, j}; bawaan memanggil api() lewat pemanggil. Jawaban: {diterima, duplikat, ditolak, berhenti}. */
export async function kirimSemua(jpId, kirim) {
  if (sedang) return {diterima: 0, duplikat: 0, ditolak: 0, berhenti: "sibuk"};
  sedang = true;
  try {
    const h = {diterima: 0, duplikat: 0, ditolak: 0, berhenti: null};
    let sisa = (await daftar(jpId)).filter(b => b.keadaan === "menunggu");
    while (sisa.length) {
      const potong = sisa.slice(0, PER_KIRIM); sisa = sisa.slice(PER_KIRIM);
      const r = await kirim(jpId, potong.map(b => b.baris));
      if (r.ok) {
        const dup = r.j?.duplikat ?? 0; h.diterima += r.j?.diterima ?? potong.length - dup; h.duplikat += dup;
        for (const b of potong) await buang(b.klien_id);   // diterima dan duplikat sama-sama selesai: klien_id sudah ada di server
      } else if (r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429) {
        for (const b of potong) await taruh({...b, keadaan: "ditolak", alasan: r.j?.galat ?? "Ditolak server"});   // kiriman satu paket ditolak bersama; perbaiki lalu tambah ulang
        h.ditolak += potong.length;
      } else return {...h, berhenti: "tunda"};
    }
    return h;
  } finally { sedang = false; }
}
