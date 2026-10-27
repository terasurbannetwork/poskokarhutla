/* SIPPA: keputusan harian (keputusan 61; SP-100 kartu, SP-101 jalan atau tunda, SP-102 peringkat prioritas). Fungsi murni, tanpa DOM.
   Masukan: baris prioritas.json (scripts/data/sippa/prioritas.py: n24, n7, menit, darat, dari, besok) digabung kelayakan_kompleks (kab, zona).
   Semua bobot dan ambang asumsi-kebijakan, belum diuji balik; bukan perintah gelar. */

export const BOBOT_ZONA = {A: 1, B: 0.8, C: 0.5, D: 0.2};
export const AMBANG = {hujan_mm: 20, angin_kmj: 30, titik7_min: 3, bobot_24jam: 3, tiba_menit: 7 * 60, bulat_menit: 15};
const angka = (v, d = 0) => new Intl.NumberFormat("id-ID", {maximumFractionDigits: d}).format(v);

/* skor = (titik 7 hari + 3 x titik 24 jam) x bobot zona / (1 + jam perjalanan); tak terjangkau darat = null */
export function skor(p, zona) {
  if (!p.darat || p.menit == null) return null;
  return (p.n7 + AMBANG.bobot_24jam * p.n24) * (BOBOT_ZONA[zona] ?? 0) / (1 + p.menit / 60);
}

/* putusan H-1: aturan pertama yang cocok menang (urutan = keselamatan dulu) */
export function jalanTunda(p) {
  const b = p.besok;
  if (p.darat == null) return {putusan: "tunda", alasan: "Waktu tempuh dari posko belum dihitung untuk provinsi ini; cek jalan sebelum mengirim kit."};
  if (!p.darat) return {putusan: "tunda", alasan: "Tidak terjangkau darat: jalan kaki lebih dari 5 km. Pertimbangkan udara."};
  if (b && b.angin_kmj >= AMBANG.angin_kmj) return {putusan: "tunda", alasan: `Angin ${angka(b.angin_kmj)} km/jam besok: asap dan percikan berbahaya bagi regu.`};
  if (b && b.hujan_mm >= AMBANG.hujan_mm) return {putusan: "tunda", alasan: `Hujan ${angka(b.hujan_mm, 1)} mm besok: bara bisa padam sendiri dan jalan licin.`};
  if (p.n24 === 0 && p.n7 < AMBANG.titik7_min) return {putusan: "tunda", alasan: `Api tidak aktif: tanpa titik panas 24 jam dan hanya ${angka(p.n7)} dalam 7 hari.`};
  const api = p.n24 ? `${angka(p.n24)} titik panas 24 jam, ${angka(p.n7)} dalam 7 hari` : `${angka(p.n7)} titik panas dalam 7 hari`;
  return {putusan: "jalan", alasan: `${api} dalam 2 km; ${angka(p.menit)} menit dari ${p.dari ?? "posko terdekat"}.`};
}

/* jam berangkat supaya tiba 07.00 WIB (angin masih lemah, tips renlap), dibulatkan turun ke 15 menit; lebih dari 7 jam = berangkat malam sebelumnya */
export function jamBerangkat(menit) {
  const m = Math.floor((AMBANG.tiba_menit - menit) / AMBANG.bulat_menit) * AMBANG.bulat_menit;
  if (m < 0) return {teks: "malam sebelumnya", hari: -1};
  return {teks: `${String(Math.floor(m / 60)).padStart(2, "0")}.${String(m % 60).padStart(2, "0")} WIB`, hari: 0};
}

/* peringkat: gabung prioritas dengan kompleks provinsi, urut skor turun (tak terjangkau di akhir), n teratas */
export function peringkat(kompleks, prioritas, kunciZona = "zona_k", n = 10) {
  const per = new Map(prioritas.map(p => [p.id, p]));
  return kompleks.filter(k => per.has(k.id)).map(k => {
    const p = per.get(k.id), zona = k[kunciZona];
    return {id: k.id, kab: k.kab, zona, ...p, skor: skor(p, zona), ...jalanTunda(p)};
  }).sort((a, b) => (b.skor ?? -1) - (a.skor ?? -1) || b.n7 - a.n7 || a.id.localeCompare(b.id)).slice(0, n);
}

/* keputusan hari ini: sampai tiga kompleks berputusan jalan, berurutan skor */
export function keputusanHariIni(urut, n = 3) {
  return urut.filter(r => r.putusan === "jalan").slice(0, n).map(r => ({...r, berangkat: jamBerangkat(r.menit)}));
}

/* SP-106: ringkasan WhatsApp untuk pimpinan; teks polos tanpa markup, tanpa titik tengah */
export function teksWhatsApp(urut, kh, namaProv, tanggalTeks) {
  const baris = [`*SIPPA ${namaProv}, ${tanggalTeks}*`];
  if (kh.length) {
    baris.push("", "Keputusan kirim kit besok:");
    kh.forEach((r, i) => baris.push(`${i + 1}. ${r.id} ${r.kab ?? ""}, zona ${r.zona ?? "-"}: berangkat ${r.berangkat.hari < 0 ? "malam ini" : r.berangkat.teks} dari ${r.dari ?? "posko terdekat"}. ${r.alasan}`));
  } else baris.push("", "Belum ada lokasi yang layak dikirimi kit besok.");
  const tunda = urut.filter(r => r.putusan === "tunda").slice(0, 3);
  if (tunda.length) { baris.push("", "Ditunda:"); tunda.forEach(r => baris.push(`- ${r.id} ${r.kab ?? ""}: ${r.alasan}`)); }
  baris.push("", "Titik panas FIRMS 7 hari dalam 2 km; bobot dan ambang asumsi kebijakan, belum diuji balik.");
  return baris.join("\n");
}

