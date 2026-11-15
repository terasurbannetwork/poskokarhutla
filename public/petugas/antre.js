/* Antrean luring absen petugas di atas antrean bersama `PbAntre` (public/inti/antre.js, KP-15). Tidak memanggil indexedDB sendiri.
   Tiga saluran: `petugas-absen` (rahasia: vektor wajah di data butir, tidak pernah ke localStorage, umur 36 jam, foto Blob ikut di data),
   `petugas-nonce` (6 nonce luring) dan `petugas-meta` (selisih jam server). Dua yang terakhir bukan antrean kirim: tidak pernah dikirim (kirimSekarang tak dipanggil),
   hanya memakai penyimpanannya. Butir absen yang ditolak server dibuang utuh supaya vektornya ikut hilang (aturan lama: jawaban tegas = buang). */

export const JUMLAH_NONCE_LURING = 6;   // ALGORITMA §4: saat daring HP menyimpan 6 nonce berumur 36 jam
export const UMUR_ABSEN_MS = 36 * 3600000;   // K13: saluran wajah 36 jam
const KUNCI_SISIPAN = ["foto", "klien_id", "waktu_klien"];   // ditambah antrean/butir, bukan bagian JSON absen

/* opsi: simpan (uji: PbAntre.memori()), sekarang, kirimAbsen(data, foto, header) -> {s, j}, header() -> {"x-kode"} */
export function buatToko({simpan, sekarang = Date.now, kirimAbsen, header} = {}) {
  const P = globalThis.PbAntre;
  if (!P) throw new Error("PbAntre belum dimuat: tambahkan <script src=\"/inti/antre.js\"> sebelum modul");
  const dasar = {simpan, sekarang, langsung: false, pemicu: false};
  const absen = P.saluran("petugas-absen", {...dasar, rahasia: true, umurMs: UMUR_ABSEN_MS, header,
    kirim: (badan, h) => { const {foto, klien_id, waktu_klien, ...data} = badan[0]; return kirimAbsen(data, foto, h); }});
  const nonce = P.saluran("petugas-nonce", {...dasar, rahasia: true, umurMs: UMUR_ABSEN_MS});
  const meta = P.saluran("petugas-meta", {...dasar, rahasia: true, umurMs: 14 * 86400000});

  const sahSemua = async kini => {   // butir nonce yang belum kedaluwarsa; yang basi dibuang
    const sah = [];
    for (const x of await nonce.daftar()) { if (x.data.kedaluwarsa > kini) sah.push(x); else await nonce.buang(x.klien_id); }
    return sah.sort((a, b) => a.data.kedaluwarsa - b.data.kedaluwarsa);
  };
  return {
    absen, nonce, meta,
    /* IndexedDB mati -> saluran rahasia jatuh ke memori dan butir hilang saat tab ditutup: tolak, jangan bilang "tersimpan di HP" */
    async tambahAbsen({id, dibuat, data, foto}) {
      const k = await absen.masukkan({klien_id: id, data: {...data, foto}, dibuat});
      if (absen.cadangan) { await absen.buang(id); throw new Error("Penyimpanan HP tidak tersedia; absen tidak bisa disimpan luring"); }
      return k;
    },
    jumlahAbsen: async () => (await absen.daftar()).length,   // daftar() membuang butir lewat 36 jam (vektor ikut hilang) walau HP lama luring
    /* kirim berurutan lama ke baru. -> {terkirim: [id], ditolak: [{id, galat}], sisa: n} */
    async kirimTertunda() {
      const sebelum = (await absen.daftar()).map(x => x.klien_id);
      await absen.kirimSekarang();
      const ada = await absen.daftar(), ditolak = [];
      for (const x of ada) if (x.status !== "menunggu") { ditolak.push({id: x.klien_id, galat: x.alasan || ""}); await absen.buang(x.klien_id); }   // vektor ikut hilang
      const tinggal = new Set(ada.map(x => x.klien_id));
      return {terkirim: sebelum.filter(id => !tinggal.has(id)), ditolak, sisa: ada.length - ditolak.length};
    },
    async simpanNonce(daftar, kini) {
      await sahSemua(kini);
      for (const n of daftar) if (n && typeof n.nonce === "string" && n.kedaluwarsa > kini) await nonce.masukkan({klien_id: n.nonce, data: {nonce: n.nonce, tantangan: n.tantangan, kedaluwarsa: n.kedaluwarsa}, dibuat: kini});
    },
    async ambilNonce(kini) {   // paling cepat kedaluwarsa dulu, sekali pakai
      const n = (await sahSemua(kini))[0]; if (!n) return null;
      await nonce.buang(n.klien_id); return n.data;
    },
    jumlahNonce: async kini => (await sahSemua(kini)).length,
    simpanSelisih: (selisihMs, kapan) => meta.masukkan({klien_id: "selisih", data: {nilai: selisihMs}, dibuat: kapan}),
    async bacaSelisih() { const m = (await meta.daftar()).find(x => x.klien_id === "selisih"); return m ? m.data.nilai : 0; },
    /* butir lama (basis `lp-antre`) -> saluran absen; basis lama dihapus hanya setelah semua butir terbaca ulang. Store nonce/meta lama ikut hilang (diisi ulang saat daring). */
    pindahkanLama: () => P.pindahDari({db: "lp-antre", store: "antre", ke: absen, petakan: it => ({klien_id: it.id, dibuat: it.dibuat, data: {...it.data, foto: it.foto}})}),
  };
}
