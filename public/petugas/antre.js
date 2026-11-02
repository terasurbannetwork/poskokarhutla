/* Antrean luring (IndexedDB) untuk absen tanpa sinyal, dan simpanan nonce luring. Isi antrean memuat vektor wajah SAMPAI terkirim: item dihapus utuh
   (vektor ikut hilang) begitu server menjawab. Logika di atas `simpan` (antarmuka sederhana) supaya bisa diuji dengan memori; IndexedDB di bawah.
   simpan = {semua(tabel), taruh(tabel, nilai), hapus(tabel, kunci)}; tabel: antre (kunci id), nonce (kunci nonce), meta (kunci k). */

export const JUMLAH_NONCE_LURING = 6;   // ALGORITMA §4: saat daring HP menyimpan 6 nonce berumur 36 jam

/* ---------- logika murni di atas simpan ---------- */
export const tambahAntre = (simpan, item) => simpan.taruh("antre", item);
export async function daftarAntre(simpan) { return (await simpan.semua("antre")).sort((a, b) => a.dibuat - b.dibuat); }
export async function jumlahAntre(simpan) { return (await simpan.semua("antre")).length; }

/* status yang layak diulang nanti: jaringan putus (0), batas waktu, terlalu sering, galat server. Selain itu server SUDAH menjawab tegas (kiriman salah), jadi dibuang. */
export const bisaDiulang = status => status === 0 || status === 408 || status === 429 || status >= 500;

/* kirim berurutan (lama ke baru). kirim(item) -> {ok, status, galat?}. Berhenti di kegagalan yang bisa diulang supaya urutan tetap.
   -> {terkirim: [id], ditolak: [{id, status, galat}], sisa: n} */
export async function kirimAntre(simpan, kirim) {
  const hasil = {terkirim: [], ditolak: [], sisa: 0};
  const daftar = await daftarAntre(simpan);
  for (let i = 0; i < daftar.length; i++) {
    const item = daftar[i], r = await kirim(item);
    if (r.ok) { await simpan.hapus("antre", item.id); hasil.terkirim.push(item.id); }
    else if (!bisaDiulang(r.status)) { await simpan.hapus("antre", item.id); hasil.ditolak.push({id: item.id, status: r.status, galat: r.galat ?? ""}); }
    else { hasil.sisa = daftar.length - i; break; }
  }
  return hasil;
}

/* nonce luring: simpan hanya yang belum kedaluwarsa; ambil yang paling cepat kedaluwarsa, tiap nonce sekali pakai */
export async function simpanNonce(simpan, daftar, kini) {
  for (const n of await simpan.semua("nonce")) if (!(n.kedaluwarsa > kini)) await simpan.hapus("nonce", n.nonce);
  for (const n of daftar) if (n && typeof n.nonce === "string" && n.kedaluwarsa > kini) await simpan.taruh("nonce", {nonce: n.nonce, tantangan: n.tantangan, kedaluwarsa: n.kedaluwarsa});
}
export async function ambilNonce(simpan, kini) {
  const sah = [];
  for (const n of await simpan.semua("nonce")) { if (n.kedaluwarsa > kini) sah.push(n); else await simpan.hapus("nonce", n.nonce); }
  sah.sort((a, b) => a.kedaluwarsa - b.kedaluwarsa);
  const n = sah[0] ?? null;
  if (n) await simpan.hapus("nonce", n.nonce);
  return n;
}
export async function jumlahNonce(simpan, kini) { return (await simpan.semua("nonce")).filter(n => n.kedaluwarsa > kini).length; }

/* selisih jam (waktu server dikurangi jam HP) terakhir yang terukur, dipakai stempel saat luring */
export const simpanSelisih = (simpan, selisihMs, kapan) => simpan.taruh("meta", {k: "selisih", nilai: selisihMs, kapan});
export async function bacaSelisih(simpan) { const m = (await simpan.semua("meta")).find(x => x.k === "selisih"); return m ? m.nilai : 0; }

/* penyimpanan memori (uji) */
export function simpanMemori() {
  const t = {antre: new Map(), nonce: new Map(), meta: new Map()}, kunci = {antre: "id", nonce: "nonce", meta: "k"};
  return {
    async semua(tabel) { return [...t[tabel].values()]; },
    async taruh(tabel, nilai) { t[tabel].set(nilai[kunci[tabel]], nilai); },
    async hapus(tabel, k) { t[tabel].delete(k); },
  };
}

/* ---------- IndexedDB ---------- */
const DB = "lp-antre", VERSI_DB = 1;
export function simpanIdb() {
  let buka = null;
  const db = () => buka ??= new Promise((ok, gagal) => {
    const r = indexedDB.open(DB, VERSI_DB);
    r.onupgradeneeded = () => { r.result.createObjectStore("antre", {keyPath: "id"}); r.result.createObjectStore("nonce", {keyPath: "nonce"}); r.result.createObjectStore("meta", {keyPath: "k"}); };
    r.onsuccess = () => ok(r.result); r.onerror = () => { buka = null; gagal(r.error); };
  });
  const tx = async (tabel, mode, f) => { const d = await db(); return new Promise((ok, gagal) => { const t = d.transaction(tabel, mode), req = f(t.objectStore(tabel)); t.oncomplete = () => ok(req?.result); t.onerror = t.onabort = () => gagal(t.error); }); };
  return {
    semua: tabel => tx(tabel, "readonly", s => s.getAll()),
    taruh: (tabel, nilai) => tx(tabel, "readwrite", s => s.put(nilai)),
    hapus: (tabel, k) => tx(tabel, "readwrite", s => s.delete(k)),
  };
}
