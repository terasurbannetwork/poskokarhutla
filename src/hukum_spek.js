/* Fungsi murni Pustaka Hukum (tanpa impor worker.js), supaya uji bisa memuatnya tanpa lingkar impor worker -> hukum -> worker. */
const STOP = new Set(("yang dan di ke dari untuk pada dengan atau adalah itu ini apa apakah siapa bagaimana berapa kapan mengapa kenapa dalam oleh sebagai akan dapat bisa harus tentang " +
  "saya kami kita anda ada tidak tak para suatu setiap serta bagi saat jika maka agar sudah telah sedang ya").split(" "));

const kata = s => String(s ?? "").normalize("NFKC").match(/[\p{L}\p{N}]+/gu) || [];
/* sintaks FTS5 aman: tiap token dikutip (operator, NEAR, *, kurung, kutip hilang karena hanya huruf/angka yang lolos) */
export function kueriFts(q, {atau = false, buangStop = false, maks = 12} = {}) {
  let t = [...new Set(kata(q).map(x => x.toLowerCase()))];
  if (buangStop) t = t.filter(x => !STOP.has(x) && (x.length > 1 || /\d/.test(x)));
  t = t.slice(0, maks);
  return t.length ? t.map(x => `"${x}"`).join(atau ? " OR " : " ") : null;
}


const RE_KUTIP = /[“”„‟"'‘’‚`«»]/, RE_SPASI = /\s/;
/* normalisasi (NFKC, huruf kecil, kutip -> spasi, spasi dilipat, dipangkas) DENGAN peta ke teks asli: mulai[i]/akhir[i] = rentang asli untuk huruf ke-i hasil */
function peta(s) {
  s = String(s ?? ""); let t = "", mulai = [], akhir = [], spasi = true, i = 0;
  for (const c of s) {
    const j = i + c.length; i = j;
    if (RE_SPASI.test(c) || RE_KUTIP.test(c)) { if (!spasi) { t += " "; mulai.push(j - c.length); akhir.push(j); spasi = true; } continue; }
    for (const h of c.normalize("NFKC").toLowerCase()) { t += h; mulai.push(j - c.length); akhir.push(j); }
    spasi = false;
  }
  if (t.endsWith(" ")) { t = t.slice(0, -1); mulai.pop(); akhir.pop(); }
  return {t, mulai, akhir};
}
export const normTeks = s => peta(s).t;
const MIN_KUTIP = 40, MIN_KATA = 6, KUNCI_MIN = 4;
const kunci = s => kata(s).map(x => x.toLowerCase()).filter(x => x.length >= KUNCI_MIN && !STOP.has(x));
/* klaim = [{pernyataan, kutipan:{segmen, teks}}]; kirim = Map(id segmen -> teks YANG DIKIRIM ke model). Sah hanya bila:
   (1) kutipan.teks (dinormalkan) >= 40 huruf dan >= 6 kata, dan substring teks segmen yang disebut, segmen itu ada di kirim;
   (2) >= separuh kata kunci pernyataan (bukan stopword, >= 4 huruf) muncul di segmen itu (klaim bebas bersandar kutipan generik ditolak).
   Teks kutipan yang dikembalikan = potongan ASLI segmen (bukan ketikan model). Yang lain dibuang dan dihitung. */
export function verifikasiKutipan(klaim, kirim) {
  const sah = []; let dibuang = 0;
  for (const k of Array.isArray(klaim) ? klaim : []) {
    const id = Number(k?.kutipan?.segmen), asli = kirim.get(id), q = peta(k?.kutipan?.teks).t;
    const pernyataan = typeof k?.pernyataan === "string" ? k.pernyataan.trim().slice(0, 600) : "";
    let ok = false, potong = "";
    if (pernyataan && asli != null && q.length >= MIN_KUTIP && q.split(" ").length >= MIN_KATA) {
      const sg = peta(asli), pos = sg.t.indexOf(q);
      if (pos >= 0) {
        const kt = kunci(pernyataan), ada = new Set(kata(sg.t).map(x => x.toLowerCase()));
        if (kt.length && kt.filter(x => ada.has(x)).length * 2 >= kt.length) { ok = true; potong = asli.slice(sg.mulai[pos], sg.akhir[pos + q.length - 1]); }
      }
    }
    if (ok) sah.push({pernyataan, segmen: id, teks: potong}); else dibuang++;
  }
  return {sah, dibuang};
}
