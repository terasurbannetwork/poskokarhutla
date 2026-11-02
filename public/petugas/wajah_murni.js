/* Fungsi murni wajah (tanpa DOM, tanpa Human): sudut, gerbang mutu, pemilih frame terbaik, vektor, tantangan.
   Semua angka (syarat sudut, tanda, mutu, tantangan) datang dari GET /api/petugas/konst lewat argumen `konst`; berkas ini tidak menyimpan angka sendiri.
   Ambang skor wajah dan anti-palsu SENGAJA tidak ada di klien (server yang menilai). Dipakai wajah.js dan tests/lapangan/wajah.test.mjs. */

export const radianKeDerajat = r => r * 180 / Math.PI;

/* angle Human {yaw, pitch, roll} dalam radian -> derajat MENTAH; tanda perangkat dikali di sudutCocok */
export function sudutDerajat(angle) {
  const a = angle || {};
  return {yaw: radianKeDerajat(Number(a.yaw) || 0), pitch: radianKeDerajat(Number(a.pitch) || 0)};
}

/* sudut mentah memenuhi syarat arah? (tanda_yaw/tanda_pitch dari konst dikali dulu, sama dengan sudutCocok server) */
export function sudutCocok(konst, arah, yaw, pitch) {
  const s = Object.hasOwn(konst.syarat_sudut, arah) ? konst.syarat_sudut[arah] : null;
  if (!s || !Number.isFinite(yaw) || !Number.isFinite(pitch)) return false;
  const y = yaw * konst.tanda_yaw, p = pitch * konst.tanda_pitch;
  return y >= s.yaw[0] && y <= s.yaw[1] && p >= s.pitch[0] && p <= s.pitch[1];
}

/* arah pertama yang cocok dengan sudut (untuk kontrol uji perangkat); null bila sudut di antara arah */
export const arahDariSudut = (konst, yaw, pitch) => konst.arah.find(a => sudutCocok(konst, a, yaw, pitch)) ?? null;

/* gerbang mutu satu frame. f = {jumlah, skor, lebarKotak, lebarVideo, tajam}. -> {ok, alasan|null}
   alasan: tak_ada | banyak | skor | jauh | dekat | buram. Anti-palsu tidak dinilai di sini. */
export function cekMutu(mutu, f) {
  if (!f || !f.jumlah) return {ok: false, alasan: "tak_ada"};
  if (f.jumlah > 1) return {ok: false, alasan: "banyak"};
  if (!(f.skor >= mutu.skorDeteksiMin)) return {ok: false, alasan: "skor"};
  const lebar = f.lebarVideo > 0 ? f.lebarKotak / f.lebarVideo : 0;
  if (lebar < mutu.lebarMin) return {ok: false, alasan: "jauh"};
  if (lebar > mutu.lebarMaks) return {ok: false, alasan: "dekat"};
  if (!(f.tajam >= mutu.tajamMin)) return {ok: false, alasan: "buram"};
  return {ok: true, alasan: null};
}

/* teks baku DESIGN-SYSTEM §4 dan pelengkapnya */
export const TEKS_ARAH = {depan: "Hadap lurus ke kamera", kiri: "Toleh pelan ke kiri", kanan: "Toleh pelan ke kanan", atas: "Angkat dagu sedikit", bawah: "Tunduk sedikit"};
export const TEKS_TANTANGAN = {kedip: "Kedipkan mata", toleh_kiri: "Toleh pelan ke kiri, lalu hadap depan", toleh_kanan: "Toleh pelan ke kanan, lalu hadap depan"};
const TEKS_MUTU = {
  tak_ada: "Wajah belum terlihat. Hadap ke kamera", banyak: "Cukup satu wajah di kamera", skor: "Wajah kurang terang. Hadap ke cahaya",
  jauh: "Dekatkan wajah ke kamera", dekat: "Jauhkan sedikit dari kamera", buram: "Wajah kurang terang. Hadap ke cahaya, tahan HP dengan stabil",
};
export const pesanMutu = alasan => (Object.hasOwn(TEKS_MUTU, alasan) ? TEKS_MUTU[alasan] : TEKS_MUTU.skor);

/* penghitung frame berturut-turut: tambah(true) naik, tambah(false) mengosongkan; tambah mengembalikan true bila sudah >= n */
export function penghitung(n) {
  let c = 0;
  return {tambah(ok) { c = ok ? c + 1 : 0; return c >= n; }, ulang() { c = 0; }, get jumlah() { return c; }};
}

/* n frame dengan skor tertinggi (stabil bila skor sama: yang lebih dulu menang); salinan, tidak mengubah masukan */
export function pilihTerbaik(frame, n) {
  return frame.map((f, i) => ({f, i})).sort((a, b) => (b.f.skor - a.f.skor) || (a.i - b.i)).slice(0, n).map(x => x.f);
}

/* rata-rata vektor lalu normalisasi L2. Panjang beda atau vektor nol = galat (versi model beda tidak dicampur) */
export function rataL2(daftar) {
  if (!daftar.length) throw new Error("tidak ada vektor");
  const d = daftar[0].length, hasil = new Float32Array(d);
  if (!d) throw new Error("vektor kosong");
  for (const v of daftar) {
    if (v.length !== d) throw new Error("panjang vektor berbeda");
    for (let i = 0; i < d; i++) hasil[i] += v[i] / daftar.length;
  }
  let n = 0; for (let i = 0; i < d; i++) n += hasil[i] * hasil[i];
  n = Math.sqrt(n);
  if (!(n > 0) || !Number.isFinite(n)) throw new Error("vektor nol");
  for (let i = 0; i < d; i++) hasil[i] /= n;
  return hasil;
}

/* Float32Array <-> base64 little-endian (format yang dibaca src/lapangan_konst.js vektorDari) */
export function keBase64(f32) {
  const dv = new DataView(new ArrayBuffer(f32.length * 4));
  for (let i = 0; i < f32.length; i++) dv.setFloat32(i * 4, f32[i], true);
  const b = new Uint8Array(dv.buffer); let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
export function dariBase64(b64) {
  const b = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  if (!b.length || b.length % 4) throw new Error("bukan kelipatan 4 byte");
  const dv = new DataView(b.buffer), out = new Float32Array(b.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = dv.getFloat32(i * 4, true);
  return out;
}

/* ketajaman: varians Laplacian 4-tetangga pada citra abu-abu w x h (potongan wajah diperkecil ke ukuran tetap oleh pemanggil) */
export function variansLaplacian(abu, w, h) {
  if (w < 3 || h < 3 || abu.length < w * h) return 0;
  let jumlah = 0, kuadrat = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, l = abu[i - 1] + abu[i + 1] + abu[i - w] + abu[i + w] - 4 * abu[i];
    jumlah += l; kuadrat += l * l; n++;
  }
  const rata = jumlah / n;
  return kuadrat / n - rata * rata;
}

/* penggerak kedip: tutup 0..1 per frame. Naik di atas 0,6 lalu turun di bawah 0,3 = kedip selesai (ALGORITMA §3). Murni: kembalikan keadaan baru. */
export function langkahKedip(s, tutup) {
  const k = {naik: !!s.naik, selesai: !!s.selesai};
  if (k.selesai) return k;
  if (!k.naik && tutup > 0.6) k.naik = true;
  else if (k.naik && tutup < 0.3) k.selesai = true;
  return k;
}

/* tantangan: objek berstatus. jenis dari server (kedip | toleh_kiri | toleh_kanan). frame = {mutuOk, yaw, pitch, tutup}.
   toleh: tahap 0 butuh arah kiri/kanan `konst.tantangan_frame_depan` frame berturut, tahap 1 butuh arah depan sebanyak itu juga. kedip tidak butuh mutuOk (mata bisa tertutup). */
export function buatTantangan(konst, jenis) {
  if (!konst.tantangan.includes(jenis)) throw new Error("jenis tantangan tidak dikenal");
  const n = konst.tantangan_frame_depan;
  let kedip = {naik: false, selesai: false}, tahap = 0, h = penghitung(n);
  return {
    jenis,
    langkah(f) {
      if (jenis === "kedip") { kedip = langkahKedip(kedip, f.tutup ?? 0); return kedip.selesai; }
      const arah = tahap === 0 ? (jenis === "toleh_kiri" ? "kiri" : "kanan") : "depan";
      if (h.tambah(f.mutuOk !== false && sudutCocok(konst, arah, f.yaw, f.pitch))) { if (tahap === 1) return true; tahap = 1; h = penghitung(n); }
      return false;
    },
    get tahap() { return tahap; },
  };
}

/* sisa detik yang dibolehkan; <= 0 = habis */
export const sisaDetik = (mulaiMs, kiniMs, batasDetik) => Math.max(0, batasDetik - (kiniMs - mulaiMs) / 1000);

/* hasil per arah -> badan POST /api/petugas/wajah. hasil[arah] = {vektor (base64), mutu (skor deteksi rata-rata)} */
export function badanWajah(konst, versiModel, hasil) {
  const arah = {}, mutu = {};
  for (const a of konst.arah) {
    if (!hasil[a]) throw new Error(`arah ${a} belum selesai`);
    arah[a] = hasil[a].vektor; mutu[a] = Math.round(hasil[a].mutu * 1000) / 1000;
  }
  return {versi_model: versiModel, arah, mutu};
}

/* galat getUserMedia -> kalimat manusiawi (nama galat peramban, bukan pesan internal) */
export function pesanKamera(nama) {
  if (nama === "NotAllowedError" || nama === "SecurityError") return "Izin kamera ditolak. Izinkan kamera untuk situs ini di pengaturan peramban, lalu ulangi.";
  if (nama === "NotFoundError" || nama === "OverconstrainedError") return "Kamera tidak ditemukan di perangkat ini.";
  if (nama === "NotReadableError" || nama === "AbortError") return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu ulangi.";
  return "Kamera tidak bisa dibuka. Muat ulang halaman lalu ulangi.";
}
