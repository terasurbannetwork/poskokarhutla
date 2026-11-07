/* Kemitraan Kampus: fungsi murni worker (DESAIN-TEKNIS §5.1). Tanpa D1, tanpa jaringan. Kasus acuan: tests/kemitraan/fixtures/acuan.json (kunci status_perjanjian = RENCANA-UJI A13).
   Fungsi lain (skor, cocok, urut panggil) menyusul per tiket (KM-D06 dst.). */
const HARI = 86400e3, SEGERA_HARI = 60;
const wib = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
const selisihHari = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / HARI);

/* Status arsip perjanjian dari tanggal berakhirnya. berakhir 'YYYY-MM-DD' atau null; kini = 'YYYY-MM-DD' atau ms epoch (dibaca sebagai hari WIB).
   null -> belum (belum ada perjanjian bertanggal); sisa <= 60 hari (termasuk hari ini) -> segera_habis; lewat -> habis; selain itu aktif. */
export function statusPerjanjian(berakhir, kini = Date.now()) {
  if (!berakhir) return "belum";
  const h = typeof kini === "number" ? wib(kini) : kini, sisa = selisihHari(h, berakhir);
  return sisa < 0 ? "habis" : sisa <= SEGERA_HARI ? "segera_habis" : "aktif";
}

/* ---------------- masalah BPBD (KM-C03) ---------------- */
const b4 = x => Math.round((x + Number.EPSILON) * 1e4) / 1e4;   // 4 desimal, setengah ke atas
/* ALG §3.4: S_bpbd = 0.5*(U+C+R+J)/12 + 0.5*S_auto (S_auto 0.5 bila null atau bahaya multi); kelas ALG §3.2 (P1 bila S >= 0.70 atau H >= 0.80 dan K >= 0.60; P2 bila S >= 0.50). nilai = {U,C,R,J}, tiap 0-3. */
export function skorBpbd(nilai, auto, {H = null, K = null} = {}) {
  const skor = b4(0.5 * (nilai.U + nilai.C + nilai.R + nilai.J) / 12 + 0.5 * (auto ?? 0.5));
  return {skor, kelas: skor >= 0.70 || (H != null && K != null && H >= 0.80 && K >= 0.60) ? "P1" : skor >= 0.50 ? "P2" : "P3"};
}
/* Kata henti ID+EN dan akhiran stem = scripts/kemitraan/kamus.json (paritas dijaga uji kemitraan_masalah); token = ALG §4.2 (teks.py token) */
const HENTI = new Set("yang dan di ke dari pada untuk dengan dalam ini itu atau juga adalah ada akan oleh sebagai karena agar serta tidak bukan telah sudah belum masih dapat bisa harus perlu para saat ketika jika bila maka namun tetapi sehingga setelah sebelum antara terhadap kepada tentang hingga sampai lebih kurang sangat paling semua setiap beberapa banyak sedikit lain lainnya saja hanya pun lah kah kami kita saya anda dia mereka kalian nya tersebut yaitu yakni dimana mana apa siapa bagaimana mengapa kapan berapa seperti sebuah suatu seorang bagi demi bahwa sejak selama sambil supaya walaupun meskipun lalu kemudian pernah sedang the a an and or of to in on at by for with from as is are was were be been being have has had do does did will would can could should may might must shall this that these those it its they their them we our us you your he she his her which who whom whose what when where why how not no nor but if then than so such both each other some any all more most less very also only into over under between through during before after about against within without while because however there here up down out off again further once i me my".split(" "));
const STEM = ["nya", "kan", "ing", "an", "ed", "s"];   // terpanjang dulu, seperti teks.py
const stem = t => { for (const a of STEM) if (t.endsWith(a) && t.length - a.length >= 3) return t.slice(0, -a.length); return t; };
export const tokenTeks = teks => (String(teks ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(w => w.length > 1 && !HENTI.has(w)).map(stem);
/* ALG §3.5: Jaccard dua larik token sebagai himpunan; dua himpunan kosong = 0 */
export function jaccard(a, b) {
  const x = new Set(a), y = new Set(b); let s = 0;
  for (const t of x) if (y.has(t)) s++;
  return x.size + y.size - s ? b4(s / (x.size + y.size - s)) : 0;
}
