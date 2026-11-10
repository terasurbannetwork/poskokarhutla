/* Siklus Bencana bagian F1: fungsi murni, tanpa D1 dan tanpa jaringan (ALGORITMA F1.2, F1.5, F1.7, F1.8). Dipakai rute (src/siklus_kejadian.js).
   Bagian F4 (Jitupasna, R3P) dan F5 (renkon) ditambah tiket gelombangnya, di berkas ini. Kembaran JS di peramban: public/siklus/hitung.js (tiket layar). */

export const BASI_HARI = 3, PENGAMAN_ALIAS = 32;
export const ALFABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";   // Crockford base32: tanpa I, L, O, U
export const RE_KJ = /^KJ-\d{4}-[0-9A-HJKMNP-TV-Z]{8}$/;
export const FASE = ["terdeteksi", "terverifikasi", "tanggap", "transisi", "pemulihan", "selesai"];   // urutan hidup (ALUR 2.1)

/* ID = "KJ-" + tahun(tgl_mulai) + "-" + 8 simbol dari 40 bit pertama SHA-256(kunci). Tabrakan: n >= 2 menghash ulang `kunci|n`, panjang tetap 16.
   kunci = jenis_utama|kab_utama|tgl_mulai_iso; tahun diambil dari kolom ketiganya. */
export async function idKejadian(kunci, n = 1) {
  const [, , tgl] = String(kunci).split("|");
  if (!/^\d{4}-\d\d-\d\d$/.test(tgl ?? "")) throw new Error("kunci pendiri harus jenis|kab|YYYY-MM-DD");
  if (!Number.isInteger(n) || n < 1) throw new Error("n harus bilangan bulat >= 1");
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(n > 1 ? `${kunci}|${n}` : kunci)));
  let v = 0n; for (let i = 0; i < 5; i++) v = (v << 8n) | BigInt(d[i]);
  let kode = ""; for (let i = 0; i < 8; i++) kode += ALFABET[Number((v >> BigInt(35 - 5 * i)) & 31n)];
  return `KJ-${tgl.slice(0, 4)}-${kode}`;
}
/* kunci pendiri: jenis (satu atau lebih) diurut naik lalu digabung "+"; kab_utama = kode kab4 Kemendagri terkecil */
export const kunciPendiri = (jenis, kab4, mulai) => `${[].concat(jenis).sort().join("+")}|${[].concat(kab4).sort()[0]}|${mulai}`;

/* ID bebas pertama: cobaAda(id) mengembalikan (Promise<)boolean) apakah ID sudah dipakai (D1, termasuk dibatalkan/digabung). Dibatasi 50 percobaan. */
export async function idBebas(kunci, cobaAda) {
  for (let n = 1; n <= 50; n++) { const id = await idKejadian(kunci, n); if (!(await cobaAda(id))) return id; }
  throw new Error("tidak menemukan ID bebas setelah 50 percobaan");
}

/* Angka berdampingan (F1.7): nilai = {sumber: angka|null}. Tanpa total dan tanpa rata-rata; null bukan nol. */
export function selisihAntarsumber(nilai) {
  const ada = Object.entries(nilai ?? {}).filter(([, v]) => typeof v === "number" && Number.isFinite(v));
  const n = ada.length;
  if (n < 2) return {n, selisih: null, arah: null, persen: null};
  const maks = ada.reduce((a, b) => (b[1] > a[1] ? b : a)), min = ada.reduce((a, b) => (b[1] < a[1] ? b : a));
  const selisih = maks[1] - min[1];
  return {n, selisih, arah: {maks: maks[0], min: min[0]}, persen: maks[1] > 0 ? (selisih * 100) / maks[1] : null};
}
/* satu metrik per kunci: dampak per sumber `{sumber: {metrik: {n, y, t}}}` -> {metrik: selisihAntarsumber(...)}; hanya metrik yang dilaporkan sumber mana pun */
export function selisihDampak(perSumber) {
  const metrik = new Set(); for (const d of Object.values(perSumber ?? {})) for (const k of Object.keys(d ?? {})) metrik.add(k);
  return [...metrik].sort().map(m => ({metrik: m, ...selisihAntarsumber(Object.fromEntries(Object.entries(perSumber).map(([s, d]) => [s, d?.[m]?.n ?? null])))}));
}

/* Alias (F1.5): ambil(id) -> {fase, ke} | null (Promise boleh). Ikuti `ke` sampai fase bukan digabung. Lebih dari 32 langkah, putaran, atau mata rantai hilang = gagal keras. */
export async function resolusiAlias(id, ambil) {
  const lihat = new Set();
  let sekarang = id;
  for (let i = 0; i <= PENGAMAN_ALIAS; i++) {
    const b = await ambil(sekarang);
    if (!b) throw new Error(`alias putus di ${sekarang}`);
    if (b.fase !== "digabung") return sekarang;
    if (lihat.has(sekarang)) throw new Error(`alias berputar di ${sekarang}`);
    lihat.add(sekarang);
    if (!b.ke) throw new Error(`${sekarang} digabung tanpa ke`);
    sekarang = b.ke;
  }
  throw new Error(`rantai alias lebih dari ${PENGAMAN_ALIAS} langkah dari ${id}`);
}

/* Basi (F1.8): hanya tampilan, fase tidak berubah. Tanggal YYYY-MM-DD. */
export const hariAntara = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
export const basi = (terakhir, hariIni, batas = BASI_HARI) => hariAntara(terakhir, hariIni) > batas;

/* Fase sah (cermin trigger sk_kejadian_fase, migrations/0120): maju/mundur satu langkah, terdeteksi -> dibatalkan, fase hidup mana pun -> digabung */
export function faseSah(dari, ke) {
  const i = FASE.indexOf(dari), j = FASE.indexOf(ke);
  if (i >= 0 && ke === "digabung") return true;
  if (dari === "terdeteksi" && ke === "dibatalkan") return true;
  return i >= 0 && j >= 0 && Math.abs(i - j) === 1;
}

/* k-anonim publik (KEAMANAN 2.6): angka korban atau terdampak di bawah 5 ditulis "di bawah 5"; null tetap null ("tidak ada") */
export const angkaPublik = n => n == null ? null : n < 5 ? "di bawah 5" : n;
